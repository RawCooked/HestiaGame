import React, { useState, useCallback, useRef, useEffect } from 'react'
import Logo from './Logo.jsx'
import { submitScore } from '../firebase.js'

export default function GameShell({ gameData, playerName, onBack, onGameOver, bestScore }) {
  const [phase,      setPhase]      = useState('ready')
  const [score,      setScore]      = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [playKey,    setPlayKey]    = useState(0)
  const [isBest,     setIsBest]     = useState(false)
  const [displayScore, setDisplayScore] = useState(0)

  const submitted      = useRef(false)
  const gameOverCalled = useRef(false)
  const targetScore    = useRef(0)
  const rafRef         = useRef(null)
  const scoreElRef     = useRef(null)
  const prevScore      = useRef(0)

  // Lerp-animate the displayed score number
  useEffect(() => {
    if (phase !== 'playing') return
    function tick() {
      const diff = targetScore.current - displayScore
      if (Math.abs(diff) < 1) {
        setDisplayScore(targetScore.current)
        return
      }
      setDisplayScore(v => {
        const next = Math.round(v + diff * 0.25)
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, displayScore])

  // Pulse animation on score change
  useEffect(() => {
    if (score !== prevScore.current && scoreElRef.current) {
      scoreElRef.current.animate(
        [{ transform: 'scale(1.35)', color: gameData.color },
         { transform: 'scale(1)',    color: '#ffffff' }],
        { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      )
      prevScore.current = score
    }
  }, [score, gameData.color])

  const handleScoreUpdate = useCallback((s) => {
    targetScore.current = s
    setScore(s)
  }, [])

  const handleGameOver = useCallback(async (s) => {
    if (gameOverCalled.current) return
    gameOverCalled.current = true
    setFinalScore(s)
    setDisplayScore(s)
    setPhase('gameover')
    const newBest = s > bestScore
    setIsBest(newBest)
    onGameOver(s)

    if (playerName && !submitted.current) {
      submitted.current = true
      await submitScore({ game: gameData.id, name: playerName, score: s })
    }
  }, [bestScore, playerName, gameData.id, onGameOver])

  const handleReplay = useCallback(() => {
    targetScore.current = 0
    prevScore.current   = 0
    setScore(0)
    setDisplayScore(0)
    setFinalScore(0)
    setPhase('playing')
    setPlayKey(k => k + 1)
    submitted.current      = false
    gameOverCalled.current = false
    setIsBest(false)
    if (navigator.vibrate) navigator.vibrate(30)
  }, [])

  const handleStart = useCallback(() => {
    setPhase('playing')
    if (navigator.vibrate) navigator.vibrate(20)
  }, [])

  const GameComponent = gameData.component

  return (
    <div className="game-shell screen screen-enter">
      {/* Header */}
      <div className="game-header">
        <button className="game-header-back" onClick={onBack}>←</button>
        <div className="game-header-info">
          <div className="game-header-name">
            {playerName || 'Joueur'} · {gameData.icon} {gameData.name.replace('\n', ' ')}
          </div>
          <div
            ref={scoreElRef}
            className="game-header-score"
            style={{ color: gameData.color, display: 'inline-block' }}
          >
            {displayScore.toLocaleString()}
          </div>
        </div>
        <Logo size="sm" />
      </div>

      {/* Game area */}
      <div className="game-area">
        {phase === 'ready' && (
          <div className="game-ready screen-enter">
            <div
              className="game-ready-icon"
              style={{
                filter: `drop-shadow(0 0 24px ${gameData.color})`,
                animation: 'floatIcon 3s ease-in-out infinite',
              }}
            >
              {gameData.icon}
            </div>
            <h2 className="game-ready-title" style={{ color: gameData.color }}>
              {gameData.name.replace('\n', ' ')}
            </h2>
            <p className="game-ready-desc">{gameData.description}</p>
            <p style={{
              fontSize: 11, color: 'var(--text-3)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 1.5,
            }}>
              {gameData.odds}
            </p>
            <button
              className="btn btn-primary btn-full"
              style={{ background: gameData.color, color: '#0a0e1a', maxWidth: 240, marginTop: 8 }}
              onClick={handleStart}
            >
              ▶ Jouer
            </button>
            {bestScore > 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Record : <span style={{ color: gameData.color, fontWeight: 700 }}>
                  {bestScore.toLocaleString()}
                </span>
              </p>
            )}
          </div>
        )}

        {phase === 'playing' && (
          <GameComponent
            key={playKey}
            onGameOver={handleGameOver}
            onScoreUpdate={handleScoreUpdate}
            accent={gameData.color}
            playerName={playerName}
          />
        )}

        {phase === 'gameover' && (
          <GameOverScreen
            finalScore={finalScore}
            bestScore={Math.max(bestScore, finalScore)}
            isBest={isBest}
            color={gameData.color}
            onReplay={handleReplay}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  )
}

// ── Separate component so it mounts fresh and can run its own animations ──
function GameOverScreen({ finalScore, bestScore, isBest, color, onReplay, onBack }) {
  const scoreRef = useRef(null)
  const [display, setDisplay] = useState(0)

  // Count-up animation
  useEffect(() => {
    let start = null
    const duration = 900
    function step(ts) {
      if (!start) start = ts
      const pct = Math.min(1, (ts - start) / duration)
      // ease out cubic
      const eased = 1 - Math.pow(1 - pct, 3)
      setDisplay(Math.round(finalScore * eased))
      if (pct < 1) requestAnimationFrame(step)
    }
    const raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [finalScore])

  return (
    <div className="gameover-overlay screen-enter">
      {isBest && <div className="confetti-burst" aria-hidden />}

      <div className="gameover-title">
        {isBest ? '🎉 Nouveau record !' : 'Partie terminée'}
      </div>

      <div
        ref={scoreRef}
        className="gameover-score"
        style={{ '--color': color }}
      >
        {display.toLocaleString()}
      </div>

      <div className="gameover-best">
        {isBest
          ? <span style={{ color }}>✨ Meilleur score !</span>
          : <>Record : <span style={{ color, fontWeight: 700 }}>{bestScore.toLocaleString()}</span></>
        }
      </div>

      <Logo size="sm" />

      <div className="gameover-actions">
        <button
          className="btn btn-primary btn-full"
          style={{ background: color, color: '#0a0e1a' }}
          onClick={onReplay}
        >
          🔄 Rejouer
        </button>
        <button className="btn btn-secondary btn-full" onClick={onBack}>
          ← Retour au menu
        </button>
      </div>
    </div>
  )
}
