import React, { useEffect, useRef, useCallback } from 'react'

const DURATION = 60 // seconds
const GAUGE_MAX = 100

// Fixed problem spots on the house layout (normalized 0-1 coords)
const SPOTS = [
  { id: 0, nx: 0.22, ny: 0.28, type: 'light',   emoji: '💡', label: 'Lumière',  cost: 0.8 },
  { id: 1, nx: 0.62, ny: 0.28, type: 'window',  emoji: '🪟', label: 'Fenêtre',  cost: 0.6 },
  { id: 2, nx: 0.18, ny: 0.58, type: 'faucet',  emoji: '🚿', label: 'Robinet',  cost: 1.0 },
  { id: 3, nx: 0.55, ny: 0.55, type: 'faucet',  emoji: '🚰', label: 'Fuite',    cost: 1.0 },
  { id: 4, nx: 0.78, ny: 0.55, type: 'plug',    emoji: '🔌', label: 'Prise',    cost: 0.7 },
  { id: 5, nx: 0.38, ny: 0.75, type: 'door',    emoji: '🚪', label: 'Porte',    cost: 0.5 },
  { id: 6, nx: 0.72, ny: 0.78, type: 'heating', emoji: '🔥', label: 'Chauffe',  cost: 0.9 },
  { id: 7, nx: 0.30, ny: 0.50, type: 'trash',   emoji: '🗑️', label: 'Déchets',  cost: 0.4 },
]

export default function SmartHomeRescue({ onGameOver, onScoreUpdate, accent }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    active: [],      // set of spot ids currently showing a problem
    gauge: 0,
    score: 0,
    timeLeft: DURATION,
    running: false,
    lastTime: 0,
    spawnInterval: 4000, // ms between spawns
    lastSpawn: 0,
    popups: [],      // { x, y, text, life }
  })
  const rafRef = useRef(null)
  const gameOverCalled = useRef(false)

  const callGameOver = useCallback(() => {
    if (gameOverCalled.current) return
    gameOverCalled.current = true
    const s = stateRef.current.score
    onGameOver(s)
  }, [onGameOver])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()

    const state = stateRef.current
    state.running = true
    state.lastTime = performance.now()

    // ── DRAW ──────────────────────────────────────────────────────────────
    function draw(now) {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.45)
      sky.addColorStop(0, '#0d1f3c')
      sky.addColorStop(1, '#1a3a5c')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      // Ground
      ctx.fillStyle = '#1a2e1a'
      ctx.fillRect(0, H * 0.82, W, H * 0.18)

      // House body
      const hx = W * 0.08, hy = H * 0.28
      const hw = W * 0.84, hh = H * 0.56
      ctx.fillStyle = '#2a3f5f'
      ctx.beginPath()
      ctx.roundRect(hx, hy, hw, hh, 8)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Roof
      ctx.fillStyle = '#1e3050'
      ctx.beginPath()
      ctx.moveTo(hx - 12, hy)
      ctx.lineTo(W / 2, H * 0.06)
      ctx.lineTo(hx + hw + 12, hy)
      ctx.closePath()
      ctx.fill()

      // Room dividers
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(W / 2, hy); ctx.lineTo(W / 2, hy + hh)
      ctx.moveTo(hx, hy + hh * 0.5); ctx.lineTo(hx + hw, hy + hh * 0.5)
      ctx.stroke()

      // Problem spots
      const t = now / 1000
      for (const spot of SPOTS) {
        const sx = spot.nx * W
        const sy = spot.ny * H
        const isActive = state.active.includes(spot.id)

        if (isActive) {
          // Pulsing glow
          const pulse = 0.5 + 0.5 * Math.sin(t * 4)
          const glow = 14 + pulse * 10
          ctx.save()
          ctx.shadowBlur = glow
          ctx.shadowColor = '#ff4f5e'
          ctx.beginPath()
          ctx.arc(sx, sy, 22 + pulse * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,79,94,${0.15 + pulse * 0.1})`
          ctx.fill()
          ctx.restore()

          // Emoji
          ctx.font = '26px serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(spot.emoji, sx, sy)
        } else {
          // Dim indicator
          ctx.globalAlpha = 0.18
          ctx.font = '20px serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(spot.emoji, sx, sy)
          ctx.globalAlpha = 1
        }
      }

      // Gauge bar at bottom
      const gaugeBg = { x: hx, y: H * 0.92, w: hw, h: 12 }
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.roundRect(gaugeBg.x, gaugeBg.y, gaugeBg.w, gaugeBg.h, 6)
      ctx.fill()

      const gaugeFill = state.gauge / GAUGE_MAX
      const gaugeColor = gaugeFill < 0.5 ? '#00ff9d' : gaugeFill < 0.8 ? '#ffb347' : '#ff4f5e'
      ctx.fillStyle = gaugeColor
      ctx.beginPath()
      ctx.roundRect(gaugeBg.x, gaugeBg.y, gaugeBg.w * gaugeFill, gaugeBg.h, 6)
      ctx.fill()

      // Gauge label
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '600 11px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`⚡ Gaspillage ${Math.floor(state.gauge)}%`, gaugeBg.x + gaugeBg.w, gaugeBg.y - 4)

      // Timer
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '700 16px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`⏱ ${Math.ceil(state.timeLeft)}s`, hx, gaugeBg.y - 4)

      // Score popups
      state.popups = state.popups.filter(p => p.life > 0)
      for (const p of state.popups) {
        const alpha = p.life / 60
        ctx.globalAlpha = alpha
        ctx.fillStyle = accent
        ctx.font = `700 18px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.text, p.x, p.y - (1 - alpha) * 40)
        ctx.globalAlpha = 1
        p.life--
      }
    }

    // ── GAME LOOP ─────────────────────────────────────────────────────────
    function loop(now) {
      if (!state.running) return
      const dt = Math.min((now - state.lastTime) / 1000, 0.1)
      state.lastTime = now

      // Count down timer
      state.timeLeft -= dt
      if (state.timeLeft <= 0) { state.timeLeft = 0; state.running = false; callGameOver(); }

      // Gauge increases while problems are active
      const problemCount = state.active.length
      state.gauge += problemCount * 5 * dt
      if (state.gauge >= GAUGE_MAX) { state.gauge = GAUGE_MAX; state.running = false; callGameOver(); }

      // Gradually decrease gauge when no problems (tiny eco bonus)
      if (problemCount === 0 && state.gauge > 0) {
        state.gauge = Math.max(0, state.gauge - 2 * dt)
      }

      // Spawn new problem
      const spawnInterval = Math.max(1200, 4000 - (DURATION - state.timeLeft) * 40)
      if (now - state.lastSpawn > spawnInterval) {
        const available = SPOTS.filter(s => !state.active.includes(s.id))
        if (available.length > 0) {
          const pick = available[Math.floor(Math.random() * available.length)]
          state.active.push(pick.id)
        }
        state.lastSpawn = now
      }

      onScoreUpdate(state.score)
      draw(now)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    // ── TAP HANDLER ───────────────────────────────────────────────────────
    function getHit(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      const x = clientX - rect.left
      const y = clientY - rect.top

      for (const spot of SPOTS) {
        const sx = spot.nx * W, sy = spot.ny * H
        const dist = Math.hypot(x - sx, y - sy)
        if (dist < 30 && state.active.includes(spot.id)) return spot
      }
      return null
    }

    function onTap(cx, cy) {
      if (!state.running) return
      const spot = getHit(cx, cy)
      if (spot) {
        state.active = state.active.filter(id => id !== spot.id)
        state.score += 10
        const W = canvas.offsetWidth, H = canvas.offsetHeight
        state.popups.push({ x: spot.nx * W, y: spot.ny * H, text: '+10', life: 60 })
        if (navigator.vibrate) navigator.vibrate(15)
      }
    }

    const handleClick = (e) => onTap(e.clientX, e.clientY)
    const handleTouch = (e) => {
      e.preventDefault()
      onTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchend', handleTouch, { passive: false })
    window.addEventListener('resize', resize)

    return () => {
      state.running = false
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchend', handleTouch)
      window.removeEventListener('resize', resize)
    }
  }, [accent, callGameOver, onScoreUpdate])

  return (
    <canvas
      ref={canvasRef}
      className="canvas-full"
      style={{ touchAction: 'none' }}
    />
  )
}
