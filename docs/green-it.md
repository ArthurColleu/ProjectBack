# Note éco-conception — Green IT

## Contexte

La note d'éco-conception documente les choix techniques effectués pour réduire l'empreinte environnementale de l'application WordlFR, conformément aux principes du numérique responsable.

## 1. Sobriété fonctionnelle

- **Périmètre minimal** : l'application ne propose que les fonctionnalités essentielles (jouer, statistiques, administration). Pas de notifications push, pas de service mail, pas de CDN externe superflu.
- **Pas de dépendance analytique** : aucun tracker tiers (Google Analytics, Meta Pixel) n'est chargé.
- **Pas de bibliothèque UI lourde** : Tailwind CSS (utilitaire pur, classes purgées à la compilation) plutôt que Bootstrap ou MUI. Bundle final CSS < 6 Ko gzip.

## 2. Performance réseau

| Métrique | Valeur | Commentaire |
|---------|--------|-------------|
| Bundle JS gzip | ~81 Ko | React + React Router + code applicatif |
| Bundle CSS gzip | ~5 Ko | Tailwind purgé |
| Requêtes au chargement | 2 (JS + CSS) | Vite chunking automatique |
| Appels API au chargement | 1 (`GET /api/game/today`) | Pas de cascade de requêtes |

- **Cache HTTP** : les assets statiques (JS, CSS, images) sont servis avec `Cache-Control: public, immutable, max-age=1y` par nginx. Seul `index.html` n'est pas mis en cache.
- **Pas de polling** : l'état du jeu est chargé une fois au montage — aucun appel périodique en arrière-plan.

## 3. Base de données efficiente

- **Index** sur les colonnes de jointure fréquentes : `idx_games_user(user_id)` et `idx_guesses_game(game_id)` — évite les full-table scans.
- **Statistiques calculées à la demande** (pas de table dénormalisée) : une seule requête SQL avec `COUNT` et `JOIN` remplace une table de statistiques à synchroniser.
- **Résultat JSONB** (`guesses.result`) : stocker le tableau de 5 états comme JSONB évite 5 colonnes séparées et 4 jointures supplémentaires.
- Connexion PostgreSQL **poolée** (`pg.Pool`) : réutilisation des connexions, pas de connexion par requête.

## 4. Infrastructure légère

- **Images Docker Alpine** : `node:22-alpine` (~50 Mo) et `nginx:1.27-alpine` (~25 Mo) au lieu des images Debian (~500 Mo).
- **Build multi-stage** : l'image finale de l'API ne contient que les dépendances de production (`npm ci --omit=dev`), sans TypeScript, Vitest ou les types.
- **Un seul conteneur nginx** sert le frontend ET proxifie l'API — pas de reverse proxy supplémentaire (Traefik, HAProxy) en développement.
- **Volume persistant** pour PostgreSQL : les données survivent aux redémarrages sans duplication.

## 5. Tests sans infrastructure

- Les tests d'intégration utilisent **pg-mem** (base en mémoire) : pas de conteneur PostgreSQL supplémentaire en CI, pas de démarrage/arrêt de service → CI plus rapide et moins consommatrice.

## 6. Hébergement responsable (recommandation)

Pour un déploiement en production, il est recommandé de choisir un hébergeur certifié ou ayant publié son mix énergétique (ex. : Scaleway [ISO 14001], OVHcloud, Infomaniak [100% renouvelable]).

## 7. Axes d'amélioration futurs

- **Rate-limit** des requêtes API (déjà en place sur `/login`) à étendre à tous les endpoints publics pour réduire les requêtes abusives.
- **Cache Redis** pour `GET /api/game/today` (réponse identique pour tous les joueurs tant que le mot du jour ne change pas) — réduirait les requêtes SQL d'agrégation répétées.
- **Compression Brotli** plutôt que gzip pour les assets (nginx le supporte en build additionnel).
- **Lazy-loading** des pages d'administration (non chargées pour les joueurs ordinaires).
