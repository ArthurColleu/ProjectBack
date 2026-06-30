import { describe, it, expect } from "vitest";
import { computeStats } from "./stats";

describe("computeStats", () => {
  it("returns zeros for empty history", () => {
    const s = computeStats([]);
    expect(s.gamesPlayed).toBe(0);
    expect(s.wins).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.maxStreak).toBe(0);
  });

  it("computes basic win rate", () => {
    const records = [
      { status: "won" as const, guessCount: 3, date: "2026-06-01" },
      { status: "won" as const, guessCount: 4, date: "2026-06-02" },
      { status: "lost" as const, guessCount: 6, date: "2026-06-03" },
    ];
    const s = computeStats(records);
    expect(s.gamesPlayed).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.winRate).toBe(67);
  });

  it("computes guess distribution", () => {
    const records = [
      { status: "won" as const, guessCount: 2, date: "2026-06-01" },
      { status: "won" as const, guessCount: 2, date: "2026-06-02" },
      { status: "won" as const, guessCount: 4, date: "2026-06-03" },
    ];
    const s = computeStats(records);
    expect(s.guessDistribution["2"]).toBe(2);
    expect(s.guessDistribution["4"]).toBe(1);
    expect(s.guessDistribution["1"]).toBe(0);
  });

  it("computes consecutive streaks", () => {
    const records = [
      { status: "won" as const, guessCount: 3, date: "2026-06-01" },
      { status: "won" as const, guessCount: 3, date: "2026-06-02" },
      { status: "lost" as const, guessCount: 6, date: "2026-06-03" },
      { status: "won" as const, guessCount: 3, date: "2026-06-04" },
      { status: "won" as const, guessCount: 3, date: "2026-06-05" },
      { status: "won" as const, guessCount: 3, date: "2026-06-06" },
    ];
    const s = computeStats(records);
    expect(s.maxStreak).toBe(3);
    expect(s.currentStreak).toBe(3);
  });

  it("streak breaks on non-consecutive days", () => {
    const records = [
      { status: "won" as const, guessCount: 3, date: "2026-06-01" },
      { status: "won" as const, guessCount: 3, date: "2026-06-03" }, // gap
    ];
    const s = computeStats(records);
    expect(s.maxStreak).toBe(1);
    expect(s.currentStreak).toBe(1);
  });
});
