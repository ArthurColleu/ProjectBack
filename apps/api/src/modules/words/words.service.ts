import { z } from "zod";
import { HttpError } from "../../middlewares/errorHandler.js";
import type { WordsRepository } from "./words.repository.js";

const wordSchema = z.string().length(5).regex(/^[a-z]+$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function makeWordsService(repo: WordsRepository) {
  return {
    async listWords() {
      return repo.findAll();
    },

    async addWord(date: string, word: string, adminId: number) {
      if (!dateSchema.safeParse(date).success) throw new HttpError(400, "invalid_date");
      if (!wordSchema.safeParse(word.toLowerCase()).success) throw new HttpError(400, "invalid_word");
      try {
        return await repo.insert(date, word.toLowerCase(), adminId);
      } catch (e: unknown) {
        if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
          throw new HttpError(409, "date_already_has_word");
        }
        throw e;
      }
    },

    async updateWord(id: number, fields: { date?: string; word?: string }) {
      if (fields.date !== undefined && !dateSchema.safeParse(fields.date).success) {
        throw new HttpError(400, "invalid_date");
      }
      if (fields.word !== undefined && !wordSchema.safeParse(fields.word.toLowerCase()).success) {
        throw new HttpError(400, "invalid_word");
      }
      const normalized = {
        date: fields.date,
        word: fields.word?.toLowerCase(),
      };
      const updated = await repo.update(id, normalized);
      if (!updated) throw new HttpError(404, "not_found");
      return updated;
    },

    async deleteWord(id: number) {
      const deleted = await repo.delete(id);
      if (!deleted) throw new HttpError(404, "not_found");
    },
  };
}
