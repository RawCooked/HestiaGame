import React, { useEffect, useRef, useCallback } from 'react'

const DURATION = 45
const MAX_LEAKS = 6

// Fixed leak spots on house
const LEAK_SPOTS = [
  { id: 0, nx: 0.20, ny: 0.30, type: 'water', emoji: '💧', value: 5  },
  { id: 1, nx: 0.70, ny: 0.28, type: 'water', emoji: '💧', value: 5  },
  { id: 2, nx: 0.30, ny: 0.55, type: 'water', emoji: '🚿', value: 8  },
  { id: 3, nx: 0.65, ny: 0.52, type: 'energy', emoji: '⚡', value: 6 },
  { id: 4, nx: 0.80, ny: 0.62, type: 'energy', emoji: '🔋', value: 6 },
  { id: 5, nx: 0.45, ny: 0.72, type: 'water', emoji: '🪣', value: 7  },
  { id: 6, nx: 0.15, ny: 0.62, type: 'energy', emoji: '💡', value: 5 },
  { id: 7, nx: 0.55, ny: 0.35, type: 'water', emoji: '🛁', value: 8  },
]

export default function TapTheLeak({ onGameOver, onScoreUpdate, accent }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    leaks: [],       // { spotId, life, maxLife, ring }
    score: 0,
    timeLeft: DURATION,
    running: false,
    lastTime: 0,
    lastSpawn: 0,
    popups: [],
  })
  const rafRef = useRef(null)
  const gameOverCalled = useRef(false)

  const callGameOver = useCallback(() => {
    if (gameOverCalled.current) return
    gameOverCalled.current = true
    onGameOver(stateRef.current.score)
  }, [onGameOver])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()

    const state = stateRef.current
    state.running = true
    state.lastTime = performance.now()

    function draw(now) {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#0d1f3c'
      ctx.fillRect(0, 0, W, H)

      // Ground
      ctx.fillStyle = '#142914'
      ctx.fillRect(0, H * 0.85, W, H * 0.15)

      // House body
      const hx = W * 0.06, hy = H * 0.22, hw = W * 0.88, hh = H * 0.64
      ctx.fillStyle = '#1d2f4a'
      ctx.beginPath(); ctx.roundRect(hx, hy, hw, hh, 10); ctx.fill()

      // Roof
      ctx.fillStyle = '#16243a'
      ctx.beginPath()
      ctx.moveTo(hx - 10, hy)
      ctx.lineTo(W / 2, H * 0.04)
      ctx.lineTo(hx + hw + 10, hy)
      ctx.closePath(); ctx.fill()

      // Windows (decorative)
      const winPos = [[0.2, 0.38], [0.6, 0.38], [0.4, 0.62]]
      for (const [nx, ny] of winPos) {
        ctx.fillStyle = 'rgba(255,220,100,0.12)'
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.lineWidth = 1
        const wx = nx * W - 15, wy = ny * H - 12
        ctx.fillRect(wx, wy, 30, 24)
        ctx.strokeRect(wx, wy, 30, 24)
      }

      const t = now / 1000

      // Draw leaks
      for (const leak of state.leaks) {
        const spot = LEAK_SPOTS[leak.spotId]
        const sx = spot.nx * W, sy = spot.ny * H
        const lifeRatio = leak.life / leak.maxLife
        const pulse = 0.5 + 0.5 * Math.sin(t * 5)
        const urgencyColor = lifeRatio > 0.5 ? accent : lifeRatio > 0.25 ? '#ffb347' : '#ff4f5e'

        // Outer ring
        ctx.save()
        ctx.globalAlpha = 0.3 + pulse * 0.2
        ctx.strokeStyle = urgencyColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(sx, sy, 28 + pulse * 5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // Life arc
        ctx.save()
        ctx.strokeStyle = urgencyColor
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(sx, sy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeRatio)
        ctx.stroke()
        ctx.restore()

        // Emoji
        ctx.font = '22px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(spot.emoji, sx, sy)
      }

      // Popups
      state.popups = state.popups.filter(p => p.life > 0)
      for (const p of state.popups) {
        const alpha = p.life / 50
        ctx.globalAlpha = alpha
        ctx.fillStyle = accent
        ctx.font = '700 16px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.text, p.x, p.y - (1 - alpha) * 35)
        ctx.globalAlpha = 1
        p.life--
      }

      // HUD
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '700 14px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`⏱ ${Math.ceil(state.timeLeft)}s`, hx, H * 0.88)

      ctx.textAlign = 'right'
      ctx.fillText(`💧⚡ Sauvés : ${state.score}`, hx + hw, H * 0.88)
    }

    function loop(now) {
      if (!state.running) return
      const dt = Math.min((now - state.lastTime) / 1000, 0.1)
      state.lastTime = now

      state.timeLeft -= dt
      if (state.timeLeft <= 0) { state.running = false; callGameOver(); return }

      // Tick leaks
      for (const leak of state.leaks) {
        leak.life -= dt * 1000
      }
      state.leaks = state.leaks.filter(l => l.life > 0)

      // Spawn
      const spawnInterval = Math.max(900, 2800 - (DURATION - state.timeLeft) * 50)
      if (now - state.lastSpawn > spawnInterval && state.leaks.length < MAX_LEAKS) {
        const available = LEAK_SPOTS.filter(s => !state.leaks.some(l => l.spotId === s.id))
        if (available.length > 0) {
          const spot = available[Math.floor(Math.random() * available.length)]
          const maxLife = Math.max(2500, 5000 - (DURATION - state.timeLeft) * 60)
          state.leaks.push({ spotId: spot.id, life: maxLife, maxLife, ring: 0 })
        }
        state.lastSpawn = now
      }

      onScoreUpdate(state.score)
      draw(now)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    function onTap(cx, cy) {
      if (!state.running) return
      const rect = canvas.getBoundingClientRect()
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      const x = cx - rect.left, y = cy - rect.top

      let hit = false
      state.leaks = state.leaks.filter(leak => {
        const spot = LEAK_SPOTS[leak.spotId]
        const dist = Math.hypot(x - spot.nx * W, y - spot.ny * H)
        if (dist < 32) {
          const pts = spot.value
          state.score += pts
          state.popups.push({ x: spot.nx * W, y: spot.ny * H, text: `+${pts}`, life: 50 })
          if (navigator.vibrate) navigator.vibrate(15)
          hit = true
          return false
        }
        return true
      })
    }

    const onClick = e => onTap(e.clientX, e.clientY)
    const onTouch = e => { e.preventDefault(); onTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY) }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('touchend', onTouch, { passive: false })
    window.addEventListener('resize', resize)

    return () => {
      state.running = false
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('touchend', onTouch)
      window.removeEventListener('resize', resize)
    }
  }, [accent, callGameOver, onScoreUpdate])

  return <canvas ref={canvasRef} className="canvas-full" style={{ touchAction: 'none' }} />
}
