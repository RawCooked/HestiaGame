import React, { useState, useEffect } from 'react'
import { getTopScores, getCumulativeScores } from '../firebase.js'
import { GAMES } from '../gamesConfig.js'

const TABS = [
  { id: 'total', label: '🏆 Total', gameId: null },
  ...GAMES.map(g => ({ id: g.id, label: `${g.icon} ${g.name.replace('\n', ' ')}`, gameId: g.id })),
]

function RankBadge({ rank }) {
  const cls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'other'
  const label = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank
  return <div className={`leaderboard-rank ${cls}`}>{label}</div>
}

export default function Leaderboard({ onBack }) {
  const [activeTab, setActiveTab] = useState('total')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setScores([])
    const tab = TABS.find(t => t.id === activeTab)
    const fetch = tab?.gameId
      ? getTopScores(tab.gameId, 10)
      : getCumulativeScores(10)

    fetch.then(data => {
      setScores(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [activeTab])

  const activeGame = GAMES.find(g => g.id === activeTab)

  return (
    <div className="leaderboard-screen screen screen-enter">
      <div className="leaderboard-header">
        <button className="game-header-back" onClick={onBack}>←</button>
        <h2 className="leaderboard-title">Classement</h2>
      </div>

      {/* Scrollable tabs */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id && activeGame
              ? { background: activeGame.color, borderColor: activeGame.color }
              : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="leaderboard-list">
        {loading && (
          <div className="empty-state">Chargement…</div>
        )}
        {!loading && scores.length === 0 && (
          <div className="empty-state">
            Aucun score pour l'instant.<br />Soyez le premier à jouer ! 🎮
          </div>
        )}
        {!loading && scores.map((entry, i) => (
          <div key={i} className="leaderboard-item">
            <RankBadge rank={i + 1} />
            <div className="leaderboard-name">{entry.name}</div>
            <div
              className="leaderboard-score"
              style={{ color: activeGame?.color || 'var(--accent)' }}
            >
              {entry.score.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
