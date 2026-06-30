import type { LetterState } from "@/lib/game";
import type { AttemptRecord } from "@/app/hooks/useWordleGame";

const STATE_CLASSES: Record<LetterState, string> = {
  correct: "bg-green-600 text-white border-green-600",
  present: "bg-yellow-500 text-white border-yellow-500",
  absent: "bg-gray-500 text-white border-gray-500",
};

const STATE_LABELS: Record<LetterState, string> = {
  correct: "bonne position",
  present: "mauvaise position",
  absent: "absente",
};

export function GameBoard({
  attempts,
  maxAttempts,
  currentGuess,
}: {
  attempts: AttemptRecord[];
  maxAttempts: number;
  currentGuess: string;
}) {
  const rows = Array.from({ length: maxAttempts }, (_, rowIndex) => {
    if (rowIndex < attempts.length) return attempts[rowIndex];
    if (rowIndex === attempts.length) return { guess: currentGuess, result: null };
    return { guess: "", result: null };
  });

  return (
    <div className="grid gap-2" role="grid" aria-label="Plateau de jeu">
      {rows.map((row, rowIndex) => (
        <div className="grid grid-cols-5 gap-2" role="row" key={rowIndex}>
          {Array.from({ length: 5 }, (_, colIndex) => {
            const letter = row.guess[colIndex] ?? "";
            const state = row.result?.[colIndex] ?? null;
            const className = state
              ? STATE_CLASSES[state]
              : "border-gray-300 text-black";
            const label = letter
              ? `${letter.toUpperCase()}${state ? `, ${STATE_LABELS[state]}` : ""}`
              : "case vide";
            return (
              <div
                key={colIndex}
                role="gridcell"
                aria-label={label}
                className={`flex h-14 w-14 items-center justify-center border-2 text-2xl font-bold uppercase ${className}`}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
