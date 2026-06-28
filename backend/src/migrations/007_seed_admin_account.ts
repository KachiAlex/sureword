import bcrypt from 'bcryptjs'
import type { DbClient } from '../db.js'

export async function up(db: DbClient) {
  const existing = await db.get('SELECT id FROM users WHERE email = $1', ['admin@sureword.com'])
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10)
    await db.run(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      ['admin-1', 'admin@sureword.com', hash, 'Admin User', 'admin']
    )
    console.log('[MIGRATION] Admin account created: admin@sureword.com')
  } else {
    console.log('[MIGRATION] Admin account already exists: admin@sureword.com')
  }
}
