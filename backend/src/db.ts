import { Pool, PoolClient, QueryResult } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_n9ep6PLNzBIS@ep-wandering-block-ahfs3q45-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
})

export interface DbClient {
  query(sql: string, params?: any[]): Promise<QueryResult>
  get<T extends Record<string, any> = any>(sql: string, params?: any[]): Promise<T | undefined>
  all<T extends Record<string, any> = any>(sql: string, params?: any[]): Promise<T[]>
  run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>
}

function createDbClient(client: PoolClient): DbClient {
  return {
    async query(sql: string, params?: any[]): Promise<QueryResult> {
      return client.query(sql, params)
    },
    async get<T extends Record<string, any> = any>(sql: string, params?: any[]): Promise<T | undefined> {
      const result = await client.query(sql, params)
      return result.rows[0] as T
    },
    async all<T extends Record<string, any> = any>(sql: string, params?: any[]): Promise<T[]> {
      const result = await client.query(sql, params)
      return result.rows as T[]
    },
    async run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
      const result = await client.query(sql, params)
      return { lastID: 0, changes: result.rowCount || 0 }
    }
  }
}

// Auto-managing db singleton — acquires/releases a client per query
export const db = {
  async query(sql: string, params?: any[]): Promise<QueryResult> {
    const client = await pool.connect()
    try {
      return await client.query(sql, params)
    } finally {
      client.release()
    }
  },
  async get<T extends Record<string, any> = any>(sql: string, params?: any[]): Promise<T | undefined> {
    const result = await this.query(sql, params)
    return result.rows[0] as T
  },
  async all<T extends Record<string, any> = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.query(sql, params)
    return result.rows as T[]
  },
  async run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
    const result = await this.query(sql, params)
    return { lastID: 0, changes: result.rowCount || 0 }
  }
}

// Backward-compatible helper — returns the auto-managing singleton
export async function getDb(): Promise<DbClient> {
  return db
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ])
}

export async function initDb() {
  const client = await withTimeout(pool.connect(), 8000, 'Database connection')
  const db = createDbClient(client)

  try {
    // Run all schema creation in parallel to minimize cold-start latency
    await Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'listener',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS broadcasts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          scripture_reference TEXT,
          status TEXT NOT NULL DEFAULT 'scheduled',
          started_at TIMESTAMP,
          ended_at TIMESTAMP,
          broadcaster_id TEXT NOT NULL,
          audio_path TEXT,
          stream_key TEXT,
          stream_type TEXT DEFAULT 'church_online',
          church_online_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (broadcaster_id) REFERENCES users(id)
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS sermons (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          scripture_reference TEXT,
          speaker TEXT,
          series TEXT,
          audio_url TEXT NOT NULL,
          date TEXT NOT NULL,
          duration INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS audio_chunks (
          id TEXT PRIMARY KEY,
          broadcast_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id)
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          broadcast_id TEXT,
          user_id TEXT,
          user_name TEXT,
          message TEXT NOT NULL,
          is_private BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id)
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS prayer_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_name TEXT,
          request TEXT NOT NULL,
          is_private BOOLEAN DEFAULT TRUE,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS schedule (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          day_of_week INTEGER NOT NULL,
          time TEXT NOT NULL,
          type TEXT DEFAULT 'service',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
    ])

    // Run ALTER statements in parallel
    await Promise.all([
      db.query(`ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS stream_key TEXT`),
      db.query(`ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS stream_type TEXT DEFAULT 'church_online'`),
      db.query(`ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS church_online_url TEXT`)
    ])

    // Seed default schedule
    const existingSchedule = await db.get('SELECT * FROM schedule LIMIT 1')
    if (!existingSchedule) {
      await db.run(`
        INSERT INTO schedule (id, title, day_of_week, time, type) VALUES 
        ($1, 'Sunday Gathering', 0, '10:00', 'service'),
        ($2, 'Midweek Study', 3, '19:00', 'study'),
        ($3, 'Prayer Meeting', 5, '18:00', 'prayer')
      `, [uuidv4(), uuidv4(), uuidv4()])
    }

    // Seed an admin user if none exists, or update existing admin email
    const admin = await db.get('SELECT * FROM users WHERE role = $1', ['admin'])
    if (!admin) {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('admin123', 10)
      await db.run(
        `INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
        ['admin-1', 'admin@zionite.online', hash, 'Admin User', 'admin']
      )
    } else if (admin.email === 'admin@zionitefm.com') {
      await db.run(
        `UPDATE users SET email = $1 WHERE id = $2`,
        ['admin@zionite.online', admin.id]
      )
    }
  } finally {
    client.release()
  }
}
