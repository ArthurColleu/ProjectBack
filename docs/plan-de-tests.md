# Plan de tests — WordlFR

## 1. Tests unitaires (Vitest — couche domain & lib)

### 1.1 evaluateGuess

| ID | Scénario | Entrée | Résultat attendu |
|----|----------|--------|------------------|
| U01 | Mot exact | guess="table" target="table" | ["correct","correct","correct","correct","correct"] |
| U02 | Aucune lettre | guess="fleur" target="zzzzz" | ["absent","absent","absent","absent","absent"] |
| U03 | Lettre présente | guess="table" target="plage" | ["absent","absent","absent","present","absent"] |
| U04 | Lettres dupliquées côté guess | guess="lampe" target="calme" | first 'l' → present, second 'l' → absent |
| U05 | Lettres dupliquées côté target | guess="grace" target="agree" | correct/present/present/correct/present |

### 1.2 dictionary

| ID | Scénario | Résultat attendu |
|----|----------|------------------|
| U10 | Toutes les entrées | Exactement 5 lettres minuscules |
| U11 | Pas de doublons | Longueur = taille du Set |
| U12 | Validation insensible à la casse | isValidWord("TABLE") === true |

### 1.3 fallbackWord

| ID | Scénario | Résultat attendu |
|----|----------|------------------|
| U20 | Déterministe | Même date → même mot |
| U21 | Dans le dictionnaire | Mot retourné ∈ DICTIONARY |
| U22 | Varie selon la date | Dates différentes → mots potentiellement différents |

### 1.4 stats (computeStats)

| ID | Scénario | Résultat attendu |
|----|----------|------------------|
| U30 | Historique vide | gamesPlayed=0, winRate=0, currentStreak=0 |
| U31 | Taux de victoire | 2 wins / 3 games → winRate=67 |
| U32 | Distribution | 2 victoires en 2 essais → guessDistribution["2"]=2 |
| U33 | Série consécutive | 3 victoires consécutives → currentStreak=3, maxStreak=3 |
| U34 | Rupture de série | Défaite entre deux séries → maxStreak correct |

### 1.5 password / jwt

| ID | Scénario | Résultat attendu |
|----|----------|------------------|
| U40 | Hash + vérif correct | hashPassword + checkPassword → true |
| U41 | Mauvais mot de passe | checkPassword("wrong") → false |
| U50 | Signer + vérifier JWT | Round-trip sign/verify retourne le payload |
| U51 | Token altéré | verifyToken(tampered) → null |

---

## 2. Tests d'intégration (Supertest + pg-mem)

### 2.1 Auth (`tests/integration/auth.test.ts`)

| ID | Scénario | HTTP | Attendu |
|----|----------|------|---------|
| I01 | Inscription valide | POST /api/auth/register | 201, user sans password_hash, cookie token HttpOnly |
| I02 | Email dupliqué | POST /api/auth/register | 409 |
| I03 | Données invalides | POST /api/auth/register | 400 |
| I04 | Connexion OK | POST /api/auth/login | 200 |
| I05 | Mauvais mot de passe | POST /api/auth/login | 401 |
| I06 | GET /me sans cookie | GET /api/auth/me | 401 |
| I07 | GET /me avec cookie | GET /api/auth/me | 200, user correct |
| I08 | Déconnexion | POST /api/auth/logout | 204, puis /me → 401 |
| I09 | Suppression compte (RGPD) | DELETE /api/auth/me | 204, puis /me → 401 |
| I10 | Health check | GET /api/health | 200, `{status:"ok",db:true}` |

### 2.2 Jeu (`tests/integration/game.test.ts`)

| ID | Scénario | HTTP | Attendu |
|----|----------|------|---------|
| I20 | Sans auth | GET /api/game/today | 401 |
| I21 | Nouvel état | GET /api/game/today | 200, status=in_progress, attempts=[] |
| I22 | Idempotence | GET ×2 | Même état |
| I23 | Mot invalide | POST /api/game/guess {guess:"zzzzz"} | 400, error=invalid_word |
| I24 | Mot trop court | POST /api/game/guess {guess:"ab"} | 400 |
| I25 | Essai valide | POST /api/game/guess {guess:"table"} | 200, result[5], status ∈ {in_progress,won,lost} |
| I26 | **Anti-triche** | POST /api/game/guess | Le mot n'apparaît **jamais** dans la réponse JSON |
| I27 | Accumulation | Après un essai → GET today | attempts.length === 1 |
| I28 | Limite serveur | 6 essais → 7e | 409 |
| I29 | Victoire → fini | guess exact → status=won | 409 sur essai suivant |
| I30 | Isolation | Joueur A joue → Joueur B | attempts de B = 0 |

### 2.3 Statistiques (`tests/integration/stats.test.ts`)

| ID | Scénario | HTTP | Attendu |
|----|----------|------|---------|
| I40 | Sans auth | GET /api/stats | 401 |
| I41 | Nouveau joueur | GET /api/stats | gamesPlayed=0, wins=0 |
| I42 | Après victoire | Victoire + GET /api/stats | gamesPlayed=1, wins=1, winRate=100, guessDistribution["1"]=1 |

### 2.4 Admin mots (`tests/integration/words.test.ts`)

| ID | Scénario | HTTP | Attendu |
|----|----------|------|---------|
| I50 | Sans auth | GET /api/admin/words | 401 |
| I51 | Joueur non-admin | GET /api/admin/words | 403 |
| I52 | Lister (vide) | GET /api/admin/words | 200, words=[] |
| I53 | Créer | POST /api/admin/words | 201, word correct |
| I54 | Modifier | PATCH /api/admin/words/:id | 200, word mis à jour |
| I55 | Supprimer | DELETE /api/admin/words/:id | 204 |
| I56 | Date dupliquée | POST date existante | 409 |
| I57 | Mot trop court | POST {word:"mot"} | 400 |

---

## 3. Cahier de recettes (tests manuels)

### Prérequis
Application démarrée : `docker compose up --build`

### Scénarios

| ID | Titre | Étapes | Résultat attendu |
|----|-------|--------|-----------------|
| R01 | Inscription | Aller sur /inscription, saisir email + mdp valide, soumettre | Redirection vers /, grille de jeu affichée |
| R02 | Connexion | /connexion avec les identifiants de R01 | Redirection vers / |
| R03 | Partie quotidienne | Saisir 5 lettres au clavier physique + Entrée | Les tuiles se retournent avec les couleurs correctes |
| R04 | Mot invalide | Saisir un mot hors dictionnaire | Toast "Mot invalide", rangée tremble |
| R05 | Victoire | Trouver le mot exact | Toast "Bravo !", clavier et grille désactivés |
| R06 | Défaite | 6 mauvais essais | Toast "Partie terminée.", grille désactivée |
| R07 | Reprise | Actualiser la page en cours de partie | Progression restaurée (tentatives déjà jouées) |
| R08 | Anti-triche | Ouvrir DevTools > Network > POST /api/game/guess | La réponse ne contient PAS le mot |
| R09 | Statistiques | Aller sur /statistiques | Taux et distribution corrects |
| R10 | Admin | Se connecter admin, aller sur /admin | Tableau des mots, ajout/édition/suppression fonctionnels |
| R11 | Protection admin | Joueur non-admin tente /admin | Redirection vers / |
| R12 | Déconnexion | Cliquer Déconnexion | Cookie effacé, redirection vers /connexion |
| R13 | RGPD | Supprimer compte via DELETE /api/auth/me | Cookie effacé, données supprimées en cascade |
| R14 | Accessibilité | Navigation Tab sur /connexion | Tous les champs accessibles au clavier, focus visible |
| R15 | Responsive | Ouvrir sur mobile 375 px | Grille et clavier lisibles et utilisables |

---

## 4. Résultats de la campagne de tests automatisés

```
Test Files  13 passed (13)
Tests       51 passed (51)
Duration    ~7s
```

Tous les tests passent en CI (GitHub Actions) sur chaque push vers `feat/**` et `main`.
