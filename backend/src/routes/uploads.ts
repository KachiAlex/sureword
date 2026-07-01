import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { optimizeImage } from '../middleware/optimizeImage.js'

const router = Router()

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    cb(null, allowed.includes(file.mimetype))
  }
})

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/flac']
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/'))
  }
})

function uploadStream(buffer: Buffer, folder: string, resource_type: 'image' | 'video' | 'raw'): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder, resource_type }, (err, result) => {
      if (err || !result) reject(err || new Error('Upload failed'))
      else resolve(result.secure_url)
    }).end(buffer)
  })
}

/* ── Proxy upload endpoints (Cloudinary hidden from frontend) ── */

router.post('/image', authenticateToken, requireRole('broadcaster', 'admin'), uploadImage.single('image'), optimizeImage, async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Image file required' }); return }

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const url = await uploadStream(req.file.buffer, 'sureword/uploads', 'image')
      res.json({ url })
    } else {
      const base64 = req.file.buffer.toString('base64')
      const url = `data:${req.file.mimetype};base64,${base64}`
      res.json({ url })
    }
  } catch (err: any) {
    console.error('[UPLOADS] image error:', err.message)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

router.post('/audio', authenticateToken, requireRole('admin'), uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Audio file required' }); return }

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const url = await uploadStream(req.file.buffer, 'sureword/audio', 'video')
      res.json({ url })
    } else {
      const base64 = req.file.buffer.toString('base64')
      const url = `data:${req.file.mimetype};base64,${base64}`
      res.json({ url })
    }
  } catch (err: any) {
    console.error('[UPLOADS] audio error:', err.message)
    res.status(500).json({ error: 'Failed to upload audio' })
  }
})

export default router
