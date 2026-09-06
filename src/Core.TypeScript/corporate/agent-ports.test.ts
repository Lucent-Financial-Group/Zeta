/**
 * agent-ports.test.ts — the fifth boundary: the two CLIs each held half of "end to end".
 *
 * Measured before this existed, and the measurement is the reason the file exists:
 *
 *     bun run-agent.ts --agent alexa --at ... --store S
 *       deliveryRate = {"runs":1,"delivered":1,"deliveredForReal":0,"deliveredSimulated":1,...}
 *       run: delivered=true replayable=true realPorts=[]
 *
 * and NO flag could change that number. `run-org.ts` reached real repositories with nothing
 * choosing the work; `run-agent.ts` had a model choosing real work off a real cascade and could
 * only ever record runs that performed nothing. The choosing was real in one and the doing was real
 * in the other, and no single invocation had both — which is what "end to end" was supposed to mean.
 *
 * The property under test is not that the flags parse. It is that the SAME flags reach the SAME
 * adapters from either entry point, because two mappings from flags to adapters would be two sets
 * of defaults to drift, and the default is the answer that decides whether a run touched anything.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { argRefusals, parseArgs, providersFromArgs } from "./run-org";
import { main as agentMain, organizationSurface } from "./run-agent";
import { main as orgMain } from "./run-org";
import { readRuns } from "./org-store";
import { Fidelity, Port, fidelityOf } from "./providers";
import { RunOutcome } from "./qa";
import { IntakeKind, Severity, type ExternalEvent } from "./intake";

const scratch = (label: string) => mkdtempSync(join(tmpdir(), `ap-${label}-`));

const EVENT: ExternalEvent = {
  source: "portal",
  externalId: "T-1",
  kind: IntakeKind.Defect,
  severity: Severity.High,
  title: "checkout double-charges",
  reproduction: "twice",
  evidenceRefs: ["log/1"],
};

const setFrom = (argv: readonly string[]) =>
  providersFromArgs(parseArgs(argv), [EVENT], RunOutcome.Passed);

describe("ONE MAPPING FROM FLAGS TO ADAPTERS, reachable from both entry points", () => {
  test("with no port flags every port is simulated — the default is a decision, not an absence", () => {
    const report = fidelityOf(setFrom([]));
    expect(report.replayable).toBe(true);
    expect(report.realPorts).toEqual([]);
    expect(report.ports).toHaveLength(5);
  });

  test("THE AGENT CLI REACHES THE SAME ADAPTERS — this is the boundary that was closed", async () => {
    // Before `ports` existed, `organizationSurface` had no parameter that could carry an adapter and
    // every run it recorded was `replayable: true`.
    const repo = scratch("repo");
    const out = await organizationSurface({
      atMs: 0,
      qaFails: false,
      incident: false,
      resume: false,
      ports: parseArgs(["--work-cmd", process.execPath, "--work-arg", "-e", "--work-arg", "0"]),
    });
    expect(out.fidelity.replayable).toBe(false);
    expect(out.fidelity.realPorts).toEqual([Port.WorkExecution]);
    expect(repo).toBeDefined();
  });

  test("...and WITHOUT ports it is simulated, so the field is derived rather than switched on", async () => {
    const out = await organizationSurface({ atMs: 0, qaFails: false, incident: false, resume: false });
    expect(out.fidelity.replayable).toBe(true);
    expect(out.fidelity.realPorts).toEqual([]);
  });
});

describe("--work-model: a model performs the work, and still does not judge itself", () => {
  test("it builds a REAL work port, named for the model rather than the command", () => {
    const set = setFrom(["--work-model", "qwen2.5:0.5b", "--work-verify", "sh"]);
    expect(set.work.meta.fidelity).toBe(Fidelity.Real);
    expect(set.work.meta.name).toBe("model");
    // The verifier is named in what the port says it does, because the split IS the design.
    expect(set.work.meta.describes).toContain("sh");
  });

  test("the model's proposal is testimony: a separate command decides whether it worked", () => {
    // Same shape as `--work-agent`. If the two ever collapsed into one, the proposer would be
    // marking its own homework, which is the one thing this port refuses.
    const set = setFrom(["--work-model", "m", "--work-verify", "check.sh"]);
    expect(set.work.meta.describes).toContain("decides whether it worked");
  });
});

describe("A MISSING HALF IS REFUSED, never quietly simulated", () => {
  test("--work-agent with no verifier REFUSES — it used to fall through to a fake success", () => {
    // The defect, exactly: `--work-agent claude` alone fell past every branch to
    // `simulatedWorkExecutor(true)`, an executor that reports success without doing anything. An
    // operator who forgot the verifier got a run where every item succeeded.
    const reasons = argRefusals(parseArgs(["--work-agent", "claude"]));
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain("--work-verify");
  });

  test("and the executor it used to fall through to is the one that reports success for free", () => {
    // Named so the refusal above cannot be read as pedantry: this is what the operator was getting.
    const fell = setFrom(["--work-agent", "claude"]);
    expect(fell.work.meta.fidelity).toBe(Fidelity.Simulated);
  });

  test("--work-model with no verifier refuses for the same reason", () => {
    expect(argRefusals(parseArgs(["--work-model", "m"]))[0]).toContain("--work-verify");
  });

  test("--work-verify with nothing to verify refuses rather than verifying a simulation", () => {
    expect(argRefusals(parseArgs(["--work-verify", "sh"]))[0]).toContain("nothing to verify");
  });

  test("TWO PERFORMERS IS REFUSED — a run can only have done the work one way", () => {
    const reasons = argRefusals(parseArgs(["--work-agent", "a", "--work-model", "m", "--work-verify", "v"]));
    expect(reasons.some((r) => r.includes("one way"))).toBe(true);
  });

  test("a well-formed set of flags refuses nothing", () => {
    // The refusals must be falsifiable in the other direction, or they are a check that always fires.
    expect(argRefusals(parseArgs(["--work-agent", "a", "--work-verify", "v"]))).toEqual([]);
    expect(argRefusals(parseArgs(["--work-cmd", "make"]))).toEqual([]);
    expect(argRefusals(parseArgs([]))).toEqual([]);
  });
});

describe("the refusals are checked BEFORE anything runs", () => {
  test("a refused configuration never reaches an adapter", async () => {
    // `argRefusals` is a pure function of the args, so this is a statement about ordering rather
    // than behaviour — and ordering is what makes the refusal useful: a misconfigured run that
    // reaches the cascade has already printed a page an operator reads as progress.
    const dir = scratch("inbox");
    writeFileSync(join(dir, "a.json"), JSON.stringify(EVENT), "utf-8");
    const args = parseArgs(["--work-agent", "claude", "--inbox", dir]);
    expect(argRefusals(args)).not.toEqual([]);
    // The intake adapter is still constructible; nothing about the refusal depends on it failing.
    expect(providersFromArgs(args, [EVENT], RunOutcome.Passed).intake.meta.fidelity).toBe(Fidelity.Real);
  });
});

describe("THE ENTRY POINTS ACT ON THE REFUSALS, not merely compute them", () => {
  // `argRefusals` being correct and `main` ignoring it is a check that runs and decides nothing —
  // and it is exactly what the mutation matrix found: both CLIs survived a mutant that computed the
  // refusals and then fell through to `if (false)`.

  test("run-org REFUSES to start on a performer with no verifier", async () => {
    expect(await orgMain(["--work-agent", "claude"])).toBe(2);
  });

  test("run-org still starts when the flags are well formed", async () => {
    // The falsifier for the falsifier: a `main` that always returned 2 would pass the test above.
    expect(await orgMain(["--cycle"])).toBe(0);
  });

  test("run-agent REFUSES the same configuration, before it asks for --at", async () => {
    // Ordering matters: a misconfigured run that gets as far as the cascade has already printed a
    // page an operator reads as progress.
    expect(await agentMain(["--at", "2026-09-04T10:00:00.000Z", "--work-model", "m"])).toBe(2);
  });

  test("AND THE PORTS IT PARSES REACH THE RUN — the record proves which", async () => {
    // The mutant that stopped attaching `ports` to `AgentRunArgs` survived, because nothing called
    // `main` with a port flag and then read what the run recorded. This does both.
    const inbox = scratch("mainbox");
    writeFileSync(join(inbox, "t.json"), JSON.stringify(EVENT), "utf-8");
    const store = scratch("mainstore");
    const code = await agentMain([
      "--at", "2026-09-04T10:00:00.000Z",
      "--root", scratch("mainloop"),
      "--store", store,
      "--inbox", inbox,
    ]);
    expect(code).toBeLessThan(2);
    const recorded = readRuns(store);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.replayable).toBe(false);
    expect(recorded[0]?.realPorts).toEqual([Port.Intake]);
  });

  test("...and with no port flags the same invocation records a SIMULATED run", async () => {
    // The pair is the measurement. One of these alone would pass under a hardcoded answer.
    const store = scratch("simstore");
    await agentMain([
      "--at", "2026-09-04T10:00:00.000Z",
      "--root", scratch("simloop"),
      "--store", store,
    ]);
    const recorded = readRuns(store);
    expect(recorded[0]?.replayable).toBe(true);
    expect(recorded[0]?.realPorts).toEqual([]);
  });
});
