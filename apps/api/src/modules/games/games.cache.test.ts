import { describe, it, expect, vi } from "vitest";
import { makeGamesService } from "./games.service";
import { MemoryCache } from "../../db/cache";

function fakeRepo() {
  return {
    findWordByDate: vi.fn(async () => ({ id: 1, word: "table", date: "2026-07-02" })),
    insertDailyWord: vi.fn(async () => ({ id: 1, word: "table", date: "2026-07-02" })),
    findGame: vi.fn(async () => ({ id: 10, status: "in_progress" as const })),
    createGame: vi.fn(async () => ({ id: 10, status: "in_progress" as const })),
    listGuesses: vi.fn(async () => []),
    countGuesses: vi.fn(async () => 0),
    insertGuess: vi.fn(async () => {}),
    updateGameStatus: vi.fn(async () => {}),
  };
}

describe("games service — cache NoSQL du mot du jour", () => {
  it("ne lit le mot en BDD qu'une seule fois (2e appel servi par le cache)", async () => {
    const repo = fakeRepo();
    const cache = new MemoryCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = makeGamesService(repo as any, { cache, today: () => "2026-07-02" });

    await svc.getToday(1);
    await svc.getToday(1);

    // 2e appel = cache hit → aucun nouvel accès à la BDD SQL pour le mot
    expect(repo.findWordByDate).toHaveBeenCalledTimes(1);
  });

  it("sans cache (noop), la BDD est interrogée à chaque appel", async () => {
    const repo = fakeRepo();
    const svc = makeGamesService(repo as any, { today: () => "2026-07-02" });

    await svc.getToday(1);
    await svc.getToday(1);

    expect(repo.findWordByDate).toHaveBeenCalledTimes(2);
  });
});
