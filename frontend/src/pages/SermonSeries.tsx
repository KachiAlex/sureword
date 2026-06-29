import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import { BookOpen, Play, Calendar, User, Layers, Search } from 'lucide-react'

interface Sermon {
  id: string
  title: string
  speaker?: string
  series?: string
  date: string
  duration?: number
  thumbnail_url?: string
  audio_url?: string
  video_url?: string
}

interface SeriesGroup {
  name: string
  sermons: Sermon[]
}

export default function SermonSeries() {
  usePageTitle('Sermon Series')
  const [allSermons, setAllSermons] = useState<Sermon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api.get('/sermons').then(({ data }) => {
      setAllSermons(data.sermons || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const grouped: SeriesGroup[] = Object.entries(
    allSermons
      .filter(s => s.series)
      .reduce((acc: Record<string, Sermon[]>, s) => {
        const key = s.series!
        if (!acc[key]) acc[key] = []
        acc[key].push(s)
        return acc
      }, {})
  )
    .map(([name, sermons]) => ({ name, sermons: sermons.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const filtered = search.trim()
    ? grouped.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.sermons.some(s => s.title.toLowerCase().includes(search.toLowerCase()) || (s.speaker || '').toLowerCase().includes(search.toLowerCase())))
    : grouped

  const inp = { background: 'var(--coal)', border: '1px solid var(--line)', color: 'var(--cream)', borderRadius: 6 }

  return (
    <div style={{ background: 'var(--ember)', color: 'var(--cream)', minHeight: '100vh', paddingBottom: 120 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '72px 24px 0' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--flame3)', borderLeft: '3px solid var(--flame)', paddingLeft: 10, marginBottom: 10 }}>
            Sermon Series
          </div>
          <h1 className="font-bebas" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, margin: '0 0 6px' }}>
            Message Series
          </h1>
          <p style={{ color: 'var(--ash2)', fontSize: 14 }}>
            Browse all sermon series — themed collections of messages grouped for deeper study.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--ash)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search series or sermons…"
            style={{ ...inp, width: '100%', padding: '12px 14px 12px 42px', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6, padding: 20, animation: 'shimmer 1.6s infinite' }}>
                <div style={{ height: 16, background: 'var(--panel2)', borderRadius: 3, width: '40%', marginBottom: 8 }} />
                <div style={{ height: 11, background: 'var(--panel2)', borderRadius: 3, width: '20%' }} />
              </div>
            ))}
          </div>
        )}

        {/* No series */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6 }}>
            <Layers style={{ width: 40, height: 40, margin: '0 auto 12px', color: 'var(--line)' }} />
            <p style={{ fontWeight: 600, marginBottom: 6 }}>{search ? `No results for "${search}"` : 'No sermon series yet'}</p>
            <p style={{ color: 'var(--ash)', fontSize: 13 }}>
              {search ? 'Try a different keyword.' : 'Sermons with a series name will be grouped here.'}
            </p>
          </div>
        )}

        {/* Series list */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--ash)', marginBottom: 4 }}>
              {filtered.length} series · {filtered.reduce((t, g) => t + g.sermons.length, 0)} sermons
            </p>
            {filtered.map(group => {
              const isOpen = expanded === group.name
              const latest = group.sermons[group.sermons.length - 1]
              return (
                <div key={group.name} style={{ background: 'var(--coal)', border: `1px solid ${isOpen ? 'var(--flame)' : 'var(--line)'}`, borderRadius: 6, overflow: 'hidden', transition: 'border-color .2s' }}>
                  {/* Series header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : group.name)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    {/* Cover thumbnail */}
                    <div style={{ width: 52, height: 52, borderRadius: 4, flexShrink: 0, overflow: 'hidden', background: 'rgba(224,90,26,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {latest?.thumbnail_url
                        ? <img src={latest.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <BookOpen style={{ width: 22, height: 22, color: 'var(--flame3)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--white)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--ash)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Layers style={{ width: 11, height: 11 }} />{group.sermons.length} message{group.sermons.length !== 1 ? 's' : ''}</span>
                        {latest?.speaker && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User style={{ width: 11, height: 11 }} />{latest.speaker}</span>}
                        {latest?.date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar style={{ width: 11, height: 11 }} />{new Date(latest.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--ash)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Expanded sermons */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--line)' }}>
                      {group.sermons.map((s, i) => (
                        <Link key={s.id} to={`/sermons/${s.id}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', textDecoration: 'none', borderBottom: i < group.sermons.length - 1 ? '1px solid var(--line)' : 'none', transition: 'background .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--mahog)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ width: 22, textAlign: 'center', fontSize: 12, color: 'var(--ash)', flexShrink: 0 }}>{i + 1}</span>
                          <div style={{ width: 38, height: 38, borderRadius: 3, flexShrink: 0, overflow: 'hidden', background: 'rgba(224,90,26,.08)' }}>
                            {s.thumbnail_url
                              ? <img src={s.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <BookOpen style={{ width: 16, height: 16, color: 'var(--flame3)', margin: '11px' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{s.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--ash)' }}>
                              {s.speaker && `${s.speaker} · `}{new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {s.duration ? ` · ${Math.round(s.duration / 60)} min` : ''}
                            </p>
                          </div>
                          {(s.audio_url || s.video_url) && (
                            <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--flame)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Play style={{ width: 12, height: 12, color: '#fff', marginLeft: 1 }} />
                            </div>
                          )}
                        </Link>
                      ))}
                      <div style={{ padding: '10px 20px' }}>
                        <Link to={`/archive`} style={{ fontSize: 11, color: 'var(--flame3)', textDecoration: 'none' }}>
                          View all sermons in archive →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
