import { Router } from 'express'
import { db, initDb } from '../db.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', async (req, res) => {
  try {
    await initDb()
    const printMedia = await db.all('SELECT * FROM print_media ORDER BY created_at DESC')
    res.json({ printMedia })
  } catch (err: any) {
    console.error('[PRINT] list error:', err.message)
    res.status(500).json({ error: 'Failed to fetch print media' })
  }
})

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const { title, description, category, pdf_url } = req.body
    if (!title || !pdf_url) {
      res.status(400).json({ error: 'Title and PDF URL are required' })
      return
    }
    const id = uuidv4()
    await db.run(
      `INSERT INTO print_media (id, title, description, category, pdf_url) VALUES ($1, $2, $3, $4, $5)`,
      [id, title, description || null, category || 'tract', pdf_url]
    )
    res.json({ printMedia: { id, title, description, category, pdf_url } })
  } catch (err: any) {
    console.error('[PRINT] create error:', err.message)
    res.status(500).json({ error: 'Failed to create print media' })
  }
})

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    await db.run('DELETE FROM print_media WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[PRINT] delete error:', err.message)
    res.status(500).json({ error: 'Failed to delete print media' })
  }
})

export default router
