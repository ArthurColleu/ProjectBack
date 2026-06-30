import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { makeTestDb } from "../helpers/testDb";
import type { Db } from "../../src/db/pool";

let app: ReturnType<typeof createApp>;
let db: Db;

const admin = { email: "admin@wordle.local", password: "adminpass1" };
const player = { email: "player@test.fr", password: "playerpass1" };

async function makeAdmin(app: ReturnType<typeof createApp>, db: Db) {
  await request(app).post("/api/auth/register").send(admin);
  // Promote to admin directly in DB
  await db.query("UPDATE users SET role = 'admin' WHERE email = $1", [admin.email]);
}

beforeEach(async () => {
  db = await makeTestDb();
  app = createApp(db);
});

describe("admin words CRUD /api/admin/words", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/words");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin player", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(player);
    const res = await agent.get("/api/admin/words");
    expect(res.status).toBe(403);
  });

  it("admin can list, create, update and delete words", async () => {
    await makeAdmin(app, db);
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(admin);

    // List (empty)
    const list0 = await agent.get("/api/admin/words");
    expect(list0.status).toBe(200);
    expect(list0.body.words).toHaveLength(0);

    // Create
    const created = await agent.post("/api/admin/words").send({ date: "2026-07-01", word: "table" });
    expect(created.status).toBe(201);
    expect(created.body.word).toBe("table");
    const id = created.body.id as number;

    // List — now 1 item
    const list1 = await agent.get("/api/admin/words");
    expect(list1.body.words).toHaveLength(1);

    // Update word
    const updated = await agent.patch(`/api/admin/words/${id}`).send({ word: "porte" });
    expect(updated.status).toBe(200);
    expect(updated.body.word).toBe("porte");

    // Delete
    const del = await agent.delete(`/api/admin/words/${id}`);
    expect(del.status).toBe(204);

    // List — empty again
    const list2 = await agent.get("/api/admin/words");
    expect(list2.body.words).toHaveLength(0);
  });

  it("rejects duplicate date with 409", async () => {
    await makeAdmin(app, db);
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(admin);

    await agent.post("/api/admin/words").send({ date: "2026-07-01", word: "table" });
    const dup = await agent.post("/api/admin/words").send({ date: "2026-07-01", word: "porte" });
    expect(dup.status).toBe(409);
  });

  it("rejects word longer or shorter than 5 with 400", async () => {
    await makeAdmin(app, db);
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(admin);

    const res = await agent.post("/api/admin/words").send({ date: "2026-07-02", word: "mot" });
    expect(res.status).toBe(400);
  });
});
