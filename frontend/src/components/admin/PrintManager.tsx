import { useState, useRef } from 'react'
import axios from 'axios'
import { API_BASE } from '../../lib/api'
import { Plus, FileText, Trash2, Pencil, Loader2, Upload, X, Tag } from 'lucide-react'

interface PrintMediaItem {
  id: string
  title: string
  description: string
  category: string
  pdf_url: string
  thumbnail_url?: string
  is_active: boolean
}

export default function PrintManager({ items, onRefresh }: { items: PrintMediaItem[]; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'tract' })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const token = localStorage.getItem('token')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { alert('Title is required'); return }
    if (!pdfFile && !editingId) { alert('PDF file is required'); return }

    setSubmitting(true)
    try {
      if (pdfFile) {
        const fd = new FormData()
        fd.append('pdf', pdfFile)
        fd.append('title', form.title)
        fd.append('description', form.description)
        fd.append('category', form.category)
        await axios.post(`${API_BASE}/api/print-media`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        })
      }

      if (editingId && !pdfFile) {
        await axios.patch(`${API_BASE}/api/print-media/${editingId}`, {
          title: form.title,
          description: form.description,
          category: form.category,
        }, { headers: { Authorization: `Bearer ${token}` } })
      }

      setAdding(false)
      setEditingId(null)
      setForm({ title: '', description: '', category: 'tract' })
      setPdfFile(null)
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save print media')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(item: PrintMediaItem) {
    try {
      await axios.patch(`${API_BASE}/api/print-media/${item.id}`, { is_active: !item.is_active }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onRefresh()
    } catch {}
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return
    try {
      await axios.delete(`${API_BASE}/api/print-media/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      onRefresh()
    } catch {}
  }

  function startEdit(item: PrintMediaItem) {
    setEditingId(item.id)
    setForm({ title: item.title, description: item.description, category: item.category })
    setPdfFile(null)
    setAdding(true)
  }

  function reset() {
    setAdding(false)
    setEditingId(null)
    setForm({ title: '', description: '', category: 'tract' })
    setPdfFile(null)
  }

  return (
    <div className="space-y-6">
      {/* Add / Edit form */}
      {adding && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Pencil className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              {editingId ? 'Edit Print Media' : 'Add Print Media'}
            </h3>
            <button onClick={reset} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--dim)' }}><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl px-4 py-2.5 text-sm"
              style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}>
              <option value="tract">Tract</option>
              <option value="booklet">Booklet</option>
              <option value="poster">Poster</option>
              <option value="study-guide">Study Guide</option>
            </select>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--dim)' }}>
                <Upload className="w-3 h-3" /> {editingId ? 'PDF (leave empty to keep current)' : 'PDF *'}
              </label>
              <input ref={fileRef} type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl px-4 py-2 text-sm"
                style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
              {pdfFile && <p className="text-[10px] mt-1" style={{ color: 'var(--dim)' }}>{pdfFile.name}</p>}
            </div>
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }} />
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting || !form.title.trim() || (!pdfFile && !editingId)}
                className="btn-gold disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {submitting ? 'Saving...' : (editingId ? 'Update' : 'Upload')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add button */}
      {!adding && (
        <button onClick={() => setAdding(true)} className="btn-gold text-sm">
          <Plus className="w-4 h-4" /> Add Print Media
        </button>
      )}

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'rgba(243,238,228,0.03)' }}>
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            All Print Media ({items.length})
          </h3>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--dim)' }}>No print media yet</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {items.map(item => (
              <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--ink)' }}>
                    <FileText className="w-5 h-5" style={{ color: 'var(--dim)' }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>
                      <Tag className="w-3 h-3 inline mr-1" />{item.category} | {item.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg transition-colors" style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--dim)' }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(item)} className="text-[10px] px-2 py-1 rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--line)', color: item.is_active ? 'var(--gold)' : 'var(--dim)' }}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-[var(--gold)]"
                    style={{ borderColor: 'var(--line)', color: 'var(--parchment)' }}>View</a>
                  <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-300"
                    style={{ background: 'var(--ink)', border: '1px solid var(--line)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
