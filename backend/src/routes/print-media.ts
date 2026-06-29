import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { db, initDb } from '../db.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf')
  }
})

router.get('/', async (req, res) => {
  try {
    await initDb()
    const printMedia = await db.all('SELECT * FROM print_media WHERE is_active = TRUE ORDER BY created_at DESC')
    res.json({ printMedia })
  } catch (err: any) {
    console.error('[PRINT] list error:', err.message)
    res.status(500).json({ error: 'Failed to fetch print media' })
  }
})

router.get('/admin/all', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    const printMedia = await db.all('SELECT * FROM print_media ORDER BY created_at DESC')
    res.json({ printMedia })
  } catch (err: any) {
    console.error('[PRINT] admin list error:', err.message)
    res.status(500).json({ error: 'Failed to fetch print media' })
  }
})

router.post('/', authenticateToken, requireRole('admin'), uploadPdf.single('pdf'), async (req, res) => {
  try {
    await initDb()
    const { title, description, category, page_count, published_date } = req.body
    if (!title) { res.status(400).json({ error: 'Title is required' }); return }
    if (!req.file) { res.status(400).json({ error: 'PDF file is required' }); return }

    const pdf_url: string = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'sureword/print-media', resource_type: 'raw', format: 'pdf', tags: ['print_media'] },
        (err, result) => {
          if (err || !result) reject(err || new Error('Upload failed'))
          else resolve(result.secure_url)
        }
      ).end(req.file!.buffer)
    })

    const id = uuidv4()
    await db.run(
      `INSERT INTO print_media (id, title, description, category, pdf_url, page_count, published_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, title, description || null, category || 'tract', pdf_url,
       page_count ? parseInt(page_count, 10) : null, published_date || null]
    )
    const row = await db.get('SELECT * FROM print_media WHERE id = $1', [id])
    res.status(201).json({ printMedia: row })
  } catch (err: any) {
    console.error('[PRINT] create error:', err.message)
    res.status(500).json({ error: 'Failed to upload print media' })
  }
})

router.patch('/:id', authenticateToken, requireRole('admin'), uploadPdf.single('pdf'), async (req, res) => {
  try {
    await initDb()
    const existing = await db.get('SELECT * FROM print_media WHERE id = $1', [req.params.id])
    if (!existing) { res.status(404).json({ error: 'Not found' }); return }

    const { title, description, category, page_count, published_date, is_active } = req.body

    let pdf_url = existing.pdf_url
    if (req.file) {
      pdf_url = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'sureword/print-media', resource_type: 'raw', format: 'pdf', tags: ['print_media'] },
          (err, result) => {
            if (err || !result) reject(err || new Error('Upload failed'))
            else resolve(result.secure_url)
          }
        ).end(req.file!.buffer)
      })
    }

    const isActiveParsed = is_active === undefined ? existing.is_active
      : (is_active === 'true' || is_active === true)

    await db.run(
      `UPDATE print_media SET title=$1, description=$2, category=$3, pdf_url=$4,
       page_count=$5, published_date=$6, is_active=$7 WHERE id=$8`,
      [
        title ?? existing.title,
        description !== undefined ? description : existing.description,
        category ?? existing.category,
        pdf_url,
        page_count !== undefined ? (page_count ? parseInt(page_count, 10) : null) : existing.page_count,
        published_date !== undefined ? (published_date || null) : existing.published_date,
        isActiveParsed,
        req.params.id
      ]
    )
    const row = await db.get('SELECT * FROM print_media WHERE id = $1', [req.params.id])
    res.json({ printMedia: row })
  } catch (err: any) {
    console.error('[PRINT] patch error:', err.message)
    res.status(500).json({ error: 'Failed to update print media' })
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
