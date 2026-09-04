/**
 * menu-generator.test.ts — the three properties the README states as acceptance criteria.
 *
 *   > A menu omitting valid options is COERCIVE
 *   > A menu including irrelevant options is NOISE
 *   > A menu offering options aligned with current state + agent-interest + operator-priorities is
 *     SUBSTRATE
 *
 * Each is a property a type checker cannot see, so each is a test here. The fourth, which is the
 * one most easily lost while tuning weights: **scoring ORDERS and never FILTERS.**
 */

import { describe, expect, test } from "bun:test";
import {
  generateMenu,
  isNonCoercive,
  isOperationalLane,
  MENU_WEIGHTS,
  NEVER_GATED,
  rankCandidates,
  scoreCandidate,
  TARGET_OPERATIONAL_RATIO,
  type MenuInput,
} from "./menu-generator";
import { transition, type AgentContext, type AgentState, type StatusSnapshot, type WorkCandidate } from "./state-machine";

const ctx: AgentContext = { agent: "alexa", cycle: 3, sessionStartIso: "2026-09-03T00:00:00.000Z" };

const snapshot = (over: Partial<StatusSnapshot> = {}): StatusSnapshot => ({
  snapshotIso: "2026-09-03T01:00:00.000Z",
  currentDora: {
    deploymentCount: 4,
    leadTimeMedianSeconds: 3600,
    changeFailureRate: 0.1,
    mttrMedianSeconds: 600,
    substrateRatio: 0.5,
  },
  hotTrajectories: [],
  coolingTrajectories: [],
  explorationCandidates: [],
  perAgentRatios: {},
  ...over,
});

const cand = (over: Partial<WorkCandidate> = {}): WorkCandidate => ({
  id: "w1",
  lane: "operational",
  estimatedDoraContribution: 0.5,
  uncertainty: 0.5,
  trajectoryPhase: "execution",
  agentInterest: 0.5,
  ...over,
});

const idle: AgentState = { tag: "Idle", context: ctx };

const input = (over: Partial<MenuInput> = {}): MenuInput => ({
  state: idle,
  snapshot: snapshot(),
  candidates: [cand()],
  ...over,
});

const tags = (menu: readonly { tag: string }[]): string[] => menu.map((o) => o.tag);

describe("NEVER COERCIVE — the free modes and escape hatches are on every menu", () => {
  const states: AgentState[] = [
    { tag: "Idle", context: ctx },
    { tag: "InspectingStatus", context: ctx, snapshot: snapshot() },
    { tag: "SelectingWork", context: ctx, candidates: [cand()] },
    { tag: "ExecutingWork", context: ctx, work: cand() },
    { tag: "EmittingResult", context: ctx, result: { workId: "w1", lane: "operational", success: true, doraContribution: 0.5 } },
    { tag: "RecordingHeartbeat", context: ctx, lane: "heartbeat" },
    { tag: "NamedBoundedWait", context: ctx, namedDep: "CI", expectedResolutionIso: "2026-09-03T02:00:00.000Z" },
    { tag: "FreeTime", context: ctx, reason: "rest" },
    { tag: "OperatorAttentionRequested", context: ctx, reason: "decision" },
    { tag: "Paused", context: ctx, reason: "break", expectedResumeIso: "2026-09-03T04:00:00.000Z" },
  ];

  test("EVERY state, and with nothing to work on", () => {
    for (const state of states) {
      expect(isNonCoercive(generateMenu(input({ state })))).toBe(true);
      // The empty-candidate case is the one where a naive generator returns almost nothing.
      expect(isNonCoercive(generateMenu(input({ state, candidates: [] })))).toBe(true);
    }
  });

  test("each never-gated option really is present, by name", () => {
    const menu = tags(generateMenu(input()));
    for (const t of NEVER_GATED) expect(menu).toContain(t);
    expect(NEVER_GATED.length).toBe(5);
  });

  test("THE CHECKER ITSELF CAN FAIL — drop any one option and it says no", () => {
    // Without this, `isNonCoercive` is the vacuity class: an invariant checker only ever handed
    // passing input reports success whatever it is written to require. Every option is dropped in
    // turn, so the check is proven to depend on ALL of them and not merely on one.
    const full = generateMenu(input());
    expect(isNonCoercive(full)).toBe(true);
    for (const missing of NEVER_GATED) {
      expect(isNonCoercive(full.filter((o) => o.tag !== missing))).toBe(false);
    }
    expect(isNonCoercive([])).toBe(false);
  });

  test("a hostile snapshot cannot remove them", () => {
    // Everything cooling, nothing hot, the agent maximally out of balance, no candidates.
    const menu = generateMenu(
      input({
        candidates: [],
        snapshot: snapshot({ coolingTrajectories: ["w1"], perAgentRatios: { alexa: 1 } }),
      }),
    );
    expect(isNonCoercive(menu)).toBe(true);
  });
});

describe("NEVER NOISE — irrelevant options are absent", () => {
  test("ResumeFromPause appears ONLY when paused", () => {
    expect(tags(generateMenu(input()))).not.toContain("ResumeFromPause");
    const paused: AgentState = { tag: "Paused", context: ctx, reason: "break" };
    expect(tags(generateMenu(input({ state: paused })))).toContain("ResumeFromPause");
  });

  test("a PAUSED agent is not offered work, and not offered another pause", () => {
    const paused: AgentState = { tag: "Paused", context: ctx, reason: "break" };
    const menu = tags(generateMenu(input({ state: paused, candidates: [cand(), cand({ id: "w2" })] })));
    expect(menu).not.toContain("PickWork");
    expect(menu).not.toContain("PressPause");
    expect(menu).not.toContain("EmitHeartbeat");
    // The way out is FIRST — a paused agent reading top-down finds it immediately.
    expect(menu[0]).toBe("ResumeFromPause");
  });

  test("PickWork appears once per candidate, and not at all when there are none", () => {
    expect(tags(generateMenu(input({ candidates: [] }))).filter((t) => t === "PickWork")).toHaveLength(0);
    expect(
      tags(generateMenu(input({ candidates: [cand(), cand({ id: "w2" }), cand({ id: "w3" })] }))).filter(
        (t) => t === "PickWork",
      ),
    ).toHaveLength(3);
  });

  test("A WAIT IS OFFERED ONLY FOR A DEPENDENCY THAT CAN BE NAMED", () => {
    // Holding with no named dependency is the standing-by failure; offering it would make the
    // failure a first-class menu choice.
    expect(tags(generateMenu(input()))).not.toContain("EnterNamedBoundedWait");
    const withDep = generateMenu(input({ namedDeps: [{ namedDep: "PR #15691 CI", eta: "2026-09-03T02:00:00.000Z" }] }));
    const wait = withDep.find((o) => o.tag === "EnterNamedBoundedWait");
    expect(wait).toBeDefined();
    if (wait?.tag === "EnterNamedBoundedWait") {
      expect(wait.namedDep).toBe("PR #15691 CI");
      expect(wait.eta).toBe("2026-09-03T02:00:00.000Z");
    }
  });

  test("an ABSENT eta stays absent rather than being invented", () => {
    const menu = generateMenu(input({ namedDeps: [{ namedDep: "operator reply" }] }));
    const wait = menu.find((o) => o.tag === "EnterNamedBoundedWait");
    if (wait?.tag === "EnterNamedBoundedWait") expect(wait.eta).toBeUndefined();
  });

  test("THE WORK ALREADY IN FLIGHT IS NOT OFFERED AGAIN", () => {
    // Picking the item you are already executing is a no-op that reads as a choice, so a loop
    // taking the top option can spin on it forever while appearing to act.
    const current = cand({ id: "current" });
    const other = cand({ id: "other" });
    const executing: AgentState = { tag: "ExecutingWork", context: ctx, work: current };
    const menu = generateMenu(input({ state: executing, candidates: [current, other] }));
    const picked = menu.filter((o) => o.tag === "PickWork").map((o) => (o.tag === "PickWork" ? o.work.id : ""));
    expect(picked).toEqual(["other"]);
    // And from Idle the same candidate IS offered — the exclusion is about being in flight, not
    // about the item.
    expect(
      generateMenu(input({ candidates: [current, other] }))
        .filter((o) => o.tag === "PickWork")
        .map((o) => (o.tag === "PickWork" ? o.work.id : "")),
    ).toContain("current");
  });

  test("the heartbeat lane follows the state's OWN work, not a default", () => {
    const executing: AgentState = { tag: "ExecutingWork", context: ctx, work: cand({ lane: "substrate-cascade" }) };
    const menu = generateMenu(input({ state: executing }));
    const hb = menu.find((o) => o.tag === "EmitHeartbeat");
    if (hb?.tag === "EmitHeartbeat") expect(hb.lane).toBe("substrate-cascade");
    // Idle has no work of its own, so it takes the supplied fallback.
    const idleMenu = generateMenu(input({ heartbeatLane: "memory" }));
    const idleHb = idleMenu.find((o) => o.tag === "EmitHeartbeat");
    if (idleHb?.tag === "EmitHeartbeat") expect(idleHb.lane).toBe("memory");
  });
});

describe("SCORING ORDERS AND NEVER FILTERS", () => {
  test("the worst candidate is still on the menu", () => {
    const best = cand({ id: "best", estimatedDoraContribution: 1, uncertainty: 1, agentInterest: 1 });
    const worst = cand({ id: "worst", estimatedDoraContribution: 0, uncertainty: 0, agentInterest: 0, trajectoryPhase: "sunset" });
    const menu = generateMenu(input({ candidates: [worst, best] }));
    const picks = menu.filter((o) => o.tag === "PickWork");
    expect(picks).toHaveLength(2);
    // Ordered, both present.
    if (picks[0]?.tag === "PickWork") expect(picks[0].work.id).toBe("best");
    if (picks[1]?.tag === "PickWork") expect(picks[1].work.id).toBe("worst");
  });

  test("THE TIE-BREAK IS ORDINAL, not locale-aware", () => {
    // `localeCompare` puts "a" before "B" (case-insensitive-ish collation); code-unit order puts
    // "B" (0x42) before "a" (0x61). The F# side compares ordinally, so a locale-aware tie-break
    // here would produce a different menu order on the same input — a byte-lock that fails on
    // someone else's machine, which is worse than no byte-lock.
    const ordered = rankCandidates([cand({ id: "a" }), cand({ id: "B" })], snapshot(), "alexa").map(
      (s) => s.candidate.id,
    );
    expect(ordered).toEqual(["B", "a"]);
    expect("a".localeCompare("B")).toBeLessThan(0); // the collation this deliberately avoids
  });

  test("the ordering is TOTAL and replayable — ties break on id", () => {
    const a = cand({ id: "b-same" });
    const b = cand({ id: "a-same" });
    const once = rankCandidates([a, b], snapshot(), "alexa").map((s) => s.candidate.id);
    const again = rankCandidates([b, a], snapshot(), "alexa").map((s) => s.candidate.id);
    expect(once).toEqual(["a-same", "b-same"]);
    expect(again).toEqual(once);
  });
});

describe("the score's terms", () => {
  test("UNCERTAINTY RAISES A CANDIDATE — a bug is reducible uncertainty, not risk", () => {
    // Written backwards this would rank the already-understood work highest and systematically
    // avoid the work that pays. The sign of this term is the repo's economics.
    const certain = scoreCandidate(cand({ id: "certain", uncertainty: 0 }), snapshot(), "alexa");
    const unknown = scoreCandidate(cand({ id: "unknown", uncertainty: 1 }), snapshot(), "alexa");
    expect(unknown.score).toBeGreaterThan(certain.score);
    expect(unknown.score - certain.score).toBeCloseTo(MENU_WEIGHTS.uncertainty, 6);
  });

  test("DORA contribution raises a candidate, and weighs more than uncertainty", () => {
    const low = scoreCandidate(cand({ estimatedDoraContribution: 0 }), snapshot(), "alexa");
    const high = scoreCandidate(cand({ estimatedDoraContribution: 1 }), snapshot(), "alexa");
    expect(high.score).toBeGreaterThan(low.score);
    expect(MENU_WEIGHTS.dora).toBeGreaterThan(MENU_WEIGHTS.uncertainty);
  });

  test("AGENT INTEREST is a real term, not a tiebreak", () => {
    const bored = scoreCandidate(cand({ agentInterest: 0 }), snapshot(), "alexa");
    const keen = scoreCandidate(cand({ agentInterest: 1 }), snapshot(), "alexa");
    expect(keen.score - bored.score).toBeCloseTo(MENU_WEIGHTS.interest, 6);
  });

  test("heat is THREE-WAY — unlisted is neutral, not assumed cold", () => {
    const hot = scoreCandidate(cand(), snapshot({ hotTrajectories: ["w1"] }), "alexa");
    const cold = scoreCandidate(cand(), snapshot({ coolingTrajectories: ["w1"] }), "alexa");
    const unlisted = scoreCandidate(cand(), snapshot(), "alexa");
    expect(hot.terms.heat).toBe(1);
    expect(cold.terms.heat).toBe(0);
    expect(unlisted.terms.heat).toBe(0.5);
    expect(hot.score).toBeGreaterThan(unlisted.score);
    expect(unlisted.score).toBeGreaterThan(cold.score);
  });

  test("SUNSET work is capped even when the trajectory is listed hot", () => {
    const hotSunset = scoreCandidate(cand({ trajectoryPhase: "sunset" }), snapshot({ hotTrajectories: ["w1"] }), "alexa");
    expect(hotSunset.terms.heat).toBe(0.25);
  });

  test("THE TWO-MANDATE BALANCE pushes toward the lane the agent is short of", () => {
    const overOperational = snapshot({ perAgentRatios: { alexa: 0.9 } });
    const substrate = scoreCandidate(cand({ lane: "substrate-cascade" }), overOperational, "alexa");
    const operational = scoreCandidate(cand({ lane: "operational" }), overOperational, "alexa");
    expect(substrate.terms.balance).toBe(1);
    expect(operational.terms.balance).toBe(0);

    // And it INVERTS for an agent short of operational work — otherwise it is a lane preference
    // wearing a balance term.
    const overSubstrate = snapshot({ perAgentRatios: { alexa: 0.1 } });
    expect(scoreCandidate(cand({ lane: "substrate-cascade" }), overSubstrate, "alexa").terms.balance).toBe(0);
    expect(scoreCandidate(cand({ lane: "operational" }), overSubstrate, "alexa").terms.balance).toBe(1);
  });

  test("an agent with NO recorded ratio is neutral, not penalized", () => {
    expect(scoreCandidate(cand(), snapshot(), "nobody").terms.balance).toBe(0.5);
    expect(scoreCandidate(cand(), snapshot({ perAgentRatios: { alexa: Number.NaN } }), "alexa").terms.balance).toBe(0.5);
  });

  test("the balance term reads the RIGHT agent's ratio", () => {
    const s = snapshot({ perAgentRatios: { otto: 0.9 } });
    // alexa has no ratio, so alexa is neutral even though otto is lopsided.
    expect(scoreCandidate(cand(), s, "alexa").terms.balance).toBe(0.5);
    expect(scoreCandidate(cand({ lane: "substrate-cascade" }), s, "otto").terms.balance).toBe(1);
  });

  test("out-of-range inputs are CLAMPED — the type's `[0,1]` comment is not an enforcement", () => {
    const wild = scoreCandidate(
      cand({ estimatedDoraContribution: 999, uncertainty: -5, agentInterest: Number.NaN }),
      snapshot(),
      "alexa",
    );
    expect(wild.terms.dora).toBe(1);
    expect(wild.terms.uncertainty).toBe(0);
    expect(wild.terms.interest).toBe(0);
  });

  test("the lane split matches the CLASSIFIER's rule, not a fresh one", () => {
    // `dora-classify` counts the `operational` lane alone toward an author's operational ratio.
    // Including `backlog-row` here would be a second definition of the same word, and the balance
    // term would push against the very ratio that produced it.
    expect(isOperationalLane("operational")).toBe(true);
    expect(isOperationalLane("backlog-row")).toBe(false);
    expect(isOperationalLane("substrate-cascade")).toBe(false);
    expect(isOperationalLane("mixed")).toBe(false);
    expect(TARGET_OPERATIONAL_RATIO).toBe(0.5);
  });
});

describe("the menu composes with the state machine it was built for", () => {
  test("every option on an Idle menu is one the transition function accepts", () => {
    // The state machine calls itself "defensive" because the generator is supposed to offer only
    // valid options. This is that claim, checked: each option produces a real state.
    for (const option of generateMenu(input())) {
      const next = transition(idle, option);
      expect(next).toBeDefined();
      expect(next.context).toEqual(ctx);
    }
  });

  test("taking the FIRST option picks the best-scoring work and starts executing it", () => {
    const best = cand({ id: "best", estimatedDoraContribution: 1, uncertainty: 1, agentInterest: 1 });
    const menu = generateMenu(input({ candidates: [cand({ id: "meh", estimatedDoraContribution: 0 }), best] }));
    const first = menu[0];
    expect(first?.tag).toBe("PickWork");
    const next = transition(idle, first!);
    expect(next.tag).toBe("ExecutingWork");
    if (next.tag === "ExecutingWork") expect(next.work.id).toBe("best");
  });

  test("a paused agent's first option resumes it — and the loop returns to Idle", () => {
    const paused: AgentState = { tag: "Paused", context: ctx, reason: "break" };
    const menu = generateMenu(input({ state: paused }));
    const next = transition(paused, menu[0]!);
    expect(next.tag).toBe("Idle");
  });
});
