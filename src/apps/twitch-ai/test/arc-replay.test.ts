import { describe, expect, test } from "bun:test";

import recordedSession from "../src/recordings/arc-ztch-v1-session.json";
import { moveReplayIndex, parseArcRecording } from "../src/arc-replay";

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
