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

router.post('/image', authenticateToken, requireRole('broadcaster', 'admin'), uploadImage.single('image'), optimizeImage, async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Image file required' }); return }

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const image_url = await new Promise<string>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'sureword/uploads', resource_type: 'image' },
          (err, result) => {
            if (err || !result) reject(err || new Error('Upload failed'))
            else resolve(result.secure_url)
          }
        ).end(req.file!.buffer)
      })
      res.json({ image_url })
    } else {
      const base64 = req.file.buffer.toString('base64')
      const image_url = `data:${req.file.mimetype};base64,${base64}`
      res.json({ image_url })
    }
  } catch (err: any) {
    console.error('[UPLOADS] image error:', err.message)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

export default router
