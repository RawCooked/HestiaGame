import SmartHomeRescue from './games/SmartHomeRescue.jsx'
import GreenGrid from './games/GreenGrid.jsx'
import TapTheLeak from './games/TapTheLeak.jsx'
import CityPulse from './games/CityPulse.jsx'
import EcoDrop from './games/EcoDrop.jsx'
import EcoMergeTown from './games/EcoMergeTown.jsx'
import EcoTowerStack from './games/EcoTowerStack.jsx'
import RecycleRush from './games/RecycleRush.jsx'
import EcoRunner from './games/EcoRunner.jsx'

export const GAMES = [
  {
    id: 'smart-home',
    name: 'Smart Home\nRescue',
    icon: '🏠',
    color: '#ffb347',
    glow: 'rgba(255,179,71,0.25)',
    odds: 'ODD 7 · 11 · 12',
    description: 'Répare les fuites avant le game over!',
    component: SmartHomeRescue,
  },
  {
    id: 'green-grid',
    name: 'Green Grid',
    icon: '⚡',
    color: '#00ff9d',
    glow: 'rgba(0,255,157,0.25)',
    odds: 'ODD 7 · 13',
    description: 'Fusionne les énergies vers la fusion!',
    component: GreenGrid,
  },
  {
    id: 'tap-leak',
    name: 'Tap the Leak',
    icon: '💧',
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.25)',
    odds: 'ODD 6 · 7 · 12',
    description: 'Bouche les fuites, sauve les ressources!',
    component: TapTheLeak,
  },
  {
    id: 'city-pulse',
    name: 'City Pulse',
    icon: '🎵',
    color: '#ff6b9d',
    glow: 'rgba(255,107,157,0.25)',
    odds: 'ODD 7 · 11',
    description: 'Frappe au rythme, illumine la ville!',
    component: CityPulse,
  },
  {
    id: 'eco-drop',
    name: 'EcoDrop',
    icon: '🏗️',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.25)',
    odds: 'ODD 11',
    description: 'Construis des quartiers durables!',
    component: EcoDrop,
  },
  {
    id: 'eco-merge',
    name: 'Eco Merge\nTown',
    icon: '🌱',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.25)',
    odds: 'ODD 11 · 13 · 15',
    description: 'Fusionne pour créer une ville verte!',
    component: EcoMergeTown,
  },
  {
    id: 'eco-tower',
    name: 'EcoTower\nStack',
    icon: '🏙️',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.25)',
    odds: 'ODD 7 · 11 · 13',
    description: "Empile des étages eco jusqu'aux étoiles!",
    component: EcoTowerStack,
  },
  {
    id: 'recycle-rush',
    name: 'Recycle Rush',
    icon: '♻️',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.25)',
    odds: 'ODD 12',
    description: 'Trie les déchets à toute vitesse!',
    component: RecycleRush,
  },
  {
    id: 'eco-runner',
    name: 'Eco Runner',
    icon: '🏃',
    color: '#a3e635',
    glow: 'rgba(163,230,53,0.25)',
    odds: 'ODD 11 · 13 · 15',
    description: 'Cours et saute par-dessus la pollution!',
    component: EcoRunner,
  },
]
