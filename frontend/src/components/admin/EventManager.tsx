import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calendar, Plus, X, Save, Trash2 } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  image_url: string
  is_active: boolean
}

export default function EventManager() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '', location: '', image_url: '', is_active: true })
  const token = localStorage.getItem('token')

  async function fetchEvents() {
    setLoading(true)
    try {
      const res = await axios.get('/api/events')
      setEvents(res.data.events || [])
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await axios.post('/api/events', form, { headers: { Authorization: `Bearer ${token}` } })
      setShowForm(false)
      setForm({ title: '', description: '', date: '', time: '', location: '', image_url: '', is_active: true })
      fetchEvents()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return
    try {
      await axios.delete(`/api/events/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchEvents()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  async function toggleActive(evt: Event) {
    try {
      await axios.patch(`/api/events/${evt.id}`, { is_active: !evt.is_active }, { headers: { Authorization: `Bearer ${token}` } })
      fetchEvents()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update')
    }
  }

  if (loading) return <div className="p-12 text-center text-sm" style={{ color: 'var(--dim)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Events</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-xs" style={{ background: 'var(--gold)', color: '#1b1208' }}>
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <input required placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="input-dark text-sm w-full" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="input-dark text-sm w-full h-20 resize-none" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="input-dark text-sm" />
            <input placeholder="Time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
              className="input-dark text-sm" />
            <input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
              className="input-dark text-sm" />
          </div>
          <input placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
            className="input-dark text-sm w-full" />
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--parchment)' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="rounded" /> Active
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold text-xs"><Save className="w-3.5 h-3.5" /> Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-line text-xs"><X className="w-3.5 h-3.5" /> Cancel</button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <div className="p-12 text-center rounded-xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--line)' }} />
          <p style={{ color: 'var(--dim)' }}>No events yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {events.map(evt => (
            <div key={evt.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{evt.title}</p>
                <p className="text-xs" style={{ color: 'var(--dim)' }}>{evt.date}{evt.time ? ` · ${evt.time}` : ''}{evt.location ? ` · ${evt.location}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(evt)} className="text-[11px] px-2 py-1 rounded-md border"
                  style={{ borderColor: 'var(--line)', color: evt.is_active ? '#4ade80' : 'var(--dim)' }}>
                  {evt.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(evt.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
