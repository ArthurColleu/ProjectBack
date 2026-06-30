import type { Request, Response } from "express";
import type { makeStatsService } from "./stats.service.js";

type StatsService = ReturnType<typeof makeStatsService>;

export function makeStatsController(service: StatsService) {
  return {
    async getStats(req: Request, res: Response) {
      const userId = req.user!.id;
      const stats = await service.getStats(userId);
      res.json(stats);
    },
  };
}
