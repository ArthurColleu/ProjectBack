# WordlFR — Application full-stack CDA (RNCP 37873)

Jeu **Wordle** quotidien en français, reconstruit en application full-stack 3-tier pour le dossier projet **Concepteur Développeur d'Applications**.

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | Vite + React + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript (3-tier) |
| Base de données | PostgreSQL 16 (Docker) |
| Auth | JWT httpOnly cookie + bcrypt |
| Tests | Vitest (unitaires) + Supertest (intégration) |
| DevOps | Docker Compose + CI GitHub Actions |

## Démarrage rapide (Docker)

```bash
cp .env.example .env
# Éditez .env pour définir JWT_SECRET (obligatoire en production)
docker compose up --build
```

L'application est disponible sur **http://localhost:8080**

Compte admin par défaut : `admin@wordle.local` / `changeme123` (configurables via `.env`).

## Développement local

### Prérequis
- Node.js 22+
- PostgreSQL (ou Docker pour la base uniquement)

### API

```bash
# Base de données seule
docker compose up db -d

# Dans apps/api
npm install
npm run dev       # http://localhost:3001
npm test          # 51 tests — vitest + supertest + pg-mem
```

### Frontend

```bash
# Dans apps/web
npm install
npm run dev       # http://localhost:8080 (proxy /api → :3001)
npm run build     # build de production
```

## Architecture 3-tier

```
apps/
  api/                   # Backend Express + TypeScript
    src/
      domain/            # Logique métier pure (evaluateGuess, stats, dictionary, fallbackWord)
      modules/auth/      # Inscription, connexion, JWT, RGPD
      modules/games/     # Jeu du jour, soumission essais (anti-triche serveur)
      modules/stats/     # Statistiques joueur (SQL agrégation)
      modules/words/     # CRUD admin mots du jour
      modules/health/    # Healthcheck DevOps
      middlewares/       # authenticate, authorize(role), errorHandler, rateLimit
      db/                # pool pg, migrations SQL, seed idempotent
    tests/
      unit/              # domain purement fonctionnel (Vitest)
      integration/       # API complète (Supertest + pg-mem, sans Docker)
  web/                   # Frontend Vite + React SPA
    src/
      api/client.ts      # Fetch wrapper typé (credentials: include)
      auth/AuthContext   # État d'authentification global
      pages/             # Login, Register, Game, Stats, Admin
      components/        # GameBoard, GameTile (flip 3D), Keyboard AZERTY
docker-compose.yml
.github/workflows/ci.yml
docs/                    # Documentation CDA
```

## Flux 3-tier (exemple : soumettre un essai)

```
POST /api/game/guess
  → games.routes (Express Router)
  → games.controller (validation Zod, HTTP 400/409)
  → games.service (règles métier : limite 6 essais lue en BDD, evaluateGuess)
  → games.repository (SQL paramétré : INSERT guesses, UPDATE games)
  → PostgreSQL
  ← { result, status }  ← le mot n'est JAMAIS retourné au client
```

## Sécurité (OWASP Top 10)

| Risque | Mesure |
|--------|--------|
| A01 Broken Access Control | `authorize('admin')`, isolation des données par joueur |
| A02 Cryptographic Failures | bcrypt (hash mdp), JWT signé HS256, cookie httpOnly + SameSite=Strict |
| A03 Injection | **100 % requêtes SQL paramétrées** (`$1,$2`), validation Zod sur tous les bodies |
| A05 Misconfiguration | helmet (en-têtes HTTP), CORS liste blanche, pas de stack trace exposée |
| A07 Auth Failures | rate-limit login, mdp ≥ 8 caractères, expiration JWT |

## Accessibilité (RGAA)

- Structure sémantique HTML5 (`main`, `header`, `nav`, `section`, `ul/li`)
- `lang="fr"` sur `<html>`
- `aria-label`, `aria-live`, `role="alert"`, `role="status"`
- Lien d'évitement `<a href="#main" class="skip-link">` (visible au focus clavier)
- Navigation clavier complète (aucun composant inaccessible)
- Contrastes conformes AA (fond #0f172a / texte #f1f5f9)

## Tests

```bash
cd apps/api && npm test
# 51 tests — 13 fichiers (domain ×5, lib ×3, repository ×1, intégration ×4)
```

## Documentation CDA

Voir [`docs/`](docs/) :
- [Cahier des charges](docs/cahier-des-charges.md)
- [Modèle de données MCD/MLD](docs/mcd-mld.md)
- [Maquettes](docs/maquettes.md)
- [Plan de tests](docs/plan-de-tests.md)
- [Documentation déploiement](docs/deploiement.md)
- [Note sécurité OWASP](docs/securite-owasp.md)
- [Note éco-conception Green IT](docs/green-it.md)
- [Note RGPD](docs/rgpd.md)
