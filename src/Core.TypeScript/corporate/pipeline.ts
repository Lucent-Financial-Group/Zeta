/**
 * pipeline.ts — the delivery process as a VALUE you compose, not a constant the runtime hardcodes.
 *
 * ── THE DEFECT THIS EXISTS FOR ───────────────────────────────────────────────
 * `runOrgRuntime` evaluated all thirteen gates and THEN performed the work:
 *
 *     runGateChain()   line 1199    every gate evaluated
 *     work.execute()   line 1299    the work performed
 *
 * So `implementation_review`, `qa_uat` and `adversarial_review` approved an implementation that did
 * not exist yet, and `runtime_validation` was decided by test runs that executed before the code was
 * written. The chain was ordered, owned and unforgeable — and it was reviewing nothing. That was
 * already wrong at seven gates; extending to thirteen made it obvious.
 *
 * ── A PHASE PAIRS A PRODUCER WITH THE GATE THAT JUDGES IT ────────────────────
 * The fix is not "call `execute` earlier". A chain of thirteen review gates and ONE producer can
 * only ever be wrong somewhere, because most phases produce something a later phase argues about:
 * grooming produces a context, design produces a document, the adversarial pass produces findings,
 * implementation produces code. So a phase is a pair, and the pipeline is a list of them:
 *
 *     produce (if this phase produces) -> evaluate the gate -> next phase
 *
 * The artifact's references become the gate's `evidenceRefs`, which is what makes evidence a
 * BY-PRODUCT of doing the work rather than a field somebody fills in. A phase with no producer is a
 * pure judgement — the gate weighs what already exists — and that is a legitimate shape, not a hole.
 *
 * ── PLUGGABLE, WHICH IS THE POINT ────────────────────────────────────────────
 * A `Pipeline` is data. Reorder the phases, drop one, add one, swap a producer for a different
 * adapter, or hand in a three-phase pipeline for a spike — all without touching the runtime. What
 * the runtime keeps is the part that must not be negotiable: gates are crossed in the pipeline's
 * order, each by an authorized hat that did not do the work.
 *
 * `validatePipeline` is what stops that flexibility becoming a way to skip a control by accident:
 * a duplicate phase, or one naming a gate twice, is refused rather than silently reordering the
 * chain. What it deliberately does NOT require is completeness — a pipeline may legitimately omit
 * gates, and saying so out loud is better than a check that pretends every process is this one.
 */

import type { CascadeNode } from "./goal-cascade";
import type { ChangeHandle, PortResult, ProviderMeta } from "./providers";
import { evaluateGate, gateOwners, GateKind, ORDERED_GATES, type GateEvaluation, type GateOutcome } from "./quality-gate";
import type { OrgChart, OrgHat } from "./org-chart";
import type { OrgChooser } from "./org-decision";

/** What a phase produced, and the references a gate can then judge it by. */
export interface Artifact {
  /**
   * Where the thing IS — a path, a URL, a commit, a transcript id.
   *
   * These become the gate's `evidenceRefs`. A producer that returns none has produced nothing a
   * reviewer can look at, which is a fact worth carrying rather than smoothing over.
   */
  readonly refs: readonly string[];
  /** One line for the trace. Never the evidence itself. */
  readonly summary: string;
}

/** Everything a producer is given. The change is open by the time any producer runs. */
export interface PhaseContext {
  readonly branch: string;
  /** The change's own checkout, when the adapter gives each change one. */
  readonly workdir?: string;
  /** What earlier phases produced, keyed by their gate — so a phase can build on the last. */
  readonly priorArtifacts: ReadonlyMap<GateKind, Artifact>;
}

/**
 * Something that MAKES the thing a gate will judge.
 *
 * A port like the other five: it carries `meta`, so a producer is labelled real or simulated and
 * shows up in the run's fidelity report. A phase whose producer is simulated has not produced
 * anything, and the run says so rather than the gate's approval implying otherwise.
 */
export interface ProducerPort {
  readonly meta: ProviderMeta;
  produce(node: CascadeNode, ctx: PhaseContext): Promise<PortResult<Artifact>>;
}

export interface Phase {
  readonly gate: GateKind;
  /**
   * What produces this phase's artifact. ABSENT means a judgement-only phase.
   *
   * Optional rather than a null producer, because "nothing is produced here" and "something was
   * produced and it was empty" are different facts and a null object would erase the difference.
   */
  readonly produce?: ProducerPort;
}

export type Pipeline = readonly Phase[];

/** The gates this pipeline crosses, in its own order. Derived, so the two cannot disagree. */
export function gatesOf(pipeline: Pipeline): readonly GateKind[] {
  return pipeline.map((p) => p.gate);
}

export function phaseFor(pipeline: Pipeline, gate: GateKind): Phase | undefined {
  return pipeline.find((p) => p.gate === gate);
}

export type PipelineCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Refuse a pipeline that cannot mean what it says.
 *
 * TWO rules, and the restraint is deliberate:
 *
 *   - a gate may appear at most ONCE. Twice makes "the gates are crossed in order" ambiguous, and
 *     `nextLegalGate` would return the first occurrence forever.
 *   - a pipeline may not be EMPTY. An empty process delivers by having nothing to cross, which is
 *     the vacuity class expressed as configuration.
 *
 * Completeness is NOT required. A pipeline that omits gates is a real thing — a spike, a hotfix
 * lane, a process that genuinely does not do UAT — and refusing it would be this module deciding
 * what every organization's process must be. What the run reports instead is which gates its
 * pipeline covers, so an omission is visible rather than assumed away.
 */
export function validatePipeline(pipeline: Pipeline): PipelineCheck {
  if (pipeline.length === 0) {
    return { ok: false, reason: "a pipeline with no phases delivers by having nothing to cross" };
  }
  const seen = new Set<GateKind>();
  for (const phase of pipeline) {
    if (seen.has(phase.gate)) {
      return { ok: false, reason: `'${phase.gate}' appears twice; a gate is crossed once` };
    }
    seen.add(phase.gate);
  }
  return { ok: true };
}

/** Gates in `ORDERED_GATES` that this pipeline does not cross. Reported, never silently allowed. */
export function gatesOmittedBy(pipeline: Pipeline): readonly GateKind[] {
  const covered = new Set(gatesOf(pipeline));
  return ORDERED_GATES.filter((g) => !covered.has(g));
}

/**
 * The default process: every gate in the canonical order, producers left to the composition root.
 *
 * Producers are attached by whoever wires the run — `run-org.ts` and the tests — rather than baked
 * in here, because a producer is an ADAPTER and this module is the shape. Baking them in would make
 * the default pipeline drag a dependency on every adapter into anything that imports the shape.
 */
export const DEFAULT_PIPELINE: Pipeline = ORDERED_GATES.map((gate) => ({ gate }));

/**
 * The same pipeline with producers attached for the gates that make something.
 *
 * A helper rather than a second constant: the caller supplies the adapters it has, and gates it
 * has no producer for stay judgement-only instead of silently getting a stand-in.
 */
export function withProducers(
  pipeline: Pipeline,
  producers: ReadonlyMap<GateKind, ProducerPort>,
): Pipeline {
  return pipeline.map((phase) => {
    const produce = producers.get(phase.gate);
    return produce === undefined ? phase : { ...phase, produce };
  });
}

/** What a producer failing does to the phase — the same two-way split escalation uses. */
export interface PhaseOutcome {
  readonly gate: GateKind;
  readonly produced: Artifact | undefined;
  /** Set when a producer refused. The gate is NOT evaluated in that case. */
  readonly productionRefusal: string | undefined;
}

/** The change handle a phase context is built from, so producers can reach the checkout. */
export function contextFrom(
  handle: ChangeHandle | undefined,
  priorArtifacts: ReadonlyMap<GateKind, Artifact>,
): PhaseContext {
  return {
    branch: handle?.branch ?? "(no change open)",
    ...(handle?.workdir === undefined ? {} : { workdir: handle.workdir }),
    priorArtifacts,
  };
}

// ─── Walking the pipeline ───────────────────────────────────────────────────

export interface PipelineRunInput {
  readonly workId: string;
  readonly node: CascadeNode;
  readonly pipeline: Pipeline;
  readonly chooser: OrgChooser<GateOutcome>;
  readonly atMs: number;
  /** The hat that did the work, so no gate is evaluated by its author. */
  readonly proposerHatId: string;
  /** The open change, when there is one. Producers write inside it. */
  readonly handle?: ChangeHandle;
  /** Picks which owner evaluates a gate. Absent = the first owner in chart order. */
  readonly evaluatorFor?: (gate: GateKind, owners: readonly OrgHat[]) => OrgHat | undefined;
  /**
   * Evidence for gates whose producer is not the source of it — `runtime_validation`'s references
   * come from the test runs. Merged with whatever the phase produced.
   */
  readonly extraEvidenceFor?: (gate: GateKind) => readonly string[];
}

export interface PipelineRunResult {
  readonly evaluations: readonly GateEvaluation[];
  readonly passed: ReadonlySet<GateKind>;
  readonly artifacts: ReadonlyMap<GateKind, Artifact>;
  readonly complete: boolean;
  readonly blockedAt: GateKind | undefined;
  readonly refusals: readonly string[];
}

/**
 * PRODUCE, THEN JUDGE, one phase at a time.
 *
 * The ordering is the whole point and it is why this is not `runGateChain` with a callback: a gate
 * is evaluated only after its own phase has made the thing, so `implementation_review` reviews code
 * that exists and `adversarial_review` attacks a design that has been written down.
 *
 * A PRODUCER THAT REFUSES BLOCKS THE PHASE, and the gate is not evaluated at all. Evaluating it
 * anyway would ask a reviewer to judge something that was never made, and an approval there is the
 * exact shape this module was built to remove — worse than a rejection, because the record would
 * show a considered pass.
 */
export async function runPipeline(chart: OrgChart, input: PipelineRunInput): Promise<PipelineRunResult> {
  const evaluations: GateEvaluation[] = [];
  const refusals: string[] = [];
  const artifacts = new Map<GateKind, Artifact>();
  let passed: ReadonlySet<GateKind> = new Set<GateKind>();

  for (const phase of input.pipeline) {
    const gate = phase.gate;

    let produced: Artifact | undefined;
    if (phase.produce !== undefined) {
      const result = await phase.produce.produce(input.node, contextFrom(input.handle, artifacts));
      if (!result.ok) {
        refusals.push(`producer '${phase.produce.meta.name}' for '${gate}' on ${input.workId}: ${result.reason}`);
        return { evaluations, passed, artifacts, complete: false, blockedAt: gate, refusals };
      }
      produced = result.value;
      artifacts.set(gate, produced);
    }

    // The proposer is excluded before an evaluator is picked, so a chart where the author is the
    // only scope-holder BLOCKS rather than self-approving.
    const owners = gateOwners(chart, gate).filter((h) => h.id !== input.proposerHatId);
    const evaluator = input.evaluatorFor?.(gate, owners) ?? owners[0];
    if (evaluator === undefined) {
      refusals.push(
        gateOwners(chart, gate).some((h) => h.id === input.proposerHatId)
          ? `the only hat holding '${gate}' is '${input.proposerHatId}', which did the work`
          : `no hat holds the approval scope for '${gate}'`,
      );
      return { evaluations, passed, artifacts, complete: false, blockedAt: gate, refusals };
    }

    // WHAT THE PHASE MADE IS WHAT THE GATE IS JUDGED ON. Evidence stops being a field somebody
    // fills in and becomes a by-product of having done the work.
    const evidenceRefs = [...(produced?.refs ?? []), ...(input.extraEvidenceFor?.(gate) ?? [])];

    const result = evaluateGate(chart, {
      workId: input.workId,
      gate,
      evaluatorHatId: evaluator.id,
      passed,
      chooser: input.chooser,
      atMs: input.atMs,
      proposerHatId: input.proposerHatId,
      evidenceRefs,
      // THE CHAIN IS THIS PIPELINE'S, not the canonical one. Ordering is still enforced — a phase
      // cannot be reached before the ones this pipeline puts ahead of it — but the process being
      // enforced is the one the caller declared.
      chain: gatesOf(input.pipeline),
    });
    if (!result.ok) {
      refusals.push(result.reason);
      return { evaluations, passed, artifacts, complete: false, blockedAt: gate, refusals };
    }
    evaluations.push(result.evaluation);
    passed = result.passed;
    if (!passed.has(gate)) {
      // The gate was evaluated and did not pass. The pipeline stops here; the recovery path on the
      // evaluation says where the work goes back to.
      return { evaluations, passed, artifacts, complete: false, blockedAt: gate, refusals };
    }
  }

  return { evaluations, passed, artifacts, complete: true, blockedAt: undefined, refusals };
}
