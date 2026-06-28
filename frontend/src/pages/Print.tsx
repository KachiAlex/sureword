import { useState } from 'react'
import { usePrintMedia } from '../lib/api'
import { usePageTitle } from '../hooks/usePageTitle'
import { FileText, Download, Search, AlertCircle, Loader2 } from 'lucide-react'

const gradMap: Record<string, string> = {
  tract: 'linear-gradient(145deg,#2f1206,#e05a1a)',
  booklet: 'linear-gradient(145deg,#1a0900,#f5a623)',
  poster: 'linear-gradient(145deg,#230d02,#c94c10)',
  'study-guide': 'linear-gradient(145deg,#3b1709,#e8cfa0)',
  magazine: 'linear-gradient(145deg,#230d02,#f5a623)',
  devotional: 'linear-gradient(145deg,#1a0900,#c94c10)',
}
const iconMap: Record<string, string> = {
  tract: '📰', booklet: '📖', poster: '📋', 'study-guide': '🎓', magazine: '📰', devotional: '✝️',
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
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Resources</div>
          <h1 className="font-bebas" style={{ fontSize: 'clamp(28px,3.5vw,38px)', margin: '8px 0 6px' }}>Print Media</h1>
          <p style={{ color: 'var(--ash)', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
            Church bulletins, devotional magazines, and study guides — free to download anytime.
          </p>
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 32, maxWidth: 700, margin: '0 auto 32px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--ash)' }} />
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search print media..."
              className="input-dark"
              style={{ width: '100%', paddingLeft: 34, borderRadius: 4 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className="btn btn-sm"
                style={{
                  background: categoryFilter === cat ? 'var(--flame)' : 'transparent',
                  color: categoryFilter === cat ? '#fff' : 'var(--cream2)',
                  border: '1px solid var(--line)', borderRadius: 4, fontSize: 12
                }}>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg text-sm flex items-center gap-3" style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
            Failed to load print media.
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
            <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: 'var(--flame)' }} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 8 }}>
            <FileText style={{ width: 64, height: 64, margin: '0 auto 16px', color: 'var(--line)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--white)' }}>{searchQ || categoryFilter !== 'all' ? 'No matching items' : 'No print media yet'}</h3>
            <p style={{ color: 'var(--ash)' }}>{searchQ || categoryFilter !== 'all' ? 'Try adjusting your filters.' : 'Check back soon for tracts and resources.'}</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 18 }}>
            {filtered.map((item) => {
              const grad = gradMap[item.category] || gradMap['tract']
              const icon = iconMap[item.category] || '📄'
              return (
                <div key={item.id} style={{
                  background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6,
                  overflow: 'hidden', transition: 'border-color .2s, transform .2s', cursor: 'pointer'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sunrise)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div style={{
                    height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', background: grad
                  }}>
                    <span style={{ fontSize: 44, opacity: .7 }}>{icon}</span>
                    <span style={{
                      position: 'absolute', top: 8, right: 8, background: 'var(--flame)', color: '#fff',
                      fontSize: 9, fontWeight: 700, letterSpacing: '.08em', padding: '3px 7px', borderRadius: 2
                    }}>{item.category}</span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2, color: 'var(--white)' }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ash)' }}>{item.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-out btn-sm">
                        <Download style={{ width: 14, height: 14 }} /> Download
                      </a>
                      <span style={{ fontSize: 11, color: 'var(--ash)' }}>PDF</span>
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
