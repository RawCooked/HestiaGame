import React, { useState, useEffect, useRef, useMemo } from 'react'
import Logo from '../components/Logo.jsx'
import { GAMES } from '../gamesConfig.js'

// Read scores stored for a given name directly from localStorage
function readScoresFor(name) {
  if (!name) return {}
  try { return JSON.parse(localStorage.getItem(`hestia_scores_${name.toLowerCase().trim()}`) || '{}') }
  catch { return {} }
}

// Particle background (contained, not fixed — doesn't block scroll)
function ParticleBg() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight

    const particles = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random() * 400,
      y: Math.random() * 800,
      r: 1.5 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -(0.12 + Math.random() * 0.25),
      hue: [145, 180, 200, 50, 280][i % 5],
      alpha: 0.1 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    }))

    let raf
    function draw(now) {
      const t = now * 0.001
      ctx.clearRect(0, 0, W(), H())
      for (const p of particles) {
        p.x += p.vx + Math.sin(t + p.phase) * 0.1
        p.y += p.vy
        if (p.y < -10) { p.y = H() + 10; p.x = Math.random() * W() }

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        g.addColorStop(0, `hsla(${p.hue},100%,70%,${p.alpha})`)
        g.addColorStop(1, `hsla(${p.hue},100%,70%,0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas
      ref={ref}
      className="login-particle-bg"
      aria-hidden
    />
  )
}

// Show 4 best scores as chips
function ScoresPreview({ bestScores }) {
  const withScores = GAMES.filter(g => bestScores[g.id] > 0)
  if (withScores.length === 0) return null
  return (
    <div style={{ width: '100%' }}>
      <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>
        Tes records
      </p>
      <div className="login-scores-preview">
        {withScores.slice(0, 4).map(game => (
          <div key={game.id} className="login-score-chip">
            <span className="login-score-chip-icon">{game.icon}</span>
            <span className="login-score-chip-name">{game.name.replace('\n', ' ')}</span>
            <span className="login-score-chip-score" style={{ color: game.color }}>
              {bestScores[game.id].toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoginScreen({ savedName, onEnter, onChangePlayer }) {
  const [name, setName] = useState(savedName || '')
  const isReturning = Boolean(savedName)
  // Load scores for the saved player directly from localStorage (source of truth)
  const bestScores = useMemo(() => readScoresFor(savedName), [savedName])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onEnter(trimmed)
  }

  return (
    <div className="login-screen screen screen-enter">
      <ParticleBg />

      <div className="login-content">
        <Logo size="lg" />

        <div>
          {isReturning ? (
            <>
              <div className="login-greeting">
                Bon retour,<br />
                <span style={{ color: 'var(--accent)' }}>{savedName} 👋</span>
              </div>
              <p className="login-sub" style={{ marginTop: 8 }}>
                Prêt à battre ton record ?
              </p>
            </>
          ) : (
            <>
              <div className="login-greeting">
                Rejoins le<br />
                <span style={{ color: 'var(--accent)' }}>ODD Challenge !</span>
              </div>
              <p className="login-sub" style={{ marginTop: 8 }}>
                8 mini-jeux pour sauver la planète
              </p>
            </>
          )}
        </div>

        {isReturning && <ScoresPreview bestScores={bestScores} />}

        <form
          onSubmit={handleSubmit}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {!isReturning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Ton prénom
              </label>
              <input
                className="name-input"
                type="text"
                placeholder="Entre ton prénom…"
                value={name}
                onChange={e => setName(e.target.value.slice(0, 20))}
                maxLength={20}
                autoComplete="off"
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ fontSize: 17, padding: '16px 24px' }}
            disabled={!name.trim()}
          >
            {isReturning ? '▶ Continuer' : '🚀 Commencer'}
          </button>
        </form>

        {isReturning && (
          <button className="login-change-btn" onClick={onChangePlayer}>
            Ce n'est pas toi ? Changer de joueur
          </button>
        )}
      </div>
    </div>
  )
}
