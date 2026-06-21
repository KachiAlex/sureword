import { useState, useEffect } from 'react'
import axios from 'axios'
import { Heart, Trash2, CheckCircle2 } from 'lucide-react'

interface Prayer {
  id: string
  name: string | null
  request: string
  is_anonymous: boolean
  prayers_count: number
  is_answered: boolean
  created_at: string
}

export default function PrayerManager() {
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  async function fetchPrayers() {
    setLoading(true)
    try {
      const res = await axios.get('/api/prayer/admin/all', { headers: { Authorization: `Bearer ${token}` } })
      setPrayers(res.data.prayers || [])
    } catch (err) {
      console.error('Failed to fetch prayers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPrayers() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this prayer request?')) return
    try {
      await axios.delete(`/api/prayer/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchPrayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  if (loading) return <div className="p-12 text-center text-sm" style={{ color: 'var(--dim)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Prayer Requests</h2>

      {prayers.length === 0 ? (
        <div className="p-12 text-center rounded-xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <Heart className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--line)' }} />
          <p style={{ color: 'var(--dim)' }}>No prayer requests yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {prayers.map(p => (
            <div key={p.id} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.is_anonymous ? 'Anonymous' : (p.name || 'Anonymous')}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--dim)' }}>{p.request}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--dim)' }}>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {p.prayers_count} prayers</span>
                    {p.is_answered && <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" /> Answered</span>}
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 ml-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
