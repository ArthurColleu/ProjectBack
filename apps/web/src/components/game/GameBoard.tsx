import type { LetterState } from "../../api/client";
import { GameTile } from "./GameTile";

interface Attempt {
  guess: string;
  result: LetterState[];
}

interface Props {
  attempts: Attempt[];
  currentGuess: string;
  maxAttempts: number;
  shake?: boolean;
  wonRow?: number; // row index that triggered win
}

export function GameBoard({ attempts, currentGuess, maxAttempts, shake = false, wonRow }: Props) {
  const rows: Array<{ letters: string[]; states: (LetterState | "empty" | "current")[] }> = [];

  for (let i = 0; i < maxAttempts; i++) {
    if (i < attempts.length) {
      const a = attempts[i];
      rows.push({
        letters: a.guess.split(""),
        states: a.result as (LetterState | "empty")[],
      });
    } else if (i === attempts.length) {
      const cur = currentGuess.split("");
      rows.push({
        letters: Array.from({ length: 5 }, (_, j) => cur[j] ?? ""),
        states: Array.from({ length: 5 }, (_, j) => (cur[j] ? "current" : "empty")) as ("current" | "empty")[],
      });
    } else {
      rows.push({ letters: ["", "", "", "", ""], states: ["empty", "empty", "empty", "empty", "empty"] });
    }
  }

  return (
    <section aria-label="Grille de jeu" className="flex flex-col items-center gap-1.5 my-4">
      {rows.map((row, ri) => {
        const isRevealed = ri < attempts.length;
        const isCurrentShaking = ri === attempts.length && shake;
        const isWinRow = ri === wonRow;
        return (
          <div
            key={ri}
            className={`flex gap-1.5 ${isCurrentShaking ? "shake" : ""}`}
            role="row"
          >
            {row.letters.map((letter, ci) => (
              <GameTile
                key={ci}
                letter={letter}
                state={row.states[ci]}
                reveal={isRevealed}
                delay={ci * 300}
                bounce={isWinRow && isRevealed}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
