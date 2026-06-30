import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { makeTestDb } from "../helpers/testDb";
import type { Db } from "../../src/db/pool";

let app: ReturnType<typeof createApp>;
let db: Db;

const creds = { email: "stats@test.fr", password: "motdepasse1" };

beforeEach(async () => {
  db = await makeTestDb();
  app = createApp(db);
});

describe("GET /api/stats", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(401);
  });

  it("returns empty stats for a new player", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    const res = await agent.get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.gamesPlayed).toBe(0);
    expect(res.body.wins).toBe(0);
    expect(res.body.winRate).toBe(0);
    expect(res.body.currentStreak).toBe(0);
    expect(res.body.maxStreak).toBe(0);
    expect(res.body.guessDistribution).toBeDefined();
  });

  it("reflects a win in stats after playing", async () => {
    // Seed a known word
    const { makeGamesRepository } = await import("../../src/modules/games/games.repository");
    const repo = makeGamesRepository(db);
    const today = new Date().toISOString().slice(0, 10);
    await repo.insertDailyWord(today, "table", null);

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    await agent.post("/api/game/guess").send({ guess: "table" });

    const res = await agent.get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.gamesPlayed).toBe(1);
    expect(res.body.wins).toBe(1);
    expect(res.body.winRate).toBe(100);
    expect(res.body.currentStreak).toBe(1);
    expect(res.body.guessDistribution["1"]).toBe(1);
  });
});
