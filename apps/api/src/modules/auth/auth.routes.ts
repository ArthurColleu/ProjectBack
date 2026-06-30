import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/pool.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { loginRateLimit } from "../../middlewares/rateLimit.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { makeAuthRepository } from "./auth.repository.js";
import { makeAuthService } from "./auth.service.js";
import { makeAuthController } from "./auth.controller.js";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function authRoutes(db: Db): Router {
  const controller = makeAuthController(makeAuthService(makeAuthRepository(db)));
  const router = Router();
  router.post("/register", validate(credentials), asyncHandler(controller.register));
  router.post("/login", loginRateLimit, validate(credentials), asyncHandler(controller.login));
  router.post("/logout", asyncHandler(controller.logout));
  router.get("/me", authenticate, asyncHandler(controller.me));
  router.delete("/me", authenticate, asyncHandler(controller.deleteMe));
  return router;
}
