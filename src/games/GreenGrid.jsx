import React, { useState, useEffect, useRef, useCallback } from 'react'

// Energy evolution chain
const TILES = [
  { value: 2,   emoji: '🪨', label: 'Charbon', color: '#6b7280', bg: '#374151' },
  { value: 4,   emoji: '🛢️', label: 'Gaz',     color: '#92400e', bg: '#451a03' },
  { value: 8,   emoji: '☀️', label: 'Solaire', color: '#fbbf24', bg: '#451a03' },
  { value: 16,  emoji: '💨', label: 'Éolien',  color: '#67e8f9', bg: '#164e63' },
  { value: 32,  emoji: '💧', label: 'Hydro',   color: '#60a5fa', bg: '#1e3a8a' },
  { value: 64,  emoji: '⚛️', label: 'Fusion',  color: '#00ff9d', bg: '#064e3b' },
  { value: 128, emoji: '✨', label: 'Ultra',   color: '#f0abfc', bg: '#4a044e' },
]

const getTile = (v) => TILES.find(t => t.value === v) || TILES[TILES.length - 1]

function emptyGrid() {
  return Array.from({ length: 4 }, () => Array(4).fill(0))
}

function addRandom(grid) {
  const empty = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) empty.push([r, c])
  if (!empty.length) return grid
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const next = grid.map(row => [...row])
  next[r][c] = 2
  return next
}

function slide(row) {
  const nums = row.filter(Boolean)
  const merged = []
  let score = 0
  let i = 0
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const v = nums[i] * 2
      merged.push(v)
      score += v
      i += 2
    } else {
      merged.push(nums[i++])
    }
  }
  while (merged.length < 4) merged.push(0)
  return { row: merged, score }
}

function moveGrid(grid, dir) {
  let totalScore = 0
  let moved = false
  let next = grid.map(r => [...r])

  const transform = {
    left:  g => g,
    right: g => g.map(r => [...r].reverse()),
    up:    g => g[0].map((_, c) => g.map(r => r[c])),
    down:  g => g[0].map((_, c) => g.map(r => r[c]).reverse()),
  }
  const untransform = {
    left:  g => g,
    right: g => g.map(r => [...r].reverse()),
    up:    g => g[0].map((_, c) => g.map(r => r[c])),
    down:  g => g[0].map((_, c) => g.map(r => r[c]).reverse()),
  }

  let t = transform[dir](next)
  t = t.map(row => {
    const { row: nr, score } = slide(row)
    totalScore += score
    if (nr.join() !== row.join()) moved = true
    return nr
  })
  next = untransform[dir](t)
  return { grid: next, score: totalScore, moved }
}

function isGameOver(grid) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (!grid[r][c]) return false
    if (c < 3 && grid[r][c] === grid[r][c + 1]) return false
    if (r < 3 && grid[r][c] === grid[r + 1][c]) return false
  }
  return true
}

export default function GreenGrid({ onGameOver, onScoreUpdate, accent }) {
  const [grid, setGrid] = useState(() => addRandom(addRandom(emptyGrid())))
  const [score, setScore] = useState(0)
  const [over, setOver] = useState(false)
  const touchStart = useRef(null)
  const gameOverCalled = useRef(false)

  const callOver = useCallback((s) => {
    if (gameOverCalled.current) return
    gameOverCalled.current = true
    onGameOver(s)
  }, [onGameOver])

  const doMove = useCallback((dir) => {
    if (over) return
    setGrid(prev => {
      const { grid: next, score: gained, moved } = moveGrid(prev, dir)
      if (!moved) return prev
      const withNew = addRandom(next)
      setScore(s => {
        const ns = s + gained
        onScoreUpdate(ns)
        if (isGameOver(withNew)) {
          setOver(true)
          setTimeout(() => callOver(ns), 300)
        }
        return ns
      })
      return withNew
    })
  }, [over, onScoreUpdate, callOver])

  // Keyboard support
  useEffect(() => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
    const onKey = (e) => { if (map[e.key]) { e.preventDefault(); doMove(map[e.key]) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doMove])

  // Touch swipe
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left')
    else doMove(dy > 0 ? 'down' : 'up')
  }

  return (
    <div
      className="green-grid-wrap"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
        ← Swipe pour fusionner →
      </div>

      <div className="gg-grid">
        {grid.flat().map((val, i) => {
          const tile = val ? getTile(val) : null
          return (
            <div
              key={i}
              className="gg-cell"
              style={tile
                ? { background: tile.bg, border: `1px solid ${tile.color}40`, boxShadow: `0 0 10px ${tile.color}30` }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }
              }
            >
              {tile && <>
                <span className="gg-cell-emoji">{tile.emoji}</span>
                <span className="gg-cell-value" style={{ color: tile.color }}>{tile.label}</span>
              </>}
            </div>
          )
        })}
      </div>

      {/* Arrow pad for desktop / accessibility */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 20px' }} onClick={() => doMove('up')}>▲</button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost" style={{ padding: '8px 16px' }} onClick={() => doMove('left')}>◀</button>
          <button className="btn btn-ghost" style={{ padding: '8px 16px' }} onClick={() => doMove('down')}>▼</button>
          <button className="btn btn-ghost" style={{ padding: '8px 16px' }} onClick={() => doMove('right')}>▶</button>
        </div>
      </div>

      {over && (
        <div style={{ color: accent, fontWeight: 700, fontSize: 16, textAlign: 'center' }}>
          Grille bloquée ! Score : {score.toLocaleString()}
        </div>
      )}
    </div>
  )
}
