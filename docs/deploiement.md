# Documentation de déploiement — WordlFR

## 1. Architecture de déploiement

```
Internet
    │
    ▼
┌─────────────┐    Port 80
│  nginx (web)│◄─── utilisateur
│  SPA React  │
└──────┬──────┘
       │ /api/* proxy
       ▼
┌─────────────┐    Port 3001
│   api       │
│   Express   │
└──────┬──────┘
       │ TCP 5432
       ▼
┌─────────────┐
│   db        │
│ PostgreSQL  │
│   (volume)  │
└─────────────┘
```

## 2. Démarrage (Docker Compose)

### 2.1 Prérequis

- Docker Engine 24+ et Docker Compose v2
- Port 8080 et 3001 disponibles

### 2.2 Procédure

```bash
git clone <repo>
cd ProjectBack

# 1. Copier et configurer les variables d'environnement
cp .env.example .env
nano .env   # Définir JWT_SECRET, ADMIN_PASSWORD, POSTGRES_PASSWORD

# 2. Construire et démarrer
docker compose up --build -d

# 3. Vérifier que tout est sain
docker compose ps
curl http://localhost:3001/api/health
# → {"status":"ok","db":true}

# 4. Accéder à l'application
open http://localhost:8080
```

### 2.3 Mise à jour

```bash
git pull
docker compose up --build -d
```

Les migrations SQL sont appliquées automatiquement au démarrage de l'API (via `migrate.ts`).

## 3. Variables d'environnement

| Variable | Obligatoire | Défaut | Description |
|----------|------------|--------|-------------|
| `JWT_SECRET` | **oui** | — | Secret de signature JWT (min 32 caractères aléatoires) |
| `POSTGRES_PASSWORD` | non | `wordle` | Mot de passe PostgreSQL |
| `ADMIN_EMAIL` | non | `admin@wordle.local` | Email du compte admin créé au démarrage |
| `ADMIN_PASSWORD` | non | `changeme123` | Mot de passe du compte admin |

### Générer un JWT_SECRET sécurisé

```bash
openssl rand -base64 48
```

## 4. Santé et monitoring

```bash
# Healthcheck intégré (Docker attend ce healthcheck avant de marquer le service "healthy")
curl http://localhost:3001/api/health
# {"status":"ok","db":true}

# Logs
docker compose logs api --tail=50 --follow
docker compose logs db --tail=50
```

## 5. Sauvegarde des données

```bash
# Dump PostgreSQL
docker compose exec db pg_dump -U wordle wordle > backup_$(date +%Y%m%d).sql

# Restauration
docker compose exec -T db psql -U wordle wordle < backup_YYYYMMDD.sql
```

## 6. Développement local (sans Docker)

### API

```bash
cd apps/api
npm install
DATABASE_URL=postgres://wordle:wordle@localhost:5432/wordle \
JWT_SECRET=dev-secret-change-me \
npm run dev
```

### Frontend

```bash
cd apps/web
npm install
npm run dev    # Proxy /api → http://localhost:3001 (cf. vite.config.ts)
```

## 7. CI/CD (GitHub Actions)

Le pipeline `.github/workflows/ci.yml` s'exécute sur chaque push et pull request :

1. **api job** : `npm ci` → TypeScript type-check → `npm test` (51 tests, pg-mem, sans Docker)
2. **web job** : `npm ci` → `npm run build` (type-check + vite build)

Toute erreur dans l'un ou l'autre job bloque le merge.

## 8. Checklist déploiement production

- [ ] `JWT_SECRET` est un secret aléatoire d'au moins 32 caractères
- [ ] `ADMIN_PASSWORD` changé (pas la valeur par défaut)
- [ ] `POSTGRES_PASSWORD` changé
- [ ] Certificat TLS configuré (nginx reverse proxy ou Traefik)
- [ ] `CORS_ORIGIN` mis à jour avec le domaine de production
- [ ] Logs centralisés (ex. Loki, CloudWatch)
- [ ] Sauvegarde automatique de la base configurée
