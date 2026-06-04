import React, { useEffect, useRef, useCallback } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────
const GRAVITY      = 0.55
const JUMP_V       = -13.5
const DOUBLE_JUMP_V = -11
const PLAYER_W     = 28
const PLAYER_H     = 36
const GROUND_RATIO = 0.80   // ground line at 80% height

// Obstacle templates [w, h, color, emoji, minSpeed]
const OBS_TYPES = [
  { w: 22, h: 52, color: '#374151', accent: '#6b7280', emoji: '🏭', label: 'Usine'     },
  { w: 38, h: 30, color: '#57534e', accent: '#78716c', emoji: '🗑️', label: 'Déchets'   },
  { w: 18, h: 62, color: '#1f2937', accent: '#4b5563', emoji: '💨', label: 'Fumée'     },
  { w: 30, h: 28, color: '#44403c', accent: '#6b5c4e', emoji: '🛢️', label: 'Baril'     },
  { w: 24, h: 44, color: '#3f3f46', accent: '#52525b', emoji: '☢️', label: 'Pollution' },
]

export default function EcoRunner({ onGameOver, onScoreUpdate, accent }) {
  const canvasRef      = useRef(null)
  const stateRef       = useRef(null)
  const rafRef         = useRef(null)
  const gameOverCalled = useRef(false)

  const callOver = useCallback(() => {
    if (gameOverCalled.current) return
    gameOverCalled.current = true
    onGameOver(stateRef.current.score)
  }, [onGameOver])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // ── Resize ─────────────────────────────────────────────────────────────
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
      init()
    }

    // ── Init / reset state ─────────────────────────────────────────────────
    function init() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      const gY = H * GROUND_RATIO
      stateRef.current = {
        running:       true,
        px:            W * 0.16,
        py:            gY - PLAYER_H,
        pvy:           0,
        onGround:      true,
        canDouble:     false,
        score:         0,
        dist:          0,
        speed:         4.2,
        obstacles:     [],
        lastObsTime:   -999,
        buildings:     initBuildings(W, H),
        groundSegs:    initGround(W),
        gameOver:      false,
        deadFlash:     0,
        jumpParticles: [],
        runTick:       0,
      }
    }

    // ── Background buildings ───────────────────────────────────────────────
    function initBuildings(W, H) {
      return Array.from({ length: 10 }, (_, i) => ({
        x: i * (W / 6) + Math.random() * 40,
        w: 35 + Math.random() * 55,
        h: 50 + Math.random() * 110,
        tier: Math.floor(Math.random() * 3), // 0=dark, 1=mid, 2=accent
      }))
    }

    function initGround(W) {
      return Array.from({ length: 8 }, (_, i) => ({
        x: i * (W / 5),
        type: Math.floor(Math.random() * 3), // 0=grass, 1=flower, 2=blank
      }))
    }

    // ── Draw helpers ───────────────────────────────────────────────────────
    function drawRoundRect(x, y, w, h, r, fill) {
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
      ctx.fill()
    }

    function drawBuilding(bld, gY, pollution) {
      const palettes = [
        ['#0d1f3c', '#142240'],
        ['#162437', '#1c2e4a'],
        ['#0f1f2e', '#172636'],
      ]
      const [bg, win] = palettes[bld.tier]
      ctx.fillStyle = bg
      ctx.fillRect(bld.x, gY - bld.h, bld.w, bld.h)

      // Windows grid
      const wW = 6, wH = 7, wPad = 7
      ctx.fillStyle = `rgba(255,220,80,${0.12 + pollution * 0.08})`
      let wy = gY - bld.h + wPad
      while (wy < gY - wPad - wH) {
        let wx = bld.x + wPad
        while (wx < bld.x + bld.w - wPad - wW) {
          if (Math.sin(wx * 7 + wy * 13) > 0) ctx.fillRect(wx, wy, wW, wH)
          wx += wW + 5
        }
        wy += wH + 5
      }

      // Rooftop antenna/detail
      ctx.fillStyle = '#0a1628'
      ctx.fillRect(bld.x + bld.w / 2 - 2, gY - bld.h - 14, 3, 14)
    }

    // ── Player drawing ─────────────────────────────────────────────────────
    function drawPlayer(now) {
      const s = stateRef.current
      const { px, py, onGround, pvy } = s
      const t = now * 0.01
      const legSwing = onGround ? Math.sin(t * 1.6) * 7 : 0

      ctx.save()
      ctx.shadowBlur = 14
      ctx.shadowColor = accent

      // Body
      drawRoundRect(px, py + 6, PLAYER_W, PLAYER_H - 6, 6, accent + 'dd')

      // Head
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.arc(px + PLAYER_W / 2, py + 4, 10, 0, Math.PI * 2)
      ctx.fill()

      // Eco vest detail
      ctx.fillStyle = '#064e3b'
      ctx.fillRect(px + 8, py + 10, PLAYER_W - 16, 14)
      ctx.fillStyle = '#10b981'
      ctx.font = '10px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🌿', px + PLAYER_W / 2, py + 18)

      // Legs
      const legColor = '#065f46'
      if (onGround) {
        ctx.fillStyle = legColor
        ctx.fillRect(px + 4,  py + PLAYER_H - 2, 9, 8 + legSwing)
        ctx.fillRect(px + 15, py + PLAYER_H - 2, 9, 8 - legSwing)
        // Feet
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(px + 3,  py + PLAYER_H + 5 + legSwing,  11, 5)
        ctx.fillRect(px + 14, py + PLAYER_H + 5 - legSwing, 11, 5)
      } else {
        // Mid-air tuck
        ctx.fillStyle = legColor
        ctx.fillRect(px + 4,  py + PLAYER_H - 2, 9, pvy < 0 ? 6 : 12)
        ctx.fillRect(px + 15, py + PLAYER_H - 2, 9, pvy < 0 ? 12 : 6)
      }

      ctx.restore()
    }

    // ── Obstacle drawing ───────────────────────────────────────────────────
    function drawObstacle(obs, gY) {
      // Shadow on ground
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(obs.x + 4, gY, obs.w, 5)

      // Body
      ctx.fillStyle = obs.color
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h)

      // Accent stripe at top
      ctx.fillStyle = obs.accent
      ctx.fillRect(obs.x, obs.y, obs.w, 5)

      // Glow halo (pollution aura)
      ctx.save()
      ctx.globalAlpha = 0.12
      ctx.fillStyle = '#ff4f5e'
      ctx.beginPath()
      ctx.ellipse(obs.x + obs.w / 2, obs.y, obs.w, 18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Emoji
      ctx.font = '13px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(obs.emoji, obs.x + obs.w / 2, obs.y - 3)
    }

    // ── Jump particles ─────────────────────────────────────────────────────
    function spawnDust(x, y) {
      const s = stateRef.current
      for (let i = 0; i < 5; i++) {
        s.jumpParticles.push({
          x: x + Math.random() * PLAYER_W,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 2,
          life: 20,
          r: 2 + Math.random() * 3,
        })
      }
    }

    // ── Update ─────────────────────────────────────────────────────────────
    function update(now) {
      const s = stateRef.current
      const H = canvas.offsetHeight
      const W = canvas.offsetWidth
      const gY = H * GROUND_RATIO

      s.dist  += s.speed
      s.score  = Math.floor(s.dist / 10)
      s.speed  = Math.min(13, 4.2 + s.dist / 3000)
      onScoreUpdate(s.score)

      // Player physics
      s.pvy += GRAVITY
      s.py  += s.pvy

      const wasAir = !s.onGround
      if (s.py >= gY - PLAYER_H) {
        if (wasAir && s.pvy > 2) spawnDust(s.px, gY)
        s.py       = gY - PLAYER_H
        s.pvy      = 0
        s.onGround = true
        s.canDouble = true
      }

      // Scroll buildings
      for (const b of s.buildings) {
        b.x -= s.speed * 0.2
        if (b.x + b.w < -20) {
          b.x   = W + Math.random() * 80
          b.w   = 35 + Math.random() * 55
          b.h   = 50 + Math.random() * 110
          b.tier = Math.floor(Math.random() * 3)
        }
      }

      // Scroll ground details
      for (const g of s.groundSegs) {
        g.x -= s.speed
        if (g.x < -40) { g.x += W + 80; g.type = Math.floor(Math.random() * 3) }
      }

      // Move obstacles
      for (const o of s.obstacles) o.x -= s.speed
      s.obstacles = s.obstacles.filter(o => o.x > -80)

      // Spawn obstacles
      const minGap = Math.max(700, 1600 - s.dist * 0.15)
      if (now - s.lastObsTime > minGap) {
        const tpl = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)]
        s.obstacles.push({
          x: W + 40,
          y: gY - tpl.h,
          w: tpl.w, h: tpl.h,
          color: tpl.color, accent: tpl.accent, emoji: tpl.emoji,
        })
        s.lastObsTime = now
      }

      // Dust particles
      s.jumpParticles = s.jumpParticles.filter(p => p.life > 0)
      for (const p of s.jumpParticles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--
      }

      // Collision (shrunken hitbox for fairness)
      const margin = 5
      for (const o of s.obstacles) {
        if (
          s.px + PLAYER_W - margin > o.x + margin &&
          s.px + margin            < o.x + o.w - margin &&
          s.py + 8                 < o.y + o.h - margin &&
          s.py + PLAYER_H - margin > o.y + margin
        ) {
          s.gameOver  = true
          s.deadFlash = 1
          if (navigator.vibrate) navigator.vibrate([60, 30, 90])
          return
        }
      }
    }

    // ── Draw frame ─────────────────────────────────────────────────────────
    function draw(now) {
      const s = stateRef.current
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      const gY = H * GROUND_RATIO

      const pollution = Math.min(1, s.dist / 30000)  // 0→1 as game progresses
      ctx.clearRect(0, 0, W, H)

      // Sky — gets hazier with pollution
      const skyGrad = ctx.createLinearGradient(0, 0, 0, gY)
      const r1 = Math.round(10 + pollution * 40)
      const g1 = Math.round(15 + pollution * 8)
      const b1 = Math.round(40 - pollution * 15)
      skyGrad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`)
      skyGrad.addColorStop(1, `rgb(${r1 + 12}, ${g1 + 18}, ${b1 + 8})`)
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)

      // Moon / sun
      ctx.save()
      ctx.shadowBlur  = 20
      ctx.shadowColor = pollution < 0.5 ? '#fbbf24' : '#f97316'
      ctx.fillStyle   = pollution < 0.5 ? '#fde68a' : '#fb923c'
      ctx.beginPath()
      ctx.arc(W * 0.85, H * 0.12, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i < 18; i++) {
        const sx = ((i * 137 + 23) % W)
        const sy = ((i * 97  + 11) % (gY * 0.7))
        const sr = 0.6 + (i % 3) * 0.4
        ctx.beginPath()
        ctx.arc(sx, sy, sr, 0, Math.PI * 2)
        ctx.fill()
      }

      // Buildings (parallax)
      for (const b of s.buildings) drawBuilding(b, gY, pollution)

      // Ground
      ctx.fillStyle = `rgb(${Math.round(20 - pollution * 5)}, ${Math.round(50 - pollution * 20)}, ${Math.round(22 - pollution * 8)})`
      ctx.fillRect(0, gY, W, H - gY)

      // Grass stripe
      ctx.fillStyle = `rgb(${Math.round(22 + pollution * 10)}, ${Math.round(80 - pollution * 40)}, ${Math.round(30 - pollution * 10)})`
      ctx.fillRect(0, gY, W, 7)

      // Ground decorations (eco elements)
      for (const g of s.groundSegs) {
        if (g.type === 0) {
          // Tiny tree
          ctx.fillStyle = `rgba(26, 90, 30, ${0.8 - pollution * 0.5})`
          ctx.fillRect(g.x + 8, gY - 18, 5, 18)
          ctx.beginPath()
          ctx.arc(g.x + 10, gY - 20, 9, 0, Math.PI * 2)
          ctx.fill()
        } else if (g.type === 1) {
          // Flower
          ctx.fillStyle = `rgba(250, 200, 50, ${0.7 - pollution * 0.5})`
          ctx.font = '12px serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText('🌸', g.x + 10, gY - 2)
        }
      }

      // Dust particles
      for (const p of s.jumpParticles) {
        ctx.globalAlpha = p.life / 20
        ctx.fillStyle = '#a3e635'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // Obstacles
      for (const o of s.obstacles) drawObstacle(o, gY)

      // Player
      if (!s.gameOver) drawPlayer(now)

      // HUD — score
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '700 14px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`🌍 ${s.score}m`, 12, 12)

      // Speed badge
      const speedX = Math.min(1, (s.speed - 4.2) / 9)
      if (speedX > 0) {
        ctx.font = '600 11px Inter, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillStyle = `rgba(255, ${Math.round(200 - speedX * 160)}, ${Math.round(80 - speedX * 60)}, 0.85)`
        ctx.fillText(`⚡ vitesse ×${(1 + speedX * 2).toFixed(1)}`, W - 12, 12)
      }

      // Tap hint on start
      if (s.dist < 100) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.font = '700 15px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText('TAPE pour sauter!', W / 2, gY - 10)
      }

      // Death flash
      if (s.deadFlash > 0) {
        ctx.globalAlpha = s.deadFlash * 0.35
        ctx.fillStyle = '#ff4f5e'
        ctx.fillRect(0, 0, W, H)
        ctx.globalAlpha = 1
        s.deadFlash -= 0.05
      }
    }

    // ── Loop ───────────────────────────────────────────────────────────────
    function loop(now) {
      const s = stateRef.current
      if (!s.running) return

      if (s.gameOver) {
        draw(now)
        if (s.deadFlash <= 0) { s.running = false; callOver(); return }
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      update(now)
      draw(now)
      rafRef.current = requestAnimationFrame(loop)
    }

    resize()
    rafRef.current = requestAnimationFrame(loop)

    // ── Input ──────────────────────────────────────────────────────────────
    function jump() {
      const s = stateRef.current
      if (!s || !s.running || s.gameOver) return
      if (s.onGround) {
        s.pvy      = JUMP_V
        s.onGround = false
        s.canDouble = true
        if (navigator.vibrate) navigator.vibrate(15)
      } else if (s.canDouble) {
        s.pvy       = DOUBLE_JUMP_V
        s.canDouble = false
        if (navigator.vibrate) navigator.vibrate([8, 4, 12])
      }
    }

    const onClick = () => jump()
    const onTouch = (e) => { e.preventDefault(); jump() }
    const onKey   = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump() }
    }

    canvas.addEventListener('click',      onClick)
    canvas.addEventListener('touchstart', onTouch, { passive: false })
    window.addEventListener('keydown',    onKey)
    window.addEventListener('resize',     resize)

    return () => {
      if (stateRef.current) stateRef.current.running = false
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click',      onClick)
      canvas.removeEventListener('touchstart', onTouch)
      window.removeEventListener('keydown',    onKey)
      window.removeEventListener('resize',     resize)
    }
  }, [accent, callOver, onScoreUpdate])

  return <canvas ref={canvasRef} className="canvas-full" style={{ touchAction: 'none' }} />
}
