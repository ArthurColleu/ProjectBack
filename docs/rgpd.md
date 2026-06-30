# Note RGPD — WordlFR

## 1. Données personnelles collectées

| Donnée | Finalité | Durée de conservation |
|--------|----------|----------------------|
| Adresse e-mail | Identification du compte joueur | Durée de vie du compte |
| Hash du mot de passe | Authentification | Durée de vie du compte |
| Historique des parties | Statistiques personnelles, reprise de partie | Durée de vie du compte |

**Données non collectées :** nom, prénom, date de naissance, localisation, adresse IP persistée, données de navigation.

## 2. Base légale du traitement

Le traitement est fondé sur le **contrat** (article 6.1.b RGPD) : l'utilisateur fournit son e-mail et un mot de passe pour bénéficier du service de jeu et de ses statistiques personnelles.

## 3. Sécurité des données

- **Mot de passe haché** avec bcrypt (facteur 12) — le mot de passe en clair n'est jamais stocké ni loggé.
- **JWT en cookie httpOnly** — le token d'authentification est inaccessible au JavaScript (protection XSS).
- **Accès contrôlé** — chaque joueur n'accède qu'à ses propres données ; le `user_id` est issu du token signé, non du client.
- **Pas de partage avec des tiers** — aucune donnée personnelle n'est transmise à des services tiers.

## 4. Droits des personnes

### Droit d'accès (art. 15)
`GET /api/auth/me` retourne les informations du compte (email, rôle, date de création).

### Droit à l'effacement / droit à l'oubli (art. 17)
`DELETE /api/auth/me` supprime :
- Le compte utilisateur (`users`)
- Toutes les parties associées (`games` — `ON DELETE CASCADE`)
- Tous les essais (`guesses` — `ON DELETE CASCADE` via `games`)
- Le cookie JWT est effacé simultanément

Cette suppression est immédiate, complète et irréversible.

### Droit à la portabilité (art. 20)
Les données pourraient être exportées via un endpoint dédié (évolution prévue : `GET /api/auth/me/export`).

### Droit de rectification (art. 16)
Non implémenté en v1 (l'email ne peut pas être modifié). Contacter l'administrateur pour toute rectification.

## 5. Cookies

| Cookie | Nom | Durée | httpOnly | SameSite | Finalité |
|--------|-----|-------|----------|----------|----------|
| Session | `token` | 7 jours | ✅ | Strict | Authentification JWT |

Aucun cookie de traçage ou publicitaire.

## 6. Sous-traitants et transferts

- **Aucun sous-traitant** en configuration Docker auto-hébergée.
- En déploiement cloud, l'hébergeur est un sous-traitant au sens du RGPD et doit fournir des garanties (contrat de traitement de données, localisation UE si applicable).

## 7. Information des utilisateurs

L'application doit afficher, sur la page d'inscription, un lien vers la présente note RGPD (ou une version simplifiée) avant que l'utilisateur ne crée son compte.

Texte suggéré : *"En créant un compte, vous acceptez que votre adresse e-mail et vos données de jeu soient conservées pour vous permettre d'accéder à vos statistiques. Vous pouvez supprimer votre compte à tout moment depuis votre profil."*

## 8. Responsable de traitement

Le responsable de traitement est le développeur / l'entité qui déploie l'application.

---

*Note rédigée dans le cadre du dossier CDA (RNCP 37873). À compléter avec les coordonnées du responsable de traitement avant mise en production.*
