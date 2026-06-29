import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleClient: vi.fn(),
}));

import { NextRequest } from "next/server";
import { resolveTargetWord, POST } from "./route";
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

describe("POST /api/word never leaks the target word", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockTarget(word: string) {
    (getServiceRoleClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { word }, error: null }),
          }),
        }),
      }),
    });
  }

  function postReq(body: unknown) {
    return new NextRequest("http://localhost/api/word", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns only result and isCorrect on an incorrect guess, never the word", async () => {
    mockTarget("ferme");
    const res = await POST(postReq({ guess: "table" }));
    const json = await res.json();
    expect(json.isCorrect).toBe(false);
    expect(Array.isArray(json.result)).toBe(true);
    expect("revealedWord" in json).toBe(false);
    expect(JSON.stringify(json)).not.toContain("ferme");
  });

  it("returns isCorrect true with no word field on a correct guess", async () => {
    mockTarget("table");
    const res = await POST(postReq({ guess: "table" }));
    const json = await res.json();
    expect(json.isCorrect).toBe(true);
    expect(json.result).toEqual(["correct", "correct", "correct", "correct", "correct"]);
    expect("revealedWord" in json).toBe(false);
  });

  it("rejects an invalid word with 400 before resolving any word", async () => {
    const res = await POST(postReq({ guess: "zzzzz" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_word" });
  });
});
