#!/usr/bin/env bun
/**
 * corporate/run-agent.ts — an agent working a REAL organization, and resuming.
 *
 * ── THE TWO HALVES THAT DID NOT MEET ─────────────────────────────────────────
 * `agent-loop/cli.ts` had persistence and a participant, and always ran against `emptySurface` with
 * no candidates — so the model that drove it was choosing over an organization with no work in it.
 * `corporate/run-org.ts` produced a real surface from `agent-loop-bridge.ts`, and had neither
 * persistence nor a participant.
 *
 * Both halves were built, tested and mutation-checked, and neither was connected to the other. This
 * is the join, and it is the point at which the end-to-end claim means something: a model picking
 * REAL work off a REAL organization, recorded to disk, resuming from that disk on the next
 * invocation.
 *
 * ── THE DIRECTION IS THE ONE THE ADR FIXES ───────────────────────────────────
 * The core cannot reach for an organization; `register-boundary.test.ts` enforces that. So the core
 * offers `MainDeps.surface` and this register fills it. The loop still does not know an organization
 * exists — it knows it was handed a snapshot and some candidates.
 *
 *   bun run-agent.ts --agent alexa --at 2026-09-03T10:00:00.000Z --root .agent-loop
 *   bun run-agent.ts --agent alexa --at ... --participant local-llm
 *   bun run-agent.ts --agent alexa --at ... --qa-fails --participant local-llm --store .org-history
 *   bun run-agent.ts --agent alexa --at ... --history
 *
 * ── WHY THE ORGANIZATION IS RE-RUN EACH INVOCATION ───────────────────────────
 * The org runtime is deterministic and in-memory: given the same inputs it produces the same
 * cascade, and `--at` fixes the clock. So re-running it is a pure recomputation of the SAME
 * organization rather than a second, different one — and it is what lets the agent's own state
 * resume from disk while the surface it looks at is rebuilt beside it.
 *
 * That is honest but it is not the same as the organization resuming: its cascade and calendar are
 * still recomputed rather than folded from the stored trace. Named here rather than implied, and it
 * is the next thing.
 */

import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { agentsFromChart, runOrgRuntime, type OrgRuntimeDeps } from "./org-runtime";
import { statusSurfaceFrom } from "./agent-loop-bridge";
import { appendRun, deliveryRate, readEvents } from "./org-store";
import { foldOrganization } from "./org-fold";
import { idlePortfolios, PortfolioKind, portfolioHistory, portfolioOf } from "./portfolio";
import { emptyQueue, type WorkQueue } from "./work-market";
import { IntakeKind, Severity, type ExternalEvent } from "./intake";
import { RunOutcome } from "./qa";
import { isLeafType, WorkType } from "./goal-cascade";
import type { OrgEvent } from "./org-event";
import { mainAsync, type LoopSurface, type MainDeps } from "../workflow-engine/agent-loop/cli";

/** The inbound event the demo organization works. A real caller supplies its own. */
const DEFECT: ExternalEvent = {
  source: "portal",
  externalId: "T-1",
  kind: IntakeKind.Defect,
  severity: Severity.High,
  title: "checkout double-charges when a coupon is applied twice",
  reproduction: "apply the same coupon twice at checkout",
  evidenceRefs: ["log/checkout-1"],
};

export interface AgentRunArgs {
  /** Fixed by `--at`, so the organization recomputes identically on every invocation. */
  readonly atMs: number;
  readonly qaFails: boolean;
  /**
   * Work the organization as an INCIDENT rather than a defect.
   *
   * Not decoration: an incident is the only work type that carries a restoration time, so it is the
   * only configuration in which the run's trace makes `mttrMedianSeconds` measurable. Without it
   * every run reports MTTR unmeasured, and the trace passed to the surface changes nothing — a
   * pass-through that looks load-bearing and is not.
   */
  readonly incident: boolean;
  /**
   * Rebuild the organization from the STORE instead of re-running it.
   *
   * The difference this makes is the whole of "the organization resumes": without it every
   * invocation recomputes the organization from its arguments, which works only because the runtime
   * is deterministic and stops working the moment a run depends on anything not in them. With it,
   * the second process reads what the first one DID.
   *
   * Requires `--store`, and refuses when the store holds no facts rather than silently recomputing:
   * a resume that quietly falls back to a fresh run is indistinguishable from a resume that worked.
   */
  readonly resume: boolean;
  /** Where the organization's own history goes. Absent means the run is not persisted. */
  readonly store?: string;
}

/** Run the organization and turn it into the surface the loop looks at. */
/**
 * Rebuild the surface from a stored log — no runtime, no recomputation.
 *
 * `queue` and `qa` are EMPTY and that is stated rather than hidden: shards, claims and test runs
 * are not yet folded, so a resumed surface reports zero deployments and no test history. What it
 * does carry is the organization's WORK — the cascade, the calendar, the priorities and the gate
 * verdicts — which is what the menu is built from.
 */
/**
 * One queue holding every folded queue's shards, claims and approvals.
 *
 * The surface takes a single `WorkQueue`, and a log spanning several runs holds one per hat. Taking
 * the first would drop the rest — so they are unioned, which is safe because a shard id is unique
 * to its shard and a claim to its claim, making the merge a SET UNION and therefore idempotent:
 * folding the same log twice yields the same queue.
 *
 * `revision` becomes the max rather than a fresh count, because a revision that went BACKWARDS
 * would make an optimistic-concurrency check pass against a stale expectation.
 *
 * An empty fold gives an empty queue — the same value `resumedSurface` used to hardcode, now the
 * answer for a log that genuinely holds no market rather than for every log.
 */
export function mergeQueues(queues: readonly WorkQueue[]): WorkQueue {
  const first = queues[0];
  if (first === undefined) return emptyQueue("resumed", "rmo_office");
  return {
    ...first,
    queueId: "resumed",
    revision: Math.max(...queues.map((q) => q.revision)),
    shards: queues.flatMap((q) => q.shards),
    claims: queues.flatMap((q) => q.claims),
    approvals: queues.flatMap((q) => q.approvals),
  };
}

export function resumedSurface(store: string, atMs: number): {
  readonly surface: LoopSurface;
  readonly folded: ReturnType<typeof foldOrganization>;
} {
  const events = readEvents(store);
  const folded = foldOrganization(events);
  // The queue and the QA history come from the LOG, not from an empty stand-in.
  //
  // What an empty queue cost: `statusSurfaceFrom` derives its candidates partly from shards and
  // claims, so a resumed organization offered nothing to do and reported zero deployments — it read
  // as an organization that had never worked rather than one that had been interrupted. And with no
  // QA history a regression has no "before", so every regression came back as a feature that was
  // never built.
  //
  // MANY queues fold out of a log that spans runs, one per hat that held one. They are merged into
  // the surface's single queue rather than one being picked: choosing would silently hide the work
  // of every other hat, and a resumed run that quietly drops half the market is the failure this
  // whole boundary is about.
  const built = statusSurfaceFrom({
    queue: mergeQueues(folded.queues),
    gateEvaluations: folded.gateEvaluations,
    qa: folded.qa,
    cascade: folded.cascade,
    priorities: folded.priorities,
    snapshotIso: new Date(atMs).toISOString(),
    trace: events,
    pathsFor: (node) => (isLeafType(node.workType) ? [`src/Core/${node.workId}.fs`] : []),
  });
  return {
    surface: { snapshot: built.snapshot, candidates: built.candidates, heartbeatLane: "operational" },
    folded,
  };
}

export async function organizationSurface(args: AgentRunArgs): Promise<{
  readonly surface: LoopSurface;
  readonly delivered: boolean;
  readonly candidates: number;
  readonly unmeasured: readonly string[];
  readonly trace: readonly OrgEvent[];
}> {
  const chart = buildOrgChart(SEED_HATS);
  if (!chart.ok) throw new Error(chart.reason);

  let n = 0;
  const deps: OrgRuntimeDeps = {
    chart: chart.chart,
    externalEvents: [
      {
        ...DEFECT,
        // A different inbound ticket per run: the same product receives many reports over time, and
        // reusing one external id would make every run the same ticket arriving again.
        externalId: `T-${String(args.atMs)}`,
        ...(args.incident ? { kind: IntakeKind.Incident, title: "checkout is down" } : {}),
      },
    ],
    agents: agentsFromChart(chart.chart),
    observations: [],
    acceptingHatId: "cto",
    resourceAuthorityHatId: "rmo_office",
    priorityDeciderHatId: "cto",
    // SCOPED TO THE RUN'S INSTANT. A bare counter mints the same ids on every invocation, so two
    // genuinely different runs sharing a store would collide: the fold would merge their work into
    // one organization and report one goal where two happened. The instant is already the thing
    // that distinguishes the runs, and it is passed in, so the ids stay deterministic.
    createId: (p) => `${p}-${String(args.atMs)}-${String(++n).padStart(3, "0")}`,
    nowMs: args.atMs,
    workBlockMs: 3_600_000,
    leaseMs: 300_000,
    priorityInputsFor: () => ({
      executivePriority: 0.5, customerImpact: 1, severity: 1, releaseRisk: 0.2,
      blockedDownstreamCount: 2, dependencyFanOut: 1, queueAgeMs: 0, hatScarcity: 0,
      budgetBurn: 0, estimatedEffort: 0.2,
    }),
    ...(args.qaFails ? { qaFallback: RunOutcome.Failed } : {}),
    // The goal is about a long-lived product. Emitted as facts, so with `--store` the portfolio
    // accumulates goals across runs — which is the only thing a container buys that a per-run value
    // does not.
    portfolio: {
      portfolioId: "checkout",
      title: "Checkout",
      kind: PortfolioKind.Product,
      ownerHatId: "engineering_director",
    },
  };

  const report = await runOrgRuntime(deps);
  const built = statusSurfaceFrom({
    queue: report.queue,
    gateEvaluations: report.gateEvaluations,
    qa: report.qa,
    cascade: report.cascade,
    priorities: report.priorities,
    snapshotIso: new Date(args.atMs).toISOString(),
    trace: report.trace,
    pathsFor: (node) => (isLeafType(node.workType) ? [`src/Core/${node.workId}.fs`] : []),
  });

  if (args.store !== undefined) {
    appendRun(
      {
        atMs: args.atMs,
        delivered: report.delivered,
        levelsEngaged: report.levelsEngaged,
        refusals: report.refusals,
        trace: report.trace,
      },
      args.store,
    );
  }

  return {
    surface: { snapshot: built.snapshot, candidates: built.candidates, heartbeatLane: "operational" },
    delivered: report.delivered,
    candidates: built.candidates.length,
    /** Carried out so a caller can see WHICH fields the run could not measure, not just the numbers. */
    unmeasured: built.dora.unmeasured.map((u) => u.field),
    trace: report.trace,
  };
}

function flagValue(argv: readonly string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

export async function main(argv: readonly string[]): Promise<number> {
  const at = flagValue(argv, "--at");
  if (at === undefined || Number.isNaN(Date.parse(at))) {
    // Same rule as the loop's: the timestamp decides the record's address, so it is never defaulted.
    console.error("refused: --at <iso8601> is required — neither the organization nor the loop reads a clock");
    return 1;
  }
  const args: AgentRunArgs = {
    atMs: Date.parse(at),
    qaFails: argv.includes("--qa-fails"),
    incident: argv.includes("--incident"),
    resume: argv.includes("--resume"),
    ...(flagValue(argv, "--store") === undefined ? {} : { store: flagValue(argv, "--store")! }),
  };

  // `--history` asks the loop about the agent, not the organization: no run is needed to answer it,
  // and running one would make reading the past have a side effect.
  if (argv.includes("--history")) return mainAsync(argv);

  if (args.resume) {
    if (args.store === undefined) {
      console.error("refused: --resume needs --store — there is nothing to resume from");
      return 1;
    }
    const { surface, folded } = resumedSurface(args.store, args.atMs);
    if (folded.factCount === 0) {
      // Falling back to a fresh run here would make a failed resume indistinguishable from a
      // successful one, which is the whole thing this flag exists to demonstrate.
      console.error(`refused: the store at ${args.store} holds no facts to resume from`);
      return 1;
    }
    console.log(
      `organization RESUMED from ${folded.factCount} fact(s): ` +
        `${folded.cascade.nodes.length} work item(s), ${folded.calendar.blocks.length} block(s), ` +
        `${surface.candidates.length} candidate(s) on the surface` +
        (folded.refusals.length === 0 ? "" : `  UNACCOUNTED: ${folded.refusals.join("; ")}`),
    );
    return mainAsync(argv, { surface: () => surface });
  }

  const org = await organizationSurface(args);
  console.log(
    `organization: ${org.delivered ? "DELIVERED" : "NOT DELIVERED"}, ` +
      `${org.candidates} candidate(s) on the surface, ` +
      `dora ${org.unmeasured.length === 0 ? "FULLY MEASURED" : `unmeasured: ${org.unmeasured.join(", ")}`}` +
      (args.store === undefined ? "" : `, history ${JSON.stringify(deliveryRate(args.store))}`),
  );

  // What the PORTFOLIO has seen — across every stored run, which is the question a single run
  // cannot answer because each goal is its own tree.
  if (args.store !== undefined) {
    const folded = foldOrganization(readEvents(args.store));
    for (const pf of folded.portfolios.portfolios) {
      const h = portfolioHistory(folded.portfolios, folded.cascade, pf.portfolioId);
      console.log(
        `portfolio '${pf.title}' (${pf.kind}, owned by ${pf.ownerHatId}): ` +
          `${h.delivered}/${h.goals} goal(s) delivered` +
          (h.unknownGoals.length === 0 ? "" : `, ${h.unknownGoals.length} unaccounted`),
      );
    }
    // Which product THIS run's goal was about, and which products have nothing live.
    const goalId = folded.cascade.nodes.find((n) => n.workType === WorkType.Goal)?.workId;
    const about = goalId === undefined ? undefined : portfolioOf(folded.portfolios, goalId);
    if (about !== undefined) console.log(`  this goal was about '${about.title}'`);
    const idle = idlePortfolios(folded.portfolios, folded.cascade);
    // Idle is ATTENTION, not a wind-down: a product between goals is entirely normal.
    if (idle.length > 0) console.log(`  idle (all goals delivered): ${idle.map((p) => p.title).join(", ")}`);
  }

  const deps: MainDeps = { surface: () => org.surface };
  return mainAsync(argv, deps);
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
