import type { Db } from "../../db/pool.js";
import type { GameRecord } from "../../domain/stats.js";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export function makeStatsRepository(db: Db) {
  return {
    async getPlayerGames(userId: number): Promise<GameRecord[]> {
      const { rows } = await db.query<{
        status: "won" | "lost";
        guess_count: number;
        date: unknown;
      }>(
        `SELECT g.status,
                COUNT(gu.id)::int AS guess_count,
                dw.date AS date
         FROM games g
         JOIN daily_words dw ON dw.id = g.daily_word_id
         LEFT JOIN guesses gu ON gu.game_id = g.id
         WHERE g.user_id = $1
           AND g.status IN ('won', 'lost')
         GROUP BY g.id, g.status, dw.date
         ORDER BY dw.date ASC`,
        [userId],
      );
      return rows.map((r) => ({
        status: r.status,
        guessCount: r.guess_count,
        date: toDateStr(r.date),
      }));
    },
  };
}

export type StatsRepository = ReturnType<typeof makeStatsRepository>;
