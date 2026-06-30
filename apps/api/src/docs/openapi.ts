// Spécification OpenAPI 3.0 de l'API WordlFR.
// Servie en JSON sur GET /api/openapi.json et via Swagger UI sur /api/docs.
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "WordlFR — API",
    version: "1.0.0",
    description:
      "API REST du jeu de lettres quotidien WordlFR (projet CDA, RNCP 37873). " +
      "Authentification par JWT en cookie httpOnly. Le mot du jour n'est jamais exposé.",
  },
  servers: [{ url: "/", description: "Serveur courant" }],
  tags: [
    { name: "Auth", description: "Inscription, connexion, session, RGPD" },
    { name: "Game", description: "Partie du jour et soumission d'essais" },
    { name: "Stats", description: "Statistiques du joueur" },
    { name: "Admin", description: "Gestion des mots du jour (rôle admin)" },
    { name: "Health", description: "Supervision" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "token" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string", example: "unauthorized" } },
      },
      Credentials: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "joueur@demo.fr" },
          password: { type: "string", minLength: 8, example: "motdepasse123" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", format: "email", example: "joueur@demo.fr" },
          role: { type: "string", enum: ["player", "admin"], example: "player" },
        },
      },
      UserEnvelope: {
        type: "object",
        properties: { user: { $ref: "#/components/schemas/User" } },
      },
      LetterState: {
        type: "string",
        enum: ["correct", "present", "absent"],
        description: "État d'une lettre : bien placée / présente ailleurs / absente",
      },
      Attempt: {
        type: "object",
        properties: {
          guess: { type: "string", example: "table" },
          result: { type: "array", items: { $ref: "#/components/schemas/LetterState" } },
        },
      },
      GameState: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["in_progress", "won", "lost"] },
          maxAttempts: { type: "integer", example: 6 },
          attempts: { type: "array", items: { $ref: "#/components/schemas/Attempt" } },
        },
      },
      GuessInput: {
        type: "object",
        required: ["guess"],
        properties: { guess: { type: "string", minLength: 5, maxLength: 5, example: "table" } },
      },
      GuessResult: {
        type: "object",
        properties: {
          result: { type: "array", items: { $ref: "#/components/schemas/LetterState" } },
          status: { type: "string", enum: ["in_progress", "won", "lost"] },
        },
        description: "Le mot cible n'apparaît jamais dans la réponse (anti-triche).",
      },
      PlayerStats: {
        type: "object",
        properties: {
          gamesPlayed: { type: "integer", example: 12 },
          wins: { type: "integer", example: 9 },
          winRate: { type: "number", example: 0.75 },
          currentStreak: { type: "integer", example: 3 },
          maxStreak: { type: "integer", example: 5 },
          guessDistribution: {
            type: "object",
            additionalProperties: { type: "integer" },
            example: { "1": 0, "2": 1, "3": 4, "4": 2, "5": 1, "6": 1 },
          },
        },
      },
      DailyWord: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          date: { type: "string", format: "date", example: "2026-07-01" },
          word: { type: "string", example: "table" },
          created_by: { type: "integer", nullable: true, example: 1 },
          created_at: { type: "string", format: "date-time" },
        },
      },
      WordInput: {
        type: "object",
        required: ["date", "word"],
        properties: {
          date: { type: "string", format: "date", example: "2026-07-02" },
          word: { type: "string", minLength: 5, maxLength: 5, example: "fleur" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Non authentifié (cookie absent ou invalide)",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Forbidden: {
        description: "Authentifié mais droits insuffisants (rôle admin requis)",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      BadRequest: {
        description: "Entrée invalide",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Créer un compte joueur",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Credentials" } } },
        },
        responses: {
          "201": {
            description: "Compte créé, cookie de session posé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserEnvelope" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "409": {
            description: "Email déjà utilisé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Se connecter",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Credentials" } } },
        },
        responses: {
          "200": {
            description: "Connecté, cookie de session posé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserEnvelope" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { description: "Trop de tentatives (rate-limit)" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Se déconnecter (efface le cookie)",
        responses: { "204": { description: "Déconnecté" } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Profil du joueur connecté",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Profil",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserEnvelope" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Auth"],
        summary: "Supprimer son compte (droit à l'oubli RGPD)",
        security: [{ cookieAuth: [] }],
        responses: {
          "204": { description: "Compte et données associées supprimés" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/game/today": {
      get: {
        tags: ["Game"],
        summary: "État de la partie du jour",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "État courant (essais déjà joués, statut)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameState" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/game/guess": {
      post: {
        tags: ["Game"],
        summary: "Soumettre un essai",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/GuessInput" } } },
        },
        responses: {
          "200": {
            description: "Résultat de l'essai (le mot n'est jamais renvoyé)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GuessResult" } } },
          },
          "400": {
            description: "Mot invalide ou format incorrect",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": {
            description: "Partie terminée ou nombre d'essais atteint",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/stats": {
      get: {
        tags: ["Stats"],
        summary: "Statistiques du joueur",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Statistiques agrégées",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PlayerStats" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/admin/words": {
      get: {
        tags: ["Admin"],
        summary: "Lister les mots du jour",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Liste des mots",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    words: { type: "array", items: { $ref: "#/components/schemas/DailyWord" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Ajouter un mot du jour",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/WordInput" } } },
        },
        responses: {
          "201": {
            description: "Mot créé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/DailyWord" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { description: "Un mot existe déjà pour cette date" },
        },
      },
    },
    "/api/admin/words/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      patch: {
        tags: ["Admin"],
        summary: "Modifier un mot du jour",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  word: { type: "string", minLength: 5, maxLength: 5 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Mot mis à jour",
            content: { "application/json": { schema: { $ref: "#/components/schemas/DailyWord" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Mot introuvable" },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Supprimer un mot du jour",
        security: [{ cookieAuth: [] }],
        responses: {
          "204": { description: "Mot supprimé" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Mot introuvable" },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "État de santé de l'API et de la base",
        responses: {
          "200": {
            description: "Service opérationnel",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    db: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
