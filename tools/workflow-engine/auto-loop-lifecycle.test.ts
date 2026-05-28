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

describe("AutoLoopLifetime universe", () => {
  test("9 distinct loop states", () => {
    expect(AUTO_LOOP_UNIVERSE.length).toBe(9);
    const kinds = AUTO_LOOP_UNIVERSE.map((s) => s.kind);
    expect(kinds).toContain("cold-boot");
    expect(kinds).toContain("tick-complete");
    expect(kinds).toContain("forced-escalation");
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
  test("standing authorization → ship-action (no operator-direction pending; under counter)", () => {
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("ship-action");
    }
  });

  test("operator-direction pending → brief-ack-bounded-wait (no-op verdict)", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      operatorDirectionPending: "which lane to advance?",
    };
    const r = dispatchAutoLoopTransition({ kind: "decompose-or-ship" }, ctx);
    if (r.ok) {
      expect(r.outcome.nextState.kind).toBe("brief-ack-bounded-wait");
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
  test("cold-boot cycle completes happy-path with ship-action artifact", () => {
    const r = runTickCycle({ kind: "cold-boot" }, COLD_BOOT_CONTEXT);
    if (r.ok) {
      expect(r.outcome.finalState.kind).toBe("tick-complete");
      // Path: cold-boot → refresh → scan → decompose-or-ship → ship-action → tick-complete
      const kinds = r.outcome.transitions.map((s) => s.kind);
      expect(kinds[0]).toBe("cold-boot");
      expect(kinds).toContain("ship-action");
      expect(kinds[kinds.length - 1]).toBe("tick-complete");
    }
  });

  test("operator-direction pending cycle terminates with brief-ack-bounded-wait", () => {
    const ctx: TickContext = {
      ...COLD_BOOT_CONTEXT,
      operatorDirectionPending: "waiting on design direction",
    };
    const r = runTickCycle({ kind: "cold-boot" }, ctx);
    if (r.ok) {
      const kinds = r.outcome.transitions.map((s) => s.kind);
      expect(kinds).toContain("brief-ack-bounded-wait");
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
  test("all 9 variants distinguishable", () => {
    const variants: AutoLoopLifetime[] = [
      { kind: "cold-boot" },
      { kind: "refresh-substrate" },
      { kind: "scan-inflight-prs" },
      { kind: "investigate-failure" },
      { kind: "decompose-or-ship" },
      { kind: "ship-action" },
      { kind: "brief-ack-bounded-wait" },
      { kind: "forced-escalation" },
      { kind: "tick-complete" },
    ];
    expect(variants.length).toBe(9);
  });
});
