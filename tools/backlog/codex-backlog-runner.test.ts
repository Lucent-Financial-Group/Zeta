import { describe, expect, test } from "bun:test";
import { activeClaimsFromOpenPrs, capacityGate } from "../../.codex/bin/codex-backlog-runner";

describe("capacityGate", () => {
  test("allows work while there are open parallel PR slots", () => {
    expect(capacityGate(0, 3)).toEqual({ status: "ready", availablePrSlots: 3 });
    expect(capacityGate(1, 3)).toEqual({ status: "ready", availablePrSlots: 2 });
    expect(capacityGate(2, 3)).toEqual({ status: "ready", availablePrSlots: 1 });
  });

  test("waits only when the bounded parallel PR capacity is full", () => {
    expect(capacityGate(3, 3)).toEqual({ status: "wait-pr-capacity", availablePrSlots: 0 });
    expect(capacityGate(4, 3)).toEqual({ status: "wait-pr-capacity", availablePrSlots: 0 });
  });
});

describe("activeClaimsFromOpenPrs", () => {
  test("turns open PR head refs and titles into rotation claims", () => {
    const claims = activeClaimsFromOpenPrs([
      {
        number: 1881,
        headRefName: "codex/factory-trajectory-surface-alignment-measurement",
        title: "trajectory: alignment measurement child packet",
      },
    ]);

    expect(claims).toContain("codex/factory-trajectory-surface-alignment-measurement");
    expect(claims).toContain("pr-1881:trajectory: alignment measurement child packet");
  });
});
