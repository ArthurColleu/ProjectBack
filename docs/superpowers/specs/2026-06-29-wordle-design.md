# Wordle quotidien — Design

Date : 2026-06-29

## Objectif

Application web type Wordle : un mot cible de 5 lettres par jour, 6 essais, retour coloré par lettre (vert/jaune/gris). Interface d'administration pour gérer les mots du jour. Déployable sur Vercel avec Supabase comme backend.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + Supabase Auth pour l'admin)
- Déploiement Vercel
- Tests : Vitest

## Architecture & structure des dossiers

```
app/
  page.tsx                     # Jeu Wordle (page d'accueil)
  admin/
    page.tsx                   # Dashboard admin (liste + CRUD des mots)
    login/page.tsx             # Connexion admin (Supabase Auth)
  api/
    word/route.ts              # GET état du jour / POST valide un essai
    admin/words/route.ts       # GET liste / POST création (protégé)
    admin/words/[id]/route.ts  # PATCH / DELETE (protégé)
lib/
  supabase/
    server.ts                  # client Supabase côté serveur (service role)
    client.ts                  # client Supabase côté navigateur (anon key)
  dictionary.ts                # liste statique de mots français valides (5 lettres)
  game.ts                      # logique pure : evaluateGuess(guess, target)
middleware.ts                  # protège /admin/* (vérifie session Supabase)
supabase/
  migrations/0001_init.sql     # table daily_words + policies RLS
README.md
tailwind.config.ts
```

## Anti-triche

Le mot du jour n'est **jamais envoyé** au client tant que la partie n'est pas terminée. Le client envoie son essai à `POST /api/word`, le serveur calcule le résultat coloré et le renvoie seul. Le mot cible n'est révélé que si l'essai est correct, ou après le 6e essai raté.

## Modèle de données

### Table `daily_words`

```sql
create table daily_words (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  word varchar(5) not null,
  created_at timestamptz default now()
);
```

- RLS activée. Aucune policy de lecture pour le rôle `anon` : seul le serveur (service role key, utilisé uniquement dans les Route Handlers) peut lire `word`.
- Une policy autorise les utilisateurs authentifiés (admin, via Supabase Auth) à faire le CRUD complet depuis le dashboard admin — en pratique le CRUD admin passe aussi par les Route Handlers serveur qui revérifient la session, donc la policy authentifiée est une défense en profondeur, pas le chemin principal.

### Authentification admin

- Pas de table `admin_users` custom. Utilise **Supabase Auth** (`auth.users`).
- Les comptes admin sont créés manuellement (dashboard Supabase ou script one-off) — pas d'inscription publique.
- `middleware.ts` protège toutes les routes `/admin/*` sauf `/admin/login` : sans session valide, redirection vers `/admin/login`.

### Dictionnaire

`lib/dictionary.ts` exporte un tableau de mots français valides de 5 lettres, minuscules, sans accents (pour cohérence avec la saisie). Utilisé pour :
1. Valider qu'un essai du joueur est un mot réel.
2. Choisir un mot de fallback aléatoire mais déterministe (hash de la date du jour) si `daily_words` n'a pas d'entrée pour le jour courant, ou si Supabase est injoignable.

## Logique de jeu

`lib/game.ts` :

```ts
type LetterState = 'correct' | 'present' | 'absent';
function evaluateGuess(guess: string, target: string): LetterState[]
```

Algorithme deux passes :
1. Marquer les positions exactement correctes.
2. Pour les lettres restantes, marquer `present` en respectant le nombre d'occurrences encore disponibles dans `target` (gestion correcte des lettres dupliquées).

## API

### `POST /api/word`

Body : `{ guess: string }`

1. Valide que `guess` fait 5 lettres et appartient au dictionnaire → sinon `400 { error: "invalid_word" }`.
2. Récupère le mot du jour : lookup `daily_words` par date du jour ; si absent ou Supabase indisponible, fallback déterministe sur le dictionnaire local.
3. Calcule `evaluateGuess`, renvoie `{ result: LetterState[], isCorrect: boolean }`.
4. Ne renvoie le mot cible que si `isCorrect === true`, ou si c'est le 6e essai et qu'il est raté (révélation, `{ ..., revealedWord: string }`).

### `GET /api/word`

Renvoie `{ date: string }` (date du jour côté serveur, jamais le mot). Le client l'utilise pour détecter un changement de jour (minuit) et réinitialiser son état local.

### `GET /api/admin/words`, `POST /api/admin/words`, `PATCH /api/admin/words/[id]`, `DELETE /api/admin/words/[id]`

- Toutes vérifient la session Supabase côté serveur avant toute opération.
- Validation : `date` au format ISO, `word` = 5 lettres appartenant au dictionnaire.
- Codes : `401` non authentifié, `400` entrée invalide, `409` si la date existe déjà (POST), `404` si id inconnu (PATCH/DELETE).

## Interface joueur

`app/page.tsx` :

- Grille 6×5, remplissage progressif, couleurs appliquées à la réception de la réponse serveur (animation de retournement).
- Clavier virtuel AZERTY sous la grille, coloré selon le meilleur état connu de chaque lettre à travers les essais. Saisie au clic/tactile et au clavier physique.
- Erreur transitoire (shake + toast) si mot hors dictionnaire ou essai incomplet (< 5 lettres) — l'essai n'est pas consommé.
- Fin de partie (gagné ou 6 essais épuisés) : modal récapitulatif (mot révélé si perdu), saisie désactivée jusqu'au lendemain.
- Accessibilité : `aria-label` par case (lettre + état), `aria-label` sur les touches du clavier virtuel, navigation/focus clavier cohérents.

### Persistance

État du jeu (essais + résultats reçus du serveur) stocké en `localStorage` sous une clé incluant la date du jour (`wordle-progress-<YYYY-MM-DD>`). Un changement de date repart automatiquement à zéro. Aucune donnée sensible (le mot cible) n'est stockée côté client avant la fin de la partie.

## Interface admin

- `/admin/login` : formulaire email/mot de passe → `supabase.auth.signInWithPassword`, erreurs affichées clairement.
- `/admin` : tableau des entrées `daily_words` triées par date décroissante ; formulaire d'ajout (date + mot) ; actions modifier/supprimer par ligne ; bouton déconnexion.
- Toutes les opérations passent par les Route Handlers `app/api/admin/words/*`, qui utilisent le service role Supabase côté serveur uniquement (jamais exposé au client).

## Déploiement

Variables d'environnement (`.env.local` en local, identiques dans Vercel) :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client : utilisé uniquement pour le login Supabase Auth)
- `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement, jamais inclus dans le bundle client)

## Gestion d'erreurs

- API : réponses JSON `{ error: string }` avec codes HTTP cohérents (`400`, `401`, `404`, `409`, `500`).
- Si Supabase est injoignable pour `/api/word` (GET ou POST) : fallback automatique sur le mot déterministe du dictionnaire local — le jeu reste jouable même si la base est indisponible.
- Frontend : tout échec réseau affiche un message utilisateur ("Réessaie plus tard") sans crasher l'interface.

## Tests (Vitest)

- `lib/game.ts` : `evaluateGuess` — cas simple, lettres dupliquées dans le mot cible, lettre absente répétée dans l'essai.
- `lib/dictionary.ts` : test que toutes les entrées font 5 lettres minuscules sans accents.
- `/api/word` : test avec client Supabase mocké — essai correct, essai incorrect, mot hors dictionnaire, fallback sans donnée Supabase.

## Livrables

- `app/page.tsx`, `app/admin/login/page.tsx`, `app/admin/page.tsx`
- `app/api/word/route.ts`, `app/api/admin/words/route.ts`, `app/api/admin/words/[id]/route.ts`
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/dictionary.ts`, `lib/game.ts`
- `middleware.ts`
- `supabase/migrations/0001_init.sql`
- `tailwind.config.ts`
- `README.md` (installation, configuration Supabase, déploiement Vercel, scripts npm)

## Hors scope

- Inscription publique d'administrateurs.
- Statistiques joueur multi-appareils / comptes joueurs.
- Internationalisation (l'app est en français uniquement).
