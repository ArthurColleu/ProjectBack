import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";
import type { Db } from "./db/pool.js";
import { env } from "./config/env.js";
import { openapiSpec } from "./docs/openapi.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { gameRoutes } from "./modules/games/games.routes.js";
import { statsRoutes } from "./modules/stats/stats.routes.js";
import { wordsRoutes } from "./modules/words/words.routes.js";

export function createApp(db: Db) {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/health", healthRoutes(db));
  app.use("/api/auth", authRoutes(db));
  app.use("/api/game", gameRoutes(db));
  app.use("/api/stats", statsRoutes(db));
  app.use("/api/admin/words", wordsRoutes(db));

  // Documentation interactive de l'API (Swagger UI) + spec brute en JSON.
  // Montée AVANT le fallback SPA pour ne pas être avalée par le catch-all "*".
  app.get("/api/openapi.json", (_req, res) => res.json(openapiSpec));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: "WordlFR — API" }));

  // In production, Express serves the Vite build and handles SPA routing
  if (env.NODE_ENV === "production") {
    const __dir = fileURLToPath(new URL(".", import.meta.url));
    const webDist = path.resolve(__dir, "../../web/dist");
    app.use(express.static(webDist));
    app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
