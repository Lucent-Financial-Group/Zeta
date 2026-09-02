#!/usr/bin/env bun
// audit-dormant-chart-sources.ts -- a chart whose PUBLISHER has gone silent is a
// SECURITY finding, not a currency note.
//
// ---------------------------------------------------------------------------
// THE POLICY THIS ENCODES
// ---------------------------------------------------------------------------
//
// Aaron, 2026-09-02, on being told that "stay on the current packager" was one of
// two legitimate options for `headscale`:
//
//     "we never want to stay on projects who don't push updates, this is a
//      security hazard."
//
// That closes a question this repo had been treating as open, and it is a
// different question from the one `report-chart-currency.ts` answers. That report
// says, correctly and deliberately, "**This is a report, never a gate**", because
// BEING BEHIND is a standing condition: a CI check on it would be red from birth
// and learned-to-ignore within a week.
//
// Dormancy is not that. Being behind means upstream moved and we did not. Being
// DORMANT means *nobody is shipping fixes for the thing we run* -- so a CVE
// disclosed against it has no patch coming through this coordinate, whatever its
// version number says.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS RATHER THAN A COLUMN IN THE REPORT
// ---------------------------------------------------------------------------
//
// `ace/currency.ts` has carried `isSuspicious()` -- "true when a verdict warrants
// attention beyond ordinary staleness", matching exactly `dormant`,
// `behind-dormant` and `unpublished` -- since it was written. MEASURED 2026-09-02:
// its ONLY consumer in the entire tree was its own unit test. A predicate that
// names the dangerous class while nothing acts on it is the vacuity class with
// the safety label already printed on it.
//
// THE WORKED INSTANCE, and the reason the label alone was not enough. Our
// `headscale` chart is pinned to `charts.gabe565.com` -- a third-party PERSONAL
// chart repository, and the WHOLE REPOSITORY is dead. So:
//
// CORRECTED 2026-09-02, and the correction is instructive. This comment first
// said the repo "is still alive (it publishes `adguard-home` actively)" and that
// only its headscale chart had stalled. That was wrong, and wrong in the
// acquitting direction: `max(created)` across ALL 39 charts in that index is
// 2025-02-19, adguard-home's own newest is 2025-02-19, and the index has not been
// regenerated since 2025-02-20. I read a version LIST and inferred activity
// without reading a single date -- the same mistake as reading a green check
// without asking whether it ran. A second review caught it.
//
//   * the pin RESOLVES, so `audit-chart-target-revisions` is green
//   * the chart RENDERS, so nothing in the cluster tree complains
//   * it is at the newest CHART version, so the currency report says 0 behind
//   * and it freezes us at appVersion v0.25.0 while the project shipped v0.29.3
//
// Four server releases of unshipped fixes, and every version check in the repo
// reads green. The currency report even labels the row `DORMANT` -- and then,
// because "behind" is what it gates on and this row is not behind, presents it
// beside the healthy ones. The label was right and nothing consumed it.
//
// This is the same shape the report's own headline already names for `minio`
// ("a pure versions-behind metric reports the most dangerous dependency in this
// tree as the healthiest one") and it is worth stating that the fix for minio was
// to add a SEPARATE activity column. That was necessary and insufficient: a
// column a human must read is not a check.
//
// ---------------------------------------------------------------------------
// WHAT THIS REFUSES, AND WHAT IT DELIBERATELY DOES NOT
// ---------------------------------------------------------------------------
//
//   REFUSED   a coordinate whose upstream has published nothing in over a year
//             (`dormant` / `behind-dormant`), or which upstream never published
//             at all (`unpublished`), unless carried in the baseline with a
//             reason and a lift condition.
//
//   NOT JUDGED  being behind. That stays a report, for the reason above.
//
//   NOT PASSED  `unreachable`. A coordinate the refresh could not reach is
//             UNKNOWN, never clean -- exit 2, never 0. A dormancy detector that
//             reports "no dormant sources" when it could not read the registry
//             would be the exact defect it exists to catch.
//
// The acknowledgement pins the `repoURL`, NOT the silent-day count. Pinning the
// count would make every entry stale by tomorrow and teach everyone to re-stamp
// it without reading; pinning the URL means an acknowledgement stops applying the
// moment we RELOCATE, which is precisely when it should be re-argued.
//
// Exit codes: 0 clean, 1 refused finding or stale acknowledgement, 2 could-not-verify.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { extractTree, readRoster } from "./audit-chart-target-revisions.ts";
import { readChartDates } from "./chart-publish-dates.ts";
import { computeRows, type CurrencyRow } from "./report-chart-currency.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
export const BASELINE_RELATIVE_PATH = "src/Core.TypeScript/hygiene/dormant-chart-sources.baseline.json";

/** One coordinate whose publisher has stopped shipping. */
export interface DormantFinding {
  /** `<app>|<chart>` — the acknowledgement key. */
  readonly key: string;
  readonly app: string;
  readonly chart: string;
  readonly repoURL: string;
  readonly manifest: string;
  readonly pinned: string;
  readonly silentDays: number | null;
  /** `dormant` | `unpublished` — why this coordinate is refused. */
  readonly why: string;
}

export interface BaselineEntry {
  readonly key: string;
  readonly reason: string;
  readonly liftsWhen: string;
  /** The repoURL this acknowledgement was written about. A relocation makes it stale. */
  readonly repoURL: string;
}

export interface Adjudicated {
  readonly refused: readonly DormantFinding[];
  readonly acknowledged: readonly DormantFinding[];
  /** Baseline keys matching no current finding — a claim about the tree that stopped being true. */
  readonly staleKeys: readonly string[];
  /** Coordinates whose upstream could not be reached. Never clean; never refused either. */
  readonly unverifiable: readonly string[];
}

export function findingKey(app: string, chart: string): string {
  return `${app}|${chart}`;
}

/**
 * The dormant / unpublished coordinates in a set of currency rows.
 *
 * `behind` is deliberately absent from this predicate. A dependency can be
 * twenty versions behind and perfectly well maintained; it can be at the newest
 * version and abandoned. Those are orthogonal axes and conflating them is what
 * put `minio` at the top of the healthy list.
 */
export function findDormantSources(rows: readonly CurrencyRow[]): readonly DormantFinding[] {
  const out: DormantFinding[] = [];
  for (const row of rows) {
    // `PIN-UNPUBLISHED`, not `UNPUBLISHED`. Written as the latter first, which is
    // not a member of `Verdict` and so could never match -- a branch that cannot
    // fire, inside the check whose whole subject is checks that cannot fire.
    // Caught by the unit test below; the test exists because the bug did.
    const why =
      row.activity === "dormant" ? "dormant" : row.verdict === "PIN-UNPUBLISHED" ? "unpublished" : null;
    if (why === null) continue;
    out.push({
      key: findingKey(row.app, row.chart),
      app: row.app,
      chart: row.chart,
      repoURL: row.repoURL,
      manifest: row.manifest,
      pinned: row.pinned,
      silentDays: row.silentDays,
      why,
    });
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** Coordinates the refresh could not reach — unknown, never clean. */
export function findUnverifiable(rows: readonly CurrencyRow[]): readonly string[] {
  return rows
    .filter((row) => row.activity === "unreachable")
    .map((row) => findingKey(row.app, row.chart))
    .sort();
}

export function readBaseline(
  path: string = BASELINE_RELATIVE_PATH,
  repoRoot = REPO_ROOT,
): readonly BaselineEntry[] {
  const raw = JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")) as { entries?: unknown };
  const entries = raw.entries;
  if (!Array.isArray(entries)) throw new Error(`${path}: "entries" must be an array`);
  return entries.map((value, index) => {
    const e = value as Record<string, unknown>;
    for (const field of ["key", "reason", "liftsWhen", "repoURL"] as const) {
      if (typeof e[field] !== "string" || (e[field] as string).trim().length === 0) {
        throw new Error(
          `${path}: entries[${String(index)}] has no "${field}" — an acknowledgement that a dependency is ` +
            `unmaintained must say WHY it is tolerated and WHAT lifts it, or it is a permanent exemption ` +
            `wearing a temporary one's clothes`,
        );
      }
    }
    return e as unknown as BaselineEntry;
  });
}

/**
 * Split findings against the baseline, and refuse a STALE entry too.
 *
 * A stale acknowledgement is not harmless: it asserts that some dependency is
 * knowingly-unmaintained when that has stopped being true, which is how a
 * baseline turns into folklore.
 */
export function adjudicate(
  findings: readonly DormantFinding[],
  baseline: readonly BaselineEntry[],
  unverifiable: readonly string[] = [],
): Adjudicated {
  const byKey = new Map(baseline.map((e) => [e.key, e]));
  const used = new Set<string>();
  const refused: DormantFinding[] = [];
  const acknowledged: DormantFinding[] = [];
  for (const finding of findings) {
    const entry = byKey.get(finding.key);
    if (entry === undefined) {
      refused.push(finding);
      continue;
    }
    used.add(entry.key);
    if (entry.repoURL !== finding.repoURL) {
      // The acknowledgement was written about a DIFFERENT publisher. Relocating is
      // the fix this check exists to provoke, so an old entry must not silently
      // cover the new source.
      refused.push({ ...finding, why: `${finding.why} (acknowledged for ${entry.repoURL}, now ${finding.repoURL})` });
      continue;
    }
    acknowledged.push(finding);
  }
  const staleKeys = baseline
    .filter((e) => !used.has(e.key))
    .map((e) => e.key)
    .sort();
  return { refused, acknowledged, staleKeys, unverifiable };
}

export function exitCode(a: Adjudicated): number {
  if (a.unverifiable.length > 0) return 2;
  return a.refused.length > 0 || a.staleKeys.length > 0 ? 1 : 0;
}

export function formatReport(a: Adjudicated): string {
  const lines: string[] = ["chart sources that stopped shipping — a version number is not a maintenance guarantee", ""];
  for (const f of a.refused) {
    lines.push(
      `  REFUSED ${f.key} — ${f.why}; upstream silent ${String(f.silentDays ?? "unknown")} day(s)`,
      `          pinned ${f.pinned} from ${f.repoURL}`,
      `          ${f.manifest}`,
      `          A version number is not a maintenance guarantee. Relocate to a source that ships,`,
      `          or carry it in ${BASELINE_RELATIVE_PATH} with a reason and a lift condition.`,
      "",
    );
  }
  for (const key of a.staleKeys) {
    lines.push(`  STALE ACKNOWLEDGEMENT ${key} — matches no dormant coordinate; delete it`, "");
  }
  for (const key of a.unverifiable) {
    lines.push(`  COULD NOT VERIFY ${key} — upstream unreachable. Unknown, not clean.`, "");
  }
  if (a.acknowledged.length > 0) {
    lines.push(
      `  acknowledged (${String(a.acknowledged.length)}) — STILL UNMAINTAINED. An acknowledgement buys a`,
      `  non-red gate, never a patched dependency.`,
      "",
    );
  }
  const code = exitCode(a);
  lines.push(
    code === 0
      ? "OK — every chart source is still publishing, or is acknowledged as not."
      : code === 2
        ? "COULD NOT VERIFY — at least one upstream was unreachable; this check did not run for it."
        : "FAILED — a dependency we run is not being maintained by anyone.",
  );
  return lines.join("\n");
}

export function auditDormantChartSources(repoRoot = REPO_ROOT): Adjudicated {
  const rows = computeRows(extractTree(repoRoot), readRoster(), readChartDates());
  return adjudicate(findDormantSources(rows), readBaseline(BASELINE_RELATIVE_PATH, repoRoot), findUnverifiable(rows));
}

function main(): void {
  const result = auditDormantChartSources();
  process.stdout.write(`${formatReport(result)}\n`);
  process.exit(exitCode(result));
}

if (import.meta.main) main();
