import { dailyFallbackWord } from "@/lib/game";
import { DICTIONARY } from "@/lib/dictionary";
import { getServiceRoleClient } from "@/lib/supabase/server";

export function todayIsoDate(): string {
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
