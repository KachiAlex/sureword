import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE } from '../../lib/api'
import { Star, Trash2, CheckCircle, Clock, User } from 'lucide-react'

interface Testimony {
  id: string
  name: string
  email: string | null
  content: string
  is_anonymous: boolean
  status: string
  is_featured: boolean
  created_at: string
}

export default function TestimonyManager() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  async function fetchTestimonies() {
    setLoading(true)
    try {
      const res = await axios.get('${API_BASE}testimonies/admin/all', { headers: { Authorization: `Bearer ${token}` } })
      setTestimonies(res.data.testimonies || [])
    } catch (err) {
      console.error('Failed to fetch testimonies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTestimonies() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this testimony?')) return
    try {
      await axios.delete(`${API_BASE}/api/testimonies/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchTestimonies()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  async function handleStatus(id: string, status: string, is_featured: boolean) {
    try {
      await axios.patch(`${API_BASE}/api/testimonies/${id}`, { status, is_featured }, { headers: { Authorization: `Bearer ${token}` } })
      fetchTestimonies()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update')
    }
  }

  if (loading) return <div className="p-12 text-center text-sm" style={{ color: 'var(--dim)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Testimonies</h2>

      {testimonies.length === 0 ? (
        <div className="p-12 text-center rounded-xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <Star className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--line)' }} />
          <p style={{ color: 'var(--dim)' }}>No testimonies yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {testimonies.map(t => (
            <div key={t.id} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.name}{t.email && <span className="text-[11px] ml-1" style={{ color: 'var(--dim)' }}>({t.email})</span>}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--dim)' }}>{t.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--dim)' }}>
                    <span className="flex items-center gap-1">
                      {t.status === 'approved' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Clock className="w-3 h-3 text-yellow-400" />}
                      {t.status}
                    </span>
                    {t.is_anonymous && <span className="flex items-center gap-1 text-[#9c958a]"><User className="w-3 h-3" /> Anonymous</span>}
                    {t.is_featured && <span className="flex items-center gap-1 text-[#c9a227]"><Star className="w-3 h-3" /> Featured</span>}
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {t.status === 'pending' && (
                    <button onClick={() => handleStatus(t.id, 'approved', t.is_featured)} className="text-green-400 hover:text-green-300" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => handleStatus(t.id, t.status, !t.is_featured)} className={`hover:text-[#e0bd5a] ${t.is_featured ? 'text-[#c9a227]' : 'text-[#9c958a]'}`} title="Toggle Featured"><Star className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
