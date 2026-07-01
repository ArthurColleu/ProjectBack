# NoSQL dans WordlFR — Redis (+ JSONB)

> **Statut : document de travail** (pas un livrable final). Objectif : documenter
> **tout le NoSQL du projet** pour la compétence **BC02 — « Développer des
> composants d'accès aux données SQL *et NoSQL* »** (RNCP 37873).

---

## 1. Pourquoi du NoSQL ici ?

Le référentiel CDA demande explicitement des composants d'accès aux données
**SQL et NoSQL**. WordlFR utilise **PostgreSQL** (SQL, source de vérité) et y
ajoute une couche **NoSQL clé-valeur (Redis)** pour les données volatiles /
partagées, là où le relationnel n'apporte rien :

- le **mot du jour** est identique pour tous les joueurs et change rarement →
  parfait pour un **cache** en mémoire distribuée plutôt qu'un accès SQL répété ;
- (extension) un **rate-limit distribué** partagé entre instances.

## 2. Le NoSQL présent dans le projet

| Élément | Techno NoSQL | Rôle | Fichier |
|--------|--------------|------|---------|
| **Cache du mot du jour** | **Redis** (clé-valeur) | éviter un accès SQL répété au mot du jour | `apps/api/src/db/cache.ts` + `games.service.ts` |
| **Invalidation de cache** | Redis (`DEL`) | vider le cache quand l'admin change un mot | `words.service.ts` |
| **Rate-limit distribué** *(évolution)* | Redis | compteur partagé multi-instances | [`ci-cd-securite.md`](ci-cd-securite.md) §4.3 |
| **Stockage semi-structuré** | **JSONB** (PostgreSQL) | le résultat d'un essai (`LetterState[]`) stocké en document | `db/migrations/0002_game.sql` |

> **JSONB** : PostgreSQL offre un type **document / semi-structuré** (orienté
> NoSQL) au sein d'une base relationnelle. La colonne `guesses.result` stocke un
> tableau JSON `["correct","present",...]` lu en bloc — une **modélisation de
> type NoSQL** complémentaire au relationnel.

## 3. Architecture du composant d'accès NoSQL

Une interface unique `Cache`, deux implémentations interchangeables :

```
                     ┌──────────────────────────┐
   games.service ───▶│      interface Cache     │
   words.service ───▶│  get / set / del / backend│
                     └───────────┬──────────────┘
                    ┌────────────┴─────────────┐
            REDIS_URL défini ?           sinon (dev / CI / tests)
                    ▼                            ▼
            ┌───────────────┐            ┌───────────────┐
            │  RedisCache   │            │  MemoryCache  │
            │  (ioredis)    │            │  (Map + TTL)  │
            └───────────────┘            └───────────────┘
```

- **`RedisCache`** (`ioredis`) — le vrai composant d'accès NoSQL : `GET`/`SET EX`/`DEL`,
  sérialisation JSON. **Résilient** : toute erreur Redis dégrade en *cache miss*
  (la BDD SQL reste la source de vérité), l'application ne tombe jamais.
- **`MemoryCache`** — repli en mémoire (Map + expiration) quand `REDIS_URL` est
  absent : le projet tourne **sans Redis** en dev, en CI et dans les tests.
- **`createCache()`** choisit l'implémentation selon `REDIS_URL`.

### Flux de lecture du mot du jour (`games.service.ts`)
```ts
async function getDailyWord(date) {
  const cached = await cache.get(dailyWordKey(date));   // 1. NoSQL d'abord
  if (cached) return cached;                             //    → cache hit
  let word = await repo.findWordByDate(date);            // 2. sinon SQL
  if (!word) word = await repo.insertDailyWord(date, dailyFallbackWord(date), null);
  await cache.set(dailyWordKey(date), { id: word.id, word: word.word }, 3600); // 3. on peuple le cache
  return word;
}
```

### Invalidation (`words.service.ts`)
Quand un admin **ajoute/modifie** le mot d'une date, le cache de cette date est
vidé (`cache.del`) → la partie du jour reflète immédiatement le changement.
(La suppression s'appuie sur l'expiration TTL, cas rare.)

## 4. Configuration

| Contexte | `REDIS_URL` | Backend actif |
|----------|-------------|---------------|
| Tests / CI | non défini | `MemoryCache` (aucun Redis requis) |
| Dev local | optionnel | mémoire, ou `redis://localhost:6379` |
| **Docker Compose** | `redis://redis:6379` (auto) | **Redis** (service `redis:7-alpine`) |
| Render (mono-instance) | non défini par défaut | mémoire ; Redis activable via une variable |

`docker-compose.yml` inclut un service **`redis`** (avec healthcheck) et injecte
`REDIS_URL` dans l'API. `env.REDIS_URL` est optionnel dans `config/env.ts`.

## 5. Vérifier / démontrer

```bash
# Avec Docker (Redis actif)
cp .env.example .env && docker compose up --build
curl http://localhost:3001/api/health
# → {"status":"ok","db":true,"cache":"redis"}   ← backend NoSQL actif

# Sans Redis (repli mémoire)
cd apps/api && npm run dev
curl http://localhost:3001/api/health
# → {"status":"ok","db":true,"cache":"memory"}
```

Le champ **`cache`** de `/api/health` indique le backend NoSQL utilisé.

## 6. Tests (preuves)

| Test | Ce qu'il prouve |
|------|-----------------|
| `src/db/cache.test.ts` | `MemoryCache` : set/get, expiration TTL, invalidation `del`, clé |
| `src/modules/games/games.cache.test.ts` | avec cache → le mot n'est lu en BDD **qu'une fois** (2ᵉ appel = cache hit) ; sans cache → BDD interrogée à chaque fois |
| `tests/integration/auth.test.ts` | `/api/health` expose le backend `cache` |

→ **64 tests** au vert, dont ces preuves du composant NoSQL, **sans Redis en CI**
(grâce au repli mémoire).

## 7. Correspondance RNCP 37873

| Compétence | Couverture |
|-----------|-----------|
| BC02 — Développer des composants d'accès aux données **SQL** | repositories `pg` paramétrés |
| BC02 — Développer des composants d'accès aux données **NoSQL** | **`cache.ts` (Redis)** + usage service + invalidation + tests |
| BC02 — Concevoir la persistance | complémentarité SQL (relationnel) / Redis (clé-valeur) / JSONB (document) |
| BC03 — Déploiement / montée en charge | Redis dans `docker-compose`, activable sur Render |

---

## 8. Limites & évolutions

- Le repli mémoire n'est **pas** un vrai NoSQL (juste un secours mono-process) ;
  le composant NoSQL réel est **Redis** (`RedisCache`).
- Suppression admin d'un mot : invalidation par **TTL** (pas de `del` ciblé).
- Évolutions : rate-limit distribué Redis (déjà cadré §4.3 de `ci-cd-securite.md`),
  et éventuel cache de la partie du jour par joueur.
