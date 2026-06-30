import { describe, it, expect } from "vitest";
import { todayIso } from "./clock";

describe("todayIso", () => {
  it("returns an ISO date YYYY-MM-DD", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
