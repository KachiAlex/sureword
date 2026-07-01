import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE } from '../lib/api'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import {
  Calendar, MapPin, Clock, ArrowLeft, AlertCircle,
  Users, UserPlus, CheckCircle, Image
} from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  image_url: string
  is_active: boolean
  category?: string
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rsvpForm, setRsvpForm] = useState({ name: '', email: '', phone: '', guests: '0' })
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState(0)

  usePageTitle(event?.title || 'Event')

  useEffect(() => { if (id) { fetchEvent(); fetchAttendees() } }, [id])

  async function fetchEvent() {
    setLoading(true); setError('')
    try {
      const { data } = await axios.get(`${API_BASE}/api/events/${id}`, { timeout: 8000 })
      setEvent(data.event)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load event.')
    } finally { setLoading(false) }
  }

  async function fetchAttendees() {
    try {
      const { data } = await axios.get(`${API_BASE}/api/events/${id}/rsvps`, { timeout: 8000 })
      setAttendeeCount(data.total || 0)
    } catch {
      setAttendeeCount(0)
    }
  }

  async function handleRsvp(e: React.FormEvent) {
    e.preventDefault()
    if (!rsvpForm.name.trim() || !rsvpForm.email.trim()) return
    setRsvpLoading(true)
    try {
      await axios.post(`${API_BASE}/api/events/${id}/rsvp`, {
        name: rsvpForm.name.trim(),
        email: rsvpForm.email.trim(),
        phone: rsvpForm.phone.trim(),
        guests: parseInt(rsvpForm.guests || '0', 10)
      })
      setRsvpSubmitted(true)
      fetchAttendees()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit RSVP.', 'error')
    } finally { setRsvpLoading(false) }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  function isPastEvent(dateStr: string) {
    if (!dateStr) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const eventDate = new Date(dateStr)
    eventDate.setHours(0, 0, 0, 0)
    return eventDate < today
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)' }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--gold)' }} />
    </div>
  )

  if (error || !event) return (
    <div className="min-h-screen py-8 lg:py-12" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="p-4 rounded-xl text-sm flex items-center gap-3" style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle className="w-5 h-5 shrink-0" />{error || 'Event not found'}
        </div>
        <button onClick={() => navigate('/events')} className="mt-4 text-sm underline" style={{ color: 'var(--gold)' }}>
          <ArrowLeft className="w-4 h-4 inline mr-1" />Back to Events
        </button>
      </div>
    </div>
  )

  const past = isPastEvent(event.date)

  return (
    <div className="min-h-screen py-8 lg:py-12" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <button onClick={() => navigate('/events')} className="text-sm mb-6 flex items-center gap-1.5 transition-colors hover:text-[#F5A623]" style={{ color: 'var(--gold)' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="aspect-[21/9] relative overflow-hidden" style={{ background: 'var(--ink)' }}>
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-12 h-12" style={{ color: 'var(--line)' }} />
              </div>
            )}
            {past && (
              <div className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--ink)', color: 'var(--dim)', border: '1px solid var(--line)' }}>
                Past Event
              </div>
            )}
            {event.category && !past && (
              <div className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--gold)', color: '#1b1208' }}>
                {event.category}
              </div>
            )}
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{event.title}</h1>
            <div className="flex flex-wrap gap-3 mb-4 text-xs" style={{ color: 'var(--dim)' }}>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(event.date)}</span>
              {event.time && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{event.time}</span>}
              {event.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{attendeeCount} attending</span>
            </div>
            {event.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--dim)' }}>{event.description}</p>
            )}
          </div>
        </div>

        {/* RSVP */}
        {!past && (
          <div className="p-6 rounded-2xl mb-8" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              <UserPlus className="w-5 h-5" style={{ color: 'var(--gold)' }} /> RSVP
            </h2>
            {rsvpSubmitted ? (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">Thank you! Your RSVP has been received.</p>
              </div>
            ) : (
              <form onSubmit={handleRsvp} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required placeholder="Your name" value={rsvpForm.name} onChange={e => setRsvpForm({ ...rsvpForm, name: e.target.value })}
                  className="input-dark text-sm w-full" />
                <input required type="email" placeholder="Email address" value={rsvpForm.email} onChange={e => setRsvpForm({ ...rsvpForm, email: e.target.value })}
                  className="input-dark text-sm w-full" />
                <input placeholder="Phone (optional)" value={rsvpForm.phone} onChange={e => setRsvpForm({ ...rsvpForm, phone: e.target.value })}
                  className="input-dark text-sm w-full" />
                <input type="number" min={0} max={10} placeholder="Additional guests" value={rsvpForm.guests} onChange={e => setRsvpForm({ ...rsvpForm, guests: e.target.value })}
                  className="input-dark text-sm w-full" />
                <div className="sm:col-span-2">
                  <button type="submit" disabled={rsvpLoading} className="btn-gold text-sm px-6 py-2.5" style={{ background: 'var(--gold)', color: '#1b1208' }}>
                    {rsvpLoading ? 'Submitting...' : 'Confirm Attendance'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

