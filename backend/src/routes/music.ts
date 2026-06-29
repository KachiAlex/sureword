import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { v4 as uuidv4 } from 'uuid'
import { db, initDb } from '../db.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } })

function uploadStream(buffer: Buffer, folder: string, resource_type: 'video' | 'image' | 'raw'): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder, resource_type }, (err, result) => {
      if (err || !result) reject(err || new Error('Cloudinary upload failed'))
      else resolve(result.secure_url)
    }).end(buffer)
  })
}

// GET /music
router.get('/', async (_req, res) => {
  try {
    await initDb()
    const rows = await db.all(
      'SELECT id, title, artist, album, genre, audio_url, cover_url, duration, lyrics, file_format, file_size, play_count, created_at FROM music ORDER BY created_at DESC'
    )
    res.json({ music: rows })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /music/:id/play  (public — increment play count)
router.post('/:id/play', async (req, res) => {
  try {
    await initDb()
    await db.run('UPDATE music SET play_count = COALESCE(play_count, 0) + 1 WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// GET /music/signature  (Cloudinary signed-upload helper for frontend direct upload)
router.get('/signature', authenticateToken, requireRole('admin'), (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
  const apiKey = process.env.CLOUDINARY_API_KEY || ''
  const apiSecret = process.env.CLOUDINARY_API_SECRET || ''
  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: 'Cloudinary not configured' }); return
  }
  const folder = (req.query.folder as string) || 'sureword/uploads'
  const timestamp = Math.round(Date.now() / 1000)
  const crypto = require('crypto')
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex')
  res.json({
    signature, timestamp, apiKey, cloudName: cloudName, folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
  })
})

// POST /music  (admin — upload with multipart or URL)
router.post('/', authenticateToken, requireRole('admin'),
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    try {
      await initDb()
      const { title, artist, album, genre, cover_url, duration, lyrics } = req.body
      if (!title) { res.status(400).json({ error: 'Title required' }); return }

      const files = req.files as { audio?: Express.Multer.File[]; cover?: Express.Multer.File[] } | undefined
      let audio_url: string = req.body.audio_url || ''
      let file_format = req.body.file_format || ''
      let file_size = 0

      if (files?.audio?.[0]) {
        const f = files.audio[0]
        file_format = f.mimetype
        file_size = f.size
        audio_url = await uploadStream(f.buffer, 'sureword/music/audio', 'video')
      }
      if (!audio_url) { res.status(400).json({ error: 'Audio file or URL required' }); return }

      let finalCover: string = cover_url || req.body.cover_url || ''
      if (files?.cover?.[0]) {
        finalCover = await uploadStream(files.cover[0].buffer, 'sureword/music/covers', 'image')
      }

      const id = uuidv4()
      await db.run(
        `INSERT INTO music (id, title, artist, album, genre, audio_url, cover_url, duration, lyrics, file_format, file_size)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, title, artist || '', album || '', genre || '', audio_url, finalCover || '',
         parseInt(duration) || 0, lyrics || '', file_format, file_size]
      )
      res.status(201).json({ id, title })
    } catch (e: any) { res.status(500).json({ error: e.message || 'Upload failed' }) }
  }
)

// DELETE /music/:id
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initDb()
    await db.run('DELETE FROM music WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

export default router
