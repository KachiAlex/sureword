import { useState } from 'react'
import axios from 'axios'
import { Headphones, Plus, Loader2 } from 'lucide-react'

interface Sermon {
  id: string
  title: string
  speaker: string
  audio_url: string
  video_url: string
  thumbnail_url: string
  date: string
}

export default function SermonManager({ sermons, onRefresh }: { sermons: Sermon[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ title: '', speaker: '', audio_url: '', video_url: '', thumbnail_url: '', date: '', scripture_reference: '', series: '', description: '', duration: '' })
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const token = localStorage.getItem('token')

  async function addSermon(e: React.FormEvent) {
    e.preventDefault()
    const needsAudio = mediaType === 'audio' && !audioFile && !form.audio_url.trim()
    const needsVideo = mediaType === 'video' && !form.video_url.trim()
    if (!form.title.trim() || !form.date || (needsAudio && needsVideo)) {
      alert('Title, date, and either audio file/URL or video URL are required')
      return
    }
    setSubmitting(true)
    try {
      const data = new FormData()
      data.append('title', form.title)
      data.append('speaker', form.speaker)
      data.append('date', form.date)
      data.append('scripture_reference', form.scripture_reference)
      data.append('series', form.series)
      data.append('description', form.description)
      data.append('duration', form.duration)
      data.append('video_url', form.video_url)
      data.append('thumbnail_url', form.thumbnail_url)
      if (audioFile) {
        data.append('audio', audioFile)
      } else if (form.audio_url) {
        data.append('audio_url', form.audio_url)
      }
      await axios.post('/api/sermons', data, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      setForm({ title: '', speaker: '', audio_url: '', video_url: '', thumbnail_url: '', date: '', scripture_reference: '', series: '', description: '', duration: '' })
      setAudioFile(null)
      setMediaType('audio')
      onRefresh()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add sermon')
    } finally {
      setSubmitting(false)
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
        <form onSubmit={addSermon} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />
          <input
            placeholder="Speaker"
            value={form.speaker}
            onChange={e => setForm({ ...form, speaker: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />
          {/* Media type toggle */}
          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="button" onClick={() => setMediaType('audio')} className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: mediaType === 'audio' ? 'var(--gold)' : 'var(--line)', color: mediaType === 'audio' ? 'var(--gold)' : 'var(--dim)' }}>
              Audio
            </button>
            <button type="button" onClick={() => setMediaType('video')} className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: mediaType === 'video' ? 'var(--gold)' : 'var(--line)', color: mediaType === 'video' ? 'var(--gold)' : 'var(--dim)' }}>
              Video Embed URL
            </button>
          </div>

          {mediaType === 'audio' ? (
            <>
              <input
                type="file"
                accept="audio/*"
                onChange={e => setAudioFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl px-4 py-2 text-sm"
                style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
              />
              <input
                placeholder="Or Audio URL"
                value={form.audio_url}
                onChange={e => setForm({ ...form, audio_url: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
              />
            </>
          ) : (
            <input
              placeholder="Video embed URL (YouTube, Vimeo, etc.)"
              value={form.video_url}
              onChange={e => setForm({ ...form, video_url: e.target.value })}
              className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
            />
          )}

          <input
            placeholder="Thumbnail URL"
            value={form.thumbnail_url}
            onChange={e => setForm({ ...form, thumbnail_url: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />
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
          <input
            placeholder="Duration (minutes)"
            value={form.duration}
            onChange={e => setForm({ ...form, duration: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
            rows={2}
            style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--parchment)' }}
          />
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="btn-gold disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Sermon
            </button>
          </div>
        </form>
      </div>

      {/* Sermon list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)', background: 'rgba(243,238,228,0.03)' }}>
          <h3 className="font-semibold flex items-center gap-2">
            <Headphones className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            Sermons ({sermons.length})
          </h3>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
