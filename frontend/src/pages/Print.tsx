import { useState } from 'react'
import { usePrintMedia } from '../lib/api'
import { usePageTitle } from '../hooks/usePageTitle'
import { FileText, Download, Search, AlertCircle, Loader2 } from 'lucide-react'

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  bulletin:      { bg: 'rgba(224,90,26,.12)',  color: 'var(--flame3)' },
  tract:         { bg: 'rgba(245,166,35,.1)',  color: 'var(--sun2)' },
  booklet:       { bg: 'rgba(74,158,255,.1)',  color: '#4a9eff' },
  poster:        { bg: 'rgba(139,124,248,.12)', color: '#8b7cf8' },
  'study-guide': { bg: 'rgba(62,207,110,.1)',  color: '#3ecf6e' },
  magazine:      { bg: 'rgba(224,90,26,.12)',  color: 'var(--flame3)' },
  devotional:    { bg: 'rgba(245,166,35,.1)',  color: 'var(--sun2)' },
}

function Thumbnail({ item }: { item: { thumbnail_url?: string; title: string; category: string } }) {
  const col = CAT_COLORS[item.category] || CAT_COLORS['bulletin']
  if (item.thumbnail_url) {
    return (
      <div style={{ height: 170, overflow: 'hidden', position: 'relative' }}>
        <img src={item.thumbnail_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,3,0,.6) 0%, transparent 50%)' }} />
      </div>
    )
  }
  return (
    <div style={{
      height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--panel2)', borderBottom: '1px solid var(--line)', position: 'relative'
    }}>
      <div style={{
        width: 64, height: 80, borderRadius: 3,
        background: col.bg, border: `1px solid ${col.color}33`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6
      }}>
        <FileText style={{ width: 24, height: 24, color: col.color }} />
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: col.color }}>PDF</span>
      </div>
    </div>
  )
}

export default function Print() {
  usePageTitle('Print Media')
  const { data: items = [], isLoading, error } = usePrintMedia()
  const [searchQ, setSearchQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))]

  const filtered = items.filter(item => {
    const matchesSearch = !searchQ ||
      item.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQ.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div style={{ background: 'var(--ember)', color: 'var(--cream)', minHeight: '100vh', paddingBottom: 120 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--flame3)', borderLeft: '3px solid var(--flame)', paddingLeft: 10 }}>
            Print Media
          </div>
          <h1 className="font-bebas" style={{ fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.05, letterSpacing: '.02em', margin: '0 0 10px' }}>
            READ &amp; DOWNLOAD
          </h1>
          <p style={{ color: 'var(--ash2)', fontSize: 15, maxWidth: 520 }}>
            Bulletins, devotional magazines, and study guides — free to download anytime.
          </p>
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--ash)' }} />
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search…" className="input-dark"
              style={{ width: '100%', paddingLeft: 32, borderRadius: 4, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '5px 13px', fontSize: 12, fontWeight: 600, borderRadius: 3, cursor: 'pointer',
                  border: '1px solid', transition: 'all .15s',
                  background: categoryFilter === cat ? 'var(--flame)' : 'transparent',
                  borderColor: categoryFilter === cat ? 'var(--flame)' : 'var(--line)',
                  color: categoryFilter === cat ? '#fff' : 'var(--ash2)',
                }}>
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 24, background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 6, color: '#fca5a5', fontSize: 13 }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            Failed to load resources. Please try again later.
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Loader2 style={{ width: 28, height: 28, color: 'var(--flame)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '72px 24px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6 }}>
            <FileText style={{ width: 48, height: 48, margin: '0 auto 14px', color: 'var(--line)' }} />
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
              {searchQ || categoryFilter !== 'all' ? 'No matching items' : 'No resources yet'}
            </p>
            <p style={{ color: 'var(--ash)', fontSize: 13 }}>
              {searchQ || categoryFilter !== 'all' ? 'Try a different search or category.' : 'Check back soon for bulletins and study materials.'}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 20 }}>
            {filtered.map(item => {
              const col = CAT_COLORS[item.category] || CAT_COLORS['bulletin']
              const dateStr = item.published_date
                ? new Date(item.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null
              return (
                <div key={item.id} style={{
                  background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6,
                  overflow: 'hidden', transition: 'border-color .2s, transform .18s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--flame)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <Thumbnail item={item} />
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--white)', lineHeight: 1.3 }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ash)', marginBottom: 12, lineHeight: 1.4, minHeight: 16 }}>
                      {dateStr && <span>{dateStr}</span>}
                      {dateStr && item.page_count && <span> · </span>}
                      {item.page_count && <span>{item.page_count} pages</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <a href={item.pdf_url} download target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 3, fontSize: 12, fontWeight: 700,
                          background: col.bg, border: `1px solid ${col.color}44`, color: col.color,
                          textDecoration: 'none', transition: 'background .15s'
                        }}>
                        <Download style={{ width: 13, height: 13 }} />
                        Download
                      </a>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--ash)', textTransform: 'uppercase' }}>PDF</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
