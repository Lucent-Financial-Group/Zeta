/**
 * mission-trajectory.test.ts — pace, and the four answers it can give.
 *
 * The property that matters is that the status MOVES with its inputs. A trajectory reporting
 * `on_track` for everything would be the vacuity class wearing a dashboard, and it is the shape
 * this kind of module usually fails into — so every status here is reached by changing one input
 * and holding the rest.
 */

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TOLERANCE,
  evaluateTrajectory,
  OFF_TRACK_MULTIPLE,
  TrajectoryStatus,
  warrantsEscalation,
  type TrajectoryInput,
} from "./mission-trajectory";

const HOUR = 3_600_000;

/** Halfway through a ten-unit mission's window, by default. */
const at = (over: Partial<TrajectoryInput> = {}): TrajectoryInput => ({
  missionId: "m1",
  startsAtMs: 0,
  targetAtMs: 10 * HOUR,
  nowMs: 5 * HOUR,
  delivered: 5,
  total: 10,
  ...over,
});

describe("the four statuses are all REACHABLE by moving one input", () => {
  test("exactly on pace is on track", () => {
    const t = evaluateTrajectory(at());
    expect(t.status).toBe(TrajectoryStatus.OnTrack);
    expect(t.drift).toBeCloseTo(0, 10);
  });

  test("AHEAD is on track — being early is not a condition anybody escalates", () => {
    const t = evaluateTrajectory(at({ delivered: 9 }));
    expect(t.status).toBe(TrajectoryStatus.OnTrack);
    expect(t.drift).toBeGreaterThan(0);
  });

  test("behind by more than the tolerance is AT RISK", () => {
    // Half the window gone, 3 of 10 done: drift -0.2, past 0.1 and inside 0.2.
    const t = evaluateTrajectory(at({ delivered: 3 }));
    expect(t.status).toBe(TrajectoryStatus.AtRisk);
  });

  test("behind by more than twice the tolerance is OFF TRACK", () => {
    const t = evaluateTrajectory(at({ delivered: 1 }));
    expect(t.status).toBe(TrajectoryStatus.OffTrack);
    expect(t.drift).toBeLessThan(-DEFAULT_TOLERANCE * OFF_TRACK_MULTIPLE);
  });

  test("a window that has not opened is NOT STARTED, not on track", () => {
    // The distinction that matters: "no reading" must not be reported as a good reading. A mission
    // that has not begun is not doing well, it is not doing anything.
    const t = evaluateTrajectory(at({ nowMs: -HOUR }));
    expect(t.status).toBe(TrajectoryStatus.NotStarted);
  });

  test("a zero-length window is NOT STARTED rather than a division by zero", () => {
    const t = evaluateTrajectory(at({ startsAtMs: 5 * HOUR, targetAtMs: 5 * HOUR }));
    expect(t.status).toBe(TrajectoryStatus.NotStarted);
    expect(Number.isFinite(t.drift)).toBe(true);
  });

  test("a mission that owes nothing has no pace to report", () => {
    const t = evaluateTrajectory(at({ total: 0, delivered: 0 }));
    expect(t.status).toBe(TrajectoryStatus.NotStarted);
    expect(Number.isNaN(t.deliveredFraction)).toBe(false);
  });
});

describe("the reading is derived from BOTH axes", () => {
  test("holding delivery and moving the clock changes the status", () => {
    const early = evaluateTrajectory(at({ nowMs: 1 * HOUR, delivered: 2 }));
    const late = evaluateTrajectory(at({ nowMs: 9 * HOUR, delivered: 2 }));
    expect(early.status).toBe(TrajectoryStatus.OnTrack);
    expect(late.status).toBe(TrajectoryStatus.OffTrack);
  });

  test("holding the clock and moving delivery changes the status", () => {
    expect(evaluateTrajectory(at({ delivered: 1 })).status).toBe(TrajectoryStatus.OffTrack);
    expect(evaluateTrajectory(at({ delivered: 5 })).status).toBe(TrajectoryStatus.OnTrack);
  });

  test("tolerance is the caller's knob, and it MOVES the verdict", () => {
    // The back-loaded project the header names as this model's honest limit: a wider tolerance is
    // the supported remedy, so it has to actually work.
    const behind = at({ delivered: 3 });
    expect(evaluateTrajectory(behind).status).toBe(TrajectoryStatus.AtRisk);
    expect(evaluateTrajectory({ ...behind, tolerance: 0.5 }).status).toBe(TrajectoryStatus.OnTrack);
  });

  test("progress past the total does not report more than complete", () => {
    const t = evaluateTrajectory(at({ delivered: 99 }));
    expect(t.deliveredFraction).toBe(1);
    expect(t.status).toBe(TrajectoryStatus.OnTrack);
  });

  test("time past the target does not report more than a full window", () => {
    const t = evaluateTrajectory(at({ nowMs: 100 * HOUR, delivered: 10 }));
    expect(t.elapsedFraction).toBe(1);
    expect(t.status).toBe(TrajectoryStatus.OnTrack);
  });
});

describe("it reports; something else decides", () => {
  test("only OFF TRACK warrants an escalation", () => {
    // `at_risk` deliberately does not. An escalation for every wobble is one nobody reads, which
    // is how a real one gets missed.
    expect(warrantsEscalation(evaluateTrajectory(at({ delivered: 1 })))).toBe(true);
    expect(warrantsEscalation(evaluateTrajectory(at({ delivered: 3 })))).toBe(false);
    expect(warrantsEscalation(evaluateTrajectory(at()))).toBe(false);
    expect(warrantsEscalation(evaluateTrajectory(at({ nowMs: -1 })))).toBe(false);
  });

  test("the basis names the numbers, so a disagreement is about inputs not verdicts", () => {
    const t = evaluateTrajectory(at({ delivered: 3 }));
    expect(t.basis).toContain("50% of the window elapsed");
    expect(t.basis).toContain("30% delivered");
    expect(t.basis).toContain("delivered 3/10");
  });

  test("the not-started basis says WHICH of the three reasons applied", () => {
    expect(evaluateTrajectory(at({ nowMs: -1 })).basis).toContain("has not opened");
    expect(evaluateTrajectory(at({ startsAtMs: 0, targetAtMs: 0 })).basis).toContain("zero or negative length");
    expect(evaluateTrajectory(at({ total: 0 })).basis).toContain("owes no units");
  });
});

describe("the thresholds cannot be set into contradiction", () => {
  test("off-track is a MULTIPLE of the tolerance, so at-risk always has room", () => {
    expect(OFF_TRACK_MULTIPLE).toBeGreaterThan(1);
    // With any tolerance, a drift between the two thresholds exists and reads at_risk.
    //
    // A THOUSAND units, not ten. At `tolerance: 0.01` the drift under test is 1.5% of the mission,
    // and rounding that onto a ten-unit scale lands back on zero — the first version of this test
    // failed for that reason and the code was fine. A test whose arithmetic cannot represent the
    // effect it is looking for reports a defect in whatever it happens to be pointed at.
    const TOTAL = 1000;
    for (const tolerance of [0.01, 0.1, 0.3]) {
      const midDrift = -tolerance * ((1 + OFF_TRACK_MULTIPLE) / 2);
      const t = evaluateTrajectory(
        at({ nowMs: 10 * HOUR, total: TOTAL, delivered: Math.round((1 + midDrift) * TOTAL), tolerance }),
      );
      expect(t.status).toBe(TrajectoryStatus.AtRisk);
    }
  });
});
