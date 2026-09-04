/**
 * cli.test.ts — the execute → menu → choose → append shell.
 *
 * The load-bearing test in this file is RESUME: the loop's whole claim is that the agent holds no
 * state, so a second invocation must pick up exactly where the first left off, from disk. Everything
 * else here guards a way that could quietly stop being true.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptySurface, main, parseArgs, resolveChoice, runCycle, withCycle } from "./cli";
import { generateMenu, isNonCoercive } from "./menu-generator";
import { currentState, nextCycleNumber, readHistory } from "./state-store";
import type { AgentState, MenuOption } from "./state-machine";

const roots: string[] = [];
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-cli-"));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  while (roots.length > 0) {
    const dir = roots.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

const AT = "2026-09-03T10:00:00.000Z";
const idle: AgentState = { tag: "Idle", context: { agent: "alexa", cycle: 1, sessionStartIso: AT } };

const cycleInput = (over: Partial<Parameters<typeof runCycle>[0]> = {}) => ({
  state: idle,
  snapshot: emptySurface(AT),
  candidates: [],
  namedDeps: [],
  heartbeatLane: "operational" as const,
  at: AT,
  cycle: 1,
  ...over,
});

describe("arguments are refused rather than defaulted", () => {
  test("--agent is required and must be a known persona", () => {
    expect(parseArgs([])).toMatchObject({ ok: false });
    const unknown = parseArgs(["--agent", "nobody", "--at", AT]);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toContain("unknown agent");
  });

  test("--at IS REQUIRED — this loop never reads a clock", () => {
    // The timestamp decides the record's ZetaId and therefore its path. Defaulting to `now` would
    // put the same logical cycle at different addresses on different machines.
    const missing = parseArgs(["--agent", "alexa"]);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toContain("never reads a clock");
  });

  test("an unparseable --at is refused", () => {
    expect(parseArgs(["--agent", "alexa", "--at", "yesterday"]).ok).toBe(false);
  });

  test("a well-formed invocation parses, and --root defaults", () => {
    const r = parseArgs(["--agent", "alexa", "--at", AT, "--choose", "3", "--json"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.args.agent).toBe("alexa");
    expect(r.args.choose).toBe("3");
    expect(r.args.json).toBe(true);
    expect(r.args.root).toBe(".agent-loop");
  });
});

describe("the choice cannot leave the menu", () => {
  const menu = generateMenu({
    state: idle,
    snapshot: emptySurface(AT),
    candidates: [],
    namedDeps: [],
    heartbeatLane: "operational",
  });

  test("an index picks that option", () => {
    const r = resolveChoice(menu, "0");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.option).toEqual(menu[0]!);
  });

  test("AN OUT-OF-RANGE INDEX IS CLAMPED, and the clamp is reported", () => {
    const high = resolveChoice(menu, "999");
    expect(high.ok).toBe(true);
    if (high.ok) {
      expect(high.option).toEqual(menu[menu.length - 1]!);
      expect(high.clamped).toBe(true);
    }
    const low = resolveChoice(menu, "-4");
    if (low.ok) expect(low.option).toEqual(menu[0]!);
  });

  test("A TAG NOT ON THE MENU IS REFUSED, never substituted", () => {
    // An index is a position and positions can be out of range; a tag is a request for a specific
    // thing, and quietly giving a different one answers a question nobody asked.
    const r = resolveChoice(menu, "PickWork");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not on this menu");
  });

  test("a tag that IS on the menu is taken exactly", () => {
    const r = resolveChoice(menu, "EnterFreeTime");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.option.tag).toBe("EnterFreeTime");
  });

  test("an empty menu is refused rather than indexed into — and says WHY", () => {
    const r = resolveChoice([], "0");
    expect(r.ok).toBe(false);
    // Asserting only `ok === false` would pass even if the guard vanished, because indexing an
    // empty array yields undefined and the clamp then fails for an unrelated reason. The REASON is
    // what distinguishes the guard from the accident.
    if (!r.ok) expect(r.reason).toContain("the menu is empty");
  });
});

describe("one cycle", () => {
  test("no --choose shows the menu and RECORDS NOTHING", () => {
    // Nothing happened; writing a record saying so would put a cycle in the history the agent
    // never took.
    const out = runCycle(cycleInput());
    expect(out.menu.length).toBeGreaterThan(0);
    expect(out.record).toBeUndefined();
    expect(out.chosen).toBeUndefined();
  });

  test("a choice transitions, closes the cycle, and produces a record", () => {
    const out = runCycle(cycleInput({ choose: "PressPause" }));
    expect(out.chosen?.tag).toBe("PressPause");
    expect(out.state.tag).toBe("Paused");
    expect(out.record?.cycle).toBe(1);
    expect(out.record?.state.tag).toBe("Paused");
    expect(out.record?.nonCoercive).toBe(true);
  });

  test("THE CYCLE CLOSES — chosen rest returns the agent to Idle", () => {
    // `cycleClose` is what makes free time a mode rather than a trap. Skipping it leaves the agent
    // in `FreeTime` forever, and the next cycle resumes into a state it never chose to stay in.
    const out = runCycle(cycleInput({ choose: "EnterFreeTime" }));
    expect(out.chosen?.tag).toBe("EnterFreeTime");
    expect(out.state.tag).toBe("Idle");
    expect(out.record?.state.tag).toBe("Idle");
  });

  test("but OPEN-ENDED EXPLORATION survives the cycle boundary", () => {
    // The one free mode `cycleClose` deliberately keeps alive, so this pins the difference rather
    // than just the closing.
    const out = runCycle(cycleInput({ choose: "EnterOpenEndedExploration" }));
    expect(out.state.tag).toBe("FreeTime");
  });

  test("the menu is checked for coercion every cycle, and the verdict is recorded", () => {
    const out = runCycle(cycleInput({ choose: "EnterFreeTime" }));
    expect(out.nonCoercive).toBe(true);
    expect(isNonCoercive(out.menu)).toBe(true);
    expect(out.record?.nonCoercive).toBe(true);
  });

  test("THE CONTEXT CARRIES THE CYCLE — the record and the state agree", () => {
    // `transition` preserves the context by design, so nothing advanced it and `context.cycle` sat
    // at 0 forever while the record beside it counted properly: two records of one fact.
    const out = runCycle(cycleInput({ state: withCycle(idle, 5), cycle: 5, choose: "EnterFreeTime" }));
    expect(out.record?.cycle).toBe(5);
    expect(out.record?.state.context.cycle).toBe(5);
  });

  test("withCycle preserves everything else about the state", () => {
    const paused: AgentState = { tag: "Paused", context: idle.context, reason: "break" };
    const moved = withCycle(paused, 9);
    expect(moved.tag).toBe("Paused");
    expect(moved.context.cycle).toBe(9);
    expect(moved.context.agent).toBe("alexa");
    if (moved.tag === "Paused") expect(moved.reason).toBe("break");
  });
});

describe("RESUME — the agent holds no state", () => {
  test("a second invocation picks up exactly where the first left off", () => {
    const root = tempRoot();
    const argv = (at: string, ...rest: string[]) => ["--agent", "alexa", "--root", root, "--at", at, ...rest];

    expect(main(argv(AT, "--choose", "PressPause"))).toBe(0);
    // A different call, reading only the store: the agent is paused.
    expect(currentState(root, "alexa")?.tag).toBe("Paused");
    expect(nextCycleNumber(root, "alexa")).toBe(2);

    expect(main(argv("2026-09-03T10:05:00.000Z", "--choose", "ResumeFromPause"))).toBe(0);
    expect(currentState(root, "alexa")?.tag).toBe("Idle");

    const history = readHistory(root, "alexa");
    expect(history.map((r) => r.chosen?.tag)).toEqual(["PressPause", "ResumeFromPause"]);
    expect(history.map((r) => r.cycle)).toEqual([1, 2]);
  });

  test("A PAUSED AGENT IS OFFERED ONLY THE WAY OUT, across a process boundary", () => {
    // The noise rule has to survive serialisation: the second invocation knows nothing except what
    // is on disk, and it must still refuse to offer work to a paused agent.
    const root = tempRoot();
    const argv = (at: string, ...rest: string[]) => ["--agent", "alexa", "--root", root, "--at", at, ...rest];
    main(argv(AT, "--choose", "PressPause"));

    const resumedState = currentState(root, "alexa");
    expect(resumedState?.tag).toBe("Paused");
    const menu = generateMenu({
      state: resumedState!,
      snapshot: emptySurface(AT),
      candidates: [],
      namedDeps: [],
      heartbeatLane: "operational",
    });
    expect(menu[0]?.tag).toBe("ResumeFromPause");
    expect(menu.some((o: MenuOption) => o.tag === "PickWork")).toBe(false);
    expect(isNonCoercive(menu)).toBe(true);
  });

  test("re-running the SAME cycle does not duplicate history", () => {
    const root = tempRoot();
    const argv = ["--agent", "alexa", "--root", root, "--at", AT, "--choose", "EnterFreeTime"];
    main(argv);
    const after = readHistory(root, "alexa").length;
    // A second identical invocation advances the cycle number, so it is a NEW cycle rather than a
    // duplicate of the first — and the store still holds each exactly once.
    main(argv);
    const history = readHistory(root, "alexa");
    expect(history.length).toBe(after + 1);
    expect(new Set(history.map((r) => r.cycle)).size).toBe(history.length);
  });
});

describe("A COERCIVE MENU IS ITS OWN EXIT CODE", () => {
  // Reachable only through the embedding seam, because `generateMenu` cannot produce a coercive
  // menu — which is exactly why the seam exists: without it this guard could never fire, and a
  // check that cannot fail is not a check.
  const stripFreeTime = (m: readonly MenuOption[]) => m.filter((o) => o.tag !== "EnterFreeTime");

  test("exit 2, distinct from a bad argument's 1", () => {
    const root = tempRoot();
    const code = main(["--agent", "alexa", "--root", root, "--at", AT, "--choose", "0"], {
      menuPolicy: stripFreeTime,
    });
    expect(code).toBe(2);
    expect(main(["--agent", "alexa"])).toBe(1);
  });

  test("the coercion is RECORDED, so it is auditable afterwards", () => {
    const root = tempRoot();
    main(["--agent", "alexa", "--root", root, "--at", AT, "--choose", "0"], { menuPolicy: stripFreeTime });
    const history = readHistory(root, "alexa");
    expect(history).toHaveLength(1);
    expect(history[0]?.nonCoercive).toBe(false);
  });

  test("a policy that narrows WORK but leaves the free modes is not coercive", () => {
    const root = tempRoot();
    const code = main(["--agent", "alexa", "--root", root, "--at", AT, "--choose", "EnterFreeTime"], {
      menuPolicy: (m) => m.filter((o) => o.tag !== "PickWork"),
    });
    expect(code).toBe(0);
  });
});

describe("exit codes distinguish the failures", () => {
  test("a refused argument is 1", () => {
    expect(main(["--agent", "alexa"])).toBe(1);
    expect(main([])).toBe(1);
  });

  test("a tag not on the menu is 1, and nothing is recorded", () => {
    const root = tempRoot();
    expect(main(["--agent", "alexa", "--root", root, "--at", AT, "--choose", "PickWork"])).toBe(1);
    expect(readHistory(root, "alexa")).toEqual([]);
  });

  test("a successful cycle and a bare menu are both 0", () => {
    const root = tempRoot();
    expect(main(["--agent", "alexa", "--root", root, "--at", AT])).toBe(0);
    expect(main(["--agent", "alexa", "--root", root, "--at", AT, "--choose", "0"])).toBe(0);
  });

  test("--history is 0 even for an agent that has never run", () => {
    expect(main(["--agent", "vera", "--root", tempRoot(), "--at", AT, "--history"])).toBe(0);
  });
});

describe("the empty surface is the ABSENCE of a surface, not a claim", () => {
  test("every field is zero or empty, and it carries the supplied time", () => {
    const s = emptySurface(AT);
    expect(s.snapshotIso).toBe(AT);
    expect(s.currentDora.deploymentCount).toBe(0);
    expect(s.hotTrajectories).toEqual([]);
    expect(s.perAgentRatios).toEqual({});
  });

  test("with no candidates the menu still leaves a way out", () => {
    // No work is not a cage.
    const out = runCycle(cycleInput());
    expect(out.nonCoercive).toBe(true);
    expect(out.menu.some((o) => o.tag === "PickWork")).toBe(false);
  });
});
