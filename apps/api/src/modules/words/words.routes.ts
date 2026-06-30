import { Router } from "express";
import type { Db } from "../../db/pool.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { makeWordsRepository } from "./words.repository.js";
import { makeWordsService } from "./words.service.js";
import { makeWordsController } from "./words.controller.js";

export function wordsRoutes(db: Db): Router {
  const router = Router();
  const repo = makeWordsRepository(db);
  const service = makeWordsService(repo);
  const ctrl = makeWordsController(service);

  router.use(authenticate, authorize("admin"));
  router.get("/", asyncHandler(ctrl.listWords.bind(ctrl)));
  router.post("/", asyncHandler(ctrl.createWord.bind(ctrl)));
  router.patch("/:id", asyncHandler(ctrl.updateWord.bind(ctrl)));
  router.delete("/:id", asyncHandler(ctrl.deleteWord.bind(ctrl)));

  return router;
}
