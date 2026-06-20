import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mic2, Search, Heart, Users, Menu, X } from 'lucide-react'

export default function Navbar() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchQ, setSearchQ] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Live Radio', path: '/live' },
    { label: 'Sermons', path: '/archive' },
    { label: 'Podcasts', path: '/podcasts' },
    { label: 'Prayer Wall', path: '/prayer' },
    { label: 'Events', path: '/events' },
    { label: 'About Us', path: '/about' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgba(243,238,228,0.08)] bg-[#14141a]/95 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full border border-[#c9a227]/40 flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-[#c9a227]" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium text-white tracking-wide">ZIONITEFM</div>
            <div className="text-[9px] text-[#9c958a] tracking-widest uppercase">The Voice of Redemption</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <Link key={item.label} to={item.path}
                className={`text-xs font-medium transition-colors ${active ? 'text-[#c9a227]' : 'text-[#9c958a] hover:text-white'}`}>
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-[#1c1d24] rounded-full px-3 py-1.5 border border-[rgba(243,238,228,0.08)]">
            <Search className="w-3.5 h-3.5 text-[#9c958a] mr-2" />
            <input type="text" placeholder="Search sermons, topics, speakers..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-[#9c958a] outline-none w-44" />
          </div>
          {user ? (
            <Link to="/admin" className="w-8 h-8 rounded-full bg-[#c9a227] flex items-center justify-center text-[#1b1208] text-xs font-bold">
              {user.name?.[0]?.toUpperCase() || 'A'}
            </Link>
          ) : (
            <Link to="/login" className="flex items-center gap-1 text-[#c9a227] hover:text-[#e0bd5a] transition-colors">
              <Users className="w-4 h-4" />
            </Link>
          )}
          <button className="hidden md:flex items-center gap-1.5 bg-[#c9a227] hover:bg-[#e0bd5a] text-[#1b1208] text-xs font-medium px-4 py-1.5 rounded-full transition-colors">
            <Heart className="w-3.5 h-3.5" /> Donate
          </button>

          {/* Mobile menu toggle */}
          <button className="md:hidden text-[#9c958a]" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[rgba(243,238,228,0.08)] px-4 py-3 space-y-2" style={{ background: 'var(--ink-2)' }}>
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <Link key={item.label} to={item.path} onClick={() => setMenuOpen(false)}
                className={`block text-sm py-2 ${active ? 'text-[#c9a227]' : 'text-[#9c958a]'}`}>
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
