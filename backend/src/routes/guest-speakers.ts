import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, initDb } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Public: list active guest speakers
router.get('/', async (req, res) => {
  try {
    await initDb()
    const rows = await db.all(
      'SELECT * FROM guest_speakers WHERE is_active = TRUE ORDER BY date DESC, created_at DESC'
    )
    res.json({ speakers: rows })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Public: get single guest speaker
router.get('/:id', async (req, res) => {
  try {
    await initDb()
    const row = await db.get('SELECT * FROM guest_speakers WHERE id = $1', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json({ speaker: row })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: create
router.post('/', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    const { name, bio, photo_url, topic, date, is_active } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const id = uuidv4()
    await db.run(
      `INSERT INTO guest_speakers (id, name, bio, photo_url, topic, date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, bio || '', photo_url || '', topic || '', date || '', is_active !== false]
    )
    const row = await db.get('SELECT * FROM guest_speakers WHERE id = $1', [id])
    res.status(201).json({ speaker: row })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: update
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    const { name, bio, photo_url, topic, date, is_active } = req.body
    const existing = await db.get('SELECT * FROM guest_speakers WHERE id = $1', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Not found' })
    await db.run(
      `UPDATE guest_speakers SET name = $1, bio = $2, photo_url = $3, topic = $4, date = $5, is_active = $6 WHERE id = $7`,
      [name ?? existing.name, bio ?? existing.bio, photo_url ?? existing.photo_url,
       topic ?? existing.topic, date ?? existing.date, is_active ?? existing.is_active, req.params.id]
    )
    const row = await db.get('SELECT * FROM guest_speakers WHERE id = $1', [req.params.id])
    res.json({ speaker: row })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: delete
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    await db.run('DELETE FROM guest_speakers WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
