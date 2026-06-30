import type { Request, Response } from "express";
import { z } from "zod";
import type { GamesService } from "./games.service.js";
import { HttpError } from "../../middlewares/errorHandler.js";

const guessSchema = z.object({
  guess: z.string().length(5),
});

export function makeGamesController(service: GamesService) {
  return {
    async getToday(req: Request, res: Response) {
      const userId = req.user!.id;
      const state = await service.getToday(userId);
      res.json(state);
    },

    async submitGuess(req: Request, res: Response) {
      const parsed = guessSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, "invalid_input");
      }
      const userId = req.user!.id;
      const result = await service.submitGuess(userId, parsed.data.guess);
      res.json(result);
    },
  };
}
