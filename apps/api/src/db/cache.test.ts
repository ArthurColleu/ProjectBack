import { describe, it, expect, vi } from "vitest";
import { MemoryCache, dailyWordKey } from "./cache";

describe("MemoryCache (repli NoSQL)", () => {
  it("stocke et relit une valeur", async () => {
    const c = new MemoryCache();
    await c.set("k", { a: 1 });
    expect(await c.get<{ a: number }>("k")).toEqual({ a: 1 });
  });

  it("retourne null pour une clé absente", async () => {
    expect(await new MemoryCache().get("nope")).toBeNull();
  });

  it("supprime une clé (invalidation)", async () => {
    const c = new MemoryCache();
    await c.set("k", 1);
    await c.del("k");
    expect(await c.get("k")).toBeNull();
  });

  it("expire après le TTL", async () => {
    vi.useFakeTimers();
    const c = new MemoryCache();
    await c.set("k", 1, 60); // 60 s
    vi.advanceTimersByTime(61_000);
    expect(await c.get("k")).toBeNull();
    vi.useRealTimers();
  });

  it("expose son backend", () => {
    expect(new MemoryCache().backend).toBe("memory");
  });

  it("génère la clé du mot du jour", () => {
    expect(dailyWordKey("2026-07-02")).toBe("daily_word:2026-07-02");
  });
});
