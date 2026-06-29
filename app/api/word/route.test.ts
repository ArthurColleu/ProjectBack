import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleClient: vi.fn(),
}));

import { resolveTargetWord } from "./route";
import { getServiceRoleClient } from "@/lib/supabase/server";

describe("resolveTargetWord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the word from Supabase when present", async () => {
    (getServiceRoleClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { word: "table" }, error: null }),
          }),
        }),
      }),
    });

    const word = await resolveTargetWord("2026-06-29");
    expect(word).toBe("table");
  });

  it("falls back to a deterministic word when Supabase has no entry", async () => {
    (getServiceRoleClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    });

    const word = await resolveTargetWord("2026-06-29");
    expect(word).toMatch(/^[a-z]{5}$/);
  });

  it("falls back to a deterministic word when Supabase errors", async () => {
    (getServiceRoleClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: new Error("down") }),
          }),
        }),
      }),
    });

    const word = await resolveTargetWord("2026-06-29");
    expect(word).toMatch(/^[a-z]{5}$/);
  });
});
