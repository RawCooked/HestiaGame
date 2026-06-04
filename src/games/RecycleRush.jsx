import React, { useState, useEffect, useRef, useCallback } from 'react'

const DURATION = 60
const TIMER_START = 3000
const TIMER_MIN   = 1200

const ITEMS = [
  { name: 'Bouteille verre',    emoji: '🍾', bin: 0 },
  { name: 'Bocal',              emoji: '🫙', bin: 0 },
  { name: 'Verre brisé',       emoji: '🥛', bin: 0 },
  { name: 'Bouteille plastique',emoji: '🧴', bin: 1 },
  { name: 'Gobelet plastique',  emoji: '🥤', bin: 1 },
  { name: 'Sachet plastique',   emoji: '🛍️', bin: 1 },
  { name: 'Épluchure',          emoji: '🥕', bin: 2 },
  { name: 'Reste de repas',     emoji: '🍲', bin: 2 },
  { name: 'Marc de café',       emoji: '☕', bin: 2 },
  { name: 'Journal',            emoji: '📰', bin: 3 },
  { name: 'Boîte carton',       emoji: '📦', bin: 3 },
  { name: 'Carton de lait',     emoji: '🥛', bin: 3 },
]

const BINS = [
  { name: 'Verre',     emoji: '🍶', color: '#60a5fa' },
  { name: 'Plastique', emoji: '♻️', color: '#34d399' },
  { name: 'Organique', emoji: '🌿', color: '#86efac' },
  { name: 'Papier',    emoji: '📄', color: '#fbbf24' },
]

function pickItem() {
  return ITEMS[Math.floor(Math.random() * ITEMS.length)]
}

export default function RecycleRush({ onGameOver, onScoreUpdate, accent }) {
  const [currentItem, setCurrentItem] = useState(pickItem)
  const [timeLeft,    setTimeLeft]    = useState(DURATION)
  const [itemTimer,   setItemTimer]   = useState(TIMER_START)
  const [score,       setScore]       = useState(0)
  const [feedback,    setFeedback]    = useState(null)
  const [flashBin,    setFlashBin]    = useState(null)
  const [streak,      setStreak]      = useState(0)

  const scoreRef       = useRef(0)
  const streakRef      = useRef(0)
  const itemMaxRef     = useRef(TIMER_START)
  const lastItemRef    = useRef(performance.now())
  const rafRef         = useRef(null)
  const gameOverCalled = useRef(false)
  const timeLeftRef    = useRef(DURATION)
  const lockedRef      = useRef(false) // prevent double-tap during transition

  // Forward score to GameShell (outside of any state updater)
  useEffect(() => {
    onScoreUpdate(score)
  }, [score, onScoreUpdate])

  // Game countdown
  useEffect(() => {
    const id = setInterval(() => {
      timeLeftRef.current -= 1
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id)
          if (!gameOverCalled.current) {
            gameOverCalled.current = true
            // defer so React finishes this render
            setTimeout(() => onGameOver(scoreRef.current), 0)
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [onGameOver])

  // Item countdown via RAF (accurate timing)
  useEffect(() => {
    function tick(now) {
      const elapsed  = now - lastItemRef.current
      const max      = itemMaxRef.current
      const remaining = Math.max(0, max - elapsed)
      setItemTimer(remaining)

      if (remaining <= 0 && !lockedRef.current) {
        lockedRef.current = true
        const penalised = Math.max(0, scoreRef.current - 5)
        scoreRef.current = penalised
        streakRef.current = 0
        setScore(penalised)
        setStreak(0)
        setFeedback({ text: '⏰ Trop lent!', color: '#ff4f5e' })
        setTimeout(() => { setFeedback(null); nextItem(); lockedRef.current = false }, 600)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, []) // only runs once — uses refs for mutable state

  const nextItem = useCallback(() => {
    const elapsed   = DURATION - timeLeftRef.current
    const newMax    = Math.max(TIMER_MIN, TIMER_START - elapsed * 18 - streakRef.current * 25)
    itemMaxRef.current  = newMax
    lastItemRef.current = performance.now()
    setCurrentItem(pickItem())
  }, [])

  const handleBin = useCallback((binIdx) => {
    if (timeLeft <= 0 || lockedRef.current) return
    lockedRef.current = true

    const correct = currentItem.bin === binIdx
    setFlashBin({ idx: binIdx, correct })
    setTimeout(() => setFlashBin(null), 380)

    if (correct) {
      const newStreak = streakRef.current + 1
      streakRef.current = newStreak
      setStreak(newStreak)
      const bonus = Math.floor(newStreak / 3) * 5
      const pts   = 10 + bonus
      const newScore = scoreRef.current + pts
      scoreRef.current = newScore
      setScore(newScore)
      setFeedback({
        text: newStreak > 4 ? `🔥 x${newStreak}! +${pts}` : `✅ +${pts}`,
        color: '#00ff9d',
      })
      if (navigator.vibrate) navigator.vibrate([8, 4, 8])
    } else {
      streakRef.current = 0
      setStreak(0)
      const newScore = Math.max(0, scoreRef.current - 5)
      scoreRef.current = newScore
      setScore(newScore)
      setFeedback({ text: `❌ → ${BINS[currentItem.bin].name}!`, color: '#ff4f5e' })
      if (navigator.vibrate) navigator.vibrate(50)
    }

    setTimeout(() => { setFeedback(null); nextItem(); lockedRef.current = false }, 250)
  }, [currentItem, timeLeft, nextItem])

  const pctGame = (timeLeft / DURATION) * 100
  const pctItem = itemMaxRef.current > 0 ? (itemTimer / itemMaxRef.current) * 100 : 0
  const gameColor = pctGame > 50 ? '#00ff9d' : pctGame > 25 ? '#ffb347' : '#ff4f5e'
  const itemColor = pctItem > 60 ? '#00ff9d' : pctItem > 30 ? '#ffb347' : '#ff4f5e'

  return (
    <div className="recycle-wrap">
      {/* Game timer */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <span style={{ color: gameColor }}>⏱ {timeLeft}s</span>
          {streak > 1 && <span style={{ color: '#fbbf24', animation: 'pulseScale 0.3s ease' }}>🔥 x{streak}</span>}
          <span style={{ color: accent }}>♻️ {score}</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pctGame}%`,
            background: gameColor, borderRadius: 2,
            transition: 'width 1s linear, background 0.3s',
          }} />
        </div>
      </div>

      {/* Item display */}
      <div className="recycle-item-display">
        <div key={currentItem.emoji} className="recycle-item-emoji">{currentItem.emoji}</div>
        <div className="recycle-item-name">{currentItem.name}</div>

        {/* Item countdown */}
        <div className="recycle-timer-bar">
          <div
            className="recycle-timer-fill"
            style={{ width: `${pctItem}%`, background: itemColor }}
          />
        </div>

        {feedback && (
          <div style={{
            fontSize: 18, fontWeight: 800, color: feedback.color,
            animation: 'screenIn 0.15s ease',
          }}>
            {feedback.text}
          </div>
        )}
      </div>

      {/* Bins */}
      <div className="recycle-bins">
        {BINS.map((bin, i) => (
          <button
            key={i}
            className={`recycle-bin-btn ${
              flashBin?.idx === i ? (flashBin.correct ? 'correct-flash' : 'wrong-flash') : ''
            }`}
            style={{
              background: bin.color + '18',
              borderColor: flashBin?.idx === i
                ? (flashBin.correct ? '#00ff9d' : '#ff4f5e')
                : bin.color + '40',
            }}
            onPointerDown={() => handleBin(i)}
          >
            <span className="recycle-bin-icon">{bin.emoji}</span>
            <span className="recycle-bin-label" style={{ color: bin.color }}>{bin.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
