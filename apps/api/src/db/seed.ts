import type { Db } from "./pool.js";
import { hashPassword } from "../lib/password.js";
import { env } from "../config/env.js";
import { DICTIONARY } from "../domain/dictionary.js";
import { dailyFallbackWord } from "../domain/fallbackWord.js";

export async function seed(db: Db): Promise<void> {
  const hash = await hashPassword(env.ADMIN_PASSWORD);
  await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [env.ADMIN_EMAIL, hash],
  );

  // Seed 7 days of words around today as examples
  const today = new Date();
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const word = dailyFallbackWord(date, DICTIONARY);
    await db.query(
      `INSERT INTO daily_words (date, word, created_by)
       VALUES ($1, $2, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
       ON CONFLICT (date) DO NOTHING`,
      [date, word],
    );
  }
}
