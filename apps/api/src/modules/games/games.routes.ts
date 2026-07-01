import { Router } from "express";
import type { Db } from "../../db/pool.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { noopCache, type Cache } from "../../db/cache.js";
import { makeGamesRepository } from "./games.repository.js";
import { makeGamesService } from "./games.service.js";
import { makeGamesController } from "./games.controller.js";

export function gameRoutes(db: Db, cache: Cache = noopCache): Router {
  const router = Router();
  const repo = makeGamesRepository(db);
  const service = makeGamesService(repo, { cache });
  const ctrl = makeGamesController(service);

  router.use(authenticate);
  router.get("/today", asyncHandler(ctrl.getToday.bind(ctrl)));
  router.post("/guess", asyncHandler(ctrl.submitGuess.bind(ctrl)));

  return router;
}
