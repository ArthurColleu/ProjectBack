import { evaluateGuess } from "../../domain/evaluateGuess.js";
import { isValidWord, DICTIONARY } from "../../domain/dictionary.js";
import { dailyFallbackWord } from "../../domain/fallbackWord.js";
import { todayIso } from "../../lib/clock.js";
import { HttpError } from "../../middlewares/errorHandler.js";
import type { GamesRepository, GameStatus } from "./games.repository.js";

const MAX_ATTEMPTS = 6;

export interface GameState {
  status: GameStatus;
  maxAttempts: typeof MAX_ATTEMPTS;
  attempts: { guess: string; result: import("../../domain/evaluateGuess.js").LetterState[] }[];
}

export interface GuessResult {
  result: import("../../domain/evaluateGuess.js").LetterState[];
  status: GameStatus;
}

export function makeGamesService(
  repo: GamesRepository,
  deps: { today?: () => string } = {},
) {
  const today = deps.today ?? todayIso;

  async function ensureWordAndGame(userId: number) {
    const date = today();
    let word = await repo.findWordByDate(date);
    if (!word) {
      const fallback = dailyFallbackWord(date, DICTIONARY);
      word = await repo.insertDailyWord(date, fallback, null);
    }
    let game = await repo.findGame(userId, word.id);
    if (!game) {
      game = await repo.createGame(userId, word.id);
    }
    return { word, game };
  }

  return {
    async getToday(userId: number): Promise<GameState> {
      const { game } = await ensureWordAndGame(userId);
      const attempts = await repo.listGuesses(game.id);
      return { status: game.status, maxAttempts: MAX_ATTEMPTS, attempts };
    },

    async submitGuess(userId: number, guess: string): Promise<GuessResult> {
      const normalized = guess.toLowerCase().trim();

      if (!isValidWord(normalized)) {
        throw new HttpError(400, "invalid_word");
      }

      const { word, game } = await ensureWordAndGame(userId);

      if (game.status !== "in_progress") {
        throw new HttpError(409, "game_already_finished");
      }

      const count = await repo.countGuesses(game.id);
      if (count >= MAX_ATTEMPTS) {
        throw new HttpError(409, "max_attempts_reached");
      }

      const result = evaluateGuess(normalized, word.word);
      const attemptNumber = count + 1;
      await repo.insertGuess(game.id, attemptNumber, normalized, result);

      const isCorrect = result.every((s) => s === "correct");
      const isLast = attemptNumber >= MAX_ATTEMPTS;

      let status: GameStatus = "in_progress";
      if (isCorrect) status = "won";
      else if (isLast) status = "lost";

      if (status !== "in_progress") {
        await repo.updateGameStatus(game.id, status);
      }

      return { result, status };
    },
  };
}

export type GamesService = ReturnType<typeof makeGamesService>;
