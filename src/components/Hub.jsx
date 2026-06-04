import React from 'react'
import Logo from './Logo.jsx'
import { GAMES } from '../gamesConfig.js'

function fmt(n) {
  if (!n) return null
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function Hub({ playerName, onPlay, onLeaderboard, onChangePlayer, bestScores }) {
  const handlePlay = (game) => {
    if (navigator.vibrate) navigator.vibrate(20)
    onPlay(game.id)
  }

  return (
    <div className="hub screen screen-enter">
      <div className="hub-header">
        <Logo size="md" />
        <h1 className="hub-title">ODD Game Challenge</h1>
        <p className="hub-subtitle">Architecture durable · Ville écologique</p>

        {/* Player badge */}
        <button
          className="hub-player-badge"
          onClick={onChangePlayer}
          title="Changer de joueur"
        >
          👤 {playerName}
          <span style={{ fontSize: 10, opacity: 0.5 }}>✎</span>
        </button>
      </div>

      <div className="games-grid">
        {GAMES.map((game, i) => {
          const best = fmt(bestScores[game.id])
          // Odd-count last card spans full width
          const isLast = i === GAMES.length - 1 && GAMES.length % 2 !== 0
          return (
            <button
              key={game.id}
              className="game-card"
              onClick={() => handlePlay(game)}
              style={{
                animationDelay: `${i * 55}ms`,
                ...(isLast ? { gridColumn: '1 / -1', aspectRatio: '2.5 / 1' } : {}),
              }}
            >
              <div
                className="game-card-bg"
                style={{
                  background: `radial-gradient(circle at 50% 40%, ${game.color}, transparent 70%)`,
                }}
              />
              <div className="game-card-shimmer" />

              {best && (
                <span className="game-card-score" style={{ color: game.color }}>
                  {best}
                </span>
              )}

              <span
                className="game-card-icon"
                style={{ filter: `drop-shadow(0 0 10px ${game.color})` }}
              >
                {game.icon}
              </span>
              <span className="game-card-name" style={{ color: game.color }}>
                {game.name}
              </span>
              <span className="game-card-odds">{game.odds}</span>
            </button>
          )
        })}
      </div>

      <button className="leaderboard-btn" onClick={onLeaderboard}>
        🏆 Classement global
      </button>

      <div style={{ height: 16 }} />
    </div>
  )
}
