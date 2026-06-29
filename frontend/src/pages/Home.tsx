import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import {
  useActiveBroadcast, useFeaturedSermons, usePrintMedia,
  useRadioCurrent
} from '../lib/api'
import type { Sermon } from '../lib/api'
import StructuredData from '../components/StructuredData'
import { Play, Pause, BookOpen, Download } from 'lucide-react'
import { useState, useEffect } from 'react'

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

/* ── Spectrum bars (active music visualizer) ── */
function SpectrumBars() {
  const COUNT = 80
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: COUNT }, () => Math.random() * 20 + 6)
  )

  useEffect(() => {
    const targets = Array.from({ length: COUNT }, () => Math.random() * 80 + 10)
    const speeds = Array.from({ length: COUNT }, () => Math.random() * 0.15 + 0.04)

    const id = setInterval(() => {
      setHeights(prev => {
        const next = prev.map((h, i) => {
          // Pick a new target occasionally
          if (Math.random() < 0.08) {
            targets[i] = Math.random() * 85 + 6
          }
          // Smoothly interpolate toward target
          const diff = targets[i] - h
          return h + diff * speeds[i]
        })
        return next
      })
    }, 60)

    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '28px 0 0', overflow: 'hidden' }}>
      <div style={{
        fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase',
        color: 'var(--ash)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span>Live frequency</span>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56, width: '100%' }}>
        {heights.map((h, i) => (
          <span key={i} style={{
            flex: 1, borderRadius: '1px 1px 0 0',
            background: 'linear-gradient(to top,var(--flame2),var(--sunrise))',
            opacity: .8, minHeight: 3,
            height: `${Math.max(3, h)}%`,
            transition: 'height 60ms linear'
          }} />
        ))}
      </div>
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
      border: '1px solid var(--line)', borderRadius: 4, padding: '13px 16px',
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
        position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', overflow: 'hidden', paddingTop: 64,
        backgroundImage: 'linear-gradient(to bottom, rgba(15,4,0,.94) 0%, rgba(15,4,0,.88) 30%, rgba(15,4,0,.93) 70%, rgba(15,4,0,.98) 100%), url(https://images.unsplash.com/photo-1487089427585-85563b1049f3?w=1600&q=80)',
        backgroundSize: 'cover', backgroundPosition: 'center'
      }}>
        {/* Stage glow — warm light from above */}
        <div style={{
          position: 'absolute', top: -180, left: '50%', transform: 'translateX(-50%)',
          width: 1100, height: 900,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(224,90,26,.22) 0%, rgba(245,166,35,.06) 40%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0
        }} />

        {/* Ghost watermark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(120px,20vw,280px)',
          letterSpacing: '.06em', whiteSpace: 'nowrap', color: 'var(--flame)', opacity: .04,
          pointerEvents: 'none', zIndex: 0, userSelect: 'none', lineHeight: 1
        }}>SURE WORD</div>

        {/* Diagonal accent band */}
        <div style={{
          position: 'absolute', top: 0, right: -100,
          width: 520, height: '100%',
          background: 'linear-gradient(135deg, transparent 40%, rgba(224,90,26,.055) 40%, rgba(224,90,26,.055) 60%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '0 32px', width: '100%' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 460px', gap: 0,
            alignItems: 'center', minHeight: 'calc(100vh - 64px - 110px)', padding: '60px 0 0'
          }} className="hero-stage">

            {/* LEFT */}
            <div style={{ paddingRight: 40 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'rgba(224,90,26,.1)', border: '1px solid rgba(224,90,26,.25)',
                borderLeft: '3px solid var(--flame)', padding: '8px 16px', marginBottom: 32,
                fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase',
                color: 'var(--flame3)'
              }}>
                <span className="ldot" />
                Broadcasting 24 hours · 7 days a week
              </div>

              {/* Single-line headline */}
              <h1 style={{
                fontFamily: "'Bebas Neue',sans-serif",
                fontSize: 'clamp(48px,7vw,92px)',
                lineHeight: 1, letterSpacing: '.02em',
                color: 'var(--white)'
              }}>
                THE <span style={{ color: 'var(--flame)', textShadow: '0 0 60px rgba(224,90,26,.35)' }}>WHOLE</span> WORD
              </h1>

              <p style={{
                fontFamily: "'Playfair Display',serif", fontStyle: 'italic',
                fontSize: 'clamp(16px,1.6vw,21px)', color: 'var(--cream2)',
                margin: '22px 0 34px', lineHeight: 1.5, maxWidth: 440
              }}>
                To the whole world — live from the studio,<br />
                every hour of every day.
              </p>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Link to={isLive && broadcast ? `/live/${broadcast.id}` : '/live'} className="btn btn-flame" style={{ fontSize: 15, padding: '14px 32px' }}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Listen Live
                </Link>
                <Link to="/archive" className="btn btn-out" style={{ fontSize: 15, padding: '14px 32px' }}>Browse Sermons</Link>
              </div>
            </div>

            {/* RIGHT: emblem */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'relative', width: 340, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Concentric rings */}
                <div style={{
                  position: 'absolute', borderRadius: '50%', border: '1px solid var(--flame)',
                  animation: 'ringpulse 3.5s ease-out infinite', width: 200, height: 200,
                  animationDelay: '0s', opacity: .6, '--o': .6 } as any} />
                <div style={{
                  position: 'absolute', borderRadius: '50%', border: '1px solid var(--sunrise)',
                  animation: 'ringpulse 3.5s ease-out infinite', width: 260, height: 260,
                  animationDelay: '.9s', opacity: .35, '--o': .35 } as any} />
                <div style={{
                  position: 'absolute', borderRadius: '50%', border: '1px solid var(--flame)',
                  animation: 'ringpulse 3.5s ease-out infinite', width: 320, height: 320,
                  animationDelay: '1.8s', opacity: .18, '--o': .18 } as any} />
                {/* Dotted orbit */}
                <div style={{
                  position: 'absolute', width: 240, height: 240, borderRadius: '50%',
                  border: '1px dashed rgba(245,166,35,.25)', animation: 'spin 22s linear infinite'
                }} />
                {/* Emblem core */}
                <div style={{
                  width: 170, height: 170, borderRadius: '50%',
                  background: 'radial-gradient(circle at 40% 35%, var(--panel2), var(--coal))',
                  border: '2px solid var(--flame)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2, boxShadow: '0 0 60px rgba(224,90,26,.2), inset 0 1px 0 rgba(255,240,212,.06)'
                }}>
                  <SignalLogo size={110} />
                </div>
                {/* Floating stats */}
                <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: 'var(--sunrise)', lineHeight: 1 }}>248</div>
                  <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ash2)' }}>Listening now</div>
                </div>
                <div style={{ position: 'absolute', bottom: 30, left: 10, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: 'var(--sunrise)', lineHeight: 1 }}>24/7</div>
                  <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ash2)' }}>Always on air</div>
                </div>
              </div>
            </div>
          </div>

          {/* Spectrum bars */}
          <SpectrumBars />
        </div>

        {/* Now Playing bar */}
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(15,4,0,.85)', borderTop: '1px solid var(--line2)',
          backdropFilter: 'blur(12px)', padding: '0 32px'
        }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, height: 84 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--flame)', padding: '5px 12px', borderRadius: 2,
              fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
              color: '#fff', flexShrink: 0
            }}>
              <span className="ldot" style={{ width: 6, height: 6 }} />
              NOW PLAYING
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--white)' }}>
                {nowPlaying?.title || broadcast?.title || 'Grace That Never Fails'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ash2)' }}>
                {nowPlaying?.speaker || broadcast?.speaker || 'Reverend Austin Oviawe'}
                {nowPlaying?.scriptureReference ? ` · ${nowPlaying.scriptureReference}` : ''}
              </div>
            </div>
            {/* Progress */}
            <div style={{ flex: 1, maxWidth: 320 }}>
              <div style={{ height: 3, background: 'var(--panel2)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', width: '38%', background: 'linear-gradient(to right,var(--flame),var(--sunrise))', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ash)', fontFamily: "'IBM Plex Mono',monospace" }}>
                <span>24:18</span><span>55:40</span>
              </div>
            </div>
            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--ash2)', padding: 6, transition: 'color .15s' }}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
              </button>
              <button style={{
                width: 42, height: 42, borderRadius: '50%', background: 'var(--flame)', border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s'
              }}
              onClick={() => {
                if (nowPlaying) {
                  if (currentTrack?.id === nowPlaying.itemId) togglePlay()
                  else playTrack({ id: nowPlaying.itemId, title: nowPlaying.title, speaker: nowPlaying.speaker, audioUrl: nowPlaying.audioUrl, thumbnail: nowPlaying.thumbnailUrl, trackType: 'sermon' })
                }
              }}>
                {npActive ? <Pause style={{ width: 18, height: 18 }} /> : <Play style={{ width: 18, height: 18 }} />}
              </button>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--ash2)', padding: 6, transition: 'color .15s' }}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
              </button>
            </div>
            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ash)' }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              <div style={{ width: 72, height: 3, background: 'var(--panel2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '70%', background: 'var(--ash2)', borderRadius: 2 }} />
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
          <h2 className="font-bebas" style={{ fontSize: 'clamp(34px,4vw,52px)', margin: '8px 0 6px' }}>Program Schedule</h2>
          <p style={{ color: 'var(--ash2)', fontSize: 15.5, maxWidth: 540, lineHeight: 1.6 }}>
            What's broadcasting on Sure Word Radio today. Tune in or find it in the archive after.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {[
            { hr: '6:00', ap: 'AM', title: 'Morning Devotion', meta: 'Pastor Agyei · 45 min', now: false },
            { hr: '8:00', ap: 'AM', title: 'Praise & Worship Hour', meta: 'Worship team · 60 min', now: false },
            { hr: '10:00', ap: 'AM', title: nowPlaying?.title || 'Grace That Never Fails', meta: `${nowPlaying?.speaker || 'Reverend Austin Oviawe'} · Romans 5`, now: true },
            { hr: '12:00', ap: 'PM', title: 'Midday Prayer', meta: 'Elder Grace · 30 min', now: false },
            { hr: '2:00', ap: 'PM', title: 'Faith & Family', meta: 'Various speakers · 60 min', now: false },
            { hr: '7:00', ap: 'PM', title: 'Evening Word', meta: 'Reverend Austin Oviawe · 45 min', now: false },
          ].map((s) => (
            <div key={s.hr + s.title} style={{
              background: s.now ? 'var(--mahog)' : 'var(--coal)',
              border: '1px solid var(--line)', borderRadius: 4, padding: '18px 20px',
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
          <h2 className="font-bebas" style={{ fontSize: 'clamp(34px,4vw,52px)', margin: '8px 0 6px' }}>Build Your Playlist</h2>
          <p style={{ color: 'var(--ash2)', fontSize: 15.5, maxWidth: 540, lineHeight: 1.6 }}>
            Queue up sermons to play end-to-end for however long you need. Set it and let the Word run.
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
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4,
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
          <h2 className="font-bebas" style={{ fontSize: 'clamp(34px,4vw,52px)', margin: '8px 0 6px' }}>Read & Download</h2>
          <p style={{ color: 'var(--ash2)', fontSize: 15.5, maxWidth: 540, lineHeight: 1.6 }}>
            Bulletins, devotional magazines, and study guides — free to download anytime.
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
                background: 'var(--coal)', border: '1px solid var(--line)', borderRadius: 4,
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
          border: '1px solid var(--line2)', borderRadius: 4, padding: '48px 52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, flexWrap: 'wrap', marginBottom: 60
        }}>
          <div>
            <h2 className="font-bebas" style={{ fontSize: 'clamp(28px,3.5vw,42px)', marginBottom: 6 }}>Never miss a word.</h2>
            <p style={{ color: 'var(--ash2)', fontSize: 15.5 }}>
              Get notified when we go live, new sermons drop, and fresh resources arrive.
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
          .hero-stage { grid-template-columns: 1fr !important; text-align: center; padding: 40px 0 0 !important; }
          .hero-stage > div:first-child { padding-right: 0 !important; }
          .hero-stage > div:last-child { display: none !important; }
          .playlist-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .now-playing-bar > div > div:nth-child(4) { display: none !important; }
          .now-playing-bar > div > div:nth-child(5) { display: none !important; }
        }
      `}</style>
    </div>
  )
}
