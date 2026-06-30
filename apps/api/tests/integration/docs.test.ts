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

describe("documentation OpenAPI / Swagger", () => {
  it("expose la spec OpenAPI en JSON", async () => {
    const res = await request(app).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toContain("WordlFR");
    // quelques endpoints clés présents dans la spec
    expect(res.body.paths).toHaveProperty("/api/game/guess");
    expect(res.body.paths).toHaveProperty("/api/auth/login");
  });

  it("sert l'interface Swagger UI", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});
