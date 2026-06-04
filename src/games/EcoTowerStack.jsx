import React, { useEffect, useRef, useCallback } from 'react'

const BLOCK_H = 36
const MIN_W = 14      // game over if block narrower than this
const SPEED_START = 1.4
const SPEED_MAX = 4.5

export default function EcoTowerStack({ onGameOver, onScoreUpdate, accent }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    running: false,
    blocks: [],       // { x, w, y }  — stack of placed blocks (bottom up)
    current: null,    // { x, w, dir: 1|-1 }
    score: 0,
    speed: SPEED_START,
    lastTime: 0,
    popups: [],
    flashAlpha: 0,
    flashColor: '#00ff9d',
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

    function W() { return canvas.offsetWidth }
    function H() { return canvas.offsetHeight }

    // Init first block (ground)
    const initW = W() * 0.6
    const groundY = H() - BLOCK_H * 1.5
    state.blocks = [{ x: (W() - initW) / 2, w: initW, y: groundY }]
    state.score = 0

    function spawnNext() {
      const top = state.blocks[state.blocks.length - 1]
      state.current = {
        x: 0,
        w: top.w,
        dir: 1,
      }
    }
    spawnNext()

    // Sky colors per height
    function skyColor(height) {
      const s = state.blocks.length
      if (s < 8)  return ['#0d1f3c', '#1a3a5c']   // night city
      if (s < 16) return ['#1a1230', '#2d1f50']   // dusk purple
      if (s < 25) return ['#0a0a1a', '#1a0a2a']   // deep space
      return             ['#000005', '#0d0018']    // space
    }

    function blockColor(idx) {
      const palette = ['#00ff9d','#00d4ff','#a78bfa','#fbbf24','#34d399','#60a5fa','#ff6b9d','#f97316']
      return palette[idx % palette.length]
    }

    function stackTopY() {
      return state.blocks[state.blocks.length - 1].y
    }

    function draw(now) {
      const w = W(), h = H()
      ctx.clearRect(0, 0, w, h)

      // Camera offset — keep top block in upper third
      const topY = stackTopY()
      const camOffset = Math.min(0, h * 0.3 - topY)

      // Sky
      const [sc1, sc2] = skyColor(state.blocks.length)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, sc1); skyGrad.addColorStop(1, sc2)
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Stars (appear after a while)
      if (state.blocks.length > 10) {
        const starAlpha = Math.min(1, (state.blocks.length - 10) / 15)
        ctx.globalAlpha = starAlpha * 0.7
        ctx.fillStyle = '#ffffff'
        for (let i = 0; i < 60; i++) {
          const sx = ((i * 137 + 7) % w)
          const sy = ((i * 97 + 23) % (h * 0.7))
          const sr = 0.5 + (i % 3) * 0.5
          ctx.beginPath(); ctx.arc(sx, sy + camOffset * 0.1, sr, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // Draw placed blocks
      for (let i = 0; i < state.blocks.length; i++) {
        const blk = state.blocks[i]
        const by = blk.y + camOffset
        const col = blockColor(i)

        ctx.fillStyle = col + 'cc'
        ctx.shadowBlur = 8; ctx.shadowColor = col
        ctx.fillRect(blk.x, by, blk.w, BLOCK_H - 2)
        ctx.shadowBlur = 0

        // Eco icons on block
        ctx.font = '14px serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        const icons = ['🌱','☀️','♻️','🌊','💨','🌳','⚡','🏙️']
        ctx.fillText(icons[i % icons.length], blk.x + blk.w / 2, by + BLOCK_H / 2 - 1)
      }

      // Draw current moving block
      if (state.current) {
        const cur = state.current
        const nextY = stackTopY() - BLOCK_H + camOffset
        const col = blockColor(state.blocks.length)
        ctx.fillStyle = col + 'ee'
        ctx.shadowBlur = 12; ctx.shadowColor = col
        ctx.fillRect(cur.x, nextY, cur.w, BLOCK_H - 2)
        ctx.shadowBlur = 0

        // Arrow guides
        ctx.globalAlpha = 0.4
        ctx.fillStyle = '#ffffff'
        ctx.font = '18px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('▼', w / 2, nextY + BLOCK_H / 2)
        ctx.globalAlpha = 1
      }

      // Tap hint
      if (state.score === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = '700 15px Inter, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.fillText('TAPE pour poser!', w / 2, h - 16)
      }

      // Flash
      if (state.flashAlpha > 0) {
        ctx.globalAlpha = state.flashAlpha * 0.25
        ctx.fillStyle = state.flashColor
        ctx.fillRect(0, 0, w, h)
        ctx.globalAlpha = 1
        state.flashAlpha -= 0.06
      }

      // Score display
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '700 14px Inter, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(`🏙️ Hauteur : ${state.score}`, w / 2, 8)

      // Popups
      state.popups = state.popups.filter(p => p.life > 0)
      for (const p of state.popups) {
        const a = p.life / 60
        ctx.globalAlpha = a
        ctx.fillStyle = p.color
        ctx.font = '800 18px Inter, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(p.text, w / 2, h * 0.4 - (1 - a) * 30)
        ctx.globalAlpha = 1
        p.life--
      }
    }

    function loop(now) {
      if (!state.running) return
      const dt = Math.min((now - state.lastTime) / 1000, 0.05)
      state.lastTime = now

      const w = W()
      if (state.current) {
        state.current.x += state.speed * state.current.dir * dt * 90
        if (state.current.x + state.current.w > w) {
          state.current.x = w - state.current.w
          state.current.dir = -1
        }
        if (state.current.x < 0) {
          state.current.x = 0
          state.current.dir = 1
        }
      }

      onScoreUpdate(state.score)
      draw(now)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    function dropBlock() {
      if (!state.current || !state.running) return
      const top = state.blocks[state.blocks.length - 1]
      const cur = state.current

      // Compute overlap
      const overlapLeft  = Math.max(top.x, cur.x)
      const overlapRight = Math.min(top.x + top.w, cur.x + cur.w)
      const overlap = overlapRight - overlapLeft

      if (overlap <= 0) {
        // Missed completely — game over
        state.running = false
        if (navigator.vibrate) navigator.vibrate([80, 40, 80])
        callOver()
        return
      }

      const PERFECT_THRESHOLD = 6
      let newW = overlap
      let newX = overlapLeft
      let isPerfect = false

      if (Math.abs(cur.x - top.x) < PERFECT_THRESHOLD && Math.abs((cur.x + cur.w) - (top.x + top.w)) < PERFECT_THRESHOLD) {
        isPerfect = true
        newW = Math.min(top.w + 4, W() * 0.65) // slight bonus
        newX = top.x - (newW - top.w) / 2
        state.popups.push({ text: '✨ PERFECT!', color: '#00ff9d', life: 70 })
        state.flashAlpha = 1; state.flashColor = '#00ff9d'
        if (navigator.vibrate) navigator.vibrate([10, 5, 20])
      }

      if (newW < MIN_W) {
        state.running = false
        callOver()
        return
      }

      const nextY = top.y - BLOCK_H
      state.blocks.push({ x: newX, w: newW, y: nextY })
      state.score++
      state.speed = Math.min(SPEED_MAX, SPEED_START + state.score * 0.08)

      if (!isPerfect) {
        if (navigator.vibrate) navigator.vibrate(15)
        state.flashAlpha = 0.5; state.flashColor = accent
      }

      spawnNext()
    }

    const onClick = () => dropBlock()
    const onTouch = (e) => { e.preventDefault(); dropBlock() }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('touchstart', onTouch, { passive: false })
    window.addEventListener('resize', resize)

    return () => {
      state.running = false
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('touchstart', onTouch)
      window.removeEventListener('resize', resize)
    }
  }, [accent, callOver, onScoreUpdate])

  return <canvas ref={canvasRef} className="canvas-full" style={{ touchAction: 'none' }} />
}
