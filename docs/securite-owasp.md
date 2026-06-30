# Note sécurité — OWASP Top 10

## Couverture des risques OWASP (version 2021)

### A01 — Broken Access Control

**Risque :** un utilisateur accède aux données d'un autre utilisateur ou à des fonctionnalités non autorisées.

**Mesures :**
- Middleware `authenticate` : vérifie le JWT à chaque requête protégée. Les routes `/api/game`, `/api/stats` ne sont accessibles qu'avec un token valide.
- Middleware `authorize('admin')` : toutes les routes `/api/admin/words` vérifient le rôle admin **côté serveur** avant d'exécuter l'action.
- **Isolation des données** : le `user_id` injecté dans les requêtes SQL provient du token JWT (non modifiable par le client), jamais du corps de la requête. Un joueur ne peut interroger que ses propres parties et statistiques.
- Contrôle d'accès testé en intégration (I50, I51).

### A02 — Cryptographic Failures

**Risque :** exposition de données sensibles (mots de passe en clair, tokens non signés).

**Mesures :**
- Mots de passe hachés avec **bcrypt** (facteur de travail 12) via `bcryptjs` — jamais stockés ou loggés en clair.
- JWT signé **HS256** avec un secret d'au moins 32 caractères (variable `JWT_SECRET`).
- Cookie JWT en attribut **httpOnly** (inaccessible à JavaScript) + **SameSite=Strict** (protection CSRF) + **Secure** en production.
- `clearCookie` utilise exactement les mêmes options que `setCookie` pour que le navigateur accepte la suppression.

### A03 — Injection

**Risque :** injection SQL, injection de commandes.

**Mesures :**
- **100 % des requêtes SQL** utilisent des paramètres positionnels (`$1`, `$2`, …) via le driver `pg`. Aucune interpolation de chaîne dans les requêtes.
- Toutes les entrées utilisateur passent par **Zod** avant d'atteindre la couche service.
- Exemple : `SELECT id, word FROM daily_words WHERE date = $1` — la valeur est toujours passée en paramètre séparé.

### A04 — Insecure Design

**Risque :** conception qui facilite les attaques (anti-triche, révélation du mot).

**Mesures :**
- Le mot du jour n'est **jamais** inclus dans les réponses API — même en cas de défaite. Seuls `{ result, status }` sont retournés.
- Le nombre d'essais est lu **en base de données** (serveur-autoritaire) — le client ne peut pas mentir sur son nombre de tentatives.
- La session est persistée côté serveur (table `games`) — recharger la page ne permet pas de contourner la limite de 6 essais.

### A05 — Security Misconfiguration

**Risque :** configuration par défaut exposant des informations sensibles.

**Mesures :**
- **helmet** : configure automatiquement 11 en-têtes de sécurité HTTP (X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.).
- **CORS** : seule l'origine `CORS_ORIGIN` (env) est autorisée (`credentials: true`).
- L'errorHandler ne renvoie **jamais** la stack trace (uniquement `{ error: string }`).
- Variables sensibles dans `.env` (non commité) — `.env.example` fournit le modèle sans valeurs réelles.

### A06 — Vulnerable and Outdated Components

**Mesures :**
- Dépendances auditées via `npm audit`.
- GitHub Actions peut être étendu avec `npm audit --audit-level=moderate`.
- Versions de Node.js (22 LTS) et PostgreSQL (16) récentes et maintenues.

### A07 — Identification and Authentication Failures

**Risque :** bruteforce de mot de passe, session non invalidée.

**Mesures :**
- **express-rate-limit** sur `/api/auth/login` : limite le nombre de tentatives de connexion.
- Politique de mot de passe : minimum 8 caractères, validé côté serveur par Zod.
- Expiration du JWT configurée (défaut : 7 jours).
- Déconnexion effective : `clearCookie` supprime le cookie côté client + invalidation logique.
- Suppression de compte (RGPD) : `DELETE /api/auth/me` efface le cookie et supprime les données en cascade.

### A08 — Software and Data Integrity Failures

**Mesures :**
- Validation Zod à chaque endpoint (schéma strict, pas de propriétés inattendues).
- Migrations SQL versionnées et idempotentes (`IF NOT EXISTS`).
- CI bloque tout commit qui ne passe pas les tests.

### A09 — Security Logging and Monitoring Failures

**Mesures :**
- Erreurs 500 loggées dans `console.error` côté serveur (sans données sensibles).
- Healthcheck Docker et CI permettent de détecter les régressions.
- Extension possible : Winston + Loki pour la centralisation des logs.

### A10 — Server-Side Request Forgery (SSRF)

**Mesures :**
- L'API ne fait aucune requête HTTP vers des URLs fournies par l'utilisateur.
- Aucune fonctionnalité de fetch/proxy côté serveur.

## Résumé

| Risque OWASP | Statut | Mesure principale |
|---|---|---|
| A01 Broken Access Control | ✅ | `authenticate` + `authorize`, isolation user_id |
| A02 Cryptographic Failures | ✅ | bcrypt + JWT httpOnly/SameSite |
| A03 Injection | ✅ | 100% requêtes paramétrées + Zod |
| A04 Insecure Design | ✅ | Mot jamais retourné, tentatives en BDD |
| A05 Misconfiguration | ✅ | helmet, CORS, pas de stack trace exposée |
| A06 Outdated Components | ✅ | npm audit, LTS |
| A07 Auth Failures | ✅ | rate-limit, bcrypt, mdp ≥ 8 |
| A08 Integrity | ✅ | Zod + migrations versionnées + CI |
| A09 Logging | ⚠️ | logs basiques (extension possible) |
| A10 SSRF | ✅ | pas de fetch utilisateur |
