import { Router } from "express";
import type { Db } from "../../db/pool.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { makeStatsRepository } from "./stats.repository.js";
import { makeStatsService } from "./stats.service.js";
import { makeStatsController } from "./stats.controller.js";

export function statsRoutes(db: Db): Router {
  const router = Router();
  const repo = makeStatsRepository(db);
  const service = makeStatsService(repo);
  const ctrl = makeStatsController(service);

  router.use(authenticate);
  router.get("/", asyncHandler(ctrl.getStats.bind(ctrl)));

  return router;
}
