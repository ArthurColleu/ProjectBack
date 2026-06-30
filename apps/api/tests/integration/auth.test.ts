import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { makeTestDb } from "../helpers/testDb";
import type { Db } from "../../src/db/pool";

let app: ReturnType<typeof createApp>;
let db: Db;

beforeEach(async () => {
  db = await makeTestDb();
  app = createApp(db);
});

describe("auth API", () => {
  const creds = { email: "joueur@test.fr", password: "motdepasse1" };

  it("registers a user, sets a cookie, returns the public user (no hash)", async () => {
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: creds.email, role: "player" });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/token=/);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
  });

  it("rejects duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(creds);
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(409);
  });

  it("rejects invalid input with 400", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "x", password: "short" });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials, 401 with wrong password", async () => {
    await request(app).post("/api/auth/register").send(creds);
    const ok = await request(app).post("/api/auth/login").send(creds);
    expect(ok.status).toBe(200);
    const bad = await request(app).post("/api/auth/login").send({ ...creds, password: "wrongpass1" });
    expect(bad.status).toBe(401);
  });

  it("GET /me requires the cookie", async () => {
    const anon = await request(app).get("/api/auth/me");
    expect(anon.status).toBe(401);

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(creds.email);
  });

  it("deletes the account (RGPD) and then /me is 401", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    const del = await agent.delete("/api/auth/me");
    expect(del.status).toBe(204);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });

  it("health endpoint reports db ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: true });
  });
});
