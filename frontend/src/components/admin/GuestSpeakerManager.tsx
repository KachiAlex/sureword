import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Mic2, Plus, X, Save, Trash2 } from 'lucide-react'

interface GuestSpeaker {
  id: string
  name: string
  bio: string
  photo_url: string
  topic: string
  date: string
  is_active: boolean
}

export default function GuestSpeakerManager() {
  const [speakers, setSpeakers] = useState<GuestSpeaker[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', photo_url: '', topic: '', date: '', is_active: true })

  async function fetchSpeakers() {
    setLoading(true)
    try {
      const res = await api.get('/guest-speakers')
      setSpeakers(res.data.speakers || [])
    } catch (err) {
      console.error('Failed to fetch guest speakers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSpeakers() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/guest-speakers', form)
      setShowForm(false)
      setForm({ name: '', bio: '', photo_url: '', topic: '', date: '', is_active: true })
      fetchSpeakers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this speaker?')) return
    try {
      await api.delete(`/guest-speakers/${id}`)
      fetchSpeakers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  async function toggleActive(speaker: GuestSpeaker) {
    try {
      await api.patch(`/guest-speakers/${speaker.id}`, { is_active: !speaker.is_active })
      fetchSpeakers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update')
    }
  }

  if (loading) return <div className="p-12 text-center text-sm" style={{ color: 'var(--dim)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Guest Speakers</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-xs" style={{ background: 'var(--gold)', color: '#1b1208' }}>
          <Plus className="w-3.5 h-3.5" /> Add Speaker
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-dark text-sm" />
            <input placeholder="Topic" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
              className="input-dark text-sm" />
          </div>
          <input placeholder="Photo URL" value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })}
            className="input-dark text-sm w-full" />
          <textarea placeholder="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
            className="input-dark text-sm w-full h-20 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="input-dark text-sm" />
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--parchment)' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                className="rounded" /> Active
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold text-xs"><Save className="w-3.5 h-3.5" /> Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-line text-xs"><X className="w-3.5 h-3.5" /> Cancel</button>
          </div>
        </form>
      )}

      {speakers.length === 0 ? (
        <div className="p-12 text-center rounded-xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <Mic2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--line)' }} />
          <p style={{ color: 'var(--dim)' }}>No guest speakers yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {speakers.map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--gold)', color: '#1b1208' }}>
                  {s.name[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs" style={{ color: 'var(--dim)' }}>{s.topic}{s.date ? ` � ${s.date}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(s)} className="text-[11px] px-2 py-1 rounded-md border"
                  style={{ borderColor: 'var(--line)', color: s.is_active ? '#4ade80' : 'var(--dim)' }}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

