import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import type { Db } from "./db/pool.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { gameRoutes } from "./modules/games/games.routes.js";
import { statsRoutes } from "./modules/stats/stats.routes.js";
import { wordsRoutes } from "./modules/words/words.routes.js";

export function createApp(db: Db) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/health", healthRoutes(db));
  app.use("/api/auth", authRoutes(db));
  app.use("/api/game", gameRoutes(db));
  app.use("/api/stats", statsRoutes(db));
  app.use("/api/admin/words", wordsRoutes(db));

  app.use(errorHandler);
  return app;
}
