// Invariant tests for AutoLoopLifetime PoC — Otto-CLI foreground loop substrate.

import { describe, expect, test } from "bun:test";
import {
  AUTO_LOOP_UNIVERSE,
  BRIEF_ACK_THRESHOLD,
  COLD_BOOT_CONTEXT,
  dispatchAutoLoopTransition,
  nextTickContext,
  runTickCycle,
  type AutoLoopLifetime,
  type TickContext,
} from "./auto-loop-lifecycle.js";

describe("AutoLoopLifetime universe (extended 2026-05-28 per IMPLICIT-NOT-EXPLICIT rule)", () => {
  test("17 distinct loop states (9 original + 8 extension)", () => {
    expect(AUTO_LOOP_UNIVERSE.length).toBe(17);
    const kinds = AUTO_LOOP_UNIVERSE.map((s) => s.kind);
    // Original 9
    expect(kinds).toContain("cold-boot");
    expect(kinds).toContain("tick-complete");
    expect(kinds).toContain("forced-escalation");
    // 8 extension variants
    expect(kinds).toContain("await-merge-confirmation");
    expect(kinds).toContain("pr-loop-resolution-check");
    expect(kinds).toContain("scan-peer-prs");
    expect(kinds).toContain("enter-review-mode");
    expect(kinds).toContain("await-operator-direction");
    expect(kinds).toContain("pure-git-mode");
    expect(kinds).toContain("unfinished-pr-triage");
    expect(kinds).toContain("free-time");
  });

  test("constants exported", () => {
    expect(BRIEF_ACK_THRESHOLD).toBe(6);
    expect(COLD_BOOT_CONTEXT.tickIndex).toBe(0);
    expect(COLD_BOOT_CONTEXT.briefAckCount).toBe(0);
  });
});

describe("dispatch transitions (happy path)", () => {
  test("cold-boot → refresh-substrate", () => {
    const r = dispatchAutoLoopTransition({ kind: "cold-boot" }, COLD_BOOT_CONTEXT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("refresh-substrate");
      expect(r.outcome.verdict.kind).toBe("advance");
      expect(r.outcome.counterReset).toBe(true);
    }
  });

  test("refresh-substrate → scan-inflight-prs", () => {
    const r = dispatchAutoLoopTransition({ kind: "refresh-substrate" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("scan-inflight-prs");
    }
  });

  test("scan-inflight-prs with actionable → investigate-failure", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      inflightPrs: [{ number: 5774, state: "OPEN", actionable: true }],
    };
    const r = dispatchAutoLoopTransition({ kind: "scan-inflight-prs" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("investigate-failure");
    }
  });

  test("scan-inflight-prs without actionable → decompose-or-ship", () => {
    const r = dispatchAutoLoopTransition({ kind: "scan-inflight-prs" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("decompose-or-ship");
    }
  });

  test("investigate-failure → ship-action", () => {
    const r = dispatchAutoLoopTransition({ kind: "investigate-failure" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("ship-action");
    }
  });

  test("ship-action → tick-complete with counter reset + artifact", () => {
    const r = dispatchAutoLoopTransition({ kind: "ship-action" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("tick-complete");
      expect(r.outcome.verdict.kind).toBe("complete");
      expect(r.outcome.counterReset).toBe(true);
      expect(r.outcome.artifact?.kind).toBe("pr-opened");
    }
  });
});

describe("decompose-or-ship branch logic", () => {
  test("no inflight PRs + no operator-direction + under counter → free-time (per NCI free-time-as-valid-mode + Aaron 2026-05-28 reachability invariant)", () => {
    // Note: extension changes the no-pending-work branch from
    // implicit-ship-action to explicit FREE-TIME state.
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("free-time");
      expect(r.outcome.verdict.kind).toBe("no-op");
      expect(r.outcome.counterReset).toBe(true);
    }
  });

  test("inflight PRs + no operator-direction + under counter → ship-action (standing authorization)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      inflightPrs: [{ number: 5805, state: "OPEN", actionable: false }],
    };
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("ship-action");
    }
  });

  test("operator-direction pending → await-operator-direction (was implicit; now explicit per IMPLICIT-NOT-EXPLICIT rule)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      operatorDirectionPending: "which lane to advance?",
    };
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("await-operator-direction");
      expect(r.outcome.verdict.kind).toBe("no-op");
    }
  });

  test("counter threshold + no named-dep → forced-escalation", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      briefAckCount: 6,
      lastNamedDependency: undefined,
    };
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("forced-escalation");
      expect(r.outcome.verdict.kind).toBe("escalate-to-operator");
    }
  });

  test("counter threshold WITH named-dep → ship-action (named-dep covers the wait)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      briefAckCount: 10,
      lastNamedDependency: "PR #5800 dup-ID fix in flight",
    };
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("ship-action");
    }
  });
});

describe("brief-ack-bounded-wait → CounterThresholdReached feedback", () => {
  test("approaching threshold returns feedback", () => {
    const ctx: TickContext = { ...COLD_BOOT_CONTEXT, briefAckCount: 5 };
    const r = dispatchAutoLoopTransition({ kind: "brief-ack-bounded-wait" }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.feedback.kind).toBe("CounterThresholdReached");
    }
  });

  test("below threshold continues to tick-complete with no-op", () => {
    const ctx: TickContext = { ...COLD_BOOT_CONTEXT, briefAckCount: 3 };
    const r = dispatchAutoLoopTransition({ kind: "brief-ack-bounded-wait" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("tick-complete");
      expect(r.outcome.verdict.kind).toBe("no-op");
    }
  });
});

describe("forced-escalation → tick-complete", () => {
  test("escalates to operator + completes tick", () => {
    const r = dispatchAutoLoopTransition({ kind: "forced-escalation" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("tick-complete");
      expect(r.outcome.verdict.kind).toBe("escalate-to-operator");
    }
  });
});

describe("nextTickContext bookkeeping", () => {
  test("tick index always increments", () => {
    const next = nextTickContext(COLD_BOOT_CONTEXT, {
      nextState: { kind: "tick-complete" },
      verdict: { kind: "complete" },
      counterReset: false,
    });
    expect(next.tickIndex).toBe(1);
  });

  test("counter reset zeroes briefAckCount", () => {
    const ctx: TickContext = { ...COLD_BOOT_CONTEXT, briefAckCount: 4 };
    const next = nextTickContext(ctx, {
      nextState: { kind: "tick-complete" },
      verdict: { kind: "complete" },
      counterReset: true,
    });
    expect(next.briefAckCount).toBe(0);
  });

  test("no-op verdict increments briefAckCount", () => {
    const ctx: TickContext = { ...COLD_BOOT_CONTEXT, briefAckCount: 2 };
    const next = nextTickContext(ctx, {
      nextState: { kind: "tick-complete" },
      verdict: { kind: "no-op" },
      counterReset: false,
    });
    expect(next.briefAckCount).toBe(3);
  });

  test("advance verdict does NOT increment briefAckCount (substantive work happened)", () => {
    const ctx: TickContext = { ...COLD_BOOT_CONTEXT, briefAckCount: 2 };
    const next = nextTickContext(ctx, {
      nextState: { kind: "tick-complete" },
      verdict: { kind: "advance" },
      counterReset: false,
    });
    expect(next.briefAckCount).toBe(2);  // unchanged
  });
});

describe("runTickCycle end-to-end", () => {
  test("cold-boot with NO inflight PRs → free-time happy path (per extension; was implicit ship-action)", () => {
    // Per IMPLICIT-NOT-EXPLICIT rule extension: cold-boot with no inflight
    // PRs + under counter routes to FREE-TIME (the no-pending-work branch).
    // This makes the path explicit: cold-boot → refresh → scan-empty →
    // decompose-or-ship → free-time → tick-complete.
    const r = runTickCycle({ kind: "cold-boot" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.finalState.kind).toBe("tick-complete");
      const kinds = r.outcome.transitions.map((s) => s.kind);
      expect(kinds[0]).toBe("cold-boot");
      expect(kinds).toContain("free-time");
      expect(kinds[kinds.length - 1]).toBe("tick-complete");
    }
  });

  test("cold-boot WITH inflight non-actionable PRs → ship-action (decompose ships)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      inflightPrs: [{ number: 5805, state: "OPEN", actionable: false }],
    };
    const r = runTickCycle({ kind: "cold-boot" }, ctx);
    if (r.ok) {
      const kinds = r.outcome.transitions.map((s) => s.kind);
      expect(kinds).toContain("ship-action");
    }
  });

  test("operator-direction pending cycle terminates with await-operator-direction (was brief-ack-bounded-wait per IMPLICIT-NOT-EXPLICIT extension)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      operatorDirectionPending: "waiting on design direction",
    };
    const r = runTickCycle({ kind: "cold-boot" }, ctx);
    if (r.ok) {
      const kinds = r.outcome.transitions.map((s) => s.kind);
      expect(kinds).toContain("await-operator-direction");
    }
  });

  test("at-threshold cycle escalates (entering from decompose-or-ship preserves counter)", () => {
    // Note: cold-boot transition resets counter via counterReset=true.
    // To test threshold-escalation, enter from decompose-or-ship state.
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      briefAckCount: 6,
    };
    const r = runTickCycle({ kind: "decompose-or-ship" }, ctx);
    if (r.ok) {
      const kinds = r.outcome.transitions.map((s) => s.kind);
      expect(kinds).toContain("forced-escalation");
    }
  });
});

describe("type-level AutoLoopLifetime exhaustive switch (compile check)", () => {
  test("all 17 variants distinguishable (9 original + 8 extension)", () => {
    const variants: AutoLoopLifetime[] = [
      // Original 9
      { kind: "cold-boot" },
      { kind: "refresh-substrate" },
      { kind: "scan-inflight-prs" },
      { kind: "investigate-failure" },
      { kind: "decompose-or-ship" },
      { kind: "ship-action" },
      { kind: "brief-ack-bounded-wait" },
      { kind: "forced-escalation" },
      { kind: "tick-complete" },
      // 8 extension variants
      { kind: "await-merge-confirmation" },
      { kind: "pr-loop-resolution-check" },
      { kind: "scan-peer-prs" },
      { kind: "enter-review-mode" },
      { kind: "await-operator-direction" },
      { kind: "pure-git-mode" },
      { kind: "unfinished-pr-triage" },
      { kind: "free-time" },
    ];
    expect(variants.length).toBe(17);
  });
});

describe("Extension variants transitions (2026-05-28; per IMPLICIT-NOT-EXPLICIT rule)", () => {
  test("await-merge-confirmation → pr-loop-resolution-check", () => {
    const r = dispatchAutoLoopTransition({ kind: "await-merge-confirmation" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("pr-loop-resolution-check");
      expect(r.outcome.verdict.kind).toBe("no-op");
    }
  });

  test("pr-loop-resolution-check with still-actionable PRs → tick-complete (stay in loop)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      inflightPrs: [{ number: 5805, state: "OPEN", actionable: true }],
    };
    const r = dispatchAutoLoopTransition({ kind: "pr-loop-resolution-check" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("tick-complete");
      expect(r.outcome.verdict.kind).toBe("no-op");
    }
  });

  test("pr-loop-resolution-check with all PRs resolved → scan-peer-prs (review-work cycle; counter reset)", () => {
    const r = dispatchAutoLoopTransition({ kind: "pr-loop-resolution-check" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("scan-peer-prs");
      expect(r.outcome.verdict.kind).toBe("advance");
      expect(r.outcome.counterReset).toBe(true);
    }
  });

  test("scan-peer-prs → enter-review-mode", () => {
    const r = dispatchAutoLoopTransition({ kind: "scan-peer-prs" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("enter-review-mode");
    }
  });

  test("enter-review-mode → tick-complete (hand off to PrReviewLifecycle)", () => {
    const r = dispatchAutoLoopTransition({ kind: "enter-review-mode" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("tick-complete");
      expect(r.outcome.artifact?.kind).toBe("verdict-only");
    }
  });

  test("await-operator-direction → tick-complete with no-op verdict (substrate-honest waiting)", () => {
    const r = dispatchAutoLoopTransition({ kind: "await-operator-direction" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("tick-complete");
      expect(r.outcome.verdict.kind).toBe("no-op");
    }
  });

  test("pure-git-mode → decompose-or-ship (substrate continues under pure-git constraint)", () => {
    const r = dispatchAutoLoopTransition({ kind: "pure-git-mode" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("decompose-or-ship");
      expect(r.outcome.verdict.kind).toBe("advance");
    }
  });

  test("unfinished-pr-triage → ship-action (per pr-triage-tiers tier-classification work)", () => {
    const r = dispatchAutoLoopTransition({ kind: "unfinished-pr-triage" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("ship-action");
    }
  });

  test("free-time → tick-complete with counter reset (NCI HC-8 valid mode; not standing-by)", () => {
    const r = dispatchAutoLoopTransition({ kind: "free-time" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("tick-complete");
      expect(r.outcome.verdict.kind).toBe("no-op");
      expect(r.outcome.counterReset).toBe(true);  // free-time IS valid; NOT brief-ack
    }
  });
});

describe("Free-time REACHABILITY invariant (Aaron 2026-05-28 Soraya formal-verification target)", () => {
  test("free-time IS REACHABLE from decompose-or-ship when context is empty (the no-pending-work branch)", () => {
    // Per Aaron's substantive carving + refined framing:
    //   "free-time is guaranteed to be PRESENTED to participant at least
    //    sometimes; if they select it or not we can't force"
    // This test demonstrates the REACHABILITY (presentation guarantee).
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("free-time");
    }
  });

  test("free-time NOT reachable when actionable inflight work pending (substrate-honest; no-pending-work precondition)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      inflightPrs: [{ number: 1, state: "OPEN", actionable: true }],
    };
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, ctx);
    if (r.ok) {
      // With actionable work, routes to ship-action — NOT free-time
      expect(r.outcome.nextState.kind).toBe("ship-action");
    }
  });
});
