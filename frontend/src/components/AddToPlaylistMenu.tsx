import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, usePlaylists } from '../lib/api'
import { ListMusic, Plus, Loader2, Check } from 'lucide-react'

interface Props {
  contentType: 'sermon' | 'music'
  contentId: string
  duration?: number
  children: React.ReactNode
}

export default function AddToPlaylistMenu({ contentType, contentId, duration, children }: Props) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const { data: playlists = [] } = usePlaylists()
  const qc = useQueryClient()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function addToPlaylist(playlistId: string) {
    setAdding(playlistId)
    try {
      await api.post(`/playlists/${playlistId}/items`, {
        content_type: contentType,
        content_id: contentId,
        duration_seconds: duration || null,
      })
      qc.invalidateQueries({ queryKey: ['playlists', playlistId, 'items'] })
      setAdded(playlistId)
      setTimeout(() => setAdded(null), 1500)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="cursor-pointer" type="button">
        {children}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <div className="px-3 py-2 border-b text-xs font-semibold flex items-center gap-2"
            style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>
            <ListMusic className="w-3.5 h-3.5" /> Add to Playlist
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {playlists.length === 0 && (
              <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--dim)' }}>No playlists yet</div>
            )}
            {playlists.map(pl => (
              <button key={pl.id} onClick={() => addToPlaylist(pl.id)}
                disabled={adding === pl.id}
                className="w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-[rgba(201,162,39,0.08)] disabled:opacity-50"
                style={{ color: 'var(--parchment)' }}>
                <span className="truncate">{pl.title}</span>
                {added === pl.id ? <Check className="w-3 h-3 text-[#4ade80]" />
                  : adding === pl.id ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--dim)' }} />
                    : <Plus className="w-3 h-3" style={{ color: 'var(--dim)' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
