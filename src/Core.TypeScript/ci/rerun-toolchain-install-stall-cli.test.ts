import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { worthFetchingLogs, toJob, safeRunId } from "./rerun-toolchain-install-stall-cli.ts";
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

describe("safeRunId — the only API-derived value the job summary is allowed to carry", () => {
  // CodeQL flagged the first two drafts of the summary writer (js/http-to-file-access, medium).
  // The resolution was to stop writing free-form API strings to the file at all; what remains
  // is this, and it must not be a string passthrough.
  test("an ordinary run id renders as itself", () => {
    expect(safeRunId(32890184155)).toBe("32890184155");
  });

  test("a string that LOOKS like an id is refused, not coerced", () => {
    // The forcing case: if this coerced, the whole sink argument collapses, because a string
    // is exactly what an attacker-influenced field is.
    expect(safeRunId("32890184155")).toBe("?");
    expect(safeRunId("1 | evil | rerun | yes |")).toBe("?");
    expect(safeRunId("[x](javascript:alert(1))")).toBe("?");
  });

  test("non-integers, negatives and absent values are refused", () => {
    expect(safeRunId(1.5)).toBe("?");
    expect(safeRunId(-1)).toBe("?");
    expect(safeRunId(0)).toBe("?");
    expect(safeRunId(Number.NaN)).toBe("?");
    expect(safeRunId(Number.MAX_SAFE_INTEGER + 2)).toBe("?");
    expect(safeRunId(undefined)).toBe("?");
    expect(safeRunId(null)).toBe("?");
  });

  test("the rendering carries no exponent or separator a table could not hold", () => {
    expect(safeRunId(1e15)).toBe("1000000000000000");
    expect(safeRunId(1e15)).not.toContain("e");
  });
});
