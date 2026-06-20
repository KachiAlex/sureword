import { useState, useEffect } from 'react'
import axios from 'axios'
import { Headphones, Plus, X, Save, Trash2 } from 'lucide-react'

interface Podcast {
  id: string
  title: string
  speaker: string
  duration: string
  audio_url: string
  description: string
  date: string
}

export default function PodcastManager() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', speaker: '', duration: '', audio_url: '', description: '', date: '' })
  const token = localStorage.getItem('token')

  async function fetchPodcasts() {
    setLoading(true)
    try {
      const res = await axios.get('/api/podcasts')
      setPodcasts(res.data.podcasts || [])
    } catch (err) {
      console.error('Failed to fetch podcasts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPodcasts() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await axios.post('/api/podcasts', form, { headers: { Authorization: `Bearer ${token}` } })
      setShowForm(false)
      setForm({ title: '', speaker: '', duration: '', audio_url: '', description: '', date: '' })
      fetchPodcasts()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this podcast?')) return
    try {
      await axios.delete(`/api/podcasts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchPodcasts()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  if (loading) return <div className="p-12 text-center text-sm" style={{ color: 'var(--dim)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Podcasts</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-xs" style={{ background: 'var(--gold)', color: '#1b1208' }}>
          <Plus className="w-3.5 h-3.5" /> Add Podcast
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-dark text-sm" />
            <input placeholder="Speaker" value={form.speaker} onChange={e => setForm({ ...form, speaker: e.target.value })}
              className="input-dark text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Duration (e.g. 42:15)" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
              className="input-dark text-sm" />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="input-dark text-sm" />
          </div>
          <input placeholder="Audio URL" value={form.audio_url} onChange={e => setForm({ ...form, audio_url: e.target.value })}
            className="input-dark text-sm w-full" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="input-dark text-sm w-full h-20 resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="btn-gold text-xs"><Save className="w-3.5 h-3.5" /> Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-line text-xs"><X className="w-3.5 h-3.5" /> Cancel</button>
          </div>
        </form>
      )}

      {podcasts.length === 0 ? (
        <div className="p-12 text-center rounded-xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <Headphones className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--line)' }} />
          <p style={{ color: 'var(--dim)' }}>No podcasts yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {podcasts.map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{p.title}</p>
                <p className="text-xs" style={{ color: 'var(--dim)' }}>{p.speaker} · {p.duration}{p.date ? ` · ${p.date}` : ''}</p>
              </div>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
