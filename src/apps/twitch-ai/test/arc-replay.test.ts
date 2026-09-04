import { describe, expect, test } from "bun:test";

import recordedSession from "../src/recordings/arc-ztch-v1-session.json";
import recordedClickSession from "../src/recordings/arc-zeta-click-target-session.json";
import { moveReplayIndex, parseArcRecording } from "../src/arc-replay";
import { coordinateFieldPixels } from "../src/components/ArcReplayPlayer";

describe("committed ARC session replay", () => {
  test("accepts the source-owned artifact and its completed level", () => {
    const parsed = parseArcRecording(recordedSession);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.steps).toHaveLength(11);
    expect(parsed.value.steps[0]?.observation.action.id).toBe("RESET");
    expect(parsed.value.steps.at(-1)?.observation.levelsCompleted).toBe(1);
  });

  test("moves deterministically and wraps only when requested", () => {
    const parsed = parseArcRecording(recordedSession);
    if (!parsed.ok) throw new Error(parsed.error);
    const last = parsed.value.steps.length - 1;

    expect(moveReplayIndex(parsed.value, last, 1, false)).toBe(last);
    expect(moveReplayIndex(parsed.value, last, 1, true)).toBe(0);
    expect(moveReplayIndex(parsed.value, 0, -1, true)).toBe(last);
  });

  test("returns typed feedback for malformed frame bytes", () => {
    const changed = structuredClone(recordedSession) as unknown as {
      steps: { observation: { framesHex: string[] } }[];
    };
    const first = changed.steps[0];
    if (first === undefined) throw new Error("recorded session has no first step");
    first.observation.framesHex[0] = "not-a-frame";

    expect(parseArcRecording(changed)).toEqual({
      ok: false,
      error: "recording.steps[0].observation.framesHex must contain lowercase 64x64 palette frames",
    });
  });

  test("refuses a coordinate action without its coordinate", () => {
    const changed = structuredClone(recordedSession) as unknown as {
      steps: { observation: { action: { id: string } } }[];
    };
    const first = changed.steps[0];
    if (first === undefined) throw new Error("recorded session has no first step");
    first.observation.action.id = "ACTION6";

    expect(parseArcRecording(changed)).toEqual({
      ok: false,
      error: "recording.steps[0].observation.action.point is required for ACTION6",
    });
  });
});

describe("ACTION6 coordinate field", () => {
  test("binds a normalized three-cell forecast to the following click", () => {
    const parsed = parseArcRecording(recordedClickSession);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const before = parsed.value.steps[0];
    const after = parsed.value.steps[1];
    expect(before?.coordinateForecast?.masses).toHaveLength(3);
    expect(before?.coordinateForecast?.masses.reduce((sum, mass) => sum + mass.probability, 0)).toBe(1);
    expect(before?.coordinateForecast?.selected).toEqual(after?.observation.action.point);
    expect(after?.observation.levelsCompleted).toBe(1);
  });

  test("refuses probability mass that is not normalized", () => {
    const changed = structuredClone(recordedClickSession) as unknown as {
      steps: { coordinateForecast?: { masses: { probability: number }[] } }[];
    };
    const forecast = changed.steps[0]?.coordinateForecast;
    if (forecast === undefined) throw new Error("click session has no coordinate forecast");
    const first = forecast.masses[0];
    if (first === undefined) throw new Error("click forecast has no masses");
    first.probability = 0.1;

    expect(parseArcRecording(changed)).toEqual({
      ok: false,
      error: "recording.steps[0].coordinateForecast.masses probabilities must sum to 1",
    });
  });

  test("refuses a forecast selected point that differs from the next click", () => {
    const changed = structuredClone(recordedClickSession) as unknown as {
      steps: {
        coordinateForecast?: {
          masses: { x: number; y: number }[];
          selected: { x: number; y: number };
        };
      }[];
    };
    const forecast = changed.steps[0]?.coordinateForecast;
    if (forecast === undefined) throw new Error("click session has no coordinate forecast");
    const alternative = forecast.masses[1];
    if (alternative === undefined) throw new Error("click forecast has no alternative mass");
    forecast.selected.x = alternative.x;
    forecast.selected.y = alternative.y;

    expect(parseArcRecording(changed)).toEqual({
      ok: false,
      error: "recording.steps[0].coordinateForecast must select the next ACTION6 commit",
    });
  });

  test("refuses duplicate field coordinates", () => {
    const changed = structuredClone(recordedClickSession) as unknown as {
      steps: { coordinateForecast?: { masses: { x: number; y: number }[] } }[];
    };
    const masses = changed.steps[0]?.coordinateForecast?.masses;
    if (masses === undefined || masses.length < 2) throw new Error("click forecast has too few masses");
    const first = masses[0];
    const second = masses[1];
    if (first === undefined || second === undefined) throw new Error("click forecast has too few masses");
    second.x = first.x;
    second.y = first.y;

    expect(parseArcRecording(changed)).toEqual({
      ok: false,
      error: `recording.steps[0].coordinateForecast.masses contains duplicate coordinate ${String(first.x)},${String(first.y)}`,
    });
  });

  test("projects probability alpha and the committed point to distinct colors", () => {
    const parsed = parseArcRecording(recordedClickSession);
    if (!parsed.ok) throw new Error(parsed.error);
    const before = parsed.value.steps[0];
    const after = parsed.value.steps[1];
    if (before === undefined || after === undefined) throw new Error("click session is incomplete");

    const predicted = coordinateFieldPixels(before.coordinateForecast, before.observation);
    const committed = coordinateFieldPixels(after.coordinateForecast, after.observation);
    const offset = (12 * 64 + 10) * 4;

    expect(Array.from(predicted.slice(offset, offset + 4))).toEqual([255, 40, 40, 85]);
    expect(Array.from(committed.slice(offset, offset + 4))).toEqual([0, 255, 255, 255]);
  });
});
