import { useState, useRef } from 'react'
import { useAdminPrintMedia, useCreatePrintMedia, useUpdatePrintMedia, useDeletePrintMedia } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'
import { Plus, FileText, Trash2, Pencil, Loader2, Upload, X, Tag, ExternalLink } from 'lucide-react'

const CATEGORIES = ['tract', 'booklet', 'poster', 'study-guide', 'magazine', 'devotional', 'bulletin']

const emptyForm = { title: '', description: '', category: 'bulletin', page_count: '', published_date: '' }

export default function PrintManager() {
  const { showToast } = useToast()
  const { data: items = [], isLoading } = useAdminPrintMedia()
  const createMutation = useCreatePrintMedia()
  const updateMutation = useUpdatePrintMedia()
  const deleteMutation = useDeletePrintMedia()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submitting = createMutation.isPending || updateMutation.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { showToast('Title is required', 'error'); return }
    if (!pdfFile && !editingId) { showToast('PDF file is required', 'error'); return }

    try {
      if (editingId) {
        if (pdfFile) {
          const fd = new FormData()
          fd.append('pdf', pdfFile)
          fd.append('title', form.title)
          fd.append('description', form.description)
          fd.append('category', form.category)
          if (form.page_count) fd.append('page_count', form.page_count)
          if (form.published_date) fd.append('published_date', form.published_date)
          await updateMutation.mutateAsync({ id: editingId, payload: fd })
        } else {
          await updateMutation.mutateAsync({
            id: editingId,
            payload: {
              title: form.title, description: form.description, category: form.category,
              page_count: form.page_count || null, published_date: form.published_date || null,
            }
          })
        }
      } else {
        const fd = new FormData()
        fd.append('pdf', pdfFile!)
        fd.append('title', form.title)
        fd.append('description', form.description)
        fd.append('category', form.category)
        if (form.page_count) fd.append('page_count', form.page_count)
        if (form.published_date) fd.append('published_date', form.published_date)
        await createMutation.mutateAsync(fd)
      }
      reset()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save print media', 'error')
    }
  }

  async function toggleActive(item: any) {
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: { is_active: !item.is_active } })
    } catch {}
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return
    try { await deleteMutation.mutateAsync(id) } catch {}
  }

  function startEdit(item: any) {
    setEditingId(item.id)
    setForm({
      title: item.title, description: item.description || '', category: item.category,
      page_count: item.page_count ? String(item.page_count) : '',
      published_date: item.published_date ? item.published_date.split('T')[0] : '',
    })
    setPdfFile(null)
    setAdding(true)
  }

  function reset() {
    setAdding(false); setEditingId(null); setForm(emptyForm); setPdfFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const inp = 'w-full rounded-lg px-3 py-2 text-sm outline-none'
  const inpStyle = { background: 'var(--coal)', border: '1px solid var(--line)', color: 'var(--cream)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Add / Edit form */}
      {adding && (
        <div className="admin-card p-5">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>{editingId ? 'Edit Item' : 'Upload Print Media'}</p>
            <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer' }}><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className={inp} style={{ ...inpStyle, gridColumn: '1/-1' }} placeholder="Title *"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <select className={inp} style={inpStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <input className={inp} style={inpStyle} type="number" placeholder="Page count"
              value={form.page_count} onChange={e => setForm({ ...form, page_count: e.target.value })} min="1" />
            <input className={inp} style={inpStyle} type="date" placeholder="Published date"
              value={form.published_date} onChange={e => setForm({ ...form, published_date: e.target.value })} />
            <textarea className={inp} style={{ ...inpStyle, gridColumn: '1/-1', resize: 'vertical' }} placeholder="Description"
              rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--ash)', marginBottom: 6 }}>
                {editingId ? 'Replace PDF (leave empty to keep current)' : 'PDF File *'}
              </label>
              <input ref={fileRef} type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)}
                className={inp} style={inpStyle} />
              {pdfFile && <p style={{ fontSize: 10, color: 'var(--ash)', marginTop: 4 }}>{pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(1)} MB</p>}
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
              <button type="submit" disabled={submitting} className="btn btn-flame btn-sm">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {submitting ? 'Uploading…' : (editingId ? 'Save Changes' : 'Upload')}
              </button>
              <button type="button" onClick={reset} className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ash)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {!adding && (
        <button onClick={() => setAdding(true)} className="btn btn-flame btn-sm" style={{ alignSelf: 'flex-start' }}>
          <Plus className="w-3.5 h-3.5" /> Add Print Media
        </button>
      )}

      {/* List */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText className="w-4 h-4" style={{ color: 'var(--flame3)' }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>All Print Media ({items.length})</span>
        </div>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--flame)', margin: '0 auto' }} /></div>
        ) : items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ash)' }}>No print media yet. Upload your first item above.</div>
        ) : (
          items.map((item, i) => (
            <div key={item.id} style={{
              padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 4, background: 'rgba(224,90,26,.1)', border: '1px solid rgba(224,90,26,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText className="w-4 h-4" style={{ color: 'var(--flame3)' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>
                    <Tag className="w-3 h-3 inline mr-1" />{item.category}
                    {item.page_count ? ` · ${item.page_count} pages` : ''}
                    {item.published_date ? ` · ${new Date(item.published_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span className={`admin-tag ${item.is_active ? 'admin-tag-green' : 'admin-tag-ash'}`}>{item.is_active ? 'Active' : 'Hidden'}</span>
                <button onClick={() => startEdit(item)} title="Edit" style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 4, padding: '4px 6px', color: 'var(--ash)', cursor: 'pointer' }}>
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => toggleActive(item)} title={item.is_active ? 'Hide' : 'Show'} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 4, padding: '4px 7px', color: 'var(--ash)', cursor: 'pointer', fontSize: 10 }}>
                  {item.is_active ? 'Hide' : 'Show'}
                </button>
                <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" title="View PDF" style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '4px 6px', color: 'var(--ash)', display: 'flex', alignItems: 'center' }}>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => deleteItem(item.id)} title="Delete" style={{ background: 'none', border: '1px solid rgba(220,38,38,.25)', borderRadius: 4, padding: '4px 6px', color: '#f87171', cursor: 'pointer' }}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
