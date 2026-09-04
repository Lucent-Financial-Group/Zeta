/**
 * corporate/providers.ts — the ports where the organization touches reality.
 *
 * ── WHAT WAS SIMULATED, AND WHY IT LOOKED REAL ───────────────────────────────
 * The register orchestrates faithfully and performs nothing. "Implementation" moved a state to
 * `done`; QA outcomes came from a configured fallback; gate verdicts were computed rather than
 * earned; the inbound event was a hardcoded fixture. None of that is wrong — a simulation is a
 * legitimate thing to have — but it was INDISTINGUISHABLE from the real thing at every call site,
 * which is the failure `.claude/rules/toy-is-free-metered-must-be-earned.md` names: unlabelled work
 * reads as real by default.
 *
 * So this is not "add the real implementations". It is: make the boundary a declared, typed,
 * labelled seam, so a real adapter can be dropped in AND so a run can say which of its capabilities
 * actually touched anything.
 *
 * ── FIDELITY IS THE POINT ────────────────────────────────────────────────────
 * Every provider declares whether it is `simulated` or `real`, and a `ProviderSet` derives one
 * consequence from that: **a run that used a real provider is not DST-replayable.** `qa.ts` already
 * had a `TestExecutor` port and no way to say whether it had run anything, so a suite of planned
 * outcomes and a suite of executed ones produced identical-looking reports. `replayable` is the
 * difference, computed rather than asserted.
 *
 * ── AN UNREGISTERED PORT REFUSES; IT NEVER FALLS BACK ────────────────────────
 * The single most dangerous thing this layer could do is silently substitute a simulated provider
 * when a real one was asked for and not found. A run would then report work it never did. So
 * `resolve` REFUSES, and choosing the simulated adapter is something a caller does on purpose and
 * can be seen doing.
 *
 * ── NONINTERFERENCE ──────────────────────────────────────────────────────────
 * §13: entropy and influence cross only through declared, metered channels. A provider IS that
 * channel — the only place the register reaches a filesystem, a network, or a shell. Everything
 * else stays pure, so the parts that are not providers remain replayable whatever the providers do.
 *
 * ── NO CLASSES ───────────────────────────────────────────────────────────────
 * `.claude/rules/interfaces-free-classes-earned-under-rules.md`: interfaces are free, a class must
 * be earned. A registry is a value and its operations are functions over that value — nothing here
 * needs instance state, so nothing here has any.
 */

import type { ExternalEvent } from "./intake";
import type { CascadeNode } from "./goal-cascade";
import type { RunOutcome, TestCase } from "./qa";
import type { GateKind, GateOutcome } from "./quality-gate";
import type { EvidenceRef } from "./discussion-anchor";

/** Whether a provider actually touches anything outside this process. */
export const Fidelity = {
  /** Deterministic, replayable, touches nothing. The register's own default. */
  Simulated: "simulated",
  /** Reaches a filesystem, a network, a shell, or a service. Replay is off the table. */
  Real: "real",
} as const;

export type Fidelity = (typeof Fidelity)[keyof typeof Fidelity];

/** The seams. One per thing the organization cannot do by thinking about it. */
export const Port = {
  /** Where inbound work comes from. */
  Intake: "intake",
  /** What actually performs a work item. */
  WorkExecution: "work_execution",
  /** What runs the tests. */
  TestExecution: "test_execution",
  /**
   * Who decides a quality gate.
   *
   * The last port added, and the one whose absence was loudest. Six of the seven gates returned
   * `Approved` with the reason "reviewed" — a constant — while `fidelityOf` reported four ports and
   * said nothing about it. So a run printed `DST-replayable: yes`, named four honest adapters, and
   * rubber-stamped its own architecture review in silence. That is exactly the failure this whole
   * layer exists to prevent, sitting one layer above where it was fixed.
   */
  Review: "review",
  /** What opens, reviews and merges a change. */
  ChangeControl: "change_control",
} as const;

export type Port = (typeof Port)[keyof typeof Port];

export interface ProviderMeta {
  readonly port: Port;
  /** Unique within its port. The name a caller resolves by. */
  readonly name: string;
  readonly fidelity: Fidelity;
  /** One line: what this adapter actually does. Shown in the run's own report. */
  readonly describes: string;
}

/** A result shape shared by every port, so a provider can REFUSE rather than throw or lie. */
export type PortResult<T> =
  | { readonly ok: true; readonly value: T; readonly evidence: readonly EvidenceRef[] }
  | { readonly ok: false; readonly reason: string };

// ─── The ports ──────────────────────────────────────────────────────────────

export interface IntakeSource {
  readonly meta: ProviderMeta;
  /** Everything waiting to come in. Empty is a normal answer, not an error. */
  poll(): Promise<PortResult<readonly ExternalEvent[]>>;
}

/** What an attempt at a work item produced. */
export interface WorkOutcome {
  readonly workId: string;
  readonly succeeded: boolean;
  /** What changed, if anything — paths, refs, an identifier the next port can use. */
  readonly artifacts: readonly string[];
  /** Why, in a sentence. Carried into the trace. */
  readonly summary: string;
}

export interface WorkExecutor {
  readonly meta: ProviderMeta;
  execute(node: CascadeNode, ctx: { readonly branch: string }): Promise<PortResult<WorkOutcome>>;
}

export interface TestRunner {
  readonly meta: ProviderMeta;
  run(
    testCase: TestCase,
    ctx: { readonly branch: string },
  ): Promise<PortResult<{ readonly outcome: RunOutcome }>>;
}

/** What a reviewer is asked to judge. */
export interface ReviewRequest {
  readonly gate: GateKind;
  readonly workId: string;
  /**
   * What the organization already knows about this work — QA runs, traces, documents.
   *
   * Supplied so a reviewer can judge from evidence rather than from a title. A reviewer that
   * ignores it is making a weaker judgement, and that is its business; a runtime that withheld it
   * would be forcing one.
   */
  readonly evidence: readonly EvidenceRef[];
}

export interface ReviewVerdict {
  readonly outcome: GateOutcome;
  /** Why. Carried into the `GateEvaluation`, so a verdict is never a bare word. */
  readonly reason: string;
}

/**
 * Who decides a gate.
 *
 * A refusal is NOT an approval, and the runtime must treat it as blocking. "Nobody was available to
 * review this" and "this was reviewed and approved" are the two sentences an organization must
 * never confuse, and the failing-closed direction is the only safe default.
 */
export interface ReviewPort {
  readonly meta: ProviderMeta;
  review(request: ReviewRequest): Promise<PortResult<ReviewVerdict>>;
}

/** The change a piece of work becomes. Mirrors the lifecycle `change-control.ts` already models. */
export interface ChangeHandle {
  readonly changeId: string;
  readonly branch: string;
  readonly url?: string;
}

export interface ChangeControlPort {
  readonly meta: ProviderMeta;
  open(node: CascadeNode, ctx: { readonly branch: string }): Promise<PortResult<ChangeHandle>>;
  merge(handle: ChangeHandle): Promise<PortResult<ChangeHandle>>;
}

export type AnyProvider = IntakeSource | WorkExecutor | TestRunner | ReviewPort | ChangeControlPort;

// ─── The registry ───────────────────────────────────────────────────────────

export interface ProviderRegistry {
  readonly providers: readonly AnyProvider[];
}

export const EMPTY_REGISTRY: ProviderRegistry = { providers: [] };

export type RegistryResult =
  | { readonly ok: true; readonly registry: ProviderRegistry }
  | { readonly ok: false; readonly reason: string };

/**
 * Add a provider.
 *
 * Refuses a duplicate `(port, name)`. Two adapters answering to one name means the one a caller
 * gets depends on registration order, and a run could use a simulated adapter while its report
 * names a real one.
 */
export function register(registry: ProviderRegistry, provider: AnyProvider): RegistryResult {
  const { port, name } = provider.meta;
  if (name.trim() === "") return { ok: false, reason: `a ${port} provider needs a name` };
  if (registry.providers.some((p) => p.meta.port === port && p.meta.name === name)) {
    return { ok: false, reason: `a ${port} provider named '${name}' is already registered` };
  }
  return { ok: true, registry: { providers: [...registry.providers, provider] } };
}

export function registerAll(registry: ProviderRegistry, providers: readonly AnyProvider[]): RegistryResult {
  let current = registry;
  for (const provider of providers) {
    const r = register(current, provider);
    if (!r.ok) return r;
    current = r.registry;
  }
  return { ok: true, registry: current };
}

export type ResolveResult<T> =
  | { readonly ok: true; readonly provider: T }
  | { readonly ok: false; readonly reason: string };

/**
 * Find a provider by port and name.
 *
 * REFUSES when it is not there. It does not fall back to a simulated adapter, and that is the most
 * important line in this file: a silent fallback would let a run configured for real work report
 * work it never performed, with nothing in the output to show for it.
 */
export function resolve<T extends AnyProvider>(
  registry: ProviderRegistry,
  port: Port,
  name: string,
): ResolveResult<T> {
  const found = registry.providers.find((p) => p.meta.port === port && p.meta.name === name);
  if (found === undefined) {
    const available = registry.providers.filter((p) => p.meta.port === port).map((p) => p.meta.name);
    return {
      ok: false,
      reason: `no ${port} provider named '${name}'` + (available.length === 0 ? " (none registered)" : ` (have: ${available.join(", ")})`),
    };
  }
  return { ok: true, provider: found as T };
}

/** Everything registered for a port, for a caller that wants to show the choice. */
export function providersFor(registry: ProviderRegistry, port: Port): readonly AnyProvider[] {
  return registry.providers.filter((p) => p.meta.port === port);
}

// ─── The resolved set a run uses ────────────────────────────────────────────

export interface ProviderSet {
  readonly intake: IntakeSource;
  readonly work: WorkExecutor;
  readonly tests: TestRunner;
  readonly review: ReviewPort;
  readonly change: ChangeControlPort;
}

export type ProviderSetResult =
  | { readonly ok: true; readonly set: ProviderSet }
  | { readonly ok: false; readonly reason: string };

/** Resolve a whole set by name. The first refusal wins — a partly-resolved set is not a set. */
export function resolveSet(
  registry: ProviderRegistry,
  names: {
    readonly intake: string;
    readonly work: string;
    readonly tests: string;
    readonly review: string;
    readonly change: string;
  },
): ProviderSetResult {
  const intake = resolve<IntakeSource>(registry, Port.Intake, names.intake);
  if (!intake.ok) return intake;
  const work = resolve<WorkExecutor>(registry, Port.WorkExecution, names.work);
  if (!work.ok) return work;
  const tests = resolve<TestRunner>(registry, Port.TestExecution, names.tests);
  if (!tests.ok) return tests;
  const review = resolve<ReviewPort>(registry, Port.Review, names.review);
  if (!review.ok) return review;
  const change = resolve<ChangeControlPort>(registry, Port.ChangeControl, names.change);
  if (!change.ok) return change;
  return {
    ok: true,
    set: {
      intake: intake.provider,
      work: work.provider,
      tests: tests.provider,
      review: review.provider,
      change: change.provider,
    },
  };
}

export interface FidelityReport {
  /** Every port, with the adapter chosen and what it is. */
  readonly ports: readonly ProviderMeta[];
  /** True only when EVERY provider is simulated. */
  readonly replayable: boolean;
  /** The ports that touched something real. Empty on a replayable run. */
  readonly realPorts: readonly Port[];
}

/**
 * What this run's providers were.
 *
 * `replayable` is DERIVED from the set rather than declared by the caller. A run that reached a
 * network and called itself deterministic would be the exact claim this whole layer exists to make
 * impossible to state by accident.
 */
export function fidelityOf(set: ProviderSet): FidelityReport {
  const ports = [set.intake.meta, set.work.meta, set.tests.meta, set.review.meta, set.change.meta];
  const realPorts = ports.filter((m) => m.fidelity === Fidelity.Real).map((m) => m.port);
  return { ports, replayable: realPorts.length === 0, realPorts };
}

/**
 * Refuse a set that cannot support the determinism a caller requires.
 *
 * For a DST run, or any run whose output is being compared against a golden expectation: a real
 * provider makes the comparison meaningless, and finding that out from a diff is worse than being
 * told up front.
 */
export function requireReplayable(set: ProviderSet): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const report = fidelityOf(set);
  if (report.replayable) return { ok: true };
  return {
    ok: false,
    reason: `this run needs to be replayable, and these port(s) are real: ${report.realPorts.join(", ")}`,
  };
}
