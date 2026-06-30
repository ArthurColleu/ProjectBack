import { describe, it, expect } from "vitest";
import { computeLetterStates } from "./useWordleGame";
import type { AttemptRecord } from "./useWordleGame";

describe("computeLetterStates", () => {
  it("keeps the best known state per letter across attempts", () => {
    // Two attempts chosen to exercise every transition of the rank logic
    // (absent < present < correct):
    //   g: present (#1) then correct (#2)  -> upgraded to correct
    //   r: absent  (#1) then present (#2)  -> upgraded to present
    //   a: correct (#1) then absent  (#2)  -> stays correct (never downgraded)
    //   e: present (#1) then absent  (#2)  -> stays present
    //   c: absent  (#1), not in #2         -> stays absent
    const attempts: AttemptRecord[] = [
      { guess: "grace", result: ["present", "absent", "correct", "absent", "present"] },
      { guess: "agree", result: ["absent", "correct", "present", "absent", "absent"] },
    ];
    const states = computeLetterStates(attempts);
    expect(states.g).toBe("correct");
    expect(states.r).toBe("present");
    expect(states.a).toBe("correct");
    expect(states.c).toBe("absent");
    expect(states.e).toBe("present");
  });

  it("returns empty object for no attempts", () => {
    expect(computeLetterStates([])).toEqual({});
  });
});
