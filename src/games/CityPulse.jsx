import React, { useEffect, useRef, useCallback } from 'react'

// 120 BPM rhythm game — notes scripted as beat offsets (in beats, 1 beat = 500ms)
const BPM = 120
const BEAT_MS = 60000 / BPM  // 500ms
const TRAVEL_MS = 1400        // time for circle to travel to center
const PERFECT_WINDOW = 60     // ±ms
const GOOD_WINDOW = 130       // ±ms
const GAME_BEATS = 48         // 24 seconds of notes

// Generate pattern: beats 0,1,2... with occasional skips and doubles
function buildNotes() {
  const notes = []
  for (let b = 2; b < GAME_BEATS; b++) {
    if (b % 4 === 3) continue                // skip every 4th of 4
    if (b % 6 === 0 && b > 0) {
      notes.push(b * BEAT_MS)
      notes.push(b * BEAT_MS + BEAT_MS / 2)  // double beat
    } else {
      notes.push(b * BEAT_MS)
    }
  }
  return notes.sort((a, b) => a - b)
}

const NOTE_TIMESTAMPS = buildNotes()

function synthBeat(ctx, when, type) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  if (type === 'kick') {
    osc.frequency.setValueAtTime(150, when)
    osc.frequency.exponentialRampToValueAtTime(0.01, when + 0.15)
    gain.gain.setValueAtTime(0.4, when)
    gain.gain.exponentialRampToValueAtTime(0.01, when + 0.18)
    osc.type = 'sine'
  } else {
    osc.frequency.setValueAtTime(800, when)
    gain.gain.setValueAtTime(0.15, when)
    gain.gain.exponentialRampToValueAtTime(0.01, when + 0.06)
    osc.type = 'square'
  }
  osc.start(when); osc.stop(when + 0.2)
}

export default function CityPulse({ onGameOver, onScoreUpdate, accent }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    running: false,
    startTime: 0,
    audioCtx: null,
    notes: [...NOTE_TIMESTAMPS],  // remaining note timestamps
    activeCircles: [],             // { spawnTime, dir, hit }
    score: 0,
    combo: 0,
    lastFeedback: null,            // { text, color, alpha }
    cityLight: 0,                  // 0-1 city brightness
    popups: [],
    lastBeat: -1,
    beatScheduleIdx: 0,
  })
  const rafRef = useRef(null)
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

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()

    const state = stateRef.current
    state.running = true

    // Init Web Audio API
    try {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) { /* no audio */ }

    const startWall = performance.now()
    state.startTime = startWall
    const notesLeft = [...NOTE_TIMESTAMPS]
    const totalDuration = (GAME_BEATS + 4) * BEAT_MS

    // Pre-schedule audio beats
    if (state.audioCtx) {
      const ac = state.audioCtx
      const t0 = ac.currentTime
      for (let b = 0; b < GAME_BEATS + 4; b++) {
        const when = t0 + (b * BEAT_MS) / 1000
        synthBeat(ac, when, b % 2 === 0 ? 'kick' : 'hat')
      }
    }

    function draw(now) {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      const elapsed = now - startWall

      ctx.clearRect(0, 0, W, H)

      // Sky gradient driven by city light
      const light = state.cityLight
      const skyTop = `hsl(${220 + light * 20}, ${40 + light * 30}%, ${8 + light * 12}%)`
      ctx.fillStyle = skyTop
      ctx.fillRect(0, 0, W, H)

      // City silhouette (buildings)
      const buildings = [
        [0.02, 0.55, 0.10, 0.45], [0.13, 0.45, 0.08, 0.55], [0.22, 0.60, 0.09, 0.40],
        [0.32, 0.40, 0.07, 0.60], [0.40, 0.52, 0.10, 0.48], [0.51, 0.38, 0.08, 0.62],
        [0.60, 0.55, 0.10, 0.45], [0.71, 0.44, 0.07, 0.56], [0.79, 0.58, 0.10, 0.42],
        [0.90, 0.47, 0.09, 0.53],
      ]
      for (const [nx, ny, nw, nh] of buildings) {
        const glow = `rgba(${Math.round(0 + light * 100)}, ${Math.round(200 + light * 55)}, ${Math.round(100 + light * 155)}, ${0.15 + light * 0.25})`
        ctx.fillStyle = glow
        ctx.shadowBlur = light * 20
        ctx.shadowColor = '#00ff9d'
        ctx.fillRect(nx * W, ny * H, nw * W, nh * H)
        ctx.shadowBlur = 0

        // Windows
        if (light > 0.2) {
          const wc = Math.floor(nw * W / 8)
          const wr = Math.floor(nh * H / 16)
          for (let r = 0; r < wr; r++) for (let c = 0; c < wc; c++) {
            if (Math.random() < 0.03) continue
            ctx.fillStyle = `rgba(255,240,150,${light * 0.6})`
            ctx.fillRect(nx * W + c * 8 + 1, ny * H + r * 16 + 2, 5, 9)
          }
        }
      }

      // Target zone circle in center
      const cx = W / 2, cy = H * 0.60
      const targetR = 34
      ctx.save()
      ctx.strokeStyle = `rgba(255,255,255,0.25)`
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath(); ctx.arc(cx, cy, targetR, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Incoming circles
      for (const circle of state.activeCircles) {
        if (circle.hit) continue
        const progress = Math.min(1, (elapsed - circle.spawnTime) / TRAVEL_MS)
        // Start from random edge direction
        const angle = circle.angle
        const startR = Math.max(W, H) * 0.7
        const x = cx + Math.cos(angle) * startR * (1 - progress)
        const y = cy + Math.sin(angle) * startR * (1 - progress)

        const r = 20 - progress * 6
        const alpha = 0.4 + progress * 0.6
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.shadowBlur = 14; ctx.shadowColor = accent
        ctx.fill()
        ctx.restore()
      }

      // Combo & feedback
      if (state.combo > 1) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, state.combo / 10)})`
        ctx.font = `700 ${Math.min(36, 14 + state.combo)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`x${state.combo} COMBO`, W / 2, H * 0.10)
      }

      if (state.lastFeedback && state.lastFeedback.alpha > 0) {
        const fb = state.lastFeedback
        ctx.globalAlpha = fb.alpha
        ctx.fillStyle = fb.color
        ctx.font = '800 24px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(fb.text, W / 2, H * 0.42)
        ctx.globalAlpha = 1
        fb.alpha -= 0.035
      }

      // Timer ring
      const progress = Math.max(0, 1 - elapsed / totalDuration)
      ctx.strokeStyle = `rgba(255,255,255,0.12)`
      ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(cx, cy, targetR + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
      ctx.stroke()

      // Score
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '700 14px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`⚡ ${state.score.toLocaleString()} pts`, W / 2, H * 0.95)

      // Gradually decay city light
      state.cityLight = Math.max(0, state.cityLight - 0.003)
    }

    function loop(now) {
      if (!state.running) return
      const elapsed = now - startWall

      // Game over
      if (elapsed > totalDuration) { state.running = false; callOver(); return }

      // Spawn circles for upcoming notes
      while (notesLeft.length && notesLeft[0] - TRAVEL_MS <= elapsed) {
        const noteTime = notesLeft.shift()
        const angle = (Math.random() * Math.PI * 2)
        state.activeCircles.push({
          spawnTime: noteTime - TRAVEL_MS,
          noteTime,
          angle,
          hit: false,
        })
      }

      // Remove old circles
      state.activeCircles = state.activeCircles.filter(c => c.hit || elapsed - c.noteTime < 300)

      onScoreUpdate(state.score)
      draw(now)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    // Tap handler
    function onTap() {
      if (!state.running) return
      const elapsed = performance.now() - startWall

      // Find nearest unhit note
      let best = null, bestDiff = Infinity
      for (const c of state.activeCircles) {
        if (c.hit) continue
        const diff = Math.abs(elapsed - c.noteTime)
        if (diff < bestDiff) { bestDiff = diff; best = c }
      }

      if (best && bestDiff < GOOD_WINDOW + 50) {
        best.hit = true
        if (bestDiff < PERFECT_WINDOW) {
          state.combo++
          const pts = 100 * Math.max(1, Math.floor(state.combo / 3))
          state.score += pts
          state.lastFeedback = { text: 'PERFECT!', color: '#00ff9d', alpha: 1 }
          state.cityLight = Math.min(1, state.cityLight + 0.15)
          if (navigator.vibrate) navigator.vibrate([10, 5, 10])
        } else if (bestDiff < GOOD_WINDOW) {
          state.combo++
          state.score += 50
          state.lastFeedback = { text: 'GOOD', color: '#fbbf24', alpha: 1 }
          state.cityLight = Math.min(1, state.cityLight + 0.07)
          if (navigator.vibrate) navigator.vibrate(15)
        } else {
          state.lastFeedback = { text: 'MISS', color: '#ff4f5e', alpha: 1 }
          state.combo = 0
        }
        onScoreUpdate(state.score)
      } else {
        state.lastFeedback = { text: 'MISS', color: '#ff4f5e', alpha: 1 }
        state.combo = 0
      }
    }

    const onClick = () => onTap()
    const onTouch = (e) => { e.preventDefault(); onTap() }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('touchstart', onTouch, { passive: false })
    window.addEventListener('resize', resize)

    return () => {
      state.running = false
      cancelAnimationFrame(rafRef.current)
      if (state.audioCtx) state.audioCtx.close().catch(() => {})
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('touchstart', onTouch)
      window.removeEventListener('resize', resize)
    }
  }, [accent, callOver, onScoreUpdate])

  return (
    <canvas
      ref={canvasRef}
      className="canvas-full"
      style={{ touchAction: 'none' }}
    />
  )
}
