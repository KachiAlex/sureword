import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
export const API_BASE = isDev ? '' : 'https://sureword.fly.dev'
export const SOCKET_BASE = 'https://sureword.fly.dev'
export const api = axios.create({ baseURL: `${API_BASE}/api`, timeout: 15000 })

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    const status = error.response?.status

    // 401 = expired access token; 403 may be a real permission denial — only refresh on 401
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(resolve => {
          addRefreshSubscriber(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefreshToken } = data
        localStorage.setItem('token', accessToken)
        localStorage.setItem('refreshToken', newRefreshToken)
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        onRefreshed(accessToken)
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export interface Broadcast { id: string; title: string; description?: string; scripture_reference?: string; status: string; started_at?: string; broadcaster_id: string; speaker?: string; thumbnail_url?: string }
export interface Sermon { id: string; title: string; scripture_reference?: string; speaker?: string; series?: string; duration?: number; date: string; audio_url?: string; video_url?: string; thumbnail_url?: string; is_featured?: boolean }
export interface GuestSpeaker { id: string; name: string; bio: string; photo_url: string; topic: string; date: string; is_active: boolean }
export interface EventItem { id: string; title: string; description: string; date: string; time: string; location: string; image_url: string; category?: string }
export interface MusicTrack { id: string; title: string; artist: string; album: string; genre: string; audio_url: string; cover_url: string; duration: number; lyrics: string }
export interface User { id: string; email: string; name?: string; role: string; created_at?: string }
export interface Prayer { id: string; name: string | null; request: string; is_anonymous: boolean; prayers_count: number; created_at: string }
export interface PrintMedia { id: string; title: string; description: string; category: string; pdf_url: string; thumbnail_url?: string; is_active: boolean; page_count?: number; published_date?: string; created_at: string }
export interface SermonPlaylist { id: string; title: string; description: string; start_time: string; end_time?: string; is_active: boolean; created_at: string }
export interface SermonPlaylistItem { id: string; playlist_id: string; sermon_id: string; order_index: number; duration_minutes: number; title?: string; speaker?: string; thumbnail_url?: string; audio_url?: string }
export interface RadioCurrent { itemId: string; sermonId: string; title: string; speaker: string; audioUrl: string; thumbnailUrl?: string; description?: string; scriptureReference?: string; offsetSeconds: number }

/* ─── New Playlist Model ─── */
export interface Playlist { id: string; title: string; description?: string; repeat_mode: 'none' | 'all' | 'one'; shuffle: boolean; created_at: string }
export interface PlaylistItem { id: string; playlist_id: string; content_type: 'sermon' | 'music'; content_id: string; order_index: number; duration_minutes: number; title?: string; speaker?: string; thumbnail_url?: string; audio_url?: string }
export interface RadioSchedule { id: string; playlist_id: string; playlist_title?: string; start_time: string; end_time?: string; is_active: boolean; created_at: string }

/* ─── Queries ─── */
export function useBroadcasts() {
  return useQuery<Broadcast[]>({
    queryKey: ['broadcasts'],
    queryFn: async () => {
      const { data } = await api.get('/broadcasts')
      return data.broadcasts as Broadcast[]
    },
    refetchInterval: 8000,
    staleTime: 4000,
  })
}

export function useDashboardAnalytics() {
  return useQuery({ queryKey: ['analytics', 'dashboard'], queryFn: async () => {
    const { data } = await api.get('/analytics/dashboard')
    return data
  }})
}

export function useActiveBroadcast() {
  return useQuery<Broadcast | null>({
    queryKey: ['broadcasts', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/broadcasts/active')
      return data.broadcast as Broadcast | null
    },
    retry: 1,
    refetchInterval: 8000,
    staleTime: 4000,
  })
}

export function useSermons(limit?: number) {
  return useQuery<Sermon[]>({ queryKey: ['sermons', limit], queryFn: async () => {
    const { data } = await api.get(`/sermons${limit ? `?limit=${limit}` : ''}`)
    return data.sermons as Sermon[]
  }})
}

export function useFeaturedSermons() {
  return useQuery<Sermon[]>({ queryKey: ['sermons', 'featured'], queryFn: async () => {
    const { data } = await api.get('/sermons/featured')
    return data.sermons as Sermon[]
  }})
}

export function useSermon(id: string) {
  return useQuery<Sermon>({ queryKey: ['sermons', id], queryFn: async () => {
    const { data } = await api.get(`/sermons/${id}`)
    return data.sermon as Sermon
  }, enabled: !!id })
}

export function useGuestSpeakers() {
  return useQuery<GuestSpeaker[]>({ queryKey: ['guest-speakers'], queryFn: async () => {
    const { data } = await api.get('/guest-speakers')
    // backend returns { speakers } (not guest_speakers)
    return (data.speakers ?? data.guest_speakers ?? []) as GuestSpeaker[]
  }})
}

export function useTestimonies(adminAll = false) {
  return useQuery({ queryKey: ['testimonies', adminAll], queryFn: async () => {
    const { data } = await api.get(adminAll ? '/testimonies/admin/all' : '/testimonies')
    return data.testimonies
  }})
}

export function useCampaigns() {
  return useQuery({ queryKey: ['campaigns'], queryFn: async () => {
    const { data } = await api.get('/campaigns')
    return data.campaigns
  }})
}

export function useAdminDonations() {
  return useQuery({ queryKey: ['donations', 'admin'], queryFn: async () => {
    const { data } = await api.get('/donations/admin/all')
    return { donations: data.donations, total: data.total }
  }})
}

export function usePushStats() {
  return useQuery({ queryKey: ['push', 'stats'], queryFn: async () => {
    const { data } = await api.get('/push/stats')
    return data
  }})
}

export function useVerses() {
  return useQuery({ queryKey: ['verses'], queryFn: async () => {
    const { data } = await api.get('/push/verses')
    return data.verses
  }})
}

export function useEvents() {
  return useQuery<EventItem[]>({ queryKey: ['events'], queryFn: async () => {
    const { data } = await api.get('/events')
    return data.events as EventItem[]
  }})
}

export function useMusic() {
  return useQuery<MusicTrack[]>({ queryKey: ['music'], queryFn: async () => {
    const { data } = await api.get('/music')
    return data.music as MusicTrack[]
  }})
}

export function usePrayers() {
  return useQuery<Prayer[]>({ queryKey: ['prayers'], queryFn: async () => {
    const { data } = await api.get('/prayer')
    return data.prayers as Prayer[]
  }})
}

export function useStatus() {
  return useQuery({ queryKey: ['status'], queryFn: async () => {
    const { data } = await api.get('/status')
    return data
  }})
}

export function useDonations() {
  return useQuery({ queryKey: ['donations'], queryFn: async () => {
    const { data } = await api.get('/donations')
    return data.donations
  }})
}

export function useUsers() {
  return useQuery<User[]>({ queryKey: ['users'], queryFn: async () => {
    const { data } = await api.get('/auth/users')
    return data.users as User[]
  }})
}

export function useChatMessages(broadcastId?: string) {
  return useQuery({ queryKey: ['chat', broadcastId], queryFn: async () => {
    const path = broadcastId ? `/chat/broadcast/${broadcastId}` : '/chat/general'
    const { data } = await api.get(path)
    return data.messages
  }, refetchInterval: 5000, enabled: true })
}

export function useSearch(q: string) {
  return useQuery({ queryKey: ['search', q], queryFn: async () => {
    const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`)
    return data
  }, enabled: q.trim().length > 0, staleTime: 1000 * 60 })
}

/* ─── Mutations ─── */
export function useCreateSermon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => api.post('/sermons', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sermons'] }),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => api.post('/events', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useCreatePrayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => api.post('/prayer', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prayers'] }),
  })
}

export function useSendChat() {
  const qc = useQueryClient()
  return useMutation({
    // payload must include broadcastId; send to correct endpoint
    mutationFn: ({ broadcastId, message, recipientId }: { broadcastId: string; message: string; recipientId?: string }) =>
      api.post(`/chat/broadcast/${broadcastId}`, { message, recipientId }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['chat', v.broadcastId] }),
  })
}

export function useSendGuestChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ broadcastId, message, guestName }: { broadcastId: string; message: string; guestName: string }) =>
      api.post(`/chat/broadcast/${broadcastId}/guest`, { message, guestName }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['chat', v.broadcastId] }),
  })
}

export function useDeleteChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/chat/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat'] }),
  })
}

export function useCreateDonation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => api.post('/donations', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donations'] }),
  })
}

export function useUpdateDonation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/donations/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donations'] }),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/auth/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeletePrayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/prayer/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prayers'] }),
  })
}

export function useUpdateTestimony() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, is_featured }: { id: string; status?: string; is_featured?: boolean }) =>
      api.patch(`/testimonies/${id}`, { status, is_featured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testimonies'] }),
  })
}

export function useDeleteTestimony() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/testimonies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testimonies'] }),
  })
}

export function useDeleteSermon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sermons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sermons'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; [k: string]: any }) => api.patch(`/events/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useCreateBroadcast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { title: string; description?: string; scripture_reference?: string; speaker?: string; thumbnail_url?: string }) =>
      api.post('/broadcasts', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
  })
}

export function useEndBroadcast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/broadcasts/${id}/end`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
  })
}

export function useDeleteBroadcast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/broadcasts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { title: string; description?: string; goal_amount: number; end_date?: string }) =>
      api.post('/campaigns', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; [k: string]: any }) => api.patch(`/campaigns/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useCreateVerse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { title: string; content: string; reference?: string; type?: string }) =>
      api.post('/push/verse', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verses'] }),
  })
}

export function useUpdateGuestSpeaker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; [k: string]: any }) => api.patch(`/guest-speakers/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guest-speakers'] }),
  })
}

export function useDeleteGuestSpeaker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/guest-speakers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guest-speakers'] }),
  })
}

export function usePrintMedia() {
  return useQuery<PrintMedia[]>({ queryKey: ['print-media'], queryFn: async () => {
    const { data } = await api.get('/print-media')
    return data.printMedia as PrintMedia[]
  }})
}

export function useAdminPrintMedia() {
  return useQuery<PrintMedia[]>({ queryKey: ['print-media', 'admin'], queryFn: async () => {
    const { data } = await api.get('/print-media/admin/all')
    return data.printMedia as PrintMedia[]
  }})
}

export function useCreatePrintMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FormData) => api.post('/print-media', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print-media'] }) },
  })
}

export function useUpdatePrintMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormData | Record<string, any> }) => {
      const isFormData = payload instanceof FormData
      return api.patch(`/print-media/${id}`, payload, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {})
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print-media'] }) },
  })
}

export function useDeletePrintMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/print-media/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['print-media'] }) },
  })
}

export function useRadioCurrent() {
  return useQuery<{ current: RadioCurrent | null; playlist: { id: string; title: string; startTime: string } | null }>({
    queryKey: ['sermons', 'radio', 'current'],
    queryFn: async () => {
      const { data } = await api.get('/sermons/radio/current')
      return { current: data.current, playlist: data.playlist }
    },
    refetchInterval: 60000,
  })
}

export function useSermonPlaylists() {
  return useQuery<SermonPlaylist[]>({ queryKey: ['sermon-playlists'], queryFn: async () => {
    const { data } = await api.get('/sermon-playlists')
    return data.playlists as SermonPlaylist[]
  }})
}

export function useSermonPlaylistItems(playlistId?: string) {
  return useQuery<SermonPlaylistItem[]>({ queryKey: ['sermon-playlists', playlistId, 'items'], queryFn: async () => {
    const { data } = await api.get(`/sermon-playlists/${playlistId}/items`)
    return data.items as SermonPlaylistItem[]
  }, enabled: !!playlistId })
}

/* ─── New Playlist Hooks ─── */
export function usePlaylists() {
  return useQuery<Playlist[]>({ queryKey: ['playlists'], queryFn: async () => {
    const { data } = await api.get('/playlists')
    return data.playlists as Playlist[]
  }})
}

export function usePlaylistItems(playlistId?: string) {
  return useQuery<PlaylistItem[]>({ queryKey: ['playlists', playlistId, 'items'], queryFn: async () => {
    const { data } = await api.get(`/playlists/${playlistId}/items`)
    return data.items as PlaylistItem[]
  }, enabled: !!playlistId })
}

export function useRadioSchedules() {
  return useQuery<RadioSchedule[]>({ queryKey: ['radio-schedules'], queryFn: async () => {
    const { data } = await api.get('/radio-schedules')
    return data.schedules as RadioSchedule[]
  }})
}

export function usePublicRadioSchedules() {
  return useQuery<RadioSchedule[]>({ queryKey: ['radio-schedules', 'public'], queryFn: async () => {
    const { data } = await api.get('/radio-schedules/public')
    return data.schedules as RadioSchedule[]
  }})
}

export function useActiveRadioSchedule() {
  return useQuery<RadioSchedule | null>({ queryKey: ['radio-schedules', 'active'], queryFn: async () => {
    const { data } = await api.get('/radio-schedules/active')
    return data.schedule as RadioSchedule | null
  }})
}

export function useMusicTracks() {
  return useQuery<MusicTrack[]>({ queryKey: ['music'], queryFn: async () => {
    const { data } = await api.get('/music')
    return data.music as MusicTrack[]
  }})
}

// ── Upload helpers (Cloudinary abstracted) ───────────────────
export async function uploadFile(file: File, type: 'image' | 'audio'): Promise<string> {
  const fd = new FormData()
  fd.append(type, file)
  const { data } = await api.post(`/uploads/${type}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data.url as string
}

// ── Image optimization helper ────────────────────────────────
export function getOptimizedImageUrl(url: string | undefined, width?: number): string {
  if (!url) return ''
  // Only optimize Cloudinary URLs
  if (!url.includes('cloudinary.com')) return url
  // Insert transforms into Cloudinary path: /upload/ -> /upload/f_auto,q_auto,w_N/
  const transforms = [`f_auto`, `q_auto`]
  if (width) transforms.push(`w_${width}`)
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`)
}

// ── Bookmarks ──────────────────────────────────────────────────
export function useBookmarks(enabled = true) {
  return useQuery<Sermon[]>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const { data } = await api.get('/bookmarks')
      return data.sermons as Sermon[]
    },
    enabled,
    staleTime: 30000,
  })
}

export function useBookmarkIds(enabled = true) {
  return useQuery<string[]>({
    queryKey: ['bookmarks', 'ids'],
    queryFn: async () => {
      const { data } = await api.get('/bookmarks/ids')
      return data.ids as string[]
    },
    enabled,
    staleTime: 30000,
  })
}

export function useToggleBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sermonId: string) => api.post(`/bookmarks/${sermonId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookmarks'] })
    },
  })
}

// ── Listening History ──────────────────────────────────────────
export function useListeningHistory(enabled = true) {
  return useQuery<Sermon[]>({
    queryKey: ['history'],
    queryFn: async () => {
      const { data } = await api.get('/history?limit=30')
      return data.sermons as Sermon[]
    },
    enabled,
    staleTime: 30000,
  })
}

export function useRecordPlay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sermonId, progress = 0 }: { sermonId: string; progress?: number }) =>
      api.post(`/history/${sermonId}`, { progress }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] })
    },
  })
}

export function useClearHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/history'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  })
}

