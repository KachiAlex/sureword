import { useState } from 'react'
import axios from 'axios'
import { API_BASE } from '../../lib/api'
import { Headphones, Plus, Loader2, Image, Upload, Cloud, Video, AudioLines, Star } from 'lucide-react'

interface Sermon {
  id: string
  title: string
  speaker: string
  audio_url: string
  video_url: string
  thumbnail_url: string
  date: string
  is_featured?: boolean
}

type UploadMode = 'audio' | 'video'

export default function SermonManager({ sermons, onRefresh }: { sermons: Sermon[]; onRefresh: () => void }) {
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [mode, setMode] = useState<UploadMode>('audio')
  const [form, setForm] = useState({ title: '', speaker: '', video_url: '', scripture_reference: '', series: '', description: '', duration: '' })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const token = localStorage.getItem('token')

  const featuredSermons = sermons.filter(s => s.is_featured)
  const featuredCount = featuredSermons.length

  function errMsg(err: any): string {
    if (typeof err === 'string') return err
    if (err?.response?.data?.error) return err.response.data.error
    if (err?.message) return err.message
    return 'Failed to add sermon'
  }

  async function uploadToCloudinary(file: File, folder: string): Promise<string> {
    const { data: sig } = await axios.get(`${API_BASE}/api/music/signature?folder=${folder}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', sig.timestamp)
    fd.append('signature', sig.signature)
    fd.append('folder', sig.folder)
    const res = await fetch(sig.uploadUrl, { method: 'POST', body: fd })
    const up = await res.json()
    if (!res.ok) throw new Error(up.error?.message || 'Cloudinary upload failed')
    return up.secure_url
  }

  async function toggleFeatured(s: Sermon) {
    setTogglingId(s.id)
    try {
      await axios.patch(`${API_BASE}/api/sermons/${s.id}/featured`, { is_featured: !s.is_featured }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onRefresh()
    } catch {}
    finally { setTogglingId(null) }
  }

  function resetForm() {
    setForm({ title: '', speaker: '', video_url: '', scripture_reference: '', series: '', description: '', duration: '' })
    setAudioFile(null)
    setThumbnailFile(null)
    setThumbnailPreview('')
  }

  function isFormValid(): boolean {
    if (!form.title.trim()) return false
    if (mode === 'audio') return !!audioFile
    if (mode === 'video') return !!form.speaker.trim() && !!form.description.trim() && !!form.video_url.trim()
    return false
  }

  async function addSermon(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { alert('Title is required'); return }

    if (mode === 'audio') {
      if (!audioFile) { alert('Audio file is required'); return }
    } else {
      if (!form.speaker.trim()) { alert('Speaker is required'); return }
      if (!form.description.trim()) { alert('Description is required'); return }
      if (!form.video_url.trim()) { alert('Video embed URL is required'); return }
    }

    setSubmitting(true)
    try {
      let audioUrl = ''
      let thumbnailUrl = ''

      if (mode === 'audio' && audioFile) {
        setUploadStep('Uploading audio to Cloudinary...')
        audioUrl = await uploadToCloudinary(audioFile, 'zionite/sermons/audio')
      }

      if (thumbnailFile) {
        setUploadStep('Uploading thumbnail to Cloudinary...')
        thumbnailUrl = await uploadToCloudinary(thumbnailFile, 'zionite/sermons/thumbnails')
      }

      setUploadStep('Saving sermon...')
      await axios.post(`${API_BASE}sermons`, {
        title: form.title,
        speaker: form.speaker,
        scripture_reference: form.scripture_reference,
        series: form.series,
        description: form.description,
        duration: form.duration,
        video_url: form.video_url,
        audio_url: audioUrl,
        thumbnail_url: thumbnailUrl
      }, { headers: { Authorization: `Bearer ${token}` } })

      resetForm()
      onRefresh()
    } catch (err: any) {
      alert(errMsg(err))
    } finally {
      setSubmitting(false)
      setUploadStep('')
    }
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setThumbnailFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setThumbnailPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setThumbnailPreview('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Add sermon form */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          Add Sermon
        </h3>

        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => { setMode('audio'); resetForm() }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors"
            style={{
              background: mode === 'audio' ? 'var(--gold)' : 'var(--ink)',
              color: mode === 'audio' ? '#0a0a0a' : 'var(--parchment)'
            }}
          >
            <AudioLines className="w-4 h-4" /> Audio Sermon
          </button>
          <button
            type="button"
            onClick={() => { setMode('video'); resetForm() }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors"
            style={{
              background: mode === 'video' ? 'var(--gold)' : 'var(--ink)',
              color: mode === 'video' ? '#0a0a0a' : 'var(--parchment)'
            }}
          >
            <Video className="w-4 h-4" /> Video Sermon
          </button>
        </div>

        <form onSubmit={addSermon} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Common: Title */}
          <input
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />

          {/* Common: Speaker */}
          <input
            placeholder={mode === 'video' ? 'Speaker *' : 'Speaker'}
            value={form.speaker}
            onChange={e => setForm({ ...form, speaker: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />

          {/* Audio: file upload */}
          {mode === 'audio' && (
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1" style={{ color: 'var(--dim)' }}>Audio Message *</label>
              <input
                type="file"
                accept="audio/*"
                onChange={e => setAudioFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl px-4 py-2 text-sm"
                style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
              />
              {audioFile && (
                <div className="flex items-center gap-2 mt-1">
                  <Cloud className="w-3 h-3" style={{ color: 'var(--dim)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--dim)' }}>{audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                </div>
              )}
            </div>
          )}

          {/* Video: embed URL */}
          {mode === 'video' && (
            <input
              placeholder="Video embed URL * (YouTube, Vimeo, etc.)"
              value={form.video_url}
              onChange={e => setForm({ ...form, video_url: e.target.value })}
              className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
            />
          )}

          {/* Thumbnail file picker */}
          <div className="sm:col-span-2">
            <label className="block text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--dim)' }}>
              <Image className="w-3 h-3" /> Thumbnail
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="flex-1 rounded-xl px-4 py-2 text-sm"
                style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
              />
              {thumbnailPreview && (
                <img src={thumbnailPreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-[var(--line)]" />
              )}
            </div>
          </div>

          {/* Optional fields */}
          <input
            placeholder="Scripture reference"
            value={form.scripture_reference}
            onChange={e => setForm({ ...form, scripture_reference: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />
          <input
            placeholder="Series"
            value={form.series}
            onChange={e => setForm({ ...form, series: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />

          {mode === 'audio' && (
            <input
              placeholder="Duration (minutes)"
              value={form.duration}
              onChange={e => setForm({ ...form, duration: e.target.value })}
              className="w-full rounded-xl px-4 py-2.5 text-sm"
              style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
            />
          )}

          <textarea
            placeholder={mode === 'video' ? 'Description *' : 'Description'}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
            rows={2}
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />

          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting || !isFormValid()} className="btn-gold disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {submitting ? uploadStep || 'Uploading...' : 'Upload Sermon'}
            </button>
          </div>
        </form>
      </div>

      {/* Featured Slots Preview */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 fill-[#c9a227] text-[#c9a227]" />
            Featured Sermons on Home Page
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: featuredCount === 4 ? 'rgba(74,222,128,0.12)' : 'rgba(201,162,39,0.12)', color: featuredCount === 4 ? '#4ade80' : '#c9a227' }}>
            {featuredCount}/4 slots filled
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => {
            const s = featuredSermons[i]
            return (
              <div key={i} className="rounded-xl overflow-hidden aspect-[4/3] relative flex items-center justify-center"
                style={{ background: s ? 'var(--ink)' : 'rgba(243,238,228,0.03)', border: `1px solid ${s ? 'rgba(201,162,39,0.3)' : 'var(--line)'}` }}>
                {s ? (
                  <>
                    {s.thumbnail_url
                      ? <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover" />
                      : <Headphones className="w-6 h-6" style={{ color: 'var(--dim)' }} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-1.5">
                      <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">{s.title}</p>
                    </div>
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#c9a227] flex items-center justify-center">
                      <Star className="w-2.5 h-2.5 fill-[#1b1208] text-[#1b1208]" />
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-6 h-6 rounded-full border border-dashed mx-auto mb-1 flex items-center justify-center" style={{ borderColor: 'var(--line)' }}>
                      <Star className="w-3 h-3" style={{ color: 'var(--dim)' }} />
                    </div>
                    <p className="text-[9px]" style={{ color: 'var(--dim)' }}>Empty slot</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {featuredCount === 4 && (
          <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--dim)' }}>
            All 4 slots filled. Starring a new sermon will automatically replace the oldest featured one.
          </p>
        )}
      </div>

      {/* Sermon list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'rgba(243,238,228,0.03)' }}>
          <h3 className="font-semibold flex items-center gap-2">
            <Headphones className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            All Sermons ({sermons.length})
          </h3>
          <span className="text-[11px]" style={{ color: 'var(--dim)' }}>Click ★ to feature/unfeature</span>
        </div>
        {sermons.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--dim)' }}>No sermons yet</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {sermons.map(s => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {s.thumbnail_url ? (
                    <img src={s.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--ink)' }}>
                      <Headphones className="w-5 h-5" style={{ color: 'var(--dim)' }} />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>
                      {s.speaker && `${s.speaker} | `}{s.date}{s.video_url ? ' | Video' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFeatured(s)}
                    disabled={togglingId === s.id}
                    title={s.is_featured ? 'Remove from featured' : 'Feature on home page'}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                    style={{ background: s.is_featured ? 'rgba(201,162,39,0.15)' : 'var(--ink)', border: '1px solid var(--line)' }}
                  >
                    <Star className="w-3.5 h-3.5" fill={s.is_featured ? '#c9a227' : 'none'} style={{ color: s.is_featured ? '#c9a227' : 'var(--dim)' }} />
                  </button>
                  <a
                    href={s.video_url || s.audio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-yellow-500"
                    style={{ borderColor: 'var(--line)', color: 'var(--parchment)' }}
                  >
                    {s.video_url ? 'Watch' : 'Listen'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
