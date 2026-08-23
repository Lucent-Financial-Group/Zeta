// verdict-drought.test.ts -- falsifiers for the main gate-verdict drought fold.
//
// HERMETIC BY CONSTRUCTION. Every test builds its observations in-process and injects
// `now` as a literal string. No network, no clock, no fixture file that could drift out
// from under the assertions -- so the whole suite replays deterministically (§7 DST).
//
// The two that carry the design, and the two the change was asked to prove:
//
//   1. A WINDOW OF ONLY `cancelled` RUNS IS `unknown` -- never `ok`, never green, and
//      loud at `::error::`. That is the exact defect: `cancelled` reads as neither pass
//      nor fail, so every surface that folds outcomes finds nothing and prints green.
//   2. A `failure` IS A VERDICT. The check is about verdict PRESENCE, not verdict
//      COLOUR. Getting this backwards would make a red `main` -- which is being checked
//      and is therefore in a KNOWN state -- look like an unchecked one.
//
// Discrimination was proved by inversion, not by assertion: with `isVerdict` widened to
// accept `cancelled`, test 1 goes red ("expected unknown, received ok") and with it
// narrowed to `success` alone, test 2 goes red. Both were restored. A test that passes
// under the inverted implementation is not a falsifier.

import { describe, expect, test } from "bun:test";

import {
  assertDroughtDetectorLive,
  DEFAULT_DROUGHT_THRESHOLDS,
  droughtAnnotations,
  foldDrought,
  isVerdict,
  median,
  minutesBetween,
  orderNewestFirst,
  renderDroughtMarkdown,
  RUNNING,
  severityOfRegister,
  toObservation,
  type DroughtThresholds,
  type GateRunObservation,
} from "./verdict-drought.ts";

const NOW = "2026-08-23T17:35:00Z";

/** Minutes before NOW, as an ISO instant. Keeps the fixtures readable. */
function ago(minutes: number): string {
  return new Date(Date.parse(NOW) - minutes * 60_000).toISOString().replace(".000Z", "Z");
}

function obs(id: number, conclusion: string, endedMinutesAgo: number, durationMin = 14): GateRunObservation {
  return {
    id,
    sha: `${String(id).padStart(8, "0")}deadbeef`,
    conclusion,
    startedAt: ago(endedMinutesAgo + durationMin),
    endedAt: ago(endedMinutesAgo),
  };
}

/** The live storm, reduced: merges outrunning a ~14 min gate, everything cancelled. */
function allCancelled(count: number): GateRunObservation[] {
  return Array.from({ length: count }, (_, i) => obs(1000 + i, "cancelled", i * 2, 1));
}

describe("isVerdict -- the strict allow-list", () => {
  test("success and failure are verdicts; nothing else is", () => {
    expect(isVerdict("success")).toBe(true);
    expect(isVerdict("failure")).toBe(true);
    // The whole point. Each of these has been observed on this repo's gate runs.
    for (const notAVerdict of ["cancelled", "skipped", "timed_out", "stale", "neutral", "action_required", RUNNING, "unknown", ""]) {
      expect(isVerdict(notAVerdict)).toBe(false);
    }
  });
});

describe("FALSIFIER 1 -- a window of only `cancelled` runs is UNKNOWN, never ok", () => {
  const report = foldDrought(allCancelled(20), 20, NOW);

  test("the register is `unknown` and is NOT `ok`", () => {
    // Inverting `isVerdict` to accept `cancelled` turns this line red: the fold then
    // finds a "verdict" 0 min old and returns `ok`. That is the discrimination proof.
    expect(report.register).toBe("unknown");
    expect(report.register).not.toBe("ok");
  });

  test("no verdict is reported, and the count of verdicts is honestly zero", () => {
    expect(report.lastVerdict).toBeNull();
    expect(report.lastSuccess).toBeNull();
    expect(report.verdictRuns).toBe(0);
    expect(report.cancelledRuns).toBe(20);
    // Elapsed time is `null`, NOT 0. A drought you cannot measure is not a zero drought.
    expect(report.minutesSinceVerdict).toBeNull();
    expect(report.minutesSinceSuccess).toBeNull();
  });

  test("it reaches the LOUD surface as an ::error::, not a warning and not silence", () => {
    const lines = droughtAnnotations(report, assertDroughtDetectorLive(report));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toStartWith("::error ");
    expect(lines.join("\n")).toContain("NO COMPLETED VERDICT");
  });

  test("severity never DECREASES as knowledge decreases", () => {
    // `unknown` is less known than `drought`, so it may never be the quieter of the two.
    expect(severityOfRegister("unknown")).toBe("error");
    expect(severityOfRegister("drought")).toBe("error");
    expect(severityOfRegister("ok")).toBeNull();
  });

  test("the rendered summary says UNKNOWN and never claims the lane is ok", () => {
    const md = renderDroughtMarkdown(report, assertDroughtDetectorLive(report));
    expect(md).toContain("UNKNOWN -- main has NO completed verdict in the window");
    expect(md).toContain("`unknown`");
    expect(md).not.toContain("OK -- main has a recent completed verdict");
  });

  test("the DETECTOR is live even though the LANE is silent -- they are different claims", () => {
    // Conflating them is how a working detector gets muted for reporting bad news.
    const liveness = assertDroughtDetectorLive(report);
    expect(liveness.live).toBe(true);
    expect(liveness.reason).toContain("the LANE is the thing that is silent");
  });
});

describe("FALSIFIER 2 -- a `failure` IS a verdict (presence, not colour)", () => {
  const window: GateRunObservation[] = [
    obs(2005, "cancelled", 1, 1),
    obs(2004, "cancelled", 3, 1),
    obs(2003, "failure", 6),
    obs(2002, "cancelled", 30, 1),
    obs(2001, "success", 60),
  ];
  const report = foldDrought(window, 2, NOW);

  test("the newest failure satisfies the check -- register `ok`, no drought", () => {
    // Narrowing `isVerdict` to `success` alone turns this red: the fold then measures
    // from run 2001 (60 min) and returns `drought`.
    expect(report.register).toBe("ok");
    expect(report.lastVerdict?.runId).toBe(2003);
    expect(report.lastVerdict?.conclusion).toBe("failure");
    expect(report.minutesSinceVerdict).toBe(6);
  });

  test("a red main is a KNOWN main -- and the success drought is reported SEPARATELY", () => {
    // These are two different facts and the report refuses to collapse them.
    expect(report.lastSuccess?.runId).toBe(2001);
    expect(report.minutesSinceSuccess).toBe(60);
    expect(report.minutesSinceSuccess).not.toBe(report.minutesSinceVerdict);
  });

  test("the ok register emits no annotation -- an alarm that is always lit is muted", () => {
    expect(droughtAnnotations(report, assertDroughtDetectorLive(report))).toEqual([]);
  });
});

describe("the two drought axes are independent", () => {
  test("TIME: an old verdict with few commits on top is still a drought", () => {
    const report = foldDrought([obs(3001, "success", 50), ...allCancelled(5)], 2, NOW);
    expect(report.register).toBe("drought");
    expect(report.minutesSinceVerdict).toBe(50);
    expect(report.reasons.join(" ")).toContain("LAST COMPLETED VERDICT");
  });

  test("COMMITS: a fresh verdict with a large unverified pile on top is still a drought", () => {
    // The live 2026-08-23 shape: a `failure` verdict 4 min old with 13 commits on top.
    const report = foldDrought([obs(3002, "failure", 4), ...allCancelled(8)], 13, NOW);
    expect(report.register).toBe("drought");
    expect(report.minutesSinceVerdict).toBe(4);
    expect(report.unverifiedCommits).toBe(13);
    expect(report.reasons.join(" ")).toContain("13 commit(s) have landed on main");
  });

  test("`50 minutes quiet` and `50 minutes with 20 unverified commits` are different reports", () => {
    const quiet = foldDrought([obs(3003, "success", 50)], 0, NOW);
    const loaded = foldDrought([obs(3003, "success", 50)], 20, NOW);
    expect(quiet.unverifiedCommits).toBe(0);
    expect(loaded.unverifiedCommits).toBe(20);
    expect(loaded.reasons.length).toBeGreaterThan(quiet.reasons.length);
  });
});

describe("an unmeasured commit count is never rendered as zero", () => {
  const report = foldDrought([obs(4001, "success", 5)], null, NOW);

  test("`null` survives the fold and is named out loud", () => {
    expect(report.unverifiedCommits).toBeNull();
    expect(report.unverifiedCommits).not.toBe(0);
    expect(report.reasons.join(" ")).toContain("COMMIT COUNT NOT MEASURED");
  });

  test("the summary prints `not measured`, not `0`", () => {
    const md = renderDroughtMarkdown(report, assertDroughtDetectorLive(report));
    expect(md).toContain("**not measured**");
  });

  test("an unmeasured count cannot by itself trip the commit threshold", () => {
    // The honest direction: unknown does not manufacture an alarm, it manufactures a
    // stated unknown. The register stays `ok` on the time axis and the reason says why.
    expect(report.register).toBe("ok");
  });
});

describe("the detector is loud about its OWN silence", () => {
  test("an empty window is `unknown` AND the detector reports itself not live", () => {
    const report = foldDrought([], null, NOW);
    expect(report.register).toBe("unknown");
    expect(report.windowRuns).toBe(0);
    const liveness = assertDroughtDetectorLive(report);
    expect(liveness.live).toBe(false);
    expect(liveness.reason).toContain("DROUGHT DETECTOR WENT QUIET");
    const lines = droughtAnnotations(report, liveness);
    // TWO errors: the lane is unknown, and the instrument cannot prove it looked.
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("went quiet");
  });

  test("commits landing with ZERO runs is named as a broken trigger, not a slow gate", () => {
    const report = foldDrought([obs(5001, "success", 5)], 7, NOW);
    expect(report.runsSinceVerdict).toBe(0);
    expect(report.triggerLooksBroken).toBe(true);
    expect(report.reasons.join(" ")).toContain("TRIGGER MAY BE BROKEN");
  });

  test("runs firing after the verdict is NOT a broken trigger", () => {
    const report = foldDrought([obs(5002, "success", 5), obs(5003, "cancelled", 1, 1)], 7, NOW);
    expect(report.runsSinceVerdict).toBe(1);
    expect(report.triggerLooksBroken).toBe(false);
  });
});

describe("cancellation rate and window bounding", () => {
  test("the rate is over the observed window and is called out at the threshold", () => {
    const report = foldDrought([...allCancelled(6), obs(6001, "success", 2)], 1, NOW);
    expect(report.cancelledRuns).toBe(6);
    expect(report.windowRuns).toBe(7);
    expect(report.cancelRate).toBeCloseTo(6 / 7, 6);
    expect(report.reasons.join(" ")).toContain("CANCELLATION RATE");
  });

  test("the window is BOUNDED before anything is counted -- old history cannot leak in", () => {
    const t: DroughtThresholds = { ...DEFAULT_DROUGHT_THRESHOLDS, windowRuns: 3 };
    // Run 900 is the only verdict and it is the OLDEST (lowest id); the bound excludes it.
    const report = foldDrought([obs(900, "success", 90), ...allCancelled(5)], 4, NOW, t);
    expect(report.windowRuns).toBe(3);
    expect(report.register).toBe("unknown");
    expect(report.lastVerdict).toBeNull();
  });

  test("a still-running run is counted as a non-verdict, never as absence", () => {
    const report = foldDrought([obs(8001, RUNNING, 0, 3), ...allCancelled(3)], 4, NOW);
    expect(report.runningRuns).toBe(1);
    expect(report.verdictRuns).toBe(0);
    expect(report.register).toBe("unknown");
  });

  test("`skipped` and `timed_out` land in `other`, and still do not satisfy the check", () => {
    const report = foldDrought([obs(9001, "skipped", 1, 0), obs(9002, "timed_out", 2)], 1, NOW);
    expect(report.otherRuns).toBe(2);
    expect(report.verdictRuns).toBe(0);
    expect(report.register).toBe("unknown");
  });
});

describe("purity -- the fold is deterministic and takes its clock as an argument", () => {
  test("same observations + same now => byte-identical report (§6 idempotency, §7 DST)", () => {
    const window = [...allCancelled(4), obs(9101, "failure", 20)];
    const a = JSON.stringify(foldDrought(window, 3, NOW));
    const b = JSON.stringify(foldDrought([...window].reverse(), 3, NOW));
    expect(a).toBe(b);
  });

  test("advancing the injected clock is what moves the register -- no ambient time", () => {
    const window = [obs(9201, "success", 0)];
    expect(foldDrought(window, 0, NOW).register).toBe("ok");
    const later = new Date(Date.parse(NOW) + 60 * 60_000).toISOString();
    expect(foldDrought(window, 0, later).register).toBe("drought");
  });

  test("reasons are never empty -- the report always states why it says what it says", () => {
    expect(foldDrought([obs(9301, "success", 1)], 0, NOW).reasons.length).toBeGreaterThan(0);
    expect(foldDrought([], null, NOW).reasons.length).toBeGreaterThan(0);
  });
});

describe("helpers", () => {
  test("orderNewestFirst is by run id, not by timestamp", () => {
    const ordered = orderNewestFirst([obs(1, "success", 1), obs(9, "success", 90), obs(5, "success", 45)]);
    expect(ordered.map((r) => r.id)).toEqual([9, 5, 1]);
  });

  test("minutesBetween returns null on an unparseable instant rather than NaN", () => {
    expect(minutesBetween("2026-08-23T17:00:00Z", "2026-08-23T17:30:00Z")).toBe(30);
    expect(minutesBetween("not-a-date", NOW)).toBeNull();
  });

  test("median of an empty sample is null, not 0", () => {
    expect(median([])).toBeNull();
    expect(median([14, 2, 30])).toBe(14);
  });

  test("toObservation maps an in-flight run to RUNNING, never to its null conclusion", () => {
    const running = toObservation({
      id: 1,
      head_sha: "abc",
      status: "in_progress",
      conclusion: null,
      created_at: NOW,
      updated_at: NOW,
    });
    expect(running.conclusion).toBe(RUNNING);
    expect(isVerdict(running.conclusion)).toBe(false);

    const done = toObservation({
      id: 2,
      head_sha: "def",
      status: "completed",
      conclusion: "cancelled",
      created_at: NOW,
      updated_at: NOW,
    });
    expect(done.conclusion).toBe("cancelled");
    expect(isVerdict(done.conclusion)).toBe(false);
  });
});

describe("the live 2026-08-23 measurement, replayed from its own numbers", () => {
  // last SUCCESS 10fbd9a4 ended 16:43:22Z; last 8 runs 6 cancelled / 2 running / 0 success;
  // three merges inside 24 s. Injected now = 17:33:54Z, as measured.
  const liveNow = "2026-08-23T17:33:54Z";
  const window: GateRunObservation[] = [
    { id: 33645, sha: "6426eacf", conclusion: RUNNING, startedAt: "2026-08-23T17:30:37Z", endedAt: "2026-08-23T17:30:38Z" },
    { id: 33644, sha: "3f0e0c99", conclusion: "cancelled", startedAt: "2026-08-23T17:30:29Z", endedAt: "2026-08-23T17:30:38Z" },
    { id: 33643, sha: "087b6508", conclusion: "cancelled", startedAt: "2026-08-23T17:30:13Z", endedAt: "2026-08-23T17:30:30Z" },
    { id: 33634, sha: "60180789", conclusion: "cancelled", startedAt: "2026-08-23T17:28:07Z", endedAt: "2026-08-23T17:30:14Z" },
    { id: 33632, sha: "f6f5c971", conclusion: "cancelled", startedAt: "2026-08-23T17:27:37Z", endedAt: "2026-08-23T17:28:08Z" },
    { id: 33631, sha: "2627ef96", conclusion: "cancelled", startedAt: "2026-08-23T17:27:13Z", endedAt: "2026-08-23T17:27:39Z" },
    { id: 33624, sha: "3168e541", conclusion: RUNNING, startedAt: "2026-08-23T17:24:18Z", endedAt: "2026-08-23T17:25:10Z" },
    { id: 33623, sha: "5e035ef2", conclusion: "cancelled", startedAt: "2026-08-23T17:24:10Z", endedAt: "2026-08-23T17:24:19Z" },
  ];

  test("the eight-run window the human counted by hand is `unknown`, and would have been green", () => {
    const report = foldDrought(window, 20, liveNow);
    expect(report.register).toBe("unknown");
    expect(report.cancelledRuns).toBe(6);
    expect(report.runningRuns).toBe(2);
    expect(report.verdictRuns).toBe(0);
    expect(report.cancelRate).toBeCloseTo(0.75, 6);
  });

  test("adding the 16:43:22Z success back turns it into a MEASURABLE 50 min drought", () => {
    const withSuccess = [
      ...window,
      { id: 33569, sha: "10fbd9a4", conclusion: "success", startedAt: "2026-08-23T16:29:06Z", endedAt: "2026-08-23T16:43:22Z" },
    ];
    const report = foldDrought(withSuccess, 20, liveNow);
    expect(report.register).toBe("drought");
    expect(report.minutesSinceVerdict).toBe(51);
    expect(report.unverifiedCommits).toBe(20);
    expect(report.medianVerdictMinutes).toBe(14);
  });
});
