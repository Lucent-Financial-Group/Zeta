import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { worthFetchingLogs, toJob, sanitizeForSummary } from "./rerun-toolchain-install-stall-cli.ts";
import type { Job } from "./toolchain-install-stall.ts";

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "fixtures", "toolchain-install-stall-2026-08-25.json"), "utf8"),
) as { cases: Array<{ run: { id: number }; jobs: Job[] }> };
const jobsOf = (id: number) => fixture.cases.find((c) => c.run.id === id)!.jobs;

describe("worthFetchingLogs — the cheap pre-filter that decides whether to pay for a log", () => {
  test("fires on the runs that carry an install-step failure", () => {
    for (const id of [32890184155, 32890329848, 32889687326, 32896165119]) {
      expect(worthFetchingLogs(jobsOf(id))).toBe(true);
    }
  });

  test("does NOT fire on a run whose only failure is a tsc type error", () => {
    // This is the cost guard: on a normal red the sweep pays one jobs API call and stops.
    expect(worthFetchingLogs(jobsOf(32896987670))).toBe(false);
  });

  test("does not fire on the Windows installer step", () => {
    const jobs: Job[] = [
      {
        id: 1,
        name: "build-and-test (windows-2022)",
        conclusion: "failure",
        steps: [{ number: 3, name: "Install toolchain via three-way-parity script (Windows; GOVERNANCE §24)", conclusion: "failure" }],
      },
    ];
    expect(worthFetchingLogs(jobs)).toBe(false);
  });

  test("does not fire when the installer failed AFTER something else did", () => {
    const jobs: Job[] = [
      {
        id: 1,
        name: "j",
        conclusion: "failure",
        steps: [
          { number: 2, name: "Checkout", conclusion: "failure" },
          { number: 3, name: "Install toolchain via three-way-parity script", conclusion: "failure" },
        ],
      },
    ];
    expect(worthFetchingLogs(jobs)).toBe(false);
  });

  test("a pre-filter false positive costs a log fetch and never a rerun", () => {
    // Stated as a test so the claim in the header is checkable: the pre-filter's only power
    // is to SKIP work. Everything it lets through still faces the full policy, which needs
    // the log signature the pre-filter never looked at.
    const jobs: Job[] = [
      {
        id: 1,
        name: "j",
        conclusion: "failure",
        steps: [{ number: 3, name: "Install toolchain via three-way-parity script", conclusion: "failure" }],
      },
    ];
    expect(worthFetchingLogs(jobs)).toBe(true);
  });
});

describe("toJob — a job the API returned with no steps array must not crash the sweep", () => {
  test("missing steps becomes an empty list, which classifies as unexplained", () => {
    const j = toJob({ id: 7, name: "x", conclusion: "failure" });
    expect(j.steps).toEqual([]);
  });
});

describe("sanitizeForSummary — untrusted strings must not reach a rendered surface", () => {
  // CodeQL flagged the unsanitised version of this on PR #15440 (js/http-to-file-access,
  // "Write to file system depends on Untrusted data"). It was right: for a `pull_request`
  // run, both the workflow `name:` and the branch name are contributor-controlled.
  test("a branch name cannot close the table cell or forge a row", () => {
    expect(sanitizeForSummary("x | evil | rerun | yes |")).not.toContain("|");
    expect(sanitizeForSummary("a\nb")).not.toContain("\n");
  });

  test("a branch name cannot inject a markdown link", () => {
    const out = sanitizeForSummary("[click](javascript:alert(1))");
    expect(out).not.toContain("[");
    expect(out).not.toContain("]");
    expect(out).not.toContain("(");
  });

  test("a branch name cannot inject raw HTML", () => {
    const out = sanitizeForSummary("<img src=x onerror=alert(1)>");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("=");
  });

  test("ordinary branch names survive intact", () => {
    for (const b of ["main", "claim/081M0XC0CYN-rerun-toolchain-install-stall", "heartbeat/soraya-flush", "fix_v1.2+3"]) {
      expect(sanitizeForSummary(b)).toBe(b);
    }
  });

  test("length is capped so one row cannot bury the table", () => {
    expect(sanitizeForSummary("a".repeat(500), 20)).toBe(`${"a".repeat(20)}...`);
  });

  test("absent is `?`, never the empty string that would silently shift a row", () => {
    expect(sanitizeForSummary(undefined)).toBe("?");
    expect(sanitizeForSummary("")).toBe("?");
  });
});
