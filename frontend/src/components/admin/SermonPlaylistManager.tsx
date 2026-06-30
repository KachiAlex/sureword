import { useState, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, useSermons, useSermonPlaylists, useSermonPlaylistItems } from '../../lib/api'
import {
  Plus, Trash2, Loader2, ListMusic, Clock, Calendar, Save, X,
  Headphones, Search, ChevronUp, ChevronDown, BookOpen, Radio, Play, SkipForward, Square
} from 'lucide-react'

interface Pl { id: string; title: string; description: string; start_time: string; end_time?: string; is_active: boolean }

interface RadioStatus {
  streamKey: string
  playlistId: string
  currentSermonId: string
  currentSermonTitle: string
  currentSermonSpeaker: string
  offsetSeconds: number
  itemIndex: number
  totalItems: number
}

export default function SermonPlaylistManager({ onRefresh }: { onRefresh?: () => void }) {
  const qc = useQueryClient()
  const { data: playlists = [], isLoading: plLoading } = useSermonPlaylists()
  const { data: allSermons = [], isLoading: sLoading } = useSermons()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: items = [], isLoading: itemsLoading } = useSermonPlaylistItems(selectedId || undefined)

  // ── Radio status ────────────────────────────────────────────
  const [radioStatus, setRadioStatus] = useState<RadioStatus | null>(null)
  const [radioLoading, setRadioLoading] = useState(false)

  useEffect(() => {
    async function poll() {
      try {
        const { data } = await api.get('/radio/status')
        setRadioStatus(data.status)
      } catch { setRadioStatus(null) }
    }
    poll()
    const iv = setInterval(poll, 5000)
    return () => clearInterval(iv)
  }, [])

  // ── Playlist create form ────────────────────────────────────
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '' })
  const [saving, setSaving] = useState(false)

  // ── Sermon browser ──────────────────────────────────────────
  const [browseOpen, setBrowseOpen] = useState(false)
  const [browseSearch, setBrowseSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null) // sermon id being added

  const inPlaylist = useMemo(() => new Set(items.map(i => i.sermon_id)), [items])

  const filteredSermons = useMemo(() => {
    const q = browseSearch.toLowerCase()
    return allSermons.filter(s =>
      !q || s.title.toLowerCase().includes(q) || (s.speaker || '').toLowerCase().includes(q) || (s.series || '').toLowerCase().includes(q)
    )
  }, [allSermons, browseSearch])

  const selectedPlaylist = playlists.find(p => p.id === selectedId) as Pl | undefined

  function refresh() {
    qc.invalidateQueries({ queryKey: ['sermon-playlists'] })
    qc.invalidateQueries({ queryKey: ['sermons', 'radio', 'current'] })
    onRefresh?.()
  }

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.start_time) return
    setSaving(true)
    try {
      await api.post('/sermon-playlists', {
        title: form.title,
        description: form.description,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      })
      setCreating(false)
      setForm({ title: '', description: '', start_time: '', end_time: '' })
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create playlist')
    } finally { setSaving(false) }
  }

  async function toggleActive(pl: Pl) {
    try {
      await api.patch(`/sermon-playlists/${pl.id}`, { is_active: !pl.is_active })
      refresh()
    } catch {}
  }

  async function deletePlaylist(id: string) {
    if (!confirm('Delete this playlist and all its items?')) return
    try {
      await api.delete(`/sermon-playlists/${id}`)
      if (selectedId === id) { setSelectedId(null); setBrowseOpen(false) }
      refresh()
    } catch {}
  }

  async function addSermonToPlaylist(sermonId: string) {
    if (!selectedId) return
    setAdding(sermonId)
    const sermon = allSermons.find(s => s.id === sermonId)
    const durationMin = sermon?.duration ? Math.ceil(sermon.duration / 60) : 30
    try {
      await api.post(`/sermon-playlists/${selectedId}/items`, {
        sermon_id: sermonId,
        order_index: items.length,
        duration_minutes: durationMin,
      })
      refresh()
    } catch (err: any) {
      if (err.response?.status !== 409) alert(err.response?.data?.error || 'Failed to add sermon')
    } finally { setAdding(null) }
  }

  async function deleteItem(itemId: string) {
    if (!selectedId || !confirm('Remove from playlist?')) return
    try {
      await api.delete(`/sermon-playlists/${selectedId}/items/${itemId}`)
      refresh()
    } catch {}
  }

  async function moveItem(itemId: string, direction: 'up' | 'down') {
    if (!selectedId) return
    const idx = items.findIndex(i => i.id === itemId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return
    const a = items[idx]
    const b = items[swapIdx]
    try {
      await Promise.all([
        api.patch(`/sermon-playlists/${selectedId}/items/${a.id}`, { order_index: b.order_index }),
        api.patch(`/sermon-playlists/${selectedId}/items/${b.id}`, { order_index: a.order_index }),
      ])
      refresh()
    } catch {}
  }

  const totalMin = items.reduce((s, i) => s + (i.duration_minutes || 30), 0)
  const inp = { background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }

  async function startRadioPlaylist(playlistId: string) {
    setRadioLoading(true)
    try {
      await api.post('/radio/start', { playlistId })
      const { data } = await api.get('/radio/status')
      setRadioStatus(data.status)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start radio')
    } finally { setRadioLoading(false) }
  }

  async function stopRadioStream() {
    setRadioLoading(true)
    try {
      await api.post('/radio/stop')
      setRadioStatus(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to stop radio')
    } finally { setRadioLoading(false) }
  }

  async function skipRadioSermon() {
    setRadioLoading(true)
    try {
      await api.post('/radio/skip')
      const { data } = await api.get('/radio/status')
      setRadioStatus(data.status)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to skip sermon')
    } finally { setRadioLoading(false) }
  }

  return (
    <div className="space-y-6">
      {/* ── Radio Status Banner ── */}
      {radioStatus && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
              <span className="text-sm font-semibold text-white">Radio On Air</span>
              <span className="text-xs" style={{ color: 'var(--dim)' }}>
                {radioStatus.currentSermonTitle}
                {radioStatus.currentSermonSpeaker ? ` · ${radioStatus.currentSermonSpeaker}` : ''}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E05A1A]/10 text-[#E05A1A]">
                {radioStatus.itemIndex + 1} / {radioStatus.totalItems}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={skipRadioSermon} disabled={radioLoading}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: 'rgba(201,162,39,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,162,39,0.2)' }}>
                {radioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <SkipForward className="w-3 h-3" />} Skip
              </button>
              <button onClick={stopRadioStream} disabled={radioLoading}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}>
                {radioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />} Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create playlist form ── */}
      {creating ? (
        <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4" style={{ color: 'var(--gold)' }} />New Playlist</h3>
            <button onClick={() => setCreating(false)} style={{ color: 'var(--dim)' }}><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={createPlaylist} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={inp} />
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={inp} />
            <div>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--dim)' }}><Calendar className="w-3 h-3 inline mr-1" />Broadcast Start *</label>
              <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required
                className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
            </div>
            <div>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--dim)' }}><Calendar className="w-3 h-3 inline mr-1" />Broadcast End (optional)</label>
              <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn-gold disabled:opacity-50 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
              <button type="button" onClick={() => setCreating(false)} className="text-sm px-4 py-2 rounded-xl border" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="btn-gold text-sm"><Plus className="w-4 h-4" /> New Playlist</button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Playlists sidebar ── */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--dim)' }}>
            Playlists ({playlists.length})
          </h3>
          {plLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dim)' }} /></div>}
          {!plLoading && playlists.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: 'var(--dim)' }}>No playlists yet.</p>
          )}
          {playlists.map(pl => (
            <button key={pl.id} onClick={() => { setSelectedId(pl.id); setBrowseOpen(false) }}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{ background: selectedId === pl.id ? 'rgba(232,106,46,0.08)' : '#230d02', border: `1px solid ${selectedId === pl.id ? 'var(--gold)' : 'rgba(240,190,100,0.06)'}` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white truncate pr-2">{pl.title}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${pl.is_active ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#9a7c60]/10 text-[#9a7c60]'}`}>
                  {pl.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-[10px] mb-2" style={{ color: 'var(--dim)' }}>
                <Calendar className="w-3 h-3 inline mr-1" />{new Date(pl.start_time).toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); startRadioPlaylist(pl.id) }}
                  disabled={radioLoading}
                  className="text-[10px] px-2 py-1 rounded border transition-colors disabled:opacity-50"
                  style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                  <Play className="w-3 h-3 inline mr-0.5" /> Start
                </button>
                <button onClick={e => { e.stopPropagation(); toggleActive(pl) }}
                  className="text-[10px] px-2 py-1 rounded border transition-colors" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>
                  {pl.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id) }}
                  className="text-red-400 hover:text-red-300 text-[10px] px-2 py-1 rounded border border-red-400/20 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </button>
          ))}
        </div>

        {/* ── Right panel: items + sermon browser ── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedPlaylist ? (
            <div className="flex flex-col items-center justify-center rounded-2xl p-10" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              <Headphones className="w-10 h-10 mb-3" style={{ color: 'var(--dim)' }} />
              <p className="text-sm" style={{ color: 'var(--dim)' }}>Select a playlist to manage its sermons.</p>
            </div>
          ) : (
            <>
              {/* Playlist header */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{selectedPlaylist.title}</h3>
                    {selectedPlaylist.description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--dim)' }}>{selectedPlaylist.description}</p>}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--dim)' }}>
                      <Radio className="w-3 h-3 inline mr-1" />Airs from {new Date(selectedPlaylist.start_time).toLocaleString()}
                      {selectedPlaylist.end_time ? ` → ${new Date(selectedPlaylist.end_time).toLocaleString()}` : ' (open-ended, loops)'}
                    </p>
                  </div>
                  <button onClick={() => setBrowseOpen(v => !v)} className="btn-gold text-xs shrink-0">
                    <Plus className="w-3 h-3" /> Add Sermons
                  </button>
                </div>

                {/* Playlist items */}
                {itemsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dim)' }} /></div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--dim)' }}>
                    <ListMusic className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No sermons yet. Click "Add Sermons" to browse.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
                          {/* Order number */}
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'var(--gold)', color: '#1b1208' }}>
                            {idx + 1}
                          </div>
                          {/* Thumbnail */}
                          <div className="w-9 h-9 rounded shrink-0 overflow-hidden" style={{ background: 'var(--ink-2)' }}>
                            {(item as any).thumbnail_url
                              ? <img src={(item as any).thumbnail_url} alt="" className="w-full h-full object-cover" />
                              : <BookOpen className="w-4 h-4 m-2.5" style={{ color: 'var(--dim)' }} />}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-white">{item.title || 'Unknown'}</p>
                            <p className="text-[10px]" style={{ color: 'var(--dim)' }}>
                              {item.speaker}
                              {item.speaker && item.duration_minutes ? ' · ' : ''}
                              <Clock className="w-3 h-3 inline mx-0.5" />{item.duration_minutes} min
                            </p>
                          </div>
                          {/* Reorder arrows */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button onClick={() => moveItem(item.id, 'up')} disabled={idx === 0}
                              className="p-0.5 rounded hover:bg-[var(--ink-2)] disabled:opacity-30 transition-colors" style={{ color: 'var(--dim)' }}>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveItem(item.id, 'down')} disabled={idx === items.length - 1}
                              className="p-0.5 rounded hover:bg-[var(--ink-2)] disabled:opacity-30 transition-colors" style={{ color: 'var(--dim)' }}>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Remove */}
                          <button onClick={() => deleteItem(item.id)} className="p-1.5 text-red-400 hover:text-red-300 transition-colors shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] mt-3" style={{ color: 'var(--dim)' }}>
                      <Clock className="w-3 h-3 inline mr-1" />{items.length} sermon{items.length !== 1 ? 's' : ''} · Total runtime: {Math.floor(totalMin / 60)}h {totalMin % 60}m (loops continuously)
                    </p>
                  </>
                )}
              </div>

              {/* ── Sermon Browser ── */}
              {browseOpen && (
                <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Browse Uploaded Sermons</h4>
                    <button onClick={() => { setBrowseOpen(false); setBrowseSearch('') }} style={{ color: 'var(--dim)' }}><X className="w-4 h-4" /></button>
                  </div>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--dim)' }} />
                    <input type="text" value={browseSearch} onChange={e => setBrowseSearch(e.target.value)}
                      placeholder="Search by title, speaker or series…"
                      className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm" style={inp} />
                  </div>
                  {sLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dim)' }} /></div>
                  ) : filteredSermons.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--dim)' }}>No sermons found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {filteredSermons.map(s => {
                        const already = inPlaylist.has(s.id)
                        const isAdding = adding === s.id
                        const durMin = s.duration ? Math.ceil(s.duration / 60) : null
                        return (
                          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                            style={{ background: already ? 'rgba(74,222,128,0.04)' : 'var(--ink)', border: `1px solid ${already ? 'rgba(74,222,128,0.15)' : 'var(--line)'}` }}>
                            {/* Thumb */}
                            <div className="w-10 h-10 rounded shrink-0 overflow-hidden" style={{ background: 'var(--ink-2)' }}>
                              {s.thumbnail_url
                                ? <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                : <BookOpen className="w-4 h-4 m-3" style={{ color: 'var(--dim)' }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-white">{s.title}</p>
                              <p className="text-[10px]" style={{ color: 'var(--dim)' }}>
                                {s.speaker}{s.series ? ` · ${s.series}` : ''}
                                {durMin ? ` · ${durMin} min` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => !already && addSermonToPlaylist(s.id)}
                              disabled={already || isAdding}
                              className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-50"
                              style={already
                                ? { borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80', background: 'rgba(74,222,128,0.08)' }
                                : { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'transparent' }}>
                              {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : already ? '✓ Added' : '+ Add'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
