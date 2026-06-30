import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../../middlewares/errorHandler.js";
import type { makeWordsService } from "./words.service.js";

type WordsService = ReturnType<typeof makeWordsService>;

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  word: z.string().length(5),
});
const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  word: z.string().length(5).optional(),
});

export function makeWordsController(service: WordsService) {
  return {
    async listWords(_req: Request, res: Response) {
      const words = await service.listWords();
      res.json({ words });
    },

    async createWord(req: Request, res: Response) {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "invalid_input");
      const adminId = req.user!.id;
      const word = await service.addWord(parsed.data.date, parsed.data.word, adminId);
      res.status(201).json(word);
    },

    async updateWord(req: Request, res: Response) {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "invalid_id");
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "invalid_input");
      const word = await service.updateWord(id, parsed.data);
      res.json(word);
    },

    async deleteWord(req: Request, res: Response) {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "invalid_id");
      await service.deleteWord(id);
      res.status(204).end();
    },
  };
}
