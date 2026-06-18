import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Users, Radio, Headphones, LayoutDashboard, Signal } from 'lucide-react'

interface Broadcast {
  id: string
  title: string
  status: string
  started_at?: string
  ended_at?: string
  broadcaster_id: string
}

interface User {
  id: string
  email: string
  name?: string
  role: string
  created_at: string
}

interface Stats {
  total: number
  live: number
  ended: number
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, live: 0, ended: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'users'>('broadcasts')

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return }
    fetchData()
  }, [user, navigate])

  async function fetchData() {
    try {
      const [broadcastsRes, statsRes, usersRes] = await Promise.all([
        axios.get('/api/broadcasts'),
        axios.get('/api/broadcasts/stats/overview'),
        axios.get('/api/auth/users')
      ])
      setBroadcasts(broadcastsRes.data.broadcasts)
      setStats(statsRes.data)
      setUsers(usersRes.data.users)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      await axios.put(`/api/auth/users/${userId}/role`, { role: newRole })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u))
    } catch (err) {
      console.error('Failed to update user role:', err)
    }
  }


  if (!user || user.role !== 'admin') return null

  const tabBase = 'px-4 py-2 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2'

  return (
    <div className="min-h-screen py-8 lg:py-12" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--gold)' }}
          >
            <LayoutDashboard className="w-8 h-8" style={{ color: '#1b1208' }} />
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            Admin Dashboard
          </h1>
          <p className="mt-2" style={{ color: 'var(--dim)' }}>
            Manage broadcasts and monitor platform activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,162,39,0.08)' }}>
                <Radio className="w-6 h-6" style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--dim)' }}>Total Broadcasts</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.08)' }}>
                <Signal className="w-6 h-6" style={{ color: '#4ade80' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--dim)' }}>Live Now</p>
                <p className="text-3xl font-bold">{stats.live}</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(243,238,228,0.06)' }}>
                <Headphones className="w-6 h-6" style={{ color: 'var(--dim)' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--dim)' }}>Ended</p>
                <p className="text-3xl font-bold">{stats.ended}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={tabBase}
            style={activeTab === 'broadcasts' ? { background: 'var(--gold)', color: '#1b1208' } : { color: 'var(--dim)' }}
            onMouseEnter={e => activeTab !== 'broadcasts' && (e.currentTarget.style.color = 'var(--parchment)')}
            onMouseLeave={e => activeTab !== 'broadcasts' && (e.currentTarget.style.color = 'var(--dim)')}
          >
            <Radio className="w-4 h-4" />
            Broadcasts
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={tabBase}
            style={activeTab === 'users' ? { background: 'var(--gold)', color: '#1b1208' } : { color: 'var(--dim)' }}
            onMouseEnter={e => activeTab !== 'users' && (e.currentTarget.style.color = 'var(--parchment)')}
            onMouseLeave={e => activeTab !== 'users' && (e.currentTarget.style.color = 'var(--dim)')}
          >
            <Users className="w-4 h-4" />
            Users ({users.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'broadcasts' ? (
          <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)', background: 'rgba(243,238,228,0.03)' }}>
              <h2 className="font-semibold">Recent Broadcasts</h2>
            </div>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--gold)' }} />
                <p className="mt-4 text-sm" style={{ color: 'var(--dim)' }}>Loading broadcasts...</p>
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="p-12 text-center">
                <Radio className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--line)' }} />
                <p style={{ color: 'var(--dim)' }}>No broadcasts yet</p>
              </div>
            ) : (
              <div>
                {broadcasts.map(b => (
                  <div
                    key={b.id}
                    className="px-6 py-4 flex items-center justify-between transition-colors"
                    style={{ borderBottom: '1px solid var(--line)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(243,238,228,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <p className="font-medium">{b.title}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>
                        {b.started_at ? new Date(b.started_at).toLocaleString() : 'Scheduled'}
                      </p>
                    </div>
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={
                        b.status === 'live'
                          ? { background: 'rgba(201,162,39,0.12)', color: 'var(--gold)' }
                          : b.status === 'ended'
                            ? { background: 'rgba(243,238,228,0.06)', color: 'var(--dim)' }
                            : { background: 'rgba(234,179,8,0.12)', color: '#eab308' }
                      }
                    >
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)', background: 'rgba(243,238,228,0.03)' }}>
              <h2 className="font-semibold">User Management</h2>
            </div>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--gold)' }} />
                <p className="mt-4 text-sm" style={{ color: 'var(--dim)' }}>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--line)' }} />
                <p style={{ color: 'var(--dim)' }}>No users yet</p>
              </div>
            ) : (
              <div>
                {users.map(u => (
                  <div
                    key={u.id}
                    className="px-6 py-4 flex items-center justify-between transition-colors"
                    style={{ borderBottom: '1px solid var(--line)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(243,238,228,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <p className="font-medium">{u.name || u.email}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>{u.email}</p>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      className="text-sm rounded-lg px-3 py-1.5 border"
                      style={{
                        background: 'var(--ink)',
                        borderColor: 'var(--line)',
                        color: 'var(--parchment)'
                      }}
                    >
                      <option value="listener" style={{ background: 'var(--ink-2)' }}>Listener</option>
                      <option value="broadcaster" style={{ background: 'var(--ink-2)' }}>Broadcaster</option>
                      <option value="admin" style={{ background: 'var(--ink-2)' }}>Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
