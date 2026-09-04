/**
 * providers.test.ts — the ports, the registry, and the one claim this layer exists to protect.
 *
 * That claim: **a run cannot say it is replayable while touching something real.** `replayable` is
 * derived from the set, never declared, so the sentence a caller would most like to be able to
 * write by accident is unwritable.
 *
 * The second-most-important behaviour is a refusal: `resolve` never falls back to a simulated
 * adapter when a real one is missing. A silent fallback would let a run report work it never did.
 */

import { describe, expect, test } from "bun:test";
import {
  EMPTY_REGISTRY,
  Fidelity,
  fidelityOf,
  Port,
  providersFor,
  register,
  registerAll,
  requireReplayable,
  resolve,
  resolveSet,
  type IntakeSource,
  type ProviderSet,
  type WorkExecutor,
} from "./providers";
import {
  simulatedChangeControl,
  simulatedIntake,
  simulatedTestRunner,
  simulatedWorkExecutor,
} from "./adapters";
import { RunOutcome } from "./qa";
import { IntakeKind, Severity, type ExternalEvent } from "./intake";

const EVENT: ExternalEvent = {
  source: "portal",
  externalId: "T-1",
  kind: IntakeKind.Defect,
  severity: Severity.High,
  title: "t",
  reproduction: "twice",
  evidenceRefs: ["log/1"],
};

const simulatedSet = (): ProviderSet => ({
  intake: simulatedIntake([EVENT]),
  work: simulatedWorkExecutor(true),
  tests: simulatedTestRunner(new Map(), RunOutcome.Passed),
  change: simulatedChangeControl(),
});

/** A provider that claims to be real without doing anything — for the fidelity tests only. */
const realish = (): WorkExecutor => ({
  meta: { port: Port.WorkExecution, name: "realish", fidelity: Fidelity.Real, describes: "claims to be real" },
  execute: async (node) => ({
    ok: true,
    value: { workId: node.workId, succeeded: true, artifacts: [], summary: "s" },
    evidence: [],
  }),
});

describe("the registry", () => {
  test("a provider can be registered and resolved by port and name", () => {
    const r = register(EMPTY_REGISTRY, simulatedIntake([EVENT], "fixture"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const found = resolve<IntakeSource>(r.registry, Port.Intake, "fixture");
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.provider.meta.fidelity).toBe(Fidelity.Simulated);
  });

  test("A MISSING PROVIDER REFUSES — it never falls back to a simulation", () => {
    // The most dangerous thing this layer could do: substitute a simulated adapter for a real one
    // that is absent. The run would then report work it never performed.
    const r = register(EMPTY_REGISTRY, simulatedIntake([EVENT], "fixture"));
    if (!r.ok) throw new Error(r.reason);
    const missing = resolve(r.registry, Port.Intake, "jira");
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.reason).toContain("jira");
      // ...and it says what IS there, so the fix is obvious.
      expect(missing.reason).toContain("fixture");
    }
  });

  test("an empty registry says so rather than naming nothing", () => {
    const missing = resolve(EMPTY_REGISTRY, Port.WorkExecution, "anything");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toContain("none registered");
  });

  test("a DUPLICATE (port, name) is refused", () => {
    // Two adapters answering to one name means the one a caller gets depends on registration order,
    // and the run could use a simulation while its report names something real.
    const first = register(EMPTY_REGISTRY, simulatedIntake([EVENT], "same"));
    if (!first.ok) throw new Error(first.reason);
    const second = register(first.registry, simulatedIntake([], "same"));
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toContain("already registered");
  });

  test("the SAME name on a DIFFERENT port is fine — names are scoped to their port", () => {
    const r = registerAll(EMPTY_REGISTRY, [simulatedIntake([EVENT], "x"), simulatedWorkExecutor(true, "x")]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(resolve(r.registry, Port.Intake, "x").ok).toBe(true);
      expect(resolve(r.registry, Port.WorkExecution, "x").ok).toBe(true);
    }
  });

  test("an unnamed provider is refused", () => {
    expect(register(EMPTY_REGISTRY, simulatedIntake([EVENT], "  ")).ok).toBe(false);
  });

  test("registerAll stops at the first refusal rather than half-registering", () => {
    const r = registerAll(EMPTY_REGISTRY, [
      simulatedIntake([EVENT], "a"),
      simulatedIntake([EVENT], "a"),
      simulatedIntake([EVENT], "b"),
    ]);
    expect(r.ok).toBe(false);
  });

  test("providersFor lists a port's own adapters, and only those", () => {
    const r = registerAll(EMPTY_REGISTRY, [
      simulatedIntake([EVENT], "a"),
      simulatedIntake([], "b"),
      simulatedWorkExecutor(true, "w"),
    ]);
    if (!r.ok) throw new Error(r.reason);
    expect(providersFor(r.registry, Port.Intake).map((p) => p.meta.name)).toEqual(["a", "b"]);
    expect(providersFor(r.registry, Port.ChangeControl)).toEqual([]);
  });
});

describe("resolving a whole set", () => {
  const full = () => {
    const r = registerAll(EMPTY_REGISTRY, [
      simulatedIntake([EVENT], "fixture"),
      simulatedWorkExecutor(true, "assumed"),
      simulatedTestRunner(new Map(), RunOutcome.Passed, "planned"),
      simulatedChangeControl("in-memory"),
    ]);
    if (!r.ok) throw new Error(r.reason);
    return r.registry;
  };

  test("names resolve to a complete set", () => {
    const set = resolveSet(full(), { intake: "fixture", work: "assumed", tests: "planned", change: "in-memory" });
    expect(set.ok).toBe(true);
  });

  test("ONE missing name refuses the whole set — a partly-resolved set is not a set", () => {
    const set = resolveSet(full(), { intake: "fixture", work: "assumed", tests: "planned", change: "github" });
    expect(set.ok).toBe(false);
    if (!set.ok) expect(set.reason).toContain("github");
  });
});

describe("FIDELITY IS DERIVED, NEVER DECLARED", () => {
  test("an all-simulated set is replayable, and names no real ports", () => {
    const report = fidelityOf(simulatedSet());
    expect(report.replayable).toBe(true);
    expect(report.realPorts).toEqual([]);
    expect(report.ports).toHaveLength(4);
    for (const p of report.ports) expect(p.describes.length).toBeGreaterThan(5);
  });

  test("ONE real provider makes the whole run unreplayable, and it is named", () => {
    const report = fidelityOf({ ...simulatedSet(), work: realish() });
    expect(report.replayable).toBe(false);
    expect(report.realPorts).toEqual([Port.WorkExecution]);
  });

  test("requireReplayable REFUSES a set that touches something, and says which port", () => {
    // For a DST run or a golden comparison: finding this out from a diff is worse than being told.
    expect(requireReplayable(simulatedSet()).ok).toBe(true);
    const r = requireReplayable({ ...simulatedSet(), work: realish() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(Port.WorkExecution);
  });

  test("every port appears in the report — a set cannot hide one", () => {
    const ports = fidelityOf(simulatedSet()).ports.map((p) => p.port).sort();
    expect(ports).toEqual([Port.ChangeControl, Port.Intake, Port.TestExecution, Port.WorkExecution].sort());
  });
});
