import type { DbClient } from '../db.js'

export async function up(db: DbClient) {
  const existing = await db.get('SELECT id FROM users WHERE email = $1', ['admin@surewordradio.org'])
  if (existing) {
    await db.run('DELETE FROM users WHERE email = $1', ['admin@surewordradio.org'])
    console.log('[MIGRATION] Removed old admin account: admin@surewordradio.org')
  } else {
    console.log('[MIGRATION] Old admin account not found, nothing to remove')
  }
}
