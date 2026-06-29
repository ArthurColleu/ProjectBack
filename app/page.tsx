"use client";

import { useEffect, useState } from "react";
import { GameBoard } from "@/app/components/GameBoard";
import { Keyboard } from "@/app/components/Keyboard";
import { useWordleGame, computeLetterStates } from "@/app/hooks/useWordleGame";

const MAX_ATTEMPTS = 6;

export default function HomePage() {
  const { attempts, status, submitGuess, error } = useWordleGame();
  const [currentGuess, setCurrentGuess] = useState("");

  const handleKey = (key: string) => {
    if (status !== "playing") return;
    if (key === "Backspace") {
      setCurrentGuess((g) => g.slice(0, -1));
    } else if (key === "Enter") {
      if (currentGuess.length === 5) {
        submitGuess(currentGuess);
        setCurrentGuess("");
      }
    } else if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess((g) => g + key);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Enter") {
        handleKey(e.key);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const letterStates = computeLetterStates(attempts);

  return (
    <main className="flex flex-col items-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Wordle du jour</h1>
      <GameBoard attempts={attempts} maxAttempts={MAX_ATTEMPTS} currentGuess={currentGuess} />
      {error && (
        <p role="alert" className="font-semibold text-red-600">
          {error}
        </p>
      )}
      {status !== "playing" && (
        <div role="dialog" aria-label="Fin de partie" className="rounded border p-4 text-center">
          {status === "won" ? (
            <p>Gagné en {attempts.length} essai{attempts.length > 1 ? "s" : ""} !</p>
          ) : (
            <p>Perdu ! Tente ta chance demain.</p>
          )}
          <p className="text-sm text-gray-500">Reviens demain pour un nouveau mot.</p>
        </div>
      )}
      <Keyboard letterStates={letterStates} onKey={handleKey} />
    </main>
  );
}
