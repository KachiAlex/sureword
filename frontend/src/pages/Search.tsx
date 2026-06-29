import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import { Search as SearchIcon, BookOpen, Calendar, Music, Mic2, Loader2, X } from 'lucide-react'

interface SearchResults {
  sermons: any[]
  events: any[]
  music: any[]
  speakers: any[]
}

const empty: SearchResults = { sermons: [], events: [], music: [], speakers: [] }

function ResultSection({ icon: Icon, title, count, children }: { icon: any; title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
        <Icon style={{ width: 16, height: 16, color: 'var(--flame3)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ash2)' }}>{title}</span>
        <span style={{ fontSize: 11, color: 'var(--ash)', background: 'rgba(224,90,26,.1)', border: '1px solid rgba(224,90,26,.2)', borderRadius: 10, padding: '1px 7px' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState<SearchResults>(empty)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  usePageTitle(query ? `Search: ${query}` : 'Search')

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!initialQ) return
    doSearch(initialQ)
  }, [])

  function doSearch(q: string) {
    if (!q.trim()) { setResults(empty); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    setSearchParams({ q })
    api.get(`/search?q=${encodeURIComponent(q.trim())}`)
      .then(({ data }) => setResults(data))
      .catch(() => setResults(empty))
      .finally(() => setLoading(false))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(v), 400)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    doSearch(query)
  }

  const totalResults = results.sermons.length + results.events.length + results.music.length + results.speakers.length
  const inp = { background: 'var(--coal)', border: '1px solid var(--line)', color: 'var(--cream)', borderRadius: 6 }

  return (
    <div style={{ background: 'var(--ember)', color: 'var(--cream)', minHeight: '100vh', paddingBottom: 120 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '72px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--flame3)', borderLeft: '3px solid var(--flame)', paddingLeft: 10, marginBottom: 10 }}>
            Search
          </div>
          <h1 className="font-bebas" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, margin: '0 0 6px' }}>Find anything</h1>
          <p style={{ color: 'var(--ash2)', fontSize: 14 }}>Search across sermons, events, music and guest speakers.</p>
        </div>

        {/* Search box */}
        <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: 40 }}>
          <SearchIcon style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--ash)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search sermons, speakers, topics…"
            style={{ ...inp, width: '100%', padding: '14px 44px 14px 48px', fontSize: 15, boxSizing: 'border-box' }}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults(empty); setSearched(false); setSearchParams({}); inputRef.current?.focus() }}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
        </form>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <Loader2 style={{ width: 28, height: 28, color: 'var(--flame)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* No results */}
        {!loading && searched && totalResults === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6 }}>
            <SearchIcon style={{ width: 40, height: 40, margin: '0 auto 12px', color: 'var(--line)' }} />
            <p style={{ fontWeight: 600, marginBottom: 6 }}>No results for &ldquo;{query}&rdquo;</p>
            <p style={{ color: 'var(--ash)', fontSize: 13 }}>Try different keywords or check your spelling.</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !searched && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--ash)' }}>
            <SearchIcon style={{ width: 40, height: 40, margin: '0 auto 12px', color: 'var(--line)' }} />
            <p style={{ fontSize: 14 }}>Start typing to search the ministry library.</p>
          </div>
        )}

        {/* Results */}
        {!loading && totalResults > 0 && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--ash)', marginBottom: 24 }}>{totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;</p>

            {/* Sermons */}
            <ResultSection icon={BookOpen} title="Sermons" count={results.sermons.length}>
              {results.sermons.map((s: any) => (
                <Link key={s.id} to={`/sermons/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6, textDecoration: 'none', transition: 'border-color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--flame)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(224,90,26,.1)', flexShrink: 0, overflow: 'hidden' }}>
                    {s.thumbnail_url
                      ? <img src={s.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <BookOpen style={{ width: 20, height: 20, color: 'var(--flame3)', margin: '10px' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--ash)' }}>{s.speaker}{s.scripture_reference ? ` · ${s.scripture_reference}` : ''}</p>
                  </div>
                </Link>
              ))}
            </ResultSection>

            {/* Events */}
            <ResultSection icon={Calendar} title="Events" count={results.events.length}>
              {results.events.map((e: any) => (
                <Link key={e.id} to={`/events/${e.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6, textDecoration: 'none', transition: 'border-color .15s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.borderColor = 'var(--flame)')}
                  onMouseLeave={ev => (ev.currentTarget.style.borderColor = 'var(--line)')}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(74,158,255,.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar style={{ width: 18, height: 18, color: '#4a9eff' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--ash)' }}>{e.date ? new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p>
                  </div>
                </Link>
              ))}
            </ResultSection>

            {/* Music */}
            <ResultSection icon={Music} title="Music" count={results.music.length}>
              {results.music.map((m: any) => (
                <Link key={m.id} to="/music" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6, textDecoration: 'none', transition: 'border-color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--flame)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(139,124,248,.1)', flexShrink: 0, overflow: 'hidden' }}>
                    {m.cover_url
                      ? <img src={m.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Music style={{ width: 18, height: 18, color: '#8b7cf8', margin: '11px' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--ash)' }}>{m.artist}{m.album ? ` · ${m.album}` : ''}</p>
                  </div>
                </Link>
              ))}
            </ResultSection>

            {/* Speakers */}
            <ResultSection icon={Mic2} title="Guest Speakers" count={results.speakers.length}>
              {results.speakers.map((sp: any) => (
                <Link key={sp.id} to="/events" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6, textDecoration: 'none', transition: 'border-color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--flame)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0, overflow: 'hidden', background: 'rgba(62,207,110,.1)' }}>
                    {sp.photo_url
                      ? <img src={sp.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Mic2 style={{ width: 18, height: 18, color: '#3ecf6e', margin: '11px' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)', marginBottom: 2 }}>{sp.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--ash)' }}>{sp.topic}</p>
                  </div>
                </Link>
              ))}
            </ResultSection>
          </div>
        )}
      </div>
    </div>
  )
}
