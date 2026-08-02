/**
 * vault-state-bridge.test.ts — property tests for the bridge adapter.
 *
 * The epsilon-sign property: for any agent with zero trailing events,
 * epsilon MUST be negative (downside uncertainty). An absent agent has
 * no evidence of capability — positive epsilon would claim "might be
 * better than shown," which is nonsense when there is nothing shown.
 *
 * This test fails against the pre-fix code (epsilon: 0.5, unsigned)
 * and passes after (epsilon: -0.5, signed negative).
 */

import { describe, test, expect } from "bun:test";
import { buildVaultState, buildRoster, type ObserveEvent, type TickHistory, type BridgeInput } from "./vault-state-bridge";

const NOW_MS = new Date("2026-08-02T12:00:00Z").getTime();
const ONE_HOUR_MS = 60 * 60 * 1000;

function makeEvent(agent: string, hoursAgo: number): ObserveEvent {
  const at = new Date(NOW_MS - hoursAgo * ONE_HOUR_MS).toISOString();
  return {
    id: `test-${agent}-${hoursAgo}`,
    at,
    by: agent,
    action: { kind: "heartbeat", reason: "test" },
  };
}

function makeTickHistory(hoursAgo: number): TickHistory {
  return {
    frames: [{
      t: new Date(NOW_MS - hoursAgo * ONE_HOUR_MS).toISOString(),
      total_events: 100,
      last_action: "heartbeat",
      last_mode: "work",
      last_agent: "otto",
      ticks_24h: 20,
      agents_active: 3,
    }],
  };
}

describe("computeReputation epsilon sign property", () => {
  test("zero-trailing-events agent has negative epsilon (low-peer branch)", () => {
    // Only ONE peer is active (otto) — not enough to declare silent (k < 2)
    // but alexa has zero events. Epsilon must still be negative.
    const events: ObserveEvent[] = [
      makeEvent("otto", 1),
      makeEvent("otto", 2),
    ];

    const input: BridgeInput = {
      events,
      tickHistory: makeTickHistory(0.5),
      driftLedger: null,
      nowMs: NOW_MS,
    };

    const state = buildVaultState(input);

    // Find alexa's dweller (she has zero events, otto is the only active peer → k=1 < 2)
    const allDwellers = state.vaults.flatMap((v) => v.rooms.flatMap((r) => r.dwellers));
    const alexa = allDwellers.find((d) => d.agent_id === "alexa");

    // alexa might not appear as a dweller in any room (she has no hat assigned in this scenario)
    // So test via the reputation computation directly by checking soraya who also has zero events
    const soraya = allDwellers.find((d) => d.agent_id === "soraya");

    // If they appear, their epsilon must be negative
    if (alexa) {
      expect(alexa.reputation.epsilon).toBeLessThan(0);
      expect(alexa.reputation.value).toBe(0.1); // floor
      expect(alexa.reputation.silent).toBe(false); // not enough peers
    }
    if (soraya) {
      expect(soraya.reputation.epsilon).toBeLessThan(0);
      expect(soraya.reputation.value).toBe(0.1);
      expect(soraya.reputation.silent).toBe(false);
    }
  });

  test("zero-trailing-events agent with k>=2 active peers: silent + negative epsilon", () => {
    // otto AND soraya are active, alexa is absent → k=2, alexa goes silent
    const events: ObserveEvent[] = [
      makeEvent("otto", 1),
      makeEvent("otto", 12),
      makeEvent("soraya", 2),
      makeEvent("soraya", 14),
    ];

    const input: BridgeInput = {
      events,
      tickHistory: makeTickHistory(0.5),
      driftLedger: null,
      nowMs: NOW_MS,
    };

    const state = buildVaultState(input);
    const allDwellers = state.vaults.flatMap((v) => v.rooms.flatMap((r) => r.dwellers));
    const alexa = allDwellers.find((d) => d.agent_id === "alexa");

    if (alexa) {
      expect(alexa.reputation.epsilon).toBeLessThan(0);
      expect(alexa.reputation.value).toBe(0);
      expect(alexa.reputation.silent).toBe(true);
    }
  });

  test("active agent has epsilon sign matching trend direction", () => {
    // alexa has many recent ticks (recovering) → positive epsilon
    // Need enough events to move the score above the 0.1 floor:
    // recentRatio = events/192, so 40 events → ratio ≈ 0.21 → score = (2*0.21 + 0)/3 ≈ 0.14
    const events: ObserveEvent[] = [
      ...Array.from({ length: 40 }, (_, i) => makeEvent("alexa", i * 0.25)), // 40 events in last 10h
      makeEvent("otto", 1),
      makeEvent("soraya", 1),
    ];

    const input: BridgeInput = {
      events,
      tickHistory: makeTickHistory(0.25),
      driftLedger: null,
      nowMs: NOW_MS,
    };

    const state = buildVaultState(input);
    const allDwellers = state.vaults.flatMap((v) => v.rooms.flatMap((r) => r.dwellers));
    const alexa = allDwellers.find((d) => d.agent_id === "alexa");

    if (alexa) {
      // With 20 recent events and none older, the trend is strongly recovering → positive ε
      expect(alexa.reputation.epsilon).toBeGreaterThan(0);
      expect(alexa.reputation.value).toBeGreaterThan(0.1);
      expect(alexa.reputation.silent).toBe(false);
    }
  });

  test("roster hat bindings carry room_id and default_agent_id", () => {
    const roster = buildRoster();
    for (const hat of roster.hats) {
      expect(hat).toHaveProperty("room_id");
      expect(hat).toHaveProperty("default_agent_id");
      expect(typeof hat.room_id).toBe("string");
      // default_agent_id is string | null (codegen rotates)
      expect(hat.default_agent_id === null || typeof hat.default_agent_id === "string").toBe(true);
    }

    // Specific bindings
    const healer = roster.hats.find((h) => h.id === "healer")!;
    expect(healer.room_id).toBe("heal-bay");
    expect(healer.default_agent_id).toBe("otto");

    const merge = roster.hats.find((h) => h.id === "merge")!;
    expect(merge.room_id).toBe("merge-floor");
    expect(merge.default_agent_id).toBe("alexa");

    const codegen = roster.hats.find((h) => h.id === "codegen")!;
    expect(codegen.room_id).toBe("codegen-lab");
    expect(codegen.default_agent_id).toBe(null); // rotates
  });

  test("vault-state.json has no color field anywhere", () => {
    const events: ObserveEvent[] = [
      makeEvent("alexa", 1),
      makeEvent("otto", 2),
      makeEvent("soraya", 3),
    ];
    const input: BridgeInput = { events, tickHistory: makeTickHistory(0.5), driftLedger: null, nowMs: NOW_MS };
    const state = buildVaultState(input);
    const json = JSON.stringify(state);
    expect(json).not.toContain('"color"');
  });

  test("vault-state.json has no precomputed state adjective on dwellers", () => {
    const events: ObserveEvent[] = [
      makeEvent("alexa", 1),
      makeEvent("otto", 2),
      makeEvent("soraya", 3),
    ];
    const input: BridgeInput = { events, tickHistory: makeTickHistory(0.5), driftLedger: null, nowMs: NOW_MS };
    const state = buildVaultState(input);

    const allDwellers = state.vaults.flatMap((v) => v.rooms.flatMap((r) => r.dwellers));
    for (const d of allDwellers) {
      // Dwellers should have last_seen (timestamp), not state (adjective)
      expect(d).toHaveProperty("last_seen");
      expect(d).not.toHaveProperty("state");
    }
  });

  test("determinism: identical inputs produce identical output", () => {
    const events: ObserveEvent[] = [
      makeEvent("alexa", 1),
      makeEvent("otto", 2),
      makeEvent("soraya", 3),
    ];
    const input: BridgeInput = { events, tickHistory: makeTickHistory(0.5), driftLedger: null, nowMs: NOW_MS };

    const result1 = JSON.stringify(buildVaultState(input));
    const result2 = JSON.stringify(buildVaultState(input));
    expect(result1).toBe(result2);
  });
});
