import { useEffect, useState } from 'react'
import axios from 'axios'
import { Play, Calendar, BookOpen, Upload, Headphones, User, Search, AlertCircle } from 'lucide-react'

interface Sermon {
  id: string
  title: string
  description?: string
  scripture_reference?: string
  speaker?: string
  series?: string
  audio_url: string
  date: string
  duration?: number
}

export default function Archive() {
  const [sermons, setSermons] = useState<Sermon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', scripture_reference: '', speaker: '', series: '', date: new Date().toISOString().split('T')[0] })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchSermons()
  }, [])

  async function fetchSermons() {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get('/api/sermons', { timeout: 8000 })
      setSermons(data.sermons || [])
    } catch (err: any) {
      console.error('Failed to fetch sermons:', err)
      setError(err.response?.data?.error || 'Failed to load sermons. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!audioFile || !form.title || !form.date) return
    setUploading(true)
    const data = new FormData()
    data.append('audio', audioFile)
    Object.entries(form).forEach(([k, v]) => data.append(k, v))
    try {
      await axios.post('/api/sermons', data, { timeout: 30000 })
      setUploadOpen(false)
      setForm({ title: '', description: '', scripture_reference: '', speaker: '', series: '', date: new Date().toISOString().split('T')[0] })
      setAudioFile(null)
      fetchSermons()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen py-8 lg:py-12" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--gold)' }}
          >
            <Headphones className="w-8 h-8" style={{ color: '#1b1208' }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Sermon Archive</h1>
          <p className="mt-2 max-w-xl mx-auto" style={{ color: 'var(--dim)' }}>
            Browse past messages, series, and biblical teachings from our collection.
          </p>
        </div>

        {/* Search & Upload */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--dim)' }} />
            <input
              type="text"
              placeholder="Search sermons..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
              style={{ background: 'var(--ink-2)', borderColor: 'var(--line)', color: 'var(--parchment)' }}
            />
          </div>
          <button
            onClick={() => setUploadOpen(!uploadOpen)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{ background: 'var(--gold)', color: '#1b1208' }}
          >
            <Upload className="w-4 h-4" />Upload
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3"
            style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
            <button onClick={fetchSermons} className="ml-auto underline" style={{ color: 'var(--gold)' }}>Retry</button>
          </div>
        )}

        {/* Upload Form */}
        {uploadOpen && (
          <form
            onSubmit={handleUpload}
            className="p-6 mb-8 rounded-2xl"
            style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}
          >
            <h3 className="text-lg font-semibold mb-4">Upload New Sermon</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="rounded-xl px-4 py-3 text-sm border" style={{ background: 'var(--ink)', borderColor: 'var(--line)', color: 'var(--parchment)' }} required />
              <input placeholder="Speaker" value={form.speaker} onChange={e => setForm({ ...form, speaker: e.target.value })} className="rounded-xl px-4 py-3 text-sm border" style={{ background: 'var(--ink)', borderColor: 'var(--line)', color: 'var(--parchment)' }} />
              <input placeholder="Series" value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} className="rounded-xl px-4 py-3 text-sm border" style={{ background: 'var(--ink)', borderColor: 'var(--line)', color: 'var(--parchment)' }} />
              <input placeholder="Scripture" value={form.scripture_reference} onChange={e => setForm({ ...form, scripture_reference: e.target.value })} className="rounded-xl px-4 py-3 text-sm border" style={{ background: 'var(--ink)', borderColor: 'var(--line)', color: 'var(--parchment)' }} />
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="rounded-xl px-4 py-3 text-sm border" style={{ background: 'var(--ink)', borderColor: 'var(--line)', color: 'var(--parchment)' }} required />
              <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="rounded-xl px-4 py-3 text-sm border" style={{ background: 'var(--ink)', borderColor: 'var(--line)', color: 'var(--parchment)' }} required />
            </div>
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-xl px-4 py-3 text-sm resize-none border mb-4" style={{ background: 'var(--ink)', borderColor: 'var(--line)', color: 'var(--parchment)' }} />
            <button type="submit" disabled={uploading} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--gold)', color: '#1b1208' }}>{uploading ? 'Uploading...' : 'Upload Sermon'}</button>
          </form>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--gold)' }} />
          </div>
        )}

        {/* Empty */}
        {!loading && sermons.length === 0 && !error && (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <Headphones className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--line)' }} />
            <h3 className="text-lg font-semibold mb-2">No sermons yet</h3>
            <p className="mb-4" style={{ color: 'var(--dim)' }}>The archive is empty.</p>
          </div>
        )}

        {/* Sermons List */}
        {!loading && sermons.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {sermons.map(s => (
              <div
                key={s.id}
                className="p-5 flex items-start gap-4 rounded-2xl transition-shadow"
                style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ink)' }}>
                  <Play className="w-6 h-6" style={{ color: 'var(--gold)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{s.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {s.speaker && <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--ink)', color: 'var(--dim)' }}><User className="w-3.5 h-3.5" />{s.speaker}</span>}
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--ink)', color: 'var(--dim)' }}><Calendar className="w-3.5 h-3.5" />{s.date}</span>
                    {s.scripture_reference && <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(201,162,39,0.08)', color: 'var(--gold-soft)' }}><BookOpen className="w-3.5 h-3.5" />{s.scripture_reference}</span>}
                    {s.duration && <span className="px-2 py-1 rounded-md" style={{ background: 'var(--ink)', color: 'var(--dim)' }}>{Math.floor(s.duration / 60)} min</span>}
                  </div>
                  {s.description && <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--dim)' }}>{s.description}</p>}
                </div>
                {s.audio_url && (
                  <a
                    href={s.audio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 no-underline transition-colors"
                    style={{ background: 'rgba(201,162,39,0.08)', color: 'var(--gold)' }}
                  >
                    <Play className="w-4 h-4" />Play
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
