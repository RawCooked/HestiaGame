# 🌱 Hestia — ODD Game Challenge

Application web de mini-jeux "score attack" sur les Objectifs de Développement Durable (ODD), l'architecture durable et la ville écologique.

## 🚀 Installation & lancement local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173

## 🔥 Configuration Firebase (optionnelle)

Firebase est déjà configuré dans `src/firebase.js`. Si tu veux utiliser ton propre projet :

1. Crée un projet sur [Firebase Console](https://console.firebase.google.com)
2. Active **Firestore Database** en mode production
3. Ajoute la règle Firestore suivante :
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /scores/{doc} {
         allow read: if true;
         allow write: if true;
       }
     }
   }
   ```
4. Remplace la config dans `src/firebase.js` par celle de ton projet

> **Fallback** : Sans Firebase configuré, les scores sont sauvegardés en localStorage — l'app fonctionne entièrement hors ligne.

## 🖼️ Ajouter ton logo

Place ton fichier logo à **`public/logo.png`** (ou `public/logo.svg`).

Le composant `<Logo />` le chargera automatiquement. Si le fichier est absent, un placeholder texte "HESTIA" s'affiche.

## 🌐 Déploiement sur GitHub Pages

1. Vérifie que `base` dans `vite.config.js` correspond au nom de ton repo GitHub :
   ```js
   base: '/NOM-DE-TON-REPO/',
   ```

2. Dans `package.json`, assure-toi que `homepage` est correct ou utilise directement :
   ```bash
   npm run deploy
   ```

   Cela lance `npm run build && gh-pages -d dist`.

3. Dans les settings GitHub du repo :
   - Settings → Pages → Source : **gh-pages branch**

4. L'app sera disponible à `https://TON-USERNAME.github.io/NOM-DE-TON-REPO/`

## 🎮 Les 8 jeux

| # | Jeu | ODD | Mécanique |
|---|-----|-----|-----------|
| 1 | Smart Home Rescue | 7·11·12 | Tape pour corriger les problèmes dans la maison |
| 2 | Green Grid | 7·13 | Fusionne les énergies (type 2048) |
| 3 | Tap the Leak | 6·7·12 | Bouche les fuites avant qu'elles expirent |
| 4 | City Pulse | 7·11 | Jeu de rythme avec Web Audio API |
| 5 | EcoDrop | 11 | Tetris avec des blocs écolos |
| 6 | Eco Merge Town | 11·13·15 | Fusionne 3 éléments adjacents identiques |
| 7 | EcoTower Stack | 7·11·13 | Empile des étages en tapant au bon moment |
| 8 | Recycle Rush | 12 | Trie les déchets dans la bonne poubelle |

## 📁 Structure du projet

```
src/
├── App.jsx              — Navigation + registre des jeux
├── firebase.js          — Firebase + fallback localStorage
├── index.css            — Design system complet (dark + néon)
├── main.jsx
├── components/
│   ├── Hub.jsx          — Écran d'accueil
│   ├── GameShell.jsx    — Wrapper ready/playing/gameover
│   ├── Leaderboard.jsx  — Top 10 par jeu + cumul
│   ├── Logo.jsx         — Logo avec fallback texte
│   └── NameInput.jsx    — Champ prénom
└── games/
    ├── SmartHomeRescue.jsx
    ├── GreenGrid.jsx
    ├── TapTheLeak.jsx
    ├── CityPulse.jsx
    ├── EcoDrop.jsx
    ├── EcoMergeTown.jsx
    ├── EcoTowerStack.jsx
    └── RecycleRush.jsx
```
