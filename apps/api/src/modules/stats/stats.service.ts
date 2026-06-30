import { computeStats } from "../../domain/stats.js";
import type { StatsRepository } from "./stats.repository.js";

export function makeStatsService(repo: StatsRepository) {
  return {
    async getStats(userId: number) {
      const records = await repo.getPlayerGames(userId);
      return computeStats(records);
    },
  };
}
