import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SearchOverlay from './SearchOverlay'
import {
  Search, Users, Menu, X, LayoutDashboard, LogOut, LogIn
} from 'lucide-react'

function LogoSVG({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-label="Sure Word Radio logo">
      <circle cx="20" cy="20" r="19" fill="#2f1206" stroke="#E05A1A" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="#F5A623" strokeWidth=".8" strokeDasharray="2 3" />
      <rect x="16.5" y="9" width="7" height="13" rx="3.5" fill="#E05A1A" />
      <line x1="20" y1="22" x2="20" y2="27" stroke="#F5A623" strokeWidth="1.5" />
      <line x1="16" y1="27" x2="24" y2="27" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="13" x2="23" y2="13" stroke="#fff" strokeWidth=".7" opacity=".5" />
      <line x1="17" y1="15.5" x2="23" y2="15.5" stroke="#fff" strokeWidth=".7" opacity=".5" />
      <line x1="17" y1="18" x2="23" y2="18" stroke="#fff" strokeWidth=".7" opacity=".5" />
    </svg>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Radio', path: '/live' },
    { label: 'Sermons', path: '/archive' },
    { label: 'Series', path: '/series' },
    { label: 'Print', path: '/print' },
    { label: 'Give', path: '/donate' },
    { label: 'About', path: '/about' },
  ]

  const active = (p: string) => location.pathname === p

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(22,6,0,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--line)' }}>
      <div className="max-w-[1200px] mx-auto px-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, gap: 20 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <LogoSVG size={38} />
          <div style={{ lineHeight: 1 }} className="hidden sm:block">
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '.06em', color: 'var(--white)' }}>Sure Word Radio</div>
            <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ash)' }}>surewordradio.org</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex" style={{ gap: 24, fontSize: 14, fontWeight: 500 }}>
          {navItems.map(item => (
            <Link key={item.label} to={item.path}
              style={{ color: active(item.path) ? 'var(--sunrise)' : 'var(--ash)', transition: 'color .15s' }}
              className="hover:!text-[var(--sunrise)]">
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSearchOpen(true)} className="hidden lg:block" style={{ color: 'var(--ash)', transition: 'color .15s' }}>
            <Search style={{ width: 18, height: 18 }} />
          </button>
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

          {/* Avatar */}
          <div ref={avatarRef} className="relative">
            <button onClick={() => setAvatarOpen(!avatarOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--flame)', color: '#fff' }}>
              {user ? user.name?.[0]?.toUpperCase() || 'A' : <Users style={{ width: 16, height: 16 }} />}
            </button>
            {avatarOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-lg overflow-hidden shadow-xl"
                style={{ background: 'var(--coal)', border: '1px solid var(--line)' }}>
                {user ? (
                  <>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)' }}>{user.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>{user.email}</p>
                    </div>
                    <Link to={user.role === 'admin' || user.role === 'broadcaster' ? '/admin' : '/dashboard'}
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                      style={{ color: 'var(--cream)', fontSize: 13 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--mahog)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <LayoutDashboard style={{ width: 16, height: 16, color: 'var(--ash)' }} /> Dashboard
                    </Link>
                    <button onClick={() => { logout(); setAvatarOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                      style={{ color: 'var(--cream)', fontSize: 13 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--mahog)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <LogOut style={{ width: 16, height: 16, color: 'var(--ash)' }} /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                    style={{ color: 'var(--cream)', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--mahog)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <LogIn style={{ width: 16, height: 16, color: 'var(--ash)' }} /> Sign In
                  </Link>
                )}
              </div>
            )}
          </div>

          <Link to="/live" className="hidden lg:flex btn btn-flame btn-sm items-center">
            <span className="ldot" style={{ width: 6, height: 6 }}></span> Listen Live
          </Link>

          {/* Hamburger */}
          <button className="lg:hidden p-2" style={{ color: 'var(--ash)' }} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t" style={{ background: 'var(--coal)', borderColor: 'var(--line)' }}>
          <div className="px-4 py-3 space-y-1">
            {navItems.map(item => {
              const isActive = active(item.path)
              return (
                <Link key={item.label} to={item.path}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-colors"
                  style={{ fontSize: 14, fontWeight: 500, color: isActive ? 'var(--sunrise)' : 'var(--ash)', background: isActive ? 'var(--mahog)' : 'transparent' }}>
                  {item.label}
                </Link>
              )
            })}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
              <Link to="/live" className="btn btn-flame btn-sm w-full justify-center mt-2">
                <span className="ldot" style={{ width: 6, height: 6 }}></span> Listen Live
              </Link>
            </div>
            {user ? (
              <div className="flex gap-2 pt-2">
                <Link to={user.role === 'admin' || user.role === 'broadcaster' ? '/admin' : '/dashboard'}
                  className="flex-1 btn btn-ghost btn-sm justify-center">Dashboard</Link>
                <button onClick={() => { logout(); setMenuOpen(false); }}
                  className="flex-1 btn btn-ghost btn-sm justify-center">Sign Out</button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-ghost btn-sm w-full justify-center mt-2">Sign In</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

