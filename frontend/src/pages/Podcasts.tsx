import { useEffect, useState } from 'react'
import axios from 'axios'
import { usePageTitle } from '../hooks/usePageTitle'
import { Headphones, Play, Calendar, User, Search, AlertCircle } from 'lucide-react'

interface Podcast {
  id: string
  title: string
  speaker: string
  duration: string
  audio_url: string
  description: string
  date: string
}

export default function Podcasts() {
  usePageTitle('Podcasts')
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => { fetchPodcasts() }, [])

  async function fetchPodcasts() {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get('/api/podcasts', { timeout: 8000 })
      setPodcasts(data.podcasts || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load podcasts.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = podcasts.filter(p =>
    !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase()) || p.speaker?.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className="min-h-screen py-8 lg:py-12" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--gold)' }}>
            <Headphones className="w-8 h-8" style={{ color: '#1b1208' }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Podcasts</h1>
          <p className="mt-2 max-w-xl mx-auto" style={{ color: 'var(--dim)' }}>
            Listen to powerful messages, teachings, and conversations on the go.
          </p>
        </div>

        <div className="relative max-w-md mb-8">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--dim)' }} />
          <input type="text" placeholder="Search podcasts..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
            style={{ background: 'var(--ink-2)', borderColor: 'var(--line)', color: 'var(--parchment)' }}
          />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3" style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertCircle className="w-5 h-5 shrink-0" />{error}
            <button onClick={fetchPodcasts} className="ml-auto underline" style={{ color: 'var(--gold)' }}>Retry</button>
          </div>
        )}

        {loading && <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--gold)' }} /></div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <Headphones className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--line)' }} />
            <h3 className="text-lg font-semibold mb-2">{searchQ ? 'No matching podcasts' : 'No podcasts yet'}</h3>
            <p style={{ color: 'var(--dim)' }}>{searchQ ? 'Try a different search term.' : 'Check back soon for new episodes.'}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="p-5 flex items-start gap-4 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ink)' }}>
                  <Play className="w-6 h-6" style={{ color: 'var(--gold)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{p.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {p.speaker && <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--ink)', color: 'var(--dim)' }}><User className="w-3.5 h-3.5" />{p.speaker}</span>}
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--ink)', color: 'var(--dim)' }}><Calendar className="w-3.5 h-3.5" />{p.date}</span>
                    {p.duration && <span className="px-2 py-1 rounded-md" style={{ background: 'var(--ink)', color: 'var(--dim)' }}>{p.duration}</span>}
                  </div>
                  {p.description && <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--dim)' }}>{p.description}</p>}
                </div>
                {p.audio_url && (
                  <a href={p.audio_url} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 no-underline transition-colors"
                    style={{ background: 'rgba(201,162,39,0.08)', color: 'var(--gold)' }}>
                    <Headphones className="w-4 h-4" />Listen
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
