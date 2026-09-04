/**
 * participant.test.ts — the half of the loop a model plays.
 *
 * The property that makes handing the choice to a model safe is that **its authority is exactly one
 * integer wide**: it cannot invent an option, reorder the menu, or reach past it. So the tests that
 * matter feed a hostile answer and check the menu still bounds it.
 *
 * The suite does NOT require a running daemon. A live check against a real model is opt-in via
 * `ZETA_LIVE_LLM=1`, because a test that silently skips when a service is down is a test that
 * reports success for not running — and one that fails the whole suite when a daemon is missing is
 * a test that punishes the wrong thing.
 */

import { describe, expect, test } from "bun:test";
import {
  describeOption,
  describeState,
  localLlmAgentParticipant,
  oracleAgentParticipant,
  participantFromSpec,
} from "./participant";
import { emptySurface } from "./cli";
import { generateMenu } from "./menu-generator";
import type { AgentState, MenuOption, StatusSnapshot, WorkCandidate } from "./state-machine";

const AT = "2026-09-03T10:00:00.000Z";
const idle: AgentState = { tag: "Idle", context: { agent: "alexa", cycle: 3, sessionStartIso: AT } };
const snapshot: StatusSnapshot = emptySurface(AT);
const cand: WorkCandidate = {
  id: "w-1",
  lane: "operational",
  estimatedDoraContribution: 0.8,
  uncertainty: 0.4,
  trajectoryPhase: "execution",
  agentInterest: 0.6,
};

const menu = (state: AgentState = idle, candidates: readonly WorkCandidate[] = []) =>
  generateMenu({ state, snapshot, candidates, namedDeps: [], heartbeatLane: "operational" });

describe("the oracle participant", () => {
  test("takes the first option, which is the best-scoring work", async () => {
    const m = menu(idle, [cand]);
    const choice = await oracleAgentParticipant().choose(idle, snapshot, m);
    expect(choice.index).toBe(0);
    expect(choice.option).toEqual(m[0]!);
    expect(choice.fallback).toBe(false);
    expect(choice.cause).toBe("none");
  });

  test("an empty menu is refused rather than indexed into", async () => {
    await expect(oracleAgentParticipant().choose(idle, snapshot, [])).rejects.toThrow("menu is empty");
  });
});

describe("the labels ARE the prompt", () => {
  test("every menu option describes what it DOES, not just its tag", () => {
    for (const option of menu(idle, [cand])) {
      const label = describeOption(option);
      expect(label.length).toBeGreaterThan(10);
      // A label that is just the tag tells a model nothing it could not read off the enum.
      expect(label).not.toBe(option.tag);
    }
  });

  test("work carries the numbers a choice would turn on", () => {
    const pick: MenuOption = { tag: "PickWork", work: cand };
    const label = describeOption(pick);
    expect(label).toContain("w-1");
    expect(label).toContain("0.80"); // impact
    expect(label).toContain("0.40"); // unknowns
  });

  test("an absent ETA is described as absent, never invented", () => {
    expect(describeOption({ tag: "EnterNamedBoundedWait", namedDep: "CI" })).toContain("no expected time");
    expect(describeOption({ tag: "EnterNamedBoundedWait", namedDep: "CI", eta: AT })).toContain(AT);
  });

  test("the state description says who, WHICH CYCLE, and where", () => {
    const text = describeState(idle, snapshot);
    expect(text).toContain("alexa");
    expect(text).toContain("cycle 3");
    expect(text).toContain("idle");
    // The cycle number specifically: an agent told only "you are alexa" cannot tell a first
    // attempt from a fiftieth, which is exactly what it needs to decide whether to keep going.
    expect(describeState({ ...idle, context: { ...idle.context, cycle: 99 } }, snapshot)).toContain("cycle 99");
  });

  test("a PAUSED agent is told it is paused, and why", () => {
    const paused: AgentState = { tag: "Paused", context: idle.context, reason: "budget freeze" };
    expect(describeState(paused, snapshot)).toContain("budget freeze");
  });

  test("hot areas and exploration candidates reach the model only when they exist", () => {
    // An empty list announced as a heading tells the model there ARE active areas and then names
    // none — worse than silence, because it invites a choice about nothing.
    expect(describeState(idle, snapshot)).not.toContain("Active areas");
    expect(describeState(idle, snapshot)).not.toContain("Worth a look");
    const busy: StatusSnapshot = { ...snapshot, hotTrajectories: ["checkout"], explorationCandidates: ["w-9"] };
    const text = describeState(idle, busy);
    expect(text).toContain("checkout");
    expect(text).toContain("w-9");
  });
});

describe("A MODEL'S AUTHORITY IS ONE INTEGER WIDE", () => {
  // A stub daemon, so the property is tested without depending on one running.
  const withReply = (reply: string) => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ response: reply }), { status: 200 })) as unknown as typeof fetch;
    return () => {
      globalThis.fetch = original;
    };
  };

  test("a HALLUCINATED index is not honoured — the menu bounds it", async () => {
    const restore = withReply("42");
    try {
      const m = menu(idle, [cand]);
      const choice = await localLlmAgentParticipant().choose(idle, snapshot, m);
      // Reaching past the menu is an ILLEGAL SELECTION, recorded as such, and the option handed
      // back is still one of the ones offered.
      expect(choice.cause).toBe("out-of-range");
      expect(choice.fallback).toBe(true);
      expect(m).toContain(choice.option);
      expect(choice.index).toBeGreaterThanOrEqual(0);
      expect(choice.index).toBeLessThan(m.length);
    } finally {
      restore();
    }
  });

  test("GARBAGE is not honoured either, and is reported as unparseable", async () => {
    const restore = withReply("I would like to think about this for a while");
    try {
      const m = menu();
      const choice = await localLlmAgentParticipant().choose(idle, snapshot, m);
      expect(choice.cause).toBe("unparseable");
      expect(m).toContain(choice.option);
    } finally {
      restore();
    }
  });

  test("a DEAD DAEMON is a runtime fault, not the model misbehaving", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    try {
      const m = menu();
      const choice = await localLlmAgentParticipant().choose(idle, snapshot, m);
      // The three causes call for opposite responses; collapsing them would read a dropped
      // connection as misbehaviour.
      expect(choice.cause).toBe("backend-error");
      expect(m).toContain(choice.option);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("THE SEED IS FIXED — two default participants send the same one", async () => {
    // Reproducibility is what lets a model sit inside a substrate that claims DST replay. A random
    // default would make every run a different run, and the live same-seed test cannot catch it
    // because that test passes its seed explicitly.
    const bodies: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init: { body?: string } = {}) => {
      bodies.push(String(init.body ?? ""));
      return new Response(JSON.stringify({ response: "1" }), { status: 200 });
    }) as unknown as typeof fetch;
    try {
      const m = menu(idle, [cand]);
      await localLlmAgentParticipant().choose(idle, snapshot, m);
      await localLlmAgentParticipant().choose(idle, snapshot, m);
      expect(bodies).toHaveLength(2);
      expect(bodies[0]).toContain('"seed"');
      expect(bodies[1]).toBe(bodies[0]!);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("a VALID answer is taken exactly, and reports no fault", async () => {
    const restore = withReply("2");
    try {
      const m = menu(idle, [cand]);
      const choice = await localLlmAgentParticipant().choose(idle, snapshot, m);
      expect(choice.index).toBe(2);
      expect(choice.option).toEqual(m[2]!);
      expect(choice.cause).toBe("none");
      expect(choice.fallback).toBe(false);
    } finally {
      restore();
    }
  });
});

describe("participant specs are refused, not defaulted", () => {
  test("the known ones resolve", () => {
    expect(participantFromSpec("oracle")).toMatchObject({ ok: true });
    expect(participantFromSpec("local-llm")).toMatchObject({ ok: true });
    const named = participantFromSpec("local-llm:llama3");
    expect(named.ok).toBe(true);
    if (named.ok) expect(named.participant.name).toBe("local-llm:llama3");
  });

  test("AN UNKNOWN SPEC IS REFUSED — a typo must not look like a deliberate oracle run", () => {
    const r = participantFromSpec("gpt-9");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("unknown participant");
  });

  test("a model name is required after the colon", () => {
    expect(participantFromSpec("local-llm:").ok).toBe(false);
  });
});

// ─── Opt-in live check ───────────────────────────────────────────────────────
//
// Runs only with ZETA_LIVE_LLM=1. Not skipped silently by default: an absent daemon would make a
// skipped test report success for not running, which is the vacuity class in test form.
const live = process.env["ZETA_LIVE_LLM"] === "1";
describe.if(live)("LIVE — a real model drives the loop", () => {
  test("it answers with an index inside the menu", async () => {
    const m = menu(idle, [cand]);
    const choice = await localLlmAgentParticipant().choose(idle, snapshot, m);
    expect(m).toContain(choice.option);
    expect(choice.index).toBeLessThan(m.length);
  });

  test("the SAME seed gives the SAME answer — DST survives a model in the loop", async () => {
    const m = menu(idle, [cand]);
    const a = await localLlmAgentParticipant({ seed: 42 }).choose(idle, snapshot, m);
    const b = await localLlmAgentParticipant({ seed: 42 }).choose(idle, snapshot, m);
    expect(b.index).toBe(a.index);
  });
});
