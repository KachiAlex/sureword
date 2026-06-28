import { useState } from 'react'
import axios from 'axios'
import { API_BASE, useSermons, useSermonPlaylists, useSermonPlaylistItems } from '../../lib/api'
import { Plus, Trash2, Loader2, ListMusic, Clock, Calendar, Save, X, Headphones } from 'lucide-react'

interface SermonPlaylist {
  id: string
  title: string
  description: string
  start_time: string
  end_time?: string
  is_active: boolean
  created_at: string
}

export default function SermonPlaylistManager({ onRefresh }: { onRefresh: () => void }) {
  const { data: playlists = [] } = useSermonPlaylists()
  const { data: allSermons = [] } = useSermons()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const { data: items = [] } = useSermonPlaylistItems(selectedPlaylistId || undefined)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '' })
  const [addingItem, setAddingItem] = useState(false)
  const [itemForm, setItemForm] = useState({ sermon_id: '', order_index: '0', duration_minutes: '30' })
  const [submitting, setSubmitting] = useState(false)
  const token = localStorage.getItem('token')

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.start_time) { alert('Title and start time are required'); return }
    setSubmitting(true)
    try {
      await axios.post(`${API_BASE}/api/sermon-playlists`, {
        title: form.title,
        description: form.description,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setCreating(false)
      setForm({ title: '', description: '', start_time: '', end_time: '' })
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create playlist')
    } finally { setSubmitting(false) }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlaylistId || !itemForm.sermon_id) { alert('Select a sermon'); return }
    setSubmitting(true)
    try {
      await axios.post(`${API_BASE}/api/sermon-playlists/${selectedPlaylistId}/items`, {
        sermon_id: itemForm.sermon_id,
        order_index: parseInt(itemForm.order_index),
        duration_minutes: parseInt(itemForm.duration_minutes) || 30,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setAddingItem(false)
      setItemForm({ sermon_id: '', order_index: String(items.length), duration_minutes: '30' })
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add item')
    } finally { setSubmitting(false) }
  }

  async function deletePlaylist(id: string) {
    if (!confirm('Delete this playlist?')) return
    try {
      await axios.delete(`${API_BASE}/api/sermon-playlists/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (selectedPlaylistId === id) setSelectedPlaylistId(null)
      onRefresh()
    } catch {}
  }

  async function deleteItem(itemId: string) {
    if (!selectedPlaylistId) return
    if (!confirm('Remove this sermon from the playlist?')) return
    try {
      await axios.delete(`${API_BASE}/api/sermon-playlists/${selectedPlaylistId}/items/${itemId}`, { headers: { Authorization: `Bearer ${token}` } })
      onRefresh()
    } catch {}
  }

  async function toggleActive(pl: SermonPlaylist) {
    try {
      await axios.patch(`${API_BASE}/api/sermon-playlists/${pl.id}`, { is_active: !pl.is_active }, { headers: { Authorization: `Bearer ${token}` } })
      onRefresh()
    } catch {}
  }

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId)

  return (
    <div className="space-y-6">
      {/* Create playlist form */}
      {creating && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm"><Plus className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Create Playlist</h3>
            <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--dim)' }}><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={createPlaylist} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Playlist Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2" style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
            <div>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--dim)' }}><Calendar className="w-3 h-3 inline mr-1" />Start Time *</label>
              <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required
                className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
            </div>
            <div>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--dim)' }}><Calendar className="w-3 h-3 inline mr-1" />End Time (optional)</label>
              <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm" style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} className="btn-gold disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Playlist
              </button>
            </div>
          </form>
        </div>
      )}

      {!creating && (
        <button onClick={() => setCreating(true)} className="btn-gold text-sm"><Plus className="w-4 h-4" /> Create Playlist</button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Playlists list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--dim)' }}>Playlists ({playlists.length})</h3>
          {playlists.map(pl => (
            <button key={pl.id} onClick={() => setSelectedPlaylistId(pl.id)}
              className={`w-full text-left rounded-xl p-4 transition-all border ${selectedPlaylistId === pl.id ? 'border-[var(--gold)] bg-[rgba(232,106,46,0.06)]' : 'border-[rgba(240,190,100,0.06)] bg-[#230d02] hover:bg-[rgba(240,190,100,0.03)]'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{pl.title}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${pl.is_active ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#9a7c60]/10 text-[#9a7c60]'}`}>
                  {pl.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--dim)' }}>
                <Calendar className="w-3 h-3 inline mr-1" />{new Date(pl.start_time).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={(e) => { e.stopPropagation(); toggleActive(pl); }} className="text-[10px] px-2 py-1 rounded border transition-colors" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>
                  {pl.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }} className="text-red-400 hover:text-red-300 text-[10px] px-2 py-1 rounded border border-red-400/20">
                  <Trash2 className="w-3 h-3 inline" />
                </button>
              </div>
            </button>
          ))}
        </div>

        {/* Selected playlist items */}
        <div className="lg:col-span-2">
          {selectedPlaylist ? (
            <div className="rounded-2xl p-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm">{selectedPlaylist.title}</h3>
                  <p className="text-[10px]" style={{ color: 'var(--dim)' }}>{selectedPlaylist.description}</p>
                </div>
                <button onClick={() => setAddingItem(true)} className="btn-gold text-xs"><Plus className="w-3 h-3" /> Add Sermon</button>
              </div>

              {addingItem && (
                <form onSubmit={addItem} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 p-3 rounded-xl" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
                  <select value={itemForm.sermon_id} onChange={e => setItemForm({ ...itemForm, sermon_id: e.target.value })} required
                    className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', color: 'var(--parchment)' }}>
                    <option value="">Select sermon...</option>
                    {allSermons.map(s => <option key={s.id} value={s.id}>{s.title} — {s.speaker}</option>)}
                  </select>
                  <input type="number" placeholder="Order" value={itemForm.order_index} onChange={e => setItemForm({ ...itemForm, order_index: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
                  <input type="number" placeholder="Duration (min)" value={itemForm.duration_minutes} onChange={e => setItemForm({ ...itemForm, duration_minutes: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
                  <div className="sm:col-span-3 flex gap-2">
                    <button type="submit" disabled={submitting} className="btn-gold text-xs disabled:opacity-50">
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Add
                    </button>
                    <button type="button" onClick={() => setAddingItem(false)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>Cancel</button>
                  </div>
                </form>
              )}

              {items.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--dim)' }}>
                  <ListMusic className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No sermons in this playlist yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--gold)', color: '#1b1208' }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title || 'Unknown sermon'}</p>
                        <p className="text-[10px]" style={{ color: 'var(--dim)' }}>{item.speaker} | <Clock className="w-3 h-3 inline" /> {item.duration_minutes} min</p>
                      </div>
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full rounded-2xl p-8" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              <Headphones className="w-10 h-10 mb-3" style={{ color: 'var(--dim)' }} />
              <p className="text-sm" style={{ color: 'var(--dim)' }}>Select a playlist to manage its sermons.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
