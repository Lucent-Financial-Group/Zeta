import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  diffPageSnapshots,
  diffSnapshotSets,
  loadSnapshotSet,
  MONITORED_PAGES,
  renderDiffReport,
  saveSnapshotSet,
  type FeatureDiffReport,
  type SnapshotSet,
} from "./feature-diff";
import type { GitHubPageSnapshot } from "./snapshot";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zeta-feature-diff-"));
  tempDirs.push(dir);
  return dir;
}

function makeSnapshot(
  url: string,
  overrides: Partial<{
    toggles: Record<string, boolean>;
    formValues: Record<string, string>;
    visibleFeatures: string[];
  }> = {},
): GitHubPageSnapshot {
  return {
    url,
    timestamp: "2026-05-09T00:00:00.000Z",
    username: "octocat",
    extracted: {
      toggles: overrides.toggles ?? {},
      formValues: overrides.formValues ?? {},
      visibleFeatures: overrides.visibleFeatures ?? [],
    },
  };
}

const BASE_URL = "https://github.com/Lucent-Financial-Group/Zeta/settings";
const SECURITY_URL = "https://github.com/Lucent-Financial-Group/Zeta/settings/security_analysis";

// ---------------------------------------------------------------------------
// diffPageSnapshots — toggle diff
// ---------------------------------------------------------------------------

describe("diffPageSnapshots — toggles", () => {
  test("new toggle: present in current, absent in prior", () => {
    const prior = makeSnapshot(BASE_URL, { toggles: { "allow-merge-commit": true } });
    const current = makeSnapshot(BASE_URL, {
      toggles: { "allow-merge-commit": true, "new-github-feature": false },
    });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.newToggles).toContain("new-github-feature");
    expect(diff.removedToggles).toHaveLength(0);
    expect(diff.changedToggles).toHaveLength(0);
  });

  test("removed toggle: present in prior, absent in current", () => {
    const prior = makeSnapshot(BASE_URL, {
      toggles: { "allow-merge-commit": true, "old-feature": true },
    });
    const current = makeSnapshot(BASE_URL, { toggles: { "allow-merge-commit": true } });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.removedToggles).toContain("old-feature");
    expect(diff.newToggles).toHaveLength(0);
  });

  test("changed toggle: same key, different value", () => {
    const prior = makeSnapshot(BASE_URL, { toggles: { "allow-auto-merge": false } });
    const current = makeSnapshot(BASE_URL, { toggles: { "allow-auto-merge": true } });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.changedToggles).toHaveLength(1);
    expect(diff.changedToggles[0]?.key).toBe("allow-auto-merge");
    expect(diff.changedToggles[0]?.prior).toBe(false);
    expect(diff.changedToggles[0]?.current).toBe(true);
  });

  test("unchanged toggle: not reported in any category", () => {
    const prior = makeSnapshot(BASE_URL, { toggles: { "allow-squash-merge": true } });
    const current = makeSnapshot(BASE_URL, { toggles: { "allow-squash-merge": true } });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.newToggles).toHaveLength(0);
    expect(diff.removedToggles).toHaveLength(0);
    expect(diff.changedToggles).toHaveLength(0);
  });

  test("empty prior: all current toggles are new", () => {
    const prior = makeSnapshot(BASE_URL, { toggles: {} });
    const current = makeSnapshot(BASE_URL, { toggles: { "feature-a": true, "feature-b": false } });
    const diff = diffPageSnapshots(prior, current);
    expect([...diff.newToggles].sort()).toEqual(["feature-a", "feature-b"]);
  });

  test("empty current: all prior toggles are removed", () => {
    const prior = makeSnapshot(BASE_URL, { toggles: { "feature-a": true } });
    const current = makeSnapshot(BASE_URL, { toggles: {} });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.removedToggles).toContain("feature-a");
    expect(diff.newToggles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// diffPageSnapshots — visible features
// ---------------------------------------------------------------------------

describe("diffPageSnapshots — visible features", () => {
  test("new heading: present in current, absent in prior", () => {
    const prior = makeSnapshot(BASE_URL, { visibleFeatures: ["General settings"] });
    const current = makeSnapshot(BASE_URL, {
      visibleFeatures: ["General settings", "Copilot settings"],
    });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.newFeatures).toContain("Copilot settings");
    expect(diff.removedFeatures).toHaveLength(0);
  });

  test("removed heading: present in prior, absent in current", () => {
    const prior = makeSnapshot(BASE_URL, {
      visibleFeatures: ["General settings", "Beta features"],
    });
    const current = makeSnapshot(BASE_URL, { visibleFeatures: ["General settings"] });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.removedFeatures).toContain("Beta features");
    expect(diff.newFeatures).toHaveLength(0);
  });

  test("unchanged headings: not reported", () => {
    const prior = makeSnapshot(BASE_URL, { visibleFeatures: ["General settings"] });
    const current = makeSnapshot(BASE_URL, { visibleFeatures: ["General settings"] });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.newFeatures).toHaveLength(0);
    expect(diff.removedFeatures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// diffPageSnapshots — form fields
// ---------------------------------------------------------------------------

describe("diffPageSnapshots — form fields", () => {
  test("new form field: present in current, absent in prior", () => {
    const prior = makeSnapshot(BASE_URL, { formValues: { "default-branch": "main" } });
    const current = makeSnapshot(BASE_URL, {
      formValues: { "default-branch": "main", "new-field": "value" },
    });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.newFormFields).toContain("new-field");
  });

  test("changed form field value", () => {
    const prior = makeSnapshot(BASE_URL, { formValues: { "default-branch": "main" } });
    const current = makeSnapshot(BASE_URL, { formValues: { "default-branch": "develop" } });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.changedFormFields).toHaveLength(1);
    expect(diff.changedFormFields[0]?.key).toBe("default-branch");
    expect(diff.changedFormFields[0]?.prior).toBe("main");
    expect(diff.changedFormFields[0]?.current).toBe("develop");
  });

  test("unchanged form field: not reported", () => {
    const prior = makeSnapshot(BASE_URL, { formValues: { "default-branch": "main" } });
    const current = makeSnapshot(BASE_URL, { formValues: { "default-branch": "main" } });
    const diff = diffPageSnapshots(prior, current);
    expect(diff.newFormFields).toHaveLength(0);
    expect(diff.removedFormFields).toHaveLength(0);
    expect(diff.changedFormFields).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// diffPageSnapshots — url flows through
// ---------------------------------------------------------------------------

describe("diffPageSnapshots — metadata", () => {
  test("url comes from current snapshot", () => {
    const prior = makeSnapshot("https://github.com/old-url/settings", {});
    const current = makeSnapshot(BASE_URL, {});
    const diff = diffPageSnapshots(prior, current);
    expect(diff.url).toBe(BASE_URL);
  });
});

// ---------------------------------------------------------------------------
// diffSnapshotSets
// ---------------------------------------------------------------------------

describe("diffSnapshotSets", () => {
  const priorSet: SnapshotSet = {
    date: "2026-05-01",
    pages: {
      [BASE_URL]: makeSnapshot(BASE_URL, { toggles: { "allow-merge-commit": true } }),
      [SECURITY_URL]: makeSnapshot(SECURITY_URL, { toggles: { "secret-scanning": true } }),
    },
  };

  test("pages in both sets produce pageDiffs entries", () => {
    const currentSet: SnapshotSet = {
      date: "2026-05-08",
      pages: {
        [BASE_URL]: makeSnapshot(BASE_URL, { toggles: { "allow-merge-commit": true } }),
        [SECURITY_URL]: makeSnapshot(SECURITY_URL, { toggles: { "secret-scanning": true } }),
      },
    };
    const report = diffSnapshotSets(priorSet, currentSet);
    expect(report.pageDiffs).toHaveLength(2);
    expect(report.pagesAdded).toHaveLength(0);
    expect(report.pagesRemoved).toHaveLength(0);
  });

  test("page added in current appears in pagesAdded", () => {
    const NEW_URL = "https://github.com/Lucent-Financial-Group/Zeta/settings/actions";
    const currentSet: SnapshotSet = {
      date: "2026-05-08",
      pages: {
        [BASE_URL]: makeSnapshot(BASE_URL, {}),
        [NEW_URL]: makeSnapshot(NEW_URL, {}),
      },
    };
    const report = diffSnapshotSets(priorSet, currentSet);
    expect(report.pagesAdded).toContain(NEW_URL);
    expect(report.pagesRemoved).toContain(SECURITY_URL);
  });

  test("page removed from current appears in pagesRemoved", () => {
    const currentSet: SnapshotSet = {
      date: "2026-05-08",
      pages: {
        [BASE_URL]: makeSnapshot(BASE_URL, {}),
        // SECURITY_URL dropped
      },
    };
    const report = diffSnapshotSets(priorSet, currentSet);
    expect(report.pagesRemoved).toContain(SECURITY_URL);
  });

  test("priorDate and currentDate flow through from sets", () => {
    const currentSet: SnapshotSet = { date: "2026-05-08", pages: {} };
    const report = diffSnapshotSets(priorSet, currentSet);
    expect(report.priorDate).toBe("2026-05-01");
    expect(report.currentDate).toBe("2026-05-08");
  });

  test("new toggle on a shared page appears in pageDiffs", () => {
    const currentSet: SnapshotSet = {
      date: "2026-05-08",
      pages: {
        [BASE_URL]: makeSnapshot(BASE_URL, {
          toggles: { "allow-merge-commit": true, "copilot-autofix": false },
        }),
        [SECURITY_URL]: makeSnapshot(SECURITY_URL, { toggles: { "secret-scanning": true } }),
      },
    };
    const report = diffSnapshotSets(priorSet, currentSet);
    const settingsDiff = report.pageDiffs.find((d) => d.url === BASE_URL);
    expect(settingsDiff?.newToggles).toContain("copilot-autofix");
  });
});

// ---------------------------------------------------------------------------
// renderDiffReport
// ---------------------------------------------------------------------------

describe("renderDiffReport", () => {
  function makeReport(overrides: Partial<FeatureDiffReport> = {}): FeatureDiffReport {
    return {
      priorDate: "2026-05-01",
      currentDate: "2026-05-08",
      pagesAdded: [],
      pagesRemoved: [],
      pageDiffs: [],
      ...overrides,
    };
  }

  test("report includes date header", () => {
    const md = renderDiffReport(makeReport());
    expect(md).toContain("2026-05-08");
    expect(md).toContain("2026-05-01");
  });

  test("new toggle flagged with ★ new", () => {
    const report = makeReport({
      pageDiffs: [
        {
          url: BASE_URL,
          newToggles: ["copilot-autofix"],
          removedToggles: [],
          changedToggles: [],
          newFeatures: [],
          removedFeatures: [],
          newFormFields: [],
          removedFormFields: [],
          changedFormFields: [],
        },
      ],
    });
    const md = renderDiffReport(report);
    expect(md).toContain("copilot-autofix");
    expect(md).toContain("★ new");
  });

  test("new feature heading flagged with ★ new", () => {
    const report = makeReport({
      pageDiffs: [
        {
          url: BASE_URL,
          newToggles: [],
          removedToggles: [],
          changedToggles: [],
          newFeatures: ["Copilot settings"],
          removedFeatures: [],
          newFormFields: [],
          removedFormFields: [],
          changedFormFields: [],
        },
      ],
    });
    const md = renderDiffReport(report);
    expect(md).toContain("Copilot settings");
    expect(md).toContain("★ new");
  });

  test("page with no changes shows no-changes message", () => {
    const report = makeReport({
      pageDiffs: [
        {
          url: BASE_URL,
          newToggles: [],
          removedToggles: [],
          changedToggles: [],
          newFeatures: [],
          removedFeatures: [],
          newFormFields: [],
          removedFormFields: [],
          changedFormFields: [],
        },
      ],
    });
    const md = renderDiffReport(report);
    expect(md).toContain("No changes detected");
  });

  test("removed element flagged with ✗ removed", () => {
    const report = makeReport({
      pageDiffs: [
        {
          url: BASE_URL,
          newToggles: [],
          removedToggles: ["old-feature"],
          changedToggles: [],
          newFeatures: [],
          removedFeatures: [],
          newFormFields: [],
          removedFormFields: [],
          changedFormFields: [],
        },
      ],
    });
    const md = renderDiffReport(report);
    expect(md).toContain("old-feature");
    expect(md).toContain("✗ removed");
  });

  test("summary table shows correct new-candidate count", () => {
    const report = makeReport({
      pageDiffs: [
        {
          url: BASE_URL,
          newToggles: ["feat-a", "feat-b"],
          removedToggles: [],
          changedToggles: [],
          newFeatures: ["New section"],
          removedFeatures: [],
          newFormFields: [],
          removedFormFields: [],
          changedFormFields: [],
        },
      ],
    });
    const md = renderDiffReport(report);
    // 2 new toggles + 1 new feature = 3 candidates
    expect(md).toContain("| 3 |");
  });

  test("report is non-empty string with heading", () => {
    const md = renderDiffReport(makeReport());
    expect(md.startsWith("# GitHub UI Feature Diff")).toBe(true);
    expect(md.length).toBeGreaterThan(50);
  });

  test("changed toggle shows prior → current arrow", () => {
    const report = makeReport({
      pageDiffs: [
        {
          url: BASE_URL,
          newToggles: [],
          removedToggles: [],
          changedToggles: [{ key: "allow-auto-merge", prior: false, current: true }],
          newFeatures: [],
          removedFeatures: [],
          newFormFields: [],
          removedFormFields: [],
          changedFormFields: [],
        },
      ],
    });
    const md = renderDiffReport(report);
    expect(md).toContain("allow-auto-merge");
    expect(md).toContain("false → true");
  });

  test("pagesAdded listed in report", () => {
    const report = makeReport({ pagesAdded: ["https://github.com/new/page"] });
    const md = renderDiffReport(report);
    expect(md).toContain("https://github.com/new/page");
    expect(md).toContain("New pages added");
  });
});

// ---------------------------------------------------------------------------
// saveSnapshotSet + loadSnapshotSet round-trip
// ---------------------------------------------------------------------------

describe("saveSnapshotSet / loadSnapshotSet", () => {
  test("round-trip preserves date and page data", () => {
    const dir = tempDir();
    const set: SnapshotSet = {
      date: "2026-05-08",
      pages: {
        [BASE_URL]: makeSnapshot(BASE_URL, { toggles: { "allow-merge-commit": true } }),
      },
    };
    const path = saveSnapshotSet(set, dir);
    const loaded = loadSnapshotSet(path);
    expect(loaded.date).toBe("2026-05-08");
    expect(loaded.pages[BASE_URL]).toBeDefined();
    expect(loaded.pages[BASE_URL]?.extracted.toggles["allow-merge-commit"]).toBe(true);
  });

  test("saved file is named <date>.json", () => {
    const dir = tempDir();
    const set: SnapshotSet = { date: "2026-05-08", pages: {} };
    const outPath = saveSnapshotSet(set, dir);
    expect(outPath).toContain("2026-05-08.json");
  });

  test("saveSnapshotSet creates directory if absent", () => {
    const dir = tempDir();
    const nested = join(dir, "deep", "nested");
    const set: SnapshotSet = { date: "2026-05-08", pages: {} };
    expect(() => saveSnapshotSet(set, nested)).not.toThrow();
  });

  test("loadSnapshotSet throws on missing file", () => {
    expect(() => loadSnapshotSet("/nonexistent/path/2026-05-08.json")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// MONITORED_PAGES
// ---------------------------------------------------------------------------

describe("MONITORED_PAGES", () => {
  test("includes general settings page", () => {
    expect(MONITORED_PAGES.some((u) => u.includes("/settings"))).toBe(true);
  });

  test("includes security analysis page", () => {
    expect(MONITORED_PAGES.some((u) => u.includes("security_analysis"))).toBe(true);
  });

  test("includes actions settings page", () => {
    expect(MONITORED_PAGES.some((u) => u.includes("/settings/actions"))).toBe(true);
  });

  test("all entries are valid URLs", () => {
    for (const url of MONITORED_PAGES) {
      expect(() => new URL(url)).not.toThrow();
    }
  });
});
