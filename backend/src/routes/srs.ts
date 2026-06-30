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
    const data = await srsFetch(`/streams?app=live&stream=${streamKey}`)
    res.json(data)
  } catch (err: any) {
    console.error('[SRS] get stream error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Check if HLS stream is ready (SRS API + filesystem)
router.get('/streams/:streamKey/ready', async (req, res) => {
  try {
    const { streamKey } = req.params
    // Try SRS API first
    const srsRes = await fetch(`${SRS_API_URL}/streams?app=live&stream=${streamKey}`)
    if (srsRes.ok) {
      const data = await srsRes.json()
      console.log('[SRS] ready check - API says active:', streamKey)
      return res.json({ ready: true, source: 'srs_api', stream: data })
    }
    // Fallback: check filesystem
    const fs = await import('fs/promises')
    const manifestPath = `/tmp/srs/hls/live/${streamKey}.m3u8`
    try {
      await fs.access(manifestPath)
      console.log('[SRS] ready check - filesystem exists:', streamKey)
      return res.json({ ready: true, source: 'filesystem' })
    } catch {
      console.log('[SRS] ready check - not ready:', streamKey)
      return res.json({ ready: false })
    }
  } catch (err: any) {
    console.error('[SRS] ready check error:', err.message)
    res.status(500).json({ ready: false, error: err.message })
  }
})

// SRS webhook: stream started publishing
router.post('/hooks/on_publish', async (req, res) => {
  try {
    await initDb()
    const { stream } = req.body
    if (!stream) { res.status(400).json({ error: 'Missing stream key' }); return }

    await db.run(
      `UPDATE broadcasts SET status = 'live' WHERE stream_key = $1`,
      [stream]
    )
    console.log('[SRS] stream started:', stream)
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
    const { stream } = req.body
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
