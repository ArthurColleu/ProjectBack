# Wordle Quotidien Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a daily Wordle web app (Next.js + Supabase) with anti-cheat server-side validation, a virtual AZERTY keyboard, localStorage progress, and an admin dashboard to manage daily words.

**Architecture:** Next.js 14 App Router + TypeScript + Tailwind. Supabase Postgres holds `daily_words`; Supabase Auth handles admin login. All guess evaluation happens in Next.js Route Handlers using the service-role client — the target word is never sent to the browser except on win/loss reveal. Game state persists client-side in `localStorage` keyed by date.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest, deployed on Vercel.

## Global Constraints

- Words are exactly 5 lowercase letters, no accents, matching `/^[a-z]{5}$/`.
- The target word for the current day must never appear in any client-visible response unless the guess is correct or the player has exhausted all 6 attempts.
- `SUPABASE_SERVICE_ROLE_KEY` must only be referenced in server-side files (Route Handlers, `lib/supabase/server.ts`) — never imported into any file under `app/**/page.tsx` client components or anything bundled to the browser.
- `daily_words` has RLS enabled with no public read policy; all reads/writes go through the service-role client server-side.
- Game state in localStorage uses key pattern `wordle-progress-<YYYY-MM-DD>`.
- 6 max attempts, 5-letter words.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `.env.local.example`
- Create: `.gitignore`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: a runnable Next.js TS app with Tailwind wired up, and a Vitest config that can run `lib/**/*.test.ts`.

- [ ] **Step 1: Scaffold Next.js app**

Run:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
```
When prompted, accept defaults. If the directory isn't empty enough, run with `--yes` and resolve conflicts by keeping the generated files (this is a fresh empty repo so there should be no conflicts).

- [ ] **Step 2: Verify dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100` and kill the background process.
Expected: HTTP code `200`.

- [ ] **Step 3: Install extra dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Add test script to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 6: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

## Task 2: Dictionary Library

**Files:**
- Create: `lib/dictionary.ts`
- Test: `lib/dictionary.test.ts`

**Interfaces:**
- Produces:
  - `export const DICTIONARY: string[]` — list of valid 5-letter lowercase, unaccented French words.
  - `export function isValidWord(word: string): boolean`

- [ ] **Step 1: Write the failing test**

Create `lib/dictionary.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DICTIONARY, isValidWord } from "./dictionary";

describe("dictionary", () => {
  it("contains only 5-letter lowercase unaccented words", () => {
    expect(DICTIONARY.length).toBeGreaterThan(100);
    for (const word of DICTIONARY) {
      expect(word).toMatch(/^[a-z]{5}$/);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(DICTIONARY).size).toBe(DICTIONARY.length);
  });

  it("validates known words", () => {
    expect(isValidWord("table")).toBe(true);
    expect(isValidWord("TABLE")).toBe(true);
    expect(isValidWord("zzzzz")).toBe(false);
    expect(isValidWord("ab")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/dictionary.test.ts`
Expected: FAIL — `lib/dictionary.ts` does not exist.

- [ ] **Step 3: Write the dictionary implementation**

Create `lib/dictionary.ts`. This list ships 129 verified, unique, lowercase, unaccented French 5-letter words for v1 — enough to run a daily word for over four months without repeats. It can be extended later by appending more verified entries to the array; no other code needs to change.

```ts
export const DICTIONARY: string[] = [
  "table", "porte", "fleur", "jouer", "monde", "temps", "lieux", "rouge",
  "noire", "blanc", "verte", "jaune", "grise", "ville", "route", "image",
  "force", "ordre", "place", "terre", "fruit", "lampe", "trace", "geste",
  "sport", "douce", "salle", "verre", "stylo", "poire", "pomme", "vigne",
  "ferme", "champ", "boite", "carte", "livre", "chien", "tigre", "zebre",
  "singe", "aigle", "poule", "vache", "arbre", "foret", "plage", "neige",
  "glace", "pluie", "orage", "nuage", "brume", "froid", "chaud", "tiede",
  "clair", "beige", "doree", "acier", "metal", "roche", "sable", "puits",
  "sente", "piste", "salon", "cadre", "cible", "ligne", "point", "angle",
  "cycle", "signe", "forme", "masse", "poids", "vitre", "socle", "credo",
  "degre", "piece", "cause", "doute", "envie", "peine", "amour", "haine",
  "calme", "agite", "fatal", "lourd", "leger", "solde", "prime", "somme",
  "ratio", "carre", "droit", "apres", "avant", "motif", "trait", "degat",
  "casse", "brise", "ronde", "pacte", "ligue", "trone", "garde", "veste",
  "botte", "sabot", "laine", "coton", "toile", "perle", "bague", "verni",
  "tapis", "aimer", "venir", "tenir", "boire", "vivre", "laver", "nager",
  "voler",
];

const DICTIONARY_SET = new Set(DICTIONARY);

export function isValidWord(word: string): boolean {
  return DICTIONARY_SET.has(word.toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/dictionary.test.ts`
Expected: PASS (all 3 tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/dictionary.ts lib/dictionary.test.ts
git commit -m "feat: add French 5-letter word dictionary"
```

---

## Task 3: Game Logic (`evaluateGuess`)

**Files:**
- Create: `lib/game.ts`
- Test: `lib/game.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces:
  - `export type LetterState = "correct" | "present" | "absent";`
  - `export function evaluateGuess(guess: string, target: string): LetterState[]`
  - `export function dailyFallbackWord(date: string, dictionary: string[]): string` — deterministic pick from `dictionary` using a hash of `date` (format `YYYY-MM-DD`).

- [ ] **Step 1: Write the failing test**

Create `lib/game.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { evaluateGuess, dailyFallbackWord } from "./game";

describe("evaluateGuess", () => {
  it("marks all correct when guess equals target", () => {
    expect(evaluateGuess("table", "table")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ]);
  });

  it("marks absent letters not in target", () => {
    expect(evaluateGuess("zzzzz", "table")).toEqual([
      "absent", "absent", "absent", "absent", "absent",
    ]);
  });

  it("marks present for right letter wrong position", () => {
    // target "table": t-a-b-l-e
    // guess  "blate": b-l-a-t-e
    expect(evaluateGuess("blate", "table")).toEqual([
      "present", "present", "present", "present", "correct",
    ]);
  });

  it("handles duplicate letters in guess correctly", () => {
    // target "ferme" has one 'e' at index 1 and one at index 4
    // guess "eeeee" should mark only two 'e's: index1 and index4 as correct? actually exact positions
    const result = evaluateGuess("eeeee", "ferme");
    // ferme = f-e-r-m-e ; positions 1 and 4 are 'e' -> correct, others absent (no extra 'e' left)
    expect(result).toEqual(["absent", "correct", "absent", "absent", "correct"]);
  });

  it("handles duplicate letters in target with single matching letter in guess", () => {
    // target "ferme" has two 'e's, guess "lever" has 'e' at index1 (present, since target's e at idx1 is consumed by guess idx? let's verify directly)
    // guess: l-e-v-e-r, target: f-e-r-m-e
    // pass1 exact matches: guess[1]='e' vs target[1]='e' -> correct. others no exact match.
    // pass2 remaining target letters pool (excluding consumed index1): f,r,m,e(idx4)
    // guess[0]='l' not in pool -> absent
    // guess[2]='v' not in pool -> absent
    // guess[3]='e' -> pool has 'e'(idx4) -> present, consume it
    // guess[4]='r' -> pool has 'r' -> present
    expect(evaluateGuess("lever", "ferme")).toEqual([
      "absent", "correct", "absent", "present", "present",
    ]);
  });
});

describe("dailyFallbackWord", () => {
  const dict = ["alpha", "bravo", "charl", "delta", "ephes"];

  it("is deterministic for the same date", () => {
    const a = dailyFallbackWord("2026-06-29", dict);
    const b = dailyFallbackWord("2026-06-29", dict);
    expect(a).toBe(b);
  });

  it("returns a word from the dictionary", () => {
    const word = dailyFallbackWord("2026-01-01", dict);
    expect(dict).toContain(word);
  });

  it("differs across different dates (not always identical)", () => {
    const results = new Set(
      ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"].map((d) =>
        dailyFallbackWord(d, dict)
      )
    );
    expect(results.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/game.test.ts`
Expected: FAIL — `lib/game.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `lib/game.ts`:
```ts
export type LetterState = "correct" | "present" | "absent";

export function evaluateGuess(guess: string, target: string): LetterState[] {
  const g = guess.toLowerCase().split("");
  const t = target.toLowerCase().split("");
  const result: LetterState[] = new Array(g.length).fill("absent");

  const remaining: Record<string, number> = {};
  for (let i = 0; i < t.length; i++) {
    if (g[i] === t[i]) {
      result[i] = "correct";
    } else {
      remaining[t[i]] = (remaining[t[i]] ?? 0) + 1;
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    const letter = g[i];
    if (remaining[letter] > 0) {
      result[i] = "present";
      remaining[letter] -= 1;
    } else {
      result[i] = "absent";
    }
  }

  return result;
}

export function dailyFallbackWord(date: string, dictionary: string[]): string {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  const index = hash % dictionary.length;
  return dictionary[index];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/game.test.ts`
Expected: PASS (all tests green). If the duplicate-letter test cases fail, re-derive the expected arrays by hand-tracing the algorithm above rather than changing the algorithm's two-pass structure.

- [ ] **Step 5: Commit**

```bash
git add lib/game.ts lib/game.test.ts
git commit -m "feat: add evaluateGuess and dailyFallbackWord game logic"
```

---

## Task 4: Supabase Clients & SQL Migration

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces:
  - `export function getServiceRoleClient(): SupabaseClient` (in `lib/supabase/server.ts`) — uses `SUPABASE_SERVICE_ROLE_KEY`, server-only.
  - `export function getServerSessionClient(): SupabaseClient` (in `lib/supabase/server.ts`) — uses anon key + cookies, for reading the admin's auth session in Route Handlers/middleware.
  - `export function getBrowserClient(): SupabaseClient` (in `lib/supabase/client.ts`) — uses anon key, for the login page.
- Consumes: env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Write the SQL migration**

Create `supabase/migrations/0001_init.sql`:
```sql
create table if not exists daily_words (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  word varchar(5) not null,
  created_at timestamptz default now()
);

alter table daily_words enable row level security;

-- No public read/write policy is created on purpose: only the service-role
-- key (used exclusively in server-side Route Handlers) can access this table.
-- The service role bypasses RLS entirely, so no policy is required for it.
```

- [ ] **Step 2: Write the server-side Supabase clients**

Create `lib/supabase/server.ts`:
```ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getServiceRoleClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function getServerSessionClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}
```

- [ ] **Step 3: Write the browser-side Supabase client**

Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function getBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Verify the project still builds**

Run: `npm run build`
Expected: build succeeds (env vars can be empty strings at build time since these functions aren't called at module load; if the build fails due to missing env vars, add placeholder values to `.env.local` copied from `.env.local.example`).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase supabase/migrations
git commit -m "feat: add Supabase server/browser clients and init migration"
```

---

## Task 5: `/api/word` Route Handler (game API)

**Files:**
- Create: `app/api/word/route.ts`
- Test: `app/api/word/route.test.ts`

**Interfaces:**
- Consumes: `evaluateGuess`, `dailyFallbackWord` from `lib/game.ts`; `isValidWord` from `lib/dictionary.ts`; `getServiceRoleClient` from `lib/supabase/server.ts`.
- Produces:
  - `GET /api/word` → `{ date: string }`
  - `POST /api/word` body `{ guess: string }` → `200 { result: LetterState[], isCorrect: boolean, revealedWord?: string }` or `400 { error: "invalid_word" }`
  - `export async function resolveTargetWord(date: string): Promise<string>` — exported for testability, looks up `daily_words` then falls back to `dailyFallbackWord`.

- [ ] **Step 1: Write the failing test**

Create `app/api/word/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleClient: vi.fn(),
}));

import { resolveTargetWord } from "./route";
import { getServiceRoleClient } from "@/lib/supabase/server";

describe("resolveTargetWord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the word from Supabase when present", async () => {
    (getServiceRoleClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { word: "table" }, error: null }),
          }),
        }),
      }),
    });

    const word = await resolveTargetWord("2026-06-29");
    expect(word).toBe("table");
  });

  it("falls back to a deterministic word when Supabase has no entry", async () => {
    (getServiceRoleClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    });

    const word = await resolveTargetWord("2026-06-29");
    expect(word).toMatch(/^[a-z]{5}$/);
  });

  it("falls back to a deterministic word when Supabase errors", async () => {
    (getServiceRoleClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: new Error("down") }),
          }),
        }),
      }),
    });

    const word = await resolveTargetWord("2026-06-29");
    expect(word).toMatch(/^[a-z]{5}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/word/route.test.ts`
Expected: FAIL — `app/api/word/route.ts` does not exist (or `resolveTargetWord` not exported).

- [ ] **Step 3: Write the Route Handler**

Create `app/api/word/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { evaluateGuess, dailyFallbackWord, LetterState } from "@/lib/game";
import { isValidWord, DICTIONARY } from "@/lib/dictionary";
import { getServiceRoleClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 6;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function resolveTargetWord(date: string): Promise<string> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("daily_words")
      .select("word")
      .eq("date", date)
      .maybeSingle();

    if (error || !data) {
      return dailyFallbackWord(date, DICTIONARY);
    }
    return data.word;
  } catch {
    return dailyFallbackWord(date, DICTIONARY);
  }
}

export async function GET() {
  return NextResponse.json({ date: todayIsoDate() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const guess = typeof body?.guess === "string" ? body.guess.toLowerCase() : "";
  const attemptNumber = typeof body?.attemptNumber === "number" ? body.attemptNumber : 1;

  if (!isValidWord(guess)) {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  const date = todayIsoDate();
  const target = await resolveTargetWord(date);
  const result: LetterState[] = evaluateGuess(guess, target);
  const isCorrect = result.every((s) => s === "correct");

  const response: { result: LetterState[]; isCorrect: boolean; revealedWord?: string } = {
    result,
    isCorrect,
  };

  if (isCorrect || attemptNumber >= MAX_ATTEMPTS) {
    response.revealedWord = target;
  }

  return NextResponse.json(response);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/word/route.test.ts`
Expected: PASS (all 3 tests green).

- [ ] **Step 5: Commit**

```bash
git add app/api/word
git commit -m "feat: add /api/word route handler with anti-cheat target resolution"
```

---

## Task 6: Game Page UI (grid + virtual keyboard)

**Files:**
- Create: `app/page.tsx`
- Create: `app/components/GameBoard.tsx`
- Create: `app/components/Keyboard.tsx`
- Create: `app/hooks/useWordleGame.ts`
- Test: `app/hooks/useWordleGame.test.ts`

**Interfaces:**
- Consumes: `POST /api/word`, `GET /api/word`, `LetterState` type from `lib/game.ts`.
- Produces:
  - `export type GameStatus = "playing" | "won" | "lost";`
  - `export interface AttemptRecord { guess: string; result: LetterState[] }`
  - `export function useWordleGame(): { attempts: AttemptRecord[]; status: GameStatus; submitGuess: (guess: string) => Promise<void>; error: string | null; revealedWord: string | null }`
  - `<GameBoard attempts={AttemptRecord[]} maxAttempts={6} currentGuess={string} />`
  - `<Keyboard letterStates={Record<string, LetterState>} onKey={(key: string) => void} />`

- [ ] **Step 1: Write the failing test for the hook's pure reducer logic**

Create `app/hooks/useWordleGame.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeLetterStates } from "./useWordleGame";
import type { AttemptRecord } from "./useWordleGame";

describe("computeLetterStates", () => {
  it("returns the best known state per letter across attempts", () => {
    const attempts: AttemptRecord[] = [
      { guess: "blate", result: ["present", "present", "present", "present", "correct"] },
      { guess: "table", result: ["correct", "correct", "correct", "correct", "correct"] },
    ];
    const states = computeLetterStates(attempts);
    expect(states.t).toBe("correct");
    expect(states.a).toBe("correct");
    expect(states.b).toBe("present");
    expect(states.l).toBe("correct");
    expect(states.e).toBe("correct");
  });

  it("returns empty object for no attempts", () => {
    expect(computeLetterStates([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/hooks/useWordleGame.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the hook**

Create `app/hooks/useWordleGame.ts`:
```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { LetterState } from "@/lib/game";

export type GameStatus = "playing" | "won" | "lost";

export interface AttemptRecord {
  guess: string;
  result: LetterState[];
}

const MAX_ATTEMPTS = 6;
const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

export function computeLetterStates(
  attempts: AttemptRecord[]
): Record<string, LetterState> {
  const states: Record<string, LetterState> = {};
  for (const attempt of attempts) {
    for (let i = 0; i < attempt.guess.length; i++) {
      const letter = attempt.guess[i];
      const state = attempt.result[i];
      if (!states[letter] || RANK[state] > RANK[states[letter]]) {
        states[letter] = state;
      }
    }
  }
  return states;
}

function storageKey(date: string): string {
  return `wordle-progress-${date}`;
}

interface StoredProgress {
  date: string;
  attempts: AttemptRecord[];
  status: GameStatus;
  revealedWord: string | null;
}

export function useWordleGame() {
  const [date, setDate] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [error, setError] = useState<string | null>(null);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/word")
      .then((res) => res.json())
      .then((data: { date: string }) => {
        setDate(data.date);
        const raw = localStorage.getItem(storageKey(data.date));
        if (raw) {
          const parsed: StoredProgress = JSON.parse(raw);
          setAttempts(parsed.attempts);
          setStatus(parsed.status);
          setRevealedWord(parsed.revealedWord);
        }
      });
  }, []);

  const persist = useCallback(
    (next: { attempts: AttemptRecord[]; status: GameStatus; revealedWord: string | null }) => {
      if (!date) return;
      const payload: StoredProgress = { date, ...next };
      localStorage.setItem(storageKey(date), JSON.stringify(payload));
    },
    [date]
  );

  const submitGuess = useCallback(
    async (guess: string) => {
      setError(null);
      if (status !== "playing") return;
      if (guess.length !== 5) {
        setError("Le mot doit faire 5 lettres.");
        return;
      }

      const res = await fetch("/api/word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess, attemptNumber: attempts.length + 1 }),
      });

      if (res.status === 400) {
        setError("Ce mot n'existe pas dans le dictionnaire.");
        return;
      }

      const data: { result: LetterState[]; isCorrect: boolean; revealedWord?: string } =
        await res.json();

      const nextAttempts = [...attempts, { guess, result: data.result }];
      let nextStatus: GameStatus = "playing";
      if (data.isCorrect) nextStatus = "won";
      else if (nextAttempts.length >= MAX_ATTEMPTS) nextStatus = "lost";

      const nextRevealedWord = data.revealedWord ?? null;

      setAttempts(nextAttempts);
      setStatus(nextStatus);
      setRevealedWord(nextRevealedWord);
      persist({ attempts: nextAttempts, status: nextStatus, revealedWord: nextRevealedWord });
    },
    [attempts, status, persist]
  );

  return { attempts, status, submitGuess, error, revealedWord };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/hooks/useWordleGame.test.ts`
Expected: PASS (both tests green).

- [ ] **Step 5: Write `GameBoard` component**

Create `app/components/GameBoard.tsx`:
```tsx
import type { LetterState } from "@/lib/game";
import type { AttemptRecord } from "@/app/hooks/useWordleGame";

const STATE_CLASSES: Record<LetterState, string> = {
  correct: "bg-green-600 text-white border-green-600",
  present: "bg-yellow-500 text-white border-yellow-500",
  absent: "bg-gray-500 text-white border-gray-500",
};

const STATE_LABELS: Record<LetterState, string> = {
  correct: "bonne position",
  present: "mauvaise position",
  absent: "absente",
};

export function GameBoard({
  attempts,
  maxAttempts,
  currentGuess,
}: {
  attempts: AttemptRecord[];
  maxAttempts: number;
  currentGuess: string;
}) {
  const rows = Array.from({ length: maxAttempts }, (_, rowIndex) => {
    if (rowIndex < attempts.length) return attempts[rowIndex];
    if (rowIndex === attempts.length) return { guess: currentGuess, result: null };
    return { guess: "", result: null };
  });

  return (
    <div className="grid gap-2" role="grid" aria-label="Plateau de jeu">
      {rows.map((row, rowIndex) => (
        <div className="grid grid-cols-5 gap-2" role="row" key={rowIndex}>
          {Array.from({ length: 5 }, (_, colIndex) => {
            const letter = row.guess[colIndex] ?? "";
            const state = row.result?.[colIndex] ?? null;
            const className = state
              ? STATE_CLASSES[state]
              : "border-gray-300 text-black";
            const label = letter
              ? `${letter.toUpperCase()}${state ? `, ${STATE_LABELS[state]}` : ""}`
              : "case vide";
            return (
              <div
                key={colIndex}
                role="gridcell"
                aria-label={label}
                className={`flex h-14 w-14 items-center justify-center border-2 text-2xl font-bold uppercase ${className}`}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write `Keyboard` component**

Create `app/components/Keyboard.tsx`:
```tsx
import type { LetterState } from "@/lib/game";

const ROWS = ["azertyuiop", "qsdfghjklm", "wxcvbn"];

const STATE_CLASSES: Record<LetterState, string> = {
  correct: "bg-green-600 text-white",
  present: "bg-yellow-500 text-white",
  absent: "bg-gray-500 text-white",
};

export function Keyboard({
  letterStates,
  onKey,
}: {
  letterStates: Record<string, LetterState>;
  onKey: (key: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {ROWS.map((row, rowIndex) => (
        <div className="flex gap-1" key={rowIndex}>
          {row.split("").map((letter) => {
            const state = letterStates[letter];
            const className = state ? STATE_CLASSES[state] : "bg-gray-200 text-black";
            return (
              <button
                key={letter}
                type="button"
                aria-label={`Lettre ${letter.toUpperCase()}`}
                className={`h-12 w-9 rounded font-bold uppercase ${className}`}
                onClick={() => onKey(letter)}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
      <div className="flex gap-1">
        <button
          type="button"
          aria-label="Effacer"
          className="h-12 rounded bg-gray-300 px-4 font-bold"
          onClick={() => onKey("Backspace")}
        >
          Effacer
        </button>
        <button
          type="button"
          aria-label="Valider"
          className="h-12 rounded bg-blue-600 px-4 font-bold text-white"
          onClick={() => onKey("Enter")}
        >
          Valider
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write the page combining everything**

Create `app/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { GameBoard } from "@/app/components/GameBoard";
import { Keyboard } from "@/app/components/Keyboard";
import { useWordleGame, computeLetterStates } from "@/app/hooks/useWordleGame";

const MAX_ATTEMPTS = 6;

export default function HomePage() {
  const { attempts, status, submitGuess, error, revealedWord } = useWordleGame();
  const [currentGuess, setCurrentGuess] = useState("");

  const handleKey = (key: string) => {
    if (status !== "playing") return;
    if (key === "Backspace") {
      setCurrentGuess((g) => g.slice(0, -1));
    } else if (key === "Enter") {
      if (currentGuess.length === 5) {
        submitGuess(currentGuess);
        setCurrentGuess("");
      }
    } else if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess((g) => g + key);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Enter") {
        handleKey(e.key);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const letterStates = computeLetterStates(attempts);

  return (
    <main className="flex flex-col items-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Wordle du jour</h1>
      <GameBoard attempts={attempts} maxAttempts={MAX_ATTEMPTS} currentGuess={currentGuess} />
      {error && (
        <p role="alert" className="font-semibold text-red-600">
          {error}
        </p>
      )}
      {status !== "playing" && (
        <div role="dialog" aria-label="Fin de partie" className="rounded border p-4 text-center">
          {status === "won" ? (
            <p>Gagné en {attempts.length} essai{attempts.length > 1 ? "s" : ""} !</p>
          ) : (
            <p>Perdu. Le mot était : {revealedWord?.toUpperCase()}</p>
          )}
          <p className="text-sm text-gray-500">Reviens demain pour un nouveau mot.</p>
        </div>
      )}
      <Keyboard letterStates={letterStates} onKey={handleKey} />
    </main>
  );
}
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx app/components app/hooks
git commit -m "feat: add game page with grid, virtual keyboard, and localStorage persistence"
```

---

## Task 7: Admin Auth Middleware & Login Page

**Files:**
- Create: `middleware.ts`
- Create: `app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `getServerSessionClient` from `lib/supabase/server.ts`, `getBrowserClient` from `lib/supabase/client.ts`.
- Produces: requests to any `/admin/*` path except `/admin/login` redirect to `/admin/login` when there is no active Supabase session.

- [ ] **Step 1: Write the middleware**

Create `middleware.ts` (project root):
```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options) {
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: Write the login page**

Create `app/admin/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/admin");
  };

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Connexion admin</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Mot de passe
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          Se connecter
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts app/admin/login
git commit -m "feat: add admin auth middleware and login page"
```

---

## Task 8: Admin CRUD API Routes

**Files:**
- Create: `app/api/admin/words/route.ts`
- Create: `app/api/admin/words/[id]/route.ts`
- Test: `app/api/admin/words/route.test.ts`

**Interfaces:**
- Consumes: `getServerSessionClient`, `getServiceRoleClient` from `lib/supabase/server.ts`; `isValidWord` from `lib/dictionary.ts`.
- Produces:
  - `GET /api/admin/words` → `200 { words: { id: string; date: string; word: string }[] }` or `401`
  - `POST /api/admin/words` body `{ date: string; word: string }` → `201 { id, date, word }`, `400` invalid input, `401` unauthenticated
  - `PATCH /api/admin/words/[id]` body `{ date?: string; word?: string }` → `200 { id, date, word }`, `400`, `401`
  - `DELETE /api/admin/words/[id]` → `204`, `401`
  - `export async function requireAdminSession(): Promise<boolean>` shared helper used by every handler above.

- [ ] **Step 1: Write the failing test**

Create `app/api/admin/words/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServerSessionClient: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { requireAdminSession } from "./route";
import { getServerSessionClient } from "@/lib/supabase/server";

describe("requireAdminSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when a session exists", async () => {
    (getServerSessionClient as any).mockReturnValue({
      auth: { getSession: async () => ({ data: { session: { user: { id: "1" } } } }) },
    });
    expect(await requireAdminSession()).toBe(true);
  });

  it("returns false when no session exists", async () => {
    (getServerSessionClient as any).mockReturnValue({
      auth: { getSession: async () => ({ data: { session: null } }) },
    });
    expect(await requireAdminSession()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/admin/words/route.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `app/api/admin/words/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSessionClient, getServiceRoleClient } from "@/lib/supabase/server";
import { isValidWord } from "@/lib/dictionary";

export async function requireAdminSession(): Promise<boolean> {
  const supabase = getServerSessionClient();
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("daily_words")
    .select("id, date, word")
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ words: data });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = body?.date;
  const word = typeof body?.word === "string" ? body.word.toLowerCase() : "";

  if (!DATE_REGEX.test(date ?? "") || !isValidWord(word)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("daily_words")
    .insert({ date, word })
    .select("id, date, word")
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/admin/words/route.test.ts`
Expected: PASS (both tests green).

- [ ] **Step 5: Write `app/api/admin/words/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { isValidWord } from "@/lib/dictionary";
import { requireAdminSession } from "../route";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const update: { date?: string; word?: string } = {};

  if (body?.date !== undefined) {
    if (!DATE_REGEX.test(body.date)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    update.date = body.date;
  }

  if (body?.word !== undefined) {
    const word = String(body.word).toLowerCase();
    if (!isValidWord(word)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    update.word = word;
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("daily_words")
    .update(update)
    .eq("id", params.id)
    .select("id, date, word")
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("daily_words").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin
git commit -m "feat: add admin CRUD API routes for daily_words"
```

---

## Task 9: Admin Dashboard Page

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/AdminWordForm.tsx`
- Create: `app/admin/AdminWordTable.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/admin/words`, `PATCH/DELETE /api/admin/words/[id]`.
- Produces: a page rendering the word table and add/edit form, calling the admin API routes via `fetch`.

- [ ] **Step 1: Write `AdminWordForm`**

Create `app/admin/AdminWordForm.tsx`:
```tsx
"use client";

import { useState } from "react";

export function AdminWordForm({ onAdded }: { onAdded: () => void }) {
  const [date, setDate] = useState("");
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, word }),
    });
    if (!res.ok) {
      setError("Date ou mot invalide (le mot doit être dans le dictionnaire).");
      return;
    }
    setDate("");
    setWord("");
    onAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="flex flex-col gap-1">
        Date
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Mot
        <input
          type="text"
          required
          maxLength={5}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="rounded border px-2 py-1 uppercase"
        />
      </label>
      <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">
        Ajouter
      </button>
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Write `AdminWordTable`**

Create `app/admin/AdminWordTable.tsx`:
```tsx
"use client";

interface WordRow {
  id: string;
  date: string;
  word: string;
}

export function AdminWordTable({
  words,
  onDeleted,
}: {
  words: WordRow[];
  onDeleted: () => void;
}) {
  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/words/${id}`, { method: "DELETE" });
    onDeleted();
  };

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr>
          <th className="border-b p-2">Date</th>
          <th className="border-b p-2">Mot</th>
          <th className="border-b p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {words.map((row) => (
          <tr key={row.id}>
            <td className="border-b p-2">{row.date}</td>
            <td className="border-b p-2 uppercase">{row.word}</td>
            <td className="border-b p-2">
              <button
                type="button"
                onClick={() => handleDelete(row.id)}
                className="text-red-600 underline"
              >
                Supprimer
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Write the admin page**

Create `app/admin/page.tsx`:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { AdminWordForm } from "./AdminWordForm";
import { AdminWordTable } from "./AdminWordTable";

interface WordRow {
  id: string;
  date: string;
  word: string;
}

export default function AdminPage() {
  const [words, setWords] = useState<WordRow[]>([]);
  const router = useRouter();

  const load = useCallback(() => {
    fetch("/api/admin/words")
      .then((res) => res.json())
      .then((data: { words: WordRow[] }) => setWords(data.words ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mots du jour</h1>
        <button type="button" onClick={handleLogout} className="text-sm underline">
          Déconnexion
        </button>
      </div>
      <AdminWordForm onAdded={load} />
      <AdminWordTable words={words} onDeleted={load} />
    </main>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, sign in at `/admin/login` with a test admin account (create one via Supabase dashboard first), add a word for today's date, confirm it shows in the table, then visit `/` and confirm guesses are evaluated against it.

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx app/admin/AdminWordForm.tsx app/admin/AdminWordTable.tsx
git commit -m "feat: add admin dashboard with word CRUD UI"
```

---

## Task 10: README & Deployment Docs

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: documentation only, no code interfaces.

- [ ] **Step 1: Write the README**

Create `README.md`:
```markdown
# Wordle quotidien

Jeu Wordle en français avec un mot différent chaque jour, et un dashboard admin pour gérer les mots.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Auth), déployé sur Vercel.

## Installation locale

1. `npm install`
2. Créer un projet sur [supabase.com](https://supabase.com).
3. Dans l'éditeur SQL du projet Supabase, exécuter le contenu de `supabase/migrations/0001_init.sql`.
4. Dans **Authentication > Users** du dashboard Supabase, créer manuellement un utilisateur admin (email + mot de passe). C'est ce compte qui se connectera sur `/admin/login`.
5. Copier `.env.local.example` vers `.env.local` et renseigner :
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Project Settings > API.
   - `SUPABASE_SERVICE_ROLE_KEY` : Project Settings > API (clé secrète, ne jamais l'exposer côté client).
6. `npm run dev` puis ouvrir `http://localhost:3000`.

## Scripts

- `npm run dev` : serveur de développement.
- `npm run build` : build de production.
- `npm run start` : sert le build de production.
- `npm run test` : lance les tests Vitest.

## Déploiement sur Vercel

1. Importer le repo dans Vercel.
2. Dans les paramètres du projet Vercel > Environment Variables, ajouter les 3 mêmes variables que dans `.env.local`.
3. Déployer. Vercel détecte automatiquement Next.js.

## Ajouter/gérer les mots du jour

Se connecter sur `/admin/login` avec le compte admin créé à l'étape 4, puis ajouter une date + un mot de 5 lettres (doit appartenir au dictionnaire de `lib/dictionary.ts`) sur `/admin`.

## Comportement de secours

Si aucun mot n'est défini pour la date du jour, ou si Supabase est indisponible, le jeu choisit automatiquement un mot du dictionnaire local de façon déterministe (même mot pour tout le monde, basé sur la date).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, deployment, and admin instructions"
```

---

## Final Verification

- [ ] Run the full test suite: `npm run test` — all tests pass.
- [ ] Run `npm run build` — succeeds with no type errors.
- [ ] Manually play a full game on `/` (win and lose paths) and confirm localStorage persistence survives a refresh.
- [ ] Manually log into `/admin`, add/edit/delete a word, confirm `/admin` redirects to `/admin/login` when logged out.
