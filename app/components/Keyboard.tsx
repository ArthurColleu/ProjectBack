import type { LetterState } from "@/lib/game";

const ROWS = ["azertyuiop", "qsdfghjklm", "wxcvbn"];

const STATE_CLASSES: Record<LetterState, string> = {
  correct: "bg-green-600 text-white",
  present: "bg-yellow-500 text-white",
  absent: "bg-gray-500 text-white",
};

export function Keyboard({
  letterStates,
  onKey,
}: {
  letterStates: Record<string, LetterState>;
  onKey: (key: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {ROWS.map((row, rowIndex) => (
        <div className="flex gap-1" key={rowIndex}>
          {row.split("").map((letter) => {
            const state = letterStates[letter];
            const className = state ? STATE_CLASSES[state] : "bg-gray-200 text-black";
            return (
              <button
                key={letter}
                type="button"
                aria-label={`Lettre ${letter.toUpperCase()}`}
                className={`h-12 w-9 rounded font-bold uppercase ${className}`}
                onClick={() => onKey(letter)}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
      <div className="flex gap-1">
        <button
          type="button"
          aria-label="Effacer"
          className="h-12 rounded bg-gray-300 px-4 font-bold"
          onClick={() => onKey("Backspace")}
        >
          Effacer
        </button>
        <button
          type="button"
          aria-label="Valider"
          className="h-12 rounded bg-blue-600 px-4 font-bold text-white"
          onClick={() => onKey("Enter")}
        >
          Valider
        </button>
      </div>
    </div>
  );
}
