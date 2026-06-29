import { NextRequest, NextResponse } from "next/server";
import { evaluateGuess, dailyFallbackWord, LetterState } from "@/lib/game";
import { isValidWord, DICTIONARY } from "@/lib/dictionary";
import { getServiceRoleClient } from "@/lib/supabase/server";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function resolveTargetWord(date: string): Promise<string> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("daily_words")
      .select("word")
      .eq("date", date)
      .maybeSingle();

    if (error || !data) {
      return dailyFallbackWord(date, DICTIONARY);
    }
    return data.word;
  } catch {
    return dailyFallbackWord(date, DICTIONARY);
  }
}

export async function GET() {
  return NextResponse.json({ date: todayIsoDate() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const guess = typeof body?.guess === "string" ? body.guess.toLowerCase() : "";

  if (!isValidWord(guess)) {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  const date = todayIsoDate();
  const target = await resolveTargetWord(date);
  const result: LetterState[] = evaluateGuess(guess, target);
  const isCorrect = result.every((s) => s === "correct");

  // Anti-cheat: the target word is never returned to the client. On a correct
  // guess the player already knows it; on a loss it stays hidden.
  return NextResponse.json({ result, isCorrect });
}
