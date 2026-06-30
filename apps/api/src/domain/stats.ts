export interface GameRecord {
  status: "won" | "lost";
  guessCount: number;
  date: string; // YYYY-MM-DD
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<string, number>;
}

export function computeStats(records: GameRecord[]): PlayerStats {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  const gamesPlayed = sorted.length;
  const wins = sorted.filter((r) => r.status === "won").length;
  const winRate = gamesPlayed === 0 ? 0 : Math.round((wins / gamesPlayed) * 100);

  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
  for (const r of sorted) {
    if (r.status === "won" && r.guessCount >= 1 && r.guessCount <= 6) {
      distribution[String(r.guessCount)] += 1;
    }
  }

  let maxStreak = 0;
  let current = 0;
  let prevDate: string | null = null;

  for (const r of sorted) {
    if (r.status !== "won") {
      current = 0;
      prevDate = null;
      continue;
    }
    if (prevDate === null) {
      current = 1;
    } else {
      const prev = new Date(prevDate);
      const curr = new Date(r.date);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      if (diffDays === 1) {
        current += 1;
      } else {
        current = 1;
      }
    }
    prevDate = r.date;
    if (current > maxStreak) maxStreak = current;
  }

  // currentStreak: streak from most recent game backwards
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i];
    if (r.status !== "won") break;
    if (currentStreak === 0) {
      currentStreak = 1;
    } else {
      const next = sorted[i + 1];
      const curr = new Date(r.date);
      const nextDate = new Date(next.date);
      const diff = Math.round((nextDate.getTime() - curr.getTime()) / 86_400_000);
      if (diff === 1) currentStreak += 1;
      else break;
    }
  }

  return { gamesPlayed, wins, winRate, currentStreak, maxStreak, guessDistribution: distribution };
}
