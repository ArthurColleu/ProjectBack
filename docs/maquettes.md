# Maquettes — WordlFR

## Palette graphique

| Usage | Couleur | Hex |
|-------|---------|-----|
| Fond principal | Slate 900 | `#0f172a` |
| Surface (cartes) | Slate 800 | `#1e293b` |
| Lettre correcte | Emerald 500 | `#10b981` |
| Lettre présente | Amber 400 | `#f59e0b` |
| Lettre absente | Slate 600 | `#475569` |
| Accent / boutons | Indigo 400 | `#818cf8` |
| Texte principal | Slate 100 | `#f1f5f9` |
| Texte secondaire | Slate 400 | `#94a3b8` |

## Écran 1 — Connexion / Inscription

```
┌─────────────────────────────────┐
│                                 │
│     WORDL FR                    │  ← titre, texte blanc + accent indigo
│  Le Wordle en français          │  ← sous-titre slate-400
│                                 │
│  ┌─────────────────────────┐    │
│  │  Connexion              │    │  ← card slate-800, border slate-700
│  │                         │    │
│  │  Email ____________     │    │  ← label + input (bg slate-900)
│  │  Mot de passe _____     │    │
│  │                         │    │
│  │  [   Se connecter   ]   │    │  ← bouton indigo-500
│  │                         │    │
│  │  Pas de compte ?        │    │
│  │  S'inscrire →           │    │  ← lien indigo-400
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

## Écran 2 — Jeu principal

```
┌────────────────────────────────────────┐
│ WORDL FR     Stats  Admin  Déconnexion │  ← header sticky, backdrop blur
├────────────────────────────────────────┤
│                                        │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐           │  ← rangée 1 : tentative résolue
│   │T │ │A │ │B │ │L │ │E │           │    (fond vert/orange/gris selon résultat)
│   └──┘ └──┘ └──┘ └──┘ └──┘           │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐           │  ← rangée courante (bord indigo)
│   │P │ │  │ │  │ │  │ │  │           │
│   └──┘ └──┘ └──┘ └──┘ └──┘           │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐           │  ← rangées vides (bord slate-700)
│   │  │ │  │ │  │ │  │ │  │           │
│   └──┘ └──┘ └──┘ └──┘ └──┘           │
│   [  4 rangées vides supplémentaires  ]│
│                                        │
│  [A][Z][E][R][T][Y][U][I][O][P]       │  ← clavier AZERTY
│   [Q][S][D][F][G][H][J][K][L][M]      │    couleurs mises à jour après chaque essai
│   [ENTRÉE][W][X][C][V][B][N][←]       │
│                                        │
└────────────────────────────────────────┘
```

## Écran 3 — Statistiques

```
┌────────────────────────────────────────┐
│ WORDL FR     Jouer  Admin  Déconnexion │
├────────────────────────────────────────┤
│  Mes statistiques                      │
│                                        │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐       │
│  │ 24 │  │ 83%│  │  5 │  │  8 │       │  ← 4 stat cards (bg slate-800)
│  │Ptys│  │Vic.│  │Sér.│  │Max │       │
│  └────┘  └────┘  └────┘  └────┘       │
│                                        │
│  Distribution des essais               │
│  1 ▓░░░░░░░░░░░  2                     │
│  2 ▓▓▓▓░░░░░░░░  5                     │  ← barres indigo proportionnelles
│  3 ▓▓▓▓▓▓▓░░░░  8                     │
│  4 ▓▓▓▓▓▓░░░░░  6                     │
│  5 ▓▓▓░░░░░░░░  3                     │
│  6 ░░░░░░░░░░░  0                     │
│                                        │
└────────────────────────────────────────┘
```

## Écran 4 — Administration

```
┌────────────────────────────────────────┐
│ WORDL FR ADMIN   Jouer  Stats  Déco.  │
├────────────────────────────────────────┤
│  Gestion des mots du jour              │
│                                        │
│  Ajouter un mot                        │
│  ┌──────────────┐ ┌───────┐ [Ajouter] │
│  │ 2026-07-01   │ │ TABLE │           │  ← date + mot + bouton
│  └──────────────┘ └───────┘           │
│                                        │
│  Mots planifiés (12)                   │
│  ┌──────────────────────────────────┐  │
│  │ 2026-07-03  FLEUR  [Modifier][✕]│  │  ← liste avec actions en ligne
│  │ 2026-07-02  PORTE  [Modifier][✕]│  │
│  │ 2026-07-01  TABLE  [Modifier][✕]│  │
│  │  (édition inline : champs édit.) │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Responsive mobile (375 px)

- Grille : tuiles `56×56 px` (au lieu de `64×64`)
- Clavier : touches `36×56 px`, tout tient en largeur
- Header : logo + icône menu (hamburger masqué si peu d'options)
- Stats : 2 colonnes au lieu de 4 pour les stat-cards
- Admin : formulaire en colonne
