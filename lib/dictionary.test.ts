import { describe, it, expect } from "vitest";
import { DICTIONARY, isValidWord } from "./dictionary";

describe("dictionary", () => {
  it("contains only 5-letter lowercase unaccented words", () => {
    expect(DICTIONARY.length).toBeGreaterThan(100);
    for (const word of DICTIONARY) {
      expect(word).toMatch(/^[a-z]{5}$/);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(DICTIONARY).size).toBe(DICTIONARY.length);
  });

  it("validates known words", () => {
    expect(isValidWord("table")).toBe(true);
    expect(isValidWord("TABLE")).toBe(true);
    expect(isValidWord("zzzzz")).toBe(false);
    expect(isValidWord("ab")).toBe(false);
  });
});
