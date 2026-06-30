import { describe, it, expect } from "vitest";
import { evaluateGuess, dailyFallbackWord } from "./game";

describe("evaluateGuess", () => {
  it("marks all correct when guess equals target", () => {
    expect(evaluateGuess("table", "table")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ]);
  });

  it("marks absent letters not in target", () => {
    expect(evaluateGuess("zzzzz", "table")).toEqual([
      "absent", "absent", "absent", "absent", "absent",
    ]);
  });

  it("marks present for right letter wrong position", () => {
    // target "table": t-a-b-l-e
    // guess  "blate": b-l-a-t-e
    expect(evaluateGuess("blate", "table")).toEqual([
      "present", "present", "present", "present", "correct",
    ]);
  });

  it("handles duplicate letters in guess correctly", () => {
    // target "ferme" has one 'e' at index 1 and one at index 4
    // guess "eeeee" should mark only two 'e's: index1 and index4 as correct? actually exact positions
    const result = evaluateGuess("eeeee", "ferme");
    // ferme = f-e-r-m-e ; positions 1 and 4 are 'e' -> correct, others absent (no extra 'e' left)
    expect(result).toEqual(["absent", "correct", "absent", "absent", "correct"]);
  });

  it("handles duplicate letters in target with single matching letter in guess", () => {
    // target "ferme" has two 'e's, guess "lever" has 'e' at index1 (present, since target's e at idx1 is consumed by guess idx? let's verify directly)
    // guess: l-e-v-e-r, target: f-e-r-m-e
    // pass1 exact matches: guess[1]='e' vs target[1]='e' -> correct. others no exact match.
    // pass2 remaining target letters pool (excluding consumed index1): f,r,m,e(idx4)
    // guess[0]='l' not in pool -> absent
    // guess[2]='v' not in pool -> absent
    // guess[3]='e' -> pool has 'e'(idx4) -> present, consume it
    // guess[4]='r' -> pool has 'r' -> present
    expect(evaluateGuess("lever", "ferme")).toEqual([
      "absent", "correct", "absent", "present", "present",
    ]);
  });
});

describe("dailyFallbackWord", () => {
  const dict = ["alpha", "bravo", "charl", "delta", "ephes"];

  it("is deterministic for the same date", () => {
    const a = dailyFallbackWord("2026-06-29", dict);
    const b = dailyFallbackWord("2026-06-29", dict);
    expect(a).toBe(b);
  });

  it("returns a word from the dictionary", () => {
    const word = dailyFallbackWord("2026-01-01", dict);
    expect(dict).toContain(word);
  });

  it("differs across different dates (not always identical)", () => {
    const results = new Set(
      ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"].map((d) =>
        dailyFallbackWord(d, dict)
      )
    );
    expect(results.size).toBeGreaterThan(1);
  });
});
