import { useCallback, useEffect } from "react";
import type { LetterState } from "../../api/client";

const AZERTY_ROWS = [
  ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"],
  ["ENTRÉE", "w", "x", "c", "v", "b", "n", "←"],
];

interface Props {
  letterStates: Record<string, LetterState>;
  onKey: (key: string) => void;
  disabled?: boolean;
}

function keyColor(state: LetterState | undefined): string {
  if (state === "correct") return "bg-emerald-500 text-white border-emerald-500";
  if (state === "present") return "bg-amber-400 text-slate-900 border-amber-400";
  if (state === "absent") return "bg-slate-700 text-slate-400 border-slate-700";
  return "bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700 active:bg-slate-600";
}

export function Keyboard({ letterStates, onKey, disabled }: Props) {
  const handlePhysical = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter") onKey("ENTRÉE");
      else if (e.key === "Backspace") onKey("←");
      else if (/^[a-zA-Z]$/.test(e.key)) onKey(e.key.toLowerCase());
    },
    [onKey, disabled],
  );

  useEffect(() => {
    window.addEventListener("keydown", handlePhysical);
    return () => window.removeEventListener("keydown", handlePhysical);
  }, [handlePhysical]);

  return (
    <section aria-label="Clavier virtuel" className="flex flex-col items-center gap-1.5 pb-4">
      {AZERTY_ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1">
          {row.map((key) => {
            const isAction = key === "ENTRÉE" || key === "←";
            const state = isAction ? undefined : letterStates[key];
            return (
              <button
                key={key}
                type="button"
                aria-label={key === "←" ? "Supprimer" : key === "ENTRÉE" ? "Valider" : `Lettre ${key.toUpperCase()}`}
                disabled={disabled}
                onClick={() => !disabled && onKey(key)}
                className={`
                  h-14 rounded border font-bold uppercase text-sm
                  transition-all duration-200 select-none cursor-pointer
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isAction ? "px-2 min-w-[52px] text-xs" : "w-9"}
                  ${keyColor(state)}
                `}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}
