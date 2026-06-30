import { describe, it, expect } from "vitest";
import { DICTIONARY, isValidWord } from "./dictionary";
import { GUESSES, GUESSES_SET } from "./guesses";

describe("dictionary (réponses)", () => {
  it("only 5-letter lowercase unaccented words", () => {
    expect(DICTIONARY.length).toBeGreaterThan(100);
    for (const w of DICTIONARY) expect(w).toMatch(/^[a-z]{5}$/);
  });
  it("no duplicates", () => {
    expect(new Set(DICTIONARY).size).toBe(DICTIONARY.length);
  });
  it("validates case-insensitively", () => {
    expect(isValidWord("table")).toBe(true);
    expect(isValidWord("TABLE")).toBe(true);
    expect(isValidWord("zzzzz")).toBe(false);
  });
});

describe("guesses (essais acceptés)", () => {
  it("contient bien plus de mots que les réponses (~comme le vrai Wordle)", () => {
    expect(GUESSES.length).toBeGreaterThan(2000);
    expect(GUESSES.length).toBeGreaterThan(DICTIONARY.length);
  });
  it("only 5-letter lowercase unaccented words, no duplicates", () => {
    for (const w of GUESSES) expect(w).toMatch(/^[a-z]{5}$/);
    expect(GUESSES_SET.size).toBe(GUESSES.length);
  });
  it("toute réponse possible est un essai valide (invariant clé)", () => {
    for (const answer of DICTIONARY) {
      expect(isValidWord(answer)).toBe(true);
    }
  });
});
