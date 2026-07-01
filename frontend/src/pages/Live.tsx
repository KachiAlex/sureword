import { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Hls from 'hls.js'
import { API_BASE, SOCKET_BASE, api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  ArrowLeft, Send, Users, Radio, BookOpen, Play, Pause, Volume2, Volume1, VolumeX,
  Lock, Globe, MessageSquare, Clock, User, ChevronDown, Headphones, X, ArrowDown, HandHeart
} from 'lucide-react'

interface Broadcast {
  id: string
  title: string
  description?: string
  scripture_reference?: string
  status: string
  started_at?: string
  broadcaster_id: string
  church_online_url?: string
  thumbnail_url?: string
  speaker?: string
  stream_key?: string
  stream_type?: string
  type?: 'live' | 'sermon'
  current_sermon?: { title: string; speaker: string; audio_url: string; thumbnail_url?: string }
}

interface ChatMessage {
  id: string
  user_id?: string
  user_name?: string
  guest_name?: string
  recipient_id?: string
  message: string
  is_private: boolean
  created_at: string
  reactions?: Record<string, number>
}

const REACTION_EMOJIS = ['??','??','??','??','??','??']

/* -- AudioBars (visualizer) ------------------------- */
function AudioBars({ active }: { active: boolean }) {
  const [heights, setHeights] = useState<number[]>(Array(16).fill(20))
  useEffect(() => {
    if (!active) return
    const iv = setInterval(() => {
      setHeights(Array.from({ length: 16 }, () => 15 + Math.random() * 65))
    }, 120)
    return () => clearInterval(iv)
  }, [active])

  return (
    <div className="flex items-end gap-[3px] h-10 px-1">
      {heights.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full transition-all duration-150"
          style={{
            background: active ? 'var(--gold)' : 'var(--line)',
            height: `${active ? h : 15}%`,
            opacity: active ? 0.7 + (h / 100) * 0.3 : 0.3
          }} />
      ))}
    </div>
  )
}

/* -- StreamPlayer (HLS via hls.js for SRS, fallback to <audio> for legacy) ----------------------------------- */
function StreamPlayer({ broadcastId, title, thumbnailUrl, streamKey, streamType }: {
  broadcastId: string; title?: string; thumbnailUrl?: string; streamKey?: string; streamType?: string
}) {
  const isHls = streamType === 'srs_rtmp' && !!streamKey
  const [started, setStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [listenerCount, setListenerCount] = useState(0)
  const [volume, setVolume] = useState(80)
  const [showVolume, setShowVolume] = useState(false)
  const [statusText, setStatusText] = useState('Tap to listen')

  const sessionIdRef = useRef('')
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const infoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const mediaContainerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const userPausedRef = useRef(false)
  const manifestPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hlsRetryRef = useRef(0)
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const MAX_HLS_RETRIES = 6

  function updateMediaSession(playing: boolean) {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }

  function setupMediaSession(broadcastTitle: string) {
    if (!('mediaSession' in navigator)) return
    const artwork: MediaImage[] = thumbnailUrl
      ? [{ src: thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }]
      : [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: broadcastTitle, artist: 'SUREWORD RADIO', album: 'The Whole Word to the Whole World', artwork
    })
    navigator.mediaSession.setActionHandler('play', () => mediaRef.current?.play().catch(() => {}))
    navigator.mediaSession.setActionHandler('pause', () => mediaRef.current?.pause())
    navigator.mediaSession.setActionHandler('stop', () => {
      const a = mediaRef.current; if (a) { a.pause(); a.src = '' }
    })
  }

  async function handleStart() {
    if (!mediaRef.current) return
    if (manifestPollRef.current) { clearInterval(manifestPollRef.current); manifestPollRef.current = null }
    setStarted(true)
    setStatusText('Checking stream...')
    userPausedRef.current = false

    sessionIdRef.current = Math.random().toString(36).slice(2) + Date.now().toString(36)
    if (!isHls) {
      fetch(`${API_BASE}/api/stream/${broadcastId}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current })
      }).catch(() => {})

      heartbeatRef.current = setInterval(() => {
        fetch(`${API_BASE}/api/stream/${broadcastId}/heartbeat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current })
        }).catch(() => {})
      }, 30000)

      infoIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/stream/${broadcastId}/info`)
          if (res.ok) { const info = await res.json(); setListenerCount(info.listenerCount || 0) }
        } catch {}
      }, 10000)

      mediaRef.current.src = `${SOCKET_BASE}/api/stream/${broadcastId}/live`
      mediaRef.current.volume = volume / 100
      mediaRef.current.play().then(() => {
        setIsPlaying(true)
        setStatusText('Live')
        setupMediaSession(title || 'Live Broadcast')
      }).catch(() => { setStatusText('Tap play to start') })

      try {
        const android = (window as any).AndroidAudio
        if (android && typeof android.startAudioService === 'function') android.startAudioService()
      } catch {}
      return
    }

    // HLS path: poll backend ready endpoint instead of HEAD-ing manifest directly
    const readyUrl = `${API_BASE}/api/srs/streams/${streamKey}/ready`
    let ready = false
    try {
      const res = await fetch(readyUrl)
      if (res.ok) { const data = await res.json(); ready = data.ready }
    } catch {}

    if (ready) {
      startHlsPlayback()
      return
    }

    // Stream not ready yet — poll every 3s for up to 60s
    setStatusText('Waiting for broadcaster...')
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(readyUrl)
        if (res.ok) {
          const data = await res.json()
          if (data.ready) {
            clearInterval(poll)
            manifestPollRef.current = null
            startHlsPlayback()
            return
          }
        }
      } catch {}
      if (attempts >= 20) {
        clearInterval(poll)
        manifestPollRef.current = null
        setStatusText('Stream not available. Tap to retry.')
        setStarted(false)
      }
    }, 3000)
    manifestPollRef.current = poll
  }

  function startHlsPlayback() {
    setStatusText('Connecting...')
    hlsRetryRef.current = 0
    if (playbackTimeoutRef.current) { clearTimeout(playbackTimeoutRef.current); playbackTimeoutRef.current = null }
    if (!mediaRef.current || !streamKey) return

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 5 })
      hlsRef.current = hls
      hls.attachMedia(mediaRef.current as HTMLVideoElement)
      hls.loadSource(`${SOCKET_BASE}/hls/live/${streamKey}.m3u8`)
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        if (!data.levels || data.levels.length === 0) {
          console.warn('[HLS] manifest parsed but no levels, waiting for next refresh...')
          return // Live manifest will refresh; playback timeout handles stuck streams
        }
        mediaRef.current!.play().then(() => {
          setIsPlaying(true)
          setStatusText('Live')
          setupMediaSession(title || 'Live Broadcast')
          if (playbackTimeoutRef.current) { clearTimeout(playbackTimeoutRef.current); playbackTimeoutRef.current = null }
        }).catch(() => { setStatusText('Tap play to start') })
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[HLS] error:', data.type, data.details, 'fatal:', data.fatal)
        if (!data.fatal) return
        hlsRetryRef.current++
        if (hlsRetryRef.current > MAX_HLS_RETRIES) {
          setStatusText('Stream unavailable. Tap to retry.')
          if (playbackTimeoutRef.current) { clearTimeout(playbackTimeoutRef.current); playbackTimeoutRef.current = null }
          hls.destroy()
          hlsRef.current = null
          return
        }
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setStatusText(`Reconnecting... (${hlsRetryRef.current})`)
            setTimeout(() => hls.startLoad(), Math.min(3000, 1000 * hlsRetryRef.current))
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            setStatusText('Recovering...')
            hls.recoverMediaError()
            break
          default:
            setStatusText('Stream error')
            if (playbackTimeoutRef.current) { clearTimeout(playbackTimeoutRef.current); playbackTimeoutRef.current = null }
            hls.destroy()
            hlsRef.current = null
            break
        }
      })
      // Safety: if playback never starts within 15s, give up
      playbackTimeoutRef.current = setTimeout(() => {
        console.warn('[HLS] playback start timeout')
        setStatusText('Stream unavailable. Tap to retry.')
        hls.destroy()
        hlsRef.current = null
      }, 15000)
    } else {
      // Native HLS fallback (Safari)
      mediaRef.current.src = `${SOCKET_BASE}/hls/live/${streamKey}.m3u8`
      mediaRef.current.volume = volume / 100
      mediaRef.current.play().then(() => {
        setIsPlaying(true)
        setStatusText('Live')
        setupMediaSession(title || 'Live Broadcast')
      }).catch(() => { setStatusText('Tap play to start') })
    }

    try {
      const android = (window as any).AndroidAudio
      if (android && typeof android.startAudioService === 'function') android.startAudioService()
    } catch {}
  }

  function togglePlay() {
    const media = mediaRef.current
    if (!media) return
    if (media.paused || media.ended || !media.src) {
      if (isHls && !hlsRef.current && streamKey) {
        // hls.js was destroyed (max retries or fatal error) — reinitialize
        hlsRetryRef.current = 0
        startHlsPlayback()
        return
      }
      hlsRetryRef.current = 0
      media.play().catch(() => {})
      userPausedRef.current = false
    } else {
      media.pause()
      userPausedRef.current = true
    }
  }

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.volume = volume / 100
  }, [volume])

  useEffect(() => {
    const el = isHls ? document.createElement('video') : document.createElement('audio')
    el.setAttribute('playsinline', 'true')
    el.setAttribute('webkit-playsinline', 'true')
    el.setAttribute('preload', 'none')
    el.style.width = '0px'
    el.style.height = '0px'
    el.style.position = 'absolute'
    el.style.opacity = '0'
    if (isHls) {
      el.setAttribute('muted', 'false')
      ;(el as HTMLVideoElement).muted = false
    }
    el.onplay = () => { setIsPlaying(true); updateMediaSession(true); userPausedRef.current = false }
    el.onpause = () => { setIsPlaying(false); updateMediaSession(false); userPausedRef.current = true }
    el.onplaying = () => { setStatusText('Live') }
    el.onwaiting = () => { setStatusText('Buffering') }
    el.onstalled = () => { setStatusText('Stalled') }
    el.onerror = () => { setStatusText('Connection error') }
    mediaContainerRef.current?.appendChild(el)
    mediaRef.current = el
    return () => {
      if (manifestPollRef.current) clearInterval(manifestPollRef.current)
      hlsRef.current?.destroy()
      hlsRef.current = null
      el.pause(); el.src = ''
      if (mediaContainerRef.current && mediaContainerRef.current.contains(el)) {
        mediaContainerRef.current.removeChild(el)
      }
      mediaRef.current = null
    }
  }, [isHls, streamKey])

  useEffect(() => {
    return () => {
      if (manifestPollRef.current) clearInterval(manifestPollRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (infoIntervalRef.current) clearInterval(infoIntervalRef.current)
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current)
      if (!isHls && sessionIdRef.current) {
        fetch(`${API_BASE}/api/stream/${broadcastId}/leave`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current })
        }).catch(() => {})
      }
      const a = mediaRef.current
      if (a) { a.pause(); a.src = '' }
      try {
        const android = (window as any).AndroidAudio
        if (android && typeof android.stopAudioService === 'function') android.stopAudioService()
      } catch {}
    }
  }, [broadcastId, isHls])

  const VolumeIcon = volume === 0 ? VolumeX : volume > 50 ? Volume2 : Volume1

  useEffect(() => {
    if (!showVolume) return
    function dismiss(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (!t.closest('[data-volume-ctrl]')) setShowVolume(false)
    }
    document.addEventListener('click', dismiss, true)
    return () => document.removeEventListener('click', dismiss, true)
  }, [showVolume])

  return (
    <div className="mx-2 sm:mx-4 mt-3 mb-4 rounded-xl p-3 sm:p-4 bg-[#230d02] border border-[rgba(240,190,100,0.06)]">
      <div ref={mediaContainerRef} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#ef4444]" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-white">{isHls ? 'LIVE STREAM' : 'LIVE AUDIO'}</span>
        </div>
        <div className="flex items-center gap-3">
          {!isHls && (
            <span className="text-[10px] font-mono flex items-center gap-1 text-[#9a7c60]">
              <Users className="w-3 h-3" /> {listenerCount}
            </span>
          )}
          <span className="text-[10px] font-mono text-[#9a7c60]">{statusText}</span>
        </div>
      </div>

      {!started ? (
        <button onClick={() => handleStart()}
          className="w-full py-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] bg-[#E05A1A] text-[#1b1208]">
          <Headphones className="w-4 h-4" /> Tap to Start Listening
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={togglePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{ background: isPlaying ? '#E05A1A' : '#2f1206', border: `2px solid ${isPlaying ? '#E05A1A' : 'rgba(240,190,100,0.08)'}` }}>
            {isPlaying ? <Pause className="w-4 h-4 text-[#1b1208]" /> : <Play className="w-4 h-4 text-[#E05A1A] ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <AudioBars active={isPlaying} />
          </div>
          <div data-volume-ctrl="1" className="relative shrink-0 flex flex-col items-center">
            {/* Vertical slider popover */}
            {showVolume && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pb-2 pt-3 px-2 rounded-xl bg-[#2f1206] border border-[rgba(240,190,100,0.1)] shadow-xl z-30"
                style={{ height: 120 }}>
                <span className="text-[9px] font-mono text-[#9a7c60]">{volume}</span>
                <input
                  type="range" min={0} max={100} value={volume}
                  onChange={e => setVolume(parseInt(e.target.value))}
                  className="appearance-none cursor-pointer rounded-full"
                  style={{
                    writingMode: 'vertical-lr' as any,
                    direction: 'rtl',
                    width: 4,
                    height: 72,
                    background: `linear-gradient(to top, #E05A1A ${volume}%, rgba(240,190,100,0.08) ${volume}%)`,
                    outline: 'none',
                  }}
                />
              </div>
            )}
            <button
              onClick={() => setShowVolume(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: showVolume ? 'rgba(201,162,39,0.15)' : 'transparent' }}
              title={`Volume: ${volume}%`}
            >
              <VolumeIcon className="w-3.5 h-3.5" style={{ color: showVolume ? '#E05A1A' : '#9a7c60' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Live() {
  usePageTitle('Live Broadcast')
  const { broadcastId } = useParams()
  const { user } = useAuth()

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [radioCurrent, setRadioCurrent] = useState<any>(null)
  const [radioStreaming, setRadioStreaming] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatMode, setChatMode] = useState<'public' | 'private'>('public')
  const [privateRecipient, setPrivateRecipient] = useState<{ user_id: string; user_name: string } | null>(null)
  const [guestName, setGuestName] = useState(() => sessionStorage.getItem('chat_guest_name') || '')
  const [guestNameSet, setGuestNameSet] = useState(() => !!sessionStorage.getItem('chat_guest_name'))
  const [chatUsers, setChatUsers] = useState<{ user_id: string; user_name: string }[]>([])
  const [showRecipientPicker, setShowRecipientPicker] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 768
  })

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [reactingTo, setReactingTo] = useState<string | null>(null)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const isAtBottomRef = useRef(true)
  const lastMsgCountRef = useRef(0)
  const chatOpenRef = useRef(chatOpen)
  useEffect(() => { chatOpenRef.current = chatOpen }, [chatOpen])

  useEffect(() => {
    fetchBroadcast(); fetchChatMessages(); fetchChatUsers(); fetchRadioCurrent()
    const broadcastPoll = setInterval(() => { fetchBroadcast(); fetchChatUsers() }, 8000)
    const radioPoll = setInterval(() => { fetchRadioCurrent() }, 10000)
    chatPollRef.current = setInterval(() => { fetchChatMessages() }, 2000)
    return () => {
      clearInterval(broadcastPoll)
      clearInterval(radioPoll)
      if (chatPollRef.current) clearInterval(chatPollRef.current)
    }
  }, [broadcastId])

  // Smart scroll: only auto-scroll when already at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  function handleChatScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    isAtBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }

  function scrollToBottom() {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    isAtBottomRef.current = true
    setShowScrollBtn(false)
  }

  async function reactToMessage(msgId: string, emoji: string) {
    setReactingTo(null)
    try {
      const { data } = await api.post(`/chat/broadcast/${msgId}/react`, { emoji })
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: data.reactions } : m))
    } catch {}
  }

  useEffect(() => {
    if (!reactingTo) return
    function dismiss(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-reaction-picker]') && !target.closest('[data-reaction-btn]')) {
        setReactingTo(null)
      }
    }
    document.addEventListener('click', dismiss, true)
    return () => document.removeEventListener('click', dismiss, true)
  }, [reactingTo])

  async function fetchBroadcast() {
    try {
      if (broadcastId && broadcastId !== 'current') {
        const { data } = await api.get(`/broadcasts/${broadcastId}`)
        setBroadcast(data.broadcast)
      } else {
        const { data } = await api.get('/broadcasts/active')
        setBroadcast(data.broadcast)
      }
    } catch { setBroadcast(null) }
    finally { setLoading(false) }
  }

  async function fetchRadioCurrent() {
    try {
      const { data } = await api.get('/sermons/radio/current')
      setRadioCurrent(data.current)
      setRadioStreaming(data.isStreaming)
    } catch { setRadioCurrent(null); setRadioStreaming(false) }
  }

  async function fetchChatMessages() {
    const bid = broadcastId || broadcast?.id
    if (!bid) return
    try {
      const { data } = await api.get(`/chat/broadcast/${bid}`)
      const messages = data.messages || []
      if (messages.length > lastMsgCountRef.current) {
        // Only count as new if not the initial load and chat is closed
        if (lastMsgCountRef.current > 0 && !chatOpenRef.current) {
          setNewMsgCount(c => c + (messages.length - lastMsgCountRef.current))
        }
        lastMsgCountRef.current = messages.length
      }
      setChatMessages(messages)
    } catch {}
  }

  async function fetchChatUsers() {
    const bid = broadcastId || broadcast?.id
    if (!bid) return
    try {
      const { data } = await api.get(`/chat/broadcast/${bid}/users`)
      setChatUsers((data.users || []).filter((u: any) => u.user_id !== user?.id))
      setOnlineCount(data.users?.length || 0)
    } catch {}
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const bid = broadcastId || broadcast?.id
    const text = newMessage.trim()
    if (!text || !bid) return
    try {
      if (user) {
        const payload: any = { message: text }
        if (chatMode === 'private' && privateRecipient) payload.recipientId = privateRecipient.user_id
        await api.post(`/chat/broadcast/${bid}`, payload)
      } else {
        await api.post(`/chat/broadcast/${bid}/guest`, { message: text, guestName: guestName.trim() || 'Guest' })
      }
      setNewMessage('')
      fetchChatMessages()
    } catch {}
  }

  function formatTime(ts: string) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  function displayName(msg: ChatMessage) { return msg.guest_name || msg.user_name || 'Anonymous' }
  function isOwnMessage(msg: ChatMessage) { return !!user && msg.user_id === user.id }
  function getChurchOnlineUrl(): string | null {
    if (broadcast?.church_online_url && broadcast.church_online_url.trim().length > 0) return broadcast.church_online_url
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1016] text-[#fff0d4]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E05A1A]" />
      </div>
    )
  }

  if (!broadcast) {
    return (
      <div className="min-h-screen bg-[#0f1016] text-[#fff0d4]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-[#9a7c60] hover:text-white transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          {radioStreaming && radioCurrent ? (
            <div className="max-w-md mx-auto">
              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-full border border-[#E05A1A]/20 flex items-center justify-center mx-auto">
                  <Radio className="w-7 h-7 text-[#E05A1A]" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-medium tracking-widest text-[#E05A1A] mb-1.5">SERMON RADIO</div>
                  <h2 className="text-lg font-semibold text-white">{radioCurrent.title || 'Radio'}</h2>
                  {radioCurrent.speaker && (
                    <p className="text-[11px] text-[#E05A1A] mt-1 flex items-center justify-center gap-1">
                      <User className="w-3 h-3" />{radioCurrent.speaker}
                    </p>
                  )}
                  {radioCurrent.scriptureReference && (
                    <p className="text-[11px] text-[#E05A1A] mt-2 flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" />{radioCurrent.scriptureReference}</p>
                  )}
                </div>
              </div>
              <StreamPlayer
                broadcastId="radio"
                title={radioCurrent.title || 'Sermon Radio'}
                thumbnailUrl={radioCurrent.thumbnailUrl}
                streamKey="sermon-radio"
                streamType="srs_rtmp"
              />
            </div>
          ) : (
            <div className="max-w-md mx-auto text-center py-20">
              <Radio className="w-12 h-12 text-[#E05A1A] mx-auto mb-5 opacity-60" />
              <h1 className="text-xl font-medium text-white mb-2 tracking-wide">No broadcast right now</h1>
              <p className="text-sm text-[#9a7c60] mb-8 leading-relaxed">Check back during scheduled service times or browse our sermon archive.</p>
              <Link to="/archive" className="inline-flex items-center gap-2 bg-[#E05A1A] hover:bg-[#F5A623] text-[#1b1208] text-xs font-semibold px-6 py-2.5 rounded-full transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> Browse Archive
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1016] text-[#fff0d4]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(240,190,100,0.06)] bg-[#0f1016]/95 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xs text-[#9a7c60] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
          </Link>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              {broadcast.status === 'live' && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#ef4444]" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ef4444]" />
                </span>
              )}
              <span className="text-[10px] font-mono font-medium tracking-widest text-[#E05A1A]">
                {broadcast.status === 'live' ? 'LIVE NOW' : 'ENDED'}
              </span>
            </div>
            <div className="text-xs font-medium text-white max-w-[200px] sm:max-w-xs truncate">{broadcast.title}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setChatOpen(o => !o)
                setNewMsgCount(0)
              }}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[rgba(240,190,100,0.06)] hover:bg-[rgba(240,190,100,0.1)] text-white transition-colors relative">
              <MessageSquare className="w-3.5 h-3.5 text-[#E05A1A]" />
              <span className="hidden sm:inline">{chatOpen ? 'Hide Chat' : 'Open Chat'}</span>
              <span className="sm:hidden">Chat</span>
              {newMsgCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{ background: '#E05A1A', color: '#1b1208' }}>
                  {newMsgCount > 9 ? '9+' : newMsgCount}
                </span>
              )}
            </button>
            <span className="text-[11px] font-mono flex items-center gap-1 text-[#9a7c60]"><Users className="w-3.5 h-3.5" /> {onlineCount}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col overflow-y-auto ${chatOpen ? 'hidden md:block' : ''}`}>
          {getChurchOnlineUrl() ? (
            <>
              <div className="flex-1 relative min-h-[300px] md:min-h-0">
                <iframe ref={iframeRef} src={getChurchOnlineUrl()!} className="absolute inset-0 w-full h-full" style={{ border: 'none' }} allow="autoplay; fullscreen" allowFullScreen title="Live Broadcast" />
              </div>
              {broadcast.status === 'live' && (
                <StreamPlayer
                  broadcastId={broadcast.id}
                  title={broadcast.type === 'sermon' && broadcast.current_sermon ? broadcast.current_sermon.title : broadcast.title}
                  thumbnailUrl={broadcast.thumbnail_url}
                  streamKey={broadcast.stream_key}
                  streamType={broadcast.stream_type}
                />
              )}
              {broadcast.scripture_reference && (
                <div className="mx-4 mb-4 rounded-xl p-4 text-center bg-[#230d02] border border-[rgba(240,190,100,0.06)]">
                  <div className="text-[10px] font-mono font-medium tracking-widest text-[#E05A1A] mb-1.5">NOW READING</div>
                  <div className="text-sm font-medium text-white">{broadcast.scripture_reference}</div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-md space-y-5">
                {/* Broadcast info card */}
                <div className="text-center space-y-3">
                  {broadcast.thumbnail_url ? (
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border border-[rgba(240,190,100,0.08)] mx-auto shadow-lg">
                      <img src={broadcast.thumbnail_url} alt={broadcast.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full border border-[#E05A1A]/20 flex items-center justify-center mx-auto">
                      <Radio className="w-7 h-7 text-[#E05A1A]" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-white">{broadcast.title}</h2>
                    {broadcast.speaker && (
                      <p className="text-[11px] text-[#E05A1A] mt-1 flex items-center justify-center gap-1">
                        <User className="w-3 h-3" />{broadcast.speaker}
                      </p>
                    )}
                    {broadcast.description && <p className="text-xs text-[#9a7c60] mt-1 max-w-sm mx-auto">{broadcast.description}</p>}
                    {broadcast.scripture_reference && (
                      <p className="text-[11px] text-[#E05A1A] mt-2 flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" />{broadcast.scripture_reference}</p>
                    )}
                  </div>
                </div>
                {/* Player */}
                {broadcast.status === 'live' && (
                  <StreamPlayer
                    broadcastId={broadcast.id}
                    title={broadcast.title}
                    thumbnailUrl={broadcast.thumbnail_url}
                    streamKey={broadcast.stream_key}
                    streamType={broadcast.stream_type}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Section */}
        {chatOpen && (
          <div className="w-full md:w-80 lg:w-96 border-l border-[rgba(240,190,100,0.06)] flex flex-col bg-[#230d02] max-h-[calc(100dvh-3.5rem)] md:max-h-none">
            {/* Chat Header */}
            <div className="p-4 border-b border-[rgba(240,190,100,0.06)]">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                  <MessageSquare className="w-3.5 h-3.5 text-[#E05A1A]" /> Chat
                </h3>
                <div className="flex items-center gap-2">
                  <Link to="/donate"
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
                    style={{ background: 'rgba(201,162,39,0.12)', color: 'var(--gold)' }}>
                    <HandHeart className="w-3 h-3" /> Give
                  </Link>
                  <span className="text-[10px] font-mono text-[#9a7c60]">{onlineCount} active</span>
                  <button onClick={() => setChatOpen(false)} className="md:hidden text-[#9a7c60] p-0.5"><X className="w-4 h-4" /></button>
                </div>
              </div>
              {user && (
                <div className="flex gap-1 rounded-lg p-0.5 bg-[#0f1016]">
                  <button onClick={() => { setChatMode('public'); setPrivateRecipient(null); }}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1 rounded-md transition-colors"
                    style={{ background: chatMode === 'public' ? '#E05A1A' : 'transparent', color: chatMode === 'public' ? '#1b1208' : '#9a7c60' }}>
                    <Globe className="w-3 h-3" /> Public
                  </button>
                  <button onClick={() => setChatMode('private')}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1 rounded-md transition-colors"
                    style={{ background: chatMode === 'private' ? '#E05A1A' : 'transparent', color: chatMode === 'private' ? '#1b1208' : '#9a7c60' }}>
                    <Lock className="w-3 h-3" /> Private
                  </button>
                </div>
              )}
              {user && chatMode === 'private' && (
                <div className="mt-2 relative">
                  <button onClick={() => setShowRecipientPicker(!showRecipientPicker)}
                    className="w-full text-left text-[11px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[rgba(240,190,100,0.08)] bg-[#0f1016] text-[#9a7c60]">
                    {privateRecipient ? (
                      <><User className="w-3 h-3 text-[#E05A1A]" /><span className="text-white">{privateRecipient.user_name}</span></>
                    ) : (<>Select recipient...</>)}
                    <ChevronDown className="w-3 h-3 ml-auto" />
                  </button>
                  {showRecipientPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-[rgba(240,190,100,0.08)] bg-[#0f1016] z-10 overflow-hidden max-h-40 overflow-y-auto">
                      {chatUsers.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-[#9a7c60]">No active users yet</div>
                      ) : (
                        chatUsers.map(u => (
                          <button key={u.user_id} onClick={() => { setPrivateRecipient(u); setShowRecipientPicker(false); }}
                            className="w-full text-left px-3 py-2 text-[11px] flex items-center gap-1.5 hover:bg-[rgba(240,190,100,0.04)] transition-colors text-white">
                            <User className="w-3 h-3 text-[#E05A1A]" />{u.user_name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="relative flex-1 overflow-hidden">
              <div ref={chatScrollRef} onScroll={handleChatScroll} className="h-full overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, idx) => {
                  const reactionEntries = Object.entries(msg.reactions || {}).filter(([,c]) => (c as number) > 0)
                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwnMessage(msg) ? 'items-end' : 'items-start'}`}
                      style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}>
                      <div className="relative group">
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${isOwnMessage(msg) ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                          style={{
                            background: isOwnMessage(msg) ? (msg.is_private ? '#4a3b2a' : '#E05A1A') : (msg.is_private ? '#2a2a3a' : '#0f1016'),
                            color: isOwnMessage(msg) && !msg.is_private ? '#1b1208' : '#fff0d4',
                            border: msg.is_private ? '1px solid rgba(240,190,100,0.08)' : '1px solid rgba(240,190,100,0.05)'
                          }}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-[10px] font-medium" style={{ color: isOwnMessage(msg) && !msg.is_private ? '#1b1208' : '#E05A1A' }}>{displayName(msg)}</span>
                            {msg.is_private && <Lock className="w-2.5 h-2.5 opacity-60" />}
                            {msg.guest_name && <span className="text-[9px] px-1 rounded bg-[rgba(240,190,100,0.08)] text-[#9a7c60]">guest</span>}
                          </div>
                          <p className="text-[13px] leading-relaxed">{msg.message}</p>
                          <span className="text-[9px] mt-0.5 block opacity-50 flex items-center gap-0.5">
                            <Clock className="w-2 h-2" /> {formatTime(msg.created_at)}
                          </span>
                        </div>
                        {/* Reaction trigger button � visible on hover */}
                        <button
                          onClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                          className={`absolute -bottom-1 ${isOwnMessage(msg) ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none p-0.5 rounded-full bg-[#2f1206] border border-[rgba(240,190,100,0.08)]`}
                          title="React"
                          data-reaction-btn="1"
                        >??</button>
                        {/* Reaction picker */}
                        {reactingTo === msg.id && (
                          <div data-reaction-picker="1" className={`absolute bottom-6 ${isOwnMessage(msg) ? 'right-0' : 'left-0'} flex gap-1 bg-[#2f1206] border border-[rgba(240,190,100,0.1)] rounded-full px-2 py-1 shadow-xl z-20`}>
                            {REACTION_EMOJIS.map(e => (
                              <button key={e} onClick={() => reactToMessage(msg.id, e)}
                                className="text-lg leading-none hover:scale-125 transition-transform">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Reaction counts */}
                      {reactionEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reactionEntries.map(([emoji, count]) => (
                            <button key={emoji} onClick={() => reactToMessage(msg.id, emoji)}
                              className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full transition-colors hover:bg-[rgba(201,162,39,0.2)]"
                              style={{ background: 'rgba(240,190,100,0.07)', border: '1px solid rgba(240,190,100,0.08)' }}>
                              <span>{emoji}</span><span className="text-[#9a7c60]">{count as number}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#9a7c60]">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No messages yet.<br />Be the first to say something!
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Scroll-to-bottom arrow */}
              {showScrollBtn && (
                <button onClick={scrollToBottom}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-lg transition-all animate-bounce-slow"
                  style={{ background: '#E05A1A', color: '#1b1208' }}>
                  <ArrowDown className="w-3 h-3" /> New messages
                </button>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[rgba(240,190,100,0.06)]">
              {!user && !guestNameSet && (
                <div className="mb-2 flex gap-1.5">
                  <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && guestName.trim()) { sessionStorage.setItem('chat_guest_name', guestName.trim()); setGuestNameSet(true) }}}
                    placeholder="Your name to start chatting..." maxLength={20}
                    className="flex-1 rounded-lg px-3 py-1.5 text-[11px] border border-[rgba(240,190,100,0.08)] bg-[#0f1016] text-[#fff0d4] placeholder-[#9a7c60] outline-none focus:border-[#E05A1A]/30" />
                  <button type="button" onClick={() => { if (guestName.trim()) { sessionStorage.setItem('chat_guest_name', guestName.trim()); setGuestNameSet(true) }}}
                    className="px-2.5 py-1 rounded-lg bg-[#E05A1A] text-[#1b1208] text-[11px] font-semibold shrink-0">
                    OK
                  </button>
                </div>
              )}
              {!user && guestNameSet && (
                <div className="mb-2 flex items-center justify-between text-[10px] text-[#9a7c60]">
                  <span>Chatting as <span className="text-white font-medium">{guestName}</span></span>
                  <button type="button" onClick={() => { sessionStorage.removeItem('chat_guest_name'); setGuestNameSet(false) }}
                    className="text-[#E05A1A] hover:underline">Change</button>
                </div>
              )}
              <form onSubmit={sendMessage}>
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    disabled={!user && !guestNameSet}
                    placeholder={!user && !guestNameSet ? 'Enter your name above first...' : chatMode === 'private' && privateRecipient ? `Message ${privateRecipient.user_name}...` : 'Send a message...'}
                    className="flex-1 rounded-lg px-3 py-2 text-sm border border-[rgba(240,190,100,0.08)] bg-[#0f1016] text-[#fff0d4] placeholder-[#9a7c60] outline-none focus:border-[#E05A1A]/30 disabled:opacity-50" />
                  <button type="submit" disabled={!newMessage.trim() || (chatMode === 'private' && !privateRecipient) || (!user && !guestNameSet)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: newMessage.trim() && (chatMode !== 'private' || privateRecipient) ? '#E05A1A' : 'rgba(240,190,100,0.08)', color: newMessage.trim() && (chatMode !== 'private' || privateRecipient) ? '#1b1208' : '#9a7c60' }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
              {!user && (
                <div className="mt-2 text-center text-[10px] text-[#9a7c60]">
                  <Link to="/login" className="underline hover:opacity-80 text-[#E05A1A]">Sign in</Link> for private messaging
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Chat Toggle */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
          className="md:hidden fixed bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center bg-[#E05A1A] text-[#1b1208] shadow-lg z-50">
          <MessageSquare className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

