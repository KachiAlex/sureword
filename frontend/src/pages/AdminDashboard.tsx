import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { api, useBroadcasts, useSermons, useUsers, usePrayers, useMusic, useDashboardAnalytics, usePrintMedia, API_BASE } from '../lib/api'
import {
  Users, Radio, Headphones, MessageSquare, Settings, Heart, Calendar,
  BookOpen, DollarSign, Pause, StopCircle, BarChart3,
  Menu, X, Loader2, FileText, ListMusic,
  Search, Bell, HelpCircle, LayoutGrid,
  Play, ChevronRight
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const BroadcastManager = lazy(() => import('../components/admin/BroadcastManager'))
const SermonManager = lazy(() => import('../components/admin/SermonManager'))
const ChatSupervisor = lazy(() => import('../components/admin/ChatSupervisor'))
const AdminSettings = lazy(() => import('../components/admin/AdminSettings'))
const MusicManager = lazy(() => import('../components/admin/MusicManager'))
const GuestSpeakerManager = lazy(() => import('../components/admin/GuestSpeakerManager'))
const PrayerManager = lazy(() => import('../components/admin/PrayerManager'))
const TestimonyManager = lazy(() => import('../components/admin/TestimonyManager'))
const EventManager = lazy(() => import('../components/admin/EventManager'))
const DailyVerseManager = lazy(() => import('../components/admin/DailyVerseManager'))
const PrintManager = lazy(() => import('../components/admin/PrintManager'))
const SermonPlaylistManager = lazy(() => import('../components/admin/SermonPlaylistManager'))

interface ChatMessage { id: string; broadcast_id?: string; user_name: string; message: string; created_at: string }

type Tab = 'dashboard' | 'broadcasts' | 'users' | 'sermons' | 'chat' | 'settings' | 'music' | 'speakers' | 'prayer' | 'testimonies' | 'events' | 'dailyverse' | 'print' | 'playlists'

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function LiveWaveform({ active }: { active: boolean }) {
  const [bars, setBars] = useState<number[]>(Array.from({ length: 40 }, () => 15))
  useEffect(() => {
    if (!active) { setBars(Array.from({ length: 40 }, () => 15)); return }
    const id = setInterval(() => {
      setBars(Array.from({ length: 40 }, () => Math.max(10, Math.min(100, Math.random() * 90 + 10))))
    }, 200)
    return () => clearInterval(id)
  }, [active])
  return (
    <div className="flex items-end gap-[2px] h-8 my-2">
      {bars.map((h, i) => (
        <div key={i} className={`w-[3px] rounded-full transition-all duration-200 ${active ? 'bg-[#E05A1A]' : 'bg-[#E05A1A]/30'}`} style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

function VUMeter({ active }: { active: boolean }) {
  const [bars, setBars] = useState<number[]>(Array.from({ length: 32 }, () => 20))
  useEffect(() => {
    if (!active) { setBars(Array.from({ length: 32 }, () => 20)); return }
    const id = setInterval(() => {
      setBars(Array.from({ length: 32 }, () => Math.max(5, Math.min(100, Math.random() * 85 + 15))))
    }, 180)
    return () => clearInterval(id)
  }, [active])
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48, padding: '0 4px' }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 1,
          height: `${h}%`,
          background: h > 80 ? 'var(--red)' : h > 50 ? 'var(--flame3)' : 'var(--green)',
          opacity: active ? 1 : .25,
          transition: 'height .18s ease'
        }} />
      ))}
    </div>
  )
}

function SignalBars({ label, value }: { label: string; value: number }) {
  const bars = [20, 40, 60, 80, 100]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10, color: 'var(--ash2)', width: 40, textAlign: 'right' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 4, borderRadius: 1, height: `${h * .16}px`,
            background: value >= h ? (i >= 3 ? 'var(--flame3)' : 'var(--green)') : 'var(--line)',
            transition: 'background .2s'
          }} />
        ))}
      </div>
      <span style={{ fontSize: 10, color: 'var(--cream2)', fontWeight: 600 }}>{value}%</span>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: broadcasts = [] } = useBroadcasts()
  const { data: sermons = [] } = useSermons()
  const { data: users = [] } = useUsers()
  const { data: musicTracks = [] } = useMusic()
  const { data: prayers = [] } = usePrayers()
  const { data: printMedia = [] } = usePrintMedia()
  const { data: analytics } = useDashboardAnalytics()
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [bcActionLoading, setBcActionLoading] = useState(false)
  const [liveElapsed, setLiveElapsed] = useState(0)
  const [geoData, setGeoData] = useState<{ byCountry: {country:string;count:number}[]; locations: {country:string;region:string;city:string;count:number}[] }>({ byCountry: [], locations: [] })

  /* -- Live broadcast duration timer -- */
  useEffect(() => {
    const live = broadcasts.find(b => b.status === 'live')
    if (!live?.started_at) { setLiveElapsed(0); return }
    const start = new Date(live.started_at).getTime()
    setLiveElapsed(Math.floor((Date.now() - start) / 1000))
    const id = setInterval(() => setLiveElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [broadcasts])

  // Fetch geo data for live broadcast
  useEffect(() => {
    const live = broadcasts.find(b => b.status === 'live')
    if (!live) { setGeoData({ byCountry: [], locations: [] }); return }
    const token = localStorage.getItem('token')
    const fetchGeo = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/stream/${live.id}/listeners/geo`, { headers: { Authorization: `Bearer ${token}` } })
        setGeoData({ byCountry: data.byCountry || [], locations: data.locations || [] })
      } catch {}
    }
    fetchGeo()
    const iv = setInterval(fetchGeo, 15000)
    return () => clearInterval(iv)
  }, [broadcasts])

  const dashboard = analytics?.stats ?? null
  const platformData = analytics?.platformBreakdown ?? []
  const pendingTestimonies = analytics?.pendingTestimonies ?? []
  const recentDonations = analytics?.recentDonations ?? []
  const campaigns = analytics?.activeCampaigns ?? []
  const transcripts = analytics?.transcripts ?? []
  const listenerChart = analytics?.listenerHistory ?? []
  const loading = !analytics

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return }
  }, [user, navigate])

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    queryClient.invalidateQueries({ queryKey: ['sermons'] })
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['music'] })
    queryClient.invalidateQueries({ queryKey: ['prayers'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
    queryClient.invalidateQueries({ queryKey: ['print-media'] })
    queryClient.invalidateQueries({ queryKey: ['sermon-playlists'] })
  }

  async function fetchChat() {
    try {
      const res = await axios.get(`${API_BASE}/api/broadcasts`)
      const bcs = res.data.broadcasts as any[]
      const allMessages: ChatMessage[] = []
      for (const b of bcs.slice(0, 5)) {
        try { const msgRes = await axios.get(`${API_BASE}/api/chat/broadcast/${b.id}`); allMessages.push(...msgRes.data.messages) } catch {}
      }
      try { const general = await axios.get(`${API_BASE}/api/chat/general`); allMessages.push(...general.data.messages) } catch {}
      setChatMessages(allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (err) { console.error('Failed to fetch chat:', err) }
  }

  useEffect(() => {
    if (activeTab === 'chat') { fetchChat(); const iv = setInterval(fetchChat, 5000); return () => clearInterval(iv) }
  }, [activeTab])

  async function updateUserRole(userId: string, newRole: string) {
    try {
      await api.put(`/auth/users/${userId}/role`, { role: newRole })
      queryClient.setQueryData(['users'], (old: any) => old?.map((u: any) => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to update role') }
  }

  /* -- Broadcast control helpers -- */
  async function endLiveBroadcast() {
    const live = broadcasts.find(b => b.status === 'live')
    if (!live) return
    setBcActionLoading(true)
    try {
      await api.post(`/broadcasts/${live.id}/end`)
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to end broadcast')
    } finally {
      setBcActionLoading(false)
    }
  }

  async function pauseLiveBroadcast() {
    const live = broadcasts.find(b => b.status === 'live')
    if (!live) return
    setBcActionLoading(true)
    try {
      // No dedicated pause endpoint; treat as end and let broadcaster restart
      await api.post(`/broadcasts/${live.id}/end`)
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to end broadcast')
    } finally {
      setBcActionLoading(false)
    }
  }

  if (!user || user.role !== 'admin') return null

  const screenTitles: Record<string, string> = {
    dashboard: 'Overview', broadcasts: 'Broadcast Console', playlists: 'Playlist Manager',
    print: 'Print Media', prayer: 'Prayer Requests', users: 'User Management',
    sermons: 'Sermons', chat: 'Chat Moderation', settings: 'System Settings',
    music: 'Music Library', speakers: 'Guest Speakers', testimonies: 'Testimonies',
    events: 'Events', dailyverse: 'Daily Word'
  }

  const live = broadcasts.find(b => b.status === 'live')

  function NavItem({ label, tab, icon: I, badge }: any) {
    const active = activeTab === tab
    return (
      <button onClick={() => { setActiveTab(tab); setMobileSidebarOpen(false) }}
        className="sb-item" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 3,
          fontSize: 13, color: active ? 'var(--flame3)' : 'var(--ash2)',
          background: active ? 'var(--mahog)' : 'transparent', border: 'none', width: '100%', textAlign: 'left',
          transition: 'all .13s', cursor: 'pointer', borderLeft: active ? '2px solid var(--flame)' : '2px solid transparent'
        }}>
        <I className="w-[15px] h-[15px] flex-shrink-0" style={{ opacity: active ? 1 : .7 }} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge ? <span style={{ marginLeft: 'auto', background: 'var(--flame)', color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>{badge}</span> : null}
      </button>
    )
  }

  function NavGroup({ title }: { title: string }) {
    return <div style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ash)', padding: '12px 10px 5px', userSelect: 'none' }}>{title}</div>
  }

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
          <circle cx="16" cy="16" r="15" fill="#221008" stroke="#E05A1A" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="#F5A623" strokeWidth=".7" strokeDasharray="2 3" />
          <rect x="12.5" y="7" width="7" height="11" rx="3.5" fill="#E05A1A" />
          <line x1="16" y1="18" x2="16" y2="22" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="22" x2="20" y2="22" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13.5" y1="11" x2="18.5" y2="11" stroke="#fff" strokeWidth=".7" opacity=".45" />
          <line x1="13.5" y1="13.5" x2="18.5" y2="13.5" stroke="#fff" strokeWidth=".7" opacity=".45" />
        </svg>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: '.08em', lineHeight: 1 }}>Sure Word Radio</div>
          <div style={{ fontSize: 10, color: 'var(--ash2)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Admin Console</div>
        </div>
        <button onClick={() => setMobileSidebarOpen(false)} className="lg:hidden ml-auto" style={{ color: 'var(--ash)' }}><X className="w-5 h-5" /></button>
      </div>

      {/* Live badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: live ? 'rgba(224,90,26,.1)' : 'rgba(122,96,72,.08)',
        border: `1px solid ${live ? 'rgba(224,90,26,.25)' : 'rgba(122,96,72,.2)'}`,
        margin: '12px 12px 4px', borderRadius: 3, padding: '8px 12px'
      }}>
        <span className="ldot" style={{
          width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--flame3)' : 'var(--ash)',
          display: 'inline-block', flexShrink: 0, animation: live ? 'pulse 1.8s ease-in-out infinite' : 'none'
        }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: live ? 'var(--flame3)' : 'var(--ash2)' }}>{live ? 'On air' : 'Off air'}</span>
        {live && <span className="font-mono" style={{ fontSize: 11, color: 'var(--cream2)', marginLeft: 'auto' }}>{formatDuration(liveElapsed)}</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <NavGroup title="Studio" />
        <NavItem label="Overview" tab="dashboard" icon={LayoutGrid} />
        <NavItem label="Broadcast Console" tab="broadcasts" icon={Radio} />
        <NavItem label="Playlist Manager" tab="playlists" icon={ListMusic} />
        <NavGroup title="Content" />
        <NavItem label="Sermons" tab="sermons" icon={BookOpen} />
        <NavItem label="Print Media" tab="print" icon={FileText} />
        <NavGroup title="Pastoral" />
        <NavItem label="Prayer Requests" tab="prayer" icon={Heart} badge={prayers.length} />
        <NavGroup title="Community" />
        <NavItem label="Chat Moderation" tab="chat" icon={MessageSquare} badge={chatMessages.length} />
        <NavItem label="User Management" tab="users" icon={Users} />
        <NavGroup title="Settings" />
        <NavItem label="System Settings" tab="settings" icon={Settings} />
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: 'var(--flame)', color: '#fff',
          fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>{user?.name?.[0]?.toUpperCase() || 'A'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Admin'}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ash2)', textTransform: 'capitalize' }}>{user?.role || 'Admin'}</div>
        </div>
        <button onClick={() => { /* settings */ }} className="sb-foot-action" style={{ background: 'transparent', border: 'none', color: 'var(--ash)', cursor: 'pointer', padding: 4 }}>
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--ember)', color: 'var(--cream)' }}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />}
      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <aside className="lg:hidden fixed inset-y-0 left-0 z-50" style={{ width: 'var(--sidebar-w)', background: 'var(--coal)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {sidebarContent}
        </aside>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0" style={{ width: 'var(--sidebar-w)', background: 'var(--coal)', borderRight: '1px solid var(--line)', overflowY: 'auto', zIndex: 50 }}>
        {sidebarContent}
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 56, flexShrink: 0, background: 'rgba(13,4,0,.9)', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', backdropFilter: 'blur(8px)'
        }}>
          <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden" style={{ color: 'var(--ash)' }}><Menu className="w-5 h-5" /></button>
          <div className="font-bebas" style={{ fontSize: 18, letterSpacing: '.06em', flex: 1 }}>{screenTitles[activeTab] || activeTab}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--mahog)', border: '1px solid var(--line)', borderRadius: 3, padding: '6px 12px', width: 220 }}>
            <Search className="w-[14px] h-[14px] flex-shrink-0" style={{ color: 'var(--ash)' }} />
            <input type="text" placeholder="Search…" style={{ background: 'transparent', border: 'none', color: 'var(--cream)', fontSize: 13, width: '100%', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button style={{ width: 34, height: 34, borderRadius: 3, background: 'transparent', border: 'none', color: 'var(--ash2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'all .13s' }} className="hover:bg-[var(--mahog)] hover:text-[var(--cream)]">
              <Bell className="w-4 h-4" />
              <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--flame)', border: '1.5px solid var(--ember)' }} />
            </button>
            <div style={{ width: 1, height: 24, background: 'var(--line)' }} />
            <button style={{ width: 34, height: 34, borderRadius: 3, background: 'transparent', border: 'none', color: 'var(--ash2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .13s' }} className="hover:bg-[var(--mahog)] hover:text-[var(--cream)]">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
          {activeTab === 'dashboard' ? (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  { icon: Headphones, label: 'Listeners', value: dashboard?.listenersOnline?.toLocaleString() || '0', sub: 'Active now', bg: 'rgba(224,90,26,.12)', col: 'var(--flame3)' },
                  { icon: Users, label: 'Total Listeners', value: dashboard?.totalListenersToday?.toLocaleString() || '0', sub: '24h', bg: 'rgba(74,158,255,.1)', col: 'var(--blue)' },
                  { icon: BookOpen, label: 'Sermons', value: String(sermons.length || 0), sub: 'Total', bg: 'rgba(62,207,110,.1)', col: 'var(--green)' },
                  { icon: Heart, label: 'Prayers', value: String(prayers.length || 0), sub: 'Pending', bg: 'rgba(224,90,26,.12)', col: 'var(--flame)' },
                  { icon: DollarSign, label: 'Donations', value: dashboard?.totalDonations ? `$${Number(dashboard.totalDonations).toLocaleString()}` : '$0', sub: 'All time', bg: 'rgba(240,192,64,.1)', col: 'var(--sun2)' },
                  { icon: BarChart3, label: 'Streams', value: dashboard?.totalListenersToday?.toLocaleString() || '0', sub: 'Today', bg: 'rgba(139,124,248,.12)', col: '#8b7cf8' },
                ].map((c, i) => (
                  <div key={i} className="admin-card p-4 hover-lift animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <c.icon className="w-4 h-4" style={{ color: c.col }} />
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--ash2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</span>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: '.02em', lineHeight: 1 }}>{c.value}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ash)', marginTop: 4 }}>{c.sub}</div>
                  </div>
                ))}
              </div>
              {/* Activity + Quick actions */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <div className="xl:col-span-8 admin-card p-4">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Activity – 7 day listeners</h3>
                    <span style={{ fontSize: 10, color: 'var(--ash2)' }}>View full analytics</span>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={listenerChart.length ? listenerChart : [{ time: 'Mon', l: 0, u: 0 }, { time: 'Tue', l: 0, u: 0 }, { time: 'Wed', l: 0, u: 0 }, { time: 'Thu', l: 0, u: 0 }, { time: 'Fri', l: 0, u: 0 }, { time: 'Sat', l: 0, u: 0 }, { time: 'Sun', l: 0, u: 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,166,35,.06)" />
                      <XAxis dataKey="time" stroke="var(--ash)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--ash)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 11 }} />
                      <Line type="monotone" dataKey="l" name="Listeners" stroke="var(--flame)" strokeWidth={2} dot={{ r: 3, fill: 'var(--flame)' }} />
                      <Line type="monotone" dataKey="u" name="Unique" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3, fill: 'var(--blue)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="xl:col-span-4 admin-card p-4">
                  <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { icon: Radio, label: 'Start Live Broadcast', desc: 'Begin a new stream', action: () => setActiveTab('broadcasts'), color: 'var(--flame3)' },
                      { icon: BookOpen, label: 'Upload New Sermon', desc: 'Add sermon audio', action: () => setActiveTab('sermons'), color: 'var(--green)' },
                      { icon: FileText, label: 'Create Print Media', desc: 'Design PDF or poster', action: () => setActiveTab('print'), color: 'var(--blue)' },
                      { icon: Calendar, label: 'Schedule Event', desc: 'Plan upcoming broadcast', action: () => setActiveTab('events'), color: 'var(--sun2)' },
                    ].map((a, i) => (
                      <button key={i} onClick={a.action} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 3, background: 'transparent', border: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer', transition: 'all .13s', color: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sunrise)'; e.currentTarget.style.background = 'var(--mahog)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'transparent' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 3, background: 'var(--mahog)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <a.icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.label}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--ash2)' }}>{a.desc}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'var(--ash)' }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Schedule strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "Today's Schedule", items: broadcasts.filter((b: any) => b.status === 'scheduled' || b.status === 'live').slice(0, 3).map((b: any) => b.title) },
                  { title: "Tomorrow", items: [] },
                  { title: "This Week", items: [] },
                ].map((col, i) => (
                  <div key={i} className="admin-card p-4">
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>{col.title}</div>
                    {col.items.length === 0 ? (
                      <div style={{ fontSize: 11.5, color: 'var(--ash)', padding: '8px 0' }}>Nothing scheduled</div>
                    ) : (
                      col.items.map((item: string, j: number) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: j < col.items.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--flame3)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12 }}>{item}</span>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>

              {/* Recent Sermons table */}
              <div className="admin-card p-4">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Recent Sermons</h3>
                  <button onClick={() => setActiveTab('sermons')} className="btn btn-sm btn-ghost">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--ash)', borderBottom: '1px solid var(--line)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 400 }}>Title</th>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 400 }}>Speaker</th>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 400 }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 400 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sermons.length ? sermons : []).slice(0, 6).map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(245,166,35,.04)' }}>
                          <td style={{ padding: '8px 0', fontWeight: 500 }}>{s.title}</td>
                          <td style={{ padding: '8px 0', color: 'var(--ash2)' }}>{s.speaker}</td>
                          <td style={{ padding: '8px 0', color: 'var(--ash2)' }}>{s.date ? s.date.split('T')[0] : '-'}</td>
                          <td style={{ padding: '8px 0' }}><span className="admin-tag admin-tag-green">Published</span></td>
                        </tr>
                      ))}
                      {sermons.length === 0 && <tr><td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ash)' }}>No sermons uploaded yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ):activeTab === 'broadcasts' ? (
            <div className="space-y-5">
              {/* Go-live card */}
              <div className="admin-card p-5">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 4, background: live ? 'var(--flame)' : 'var(--mahog)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Radio className="w-7 h-7" style={{ color: live ? '#fff' : 'var(--ash)' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: '.04em' }}>{live ? 'On Air' : 'Off Air'}</div>
                      <div style={{ fontSize: 12, color: 'var(--ash2)', marginTop: 2 }}>{live ? (live.title || 'Live Broadcast') : 'No active broadcast'}</div>
                      {live && <div className="font-mono" style={{ fontSize: 11, color: 'var(--flame3)', marginTop: 2 }}>{formatDuration(liveElapsed)} elapsed</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {live ? (
                      <button onClick={endLiveBroadcast} disabled={bcActionLoading} className="btn btn-red">
                        {bcActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />} Stop
                      </button>
                    ) : (
                      <button className="btn btn-flame"><Play className="w-3.5 h-3.5" /> Go Live</button>
                    )}
                  </div>
                </div>
                {/* VU meter */}
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 3 }}>
                  <VUMeter active={!!live} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ash2)' }}>
                    <span>L</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>-12 dB</span>
                    <span>R</span>
                  </div>
                </div>
                {/* Signal quality */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 12 }}>
                  <SignalBars label="L" value={live ? 92 : 0} />
                  <SignalBars label="R" value={live ? 88 : 0} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--ash2)', width: 40, textAlign: 'right' }}>Bit rate</span>
                    <span style={{ fontSize: 10, color: 'var(--cream2)', fontWeight: 600 }}>{live ? '128 kbps' : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--ash2)', width: 40, textAlign: 'right' }}>Buffer</span>
                    <span style={{ fontSize: 10, color: 'var(--cream2)', fontWeight: 600 }}>{live ? '0.4s' : '—'}</span>
                  </div>
                </div>
              </div>
              <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'var(--ash)' }}>Loading...</div>}>
                <BroadcastManager broadcasts={broadcasts as any} onRefresh={refresh} />
              </Suspense>
            </div>
          ) : activeTab === 'users' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>User Management</div>
              {loading ? (
                <div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: 'var(--flame)' }} /><p className="mt-3 text-xs" style={{ color: 'var(--ash)' }}>Loading users...</p></div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center"><Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--line)' }} /><p className="text-xs" style={{ color: 'var(--ash)' }}>No users yet</p></div>
              ) : null}
              <div className="space-y-1">
                {users.map(u => u ? (
                  <div key={u.id} className="px-4 py-3 rounded-lg flex items-center justify-between" style={{ transition: 'all .13s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div><p className="text-xs font-medium">{u.name || u.email}</p><p className="text-[10px]" style={{ color: 'var(--ash)' }}>{u.email}</p></div>
                    <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value)} className="text-xs rounded-md px-2.5 py-1 outline-none" style={{ background: 'var(--coal)', border: '1px solid var(--line)', color: 'var(--cream)' }}>
                      <option value="listener">Listener</option><option value="broadcaster">Broadcaster</option><option value="admin">Admin</option>
                    </select>
                  </div>
                ) : null)}
              </div>
            </div>
          ) : activeTab === 'sermons' ? (
            <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'var(--ash)' }}>Loading...</div>}>
              <SermonManager sermons={sermons as any} onRefresh={refresh} />
            </Suspense>
          ) : activeTab === 'chat' ? (
            <ChatSupervisor messages={chatMessages} onRefresh={fetchChat} />
          ) : activeTab === 'settings' ? (
            <AdminSettings />
          ) : activeTab === 'music' ? (
            <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'var(--ash)' }}>Loading...</div>}>
              <MusicManager music={musicTracks as any} onRefresh={refresh} />
            </Suspense>
          ) : activeTab === 'speakers' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Guest Speaker Spotlight</div>
              <GuestSpeakerManager />
            </div>
          ) : activeTab === 'prayer' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Prayer Wall Management</div>
              <PrayerManager />
            </div>
          ) : activeTab === 'testimonies' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Testimony Management</div>
              <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'var(--ash)' }}>Loading...</div>}>
                <TestimonyManager />
              </Suspense>
            </div>
          ) : activeTab === 'events' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Event Management</div>
              <EventManager />
            </div>
          ) : activeTab === 'dailyverse' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Daily Word & Push Notifications</div>
              <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'var(--ash)' }}>Loading...</div>}>
                <DailyVerseManager />
              </Suspense>
            </div>
          ) : activeTab === 'print' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Print Media</div>
              <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'var(--ash)' }}>Loading...</div>}>
                <PrintManager items={printMedia as any} onRefresh={refresh} />
              </Suspense>
            </div>
          ) : activeTab === 'playlists' ? (
            <div className="admin-card p-4">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Sermon Playlists</div>
              <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'var(--ash)' }}>Loading...</div>}>
                <SermonPlaylistManager onRefresh={refresh} />
              </Suspense>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

