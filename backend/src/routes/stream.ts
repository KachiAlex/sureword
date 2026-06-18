import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db'
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth'
import {
  createStream,
  getStream,
  endStream,
  addListener,
  receiveAudioChunk,
  finalizeBroadcast,
  removeListener,
} from '../services/sseStreaming'

const router = Router()

// SSE endpoint for listeners to connect to a broadcast
router.get('/listen/:broadcastId', async (req, res) => {
  const { broadcastId } = req.params
  const listenerId = uuidv4()

  const success = addListener(broadcastId, listenerId, res)
  if (!success) {
    res.status(404).json({ error: 'Broadcast not found or not live' })
    return
  }
})

// Start a broadcast (broadcaster)
router.post(
  '/start',
  authenticateToken,
  requireRole('broadcaster', 'admin'),
  async (req: AuthRequest, res) => {
    const { title, description, scripture_reference } = req.body
    if (!title) {
      res.status(400).json({ error: 'Title is required' })
      return
    }

    const db = await getDb()
    const existingLive = await db.get(
      'SELECT * FROM broadcasts WHERE status = $1',
      ['live']
    )
    if (existingLive) {
      res.status(409).json({ error: 'A broadcast is already live' })
      return
    }

    const id = uuidv4()
    await db.run(
      'INSERT INTO broadcasts (id, title, description, scripture_reference, status, started_at, broadcaster_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, title, description || '', scripture_reference || '', 'live', new Date().toISOString(), req.user!.id]
    )

    // Create SSE stream
    createStream(id, req.user!.id)

    const broadcast = await db.get('SELECT * FROM broadcasts WHERE id = $1', [id])
    res.status(201).json({ broadcast, streamUrl: `/api/stream/listen/${id}` })
  }
)

// Receive audio chunk from broadcaster (multipart/form-data)
router.post(
  '/chunk/:broadcastId',
  authenticateToken,
  requireRole('broadcaster', 'admin'),
  async (req: AuthRequest, res) => {
    const { broadcastId } = req.params

    const db = await getDb()
    const broadcast = await db.get('SELECT * FROM broadcasts WHERE id = $1', [broadcastId])
    if (!broadcast) {
      res.status(404).json({ error: 'Broadcast not found' })
      return
    }
    if (broadcast.broadcaster_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    // Receive raw audio data from request body
    const chunk = req.body
    if (!Buffer.isBuffer(chunk) || chunk.length === 0) {
      res.status(400).json({ error: 'Audio chunk required in request body' })
      return
    }

    const success = await receiveAudioChunk(broadcastId, req.user!.id, chunk)
    if (!success) {
      res.status(400).json({ error: 'Failed to process chunk' })
      return
    }

    res.json({ received: true, bytes: chunk.length })
  }
)

// End a broadcast
router.post(
  '/end/:broadcastId',
  authenticateToken,
  requireRole('broadcaster', 'admin'),
  async (req: AuthRequest, res) => {
    const { broadcastId } = req.params

    const db = await getDb()
    const broadcast = await db.get('SELECT * FROM broadcasts WHERE id = $1', [broadcastId])
    if (!broadcast) {
      res.status(404).json({ error: 'Broadcast not found' })
      return
    }
    if (broadcast.broadcaster_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    // End SSE stream
    endStream(broadcastId)

    // Update broadcast status
    await db.run(
      'UPDATE broadcasts SET status = $1, ended_at = $2 WHERE id = $3',
      ['ended', new Date().toISOString(), broadcastId]
    )

    // Finalize - concatenate all chunks
    const audioPath = await finalizeBroadcast(broadcastId)

    const updated = await db.get('SELECT * FROM broadcasts WHERE id = $1', [broadcastId])
    res.json({ broadcast: updated, audioPath })
  }
)

// Get stream status
router.get('/status/:broadcastId', async (req, res) => {
  const { broadcastId } = req.params
  const stream = getStream(broadcastId)

  if (!stream) {
    res.status(404).json({ error: 'Stream not found' })
    return
  }

  res.json({
    broadcastId,
    chunkIndex: stream.chunkIndex,
    listenerCount: stream.listeners.size,
    isLive: true,
  })
})

export default router
