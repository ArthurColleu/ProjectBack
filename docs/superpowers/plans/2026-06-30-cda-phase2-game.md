# CDA Phase 2 — Game (server-authoritative play) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Add the game tables and a layered, server-authoritative game module: a logged-in player gets/continues today's game, submits guesses validated and scored on the server, with the target word never sent to the client and the 6-attempt limit enforced from the database (true anti-cheat).

**Architecture:** Builds on Phase 1. New migration adds `daily_words`, `games`, `guesses`. The `games` module follows `routes → controller → service → repository(parameterized SQL)`. Game state lives in the DB; the player only ever touches their own game (`req.user.id`). Tests use the Phase 1 pg-mem harness.

**Tech Stack:** unchanged (Express + TS + pg + zod; Vitest + Supertest + pg-mem).

## Global Constraints

- ALL SQL only in `games.repository.ts` and migration files; every query parameterized.
- The target word is NEVER returned in any response (no `revealedWord`, no echo). On loss it stays hidden.
- The number of attempts is read from the DB (`guesses` count) — the client cannot influence it. Max 6 attempts.
- A player accesses only their own game (queries are scoped by `user_id = req.user.id`).
- "Today" is computed by one shared helper `todayIso()` so server and tests agree.
- Every game references a `daily_words` row; if the admin set no word for today, the server auto-creates one from the deterministic fallback (`dailyFallbackWord`).

---

## Task 1: Game tables migration + shared clock

**Files:**
- Create: `apps/api/src/db/migrations/0002_game.sql`
- Create: `apps/api/src/lib/clock.ts`
- Test: `apps/api/src/lib/clock.test.ts`

**Interfaces:**
- Produces: `export function todayIso(): string` (returns `YYYY-MM-DD` for the current UTC day) in `clock.ts`.

- [ ] **Step 1: `0002_game.sql`**

```sql
CREATE TABLE IF NOT EXISTS daily_words (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date       DATE        NOT NULL UNIQUE,
  word       VARCHAR(5)  NOT NULL,
  created_by INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_word_id INTEGER NOT NULL REFERENCES daily_words(id) ON DELETE CASCADE,
  status        VARCHAR(11) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress','won','lost')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  UNIQUE (user_id, daily_word_id)
);

CREATE TABLE IF NOT EXISTS guesses (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id        INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 6),
  guess          VARCHAR(5) NOT NULL,
  result         JSONB    NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_guesses_game ON guesses(game_id);
```

- [ ] **Step 2: `clock.ts`**

```ts
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 3: `clock.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { todayIso } from "./clock";

describe("todayIso", () => {
  it("returns an ISO date YYYY-MM-DD", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 4: Run tests** — `npm --prefix apps/api test` → all pass (the harness migration now also creates the game tables). Expected green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): add game tables migration and shared clock helper"
```

---

## Task 2: Games repository (parameterized SQL)

**Files:**
- Create: `apps/api/src/modules/games/games.repository.ts`
- Test: `apps/api/src/modules/games/games.repository.test.ts`

**Interfaces:**
- Consumes: `Db`.
- Produces: `export function makeGamesRepository(db: Db)` returning:
  - `findWordByDate(date: string): Promise<{ id: number; word: string } | null>`
  - `insertDailyWord(date: string, word: string, createdBy: number | null): Promise<{ id: number; word: string }>`
  - `findGame(userId: number, dailyWordId: number): Promise<{ id: number; status: GameStatus } | null>`
  - `createGame(userId: number, dailyWordId: number): Promise<{ id: number; status: GameStatus }>`
  - `listGuesses(gameId: number): Promise<{ guess: string; result: LetterState[] }[]>` (ordered by attempt_number)
  - `countGuesses(gameId: number): Promise<number>`
  - `insertGuess(gameId: number, attemptNumber: number, guess: string, result: LetterState[]): Promise<void>`
  - `updateGameStatus(gameId: number, status: GameStatus): Promise<void>` (sets finished_at when not in_progress)
  - exports `export type GameStatus = "in_progress" | "won" | "lost";`

- [ ] **Step 1: Write the repository**

```ts
import type { Db } from "../../db/pool.js";
import type { LetterState } from "../../domain/evaluateGuess.js";

export type GameStatus = "in_progress" | "won" | "lost";

export function makeGamesRepository(db: Db) {
  return {
    async findWordByDate(date: string) {
      const { rows } = await db.query<{ id: number; word: string }>(
        "SELECT id, word FROM daily_words WHERE date = $1",
        [date],
      );
      return rows[0] ?? null;
    },
    async insertDailyWord(date: string, word: string, createdBy: number | null) {
      const { rows } = await db.query<{ id: number; word: string }>(
        "INSERT INTO daily_words (date, word, created_by) VALUES ($1, $2, $3) RETURNING id, word",
        [date, word, createdBy],
      );
      return rows[0];
    },
    async findGame(userId: number, dailyWordId: number) {
      const { rows } = await db.query<{ id: number; status: GameStatus }>(
        "SELECT id, status FROM games WHERE user_id = $1 AND daily_word_id = $2",
        [userId, dailyWordId],
      );
      return rows[0] ?? null;
    },
    async createGame(userId: number, dailyWordId: number) {
      const { rows } = await db.query<{ id: number; status: GameStatus }>(
        "INSERT INTO games (user_id, daily_word_id) VALUES ($1, $2) RETURNING id, status",
        [userId, dailyWordId],
      );
      return rows[0];
    },
    async listGuesses(gameId: number) {
      const { rows } = await db.query<{ guess: string; result: LetterState[] }>(
        "SELECT guess, result FROM guesses WHERE game_id = $1 ORDER BY attempt_number ASC",
        [gameId],
      );
      return rows;
    },
    async countGuesses(gameId: number): Promise<number> {
      const { rows } = await db.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM guesses WHERE game_id = $1",
        [gameId],
      );
      return rows[0].n;
    },
    async insertGuess(gameId: number, attemptNumber: number, guess: string, result: LetterState[]) {
      await db.query(
        "INSERT INTO guesses (game_id, attempt_number, guess, result) VALUES ($1, $2, $3, $4)",
        [gameId, attemptNumber, guess, JSON.stringify(result)],
      );
    },
    async updateGameStatus(gameId: number, status: GameStatus) {
      await db.query(
        "UPDATE games SET status = $1, finished_at = CASE WHEN $1 = 'in_progress' THEN NULL ELSE now() END WHERE id = $2",
        [status, gameId],
      );
    },
  };
}

export type GamesRepository = ReturnType<typeof makeGamesRepository>;
```

- [ ] **Step 2: Repository test** (against pg-mem; seeds a user + word directly)

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb } from "../../../tests/helpers/testDb";
import { makeGamesRepository } from "./games.repository";
import type { Db } from "../../db/pool";

let db: Db;
let repo: ReturnType<typeof makeGamesRepository>;

beforeEach(async () => {
  db = await makeTestDb();
  repo = makeGamesRepository(db);
  await db.query("INSERT INTO users (email, password_hash) VALUES ($1,$2)", ["p@p.fr", "h"]);
});

describe("games.repository", () => {
  it("creates a daily word, a game, records guesses and counts them", async () => {
    const word = await repo.insertDailyWord("2026-06-30", "table", null);
    expect(word.word).toBe("table");

    const game = await repo.createGame(1, word.id);
    expect(game.status).toBe("in_progress");

    expect(await repo.countGuesses(game.id)).toBe(0);
    await repo.insertGuess(game.id, 1, "porte", ["absent", "present", "absent", "absent", "correct"]);
    expect(await repo.countGuesses(game.id)).toBe(1);

    const guesses = await repo.listGuesses(game.id);
    expect(guesses).toHaveLength(1);
    expect(guesses[0]).toEqual({ guess: "porte", result: ["absent", "present", "absent", "absent", "correct"] });

    await repo.updateGameStatus(game.id, "won");
    const found = await repo.findGame(1, word.id);
    expect(found?.status).toBe("won");
  });

  it("findWordByDate returns null when absent", async () => {
    expect(await repo.findWordByDate("2099-01-01")).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests** — `npm --prefix apps/api test` → all pass. If pg-mem returns `result` as a string instead of parsed JSON, the assertion `toEqual` will fail; in that case adjust the repository's `listGuesses` to `JSON.parse` the value if it is a string (`typeof r.result === "string" ? JSON.parse(r.result) : r.result`) and re-run. Report which path was needed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): add games repository with parameterized SQL"
```

---

## Task 3: Games service (server-authoritative rules + anti-cheat)

**Files:**
- Create: `apps/api/src/modules/games/games.service.ts`
- Test: `apps/api/src/modules/games/games.service.test.ts`

**Interfaces:**
- Consumes: `GamesRepository`, `evaluateGuess`/`LetterState`, `isValidWord`, `dailyFallbackWord`/`DICTIONARY`, `todayIso`, `HttpError`.
- Produces: `export function makeGamesService(repo, deps?)` returning:
  - `getToday(userId: number): Promise<{ status: GameStatus; maxAttempts: 6; attempts: { guess: string; result: LetterState[] }[] }>`
  - `submitGuess(userId: number, guess: string): Promise<{ result: LetterState[]; status: GameStatus }>`
  - The target word is never part of any return value.
  - `deps` is optional `{ today?: () => string }` for test injection; defaults to `todayIso`.

- [ ] **Step 1: Write the service**

```ts
import { HttpError } from "../../middlewares/errorHandler.js";
import { evaluateGuess, type LetterState } from "../../domain/evaluateGuess.js";
import { isValidWord, DICTIONARY } from "../../domain/dictionary.js";
import { dailyFallbackWord } from "../../domain/fallbackWord.js";
import { todayIso } from "../../lib/clock.js";
import type { GamesRepository, GameStatus } from "./games.repository.js";

const MAX_ATTEMPTS = 6;

export function makeGamesService(
  repo: GamesRepository,
  deps: { today?: () => string } = {},
) {
  const today = deps.today ?? todayIso;

  async function ensureTodayWord(): Promise<{ id: number; word: string }> {
    const date = today();
    const existing = await repo.findWordByDate(date);
    if (existing) return existing;
    return repo.insertDailyWord(date, dailyFallbackWord(date, DICTIONARY), null);
  }

  async function ensureGame(userId: number) {
    const word = await ensureTodayWord();
    const existing = await repo.findGame(userId, word.id);
    const game = existing ?? (await repo.createGame(userId, word.id));
    return { game, word };
  }

  return {
    async getToday(userId: number) {
      const { game } = await ensureGame(userId);
      const attempts = await repo.listGuesses(game.id);
      return { status: game.status, maxAttempts: MAX_ATTEMPTS as 6, attempts };
    },

    async submitGuess(userId: number, rawGuess: string) {
      const guess = rawGuess.toLowerCase();
      if (!isValidWord(guess)) {
        throw new HttpError(400, "invalid_word");
      }
      const { game, word } = await ensureGame(userId);
      if (game.status !== "in_progress") {
        throw new HttpError(409, "game_over");
      }
      const played = await repo.countGuesses(game.id);
      if (played >= MAX_ATTEMPTS) {
        throw new HttpError(409, "no_attempts_left");
      }

      const result: LetterState[] = evaluateGuess(guess, word.word);
      const attemptNumber = played + 1;
      await repo.insertGuess(game.id, attemptNumber, guess, result);

      let status: GameStatus = "in_progress";
      if (result.every((s) => s === "correct")) status = "won";
      else if (attemptNumber >= MAX_ATTEMPTS) status = "lost";
      if (status !== "in_progress") await repo.updateGameStatus(game.id, status);

      // Anti-cheat: never return the target word.
      return { result, status };
    },
  };
}

export type GamesService = ReturnType<typeof makeGamesService>;
```

- [ ] **Step 2: Service test** (drives the real service against pg-mem with a fixed date + known word)

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb } from "../../../tests/helpers/testDb";
import { makeGamesRepository } from "./games.repository";
import { makeGamesService } from "./games.service";
import type { Db } from "../../db/pool";

const FIXED = "2026-06-30";
let db: Db;
let service: ReturnType<typeof makeGamesService>;

beforeEach(async () => {
  db = await makeTestDb();
  const repo = makeGamesRepository(db);
  service = makeGamesService(repo, { today: () => FIXED });
  await db.query("INSERT INTO users (email, password_hash) VALUES ($1,$2)", ["p@p.fr", "h"]);
  // Admin set today's word so the test knows the target.
  await db.query("INSERT INTO daily_words (date, word) VALUES ($1,$2)", [FIXED, "table"]);
});

describe("games.service", () => {
  it("starts an empty game for today", async () => {
    const state = await service.getToday(1);
    expect(state).toEqual({ status: "in_progress", maxAttempts: 6, attempts: [] });
  });

  it("rejects a non-dictionary word without consuming an attempt", async () => {
    await expect(service.submitGuess(1, "zzzzz")).rejects.toMatchObject({ status: 400 });
    expect((await service.getToday(1)).attempts).toHaveLength(0);
  });

  it("scores a guess and records it, never returning the word", async () => {
    const res = await service.submitGuess(1, "porte");
    expect(res.status).toBe("in_progress");
    expect(res.result).toHaveLength(5);
    expect(JSON.stringify(res)).not.toContain("table");
    expect((await service.getToday(1)).attempts).toHaveLength(1);
  });

  it("marks the game won on the correct word", async () => {
    const res = await service.submitGuess(1, "table");
    expect(res.status).toBe("won");
    expect(res.result).toEqual(["correct", "correct", "correct", "correct", "correct"]);
  });

  it("marks the game lost after 6 wrong guesses and blocks further guesses", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await service.submitGuess(1, "porte");
      expect(r.status).toBe("in_progress");
    }
    const sixth = await service.submitGuess(1, "porte");
    expect(sixth.status).toBe("lost");
    await expect(service.submitGuess(1, "porte")).rejects.toMatchObject({ status: 409 });
  });
});
```

- [ ] **Step 3: Run tests** — `npm --prefix apps/api test` → all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): add server-authoritative games service (anti-cheat)"
```

---

## Task 4: Games controller, routes, app wiring

**Files:**
- Create: `apps/api/src/modules/games/games.controller.ts`, `apps/api/src/modules/games/games.routes.ts`
- Modify: `apps/api/src/app.ts` (mount `/api/game`, authenticated)

**Interfaces:**
- Consumes: `GamesService`, `authenticate`, `validate`, the async `wrap` pattern.
- Produces: routes `GET /api/game/today` and `POST /api/game/guess` (both require auth).

- [ ] **Step 1: `games.controller.ts`**

```ts
import type { Request, Response } from "express";
import type { GamesService } from "./games.service.js";

export function makeGamesController(service: GamesService) {
  return {
    async today(req: Request, res: Response) {
      res.json(await service.getToday(req.user!.id));
    },
    async guess(req: Request, res: Response) {
      res.json(await service.submitGuess(req.user!.id, req.body.guess));
    },
  };
}
```

- [ ] **Step 2: `games.routes.ts`**

```ts
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/pool.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { makeGamesRepository } from "./games.repository.js";
import { makeGamesService } from "./games.service.js";
import { makeGamesController } from "./games.controller.js";

const guessSchema = z.object({ guess: z.string().length(5) });

export function gamesRoutes(db: Db): Router {
  const controller = makeGamesController(makeGamesService(makeGamesRepository(db)));
  const router = Router();
  router.use(authenticate);
  router.get("/today", asyncHandler(controller.today));
  router.post("/guess", validate(guessSchema), asyncHandler(controller.guess));
  return router;
}
```

- [ ] **Step 3: Mount in `app.ts`** — add the import and route. Insert after the auth route registration:

```ts
import { gamesRoutes } from "./modules/games/games.routes.js";
// ... inside createApp, after app.use("/api/auth", authRoutes(db)):
  app.use("/api/game", gamesRoutes(db));
```

- [ ] **Step 4: Build** — `npm --prefix apps/api run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): add game controller, routes, and app wiring"
```

---

## Task 5: Game integration tests (Supertest + pg-mem)

**Files:**
- Test: `apps/api/tests/integration/game.test.ts`

**Interfaces:**
- Consumes: `createApp`, `makeTestDb`, `todayIso`.

- [ ] **Step 1: Write the integration test** (registers a user, seeds today's word so the target is known, plays through the API; the date uses `todayIso()` so it matches the server)

```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { makeTestDb } from "../helpers/testDb";
import { todayIso } from "../../src/lib/clock";
import type { Db } from "../../src/db/pool";

let app: ReturnType<typeof createApp>;
let db: Db;

async function authed() {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ email: "joueur@test.fr", password: "motdepasse1" });
  return agent;
}

beforeEach(async () => {
  db = await makeTestDb();
  app = createApp(db);
  // Seed today's word so the test knows the target.
  await db.query("INSERT INTO daily_words (date, word) VALUES ($1,$2)", [todayIso(), "table"]);
});

describe("game API", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/game/today")).status).toBe(401);
    expect((await request(app).post("/api/game/guess").send({ guess: "table" })).status).toBe(401);
  });

  it("returns an empty game for today, never leaking the word", async () => {
    const agent = await authed();
    const res = await agent.get("/api/game/today");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "in_progress", maxAttempts: 6, attempts: [] });
    expect(JSON.stringify(res.body)).not.toContain("table");
  });

  it("rejects a non-dictionary guess with 400 and no attempt consumed", async () => {
    const agent = await authed();
    const bad = await agent.post("/api/game/guess").send({ guess: "zzzzz" });
    expect(bad.status).toBe(400);
    expect((await agent.get("/api/game/today")).body.attempts).toHaveLength(0);
  });

  it("scores a guess without ever returning the target word", async () => {
    const agent = await authed();
    const res = await agent.post("/api/game/guess").send({ guess: "porte" });
    expect(res.status).toBe(200);
    expect(res.body.result).toHaveLength(5);
    expect("revealedWord" in res.body).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain("table");
  });

  it("wins on the correct word", async () => {
    const agent = await authed();
    const res = await agent.post("/api/game/guess").send({ guess: "table" });
    expect(res.body.status).toBe("won");
    expect(res.body.result).toEqual(["correct", "correct", "correct", "correct", "correct"]);
  });

  it("enforces the 6-attempt limit server-side and blocks extra guesses", async () => {
    const agent = await authed();
    for (let i = 0; i < 6; i++) await agent.post("/api/game/guess").send({ guess: "porte" });
    const state = await agent.get("/api/game/today");
    expect(state.body.status).toBe("lost");
    expect(state.body.attempts).toHaveLength(6);
    const extra = await agent.post("/api/game/guess").send({ guess: "porte" });
    expect(extra.status).toBe(409);
  });

  it("isolates games per player (a second player starts fresh)", async () => {
    const a = await authed();
    await a.post("/api/game/guess").send({ guess: "porte" });

    const b = request.agent(app);
    await b.post("/api/auth/register").send({ email: "autre@test.fr", password: "motdepasse1" });
    const state = await b.get("/api/game/today");
    expect(state.body.attempts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the full suite** — `npm --prefix apps/api test` → all pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(api): add game integration tests (anti-cheat, attempt limit, isolation)"
```

---

## Final Verification (Phase 2)

- [ ] `npm --prefix apps/api run build` passes.
- [ ] `npm --prefix apps/api test` fully green (auth + game).
- [ ] No SQL outside `*.repository.ts` / migrations; every query parameterized.
- [ ] No response (game/today, guess) contains the target word.
