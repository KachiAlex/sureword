import { Router } from 'express'
import { db, initDb } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// GET /history — my listening history
router.get('/', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    const rows = await db.all(
      `SELECT s.*, lh.played_at, lh.progress
       FROM listening_history lh
       JOIN sermons s ON s.id = lh.sermon_id
       WHERE lh.user_id = $1
       ORDER BY lh.played_at DESC
       LIMIT $2`,
      [user.id, limit]
    )
    res.json({ sermons: rows })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /history/:sermon_id — record/update a play (upsert)
router.post('/:sermon_id', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    const { sermon_id } = req.params
    const { progress = 0 } = req.body
    await db.run(
      `INSERT INTO listening_history (user_id, sermon_id, played_at, progress)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (user_id, sermon_id) DO UPDATE SET played_at = NOW(), progress = EXCLUDED.progress`,
      [user.id, sermon_id, progress]
    )
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /history — clear all history
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    await db.run('DELETE FROM listening_history WHERE user_id = $1', [user.id])
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
