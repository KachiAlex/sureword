import { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { spawn, ChildProcess } from 'child_process'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from './middleware/auth.js'
import { db, initDb } from './db.js'

let io: SocketIOServer | null = null
export function getIO() { return io }

/* ── SRS ffmpeg ingest: browser WebM → RTMP ─────────────────────────────── */
interface ActiveEncoder {
  process: ChildProcess
  stdin: NodeJS.WritableStream
  streamKey: string
  bytesWritten: number
}
const activeEncoders = new Map<string, ActiveEncoder>() // key = socket.id

function killEncoder(socketId: string) {
  const enc = activeEncoders.get(socketId)
  if (!enc) return
  console.log(`[SRS] killing encoder for ${enc.streamKey}`)
  try { enc.stdin.end() } catch {}
  try { enc.process.kill('SIGTERM') } catch {}
  // Force kill after 3s if still alive
  setTimeout(() => {
    if (!enc.process.killed) {
      try { enc.process.kill('SIGKILL') } catch {}
    }
  }, 3000)
  activeEncoders.delete(socketId)
}

function startEncoder(socketId: string, streamKey: string): ActiveEncoder | null {
  if (activeEncoders.has(socketId)) killEncoder(socketId)

  const rtmpUrl = `rtmp://127.0.0.1:1935/live/${streamKey}`
  console.log(`[SRS] starting ffmpeg → ${rtmpUrl}`)

  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning',
    '-f', 'webm', '-i', 'pipe:0',
    '-c:a', 'aac', '-ar', '44100', '-ac', '2',
    '-b:a', '128k', '-bufsize', '256k',
    '-f', 'flv', rtmpUrl
  ])

  let stderr = ''
  ffmpeg.stderr?.on('data', (d) => { stderr += d.toString() })
  ffmpeg.on('exit', (code) => {
    console.log(`[SRS] ffmpeg exited code=${code} for ${streamKey}`)
    if (code !== 0 && stderr) console.error('[SRS] ffmpeg stderr:', stderr.slice(-500))
    activeEncoders.delete(socketId)
  })

  if (!ffmpeg.stdin) {
    console.error('[SRS] ffmpeg stdin missing')
    return null
  }

  const enc: ActiveEncoder = {
    process: ffmpeg,
    stdin: ffmpeg.stdin,
    streamKey,
    bytesWritten: 0
  }
  activeEncoders.set(socketId, enc)
  return enc
}

export function initWebSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
    maxHttpBufferSize: 2e6, // 2 MB max per binary packet
  })

  io.on('connection', (socket) => {
    let userId: string | null = null
    let userName: string | null = null
    let currentRoom: string | null = null

    const token = socket.handshake.auth?.token as string | undefined
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        userId = decoded?.id || null
        userName = decoded?.name || null
      } catch {}
    }

    /* ── Chat / broadcast room helpers ── */
    socket.on('join_broadcast', (broadcastId: string) => {
      if (currentRoom) socket.leave(currentRoom)
      currentRoom = `broadcast_${broadcastId}`
      socket.join(currentRoom)
    })

    socket.on('leave_broadcast', () => {
      if (currentRoom) { socket.leave(currentRoom); currentRoom = null }
    })

    socket.on('send_message', async (payload: { broadcastId: string; message: string; recipientId?: string }) => {
      try {
        await initDb()
        const { broadcastId, message, recipientId } = payload
        const trimmed = message.trim()
        if (!trimmed) return

        const isPrivate = !!recipientId
        const id = crypto.randomUUID()
        await db.run(
          `INSERT INTO chat_messages (id, broadcast_id, user_id, user_name, recipient_id, message, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, broadcastId, userId, userName, recipientId || null, trimmed, isPrivate]
        )

        const msg = { id, broadcast_id: broadcastId, user_id: userId, user_name: userName, recipient_id: recipientId || null, message: trimmed, is_private: isPrivate, created_at: new Date().toISOString() }
        const room = `broadcast_${broadcastId}`
        io!.to(room).emit('new_message', msg)
      } catch (err: any) {
        console.error('[WS] send_message error:', err.message)
      }
    })

    socket.on('send_guest_message', async (payload: { broadcastId: string; message: string; guestName: string }) => {
      try {
        await initDb()
        const { broadcastId, message, guestName } = payload
        const trimmed = message.trim()
        const gName = (guestName || 'Guest').trim()
        if (!trimmed) return

        const id = crypto.randomUUID()
        await db.run(
          `INSERT INTO chat_messages (id, broadcast_id, guest_name, message, is_private) VALUES ($1, $2, $3, $4, $5)`,
          [id, broadcastId, gName, trimmed, false]
        )

        const msg = { id, broadcast_id: broadcastId, guest_name: gName, message: trimmed, is_private: false, created_at: new Date().toISOString() }
        io!.to(`broadcast_${broadcastId}`).emit('new_message', msg)
      } catch (err: any) {
        console.error('[WS] guest message error:', err.message)
      }
    })

    socket.on('broadcast_chunk', async (payload: { broadcastId: string; chunkIndex: number; chunkData: string }) => {
      try {
        await initDb()
        const { broadcastId, chunkIndex, chunkData } = payload
        await db.run(
          `INSERT INTO stream_chunks (id, broadcast_id, chunk_index, chunk_data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [crypto.randomUUID(), broadcastId, chunkIndex, chunkData]
        )
        io!.to(`broadcast_${broadcastId}`).emit('stream_chunk', { chunkIndex, chunkData })
      } catch (err: any) {
        console.error('[WS] broadcast_chunk error:', err.message)
      }
    })

    /* ── SRS ingest: browser → ffmpeg → RTMP ── */
    socket.on('start_srs_ingest', async (payload: { streamKey: string }) => {
      try {
        const { streamKey } = payload
        if (!streamKey) { socket.emit('srs_error', 'Missing streamKey'); return }

        // Verify the broadcast exists and is live
        await initDb()
        const broadcast = await db.get('SELECT * FROM broadcasts WHERE stream_key = $1', [streamKey])
        if (!broadcast) { socket.emit('srs_error', 'Broadcast not found'); return }

        const enc = startEncoder(socket.id, streamKey)
        if (!enc) { socket.emit('srs_error', 'Failed to start encoder'); return }

        socket.emit('srs_ready')
        console.log(`[SRS] ingest started for ${streamKey} by socket ${socket.id}`)
      } catch (err: any) {
        console.error('[WS] start_srs_ingest error:', err.message)
        socket.emit('srs_error', err.message)
      }
    })

    socket.on('srs_chunk', (chunk: Buffer) => {
      const enc = activeEncoders.get(socket.id)
      if (!enc) return
      try {
        const ok = enc.stdin.write(chunk)
        if (ok) {
          enc.bytesWritten += chunk.length
        } else {
          enc.stdin.once('drain', () => {
            try {
              enc.stdin.write(chunk)
              enc.bytesWritten += chunk.length
            } catch (err: any) {
              console.error('[SRS] drain write error:', err.message)
            }
          })
        }
      } catch (err: any) {
        console.error('[SRS] stdin write error:', err.message)
      }
    })

    socket.on('stop_srs_ingest', () => {
      killEncoder(socket.id)
    })

    socket.on('disconnect', () => {
      if (currentRoom) socket.leave(currentRoom)
      killEncoder(socket.id)
    })
  })

  return io
}
