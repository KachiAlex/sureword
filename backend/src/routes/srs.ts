import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, initDb } from '../db.js'
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

const SRS_API_URL = 'http://127.0.0.1:1985/api/v1'

// Helper to call SRS HTTP API
async function srsFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${SRS_API_URL}${path}`, options)
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`SRS API error ${res.status}: ${text}`)
  }
  return res.json()
}

// Create a new SRS stream for a broadcast
router.post('/streams', authenticateToken, requireRole('broadcaster', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    await initDb()
    const { broadcastId } = req.body
    if (!broadcastId) { res.status(400).json({ error: 'broadcastId required' }); return }

    const broadcast = await db.get('SELECT * FROM broadcasts WHERE id = $1', [broadcastId])
    if (!broadcast) { res.status(404).json({ error: 'Broadcast not found' }); return }

    const streamKey = broadcast.stream_key || uuidv4()

    // Update broadcast with stream key and type
    await db.run(
      `UPDATE broadcasts SET stream_key = $1, stream_type = 'srs_rtmp' WHERE id = $2`,
      [streamKey, broadcastId]
    )

    const rtmpUrl = `rtmp://${process.env.SRS_HOST || 'sureword.fly.dev'}:1935/live/${streamKey}`
    const hlsUrl = `/hls/live/${streamKey}.m3u8`

    res.json({
      broadcastId,
      streamKey,
      rtmpUrl,
      hlsUrl,
      streamType: 'srs_rtmp'
    })
  } catch (err: any) {
    console.error('[SRS] create stream error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Get SRS stream status
router.get('/streams/:streamKey', async (req, res) => {
  try {
    const { streamKey } = req.params
    const data = await srsFetch(`/streams?app=live&stream=${streamKey}&vhost=__defaultVhost__`)
    res.json(data)
  } catch (err: any) {
    console.error('[SRS] get stream error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Check if HLS stream is ready (DB status + filesystem)
router.get('/streams/:streamKey/ready', async (req, res) => {
  try {
    const { streamKey } = req.params
    await initDb()
    const fs = await import('fs/promises')
    const manifestPath = `/tmp/srs/hls/live/${streamKey}.m3u8`

    // Primary signal: broadcast status set by on_publish webhook
    const broadcast = await db.get(
      `SELECT status FROM broadcasts WHERE stream_key = $1`,
      [streamKey]
    )
    const isLive = broadcast?.status === 'live'

    // Verify manifest has actual .ts segments
    let hasSegments = false
    try {
      const stats = await fs.stat(manifestPath)
      if (stats.size > 0) {
        const content = await fs.readFile(manifestPath, 'utf-8')
        hasSegments = content.includes('.ts')
      }
    } catch {}

    // Only ready when broadcaster is connected AND segments exist
    if (isLive && hasSegments) {
      console.log('[SRS] ready check - ready:', streamKey)
      return res.json({ ready: true, source: 'db_live' })
    }

    console.log('[SRS] ready check - not ready:', streamKey, 'isLive=', isLive, 'hasSegments=', hasSegments)
    return res.json({ ready: false })
  } catch (err: any) {
    console.error('[SRS] ready check error:', err.message)
    res.status(500).json({ ready: false, error: err.message })
  }
})

// SRS webhook: stream started publishing
router.post('/hooks/on_publish', async (req, res) => {
  try {
    await initDb()
    const body = req.body || {}
    const stream = body.stream || body.name || req.query?.stream
    console.log('[SRS] on_publish webhook received:', JSON.stringify(body))
    if (!stream) {
      console.error('[SRS] on_publish - missing stream key. Body keys:', Object.keys(body))
      res.status(400).json({ error: 'Missing stream key' })
      return
    }

    const result = await db.run(
      `UPDATE broadcasts SET status = 'live' WHERE stream_key = $1`,
      [stream]
    )
    if (result.changes === 0) {
      console.warn('[SRS] on_publish - no broadcast found for stream_key:', stream)
    } else {
      console.log('[SRS] stream started and db updated:', stream, 'changes:', result.changes)
    }
    res.json({ code: 0 })
  } catch (err: any) {
    console.error('[SRS] on_publish error:', err.message)
    res.json({ code: 0 }) // Always return success to SRS
  }
})

// SRS webhook: stream stopped publishing
router.post('/hooks/on_unpublish', async (req, res) => {
  try {
    await initDb()
    const stream = req.body?.stream || req.query?.stream
    if (!stream) { res.status(400).json({ error: 'Missing stream key' }); return }

    // Do NOT end the broadcast here — the broadcaster controls lifecycle via admin UI.
    // Just log the unpublish event.
    console.log('[SRS] stream stopped:', stream)
    res.json({ code: 0 })
  } catch (err: any) {
    console.error('[SRS] on_unpublish error:', err.message)
    res.json({ code: 0 }) // Always return success to SRS
  }
})

// Delete SRS stream (kick publisher)
router.delete('/streams/:streamKey', authenticateToken, requireRole('broadcaster', 'admin'), async (req, res) => {
  try {
    const { streamKey } = req.params
    await srsFetch(`/clients?app=live&stream=${streamKey}&kickoff=1`)
    res.json({ success: true })
  } catch (err: any) {
    console.error('[SRS] delete stream error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
