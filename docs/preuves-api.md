# Preuves API — dossier CDA (RNCP 37873)

> Ce document recense les **preuves** de conception et de développement de l'API
> REST de WordlFR, mappées sur les compétences du titre **Concepteur Développeur
> d'Applications (RNCP 37873)**. Pour chaque endpoint : le contrat HTTP, les
> fichiers des différentes couches, les mesures de sécurité, et le **test
> d'intégration** qui le prouve.
>
> **Rejouer toutes les preuves automatisées :**
> ```bash
> cd apps/api && npm test      # 54 tests (Vitest + Supertest + pg-mem)
> ```

---

## 1. Contrat de l'API (vue d'ensemble)

| Méthode & route | Auth | Rôle | Code succès | Module |
|---|---|---|---|---|
| `POST /api/auth/register` | — | — | 201 | `modules/auth` |
| `POST /api/auth/login` | — | — | 200 | `modules/auth` |
| `POST /api/auth/logout` | — | — | 204 | `modules/auth` |
| `GET /api/auth/me` | 🍪 cookie | joueur | 200 | `modules/auth` |
| `DELETE /api/auth/me` | 🍪 cookie | joueur | 204 | `modules/auth` |
| `GET /api/game/today` | 🍪 cookie | joueur | 200 | `modules/games` |
| `POST /api/game/guess` | 🍪 cookie | joueur | 200 | `modules/games` |
| `GET /api/stats` | 🍪 cookie | joueur | 200 | `modules/stats` |
| `GET /api/admin/words` | 🍪 cookie | **admin** | 200 | `modules/words` |
| `POST /api/admin/words` | 🍪 cookie | **admin** | 201 | `modules/words` |
| `PATCH /api/admin/words/:id` | 🍪 cookie | **admin** | 200 | `modules/words` |
| `DELETE /api/admin/words/:id` | 🍪 cookie | **admin** | 204 | `modules/words` |
| `GET /api/health` | — | — | 200 | `modules/health` |

🍪 = JWT en cookie `httpOnly` `SameSite=Strict` (`secure` en production).

Chaque module respecte le découpage en couches :
`*.routes.ts → *.controller.ts → *.service.ts → *.repository.ts`.

---

## 2. Mapping compétences RNCP 37873 → preuves

### BC01 — Développer une application sécurisée

| Compétence | Preuve (fichier) | Preuve (test) |
|---|---|---|
| Développer des composants métier | `domain/evaluateGuess.ts`, `domain/stats.ts`, `modules/games/games.service.ts` | `domain/*.test.ts`, `game.test.ts` |
| Sécuriser l'authentification | `lib/jwt.ts`, `lib/password.ts` (bcrypt), `modules/auth/auth.controller.ts` | `auth.test.ts` |
| Contribuer à la gestion de projet | Git + PR + CI (`.github/workflows/ci.yml`) | pipeline CI vert |

### BC02 — Concevoir et développer une application en couches

| Compétence | Preuve (fichier) | Preuve (test) |
|---|---|---|
| Définir une architecture en couches | `modules/**/{routes,controller,service,repository}.ts` + [`diagrammes-uml.md`](diagrammes-uml.md) | toute la suite d'intégration |
| Mettre en place une BDD relationnelle | `db/migrations/*.sql` + [`mcd-mld.md`](mcd-mld.md) | `helpers/testDb.test.ts` |
| Développer des composants d'accès aux données | `modules/**/*.repository.ts` (**SQL paramétré**) | `games.repository.test.ts` |
| Valider les données entrantes | `middlewares/validate.ts` + schémas **zod** dans les contrôleurs | `auth.test.ts` (400), `words.test.ts` (400) |

### BC03 — Préparer le déploiement

| Compétence | Preuve (fichier) | Preuve (test/artefact) |
|---|---|---|
| Préparer et exécuter les tests | `apps/api/tests/integration/*` | 54 tests verts |
| Documenter / préparer le déploiement | `Dockerfile`, `docker-compose.yml`, `render.yaml`, [`deploiement.md`](deploiement.md) | déploiement Render |
| Démarche DevOps (CI) | `.github/workflows/ci.yml` | exécution sur chaque push/PR |

---

## 3. Extraits de code commentés (preuves clés)

### 3.1 Accès aux données — SQL 100 % paramétré (BC02, OWASP A03)
`modules/games/games.repository.ts` — aucune concaténation, les valeurs passent
par des paramètres liés `$1, $2…` :

```ts
async insertGuess(gameId, attemptNumber, guess, result) {
  await db.query(
    `INSERT INTO guesses (game_id, attempt_number, guess, result)
     VALUES ($1, $2, $3, $4)`,
    [gameId, attemptNumber, guess, JSON.stringify(result)],
  );
}
```

### 3.2 Composant métier sécurisé — anti-triche (BC01)
`modules/games/games.service.ts` — le décompte des essais est relu **en base**
(autorité serveur) et **le mot cible n'est jamais renvoyé** au client :

```ts
const count = await repo.countGuesses(game.id);          // source de vérité = BDD
if (count >= MAX_ATTEMPTS) throw new HttpError(409, "max_attempts_reached");
const result = evaluateGuess(normalized, word.word);
await repo.insertGuess(game.id, count + 1, normalized, result);
// ...
return { result, status };   // ← jamais `word`
```

**Preuve par test** (`game.test.ts`) :
- *« accepts a valid guess and returns result + status, word NEVER exposed »*
- *« enforces 6-attempt limit server-side (7th guess rejected) »*
- *« game isolation — player cannot see or affect another player's game »*

### 3.3 Authentification — JWT en cookie httpOnly (BC01, OWASP A02/A07)
`modules/auth/auth.controller.ts` :

```ts
res.cookie("token", token, {
  httpOnly: true,                          // inaccessible au JS (anti-XSS)
  sameSite: "strict",                      // anti-CSRF
  secure: env.NODE_ENV === "production",   // HTTPS only en prod
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```
Mot de passe haché avec **bcrypt** (`lib/password.ts`) — le clair n'est jamais stocké.

**Preuve par test** (`auth.test.ts`) :
- *« registers a user, sets a cookie, returns the public user (no hash) »*
- *« logs in with correct credentials, 401 with wrong password »*

### 3.4 Contrôle d'accès par rôle (BC01, OWASP A01)
`modules/words/words.routes.ts` — toutes les routes admin sont protégées :

```ts
router.use(authenticate, authorize("admin"));   // 401 si non connecté, 403 si non-admin
```

**Preuve par test** (`words.test.ts`) :
- *« returns 401 without auth »*
- *« returns 403 for non-admin player »*

### 3.5 Validation des entrées (BC02)
Schémas **zod** côté contrôleur, ex. `modules/words/words.controller.ts` :

```ts
const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  word: z.string().length(5),
});
if (!parsed.success) throw new HttpError(400, "invalid_input");
```

**Preuve par test** : *« rejects invalid input with 400 »* (auth), *« rejects word
longer or shorter than 5 with 400 »* (words).

---

## 4. Couverture endpoint ↔ test d'intégration

| Endpoint | Tests qui le prouvent (`tests/integration/`) |
|---|---|
| `POST /register` | registers + sets cookie · rejects duplicate (409) · rejects invalid (400) |
| `POST /login` | logs in / 401 wrong password |
| `POST /logout` | logout clears cookie → `/me` 401 |
| `GET /me` | requires cookie (401) |
| `DELETE /me` | deletes account (RGPD) → `/me` 401 |
| `GET /game/today` | 401 sans auth · état initial · idempotent |
| `POST /game/guess` | 401 · mot hors dico (400) · longueur (400) · résultat sans le mot · limite 6 essais · isolation joueurs · 409 après victoire |
| `GET /stats` | 401 · stats vides · reflète une victoire |
| `/admin/words` | 401 · 403 non-admin · CRUD complet · doublon (409) · longueur (400) |
| `GET /health` | db ok (200) |

---

## 5. Comment démontrer en soutenance

1. **Tests automatisés** (preuve la plus forte) :
   ```bash
   cd apps/api && npm test
   ```
   → 54 tests verts, l'API est exercée de bout en bout sans base externe (pg-mem).
2. **Démonstration live** sur l'URL de production Render.
3. **Appels manuels** possibles via `curl` ou Postman (le contrat du §1 sert de référence).
4. **Diagramme de séquence** d'un appel `POST /api/game/guess` dans
   [`diagrammes-uml.md`](diagrammes-uml.md) pour expliquer le flux en couches.

> Les tests d'intégration constituent le **jeu d'essai** attendu par le
> référentiel : entrée (requête HTTP) → résultat attendu (code + corps) →
> résultat obtenu (assertion). Voir aussi [`plan-de-tests.md`](plan-de-tests.md).
