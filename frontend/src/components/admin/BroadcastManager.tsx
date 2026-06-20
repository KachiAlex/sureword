import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Radio, Play, Square, Plus, Loader2, Pause, ArrowLeft,
  Mic, Headphones, BookOpen, ExternalLink, AlertCircle,
  Monitor, ChevronRight
} from 'lucide-react'
import RadioStudio from '../broadcast/RadioStudio'
import AudioTestPanel from '../broadcast/AudioTestPanel'

interface Broadcast {
  id: string
  title: string
  status: 'scheduled' | 'live' | 'ended'
  started_at?: string
  created_at: string
  description?: string
  scripture_reference?: string
  church_online_url?: string
  rtmp_url?: string
  stream_key?: string
}

type StudioView = 'list' | 'setup' | 'studio'

export default function BroadcastManager({ broadcasts, onRefresh }: { broadcasts: Broadcast[]; onRefresh: () => void }) {
  const token = localStorage.getItem('token')
  const [view, setView] = useState<StudioView>('list')
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null)

  /* ── Setup form state ── */
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scripture, setScripture] = useState('')
  const [churchOnlineUrl, setChurchOnlineUrl] = useState('')
  const [rtmpUrl, setRtmpUrl] = useState('')
  const [streamKey, setStreamKey] = useState('')
  const [selectedDevice, setSelectedDevice] = useState('')
  const [setupError, setSetupError] = useState('')

  /* ── Studio state ── */
  const [broadcastId, setBroadcastId] = useState('')
  const [status, setStatus] = useState<'idle' | 'live' | 'paused'>('idle')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  /* ── Auto-detect existing live broadcast on mount ── */
  useEffect(() => {
    const live = broadcasts.find(b => b.status === 'live')
    if (live) {
      setActiveBroadcast(live)
      setBroadcastId(live.id)
      setTitle(live.title || '')
      setDescription(live.description || '')
      setScripture(live.scripture_reference || '')
      setChurchOnlineUrl(live.church_online_url || '')
      setRtmpUrl(live.rtmp_url || '')
      setStreamKey(live.stream_key || '')
      setStatus('live')
      setStartTime(live.started_at ? new Date(live.started_at) : new Date())
      setView('studio')
    }
  }, [broadcasts])

  /* ── Create & go live (setup flow) ── */
  async function createAndGoLive(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setSetupError('Please enter a broadcast title'); return }
    setSetupError('')
    setCreating(true)
    try {
      const { data } = await axios.post('/api/broadcasts', {
        title, description, scripture_reference: scripture,
        church_online_url: churchOnlineUrl || undefined,
        rtmp_url: rtmpUrl || undefined,
        stream_key: streamKey || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } })
      await axios.patch(`/api/broadcasts/${data.id}/start`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setBroadcastId(data.id)
      setStatus('live')
      setStartTime(new Date())
      setView('studio')
      onRefresh()
    } catch (err: any) {
      setSetupError(err.response?.data?.error || 'Failed to start broadcast')
    } finally { setCreating(false) }
  }

  /* ── Start an existing scheduled broadcast ── */
  async function startBroadcast(id: string) {
    setActionLoading(true)
    try {
      await axios.patch(`/api/broadcasts/${id}/start`, {}, { headers: { Authorization: `Bearer ${token}` } })
      const b = broadcasts.find(x => x.id === id)
      if (b) {
        setActiveBroadcast(b)
        setBroadcastId(b.id)
        setTitle(b.title || '')
        setDescription(b.description || '')
        setScripture(b.scripture_reference || '')
        setChurchOnlineUrl(b.church_online_url || '')
        setRtmpUrl(b.rtmp_url || '')
        setStreamKey(b.stream_key || '')
        setStatus('live')
        setStartTime(new Date())
        setView('studio')
      }
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start broadcast')
    } finally { setActionLoading(false) }
  }

  async function pauseBroadcast() {
    if (!broadcastId) return
    setActionLoading(true)
    try {
      await axios.patch(`/api/broadcasts/${broadcastId}/pause`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setStatus('paused')
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to pause')
    } finally { setActionLoading(false) }
  }

  async function resumeBroadcast() {
    if (!broadcastId) return
    setActionLoading(true)
    try {
      await axios.patch(`/api/broadcasts/${broadcastId}/resume`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setStatus('live')
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resume')
    } finally { setActionLoading(false) }
  }

  async function stopBroadcast() {
    if (!broadcastId) return
    setActionLoading(true)
    try {
      await axios.patch(`/api/broadcasts/${broadcastId}/end`, {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch { /* ignore */ }
    setStatus('idle')
    setBroadcastId('')
    setStartTime(null)
    setView('list')
    setActionLoading(false)
    onRefresh()
  }

  function openSetup() {
    setTitle('')
    setDescription('')
    setScripture('')
    setChurchOnlineUrl('')
    setRtmpUrl('')
    setStreamKey('')
    setSetupError('')
    setView('setup')
  }

  function openStudio(b: Broadcast) {
    setActiveBroadcast(b)
    setBroadcastId(b.id)
    setTitle(b.title || '')
    setDescription(b.description || '')
    setScripture(b.scripture_reference || '')
    setChurchOnlineUrl(b.church_online_url || '')
    setRtmpUrl(b.rtmp_url || '')
    setStreamKey(b.stream_key || '')
    setStatus(b.status === 'live' ? 'live' : 'paused')
    setStartTime(b.started_at ? new Date(b.started_at) : new Date())
    setView('studio')
  }

  /* ─── LIST VIEW ─── */
  if (view === 'list') {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Broadcast Studio</h2>
            <p className="text-[10px] text-[#9c958a] mt-0.5">Create, manage and go live from one place</p>
          </div>
          <button onClick={openSetup}
            className="flex items-center gap-1.5 bg-[#c9a227] hover:bg-[#e0bd5a] text-[#1b1208] text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Broadcast
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Live Now', value: broadcasts.filter(b => b.status === 'live').length, color: '#4ade80' },
            { label: 'Scheduled', value: broadcasts.filter(b => b.status === 'scheduled').length, color: '#eab308' },
            { label: 'Total', value: broadcasts.length, color: '#c9a227' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-[#14141a] border border-[rgba(243,238,228,0.06)] text-center">
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#9c958a]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Broadcast list */}
        <div className="rounded-xl overflow-hidden bg-[#14141a] border border-[rgba(243,238,228,0.06)]">
          <div className="px-4 py-3 border-b border-[rgba(243,238,228,0.06)] bg-[rgba(243,238,228,0.02)]">
            <h3 className="text-xs font-semibold text-white flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#c9a227]" /> All Broadcasts
            </h3>
          </div>
          {broadcasts.length === 0 ? (
            <div className="p-8 text-center text-[#9c958a] text-xs">
              <Radio className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No broadcasts yet. Create your first broadcast to go live.</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(243,238,228,0.04)]">
              {broadcasts.map(b => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between hover:bg-[rgba(243,238,228,0.02)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{b.title}</p>
                    <p className="text-[10px] text-[#9c958a] mt-0.5">
                      {b.status === 'live' ? 'Live now' : b.started_at ? new Date(b.started_at).toLocaleString() : 'Scheduled'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      b.status === 'live' ? 'bg-[#4ade80]/10 text-[#4ade80]' :
                      b.status === 'ended' ? 'bg-[rgba(243,238,228,0.06)] text-[#9c958a]' :
                      'bg-[#eab308]/10 text-[#eab308]'
                    }`}>
                      {b.status}
                    </span>
                    {b.status === 'scheduled' && (
                      <button onClick={() => startBroadcast(b.id)} disabled={actionLoading}
                        className="p-1.5 rounded-md bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] transition-colors"
                        title="Go Live">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {b.status === 'live' && (
                      <>
                        <button onClick={() => openStudio(b)}
                          className="p-1.5 rounded-md bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] transition-colors"
                          title="Open Studio">
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => stopBroadcast()} disabled={actionLoading}
                          className="p-1.5 rounded-md bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] transition-colors"
                          title="End Broadcast">
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ─── SETUP VIEW ─── */
  if (view === 'setup') {
    return (
      <div className="space-y-5">
        <button onClick={() => setView('list')}
          className="flex items-center gap-1.5 text-[11px] text-[#9c958a] hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to broadcasts
        </button>

        <div className="rounded-xl bg-[#14141a] border border-[rgba(243,238,228,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(243,238,228,0.06)]">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#c9a227]" /> New Broadcast Setup
            </h3>
            <p className="text-[10px] text-[#9c958a] mt-1">Configure your broadcast details before going live</p>
          </div>

          <form onSubmit={createAndGoLive} className="p-5 space-y-5">
            {setupError && (
              <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {setupError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium text-[#9c958a] uppercase tracking-wider mb-1.5">Broadcast Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Sunday Morning Service"
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#1c1d24] border border-[rgba(243,238,228,0.08)] text-white outline-none focus:border-[#c9a227]/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#9c958a] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Scripture Reference
                </label>
                <input type="text" value={scripture} onChange={e => setScripture(e.target.value)}
                  placeholder="e.g., Romans 8:1-17"
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#1c1d24] border border-[rgba(243,238,228,0.08)] text-white outline-none focus:border-[#c9a227]/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[#9c958a] uppercase tracking-wider mb-1.5">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Optional description for listeners..."
                className="w-full rounded-lg px-3 py-2 text-xs bg-[#1c1d24] border border-[rgba(243,238,228,0.08)] text-white outline-none focus:border-[#c9a227]/40 transition-colors resize-none"
              />
            </div>

            <div className="rounded-xl bg-[#1c1d24] border border-[rgba(243,238,228,0.06)] p-4 space-y-3">
              <h4 className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#c9a227]" /> Stream Configuration
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#9c958a] mb-1">Church Online URL</label>
                  <input type="text" value={churchOnlineUrl} onChange={e => setChurchOnlineUrl(e.target.value)}
                    placeholder="https://online.church/your-church"
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#14141a] border border-[rgba(243,238,228,0.08)] text-white outline-none focus:border-[#c9a227]/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9c958a] mb-1">RTMP Ingest URL</label>
                  <input type="text" value={rtmpUrl} onChange={e => setRtmpUrl(e.target.value)}
                    placeholder="rtmp://live.churchonline.com/live"
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#14141a] border border-[rgba(243,238,228,0.08)] text-white outline-none focus:border-[#c9a227]/40 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[#9c958a] mb-1">Stream Key</label>
                <input type="password" value={streamKey} onChange={e => setStreamKey(e.target.value)}
                  placeholder="Your stream key"
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#14141a] border border-[rgba(243,238,228,0.08)] text-white outline-none focus:border-[#c9a227]/40 transition-colors"
                />
              </div>
            </div>

            <AudioTestPanel onDeviceSelect={setSelectedDevice} />

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setView('list')}
                className="text-[11px] text-[#9c958a] hover:text-white transition-colors px-3 py-2">
                Cancel
              </button>
              <button type="submit" disabled={creating || !title.trim()}
                className="flex items-center gap-1.5 bg-[#ef4444] hover:bg-[#ef4444]/90 text-white text-[11px] font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                {creating ? 'Starting...' : 'Go Live'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  /* ─── STUDIO VIEW ─── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { setView('list'); onRefresh() }}
          className="flex items-center gap-1.5 text-[11px] text-[#9c958a] hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to broadcasts
        </button>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
          status === 'live' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#eab308]/10 text-[#eab308]'
        }`}>
          {status === 'live' ? <><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" /> LIVE</> : 'PAUSED'}
        </span>
      </div>

      <RadioStudio
        broadcastId={broadcastId}
        title={title}
        description={description}
        scripture={scripture}
        churchOnlineUrl={churchOnlineUrl}
        status={status}
        startTime={startTime}
        selectedDevice={selectedDevice}
        onPause={pauseBroadcast}
        onResume={resumeBroadcast}
        onEnd={stopBroadcast}
        actionLoading={actionLoading}
      />
    </div>
  )
}
