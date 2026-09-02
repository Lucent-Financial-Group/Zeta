// Red-proof tests for the dormant-chart-source check.
//
// Every assertion comes in pairs: a GREEN case and the RED case the same code
// path must reject. The two that carry the most weight are:
//
//   * "behind is NOT a finding" — the discriminator. Without it this check
//     collapses into the currency report it was deliberately separated from,
//     goes red on ten coordinates from birth, and gets learned-to-ignore.
//   * "PIN-UNPUBLISHED is spelled the way Verdict spells it" — this was a real
//     bug, not a hypothetical. The first implementation matched `"UNPUBLISHED"`,
//     which is not a member of `Verdict`, so that branch could never fire. A
//     check that cannot detect a class it claims to cover is the exact defect
//     this file exists to catch, written inside the catcher.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  adjudicate,
  auditDormantChartSources,
  exitCode,
  findDormantSources,
  findDeprecatedCharts,
  findUnverifiable,
  findingKey,
  formatReport,
  readBaseline,
  type BaselineEntry,
  type DormantFinding,
} from "./audit-dormant-chart-sources.ts";
import type { CurrencyRow, UpstreamActivity, Verdict } from "./report-chart-currency.ts";

function row(over: Partial<CurrencyRow> = {}): CurrencyRow {
  return {
    app: "app",
    chart: "chart",
    repoURL: "https://charts.example.test",
    manifest: "full-ai-cluster/k8s/applications/app/Application.yaml",
    pinned: "1.0.0",
    pinnedPublishedAt: "2026-01-01",
    newestStable: "1.0.0",
    newestPublishedAt: "2026-01-01",
    behind: 0,
    bump: "none",
    activity: "active" as UpstreamActivity,
    silentDays: 3,
    verdict: "CURRENT" as Verdict,
    unorderableVersions: 0,
    note: "",
    ...over,
  } as CurrencyRow;
}

function entry(over: Partial<BaselineEntry> = {}): BaselineEntry {
  return {
    key: "app|chart",
    repoURL: "https://charts.example.test",
    reason: "a reason long enough to be a reason and not a shrug",
    liftsWhen: "the coordinate points at a source that still publishes",
    ...over,
  };
}

function fixture(files: Readonly<Record<string, string>>): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "zeta-dormant-"));
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body, "utf8");
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

// ---------------------------------------------------------------------------

describe("findDormantSources", () => {
  test("GREEN: a publishing source is not a finding", () => {
    expect(findDormantSources([row()])).toEqual([]);
  });

  test("RED: a dormant source IS a finding", () => {
    const found = findDormantSources([row({ activity: "dormant", silentDays: 559 })]);
    expect(found).toHaveLength(1);
    expect(found[0]?.why).toBe("dormant");
    expect(found[0]?.silentDays).toBe(559);
  });

  // THE DISCRIMINATOR. If this ever goes red, the check has become the currency
  // report and is on its way to being ignored.
  test("BEING BEHIND IS NOT A FINDING — even a major-version gap on an active upstream", () => {
    expect(findDormantSources([row({ behind: 162, bump: "major", verdict: "BEHIND-MAJOR" })])).toEqual([]);
    expect(findDormantSources([row({ behind: 72, verdict: "BEHIND" })])).toEqual([]);
  });

  test("and the converse: at the newest version but dormant IS a finding", () => {
    // The minio/headscale shape — zero behind, and nobody shipping.
    const found = findDormantSources([row({ behind: 0, verdict: "DORMANT", activity: "dormant" })]);
    expect(found).toHaveLength(1);
  });

  test("PIN-UNPUBLISHED is spelled the way Verdict spells it", () => {
    // Regression: matched "UNPUBLISHED" first, which is not a Verdict member, so
    // the branch could never fire. Mutating the string back makes this fail.
    const found = findDormantSources([row({ verdict: "PIN-UNPUBLISHED", activity: "active" })]);
    expect(found).toHaveLength(1);
    expect(found[0]?.why).toBe("unpublished");
  });

  test("findings are sorted by key, so the report is stable across runs", () => {
    const found = findDormantSources([
      row({ app: "zeta", chart: "z", activity: "dormant" }),
      row({ app: "alpha", chart: "a", activity: "dormant" }),
    ]);
    expect(found.map((f) => f.key)).toEqual(["alpha|a", "zeta|z"]);
  });
});

describe("unreachable is UNKNOWN, never clean", () => {
  test("an unreachable coordinate is not reported as a dormant finding", () => {
    expect(findDormantSources([row({ activity: "unreachable", verdict: "UNREACHABLE" })])).toEqual([]);
  });

  test("...but it is reported as unverifiable, and forces exit 2", () => {
    const unver = findUnverifiable([row({ activity: "unreachable", verdict: "UNREACHABLE" })]);
    expect(unver).toEqual(["app|chart"]);
    expect(exitCode(adjudicate([], [], unver))).toBe(2);
  });

  test("exit 2 wins over a clean finding set — a check that did not run is not a pass", () => {
    const a = adjudicate([], [], ["app|chart"]);
    expect(a.refused).toEqual([]);
    expect(exitCode(a)).toBe(2);
    expect(formatReport(a)).toContain("COULD NOT VERIFY");
  });
});

describe("adjudicate", () => {
  const finding: DormantFinding = {
    key: "app|chart",
    app: "app",
    chart: "chart",
    repoURL: "https://charts.example.test",
    manifest: "m.yaml",
    pinned: "1.0.0",
    silentDays: 559,
    why: "dormant",
  };

  test("GREEN: a matching acknowledgement covers it", () => {
    const a = adjudicate([finding], [entry()]);
    expect(a.refused).toEqual([]);
    expect(a.acknowledged).toHaveLength(1);
    expect(exitCode(a)).toBe(0);
  });

  test("RED: an unacknowledged dormant source is refused", () => {
    const a = adjudicate([finding], []);
    expect(a.refused).toHaveLength(1);
    expect(exitCode(a)).toBe(1);
    expect(formatReport(a)).toContain("REFUSED app|chart");
  });

  // The relocation invariant: the acknowledgement was about a PUBLISHER.
  test("RED: an acknowledgement written for a DIFFERENT repoURL does not cover the new one", () => {
    const a = adjudicate([finding], [entry({ repoURL: "https://charts.old.test" })]);
    expect(a.refused).toHaveLength(1);
    expect(a.refused[0]?.why).toContain("acknowledged for https://charts.old.test");
    expect(exitCode(a)).toBe(1);
  });

  test("RED: an acknowledgement matching nothing is STALE and fails", () => {
    const a = adjudicate([], [entry()]);
    expect(a.staleKeys).toEqual(["app|chart"]);
    expect(exitCode(a)).toBe(1);
    expect(formatReport(a)).toContain("STALE ACKNOWLEDGEMENT");
  });
});

describe("readBaseline", () => {
  const good = JSON.stringify({ entries: [entry()] });

  test("GREEN: a complete entry loads", () => {
    const fx = fixture({ "b.json": good });
    try {
      expect(readBaseline("b.json", fx.root)).toHaveLength(1);
    } finally {
      fx.cleanup();
    }
  });

  for (const field of ["reason", "liftsWhen", "repoURL"] as const) {
    test(`RED: an entry with no ${field} is refused`, () => {
      const e = { ...entry() } as Record<string, unknown>;
      delete e[field];
      const fx = fixture({ "b.json": JSON.stringify({ entries: [e] }) });
      try {
        expect(() => readBaseline("b.json", fx.root)).toThrow(new RegExp(`has no "${field}"`));
      } finally {
        fx.cleanup();
      }
    });
  }

  test("RED: an empty reason is refused — a shrug is not an acknowledgement", () => {
    const fx = fixture({ "b.json": JSON.stringify({ entries: [entry({ reason: "   " })] }) });
    try {
      expect(() => readBaseline("b.json", fx.root)).toThrow(/has no "reason"/);
    } finally {
      fx.cleanup();
    }
  });
});

describe("the live tree", () => {
  test("the checked-in baseline covers exactly what the tree carries — no refusals, no stale entries", () => {
    const result = auditDormantChartSources();
    expect(result.refused.map((f) => f.key)).toEqual([]);
    expect(result.staleKeys).toEqual([]);
    expect(result.unverifiable).toEqual([]);
    expect(exitCode(result)).toBe(0);
  });

  test("and it is not vacuous: the tree really does carry a dormant source today", () => {
    // If this ever goes green-because-empty, the check above stopped meaning
    // anything and this test is what says so.
    const result = auditDormantChartSources();
    expect(result.acknowledged.length).toBeGreaterThan(0);
    expect(result.acknowledged.map((f) => f.key)).toContain(findingKey("headscale", "headscale"));
  });
});

describe("findDeprecatedCharts", () => {
  const coord = (over: Record<string, unknown> = {}) => ({
    repoURL: "https://charts.example.test",
    chart: "chart",
    targetRevision: "2.0.0",
    manifest: "full-ai-cluster/k8s/applications/app/Application.yaml",
    appName: "app",
    ...over,
  });
  const roster = (versions: string[], deprecatedVersions?: string[]) => ({
    entries: { "https://charts.example.test|chart": { versions, ...(deprecatedVersions ? { deprecatedVersions } : {}) } },
  });
  const key = (r: string, c: string) => `${r}|${c}`;
  const newest = (v: readonly string[]) => [...v].sort().at(-1) ?? "";

  test("GREEN: nothing deprecated is not a finding", () => {
    expect(findDeprecatedCharts([coord()], roster(["1.0.0", "2.0.0"], []), key, newest)).toEqual([]);
  });

  test("RED: OUR PIN is deprecated — we are running a retired chart", () => {
    const f = findDeprecatedCharts([coord()], roster(["1.0.0", "2.0.0"], ["2.0.0"]), key, newest);
    expect(f).toHaveLength(1);
    expect(f[0]?.why).toContain("the pinned version 2.0.0 is marked retired");
  });

  test("RED: the NEWEST is deprecated — the line is finished even if our pin is not", () => {
    const f = findDeprecatedCharts([coord({ targetRevision: "1.0.0" })], roster(["1.0.0", "2.0.0"], ["2.0.0"]), key, newest);
    expect(f).toHaveLength(1);
    expect(f[0]?.why).toContain("this chart line is finished");
  });

  // THE ANTI-CRY-WOLF CONTROL. grafana-community mirrors tempo 1.24.4
  // (deprecated) beside its own healthy 2.3.0. Firing on that would light up
  // every repository that ever retired anything, and a signal whose value is
  // rarity does not survive that.
  test("an OLD deprecated version under a healthy newest is NOT a finding", () => {
    expect(findDeprecatedCharts([coord()], roster(["1.24.4", "2.0.0"], ["1.24.4"]), key, newest)).toEqual([]);
  });

  // "not deprecated" and "this source cannot tell us" must not collapse.
  test("an OCI coordinate, which cannot report deprecation, is not reported CLEAN", () => {
    // deprecatedVersions absent entirely -> undefined -> skipped, never asserted healthy.
    expect(findDeprecatedCharts([coord()], roster(["1.0.0", "2.0.0"]), key, newest)).toEqual([]);
  });

  test("a coordinate with no roster entry at all is skipped, not guessed", () => {
    expect(findDeprecatedCharts([coord({ chart: "absent" })], roster(["1.0.0"], ["1.0.0"]), key, newest)).toEqual([]);
  });
});
