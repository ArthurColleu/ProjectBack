import { useEffect, useState } from "react";
import type { LetterState } from "../../api/client";

interface Props {
  letter: string;
  state: LetterState | "empty" | "current";
  reveal?: boolean;
  delay?: number;
  bounce?: boolean;
}

const stateStyles: Record<string, string> = {
  correct: "bg-emerald-500 border-emerald-500 text-white",
  present: "bg-amber-400 border-amber-400 text-slate-900",
  absent:  "bg-slate-600 border-slate-600 text-white",
  empty:   "bg-transparent border-slate-700 text-slate-100",
  current: "bg-transparent border-indigo-400 text-slate-100 scale-105",
};

export function GameTile({ letter, state, reveal = false, delay = 0, bounce = false }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (!reveal) return;
    const t1 = setTimeout(() => setFlipped(true), delay);
    const t2 = setTimeout(() => setShowBack(true), delay + 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reveal, delay]);

  const frontClass = stateStyles["empty"];
  const backClass = stateStyles[state] ?? stateStyles["empty"];

  return (
    <div
      className={`tile-container w-14 h-14 sm:w-16 sm:h-16 ${bounce ? "bounce" : ""}`}
      aria-hidden="true"
    >
      <div className={`tile-inner ${flipped ? "flipped" : ""}`}>
        <div className={`tile-front border-2 uppercase select-none ${frontClass}`}>
          {letter}
        </div>
        <div className={`tile-back border-2 uppercase select-none transition-colors ${showBack ? backClass : frontClass}`}>
          {letter}
        </div>
      </div>
    </div>
  );
}
