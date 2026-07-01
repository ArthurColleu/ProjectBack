import { Router } from "express";
import type { Db } from "../../db/pool.js";
import { noopCache, type Cache } from "../../db/cache.js";

export function healthRoutes(db: Db, cache: Cache = noopCache): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "ok", db: true, cache: cache.backend });
    } catch {
      res.status(503).json({ status: "degraded", db: false, cache: cache.backend });
    }
  });
  return router;
}
