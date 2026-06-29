import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, initDb } from '../db.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

// ── GET /sermon-playlists  (admin) ─────────────────────────────
router.get('/', authenticateToken, requireRole('admin'), async (_req, res) => {
  try {
    await initDb()
    const rows = await db.all('SELECT * FROM sermon_playlists ORDER BY created_at DESC')
    res.json({ playlists: rows })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// ── POST /sermon-playlists ─────────────────────────────────────
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { title, description, start_time, end_time } = req.body
    if (!title || !start_time) { res.status(400).json({ error: 'title and start_time are required' }); return }
    const id = uuidv4()
    await db.run(
      `INSERT INTO sermon_playlists (id, title, description, start_time, end_time) VALUES ($1,$2,$3,$4,$5)`,
      [id, title, description || null, start_time, end_time || null]
    )
    res.status(201).json({ id, title, start_time })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// ── PATCH /sermon-playlists/:id ────────────────────────────────
router.patch('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { title, description, start_time, end_time, is_active } = req.body
    await db.run(
      `UPDATE sermon_playlists
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           start_time  = COALESCE($3, start_time),
           end_time    = CASE WHEN $4::text IS NOT NULL THEN $4::timestamptz ELSE end_time END,
           is_active   = COALESCE($5, is_active)
       WHERE id = $6`,
      [title || null, description || null, start_time || null,
       end_time !== undefined ? end_time : null,
       typeof is_active === 'boolean' ? is_active : null,
       req.params.id]
    )
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /sermon-playlists/:id ───────────────────────────────
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    await db.run('DELETE FROM sermon_playlists WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// ── GET /sermon-playlists/:id/items ───────────────────────────
router.get('/:id/items', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const rows = await db.all(
      `SELECT spi.id, spi.sermon_id, spi.order_index, spi.duration_minutes,
              s.title, s.speaker, s.thumbnail_url, s.audio_url
       FROM sermon_playlist_items spi
       JOIN sermons s ON s.id = spi.sermon_id
       WHERE spi.playlist_id = $1
       ORDER BY spi.order_index ASC`,
      [req.params.id]
    )
    res.json({ items: rows })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// ── POST /sermon-playlists/:id/items ──────────────────────────
router.post('/:id/items', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { sermon_id, order_index, duration_minutes } = req.body
    if (!sermon_id) { res.status(400).json({ error: 'sermon_id is required' }); return }
    // prevent duplicates
    const existing = await db.get(
      'SELECT id FROM sermon_playlist_items WHERE playlist_id = $1 AND sermon_id = $2',
      [req.params.id, sermon_id]
    )
    if (existing) { res.status(409).json({ error: 'Sermon already in playlist' }); return }
    const id = uuidv4()
    await db.run(
      `INSERT INTO sermon_playlist_items (id, playlist_id, sermon_id, order_index, duration_minutes)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, req.params.id, sermon_id, order_index ?? 0, duration_minutes ?? 30]
    )
    res.status(201).json({ id, sermon_id, order_index })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// ── PATCH /sermon-playlists/:id/items/:itemId  (reorder) ──────
router.patch('/:id/items/:itemId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { order_index } = req.body
    await db.run(
      'UPDATE sermon_playlist_items SET order_index = $1 WHERE id = $2 AND playlist_id = $3',
      [order_index, req.params.itemId, req.params.id]
    )
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /sermon-playlists/:id/items/:itemId ────────────────
router.delete('/:id/items/:itemId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    await db.run(
      'DELETE FROM sermon_playlist_items WHERE id = $1 AND playlist_id = $2',
      [req.params.itemId, req.params.id]
    )
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

export default router
