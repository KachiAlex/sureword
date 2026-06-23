import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE } from '../lib/api'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from '../contexts/AuthContext'
import { Send, AlertCircle, Clock, Star } from 'lucide-react'

interface Testimony {
  id: string
  name: string
  content: string
  status: string
  is_featured: boolean
  created_at: string
}

export default function Testimonies() {
  usePageTitle('Testimonies')
  const { user } = useAuth()
  const [testimonies, setTestimonies] = useState<Testimony[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState('')

  useEffect(() => { fetchTestimonies() }, [])

  async function fetchTestimonies() {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get('${API_BASE}testimonies', { timeout: 8000 })
      setTestimonies(data.testimonies || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load testimonies.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')
    if (!name.trim() || !content.trim()) {
      setValidationError('Name and testimony content are required.')
      return
    }
    if (content.trim().length < 20) {
      setValidationError('Testimony must be at least 20 characters.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('${API_BASE}testimonies', { name: name.trim(), email: email.trim() || null, content: content.trim(), is_anonymous: isAnonymous })
      setContent('')
      setIsAnonymous(false)
      fetchTestimonies()
    } catch (err: any) {
      setValidationError(err.response?.data?.error || 'Failed to submit testimony.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-8 lg:py-12" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--gold)' }}>
            <Star className="w-8 h-8" style={{ color: '#1b1208' }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Testimonies</h1>
          <p className="mt-2 max-w-xl mx-auto" style={{ color: 'var(--dim)' }}>
            Share what God has done in your life and read inspiring stories from the community.
          </p>
        </div>

        {/* Submit form */}
        <form onSubmit={handleSubmit} className="mb-10 p-6 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <h3 className="font-semibold mb-4">Share Your Testimony</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
              className="input-dark text-sm w-full" required disabled={isAnonymous} />
            <input placeholder="Your email (optional)" value={email} onChange={e => setEmail(e.target.value)}
              className="input-dark text-sm w-full" />
          </div>
          <label className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--parchment)' }}>
            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded" />
            Submit anonymously
          </label>
          <textarea placeholder="Write your testimony... Share what God has done in your life."
            value={content} onChange={e => setContent(e.target.value)}
            required className="input-dark text-sm w-full h-28 resize-none mb-3" />
          {validationError && (
            <p className="text-xs mb-3" style={{ color: '#fca5a5' }}>{validationError}</p>
          )}
          <button type="submit" disabled={submitting} className="btn-gold text-sm">
            <Send className="w-4 h-4" />{submitting ? 'Submitting...' : 'Share Testimony'}
          </button>
          <p className="text-[11px] mt-2" style={{ color: 'var(--dim)' }}>
            <Clock className="w-3 h-3 inline mr-1" />Testimonies are reviewed before being published.
          </p>
        </form>

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3" style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertCircle className="w-5 h-5 shrink-0" />{error}
            <button onClick={fetchTestimonies} className="ml-auto underline" style={{ color: 'var(--gold)' }}>Retry</button>
          </div>
        )}

        {loading && <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--gold)' }} /></div>}

        {!loading && testimonies.length === 0 && (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <Star className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--line)' }} />
            <h3 className="text-lg font-semibold mb-2">No testimonies yet</h3>
            <p style={{ color: 'var(--dim)' }}>Be the first to share what God has done in your life.</p>
          </div>
        )}

        {!loading && testimonies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonies.map(t => (
              <div key={t.id} className="p-5 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--gold)', color: '#1b1208' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--dim)' }}>{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  {t.is_featured && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--gold)', color: '#1b1208' }}>
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--parchment)' }}>{t.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
