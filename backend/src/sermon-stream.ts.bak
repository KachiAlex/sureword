import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { db, initDb } from './db.js'
import { v4 as uuidv4 } from 'uuid'

interface ActiveSermonStream {
  broadcastId: string
  streamKey: string
  process: ChildProcessWithoutNullStreams
  currentSermonId: string
  currentSermonAudioUrl: string
  offsetSeconds: number
  playlistId: string
  playlistItems: Array<{ id: string; sermon_id: string; audio_url: string; title: string; speaker: string; duration_minutes: number }>
  itemIndex: number
  startedAt: number
}

let active: ActiveSermonStream | null = null

function getRtmpUrl(streamKey: string) {
  return `rtmp://127.0.0.1:1935/live/${streamKey}`
}

async function getPlaylistItems(playlistId: string) {
  await initDb()
  const rows = await db.all(
    `SELECT spi.id as item_id, spi.sermon_id, spi.order_index, spi.duration_minutes,
            s.title, s.speaker, s.audio_url
     FROM sermon_playlist_items spi
     JOIN sermons s ON s.id = spi.sermon_id
     WHERE spi.playlist_id = $1
     ORDER BY spi.order_index ASC`,
    [playlistId]
  )
  return rows.map((r: any) => ({
    id: r.item_id,
    sermon_id: r.sermon_id,
    audio_url: r.audio_url,
    title: r.title,
    speaker: r.speaker,
    duration_minutes: r.duration_minutes || 30,
  }))
}

async function updateBroadcastCurrentSermon(broadcastId: string, sermonId: string | null, offset: number) {
  await initDb()
  await db.run(
    `UPDATE broadcasts SET current_sermon_id = $1, current_sermon_offset_seconds = $2 WHERE id = $3`,
    [sermonId, offset, broadcastId]
  )
}

async function startFfmpeg(audioUrl: string, streamKey: string, offsetSeconds: number = 0): Promise<ChildProcessWithoutNullStreams> {
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-re',
    ...(offsetSeconds > 0 ? ['-ss', String(offsetSeconds)] : []),
    '-i', audioUrl,
    '-c:a', 'aac',
    '-ar', '44100',
    '-ac', '2',
    '-b:a', '128k',
    '-f', 'flv',
    getRtmpUrl(streamKey),
  ]

  console.log(`[SERMON-STREAM] spawning ffmpeg for ${audioUrl} offset=${offsetSeconds}s`)
  const proc = spawn('ffmpeg', args)

  let stderrBuf = ''
  proc.stderr.on('data', (chunk) => {
    stderrBuf += chunk.toString()
    const lines = stderrBuf.split('\n')
    stderrBuf = lines.pop() || ''
    for (const line of lines) {
      if (line.trim()) console.log('[SERMON-STREAM] ffmpeg:', line.trim())
    }
  })

  proc.on('error', (err) => {
    console.error('[SERMON-STREAM] ffmpeg error:', err.message)
  })

  proc.on('exit', (code, signal) => {
    console.log(`[SERMON-STREAM] ffmpeg exited code=${code} signal=${signal}`)
  })

  return proc
}

async function playNextSermon() {
  if (!active) return
  const nextIndex = active.itemIndex + 1
  if (nextIndex >= active.playlistItems.length) {
    // Loop back to beginning
    active.itemIndex = 0
  } else {
    active.itemIndex = nextIndex
  }
  const item = active.playlistItems[active.itemIndex]
  await startSermonItem(item, 0)
}

async function startSermonItem(item: ActiveSermonStream['playlistItems'][0], offsetSeconds: number) {
  if (!active) return
  // Kill existing ffmpeg if running
  if (active.process) {
    active.process.kill('SIGTERM')
    active.process = null as any
  }

  active.currentSermonId = item.sermon_id
  active.currentSermonAudioUrl = item.audio_url
  active.offsetSeconds = offsetSeconds
  active.startedAt = Date.now()

  await updateBroadcastCurrentSermon(active.broadcastId, item.sermon_id, offsetSeconds)

  if (!item.audio_url) {
    console.error(`[SERMON-STREAM] No audio_url for sermon ${item.sermon_id}, skipping`)
    setTimeout(() => playNextSermon(), 1000)
    return
  }

  const proc = await startFfmpeg(item.audio_url, active.streamKey, offsetSeconds)
  active.process = proc

  // When ffmpeg exits naturally, move to next sermon
  proc.on('exit', async (code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      // Manually stopped, don't auto-advance
      return
    }
    if (!active) return
    // Check if we're still on the same sermon item
    if (active.currentSermonId === item.sermon_id) {
      console.log('[SERMON-STREAM] sermon finished naturally, advancing')
      await playNextSermon()
    }
  })
}

export async function startSermonBroadcast(broadcastId: string, playlistId: string): Promise<{ streamKey: string }> {
  if (active) {
    throw new Error('Another sermon broadcast is already active')
  }

  await initDb()
  const broadcast = await db.get('SELECT * FROM broadcasts WHERE id = $1', [broadcastId])
  if (!broadcast) throw new Error('Broadcast not found')

  const items = await getPlaylistItems(playlistId)
  if (items.length === 0) throw new Error('Playlist has no sermons')

  const streamKey = broadcast.stream_key || uuidv4()

  active = {
    broadcastId,
    streamKey,
    process: null as any,
    currentSermonId: '',
    currentSermonAudioUrl: '',
    offsetSeconds: 0,
    playlistId,
    playlistItems: items,
    itemIndex: 0,
    startedAt: Date.now(),
  }

  await startSermonItem(items[0], 0)

  return { streamKey }
}

export async function pauseSermonBroadcast(): Promise<{ offsetSeconds: number }> {
  if (!active) throw new Error('No active sermon broadcast')

  const elapsed = Math.floor((Date.now() - active.startedAt) / 1000)
  active.offsetSeconds = active.offsetSeconds + elapsed

  if (active.process) {
    active.process.kill('SIGTERM')
    active.process = null as any
  }

  await updateBroadcastCurrentSermon(active.broadcastId, active.currentSermonId, active.offsetSeconds)

  return { offsetSeconds: active.offsetSeconds }
}

export async function resumeSermonBroadcast(): Promise<void> {
  if (!active) throw new Error('No active sermon broadcast')

  const item = active.playlistItems[active.itemIndex]
  await startSermonItem(item, active.offsetSeconds)
}

export async function skipSermonBroadcast(): Promise<void> {
  if (!active) throw new Error('No active sermon broadcast')
  await playNextSermon()
}

export async function stopSermonBroadcast(): Promise<void> {
  if (!active) return

  if (active.process) {
    active.process.kill('SIGTERM')
    active.process = null as any
  }

  await initDb()
  await db.run(
    `UPDATE broadcasts SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [active.broadcastId]
  )

  active = null
}

export function getActiveSermonStream() {
  if (!active) return null
  const elapsed = Math.floor((Date.now() - active.startedAt) / 1000)
  return {
    broadcastId: active.broadcastId,
    streamKey: active.streamKey,
    currentSermonId: active.currentSermonId,
    currentSermonTitle: active.playlistItems[active.itemIndex]?.title || '',
    currentSermonSpeaker: active.playlistItems[active.itemIndex]?.speaker || '',
    offsetSeconds: active.offsetSeconds + elapsed,
    itemIndex: active.itemIndex,
    totalItems: active.playlistItems.length,
  }
}
