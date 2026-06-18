import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../contexts/AuthContext'
import { Radio, Play, Pause, Volume2, VolumeX, Headphones, BookOpen, Wifi, Clock, ArrowRight, Signal, Users } from 'lucide-react'

interface Broadcast {
  id: string
  title: string
  description?: string
  scripture_reference?: string
  status: string
  started_at?: string
  broadcaster_id: string
}

export default function HomeRadio() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [ended, setEnded] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const queueRef = useRef<AudioBuffer[]>([])
  const isPlayingChunkRef = useRef(false)
  const nextTimeRef = useRef(0)
  const { socket, connected } = useSocket()
  const { user } = useAuth()

  useEffect(() => {
    fetchActiveBroadcast()
    const interval = setInterval(fetchActiveBroadcast, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('audio-chunk', handleAudioChunk)
    socket.on('broadcast-ended', () => {
      setEnded(true)
      setIsPlaying(false)
    })
    return () => {
      socket.off('audio-chunk', handleAudioChunk)
      socket.off('broadcast-ended')
    }
  }, [socket])

  async function fetchActiveBroadcast() {
    try {
      const { data } = await axios.get('/api/broadcasts/active')
      setBroadcast(data.broadcast)
      if (data.broadcast && !ended) {
        joinBroadcast(data.broadcast.id)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function joinBroadcast(broadcastId: string) {
    socket?.emit('listener-join', broadcastId)
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

  function toggleMute() {
    setIsMuted(!isMuted)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Radio className="w-6 h-6 text-purple-500" />
            <span>Zionitefm</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="text-white/70 hover:text-white transition-colors">Listen</Link>
            <Link to="/archive" className="text-white/70 hover:text-white transition-colors">Archive</Link>
            <Link to="/status" className="text-white/70 hover:text-white transition-colors">Status</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-white/70 hover:text-white transition-colors">Admin</Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {broadcast?.status === 'live' && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-red-400">
                <Signal className="w-3 h-3" />
                <span>LIVE</span>
              </div>
            )}
            {!user && (
              <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Player */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : broadcast ? (
          <div className="text-center">
            {/* Live Badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-red-400 text-sm font-semibold tracking-wider uppercase">On Air Now</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold mb-3">{broadcast.title}</h1>
            {broadcast.description && (
              <p className="text-white/60 mb-4 max-w-lg mx-auto">{broadcast.description}</p>
            )}
            {broadcast.scripture_reference && (
              <div className="flex items-center justify-center gap-2 text-purple-400 text-sm mb-8">
                <BookOpen className="w-4 h-4" />
                <span>{broadcast.scripture_reference}</span>
              </div>
            )}

            {/* Player Controls */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
              
              <button
                onClick={toggleMute}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-4 text-sm text-white/50">
              {connected ? (
                <>
                  <Signal className="w-4 h-4 text-green-400" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>Connecting...</span>
                </>
              )}
              <span className="text-white/30">|</span>
              <Users className="w-4 h-4" />
              <span>Listeners tuning in</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <Radio className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Broadcast Right Now</h2>
            <p className="text-white/50 mb-6">Check back during scheduled service times.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/archive" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition-colors">
                <Headphones className="w-4 h-4" />
                Browse Archive
              </Link>
              <Link to="/status" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                <Clock className="w-4 h-4" />
                Schedule
              </Link>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12 pt-12 border-t border-white/10">
          <Link to="/archive" className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-colors text-center">
            <Headphones className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-medium text-sm">Sermon Archive</h3>
          </Link>
          <Link to="/status" className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-colors text-center">
            <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-medium text-sm">Service Times</h3>
          </Link>
          <div className="group bg-white/5 border border-white/10 rounded-xl p-4 text-center opacity-60 cursor-not-allowed">
            <BookOpen className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <h3 className="font-medium text-sm">Prayer Requests</h3>
            <span className="text-xs text-white/40">Coming soon</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0f] mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">Zionitefm</span>
            </div>
            <p className="text-white/40 text-sm">
              © 2026 Zionitefm. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <Link to="/archive" className="hover:text-white transition-colors">Archive</Link>
              <Link to="/status" className="hover:text-white transition-colors">Status</Link>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
