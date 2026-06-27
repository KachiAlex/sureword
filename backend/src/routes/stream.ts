import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, initDb } from '../db.js'
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// Upload chunk (broadcaster)
router.post('/:id/chunk', authenticateToken, requireRole('broadcaster', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await initDb()
    const { chunkIndex, chunkData } = req.body
    if (typeof chunkData !== 'string' || chunkData.length === 0) {
      res.status(400).json({ error: 'Invalid chunk data' }); return
    }
    const chunkId = uuidv4()
    await db.query(
      `INSERT INTO stream_chunks (id, broadcast_id, chunk_index, chunk_data) VALUES ($1,$2,$3,$4)`,
      [chunkId, req.params.id, chunkIndex, chunkData]
    )
    // Keep last 300 chunks (~10 minutes at 2s interval)
    await db.query(
      `DELETE FROM stream_chunks WHERE broadcast_id=$1 AND chunk_index < $2`,
      [req.params.id, chunkIndex - 300]
    )
    res.json({ success: true })
  } catch (err: any) {
    console.error('[STREAM] chunk upload error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Get single chunk
router.get('/:id/chunk/:index', async (req: Request, res: Response) => {
  try {
    await initDb()
    const row = await db.get(
      `SELECT chunk_data FROM stream_chunks WHERE broadcast_id=$1 AND chunk_index=$2`,
      [req.params.id, req.params.index]
    )
    if (!row) { res.status(404).json({ error: 'Chunk not found' }); return }
    const buffer = Buffer.from(row.chunk_data, 'base64')
    res.setHeader('Content-Type', 'audio/webm;codecs=opus')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.send(buffer)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Concat endpoint: returns chunks as a single continuous blob
router.get('/:id/concat', async (req: Request, res: Response) => {
  try {
    await initDb()
    const { id } = req.params
    const fromIndex = parseInt(req.query.from as string || '0', 10)
    const rows = await db.all(
      `SELECT chunk_index, chunk_data FROM stream_chunks WHERE broadcast_id=$1 AND chunk_index >= $2 ORDER BY chunk_index ASC LIMIT 120`,
      [id, fromIndex]
    )
    if (!rows.length) { res.status(404).json({ error: 'No stream data' }); return }

    const chunks: Buffer[] = []
    let latestIndex = -1
    for (const row of rows) {
      chunks.push(Buffer.from(row.chunk_data, 'base64'))
      latestIndex = Math.max(latestIndex, row.chunk_index)
    }
    const combined = Buffer.concat(chunks)

    res.setHeader('Content-Type', 'audio/webm;codecs=opus')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Access-Control-Expose-Headers', 'X-Latest-Chunk')
    res.setHeader('X-Latest-Chunk', String(latestIndex))
    res.send(combined)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// HLS playlist endpoint
router.get('/:id/playlist.m3u8', async (req: Request, res: Response) => {
  try {
    await initDb()
    const { id } = req.params
    const rows = await db.all(
      `SELECT chunk_index FROM stream_chunks WHERE broadcast_id=$1 ORDER BY chunk_index DESC LIMIT 8`,
      [id]
    )
    if (!rows.length) { res.status(404).json({ error: 'No stream data' }); return }

    const indices = rows.map((r: any) => r.chunk_index).sort((a: number, b: number) => a - b)
    const mediaSeq = indices[0]

    let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:' + mediaSeq + '\n'
    for (const idx of indices) {
      m3u8 += '#EXTINF:2.0,\nchunk/' + idx + '\n'
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.send(m3u8)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Stream info
router.get('/:id/info', async (req: Request, res: Response) => {
  try {
    await initDb()
    const rows = await db.all(
      `SELECT chunk_index FROM stream_chunks WHERE broadcast_id=$1 ORDER BY chunk_index DESC LIMIT 1`,
      [req.params.id]
    )
    const count = await db.get(`SELECT COUNT(*) as count FROM stream_chunks WHERE broadcast_id=$1`, [req.params.id])
    const listeners = await db.get(`SELECT COUNT(*) as count FROM stream_listeners WHERE broadcast_id=$1`, [req.params.id])
    res.json({
      latestChunk: rows[0]?.chunk_index ?? -1,
      totalChunks: Number(count?.count || 0),
      isLive: rows.length > 0,
      listenerCount: Number(listeners?.count || 0)
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Listener join
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    await initDb()
    const { sessionId } = req.body
    if (!sessionId) { res.status(400).json({ error: 'Missing sessionId' }); return }
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] as string ||
               req.socket?.remoteAddress || ''
    let country = '', region = '', city = ''
    if (ip && ip !== '::1' && !ip.startsWith('127.') && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city,status`)
        const geo = await geoRes.json() as any
        if (geo.status === 'success') { country = geo.country || ''; region = geo.regionName || ''; city = geo.city || '' }
      } catch {}
    }
    await db.query(
      `INSERT INTO stream_listeners (id, broadcast_id, session_id, last_seen, ip, country, region, city) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7)`,
      [uuidv4(), req.params.id, sessionId, ip, country, region, city]
    )
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Listener heartbeat
router.post('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    await initDb()
    const { sessionId } = req.body
    if (!sessionId) { res.status(400).json({ error: 'Missing sessionId' }); return }
    await db.query(
      `UPDATE stream_listeners SET last_seen=NOW() WHERE broadcast_id=$1 AND session_id=$2`,
      [req.params.id, sessionId]
    )
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Listener leave
router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    await initDb()
    const { sessionId } = req.body
    if (!sessionId) { res.status(400).json({ error: 'Missing sessionId' }); return }
    await db.query(
      `DELETE FROM stream_listeners WHERE broadcast_id=$1 AND session_id=$2`,
      [req.params.id, sessionId]
    )
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Clear stream chunks (called when broadcast ends)
router.delete('/:id', authenticateToken, requireRole('broadcaster', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await initDb()
    await db.query(`DELETE FROM stream_chunks WHERE broadcast_id=$1`, [req.params.id])
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Geo analytics (admin only)
router.get('/:id/listeners/geo', authenticateToken, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await initDb()
    const rows = await db.all(
      `SELECT country, region, city, COUNT(*) as count FROM stream_listeners
       WHERE broadcast_id=$1 AND last_seen > NOW() - INTERVAL '5 minutes'
         AND country IS NOT NULL AND country != ''
       GROUP BY country, region, city ORDER BY count DESC LIMIT 50`,
      [req.params.id])
    const byCountry = await db.all(
      `SELECT country, COUNT(*) as count FROM stream_listeners
       WHERE broadcast_id=$1 AND last_seen > NOW() - INTERVAL '5 minutes'
         AND country IS NOT NULL AND country != ''
       GROUP BY country ORDER BY count DESC LIMIT 20`,
      [req.params.id])
    res.json({ locations: rows, byCountry })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
