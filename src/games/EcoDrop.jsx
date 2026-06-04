import React, { useEffect, useRef, useCallback } from 'react'

const COLS = 10, ROWS = 20
const TICK_START = 800  // ms per row drop
const TICK_MIN   = 100

// Eco-themed tetrominos: [shape, color, emoji]
const PIECES = [
  { shape: [[1,1,1,1]],                             color: '#60a5fa', emoji: '🏙️' }, // I
  { shape: [[1,1],[1,1]],                           color: '#34d399', emoji: '🌳' }, // O
  { shape: [[0,1,0],[1,1,1]],                       color: '#a78bfa', emoji: '⚡' }, // T
  { shape: [[1,0],[1,0],[1,1]],                     color: '#fbbf24', emoji: '☀️' }, // J
  { shape: [[0,1],[0,1],[1,1]],                     color: '#f97316', emoji: '🌊' }, // L
  { shape: [[0,1,1],[1,1,0]],                       color: '#00ff9d', emoji: '🚲' }, // S
  { shape: [[1,1,0],[0,1,1]],                       color: '#00d4ff', emoji: '♻️' }, // Z
]

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function rotateCW(shape) {
  return shape[0].map((_, c) => shape.map(row => row[c]).reverse())
}

function fits(board, shape, row, col) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nr = row + r, nc = col + c
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false
      if (board[nr][nc]) return false
    }
  }
  return true
}

function place(board, shape, row, col, pieceIdx) {
  const b = board.map(r => [...r])
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) b[row + r][col + c] = pieceIdx
    }
  }
  return b
}

function clearLines(board) {
  const remaining = board.filter(row => row.some(c => c === null))
  const cleared = ROWS - remaining.length
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null))
  return { board: [...empty, ...remaining], lines: cleared }
}

const LINE_SCORES = [0, 100, 300, 500, 800]

export default function EcoDrop({ onGameOver, onScoreUpdate, accent }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    board: emptyBoard(),
    piece: null,      // { shape, col, row, idx }
    score: 0,
    lines: 0,
    level: 1,
    running: false,
    lastTick: 0,
    lastTime: 0,
  })
  const rafRef = useRef(null)
  const gameOverCalled = useRef(false)

  const callOver = useCallback(() => {
    if (gameOverCalled.current) return
    gameOverCalled.current = true
    onGameOver(stateRef.current.score)
  }, [onGameOver])

  const spawnPiece = useCallback(() => {
    const state = stateRef.current
    const idx = Math.floor(Math.random() * PIECES.length)
    const { shape } = PIECES[idx]
    const col = Math.floor((COLS - shape[0].length) / 2)
    if (!fits(state.board, shape, 0, col)) {
      state.running = false
      callOver()
      return
    }
    state.piece = { shape, col, row: 0, idx }
  }, [callOver])

  const lockPiece = useCallback(() => {
    const state = stateRef.current
    if (!state.piece) return
    const { shape, row, col, idx } = state.piece
    state.board = place(state.board, shape, row, col, idx)
    const { board: nb, lines } = clearLines(state.board)
    state.board = nb
    state.lines += lines
    state.score += LINE_SCORES[lines] || 0
    state.level = 1 + Math.floor(state.lines / 10)
    onScoreUpdate(state.score)
    state.piece = null
    spawnPiece()
  }, [spawnPiece, onScoreUpdate])

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
    spawnPiece()

    function cellSize() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      return Math.min(W / COLS, (H - 80) / ROWS)
    }
    function boardOrigin() {
      const cs = cellSize()
      const W = canvas.offsetWidth
      return { x: (W - cs * COLS) / 2, y: 40 }
    }

    function drawCell(cx, cy, cs, pieceIdx) {
      const p = PIECES[pieceIdx]
      const grad = ctx.createLinearGradient(cx, cy, cx + cs, cy + cs)
      grad.addColorStop(0, p.color + 'dd')
      grad.addColorStop(1, p.color + '88')
      ctx.fillStyle = grad
      ctx.fillRect(cx + 1, cy + 1, cs - 2, cs - 2)
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1
      ctx.strokeRect(cx + 1, cy + 1, cs - 2, cs - 2)
    }

    function draw() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      const cs = cellSize()
      const { x: bx, y: by } = boardOrigin()

      // Background
      ctx.fillStyle = '#0a0e1a'
      ctx.fillRect(0, 0, W, H)

      // Board grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 0.5
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(bx, by + r * cs); ctx.lineTo(bx + COLS * cs, by + r * cs); ctx.stroke()
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(bx + c * cs, by); ctx.lineTo(bx + c * cs, by + ROWS * cs); ctx.stroke()
      }

      // Placed cells
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (state.board[r][c] !== null) {
            drawCell(bx + c * cs, by + r * cs, cs, state.board[r][c])
          }
        }
      }

      // Ghost piece
      if (state.piece) {
        const { shape, col, idx } = state.piece
        let ghostRow = state.piece.row
        while (fits(state.board, shape, ghostRow + 1, col)) ghostRow++
        if (ghostRow !== state.piece.row) {
          ctx.globalAlpha = 0.18
          for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
              if (shape[r][c]) {
                drawCell(bx + (col + c) * cs, by + (ghostRow + r) * cs, cs, idx)
              }
            }
          }
          ctx.globalAlpha = 1
        }

        // Active piece
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              drawCell(bx + (col + c) * cs, by + (state.piece.row + r) * cs, cs, idx)
            }
          }
        }
      }

      // HUD
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '600 12px Inter, sans-serif'
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(`Lignes: ${state.lines}`, 8, 18)
      ctx.textAlign = 'right'
      ctx.fillText(`Niv. ${state.level}`, W - 8, 18)
    }

    function loop(now) {
      if (!state.running) return
      const tickMs = Math.max(TICK_MIN, TICK_START - (state.level - 1) * 60)

      if (now - state.lastTick > tickMs) {
        state.lastTick = now
        if (state.piece) {
          if (fits(state.board, state.piece.shape, state.piece.row + 1, state.piece.col)) {
            state.piece.row++
          } else {
            lockPiece()
          }
        }
      }

      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    // Controls
    function move(dir) {
      const s = stateRef.current
      if (!s.piece || !s.running) return
      const nc = s.piece.col + dir
      if (fits(s.board, s.piece.shape, s.piece.row, nc)) s.piece.col = nc
    }
    function rotate() {
      const s = stateRef.current
      if (!s.piece || !s.running) return
      const rotated = rotateCW(s.piece.shape)
      if (fits(s.board, rotated, s.piece.row, s.piece.col)) {
        s.piece.shape = rotated
      } else if (fits(s.board, rotated, s.piece.row, s.piece.col - 1)) {
        s.piece.shape = rotated; s.piece.col--
      } else if (fits(s.board, rotated, s.piece.row, s.piece.col + 1)) {
        s.piece.shape = rotated; s.piece.col++
      }
    }
    function drop() {
      const s = stateRef.current
      if (!s.piece || !s.running) return
      while (fits(s.board, s.piece.shape, s.piece.row + 1, s.piece.col)) s.piece.row++
      lockPiece()
    }
    function softDrop() {
      const s = stateRef.current
      if (!s.piece || !s.running) return
      if (fits(s.board, s.piece.shape, s.piece.row + 1, s.piece.col)) s.piece.row++
    }

    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); move(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1) }
      if (e.key === 'ArrowDown')  { e.preventDefault(); softDrop() }
      if (e.key === 'ArrowUp')    { e.preventDefault(); rotate() }
      if (e.key === ' ')          { e.preventDefault(); drop() }
    }
    window.addEventListener('keydown', onKey)

    // Touch controls
    let swipeStart = null
    const onTouchStart = (e) => {
      swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
    }
    const onTouchEnd = (e) => {
      if (!swipeStart) return
      const dx = e.changedTouches[0].clientX - swipeStart.x
      const dy = e.changedTouches[0].clientY - swipeStart.y
      const dt = Date.now() - swipeStart.time
      swipeStart = null
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 200) { rotate(); return }
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1)
      else if (dy > 0 && Math.abs(dy) > 40) drop()
      else if (dy < 0) rotate()
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd, { passive: true })

    // On-screen buttons container
    const buttons = document.getElementById('eco-drop-btns')

    window.addEventListener('resize', resize)

    return () => {
      state.running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [spawnPiece, lockPiece])

  // On-screen controls
  const s = stateRef.current
  const handleBtn = (action) => {
    if (!s.piece || !s.running) return
    if (action === 'left')   { if (fits(s.board, s.piece.shape, s.piece.row, s.piece.col - 1)) s.piece.col-- }
    if (action === 'right')  { if (fits(s.board, s.piece.shape, s.piece.row, s.piece.col + 1)) s.piece.col++ }
    if (action === 'rotate') {
      const r = rotateCW(s.piece.shape)
      if (fits(s.board, r, s.piece.row, s.piece.col)) s.piece.shape = r
    }
    if (action === 'drop') {
      while (fits(s.board, s.piece.shape, s.piece.row + 1, s.piece.col)) s.piece.row++
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <canvas ref={canvasRef} style={{ flex: 1, width: '100%', touchAction: 'none', display: 'block' }} />
      <div id="eco-drop-btns" style={{
        display: 'flex', gap: 8, padding: '8px 16px', background: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
      }}>
        {[['◀','left'],['🔄','rotate'],['⬇','drop'],['▶','right']].map(([label, action]) => (
          <button
            key={action}
            onPointerDown={e => { e.preventDefault(); handleBtn(action) }}
            style={{
              width: 60, height: 48, borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', fontSize: action === 'rotate' ? 18 : 20,
              cursor: 'pointer', touchAction: 'none',
            }}
          >{label}</button>
        ))}
      </div>
    </div>
  )
}
