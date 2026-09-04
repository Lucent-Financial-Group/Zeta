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

export interface ArcCoordinateMass {
  readonly probability: number;
  readonly x: number;
  readonly y: number;
}

export interface ArcCoordinateForecast {
  readonly action: "ACTION6";
  readonly masses: readonly ArcCoordinateMass[];
  readonly selected: { readonly x: number; readonly y: number };
}

export interface ArcRecordedStep {
  readonly tick: number;
  readonly observation: ArcRecordedObservation;
  readonly coordinateForecast?: ArcCoordinateForecast;
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
const MASS_EPSILON = 1e-9;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function refused<T>(error: string): ArcReplayResult<T> {
  return { ok: false, error };
}

function parsePoint(value: unknown, path: string): ArcReplayResult<{ readonly x: number; readonly y: number }> {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.x) ||
    !Number.isInteger(value.y) ||
    Number(value.x) < 0 ||
    Number(value.x) >= ARC_FRAME_WIDTH ||
    Number(value.y) < 0 ||
    Number(value.y) >= ARC_FRAME_HEIGHT
  ) {
    return refused(`${path} must be a coordinate in the 64x64 frame`);
  }
  return { ok: true, value: { x: Number(value.x), y: Number(value.y) } };
}

function parseAction(value: unknown, path: string): ArcReplayResult<ArcRecordedObservation["action"]> {
  if (!isRecord(value) || typeof value.id !== "string" || !ACTION_IDS.has(value.id)) {
    return refused(`${path}.id is not a known ARC action`);
  }
  if (value.point === undefined) {
    if (value.id === "ACTION6") return refused(`${path}.point is required for ACTION6`);
    return { ok: true, value: { id: value.id as ArcActionId } };
  }
  if (value.id !== "ACTION6") {
    return refused(`${path}.point must be an ACTION6 coordinate in the 64x64 frame`);
  }
  const point = parsePoint(value.point, `${path}.point`);
  if (!point.ok) return refused(`${path}.point must be an ACTION6 coordinate in the 64x64 frame`);
  return {
    ok: true,
    value: { id: "ACTION6", point: point.value },
  };
}

function parseCoordinateForecast(value: unknown, path: string): ArcReplayResult<ArcCoordinateForecast> {
  if (!isRecord(value) || value.action !== "ACTION6") {
    return refused(`${path}.action must be ACTION6`);
  }
  if (!Array.isArray(value.masses) || value.masses.length === 0 || value.masses.length > 4096) {
    return refused(`${path}.masses must contain 1..4096 coordinate masses`);
  }

  const candidates = value.masses as unknown[];
  const masses: ArcCoordinateMass[] = [];
  const coordinates = new Set<string>();
  let total = 0;
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    const massPath = `${path}.masses[${String(index)}]`;
    if (!isRecord(candidate)) return refused(`${massPath} must be an object`);
    const point = parsePoint(candidate, massPath);
    if (!point.ok) return point;
    if (
      typeof candidate.probability !== "number" ||
      !Number.isFinite(candidate.probability) ||
      candidate.probability <= 0 ||
      candidate.probability > 1
    ) {
      return refused(`${massPath}.probability must be finite and in (0,1]`);
    }
    const key = `${String(point.value.x)},${String(point.value.y)}`;
    if (coordinates.has(key)) return refused(`${path}.masses contains duplicate coordinate ${key}`);
    coordinates.add(key);
    total += candidate.probability;
    masses.push({ ...point.value, probability: candidate.probability });
  }
  if (Math.abs(total - 1) > MASS_EPSILON) {
    return refused(`${path}.masses probabilities must sum to 1`);
  }

  const selected = parsePoint(value.selected, `${path}.selected`);
  if (!selected.ok) return selected;
  const selectedMass = masses.find((mass) => mass.x === selected.value.x && mass.y === selected.value.y);
  if (selectedMass === undefined) return refused(`${path}.selected must name a coordinate with probability mass`);
  const maximum = Math.max(...masses.map((mass) => mass.probability));
  if (Math.abs(selectedMass.probability - maximum) > MASS_EPSILON) {
    return refused(`${path}.selected must name a maximum-mass coordinate`);
  }

  return { ok: true, value: { action: "ACTION6", masses, selected: selected.value } };
}

function parseSteps(value: unknown, gameId: string): ArcReplayResult<readonly ArcRecordedStep[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return refused("recording.steps must be a non-empty array");
  }

  const candidates = value as unknown[];
  const steps: ArcRecordedStep[] = [];
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    const path = `recording.steps[${String(index)}]`;
    if (!isRecord(candidate) || candidate.tick !== index) {
      return refused(`${path}.tick must be the contiguous replay index`);
    }
    const observation = parseObservation(candidate.observation, `${path}.observation`, gameId);
    if (!observation.ok) return observation;
    if (candidate.coordinateForecast === undefined) {
      steps.push({ tick: index, observation: observation.value });
      continue;
    }
    const coordinateForecast = parseCoordinateForecast(candidate.coordinateForecast, `${path}.coordinateForecast`);
    if (!coordinateForecast.ok) return coordinateForecast;
    steps.push({ tick: index, observation: observation.value, coordinateForecast: coordinateForecast.value });
  }
  return { ok: true, value: steps };
}

function validateForecastBindings(steps: readonly ArcRecordedStep[]): ArcReplayResult<true> {
  for (let index = 0; index < steps.length; index++) {
    const forecast = steps[index]?.coordinateForecast;
    if (forecast === undefined) continue;
    const nextAction = steps[index + 1]?.observation.action;
    if (
      nextAction?.id !== "ACTION6" ||
      nextAction.point?.x !== forecast.selected.x ||
      nextAction.point.y !== forecast.selected.y
    ) {
      return refused(`recording.steps[${String(index)}].coordinateForecast must select the next ACTION6 commit`);
    }
  }
  return { ok: true, value: true };
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
  const steps = parseSteps(value.steps, value.gameId);
  if (!steps.ok) return steps;
  const binding = validateForecastBindings(steps.value);
  if (!binding.ok) return binding;

  return {
    ok: true,
    value: {
      gameId: value.gameId,
      kind: "arc-recorded-session",
      recordingVersion: 1,
      sessionId: value.sessionId,
      source: "zeta-authored-local-environment",
      steps: steps.value,
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
