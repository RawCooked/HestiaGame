import React, { useState, useCallback, useEffect } from 'react'
import Hub from './components/Hub.jsx'
import GameShell from './components/GameShell.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import { GAMES } from './gamesConfig.js'

export { GAMES }

// ── localStorage helpers — scores keyed per player ────────────────────────
const LS_NAME = 'hestia_player'

// Each player has their own key: "hestia_scores_youssef"
function scoresKey(name) {
  return `hestia_scores_${name.toLowerCase().trim()}`
}
function loadName() { return localStorage.getItem(LS_NAME) || '' }
function loadScoresFor(name) {
  if (!name) return {}
  try { return JSON.parse(localStorage.getItem(scoresKey(name)) || '{}') }
  catch { return {} }
}
function saveScoresFor(name, scores) {
  if (!name) return
  localStorage.setItem(scoresKey(name), JSON.stringify(scores))
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [savedName,     setSavedName]     = useState(loadName)
  const [playerName,    setPlayerName]    = useState(loadName)
  const [bestScores,    setBestScores]    = useState(() => loadScoresFor(loadName()))
  const [screen,        setScreen]        = useState('login')
  const [currentGameId, setCurrentGameId] = useState(null)

  const currentGame = GAMES.find(g => g.id === currentGameId)

  // Persist scores under the current player's key whenever they change
  useEffect(() => {
    if (playerName) saveScoresFor(playerName, bestScores)
  }, [bestScores, playerName])

  // ── Login / player change ─────────────────────────────────────────────
  const handleEnter = useCallback((name) => {
    localStorage.setItem(LS_NAME, name)
    setSavedName(name)
    setPlayerName(name)
    // Load THIS player's scores (may be non-empty if they played before)
    setBestScores(loadScoresFor(name))
    setScreen('hub')
  }, [])

  const handleChangePlayer = useCallback(() => {
    // Only clear the active name — each player's scores stay in their own key
    localStorage.removeItem(LS_NAME)
    setSavedName('')
    setPlayerName('')
    setBestScores({})
    setScreen('login')
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────
  const handlePlay = useCallback((gameId) => {
    setCurrentGameId(gameId)
    setScreen('game')
  }, [])

  const handleGameOver = useCallback((score) => {
    setBestScores(prev => {
      const current = prev[currentGameId] || 0
      return score > current ? { ...prev, [currentGameId]: score } : prev
    })
  }, [currentGameId])

  const handleBack = useCallback(() => {
    setScreen('hub')
    setCurrentGameId(null)
  }, [])

  return (
    <div className="app">
      {/* Subtle static gradient bg — no canvas, no scroll interference */}
      <div className="app-bg" aria-hidden />

      {screen === 'login' && (
        <LoginScreen
          key="login"
          savedName={savedName}
          onEnter={handleEnter}
          onChangePlayer={handleChangePlayer}
        />
      )}

      {screen === 'hub' && (
        <Hub
          key="hub"
          playerName={playerName}
          onPlay={handlePlay}
          onLeaderboard={() => setScreen('leaderboard')}
          onChangePlayer={() => setScreen('login')}
          bestScores={bestScores}
        />
      )}

      {screen === 'game' && currentGame && (
        <GameShell
          key={`game-${currentGameId}`}
          gameData={currentGame}
          playerName={playerName}
          onBack={handleBack}
          onGameOver={handleGameOver}
          bestScore={bestScores[currentGameId] || 0}
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard key="lb" onBack={handleBack} />
      )}
    </div>
  )
}
