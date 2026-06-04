import React, { useState, useEffect, useRef, useCallback } from 'react'

const DURATION = 90
const GRID_SIZE = 5

// Evolution chains — each tier has a value for scoring
const CHAINS = [
  // Nature chain
  [
    { emoji: '🌱', name: 'Graine',  value: 1,  color: '#86efac' },
    { emoji: '🌿', name: 'Pousse',  value: 3,  color: '#4ade80' },
    { emoji: '🌳', name: 'Arbre',   value: 10, color: '#22c55e' },
    { emoji: '🌲', name: 'Forêt',   value: 30, color: '#16a34a' },
    { emoji: '🏞️', name: 'Parc',    value: 100, color: '#15803d' },
  ],
  // Transport chain
  [
    { emoji: '🚲', name: 'Vélo',    value: 2,  color: '#93c5fd' },
    { emoji: '🛴', name: 'Trottinette', value: 5,  color: '#60a5fa' },
    { emoji: '🚌', name: 'Bus',     value: 15, color: '#3b82f6' },
    { emoji: '🚋', name: 'Tram',    value: 50, color: '#2563eb' },
    { emoji: '🚇', name: 'Métro',   value: 150, color: '#1d4ed8' },
  ],
]

// Flat lookup for fast merge
const ALL_ITEMS = CHAINS.flatMap((chain, ci) =>
  chain.map((item, ti) => ({ ...item, chain: ci, tier: ti, maxTier: chain.length - 1 }))
)

function makeEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
}

function getAdjacentSameType(grid, r, c, item) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
  const same = [[r, c]]
  const visited = new Set([`${r},${c}`])
  const queue = [[r, c]]
  while (queue.length) {
    const [cr, cc] = queue.shift()
    for (const [dr, dc] of dirs) {
      const nr = cr + dr, nc = cc + dc
      const key = `${nr},${nc}`
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue
      if (visited.has(key)) continue
      const cell = grid[nr][nc]
      if (cell && cell.chain === item.chain && cell.tier === item.tier) {
        visited.add(key)
        same.push([nr, nc])
        queue.push([nr, nc])
      }
    }
  }
  return same
}

export default function EcoMergeTown({ onGameOver, onScoreUpdate, accent }) {
  const [grid, setGrid] = useState(makeEmptyGrid)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [popups, setPopups] = useState([])
  const timerRef = useRef(null)
  const gameOverCalled = useRef(false)
  const scoreRef = useRef(0)

  const callOver = useCallback(() => {
    if (gameOverCalled.current) return
    gameOverCalled.current = true
    onGameOver(scoreRef.current)
  }, [onGameOver])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); callOver(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [callOver])

  const addScore = useCallback((pts, r, c) => {
    scoreRef.current += pts
    setScore(s => {
      const ns = s + pts
      onScoreUpdate(ns)
      return ns
    })
    // Floating popup
    setPopups(prev => [...prev.slice(-8), { id: Date.now() + Math.random(), r, c, text: `+${pts}` }])
    setTimeout(() => setPopups(prev => prev.slice(1)), 900)
  }, [onScoreUpdate])

  const handleCellTap = useCallback((r, c) => {
    if (timeLeft <= 0) return
    setGrid(prev => {
      const g = prev.map(row => [...row])
      if (g[r][c]) {
        // Already occupied — check for merge
        return prev
      }
      // Place a random basic item (tier 0)
      const chainIdx = Math.floor(Math.random() * CHAINS.length)
      const item = { ...ALL_ITEMS.find(i => i.chain === chainIdx && i.tier === 0) }
      g[r][c] = item

      // Check for merges (BFS to find connected same-type)
      let merged = true
      while (merged) {
        merged = false
        for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
            const cell = g[row][col]
            if (!cell) continue
            const group = getAdjacentSameType(g, row, col, cell)
            if (group.length >= 3) {
              // Merge! Remove all, place next tier at first cell
              for (const [gr, gc] of group) g[gr][gc] = null
              const nextTier = cell.tier + 1
              if (nextTier <= cell.maxTier) {
                const nextItem = ALL_ITEMS.find(i => i.chain === cell.chain && i.tier === nextTier)
                g[group[0][0]][group[0][1]] = { ...nextItem }
                addScore(nextItem.value * group.length, group[0][0], group[0][1])
              } else {
                addScore(cell.value * group.length * 3, group[0][0], group[0][1])
              }
              merged = true
            }
          }
        }
      }
      return g
    })
    if (navigator.vibrate) navigator.vibrate(12)
  }, [timeLeft, addScore])

  const handleFilledTap = useCallback((r, c) => {
    // Tap a filled cell — remove it (costs points)
    setGrid(prev => {
      const g = prev.map(row => [...row])
      if (g[r][c]) {
        // Small penalty
        setScore(s => {
          const ns = Math.max(0, s - 2)
          scoreRef.current = ns
          onScoreUpdate(ns)
          return ns
        })
        g[r][c] = null
      }
      return g
    })
  }, [onScoreUpdate])

  const pct = (timeLeft / DURATION) * 100
  const barColor = pct > 50 ? '#00ff9d' : pct > 25 ? '#ffb347' : '#ff4f5e'

  const cellSize = `calc((min(100vw, 480px) - 40px) / ${GRID_SIZE})`

  return (
    <div className="merge-grid-wrap">
      {/* Timer bar */}
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>⏱ {timeLeft}s</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>🌱 {score} pts</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 1s linear, background 0.3s' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
        <div
          className="merge-grid"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`merge-cell ${cell ? 'filled' : ''}`}
                style={cell ? { background: cell.color + '22', borderColor: cell.color + '55', boxShadow: `0 0 8px ${cell.color}30` } : {}}
                onClick={() => cell ? handleFilledTap(r, c) : handleCellTap(r, c)}
              >
                {cell && <>
                  <span className="merge-cell-emoji">{cell.emoji}</span>
                  <span className="merge-cell-name" style={{ color: cell.color }}>{cell.name}</span>
                </>}
              </div>
            ))
          )}
        </div>

        {/* Floating popups */}
        {popups.map(p => (
          <div
            key={p.id}
            className="score-popup"
            style={{
              top: `${(p.r / GRID_SIZE) * 100}%`,
              left: `${(p.c / GRID_SIZE) * 100 + 50 / GRID_SIZE}%`,
              transform: 'translateX(-50%)',
              color: accent,
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
        Tape une case vide · 3 adjacents = fusion!
      </p>
    </div>
  )
}
