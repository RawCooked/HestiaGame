import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCL4cB6loL0XtxljIUa8Hd92Ff4mw9ftO8",
  authDomain: "eshopproject-19bb4.firebaseapp.com",
  projectId: "eshopproject-19bb4",
  storageBucket: "eshopproject-19bb4.appspot.com",
  messagingSenderId: "863268336252",
  appId: "1:863268336252:web:e90c30527cf0c56f0d4ff9"
}

let db = null
let firebaseEnabled = false

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  db = getFirestore(app)
  firebaseEnabled = true
} catch (e) {
  console.warn('Firebase init failed — using localStorage fallback', e)
}

export async function submitScore({ game, name, score }) {
  const entry = { game, name, score, date: Date.now() }

  if (firebaseEnabled && db) {
    try {
      await addDoc(collection(db, 'scores'), entry)
      return true
    } catch (e) {
      console.warn('Firebase write failed — fallback to localStorage', e)
    }
  }

  const key = 'hestia_scores'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push(entry)
  localStorage.setItem(key, JSON.stringify(existing))
  return false
}

export async function getTopScores(game, limitCount = 10) {
  if (firebaseEnabled && db) {
    try {
      // No orderBy — avoids composite index requirement; sort client-side
      const q = query(
        collection(db, 'scores'),
        where('game', '==', game),
        limit(200)
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => d.data())
        .sort((a, b) => b.score - a.score)
        .slice(0, limitCount)
    } catch (e) {
      console.warn('Firebase read failed — fallback to localStorage', e)
    }
  }

  const all = JSON.parse(localStorage.getItem('hestia_scores') || '[]')
  return all
    .filter(s => s.game === game)
    .sort((a, b) => b.score - a.score)
    .slice(0, limitCount)
}

export async function getCumulativeScores(limitCount = 10) {
  let allScores = []

  if (firebaseEnabled && db) {
    try {
      const q = query(collection(db, 'scores'), orderBy('score', 'desc'))
      const snap = await getDocs(q)
      allScores = snap.docs.map(d => d.data())
    } catch (e) {
      console.warn('Firebase read failed')
    }
  }

  if (allScores.length === 0) {
    allScores = JSON.parse(localStorage.getItem('hestia_scores') || '[]')
  }

  // Best score per player per game, then cumulate
  const playerBest = {}
  for (const s of allScores) {
    const k = `${s.name}__${s.game}`
    if (!playerBest[k] || s.score > playerBest[k]) playerBest[k] = s.score
  }

  const totals = {}
  for (const [k, score] of Object.entries(playerBest)) {
    const name = k.split('__')[0]
    totals[name] = (totals[name] || 0) + score
  }

  return Object.entries(totals)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limitCount)
}
