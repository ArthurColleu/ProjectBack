# Cahier des charges — WordlFR

## 1. Contexte et objectif

WordlFR est un jeu Wordle quotidien en français. Le joueur doit deviner un mot de 5 lettres en 6 tentatives maximum. Chaque essai reçoit un retour coloré : **vert** (bonne lettre à la bonne place), **orange** (lettre présente mais mal placée), **gris** (lettre absente).

L'objectif du projet est de démontrer l'intégralité des compétences du titre **Concepteur Développeur d'Applications (RNCP 37873)** à travers une application full-stack de production.

## 2. Fonctionnalités

### 2.1 Compte joueur
- Inscription (email + mot de passe ≥ 8 caractères)
- Connexion / déconnexion
- Suppression du compte (RGPD)
- Session persistée via cookie JWT httpOnly

### 2.2 Jeu
- Une partie par joueur et par jour
- 6 tentatives maximum
- Clavier virtuel AZERTY + clavier physique
- Retour coloré animé (retournement 3D des tuiles)
- Partie persistée côté serveur (anti-triche)
- Le mot n'est **jamais** envoyé au navigateur

### 2.3 Statistiques
- Nombre de parties jouées, taux de victoire
- Série actuelle et meilleure série
- Distribution des essais (histogramme)

### 2.4 Administration
- Interface protégée (rôle admin)
- CRUD complet des mots du jour (planification par date)
- Validation des données (5 lettres, date unique)

## 3. Contraintes techniques

| Contrainte | Choix retenu |
|------------|-------------|
| Pas d'ORM | Requêtes SQL paramétrées (`pg`) uniquement |
| Sécurité | OWASP Top 10, mot de passe haché, JWT signé |
| Accessibilité | RGAA AA — aria, contrastes, navigation clavier |
| Tests | Vitest (unitaires) + Supertest (intégration, sans Docker) |
| Déploiement | Docker Compose, CI GitHub Actions |
| Éco-conception | Bundle léger, requêtes indexées, un seul appel API au chargement |

## 4. Utilisateurs cibles

- **Joueur** : compte personnel, joue chaque jour, consulte ses statistiques
- **Administrateur** : gère les mots du jour via l'interface d'administration

## 5. Critères d'acceptation

- La grille s'affiche correctement sur mobile (375 px) et desktop
- Le clavier physique et virtuel fonctionnent de façon identique
- Le mot du jour n'apparaît jamais dans les réponses HTTP (vérifiable via DevTools)
- Les tentatives sont enregistrées en base — recharger la page n'efface pas la progression
- Un joueur ne peut pas accéder aux données d'un autre joueur (contrôle d'accès)
- La suite de tests passe à 100 % en CI (GitHub Actions)
