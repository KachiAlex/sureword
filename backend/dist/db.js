import { createPool } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();
const rawDbUrl = process.env.DATABASE_URL?.trim();
const dbUrl = rawDbUrl?.startsWith('psql ') ? rawDbUrl.slice(5) : rawDbUrl;
console.log('[DB] NODE_ENV:', process.env.NODE_ENV);
console.log('[DB] VERCEL:', process.env.VERCEL || 'undefined');
console.log('[DB] DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('[DB] dbUrl present:', !!dbUrl);
export let dbReady = !!dbUrl;
let _poolInitError = null;
let _pool = null;
function getPool() {
    if (_pool)
        return _pool;
    if (!dbReady)
        throw new Error('DATABASE_URL not configured');
    try {
        const u = new URL(dbUrl);
        console.log(`[DB] host: ${u.hostname}, protocol: ${u.protocol}, pathname: ${u.pathname}`);
        _pool = createPool();
        console.log('[DB] pool created OK');
        return _pool;
    }
    catch (e) {
        console.error('[DB] Failed to create pool:', e?.message || e);
        _poolInitError = e?.message || String(e);
        dbReady = false;
        throw new Error('Failed to create database pool: ' + _poolInitError);
    }
}
export const db = {
    async query(sqlStr, params) {
        if (!dbReady)
            throw new Error('DATABASE_URL not configured');
        const result = await getPool().query(sqlStr, params);
        return { rows: result.rows, rowCount: result.rowCount };
    },
    async get(sqlStr, params) {
        if (!dbReady)
            throw new Error('DATABASE_URL not configured');
        const result = await getPool().query(sqlStr, params);
        return result.rows[0];
    },
    async all(sqlStr, params) {
        if (!dbReady)
            throw new Error('DATABASE_URL not configured');
        const result = await getPool().query(sqlStr, params);
        return result.rows;
    },
    async run(sqlStr, params) {
        if (!dbReady)
            throw new Error('DATABASE_URL not configured');
        const result = await getPool().query(sqlStr, params);
        return { lastID: 0, changes: result.rowCount || 0 };
    }
};
export async function getDb() {
    return db;
}
const SCHEMA_QUERIES = [
    `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'listener', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS broadcasts (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, scripture_reference TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled', started_at TIMESTAMP, ended_at TIMESTAMP,
    broadcaster_id TEXT NOT NULL, audio_path TEXT, stream_key TEXT, stream_type TEXT DEFAULT 'church_online',
    church_online_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS sermons (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, scripture_reference TEXT,
    speaker TEXT, series TEXT, audio_url TEXT NOT NULL, date TEXT NOT NULL, duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY, broadcast_id TEXT, user_id TEXT, user_name TEXT,
    message TEXT NOT NULL, is_private BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS schedule (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, day_of_week INTEGER NOT NULL,
    time TEXT NOT NULL, type TEXT DEFAULT 'service', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];
let _dbInitPromise = null;
let _dbInitDone = false;
export async function initDb() {
    if (_dbInitDone)
        return;
    if (_dbInitPromise)
        return _dbInitPromise;
    _dbInitPromise = _initDbInternal();
    return _dbInitPromise;
}
async function _initDbInternal() {
    console.log('[DB] init starting...');
    try {
        console.log('[DB] testing connection with SELECT 1...');
        await db.query('SELECT 1 as test');
        console.log('[DB] connection OK');
    }
    catch (e) {
        console.error('[DB] connection test failed:', e.message);
        throw e;
    }
    for (let i = 0; i < SCHEMA_QUERIES.length; i++) {
        await db.query(SCHEMA_QUERIES[i]);
    }
    console.log('[DB] schema OK');
    const existingSchedule = await db.get('SELECT * FROM schedule LIMIT 1');
    if (!existingSchedule) {
        await db.run(`
      INSERT INTO schedule (id, title, day_of_week, time, type) VALUES
      ($1, 'Sunday Gathering', 0, '10:00', 'service'),
      ($2, 'Midweek Study', 3, '19:00', 'study'),
      ($3, 'Prayer Meeting', 5, '18:00', 'prayer')
    `, [uuidv4(), uuidv4(), uuidv4()]);
        console.log('[DB] schedule seeded');
    }
    const admin = await db.get('SELECT * FROM users WHERE role = $1', ['admin']);
    if (!admin) {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash('admin123', 10);
        await db.run(`INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`, ['admin-1', 'admin@zionite.online', hash, 'Admin User', 'admin']);
        console.log('[DB] admin seeded');
    }
    console.log('[DB] init complete');
    _dbInitDone = true;
}
//# sourceMappingURL=db.js.map