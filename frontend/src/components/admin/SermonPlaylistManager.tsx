import { useState, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, useSermons, useMusicTracks, usePlaylists, usePlaylistItems, type Playlist } from '../../lib/api'
import {
  Plus, Trash2, Loader2, ListMusic, Clock, Save, X,
  Headphones, Search, BookOpen, Music, Upload, GripVertical,
  Repeat, Shuffle, Play, Pause
} from 'lucide-react'

export default function SermonPlaylistManager({ onRefresh }: { onRefresh?: () => void }) {
  const qc = useQueryClient()
  const { data: playlists = [], isLoading: plLoading } = usePlaylists()
  const { data: allSermons = [], isLoading: sLoading } = useSermons()
  const { data: allMusic = [], isLoading: mLoading } = useMusicTracks()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: items = [], isLoading: itemsLoading } = usePlaylistItems(selectedId || undefined)

  // ── Playlist create/edit form ─────────────────────────────
  const [creating, setCreating] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [form, setForm] = useState({ title: '', description: '', repeat_mode: 'none' as 'none'|'all'|'one', shuffle: false })
  const [saving, setSaving] = useState(false)

  // ── Content browser ─────────────────────────────────────────
  const [browseOpen, setBrowseOpen] = useState(false)
  const [browseTab, setBrowseTab] = useState<'sermons'|'music'>('sermons')
  const [browseSearch, setBrowseSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  // ── Drag & drop ───────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // ── Inline upload ─────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadType, setUploadType] = useState<'sermon' | 'music'>('sermon')
  const [uploadForm, setUploadForm] = useState({
    title: '', speaker: '', scripture_reference: '', description: '',
    artist: '', album: '', genre: '', lyrics: '', duration: ''
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState('')

  // ── Audio preview ─────────────────────────────────────────
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const inPlaylist = useMemo(() => new Set(items.map(i => i.content_id)), [items])

  const filteredSermons = useMemo(() => {
    const q = browseSearch.toLowerCase()
    return allSermons.filter(s =>
      !q || s.title.toLowerCase().includes(q) || (s.speaker || '').toLowerCase().includes(q) || (s.series || '').toLowerCase().includes(q)
    )
  }, [allSermons, browseSearch])

  const filteredMusic = useMemo(() => {
    const q = browseSearch.toLowerCase()
    return allMusic.filter(t =>
      !q || t.title.toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q)
    )
  }, [allMusic, browseSearch])

  const selectedPlaylist = playlists.find(p => p.id === selectedId)

  function refresh() {
    qc.invalidateQueries({ queryKey: ['playlists'] })
    qc.invalidateQueries({ queryKey: ['playlists', selectedId, 'items'] })
    qc.invalidateQueries({ queryKey: ['sermons'] })
    qc.invalidateQueries({ queryKey: ['sermons', 'radio', 'current'] })
    qc.invalidateQueries({ queryKey: ['music'] })
    onRefresh?.()
  }

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    try {
      await api.post('/playlists', {
        title: form.title,
        description: form.description,
        repeat_mode: form.repeat_mode,
        shuffle: form.shuffle,
      })
      setCreating(false)
      setForm({ title: '', description: '', repeat_mode: 'none', shuffle: false })
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create playlist')
    } finally { setSaving(false) }
  }

  async function updatePlaylist(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPlaylist) return
    setSaving(true)
    try {
      await api.patch(`/playlists/${editingPlaylist.id}`, {
        title: form.title,
        description: form.description,
        repeat_mode: form.repeat_mode,
        shuffle: form.shuffle,
      })
      setEditingPlaylist(null)
      setForm({ title: '', description: '', repeat_mode: 'none', shuffle: false })
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update playlist')
    } finally { setSaving(false) }
  }

  function openEdit(pl: Playlist) {
    setEditingPlaylist(pl)
    setForm({ title: pl.title, description: pl.description || '', repeat_mode: pl.repeat_mode, shuffle: pl.shuffle })
  }

  async function deletePlaylist(id: string) {
    if (!confirm('Delete this playlist and all its items?')) return
    try {
      await api.delete(`/playlists/${id}`)
      if (selectedId === id) { setSelectedId(null); setBrowseOpen(false); setUploadOpen(false) }
      refresh()
    } catch {}
  }

  async function addContentToPlaylist(contentType: 'sermon'|'music', contentId: string, duration?: number) {
    if (!selectedId) return
    setAdding(contentId)
    try {
      await api.post(`/playlists/${selectedId}/items`, {
        content_type: contentType,
        content_id: contentId,
        order_index: items.length,
        duration_minutes: duration ? Math.ceil(duration / 60) : 30,
      })
      refresh()
    } catch (err: any) {
      if (err.response?.status !== 409) alert(err.response?.data?.error || 'Failed to add item')
    } finally { setAdding(null) }
  }

  async function deleteItem(itemId: string) {
    if (!selectedId || !confirm('Remove from playlist?')) return
    try {
      await api.delete(`/playlists/${selectedId}/items/${itemId}`)
      refresh()
    } catch {}
  }

  async function reorderBatch(itemIds: string[]) {
    if (!selectedId) return
    try {
      await api.post(`/playlists/${selectedId}/reorder`, { itemIds })
      refresh()
    } catch {}
  }

  // ── Drag & drop handlers ──
  function handleDragStart(e: React.DragEvent, itemId: string) {
    setDraggingId(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault()
    if (overId !== draggingId) setDragOverId(overId)
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    setDragOverId(null)
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return }
    const currentIds = items.map(i => i.id)
    const fromIdx = currentIds.indexOf(draggingId)
    const toIdx = currentIds.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) { setDraggingId(null); return }
    const reordered = [...currentIds]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, draggingId)
    reorderBatch(reordered)
    setDraggingId(null)
  }

  const totalMin = items.reduce((s, i) => s + (i.duration_minutes || 30), 0)
  const inp = { background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }

  function togglePlay(audioUrl: string, id: string) {
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null))
      audio.onended = () => setPlayingId(null)
    }
  }

  // ── Upload helpers ──
  async function uploadToCloudinary(file: File, folder: string): Promise<string> {
    const { data: sig } = await api.get(`/music/signature?folder=${folder}`)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', sig.timestamp)
    fd.append('signature', sig.signature)
    fd.append('folder', sig.folder)
    const res = await fetch(sig.uploadUrl, { method: 'POST', body: fd })
    const up = await res.json()
    if (!res.ok) throw new Error(up.error?.message || 'Cloudinary upload failed')
    return up.secure_url
  }

  async function handleUploadAndAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadForm.title.trim() || !audioFile || !selectedId) { alert('Title and audio file are required'); return }
    setUploading(true)
    try {
      setUploadStep('Uploading audio to Cloudinary...')
      const audioUrl = await uploadToCloudinary(audioFile, uploadType === 'sermon' ? 'sureword/sermons/audio' : 'sureword/music/audio')
      let thumbnailUrl = ''
      if (thumbnailFile) {
        setUploadStep('Uploading cover art...')
        thumbnailUrl = await uploadToCloudinary(thumbnailFile, uploadType === 'sermon' ? 'sureword/sermons/thumbnails' : 'sureword/music/covers')
      }

      if (uploadType === 'sermon') {
        setUploadStep('Creating sermon...')
        const { data: sermonData } = await api.post('/sermons', {
          title: uploadForm.title,
          speaker: uploadForm.speaker,
          scripture_reference: uploadForm.scripture_reference,
          description: uploadForm.description,
          date: new Date().toISOString().slice(0, 10),
          audio_url: audioUrl,
          thumbnail_url: thumbnailUrl || undefined,
        })
        setUploadStep('Adding to playlist...')
        await api.post(`/playlists/${selectedId}/items`, {
          content_type: 'sermon',
          content_id: sermonData.id || sermonData.sermon?.id,
          order_index: items.length,
          duration_minutes: 30,
        })
      } else {
        setUploadStep('Creating music track...')
        const { data: musicData } = await api.post('/music', {
          title: uploadForm.title,
          artist: uploadForm.artist,
          album: uploadForm.album,
          genre: uploadForm.genre,
          audio_url: audioUrl,
          cover_url: thumbnailUrl || '',
          duration: uploadForm.duration ? parseInt(uploadForm.duration) : 0,
          lyrics: uploadForm.lyrics || '',
          file_format: audioFile.type,
          file_size: audioFile.size,
        })
        setUploadStep('Adding to playlist...')
        await api.post(`/playlists/${selectedId}/items`, {
          content_type: 'music',
          content_id: musicData.id || musicData.music?.id || musicData.track?.id,
          order_index: items.length,
          duration_minutes: uploadForm.duration ? Math.ceil(parseInt(uploadForm.duration) / 60) : 3,
        })
      }

      setUploadOpen(false)
      setUploadForm({ title: '', speaker: '', scripture_reference: '', description: '', artist: '', album: '', genre: '', lyrics: '', duration: '' })
      setAudioFile(null)
      setThumbnailFile(null)
      setThumbnailPreview('')
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadStep('')
    }
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setThumbnailFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setThumbnailPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setThumbnailPreview('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Create / Edit form */}
      {(creating || editingPlaylist) ? (
        <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              {editingPlaylist ? 'Edit Playlist' : 'New Playlist'}
            </h3>
            <button onClick={() => { setCreating(false); setEditingPlaylist(null) }} style={{ color: 'var(--dim)' }}><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={editingPlaylist ? updatePlaylist : createPlaylist} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={inp} />
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={inp} />
            <div>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--dim)' }}><Repeat className="w-3 h-3 inline mr-1" />Repeat Mode</label>
              <select value={form.repeat_mode} onChange={e => setForm({ ...form, repeat_mode: e.target.value as any })}
                className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp}>
                <option value="none">None</option>
                <option value="all">All</option>
                <option value="one">One</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input type="checkbox" checked={form.shuffle} onChange={e => setForm({ ...form, shuffle: e.target.checked })}
                  className="rounded border" style={{ accentColor: 'var(--gold)' }} />
                <Shuffle className="w-3 h-3" style={{ color: 'var(--dim)' }} />
                <span className="text-xs" style={{ color: 'var(--dim)' }}>Shuffle</span>
              </label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn-gold disabled:opacity-50 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
              <button type="button" onClick={() => { setCreating(false); setEditingPlaylist(null) }} className="text-sm px-4 py-2 rounded-xl border" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="btn-gold text-sm"><Plus className="w-4 h-4" /> New Playlist</button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Playlists sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--dim)' }}>Playlists ({playlists.length})</h3>
          {plLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dim)' }} /></div>}
          {!plLoading && playlists.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'var(--dim)' }}>No playlists yet.</p>}
          {playlists.map(pl => (
            <button key={pl.id} onClick={() => { setSelectedId(pl.id); setBrowseOpen(false); setUploadOpen(false) }}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{ background: selectedId === pl.id ? 'rgba(232,106,46,0.08)' : '#230d02', border: `1px solid ${selectedId === pl.id ? 'var(--gold)' : 'rgba(240,190,100,0.06)'}` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white truncate pr-2">{pl.title}</p>
                <div className="flex items-center gap-1 shrink-0">
                  {pl.shuffle && <Shuffle className="w-3 h-3" style={{ color: 'var(--dim)' }} />}
                  {pl.repeat_mode !== 'none' && <Repeat className="w-3 h-3" style={{ color: 'var(--dim)' }} />}
                </div>
              </div>
              <p className="text-[10px] mb-2" style={{ color: 'var(--dim)' }}>{pl.repeat_mode !== 'none' ? `Repeat: ${pl.repeat_mode} · ` : ''}{pl.shuffle ? 'Shuffle · ' : ''}{pl.description || 'No description'}</p>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); openEdit(pl) }} className="text-[10px] px-2 py-1 rounded border transition-colors" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>Edit</button>
                <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id) }} className="text-red-400 hover:text-red-300 text-[10px] px-2 py-1 rounded border border-red-400/20 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedPlaylist ? (
            <div className="flex flex-col items-center justify-center rounded-2xl p-10" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              <Headphones className="w-10 h-10 mb-3" style={{ color: 'var(--dim)' }} />
              <p className="text-sm" style={{ color: 'var(--dim)' }}>Select a playlist to manage its items.</p>
            </div>
          ) : (
            <>
              {/* Playlist header */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{selectedPlaylist.title}</h3>
                    {selectedPlaylist.description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--dim)' }}>{selectedPlaylist.description}</p>}
                    <p className="text-[10px] mt-1 flex items-center gap-2" style={{ color: 'var(--dim)' }}>
                      {selectedPlaylist.repeat_mode !== 'none' && <span className="flex items-center gap-1"><Repeat className="w-3 h-3" /> {selectedPlaylist.repeat_mode}</span>}
                      {selectedPlaylist.shuffle && <span className="flex items-center gap-1"><Shuffle className="w-3 h-3" /> shuffle</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setUploadOpen(v => !v)} className="text-xs px-3 py-2 rounded-lg border transition-colors" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                      <Upload className="w-3 h-3 inline mr-1" /> Upload
                    </button>
                    <button onClick={() => setBrowseOpen(v => !v)} className="btn-gold text-xs"><Plus className="w-3 h-3" /> Add Items</button>
                  </div>
                </div>

                {/* Items list */}
                {itemsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dim)' }} /></div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--dim)' }}>
                    <ListMusic className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No items yet. Click &quot;Add Items&quot; or &quot;Upload&quot; to populate.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={item.id} draggable onDragStart={e => handleDragStart(e, item.id)}
                          onDragOver={e => handleDragOver(e, item.id)} onDrop={e => handleDrop(e, item.id)}
                          className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-move"
                          style={{ background: dragOverId === item.id ? 'rgba(201,162,39,0.12)' : 'var(--ink)', border: `1px solid ${dragOverId === item.id ? 'var(--gold)' : 'var(--line)'}`, opacity: draggingId === item.id ? 0.5 : 1 }}>
                          <GripVertical className="w-4 h-4 shrink-0" style={{ color: 'var(--dim)' }} />
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'var(--gold)', color: '#1b1208' }}>{idx + 1}</div>
                          <div className="w-9 h-9 rounded shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--ink-2)' }}>
                            {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              : item.content_type === 'music' ? <Music className="w-4 h-4" style={{ color: 'var(--dim)' }} />
                                : <BookOpen className="w-4 h-4" style={{ color: 'var(--dim)' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-white">{item.title || 'Unknown'}</p>
                            <p className="text-[10px]" style={{ color: 'var(--dim)' }}>
                              {item.content_type === 'music' ? 'Music' : 'Sermon'}
                              {item.speaker ? ` · ${item.speaker}` : ''}
                              {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
                            </p>
                          </div>
                          {item.content_type === 'music' && item.audio_url && (
                            <button onClick={() => togglePlay(item.audio_url, item.id)}
                              className="p-1.5 rounded-lg transition-colors shrink-0"
                              style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: playingId === item.id ? 'var(--gold)' : 'var(--dim)' }}
                              title={playingId === item.id ? 'Pause' : 'Play'}>
                              {playingId === item.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button onClick={() => deleteItem(item.id)} className="p-1.5 text-red-400 hover:text-red-300 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] mt-3" style={{ color: 'var(--dim)' }}>
                      <Clock className="w-3 h-3 inline mr-1" />{items.length} item{items.length !== 1 ? 's' : ''} · Total runtime: {Math.floor(totalMin / 60)}h {totalMin % 60}m
                    </p>
                  </>
                )}
              </div>

              {/* Upload panel */}
              {uploadOpen && (
                <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Upload &amp; Add {uploadType === 'sermon' ? 'Sermon' : 'Music'}</h4>
                    <button onClick={() => { setUploadOpen(false); setUploadType('sermon'); setUploadForm({ title: '', speaker: '', scripture_reference: '', description: '', artist: '', album: '', genre: '', lyrics: '', duration: '' }); setAudioFile(null); setThumbnailFile(null); setThumbnailPreview('') }} style={{ color: 'var(--dim)' }}><X className="w-4 h-4" /></button>
                  </div>
                  {/* Type toggle */}
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setUploadType('sermon')} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${uploadType === 'sermon' ? 'bg-[var(--gold)] text-[#1b1208] border-transparent' : ''}`} style={uploadType !== 'sermon' ? { borderColor: 'var(--line)', color: 'var(--dim)' } : {}}>
                      <BookOpen className="w-3.5 h-3.5" /> Sermon
                    </button>
                    <button onClick={() => setUploadType('music')} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${uploadType === 'music' ? 'bg-[var(--gold)] text-[#1b1208] border-transparent' : ''}`} style={uploadType !== 'music' ? { borderColor: 'var(--line)', color: 'var(--dim)' } : {}}>
                      <Music className="w-3.5 h-3.5" /> Music
                    </button>
                  </div>
                  <form onSubmit={handleUploadAndAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="Title *" value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} required
                      className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={inp} />
                    {uploadType === 'sermon' ? (
                      <>
                        <input placeholder="Speaker" value={uploadForm.speaker} onChange={e => setUploadForm({ ...uploadForm, speaker: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
                        <input placeholder="Scripture Reference" value={uploadForm.scripture_reference} onChange={e => setUploadForm({ ...uploadForm, scripture_reference: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
                        <textarea placeholder="Description" value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                          rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={inp} />
                      </>
                    ) : (
                      <>
                        <input placeholder="Artist" value={uploadForm.artist} onChange={e => setUploadForm({ ...uploadForm, artist: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
                        <input placeholder="Album" value={uploadForm.album} onChange={e => setUploadForm({ ...uploadForm, album: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
                        <input placeholder="Genre" value={uploadForm.genre} onChange={e => setUploadForm({ ...uploadForm, genre: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
                        <input placeholder="Duration (seconds)" type="number" value={uploadForm.duration} onChange={e => setUploadForm({ ...uploadForm, duration: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm" style={inp} />
                        <textarea placeholder="Lyrics (optional)" value={uploadForm.lyrics} onChange={e => setUploadForm({ ...uploadForm, lyrics: e.target.value })}
                          rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={inp} />
                      </>
                    )}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] mb-1" style={{ color: 'var(--dim)' }}>Audio File *</label>
                      <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-white" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] mb-1" style={{ color: 'var(--dim)' }}>{uploadType === 'sermon' ? 'Thumbnail' : 'Cover Art'} (optional)</label>
                      <input type="file" accept="image/*" onChange={handleThumbnailChange} className="w-full text-xs text-white" />
                      {thumbnailPreview && <img src={thumbnailPreview} alt="Preview" className="w-16 h-16 rounded object-cover mt-2" />}
                    </div>
                    {uploadStep && <p className="text-[11px] sm:col-span-2" style={{ color: 'var(--dim)' }}>{uploadStep}</p>}
                    <div className="sm:col-span-2 flex gap-2">
                      <button type="submit" disabled={uploading || !audioFile} className="btn-gold disabled:opacity-50 text-sm">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload &amp; Add
                      </button>
                      <button type="button" onClick={() => setUploadOpen(false)} className="text-sm px-4 py-2 rounded-xl border" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Browse panel */}
              {browseOpen && (
                <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setBrowseTab('sermons')} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${browseTab === 'sermons' ? 'bg-[var(--gold)] text-[#1b1208] border-transparent' : ''}`} style={browseTab !== 'sermons' ? { borderColor: 'var(--line)', color: 'var(--dim)' } : {}}>
                        <BookOpen className="w-3 h-3 inline mr-1" /> Sermons
                      </button>
                      <button onClick={() => setBrowseTab('music')} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${browseTab === 'music' ? 'bg-[var(--gold)] text-[#1b1208] border-transparent' : ''}`} style={browseTab !== 'music' ? { borderColor: 'var(--line)', color: 'var(--dim)' } : {}}>
                        <Music className="w-3 h-3 inline mr-1" /> Music
                      </button>
                    </div>
                    <button onClick={() => { setBrowseOpen(false); setBrowseSearch('') }} style={{ color: 'var(--dim)' }}><X className="w-4 h-4" /></button>
                  </div>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--dim)' }} />
                    <input type="text" value={browseSearch} onChange={e => setBrowseSearch(e.target.value)}
                      placeholder={`Search ${browseTab}...`} className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm" style={inp} />
                  </div>
                  {browseTab === 'sermons' ? (
                    sLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dim)' }} /></div>
                      : filteredSermons.length === 0 ? <p className="text-sm text-center py-6" style={{ color: 'var(--dim)' }}>No sermons found.</p>
                        : <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                          {filteredSermons.map(s => {
                            const already = inPlaylist.has(s.id)
                            const isAdding = adding === s.id
                            const durMin = s.duration ? Math.ceil(s.duration / 60) : null
                            return (
                              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                                style={{ background: already ? 'rgba(74,222,128,0.04)' : 'var(--ink)', border: `1px solid ${already ? 'rgba(74,222,128,0.15)' : 'var(--line)'}` }}>
                                <div className="w-10 h-10 rounded shrink-0 overflow-hidden" style={{ background: 'var(--ink-2)' }}>
                                  {s.thumbnail_url ? <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                    : <BookOpen className="w-4 h-4 m-3" style={{ color: 'var(--dim)' }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-white">{s.title}</p>
                                  <p className="text-[10px]" style={{ color: 'var(--dim)' }}>{s.speaker}{s.series ? ` · ${s.series}` : ''}{durMin ? ` · ${durMin} min` : ''}</p>
                                </div>
                                <button onClick={() => !already && addContentToPlaylist('sermon', s.id, s.duration)}
                                  disabled={already || isAdding}
                                  className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-50"
                                  style={already ? { borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80', background: 'rgba(74,222,128,0.08)' } : { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'transparent' }}>
                                  {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : already ? 'Added' : '+ Add'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                  ) : (
                    mLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--dim)' }} /></div>
                      : filteredMusic.length === 0 ? <p className="text-sm text-center py-6" style={{ color: 'var(--dim)' }}>No music found.</p>
                        : <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                          {filteredMusic.map(t => {
                            const already = inPlaylist.has(t.id)
                            const isAdding = adding === t.id
                            const durMin = t.duration ? Math.ceil(t.duration / 60) : null
                            return (
                              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                                style={{ background: already ? 'rgba(74,222,128,0.04)' : 'var(--ink)', border: `1px solid ${already ? 'rgba(74,222,128,0.15)' : 'var(--line)'}` }}>
                                <div className="w-10 h-10 rounded shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--ink-2)' }}>
                                  {t.cover_url ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" />
                                    : <Music className="w-4 h-4" style={{ color: 'var(--dim)' }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-white">{t.title}</p>
                                  <p className="text-[10px]" style={{ color: 'var(--dim)' }}>{t.artist}{t.album ? ` · ${t.album}` : ''}{durMin ? ` · ${durMin} min` : ''}</p>
                                </div>
                                {t.audio_url && (
                                  <button onClick={() => togglePlay(t.audio_url, t.id)}
                                    className="p-1.5 rounded-lg transition-colors shrink-0"
                                    style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: playingId === t.id ? 'var(--gold)' : 'var(--dim)' }}
                                    title={playingId === t.id ? 'Pause' : 'Play'}>
                                    {playingId === t.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                <button onClick={() => !already && addContentToPlaylist('music', t.id, t.duration)}
                                  disabled={already || isAdding}
                                  className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-50"
                                  style={already ? { borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80', background: 'rgba(74,222,128,0.08)' } : { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'transparent' }}>
                                  {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : already ? 'Added' : '+ Add'}
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
