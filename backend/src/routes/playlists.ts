import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, initDb } from '../db.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

/* ── GET /playlists ──────────────────────────────────────────── */
router.get('/', authenticateToken, requireRole('admin'), async (_req, res) => {
  try {
    await initDb()
    const rows = await db.all('SELECT * FROM playlists ORDER BY created_at DESC')
    res.json({ playlists: rows })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── POST /playlists ───────────────────────────────────────── */
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { title, description, repeat_mode, shuffle } = req.body
    if (!title) { res.status(400).json({ error: 'title is required' }); return }
    const id = uuidv4()
    await db.run(
      `INSERT INTO playlists (id, title, description, repeat_mode, shuffle) VALUES ($1,$2,$3,$4,$5)`,
      [id, title, description || null, repeat_mode || 'none', !!shuffle]
    )
    res.status(201).json({ id, title })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── PATCH /playlists/:id ──────────────────────────────────── */
router.patch('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { title, description, repeat_mode, shuffle } = req.body
    await db.run(
      `UPDATE playlists
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           repeat_mode = COALESCE($3, repeat_mode),
           shuffle     = COALESCE($4, shuffle)
       WHERE id = $5`,
      [title || null, description || null, repeat_mode || null,
       typeof shuffle === 'boolean' ? shuffle : null,
       req.params.id]
    )
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── DELETE /playlists/:id ──────────────────────────────────── */
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    await db.run('DELETE FROM playlists WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── GET /playlists/:id/items ──────────────────────────────── */
router.get('/:id/items', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const rows = await db.all(
      `SELECT pi.id, pi.content_type, pi.content_id, pi.order_index, pi.duration_minutes,
              COALESCE(s.title, m.title) as title,
              COALESCE(s.speaker, m.artist) as speaker,
              COALESCE(s.thumbnail_url, m.cover_url) as thumbnail_url,
              COALESCE(s.audio_url, m.audio_url) as audio_url
       FROM playlist_items pi
       LEFT JOIN sermons s ON s.id = pi.content_id AND pi.content_type = 'sermon'
       LEFT JOIN music m ON m.id = pi.content_id AND pi.content_type = 'music'
       WHERE pi.playlist_id = $1
       ORDER BY pi.order_index ASC`,
      [req.params.id]
    )
    res.json({ items: rows })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── POST /playlists/:id/items ─────────────────────────────── */
router.post('/:id/items', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { content_type, content_id, order_index, duration_minutes } = req.body
    if (!content_type || !content_id) { res.status(400).json({ error: 'content_type and content_id are required' }); return }
    if (!['sermon', 'music'].includes(content_type)) { res.status(400).json({ error: 'content_type must be sermon or music' }); return }
    // prevent duplicates
    const existing = await db.get(
      'SELECT id FROM playlist_items WHERE playlist_id = $1 AND content_type = $2 AND content_id = $3',
      [req.params.id, content_type, content_id]
    )
    if (existing) { res.status(409).json({ error: 'Item already in playlist' }); return }
    const id = uuidv4()
    await db.run(
      `INSERT INTO playlist_items (id, playlist_id, content_type, content_id, order_index, duration_minutes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, req.params.id, content_type, content_id, order_index ?? 0, duration_minutes ?? 30]
    )
    res.status(201).json({ id, content_type, content_id, order_index })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── PATCH /playlists/:id/items/:itemId (reorder) ──────────── */
router.patch('/:id/items/:itemId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { order_index } = req.body
    await db.run(
      'UPDATE playlist_items SET order_index = $1 WHERE id = $2 AND playlist_id = $3',
      [order_index, req.params.itemId, req.params.id]
    )
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── DELETE /playlists/:id/items/:itemId ───────────────────── */
router.delete('/:id/items/:itemId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    await db.run(
      'DELETE FROM playlist_items WHERE id = $1 AND playlist_id = $2',
      [req.params.itemId, req.params.id]
    )
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

/* ── POST /playlists/:id/reorder (batch) ───────────────────── */
router.post('/:id/reorder', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { itemIds } = req.body as { itemIds: string[] }
    if (!Array.isArray(itemIds)) { res.status(400).json({ error: 'itemIds array required' }); return }
    for (let i = 0; i < itemIds.length; i++) {
      await db.run(
        'UPDATE playlist_items SET order_index = $1 WHERE id = $2 AND playlist_id = $3',
        [i, itemIds[i], req.params.id]
      )
    }
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

export default router
