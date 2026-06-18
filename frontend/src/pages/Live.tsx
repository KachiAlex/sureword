import { useEffect, useState, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Send, Heart } from 'lucide-react'

interface Broadcast {
  id: string
  title: string
  description?: string
  scripture_reference?: string
  status: string
  started_at?: string
  broadcaster_id: string
}

interface ChatMessage {
  id: string
  user_name: string
  message: string
  created_at: string
}

export default function Live() {
  const { broadcastId } = useParams()
  const [searchParams] = useSearchParams()
  const showChat = searchParams.get('chat') === '1'
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [listenerCount, setListenerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const queueRef = useRef<AudioBuffer[]>([])
  const isPlayingChunkRef = useRef(false)
  const nextTimeRef = useRef(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchBroadcast()
    const interval = setInterval(fetchBroadcast, 10000)
    return () => clearInterval(interval)
  }, [broadcastId])

  useEffect(() => {
    if (!socket || !broadcast?.id) return
    
    // Join the broadcast room
    socket.emit('listener-join', broadcast.id)
    
    // Listen for events
    socket.on('audio-chunk', handleAudioChunk)
    socket.on('listener-count', (count: number) => setListenerCount(count))
    socket.on('new-chat-message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg])
    })
    
    return () => {
      socket.off('audio-chunk', handleAudioChunk)
      socket.off('listener-count')
      socket.off('new-chat-message')
    }
  }, [socket, broadcast?.id])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function fetchBroadcast() {
    try {
      // If specific broadcast ID provided, fetch that one
      if (broadcastId && broadcastId !== 'current') {
        const { data } = await axios.get(`/api/broadcasts/${broadcastId}`)
        setBroadcast(data.broadcast)
      } else {
        // Otherwise fetch active broadcast
        const { data } = await axios.get('/api/broadcasts/active')
        setBroadcast(data.broadcast)
      }
    } catch {
      setBroadcast(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchChatMessages() {
    if (!broadcast?.id) return
    try {
      const { data } = await axios.get(`/api/chat/broadcast/${broadcast.id}`)
      setChatMessages(data.messages || [])
    } catch {
      // Silent fail
    }
  }

  function handleAudioChunk({ chunk }: { chunk: ArrayBuffer }) {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current
    ctx.decodeAudioData(chunk.slice(0), (buffer: AudioBuffer) => {
      queueRef.current.push(buffer)
      if (isPlaying && !isPlayingChunkRef.current) {
        playNextChunk()
      }
    })
  }

  function playNextChunk() {
    if (!audioContextRef.current || queueRef.current.length === 0) {
      isPlayingChunkRef.current = false
      return
    }
    isPlayingChunkRef.current = true
    const ctx = audioContextRef.current
    const buffer = queueRef.current.shift()!
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    if (nextTimeRef.current < ctx.currentTime) {
      nextTimeRef.current = ctx.currentTime
    }
    source.start(nextTimeRef.current)
    nextTimeRef.current += buffer.duration
    source.onended = playNextChunk
  }

  function togglePlay() {
    if (!isPlaying) {
      setIsPlaying(true)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
      }
      playNextChunk()
    } else {
      setIsPlaying(false)
      audioContextRef.current?.suspend()
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !broadcast?.id || !user) return
    
    try {
      const { data } = await axios.post(`/api/chat/broadcast/${broadcast.id}`, {
        message: newMessage.trim()
      })
      setChatMessages(prev => [...prev, data.message])
      setNewMessage('')
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--gold)' }} />
      </div>
    )
  }

  if (!broadcast) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
        <Link to="/" className="flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--dim)' }}>
          <ArrowLeft size={18} />
          Back home
        </Link>
        
        <div className="max-w-md mx-auto text-center py-16">
          <h1 className="font-serif text-2xl mb-4" style={{ fontWeight: 500 }}>No broadcast right now</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--dim)' }}>Check back during scheduled service times or browse the archive.</p>
          <Link to="/archive" className="btn-gold inline-block">Browse archive</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--line)' }}>
        <Link to="/" className="flex items-center gap-2 text-sm" style={{ color: 'var(--dim)' }}>
          <ArrowLeft size={18} />
          Back
        </Link>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            {broadcast.status === 'live' ? 'LIVE NOW' : 'ENDED'}
          </div>
          <div className="font-serif text-sm" style={{ fontWeight: 500 }}>{broadcast.title}</div>
        </div>
        <div className="font-mono text-xs" style={{ color: 'var(--dim)' }}>
          {listenerCount} listening
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Player Section */}
        <div className={`flex-1 p-6 ${showChat ? 'hidden md:block' : ''}`}>
          {/* Waveform */}
          <div className="h-32 flex items-center justify-center gap-[3px] mb-8">
            {[30, 60, 90, 45, 70, 35, 80, 50, 65, 40, 85, 55, 30, 75, 45, 60, 40, 70, 50, 80, 35, 65, 45, 55, 70, 40, 85, 50, 30, 75].map((height, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm"
                style={{
                  height: `${height}%`,
                  background: 'var(--gold-soft)',
                  animation: isPlaying && i % 2 === 0 ? 'bob 1.2s ease-in-out infinite' : undefined,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--gold)', color: '#1b1208' }}
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-1" />
              )}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full flex items-center justify-center border"
              style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          {/* Scripture */}
          {broadcast.scripture_reference && (
            <div 
              className="max-w-md mx-auto rounded-xl p-4 text-center"
              style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}
            >
              <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--gold)' }}>
                Now reading
              </div>
              <div className="font-serif text-lg" style={{ fontWeight: 500 }}>
                {broadcast.scripture_reference}
              </div>
            </div>
          )}

          {!connected && (
            <div className="text-center text-sm mt-6" style={{ color: 'var(--dim)' }}>
              Reconnecting to stream...
            </div>
          )}
        </div>

        {/* Chat Section */}
        {showChat && (
          <div 
            className="w-full md:w-80 border-l flex flex-col"
            style={{ borderColor: 'var(--line)', background: 'var(--ink-2)' }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--line)' }}>
              <h3 className="font-serif" style={{ fontWeight: 500 }}>Chat</h3>
              <p className="text-xs" style={{ color: 'var(--dim)' }}>Be kind and encouraging</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id}>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--gold-soft)' }}>
                    {msg.user_name}
                  </span>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            {user ? (
              <form onSubmit={sendMessage} className="p-4 border-t" style={{ borderColor: 'var(--line)' }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 rounded-lg px-3 py-2 text-sm border"
                    style={{ 
                      background: 'var(--ink)', 
                      borderColor: 'var(--line)',
                      color: 'var(--parchment)'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ 
                      background: newMessage.trim() ? 'var(--gold)' : 'var(--line)',
                      color: newMessage.trim() ? '#1b1208' : 'var(--dim)'
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t text-center text-sm" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>
                <Link to="/login" className="underline" style={{ color: 'var(--gold-soft)' }}>Sign in</Link> to chat
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Chat Toggle */}
      {!showChat && (
        <Link
          to={`/live/${broadcast.id}?chat=1`}
          className="md:hidden fixed bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--gold)', color: '#1b1208' }}
        >
          <Heart size={20} />
        </Link>
      )}

      <style>{`
        @keyframes bob {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.5); }
        }
      `}</style>
    </div>
  )
}
