import { Router } from 'express'
import { db, initDb } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// GET /bookmarks — list my bookmarked sermons
router.get('/', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    const rows = await db.all(
      `SELECT s.*, sb.created_at as bookmarked_at
       FROM sermon_bookmarks sb
       JOIN sermons s ON s.id = sb.sermon_id
       WHERE sb.user_id = $1
       ORDER BY sb.created_at DESC`,
      [user.id]
    )
    res.json({ sermons: rows })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /bookmarks/:sermon_id — toggle bookmark
router.post('/:sermon_id', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    const { sermon_id } = req.params
    const existing = await db.get(
      'SELECT id FROM sermon_bookmarks WHERE user_id = $1 AND sermon_id = $2',
      [user.id, sermon_id]
    )
    if (existing) {
      await db.run('DELETE FROM sermon_bookmarks WHERE user_id = $1 AND sermon_id = $2', [user.id, sermon_id])
      res.json({ bookmarked: false })
    } else {
      await db.run(
        'INSERT INTO sermon_bookmarks (user_id, sermon_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, sermon_id]
      )
      res.json({ bookmarked: true })
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /bookmarks/ids — just the sermon ids the user has bookmarked (for fast client-side checks)
router.get('/ids', authenticateToken, async (req, res) => {
  try {
    await initDb()
    const user = (req as any).user
    const rows = await db.all('SELECT sermon_id FROM sermon_bookmarks WHERE user_id = $1', [user.id])
    res.json({ ids: rows.map((r: any) => r.sermon_id) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
