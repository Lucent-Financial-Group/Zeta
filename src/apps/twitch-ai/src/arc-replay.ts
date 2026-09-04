export const ARC_FRAME_WIDTH = 64;
export const ARC_FRAME_HEIGHT = 64;

export type ArcActionId = "RESET" | "ACTION1" | "ACTION2" | "ACTION3" | "ACTION4" | "ACTION5" | "ACTION6" | "ACTION7";

export type ArcState = "NOT_PLAYED" | "NOT_FINISHED" | "WIN" | "GAME_OVER";

export interface ArcRecordedObservation {
  readonly action: {
    readonly id: ArcActionId;
    readonly point?: { readonly x: number; readonly y: number };
  };
  readonly availableActions: readonly ArcActionId[];
  readonly framesHex: readonly string[];
  readonly gameId: string;
  readonly guid: string;
  readonly levelsCompleted: number;
  readonly schemaVersion: 1;
  readonly state: ArcState;
  readonly winLevels: number;
}

export interface ArcRecordedStep {
  readonly tick: number;
  readonly observation: ArcRecordedObservation;
}

export interface ArcRecording {
  readonly gameId: string;
  readonly kind: "arc-recorded-session";
  readonly recordingVersion: 1;
  readonly sessionId: string;
  readonly source: "zeta-authored-local-environment";
  readonly steps: readonly ArcRecordedStep[];
  readonly title: string;
}

export type ArcReplayResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const ACTION_IDS: ReadonlySet<string> = new Set([
  "RESET",
  "ACTION1",
  "ACTION2",
  "ACTION3",
  "ACTION4",
  "ACTION5",
  "ACTION6",
  "ACTION7",
]);
const STATES: ReadonlySet<string> = new Set(["NOT_PLAYED", "NOT_FINISHED", "WIN", "GAME_OVER"]);
const FRAME_PATTERN = /^[0-9a-f]{4096}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function refused<T>(error: string): ArcReplayResult<T> {
  return { ok: false, error };
}

function parseAction(value: unknown, path: string): ArcReplayResult<ArcRecordedObservation["action"]> {
  if (!isRecord(value) || typeof value.id !== "string" || !ACTION_IDS.has(value.id)) {
    return refused(`${path}.id is not a known ARC action`);
  }
  if (value.point === undefined) return { ok: true, value: { id: value.id as ArcActionId } };
  if (
    value.id !== "ACTION6" ||
    !isRecord(value.point) ||
    !Number.isInteger(value.point.x) ||
    !Number.isInteger(value.point.y) ||
    Number(value.point.x) < 0 ||
    Number(value.point.x) >= ARC_FRAME_WIDTH ||
    Number(value.point.y) < 0 ||
    Number(value.point.y) >= ARC_FRAME_HEIGHT
  ) {
    return refused(`${path}.point must be an ACTION6 coordinate in the 64x64 frame`);
  }
  return {
    ok: true,
    value: { id: "ACTION6", point: { x: Number(value.point.x), y: Number(value.point.y) } },
  };
}

function parseObservation(value: unknown, path: string, gameId: string): ArcReplayResult<ArcRecordedObservation> {
  if (!isRecord(value)) return refused(`${path} must be an object`);
  const action = parseAction(value.action, `${path}.action`);
  if (!action.ok) return action;
  if (
    !Array.isArray(value.availableActions) ||
    !value.availableActions.every((item) => typeof item === "string" && ACTION_IDS.has(item))
  ) {
    return refused(`${path}.availableActions contains an unknown ARC action`);
  }
  if (
    !Array.isArray(value.framesHex) ||
    value.framesHex.length === 0 ||
    !value.framesHex.every((frame) => typeof frame === "string" && FRAME_PATTERN.test(frame))
  ) {
    return refused(`${path}.framesHex must contain lowercase 64x64 palette frames`);
  }
  if (value.gameId !== gameId) return refused(`${path}.gameId does not match the recording`);
  if (typeof value.guid !== "string" || value.guid.length === 0) {
    return refused(`${path}.guid must be a non-empty string`);
  }
  if (!Number.isInteger(value.levelsCompleted) || Number(value.levelsCompleted) < 0) {
    return refused(`${path}.levelsCompleted must be a non-negative integer`);
  }
  if (!Number.isInteger(value.winLevels) || Number(value.winLevels) < 0) {
    return refused(`${path}.winLevels must be a non-negative integer`);
  }
  if (value.schemaVersion !== 1) return refused(`${path}.schemaVersion must be 1`);
  if (typeof value.state !== "string" || !STATES.has(value.state)) {
    return refused(`${path}.state is not a known ARC state`);
  }
  return {
    ok: true,
    value: {
      action: action.value,
      availableActions: value.availableActions as ArcActionId[],
      framesHex: value.framesHex as string[],
      gameId,
      guid: value.guid,
      levelsCompleted: Number(value.levelsCompleted),
      schemaVersion: 1,
      state: value.state as ArcState,
      winLevels: Number(value.winLevels),
    },
  };
}

/** Validate untrusted artifact data without throwing at the page boundary. */
export function parseArcRecording(value: unknown): ArcReplayResult<ArcRecording> {
  if (!isRecord(value)) return refused("recording must be an object");
  if (value.kind !== "arc-recorded-session") return refused("recording.kind is unsupported");
  if (value.recordingVersion !== 1) return refused("recording.recordingVersion must be 1");
  if (value.source !== "zeta-authored-local-environment") {
    return refused("recording.source is unsupported");
  }
  if (typeof value.gameId !== "string" || value.gameId.length === 0) {
    return refused("recording.gameId must be a non-empty string");
  }
  if (typeof value.sessionId !== "string" || value.sessionId.length === 0) {
    return refused("recording.sessionId must be a non-empty string");
  }
  if (typeof value.title !== "string" || value.title.length === 0) {
    return refused("recording.title must be a non-empty string");
  }
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    return refused("recording.steps must be a non-empty array");
  }

  const candidates = value.steps as unknown[];
  const steps: ArcRecordedStep[] = [];
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    const path = `recording.steps[${String(index)}]`;
    if (!isRecord(candidate) || candidate.tick !== index) {
      return refused(`${path}.tick must be the contiguous replay index`);
    }
    const observation = parseObservation(candidate.observation, `${path}.observation`, value.gameId);
    if (!observation.ok) return observation;
    steps.push({ tick: index, observation: observation.value });
  }

  return {
    ok: true,
    value: {
      gameId: value.gameId,
      kind: "arc-recorded-session",
      recordingVersion: 1,
      sessionId: value.sessionId,
      source: "zeta-authored-local-environment",
      steps,
      title: value.title,
    },
  };
}

export function moveReplayIndex(recording: ArcRecording, current: number, delta: number, wrap: boolean): number {
  const last = recording.steps.length - 1;
  const proposed = current + delta;
  if (wrap && proposed > last) return 0;
  if (wrap && proposed < 0) return last;
  return Math.max(0, Math.min(last, proposed));
}
