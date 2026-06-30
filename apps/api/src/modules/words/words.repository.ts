import type { Db } from "../../db/pool.js";

export interface DailyWord {
  id: number;
  date: string;
  word: string;
  created_by: number | null;
  created_at: string;
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function mapRow(r: Record<string, unknown>): DailyWord {
  return {
    id: r.id as number,
    date: toDateStr(r.date),
    word: r.word as string,
    created_by: r.created_by as number | null,
    created_at: r.created_at as string,
  };
}

export function makeWordsRepository(db: Db) {
  return {
    async findAll(): Promise<DailyWord[]> {
      const { rows } = await db.query<Record<string, unknown>>(
        "SELECT id, date, word, created_by, created_at FROM daily_words ORDER BY date DESC",
      );
      return rows.map(mapRow);
    },

    async findById(id: number): Promise<DailyWord | null> {
      const { rows } = await db.query<Record<string, unknown>>(
        "SELECT id, date, word, created_by, created_at FROM daily_words WHERE id = $1",
        [id],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async insert(date: string, word: string, createdBy: number): Promise<DailyWord> {
      const { rows } = await db.query<Record<string, unknown>>(
        `INSERT INTO daily_words (date, word, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, date, word, created_by, created_at`,
        [date, word, createdBy],
      );
      return mapRow(rows[0]);
    },

    async update(id: number, fields: { date?: string; word?: string }): Promise<DailyWord | null> {
      const sets: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (fields.date !== undefined) { sets.push(`date = $${idx++}`); values.push(fields.date); }
      if (fields.word !== undefined) { sets.push(`word = $${idx++}`); values.push(fields.word); }
      if (sets.length === 0) return this.findById(id);
      values.push(id);
      const { rows } = await db.query<Record<string, unknown>>(
        `UPDATE daily_words SET ${sets.join(", ")} WHERE id = $${idx}
         RETURNING id, date, word, created_by, created_at`,
        values,
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async delete(id: number): Promise<boolean> {
      const { rowCount } = await db.query(
        "DELETE FROM daily_words WHERE id = $1",
        [id],
      );
      return rowCount > 0;
    },
  };
}

export type WordsRepository = ReturnType<typeof makeWordsRepository>;
