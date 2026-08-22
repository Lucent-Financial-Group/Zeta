/**
 * drift-dashboard/fold.ts — the substrate-neutral core.
 *
 * WHAT THIS FILE IS NOT ALLOWED TO KNOW: what a forge host is. It imports types from
 * the plugin contract (`forge-host/types.ts`, host-agnostic by construction) and
 * nothing else — no adapter, no registry, no `gh`, no workflow, no run id. The stated
 * destination is **sovereign mode**: no centralized forge host at all, author/verifier
 * agent attestations where forge gates stand today. If this fold could not run with no
 * forge host present, the migration Aaron described would not be possible, so
 * `fold.test.ts` exercises it with observations carrying no forge fields at all.
 *
 * THE ONE PROPERTY THE WHOLE FILE EXISTS FOR:
 *
 *   > a check that was never observed must never render identically to a check
 *   > that passed.
 *
 * Measured live 2026-08-22: `gh run list --branch main --limit 200` — the query the
 * fleet had been reporting "main is clean" from all session — contained runs from only
 * **22 of 81 active workflows**, because heartbeat traffic saturates the window.
 * Latest-per-check instead surfaced four workflows that had been failing unseen for up
 * to six days. A window sample is not a slow instrument, it is a *structurally blind*
 * one, and its blindness renders as green.
 *
 * Prior art in-repo, and this is the discipline it asked for:
 *   docs/research/2026-08-13-peer-agents-parallel-experiments-and-why-a-health-dashboard-is-a-check-that-must-not-lie.md
 *     §3 — "a dashboard is a check that a human trusts *instead of looking*", its Opens
 *     #1 (derive the coverage set and display it) and #2 (write the falsifier first).
 *   src/Core.TypeScript/ci/platform-drift-report.ts — the same coverage-is-not-a-footnote
 *     stance, scoped to one workflow's legs.
 *   src/Core.TypeScript/agent-heartbeats/heartbeat-liveness.ts — level-triggered, not
 *     edge-triggered, for one lane; this generalises that shape to the whole roster.
 */

import type {
  CheckExpectation,
  CheckId,
  CheckObservation,
  CheckObservationFailure,
  TriggerClass,
  UnknownReason,
  Verdict,
  VerdictKind,
} from "../forge-host/types.ts";
import { ordinal, type Roster } from "./roster.ts";

// ─── Configuration ──────────────────────────────────────────────────────────

export interface FoldConfig {
  /**
   * A periodic check is STALE once its newest verdict is older than
   * `stalenessFactor × periodSeconds`. Staleness is RED, including when the stale
   * verdict itself is green: a daily check whose last green is eight days old did not
   * run, and "its last answer was yes" is not an answer about today.
   */
  readonly stalenessFactor: number;
}

export const DEFAULT_FOLD_CONFIG: FoldConfig = { stalenessFactor: 3 };

// ─── Report shape ───────────────────────────────────────────────────────────

/** Why a row sits where it sits. Rendered, so the ranking is auditable, not magic. */
export type RowBand = "red" | "unknown" | "running" | "skipped" | "not-applicable" | "green";

export interface DashboardRow {
  readonly checkId: CheckId;
  readonly displayName: string;
  readonly source: string;
  readonly expectation: CheckExpectation;
  readonly verdict: Verdict;
  readonly band: RowBand;
  /** ISO-8601 of the verdict this row reports, or `null` if nothing was ever observed. */
  readonly observedAt: string | null;
  /**
   * Seconds since the newest verdict for this check. `null` when nothing has EVER been
   * observed — which sorts as infinite silence, because that is what it is.
   */
  readonly silenceSeconds: number | null;
  /** True when this pass saw a verdict for this check. */
  readonly observedThisPass: boolean;
  /** True when no source declared this check in this pass, though the roster remembers it. */
  readonly undeclared: boolean;
}

export interface Coverage {
  /**
   * Checks whose declaration says they SHOULD report on this ref (periodic, on-change,
   * or undeciderable). This is the denominator that can go red.
   *
   * On-demand checks are excluded on purpose. Counting a PR-only check as an
   * uncovered gap on a branch ref would pin coverage permanently below 100% — and a
   * red that is always red is a red nobody reads, which is the habituation failure
   * this dashboard is built against.
   */
  readonly expected: number;
  /**
   * Of `expected`, how many actually ESTABLISHED a verdict in this pass.
   *
   * An `unknown` row never counts here, whatever produced it — a cancelled run whose
   * jobs never executed, a producer that errored, or nothing at all. All three are the
   * same fact ("we did not learn anything about this check") and coverage is the count
   * of the times we did. This keeps `shortfall` and the unknown count in lockstep by
   * construction rather than by convention.
   */
  readonly observed: number;
  /** `expected - observed`. **Any shortfall is a RED condition, never a footnote.** */
  readonly shortfall: number;
  /** Correctly-silent checks: declared to fire only on request. */
  readonly onDemand: number;
  /** Hand-retired checks, excluded from every count above. */
  readonly retired: number;
  /** Total non-retired roster size. `expected + onDemand`. */
  readonly known: number;
}

export interface DashboardReport {
  readonly ref: string;
  /** ISO-8601 of the pass. Injected, never read from an ambient clock. */
  readonly at: string;
  readonly rows: readonly DashboardRow[];
  readonly counts: Readonly<Record<RowBand, number>>;
  readonly coverage: Coverage;
  /** Longest silence among unknown rows, in seconds. `null` if some unknown was never observed. */
  readonly oldestUnknownSilenceSeconds: number | null;
  /** True when at least one unknown row has never been observed at all. */
  readonly hasNeverObserved: boolean;
  /** Sources that contributed to this pass, sorted ordinally. Provenance, never authority. */
  readonly sources: readonly string[];
  /** Producer failures. A source that could not answer is an absence, not an all-clear. */
  readonly sourceErrors: readonly string[];
  /**
   * `false` when anything is red, anything is unknown, coverage fell short, or a source
   * errored. **Unknown never aggregates into green** — that is the whole point, and it
   * is asserted here rather than left to the renderer.
   */
  readonly ok: boolean;
}

// ─── Latest-per-check aggregation ───────────────────────────────────────────

/**
 * Collapse many observations of one check to the newest.
 *
 * The falsifier this earns: **an older green must never mask a newer red.** Ties on
 * `observedAt` break ordinally on `source` then on input order, so the fold is a
 * function of the observation SET and not of its arrival order (DST).
 */
export function latestPerCheck(
  observations: readonly CheckObservation[],
): ReadonlyMap<CheckId, CheckObservation> {
  const latest = new Map<CheckId, CheckObservation>();
  for (const obs of observations) {
    const held = latest.get(obs.checkId);
    if (held === undefined) {
      latest.set(obs.checkId, obs);
      continue;
    }
    const byTime = ordinal(obs.observedAt, held.observedAt);
    if (byTime > 0 || (byTime === 0 && ordinal(obs.source, held.source) > 0)) {
      latest.set(obs.checkId, obs);
    }
  }
  return latest;
}

// ─── Absence → a typed verdict ──────────────────────────────────────────────

function unknown(reason: UnknownReason, detail: string): Verdict {
  return { kind: "unknown", reason, detail };
}

/** Did this observation arrive by the trigger the check DECLARES? */
export function triggerMatchesExpectation(
  trigger: TriggerClass | undefined,
  expectation: CheckExpectation,
): boolean {
  if (trigger === undefined || trigger === "unknown") return false;
  if (expectation.kind === "periodic") return trigger === "periodic";
  if (expectation.kind === "on-change") return trigger === "on-change";
  if (expectation.kind === "on-demand") return trigger === "on-request";
  return false;
}

function secondsBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 1000);
}

function humanDuration(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)}m`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/**
 * The verdict for a check that produced NOTHING in this pass.
 *
 * This is where "expected-absent" and "unexpectedly-absent" are separated, and the
 * separation is the reason the unknowns do not become a grey wall. A PR-only check
 * silent on a branch ref is *correct*; a weekly check that has never produced a verdict
 * is a red wearing unknown's clothes — the schedule declares it should have run.
 *
 * Nothing here is assumed. The expectation is derived from the substrate's own
 * declaration by the producer; an expectation that could not be derived stays
 * `unknown` and is loud, rather than being quietly defaulted to the convenient case.
 */
export function verdictForAbsence(
  expectation: CheckExpectation,
  lastObservedAt: string | null,
  now: string,
  config: FoldConfig,
): Verdict {
  if (lastObservedAt === null) {
    switch (expectation.kind) {
      case "periodic":
        return {
          kind: "red",
          detail: `declared to run every ${humanDuration(expectation.periodSeconds)} and has NEVER produced a verdict on this ref (${expectation.detail})`,
        };
      case "on-change":
        return unknown(
          "never-observed",
          `declared to run on changes to this ref (${expectation.detail}) and has never produced a verdict`,
        );
      case "on-demand":
        return {
          kind: "not-applicable",
          detail: `declared to fire only on request (${expectation.detail}); silence on this ref is correct`,
        };
      case "unknown":
        return expectation.reason === "definition-absent"
          ? unknown(
              "registered-but-absent",
              `REGISTERED with the producer but its definition is ABSENT from the repository (${expectation.detail}) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike`,
            )
          : unknown(
              "expectation-unknown",
              `cannot tell whether this check should run on this ref (${expectation.detail}), and it has never produced a verdict`,
            );
    }
  }

  if (expectation.kind === "unknown" && expectation.reason === "definition-absent") {
    return unknown(
      "registered-but-absent",
      `REGISTERED with the producer but its definition is ABSENT from the repository (${expectation.detail})`,
    );
  }

  const age = secondsBetween(lastObservedAt, now);
  if (expectation.kind === "periodic" && age > config.stalenessFactor * expectation.periodSeconds) {
    return {
      kind: "red",
      detail: `STALE: newest verdict is ${humanDuration(age)} old, declared to run every ${humanDuration(expectation.periodSeconds)} (${expectation.detail})`,
    };
  }
  if (expectation.kind === "on-demand") {
    return {
      kind: "not-applicable",
      detail: `declared to fire only on request (${expectation.detail}); newest verdict ${humanDuration(age)} old`,
    };
  }
  return unknown(
    "not-observed-this-pass",
    `known check, produced no verdict in this pass; newest verdict is ${humanDuration(age)} old`,
  );
}

/**
 * Staleness also applies to a check we DID observe. A periodic check whose newest
 * verdict is far older than its period did not run, whatever that verdict says — the
 * generalisation of the heartbeat watchdog's level-triggered reading to the whole
 * roster.
 */
function applyStaleness(
  verdict: Verdict,
  expectation: CheckExpectation,
  observedAt: string,
  now: string,
  config: FoldConfig,
): Verdict {
  if (expectation.kind !== "periodic") return verdict;
  if (verdict.kind === "red" || verdict.kind === "running") return verdict;
  const age = secondsBetween(observedAt, now);
  if (age <= config.stalenessFactor * expectation.periodSeconds) return verdict;
  return {
    kind: "red",
    detail: `STALE: newest verdict (${verdict.kind}) is ${humanDuration(age)} old, declared to run every ${humanDuration(expectation.periodSeconds)} (${expectation.detail})`,
  };
}

/**
 * **Has the DECLARED trigger ever fired?**
 *
 * The sharpest instance of the whole defect class, and it is invisible to any model
 * that only asks what the last run said. `chart-version-refresh` declares
 * `cron: '7 17 * * 0'`; all 14 runs in its entire history are `event=pull_request`.
 * Registered, file present, cron declared, and the schedule has never once fired.
 *
 * So a periodic check is RED when nothing has EVER arrived via its schedule — however
 * green the verdicts that arrived by some other route. A workflow that only runs when
 * a human opens a PR is not a cadence, whatever its cron says.
 */
export function verdictForNeverFiredTrigger(
  expectation: CheckExpectation,
  lastDeclaredTriggerAt: string | null,
  thisPassViaDeclaredTrigger: boolean,
  observedThisPass: boolean,
): Verdict | null {
  if (expectation.kind !== "periodic") return null;
  if (thisPassViaDeclaredTrigger || lastDeclaredTriggerAt !== null) return null;
  if (!observedThisPass) return null; // absence is already handled, and more loudly
  return {
    kind: "red",
    detail: `the DECLARED SCHEDULE HAS NEVER FIRED — every verdict for this check arrived from another trigger, though it declares ${expectation.detail}`,
  };
}

function bandOf(kind: VerdictKind): RowBand {
  return kind === "unknown" ? "unknown" : kind;
}

// ─── The fold ───────────────────────────────────────────────────────────────

export interface FoldInput {
  readonly roster: Roster;
  readonly observations: readonly CheckObservation[];
  /** ISO-8601. Injected — the fold never reads a clock. */
  readonly now: string;
  /** Per-check producer failures. Each becomes `unknown{ reason: "source-error" }`. */
  readonly failures?: readonly CheckObservationFailure[];
  /** Whole-source failures (e.g. the roster enumeration itself failed). */
  readonly sourceErrors?: readonly string[];
  readonly config?: FoldConfig;
}

/**
 * Roster + this pass's observations → the dashboard.
 *
 * Deterministic and total: same inputs ⇒ byte-identical report, every roster entry
 * yields exactly one row, and no row can be produced without a verdict that says how
 * it was reached.
 */
export function foldDashboard(input: FoldInput): DashboardReport {
  const config = input.config ?? DEFAULT_FOLD_CONFIG;
  const { roster, now } = input;
  const latest = latestPerCheck(input.observations);
  const failures = new Map((input.failures ?? []).map((f) => [f.checkId, f.detail]));

  const rows: DashboardRow[] = [];
  let expected = 0;
  let observedExpected = 0;
  let onDemand = 0;
  let retired = 0;

  for (const entry of roster.checks) {
    if (entry.retired === true) {
      retired += 1;
      continue;
    }
    const obs = latest.get(entry.checkId);
    const isExpected = entry.expectation.kind !== "on-demand";
    if (isExpected) expected += 1;
    else onDemand += 1;

    const failure = failures.get(entry.checkId);
    let verdict: Verdict;
    let observedAt: string | null;
    if (obs !== undefined) {
      const viaDeclared = triggerMatchesExpectation(obs.trigger, entry.expectation);
      verdict =
        verdictForNeverFiredTrigger(entry.expectation, entry.lastDeclaredTriggerAt, viaDeclared, true) ??
        applyStaleness(obs.verdict, entry.expectation, obs.observedAt, now, config);
      observedAt = obs.observedAt;
    } else if (failure !== undefined) {
      // The producer was asked and could not answer. That is an absence of evidence,
      // and it outranks the expectation-based derivation: we do not get to conclude
      // "correctly silent" about a question we failed to ask.
      verdict = unknown("source-error", `producer could not answer for this check: ${failure}`);
      observedAt = entry.lastObservedAt;
    } else {
      verdict = verdictForAbsence(entry.expectation, entry.lastObservedAt, now, config);
      observedAt = entry.lastObservedAt;
    }
    if (isExpected && verdict.kind !== "unknown") observedExpected += 1;

    rows.push({
      checkId: entry.checkId,
      displayName: entry.displayName,
      source: obs?.source ?? entry.source,
      expectation: entry.expectation,
      verdict,
      band: bandOf(verdict.kind),
      observedAt,
      silenceSeconds: observedAt === null ? null : secondsBetween(observedAt, now),
      observedThisPass: obs !== undefined,
      undeclared: !entry.declaredNow,
    });
  }

  rows.sort(compareRows);

  const counts: Record<RowBand, number> = {
    red: 0, unknown: 0, running: 0, skipped: 0, "not-applicable": 0, green: 0,
  };
  for (const row of rows) counts[row.band] += 1;

  const unknownRows = rows.filter((r) => r.band === "unknown");
  const hasNeverObserved = unknownRows.some((r) => r.silenceSeconds === null);
  const oldestUnknownSilenceSeconds = hasNeverObserved
    ? null
    : unknownRows.reduce<number | null>((max, r) => (r.silenceSeconds !== null && (max === null || r.silenceSeconds > max) ? r.silenceSeconds : max), null);

  const shortfall = expected - observedExpected;
  const sourceErrors = [...(input.sourceErrors ?? [])].sort(ordinal);
  const sources = [...new Set(rows.map((r) => r.source))].sort(ordinal);

  return {
    ref: roster.ref,
    at: now,
    rows,
    counts,
    coverage: {
      expected,
      observed: observedExpected,
      shortfall,
      onDemand,
      retired,
      known: expected + onDemand,
    },
    oldestUnknownSilenceSeconds,
    hasNeverObserved,
    sources,
    sourceErrors,
    ok:
      counts.red === 0 &&
      counts.unknown === 0 &&
      shortfall === 0 &&
      sourceErrors.length === 0,
  };
}

/**
 * The ranking, and it is the deliverable's real user interface.
 *
 * An unknown that is *displayed* but not *distinguished* has not been surfaced — a
 * grey block of 16 rows is scrolled past exactly as reliably as a check nobody built.
 * So the sort is mechanical and does the noticing for the reader:
 *
 *   red first, oldest red first      — "red since the 16th" outranks "red five minutes ago"
 *   unknown second, LONGEST SILENCE FIRST, never-observed at the very top
 *   running, skipped, not-applicable, green last
 *
 * Ageing the unknowns is the part that resists habituation: "not observed for 6 days"
 * has to read louder than "not observed since the last pass", and a check that has
 * NEVER been observed sorts as infinite silence, because that is what it is.
 */
export function compareRows(a: DashboardRow, b: DashboardRow): number {
  const order: Record<RowBand, number> = {
    red: 0, unknown: 1, running: 2, skipped: 3, "not-applicable": 4, green: 5,
  };
  if (order[a.band] !== order[b.band]) return order[a.band] - order[b.band];

  if (a.band === "red") {
    // Oldest red first: infinite silence (never observed) is the oldest of all.
    const as = a.silenceSeconds ?? Number.POSITIVE_INFINITY;
    const bs = b.silenceSeconds ?? Number.POSITIVE_INFINITY;
    if (as !== bs) return bs - as;
    return ordinal(a.checkId, b.checkId);
  }
  if (a.band === "unknown") {
    const as = a.silenceSeconds ?? Number.POSITIVE_INFINITY;
    const bs = b.silenceSeconds ?? Number.POSITIVE_INFINITY;
    if (as !== bs) return bs - as;
    return ordinal(a.checkId, b.checkId);
  }
  return ordinal(a.checkId, b.checkId);
}

/**
 * The one-line verdict. Coverage is IN the headline, not under it: "I could not see 59
 * of 81 checks" must read at least as loud as "3 checks failed", because an unobserved
 * check is an unbounded number of unknown failures.
 */
export function headline(report: DashboardReport): string {
  const c = report.counts;
  const cov = report.coverage;
  const silence = report.hasNeverObserved
    ? ", incl. NEVER observed"
    : report.oldestUnknownSilenceSeconds === null
      ? ""
      : `, oldest silence ${humanDuration(report.oldestUnknownSilenceSeconds)}`;
  const parts = [
    `RED ${c.red}`,
    `UNKNOWN ${c.unknown}${silence}`,
    `coverage ${cov.observed}/${cov.expected}${cov.shortfall > 0 ? ` (SHORTFALL ${cov.shortfall})` : ""}`,
    `green ${c.green}`,
  ];
  if (cov.onDemand > 0) parts.push(`on-demand ${cov.onDemand}`);
  if (report.sourceErrors.length > 0) parts.push(`SOURCE ERRORS ${report.sourceErrors.length}`);
  return `${report.ok ? "OK" : "NOT OK"} — ${parts.join(" · ")}`;
}

export { humanDuration };
