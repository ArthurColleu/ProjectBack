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
  const [bounceActive, setBounceActive] = useState(false);

  useEffect(() => {
    if (!reveal) return;
    const t1 = setTimeout(() => setFlipped(true), delay);
    const t2 = setTimeout(() => setShowBack(true), delay + 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reveal, delay]);

  // Rebond de victoire : déclenché APRÈS le retournement de la tuile, et porté
  // par un élément distinct de celui qui a `perspective` (sinon le transform
  // casse le rendu 3D et la face verte ne s'affiche pas).
  useEffect(() => {
    if (!bounce) { setBounceActive(false); return; }
    const t = setTimeout(() => setBounceActive(true), delay + 500);
    return () => clearTimeout(t);
  }, [bounce, delay]);

  const frontClass = stateStyles["empty"];
  const backClass = stateStyles[state] ?? stateStyles["empty"];

  return (
    <div
      className={`tile-bounce w-14 h-14 sm:w-16 sm:h-16 ${bounceActive ? "bounce" : ""}`}
      aria-hidden="true"
    >
      <div className="tile-container">
        <div className={`tile-inner ${flipped ? "flipped" : ""}`}>
          <div className={`tile-front border-2 uppercase select-none ${frontClass}`}>
            {letter}
          </div>
          <div className={`tile-back border-2 uppercase select-none transition-colors ${showBack ? backClass : frontClass}`}>
            {letter}
          </div>
        </div>
      </div>
    </div>
  );
}
