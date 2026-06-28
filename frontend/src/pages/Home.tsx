import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import {
  useActiveBroadcast, useFeaturedSermons, usePrintMedia,
  useRadioCurrent
} from '../lib/api'
import type { Sermon } from '../lib/api'
import StructuredData from '../components/StructuredData'
import { Play, Pause, Headphones, BookOpen, Download } from 'lucide-react'

/* ── Logo SVGs ── */
function SignalLogo({ size = 100 }: { size?: number }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true">
      <circle cx="30" cy="30" r="29" fill="#2f1206" stroke="#E05A1A" strokeWidth="2" />
      <circle cx="30" cy="30" r="20" fill="none" stroke="#F5A623" strokeWidth="1" strokeDasharray="3 4" />
      <rect x="24" y="12" width="12" height="21" rx="6" fill="#E05A1A" />
      <line x1="30" y1="33" x2="30" y2="40" stroke="#F5A623" strokeWidth="2" />
      <line x1="23" y1="40" x2="37" y2="40" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="19" x2="35" y2="19" stroke="#fff" strokeWidth="1" opacity=".5" />
      <line x1="25" y1="23" x2="35" y2="23" stroke="#fff" strokeWidth="1" opacity=".5" />
      <line x1="25" y1="27" x2="35" y2="27" stroke="#fff" strokeWidth="1" opacity=".5" />
    </svg>
  )
}

/* ── Waveform bars ── */
function Waveform() {
  const bars = [40,70,90,50,65,35,80,55,70,40,85,60,45,75,50,30,65]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 40, margin: '14px 0' }}>
      {bars.map((h, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 2, background: 'var(--flame)', display: 'block',
          height: `${h}%`, animation: `wv ${1 + (i % 3) * 0.25}s ease-in-out infinite`
        }} />
      ))}
    </div>
  )
}

/* ── Sermon list item ── */
function SermonListItem({ s, index, onPlay }: { s: Sermon; index: number; onPlay: () => void }) {
  const { currentTrack, isPlaying, togglePlay } = useAudioPlayer()
  const isCurrent = currentTrack?.id === s.id
  const active = isCurrent && isPlaying

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, background: 'var(--coal)',
      border: '1px solid var(--line)', borderRadius: 6, padding: '12px 14px',
      transition: 'border-color .15s, background .15s', cursor: 'pointer'
    }}
    className="hover-lift"
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--flame)'; e.currentTarget.style.background = 'var(--mahog)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--coal)' }}>
      <div style={{
        fontFamily: "'Bebas Neue',sans-serif", fontSize: 22,
        color: isCurrent ? 'var(--flame)' : 'var(--ash)', minWidth: 28, textAlign: 'center'
      }}>
        {active ? '▶' : index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--flame)', marginBottom: 2 }}>
          {s.series || 'Sermon'}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ash)' }}>{s.speaker}</div>
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: 'var(--ash)' }}>
        {s.duration ? `${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, '0')}` : '—'}
      </div>
      <button onClick={(e) => { e.stopPropagation(); active ? togglePlay() : onPlay() }}
        className="btn btn-ghost btn-sm"
        style={{ padding: '4px 10px', fontSize: 11 }}>
        {active ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}

/* ── Print card ── */
function PrintThumb({ variant }: { variant: 'a' | 'b' | 'c' | 'd' }) {
  const grads = {
    a: 'linear-gradient(145deg,#2f1206,#e05a1a)',
    b: 'linear-gradient(145deg,#1a0900,#f5a623)',
    c: 'linear-gradient(145deg,#230d02,#c94c10)',
    d: 'linear-gradient(145deg,#3b1709,#e8cfa0)',
  }
  const icons = { a: '📰', b: '📖', c: '🎓', d: '✝️' }
  return (
    <div style={{
      height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', background: grads[variant]
    }}>
      <span style={{ fontSize: 44, opacity: .7 }}>{icons[variant]}</span>
    </div>
  )
}

export default function Home() {
  usePageTitle('The Whole Word to the Whole World')
  const { data: broadcast } = useActiveBroadcast()
  const { data: sermons = [] } = useFeaturedSermons()
  const { data: printItems = [] } = usePrintMedia()
  const { data: radioData } = useRadioCurrent()
  const { playTrack, togglePlay, currentTrack, isPlaying } = useAudioPlayer()
  const isLive = broadcast?.status === 'live'

  const nowPlaying = radioData?.current
  const npActive = currentTrack && isPlaying

  return (
    <div style={{ background: 'var(--ember)', color: 'var(--cream)' }}>
      <StructuredData />

      {/* ══ HERO ══ */}
      <section style={{
        position: 'relative',
        backgroundImage: 'linear-gradient(to right, rgba(22,6,0,.92) 0%, rgba(22,6,0,.72) 55%, rgba(22,6,0,.55) 100%), url(https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1600&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '80px 24px 70px'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="hero-grid">
          {/* Left */}
          <div>
            <div className="eyebrow">Online 24 / 7</div>
            <h1 className="font-bebas" style={{ fontSize: 'clamp(56px,7vw,88px)', lineHeight: .95, margin: '14px 0 8px', color: 'var(--white)' }}>
              THE <span style={{ color: 'var(--flame)' }}>WHOLE</span> WORD
            </h1>
            <p className="font-serif" style={{ fontSize: 'clamp(15px,1.8vw,19px)', color: 'var(--cream2)', fontStyle: 'italic', margin: '6px 0 28px' }}>
              To the whole world — live from the studio, anytime you need it.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to={isLive && broadcast ? `/live/${broadcast.id}` : '/live'} className="btn btn-flame">
                <Headphones style={{ width: 16, height: 16 }} /> Listen Live Now
              </Link>
              <Link to="/archive" className="btn btn-out">Browse Sermons</Link>
            </div>
          </div>

          {/* Right: signal + now playing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center' }}>
            {/* Signal animation */}
            <div style={{
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 160, height: 160, flexShrink: 0, marginBottom: 24
            }}>
              <div className="signal-ring" style={{ width: '100%', height: '100%', animationDelay: '0s', opacity: .5 }} />
              <div className="signal-ring" style={{ width: '130%', height: '130%', animationDelay: '1s', opacity: .3 }} />
              <div className="signal-ring" style={{ width: '160%', height: '160%', animationDelay: '2s', opacity: .15 }} />
              <div style={{
                width: 100, height: 100, borderRadius: '50%', background: 'var(--panel)',
                border: '2px solid var(--flame)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1
              }}>
                <SignalLogo size={72} />
              </div>
            </div>

            {/* Now Playing Card */}
            <div style={{ width: '100%', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(135deg,var(--flame2),var(--flame),var(--sunrise))',
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div className="font-bebas" style={{ fontSize: 15, letterSpacing: '.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ldot" style={{ width: 6, height: 6 }} /> Now Playing
                </div>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{isLive ? 'LIVE BROADCAST' : 'ON AIR'}</span>
              </div>
              <div style={{ padding: 18 }}>
                <div className="font-serif" style={{ fontSize: 19, marginBottom: 4, color: 'var(--white)' }}>
                  {nowPlaying?.title || broadcast?.title || 'Grace That Never Fails'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ash)' }}>
                  {nowPlaying?.speaker || broadcast?.speaker || 'Pastor Emmanuel Osei'}
                  {nowPlaying?.scriptureReference ? ` · ${nowPlaying.scriptureReference}` : ''}
                </div>
                <Waveform />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--ash)' }}>24:18</span>
                  <div style={{ flex: 1, height: 3, background: 'var(--mahog)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '44%', background: 'linear-gradient(to right,var(--flame),var(--sunrise))', borderRadius: 2 }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--ash)' }}>55:40</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  {['prev','rewind','play','forward','next'].map((ctrl) => (
                    <button key={ctrl}
                      style={{
                        background: ctrl === 'play' ? 'var(--flame)' : 'transparent',
                        color: ctrl === 'play' ? '#fff' : 'var(--cream2)',
                        border: 'none', borderRadius: '50%', padding: ctrl === 'play' ? 0 : 6,
                        width: ctrl === 'play' ? 48 : 32, height: ctrl === 'play' ? 48 : 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'color .15s, background .15s'
                      }}
                      onClick={() => {
                        if (ctrl === 'play') {
                          if (nowPlaying) {
                            if (currentTrack?.id === nowPlaying.itemId) togglePlay()
                            else playTrack({ id: nowPlaying.itemId, title: nowPlaying.title, speaker: nowPlaying.speaker, audioUrl: nowPlaying.audioUrl, thumbnail: nowPlaying.thumbnailUrl, trackType: 'sermon' })
                          }
                        }
                      }}>
                      {ctrl === 'play' ? (
                        npActive
                          ? <Pause style={{ width: 18, height: 18 }} />
                          : <Play style={{ width: 18, height: 18 }} />
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ash)' }}>
                          {ctrl === 'prev' ? '⏮' : ctrl === 'rewind' ? '⏪' : ctrl === 'forward' ? '⏩' : '⏭'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ══ PROGRAM SCHEDULE ══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: 1, background: 'var(--line)', margin: '56px 0' }} />
      </div>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow">Today on air</div>
          <h2 className="font-bebas" style={{ fontSize: 'clamp(28px,3.5vw,38px)', margin: '8px 0 6px' }}>Program Schedule</h2>
          <p style={{ color: 'var(--ash)', fontSize: 15, maxWidth: 520 }}>
            What's broadcasting on Sure Word Radio today. Tune in or catch up in the archive.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {[
            { hr: '6:00', ap: 'AM', title: 'Morning Devotion', meta: 'Pastor Agyei · 45 min', now: false },
            { hr: '8:00', ap: 'AM', title: 'Praise & Worship Hour', meta: 'Worship team · 60 min', now: false },
            { hr: '10:00', ap: 'AM', title: nowPlaying?.title || 'Grace That Never Fails', meta: `${nowPlaying?.speaker || 'Pastor Osei'} · Romans 5`, now: true },
            { hr: '12:00', ap: 'PM', title: 'Midday Prayer', meta: 'Elder Grace · 30 min', now: false },
            { hr: '2:00', ap: 'PM', title: 'Faith & Family', meta: 'Various speakers · 60 min', now: false },
            { hr: '7:00', ap: 'PM', title: 'Evening Word', meta: 'Pastor Osei · 45 min', now: false },
          ].map((s) => (
            <div key={s.hr + s.title} style={{
              background: s.now ? 'var(--mahog)' : 'var(--coal)',
              border: '1px solid var(--line)', borderRadius: 6, padding: 16,
              display: 'flex', gap: 14, alignItems: 'flex-start',
              transition: 'border-color .2s', cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--flame)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = s.now ? 'var(--flame)' : 'var(--line)'}>
              <div style={{ textAlign: 'center', minWidth: 48 }}>
                <div className="font-bebas" style={{ fontSize: 22, color: 'var(--sunrise)', lineHeight: 1 }}>{s.hr}</div>
                <div style={{ fontSize: 11, color: 'var(--ash)' }}>{s.ap}</div>
              </div>
              <div>
                {s.now && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'var(--flame)', color: '#fff', fontSize: 10, fontWeight: 700,
                    letterSpacing: '.06em', padding: '3px 8px', borderRadius: 2, marginBottom: 5
                  }}>
                    <span className="ldot" style={{ width: 5, height: 5 }} /> LIVE
                  </div>
                )}
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 2, color: 'var(--white)' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ash)' }}>{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SERMON PLAYLIST ══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: 1, background: 'var(--line)', margin: '56px 0' }} />
      </div>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow">Sermon library</div>
          <h2 className="font-bebas" style={{ fontSize: 'clamp(28px,3.5vw,38px)', margin: '8px 0 6px' }}>Build Your Playlist</h2>
          <p style={{ color: 'var(--ash)', fontSize: 15, maxWidth: 520 }}>
            Add sermons to a queue that plays end-to-end for however long you need. Set it and let it run.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'flex-start' }} className="playlist-grid">
          {/* Sermon list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sermons.slice(0, 6).map((s, i) => (
              <SermonListItem key={s.id} s={s} index={i}
                onPlay={() => playTrack({ id: s.id, title: s.title, speaker: s.speaker || 'Pastor', audioUrl: s.audio_url || '', thumbnail: s.thumbnail_url, trackType: 'sermon' })} />
            ))}
            {sermons.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ash)' }}>
                <BookOpen style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: .4 }} />
                <p>No sermons uploaded yet.</p>
              </div>
            )}
          </div>

          {/* Queue card */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8,
            overflow: 'hidden', position: 'sticky', top: 80
          }}>
            <div style={{
              background: 'linear-gradient(135deg,var(--mahog),var(--panel))',
              padding: '14px 16px', borderBottom: '1px solid var(--line)'
            }}>
              <h3 className="font-bebas" style={{ fontSize: 20, letterSpacing: '.06em' }}>My Playlist</h3>
              <div style={{ fontSize: 11.5, color: 'var(--ash)', marginTop: 2 }}>Plays continuously</div>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: 'var(--ash)' }}>Play for:</span>
                <select className="input-dark" style={{ padding: '6px 10px', fontSize: 13, borderRadius: 4 }}>
                  <option>1 hour</option>
                  <option>2 hours</option>
                  <option>3 hours</option>
                  <option>All day</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, maxHeight: 280, overflowY: 'auto' }}>
                {sermons.slice(0, 3).map((s) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    background: 'var(--mahog)', borderRadius: 4
                  }}>
                    <span style={{ color: 'var(--ash)', fontSize: 14, cursor: 'grab' }}>⠿</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--white)' }}>{s.title}</div>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--ash)' }}>
                        {s.duration ? `${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, '0')}` : '—'}
                      </div>
                    </div>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--ash)', fontSize: 14, padding: 2, transition: 'color .15s' }}
                      className="hover:!text-[var(--flame)]">✕</button>
                  </div>
                ))}
                {sermons.length === 0 && <div style={{ color: 'var(--ash)', fontSize: 12, padding: 8 }}>No sermons in queue yet.</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, borderTop: '1px solid var(--line)', paddingTop: 10, marginBottom: 12 }}>
                <span>Total runtime</span>
                <span className="font-mono" style={{ color: 'var(--sunrise)' }}>—</span>
              </div>
              <button className="btn btn-sun" style={{ width: '100%' }}>▶ Play Playlist</button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRINT MEDIA ══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: 1, background: 'var(--line)', margin: '56px 0' }} />
      </div>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow">Print media</div>
          <h2 className="font-bebas" style={{ fontSize: 'clamp(28px,3.5vw,38px)', margin: '8px 0 6px' }}>Read & Download</h2>
          <p style={{ color: 'var(--ash)', fontSize: 15, maxWidth: 520 }}>
            Church bulletins, devotional magazines, and study guides — free to download anytime.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 18 }}>
          {(printItems.length > 0 ? printItems : [
            { id: '1', title: 'June Weekly Bulletin', description: 'Jun 28, 2026 · 4 pages', category: 'bulletin', pdf_url: '#' },
            { id: '2', title: 'Sure Word Monthly', description: 'June 2026 · 28 pages', category: 'magazine', pdf_url: '#' },
            { id: '3', title: 'Romans 5 Study Guide', description: 'May 2026 · 12 pages', category: 'study-guide', pdf_url: '#' },
            { id: '4', title: 'Daily Devotional', description: 'Q2 2026 · 90 days', category: 'devotional', pdf_url: '#' },
          ]).slice(0, 4).map((item, i) => {
            const variants: Array<'a' | 'b' | 'c' | 'd'> = ['a', 'b', 'c', 'd']
            return (
              <div key={item.id} style={{
                background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 6,
                overflow: 'hidden', transition: 'border-color .2s, transform .2s', cursor: 'pointer'
              }}
              className="hover-lift"
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sunrise)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <PrintThumb variant={variants[i % 4]} />
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2, color: 'var(--white)' }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ash)' }}>{item.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-out btn-sm">
                      <Download style={{ width: 14, height: 14 }} /> Download
                    </a>
                    <span style={{ fontSize: 11, color: 'var(--ash)' }}>PDF</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══ CTA STRIP ══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          background: 'linear-gradient(135deg,var(--mahog),var(--panel))',
          border: '1px solid var(--line)', borderRadius: 8, padding: '40px 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, flexWrap: 'wrap', marginBottom: 60
        }}>
          <div>
            <h2 className="font-bebas" style={{ fontSize: 'clamp(24px,3vw,34px)', marginBottom: 6 }}>Never miss a word</h2>
            <p style={{ color: 'var(--ash)', fontSize: 15 }}>
              Get notified when we go live, new sermons drop, and fresh resources arrive — right to your phone.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-flame">Get notifications</button>
            <button className="btn btn-ghost">Visit surewordradio.org</button>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '40px 24px', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="font-bebas" style={{ fontSize: 18, letterSpacing: '.06em' }}>Sure Word Radio</div>
          <div style={{ fontSize: 11, color: 'var(--ash)' }}>The whole word to the whole world</div>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--ash)' }}>
          <Link to="/live" style={{ transition: 'color .15s' }} className="hover:!text-[var(--sunrise)]">Radio</Link>
          <Link to="/archive" style={{ transition: 'color .15s' }} className="hover:!text-[var(--sunrise)]">Sermons</Link>
          <Link to="/print" style={{ transition: 'color .15s' }} className="hover:!text-[var(--sunrise)]">Print</Link>
          <Link to="/donate" style={{ transition: 'color .15s' }} className="hover:!text-[var(--sunrise)]">Give</Link>
          <Link to="/about" style={{ transition: 'color .15s' }} className="hover:!text-[var(--sunrise)]">Contact</Link>
        </div>
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--ash)' }}>© 2026 Sure Word Media</div>
      </footer>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .playlist-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
