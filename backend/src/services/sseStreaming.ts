import { Response } from 'express'
import fs from 'fs'
import path from 'path'
import { getDb } from '../db'

const chunksDir = './data/chunks'
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true })
}

interface Listener {
  res: Response
  heartbeat: NodeJS.Timeout
}

interface BroadcastStream {
  broadcastId: string
  chunkIndex: number
  broadcasterId: string | null
  listeners: Map<string, Listener>
}

const activeStreams = new Map<string, BroadcastStream>()

export function createStream(broadcastId: string, broadcasterId: string): BroadcastStream {
  const stream: BroadcastStream = {
    broadcastId,
    chunkIndex: 0,
    broadcasterId,
    listeners: new Map(),
  }
  activeStreams.set(broadcastId, stream)
  return stream
}

export function getStream(broadcastId: string): BroadcastStream | undefined {
  return activeStreams.get(broadcastId)
}

export function endStream(broadcastId: string): void {
  const stream = activeStreams.get(broadcastId)
  if (!stream) return

  // Notify all listeners
  stream.listeners.forEach((listener) => {
    listener.res.write(`event: ended\ndata: ${JSON.stringify({ broadcastId })}\n\n`)
    clearInterval(listener.heartbeat)
    listener.res.end()
  })

  activeStreams.delete(broadcastId)
}

export function addListener(broadcastId: string, listenerId: string, res: Response): boolean {
  const stream = activeStreams.get(broadcastId)
  if (!stream) return false

  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

  // Send initial connection message
  res.write(`event: connected\ndata: ${JSON.stringify({ broadcastId, chunkIndex: stream.chunkIndex })}\n\n`)

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n')
  }, 30000)

  stream.listeners.set(listenerId, { res, heartbeat })

  // Remove listener on disconnect
  res.on('close', () => {
    clearInterval(heartbeat)
    stream.listeners.delete(listenerId)
  })

  return true
}

export async function receiveAudioChunk(
  broadcastId: string,
  broadcasterId: string,
  chunk: Buffer
): Promise<boolean> {
  const stream = activeStreams.get(broadcastId)
  if (!stream || stream.broadcasterId !== broadcasterId) return false

  const broadcastDir = path.join(chunksDir, broadcastId)
  if (!fs.existsSync(broadcastDir)) {
    fs.mkdirSync(broadcastDir, { recursive: true })
  }

  const chunkPath = path.join(broadcastDir, `${stream.chunkIndex}.webm`)
  fs.writeFileSync(chunkPath, chunk)

  // Store in DB
  const db = await getDb()
  await db.run(
    'INSERT INTO audio_chunks (id, broadcast_id, chunk_index, file_path) VALUES ($1, $2, $3, $4)',
    [`${broadcastId}-${stream.chunkIndex}`, broadcastId, stream.chunkIndex, chunkPath]
  )

  // Broadcast to all listeners via SSE
  const base64Chunk = chunk.toString('base64')
  const message = `event: chunk\ndata: ${JSON.stringify({
    chunkIndex: stream.chunkIndex,
    chunk: base64Chunk,
    timestamp: Date.now(),
  })}\n\n`

  stream.listeners.forEach((listener) => {
    listener.res.write(message)
  })

  stream.chunkIndex++
  return true
}

export async function finalizeBroadcast(broadcastId: string): Promise<string | null> {
  const stream = activeStreams.get(broadcastId)
  if (!stream) return null

  const broadcastDir = path.join(chunksDir, broadcastId)
  if (!fs.existsSync(broadcastDir)) return null

  const db = await getDb()
  const chunks = await db.all(
    'SELECT * FROM audio_chunks WHERE broadcast_id = $1 ORDER BY chunk_index ASC',
    [broadcastId]
  )

  if (chunks.length === 0) return null

  // Concatenate chunks
  const uploadsDir = './uploads/sermons'
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const outputPath = path.join(uploadsDir, `${broadcastId}.webm`)
  const outputStream = fs.createWriteStream(outputPath)

  for (const chunk of chunks) {
    const data = fs.readFileSync(chunk.file_path)
    outputStream.write(data)
  }
  outputStream.end()

  await db.run(
    'UPDATE broadcasts SET audio_path = $1 WHERE id = $2',
    [outputPath, broadcastId]
  )

  // Cleanup
  for (const chunk of chunks) {
    try { fs.unlinkSync(chunk.file_path) } catch {}
  }
  try { fs.rmdirSync(broadcastDir) } catch {}

  return outputPath
}

export function removeListener(broadcastId: string, listenerId: string): void {
  const stream = activeStreams.get(broadcastId)
  if (!stream) return

  const listener = stream.listeners.get(listenerId)
  if (listener) {
    clearInterval(listener.heartbeat)
    stream.listeners.delete(listenerId)
  }
}
