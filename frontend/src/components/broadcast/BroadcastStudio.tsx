import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Radio, Pause, Play, Square, Mic, MicOff, Volume2, Volume1, VolumeX,
  Copy, CheckCircle, Activity, Share2, Headphones, Wifi, WifiOff
} from 'lucide-react'
import AudioWaveVisualizer from './AudioWaveVisualizer'

/* ── NetworkIndicator ──────────────────────────────── */
function NetworkIndicator() {
  const [strength, setStrength] = useState(4)
  const [latency, setLatency] = useState(0)

  useEffect(() => {
    const interval = setInterval(async () => {
      const start = Date.now()
      try {
        await fetch('/api/ping', { method: 'GET', cache: 'no-store' })
        const ms = Date.now() - start
        setLatency(ms)
        setStrength(ms < 100 ? 4 : ms < 200 ? 3 : ms < 400 ? 2 : 1)
      } catch {
        setStrength(0)
        setLatency(999)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const bars = [1, 2, 3, 4]
  const color = strength === 0 ? '#ef4444' : strength <= 2 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex items-center gap-2" title={`Latency: ${latency}ms`}>
      <div className="flex items-end gap-0.5 h-4">
        {bars.map(b => (
          <div
            key={b}
            className="w-1 rounded-sm transition-all"
            style={{ height: `${b * 4}px`, background: b <= strength ? color : 'var(--line)' }}
          />
        ))}
      </div>
      <span className="text-xs" style={{ color: strength === 0 ? '#ef4444' : 'var(--dim)' }}>
        {strength === 0 ? 'Offline' : `${latency}ms`}
      </span>
    </div>
  )
}

/* ── BroadcastTimer ────────────────────────────────── */
function BroadcastTimer({ startTime }: { startTime: Date | null }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) return
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startTime])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60

  return (
    <div className="flex items-center gap-2 font-mono text-lg">
      <span>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
    </div>
  )
}

/* ── Main BroadcastStudio ─────────────────────────── */
interface Props {
  broadcastId: string
  title: string
  description: string
  scripture: string
  churchOnlineUrl: string
  status: 'live' | 'paused'
  startTime: Date | null
  onPause: () => void
  onResume: () => void
  onEnd: () => void
  actionLoading: boolean
}

export default function BroadcastStudio({
  broadcastId, title, description, scripture,
  churchOnlineUrl, status, startTime,
  onPause, onResume, onEnd, actionLoading
}: Props) {
  const [micMuted, setMicMuted] = useState(false)
  const [micGain, setMicGain] = useState(80)
  const [copied, setCopied] = useState(false)
  const [listenerCount, setListenerCount] = useState(0)

  const isLive = status === 'live'
  const isPaused = status === 'paused'

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get('/api/broadcasts/stats/overview')
        setListenerCount(data.live || 0)
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [isLive])

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const streamUrl = churchOnlineUrl || 'https://online.church/zionitefm'

  return (
    <div>
      {/* Status Header */}
      <div className="p-5 flex items-center justify-between flex-wrap gap-3"
        style={{ background: isLive ? 'var(--gold)' : 'var(--oxblood)', color: isLive ? '#1b1208' : 'var(--parchment)' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: isLive ? 'rgba(27,18,8,0.2)' : 'rgba(255,255,255,0.1)' }}>
              <Radio className="w-6 h-6" />
            </div>
            {isLive && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#1b1208' }} />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5" style={{ background: '#1b1208' }} />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                style={{ background: isLive ? 'rgba(27,18,8,0.2)' : 'rgba(255,255,255,0.15)' }}>
                {isLive ? 'Live' : 'Paused'}
              </span>
              <BroadcastTimer startTime={startTime} />
            </div>
            <h2 className="text-lg font-bold truncate max-w-[200px] sm:max-w-xs">{title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NetworkIndicator />
          {isLive ? (
            <button onClick={onPause} disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              style={{ background: 'rgba(27,18,8,0.2)', color: '#1b1208' }}>
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button onClick={onResume} disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--parchment)' }}>
              <Play className="w-4 h-4" /> Resume
            </button>
          )}
          <button onClick={onEnd} disabled={actionLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            style={{ background: 'rgba(220,38,38,0.3)', color: '#fca5a5' }}>
            <Square className="w-4 h-4" /> End
          </button>
        </div>
      </div>

      {/* Studio Body */}
      <div className="p-6 space-y-6">

        {/* Audio Wave + Listener Count */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--dim)' }}>
              <Activity className="w-3.5 h-3.5 inline mr-1" /> Audio Signal
            </label>
            <AudioWaveVisualizer active={isLive && !micMuted} micMuted={micMuted} />
          </div>
          <div className="rounded-xl p-4 flex flex-col items-center justify-center gap-2"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
            <Headphones className="w-6 h-6" style={{ color: 'var(--gold)' }} />
            <span className="text-2xl font-bold">{listenerCount}</span>
            <span className="text-xs" style={{ color: 'var(--dim)' }}>Listeners</span>
          </div>
        </div>

        {/* Mic Controls */}
        <div className="rounded-xl p-4" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2">
              {micMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" style={{ color: 'var(--gold)' }} />}
              Microphone
            </span>
            <button onClick={() => setMicMuted(!micMuted)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: micMuted ? 'rgba(220,38,38,0.15)' : 'rgba(34,197,94,0.1)',
                color: micMuted ? '#fca5a5' : '#4ade80',
                border: `1px solid ${micMuted ? 'rgba(220,38,38,0.3)' : 'rgba(34,197,94,0.2)'}`
              }}>
              {micMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            {micMuted ? <VolumeX className="w-4 h-4" style={{ color: 'var(--dim)' }} /> : (
              micGain > 60 ? <Volume2 className="w-4 h-4" style={{ color: 'var(--gold)' }} /> :
              micGain > 20 ? <Volume1 className="w-4 h-4" style={{ color: 'var(--gold)' }} /> :
              <VolumeX className="w-4 h-4" style={{ color: 'var(--dim)' }} />
            )}
            <input
              type="range"
              min={0}
              max={100}
              value={micGain}
              onChange={e => setMicGain(parseInt(e.target.value))}
              disabled={micMuted}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--gold) ${micGain}%, var(--line) ${micGain}%)`,
                opacity: micMuted ? 0.4 : 1
              }}
            />
            <span className="text-xs font-mono w-8 text-right">{micGain}%</span>
          </div>
        </div>

        {/* Stream URL + Share */}
        <div className="rounded-xl p-4" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <Share2 className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              Stream URL
            </span>
            <span className="text-xs" style={{ color: 'var(--dim)' }}>Share with viewers</span>
          </div>
          <div className="flex gap-2">
            <input type="text" readOnly value={streamUrl}
              className="flex-1 rounded-lg px-3 py-2 text-sm border"
              style={{ background: 'var(--ink-2)', borderColor: 'var(--line)', color: 'var(--parchment)' }} />
            <button onClick={() => copyToClipboard(streamUrl)}
              className="px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
              style={{ background: 'var(--gold)', color: '#1b1208' }}>
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Broadcast Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--dim)' }}>Description</span>
            <p className="text-sm">{description || 'No description'}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--dim)' }}>Scripture</span>
            <p className="text-sm">{scripture || 'No scripture reference'}</p>
          </div>
        </div>

        {/* Status Details */}
        <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
          <p style={{ color: 'var(--dim)' }}>
            <span className="font-semibold" style={{ color: 'var(--parchment)' }}>Broadcast ID:</span> {broadcastId}
          </p>
          <p className="mt-1" style={{ color: 'var(--dim)' }}>
            <span className="font-semibold" style={{ color: 'var(--parchment)' }}>How to stream:</span> Use OBS, StreamYard, or Church Online Platform directly. Share the link above with your team.
          </p>
        </div>
      </div>
    </div>
  )
}
