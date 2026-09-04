import { ARC_FRAME_HEIGHT, ARC_FRAME_WIDTH, type ArcCoordinateMass, type ArcReplayResult } from "./arc-replay";

const CALIBRATION_BINS = 10;
const MASS_EPSILON = 1e-9;
const MINIMUM_SAMPLE_COUNT = 20;

interface ArcPoint {
  readonly x: number;
  readonly y: number;
}

export type ArcCalibrationOutcome =
  | { readonly kind: "committed"; readonly levelsCompleted: number; readonly point: ArcPoint }
  | { readonly kind: "refused"; readonly levelsCompleted: number };

export interface ArcCalibrationSample {
  readonly masses: readonly ArcCoordinateMass[];
  readonly minimumMass: number;
  readonly outcome: ArcCalibrationOutcome;
  readonly selected: ArcPoint;
  readonly tick: number;
}

export type ArcCalibrationVerdict = "calibrated" | "insufficient-data" | "uncalibrated";

export interface ArcCalibrationReport {
  readonly brierScore: number;
  readonly commitCount: number;
  readonly expectedCalibrationError: number;
  readonly meanSelectedMass: number;
  readonly maximumGateCalibrationError: number;
  readonly observedSelectedRate: number;
  readonly refusalCount: number;
  readonly sampleCount: number;
  readonly tolerance: number;
  readonly verdict: ArcCalibrationVerdict;
}

export interface ArcCalibrationDocument {
  readonly calibrationVersion: 1;
  readonly kind: "arc-coordinate-calibration";
  readonly policy: string;
  readonly report: ArcCalibrationReport;
  readonly samples: readonly ArcCalibrationSample[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function refused<T>(error: string): ArcReplayResult<T> {
  return { ok: false, error };
}

function parsePoint(value: unknown, path: string): ArcReplayResult<ArcPoint> {
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

function parseMasses(value: unknown, path: string): ArcReplayResult<readonly ArcCoordinateMass[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > 4096) {
    return refused(`${path} must contain 1..4096 coordinate masses`);
  }
  const masses: ArcCoordinateMass[] = [];
  const coordinates = new Set<string>();
  let total = 0;
  for (let index = 0; index < value.length; index++) {
    const candidate: unknown = value[index];
    const massPath = `${path}[${String(index)}]`;
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
    if (coordinates.has(key)) return refused(`${path} contains duplicate coordinate ${key}`);
    coordinates.add(key);
    total += candidate.probability;
    masses.push({ ...point.value, probability: candidate.probability });
  }
  if (Math.abs(total - 1) > MASS_EPSILON) return refused(`${path} probabilities must sum to 1`);
  return { ok: true, value: masses };
}

function parseOutcome(value: unknown, path: string): ArcReplayResult<ArcCalibrationOutcome> {
  if (!isRecord(value) || (value.kind !== "committed" && value.kind !== "refused")) {
    return refused(`${path}.kind must be committed or refused`);
  }
  if (!Number.isInteger(value.levelsCompleted) || Number(value.levelsCompleted) < 0) {
    return refused(`${path}.levelsCompleted must be a non-negative integer`);
  }
  if (value.kind === "refused") {
    if (value.point !== undefined) return refused(`${path}.point must be absent for a refusal`);
    return { ok: true, value: { kind: "refused", levelsCompleted: Number(value.levelsCompleted) } };
  }
  const point = parsePoint(value.point, `${path}.point`);
  if (!point.ok) return point;
  return {
    ok: true,
    value: { kind: "committed", levelsCompleted: Number(value.levelsCompleted), point: point.value },
  };
}

function parseSample(value: unknown, index: number): ArcReplayResult<ArcCalibrationSample> {
  const path = `calibration.samples[${String(index)}]`;
  if (!isRecord(value) || value.tick !== index) return refused(`${path}.tick must be the contiguous sample index`);
  if (
    typeof value.minimumMass !== "number" ||
    !Number.isFinite(value.minimumMass) ||
    value.minimumMass < 0 ||
    value.minimumMass > 1
  ) {
    return refused(`${path}.minimumMass must be finite and in [0,1]`);
  }
  const masses = parseMasses(value.masses, `${path}.masses`);
  if (!masses.ok) return masses;
  const selected = parsePoint(value.selected, `${path}.selected`);
  if (!selected.ok) return selected;
  const selectedMass = masses.value.find((mass) => mass.x === selected.value.x && mass.y === selected.value.y);
  if (selectedMass === undefined) return refused(`${path}.selected must name a coordinate with probability mass`);
  const maximum = Math.max(...masses.value.map((mass) => mass.probability));
  if (Math.abs(selectedMass.probability - maximum) > MASS_EPSILON) {
    return refused(`${path}.selected must name a maximum-mass coordinate`);
  }
  const outcome = parseOutcome(value.outcome, `${path}.outcome`);
  if (!outcome.ok) return outcome;
  return {
    ok: true,
    value: {
      masses: masses.value,
      minimumMass: value.minimumMass,
      outcome: outcome.value,
      selected: selected.value,
      tick: index,
    },
  };
}

function rounded(value: number): number {
  return Math.round(value * 1e12) / 1e12;
}

function selectedProbability(sample: ArcCalibrationSample): number {
  return sample.masses.find((mass) => mass.x === sample.selected.x && mass.y === sample.selected.y)?.probability ?? 0;
}

function selectedWasCommitted(sample: ArcCalibrationSample): number {
  return sample.outcome.kind === "committed" &&
    sample.outcome.point.x === sample.selected.x &&
    sample.outcome.point.y === sample.selected.y
    ? 1
    : 0;
}

/** Compute the same proper score and ten-bin ECE as the Python producer. */
export function measureCoordinateCalibration(
  samples: readonly ArcCalibrationSample[],
  tolerance: number,
): ArcCalibrationReport {
  if (samples.length === 0) {
    return {
      brierScore: 0,
      commitCount: 0,
      expectedCalibrationError: 0,
      meanSelectedMass: 0,
      maximumGateCalibrationError: 0,
      observedSelectedRate: 0,
      refusalCount: 0,
      sampleCount: 0,
      tolerance,
      verdict: "insufficient-data",
    };
  }
  const buckets: { probability: number; observed: number }[][] = Array.from({ length: CALIBRATION_BINS }, () => []);
  let probabilityTotal = 0;
  let observedTotal = 0;
  let brierTotal = 0;
  let commitCount = 0;
  const gateBuckets = new Map<number, { probability: number; observed: number }[]>();
  for (const sample of samples) {
    const probability = selectedProbability(sample);
    const observed = selectedWasCommitted(sample);
    probabilityTotal += probability;
    observedTotal += observed;
    brierTotal += (probability - observed) ** 2;
    if (sample.outcome.kind === "committed") commitCount++;
    const binIndex = Math.min(CALIBRATION_BINS - 1, Math.floor(probability * CALIBRATION_BINS));
    buckets[binIndex]?.push({ probability, observed });
    const gateBucket = gateBuckets.get(sample.minimumMass) ?? [];
    gateBucket.push({ probability, observed });
    gateBuckets.set(sample.minimumMass, gateBucket);
  }
  let expectedCalibrationError = 0;
  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    const meanProbability = bucket.reduce((sum, item) => sum + item.probability, 0) / bucket.length;
    const observedRate = bucket.reduce((sum, item) => sum + item.observed, 0) / bucket.length;
    expectedCalibrationError += (bucket.length / samples.length) * Math.abs(meanProbability - observedRate);
  }
  let maximumGateCalibrationError = 0;
  for (const bucket of gateBuckets.values()) {
    const meanProbability = bucket.reduce((sum, item) => sum + item.probability, 0) / bucket.length;
    const observedRate = bucket.reduce((sum, item) => sum + item.observed, 0) / bucket.length;
    maximumGateCalibrationError = Math.max(maximumGateCalibrationError, Math.abs(meanProbability - observedRate));
  }
  let verdict: ArcCalibrationVerdict = "uncalibrated";
  if (samples.length < MINIMUM_SAMPLE_COUNT) verdict = "insufficient-data";
  else if (Math.max(expectedCalibrationError, maximumGateCalibrationError) <= tolerance) verdict = "calibrated";
  return {
    brierScore: rounded(brierTotal / samples.length),
    commitCount,
    expectedCalibrationError: rounded(expectedCalibrationError),
    meanSelectedMass: rounded(probabilityTotal / samples.length),
    maximumGateCalibrationError: rounded(maximumGateCalibrationError),
    observedSelectedRate: rounded(observedTotal / samples.length),
    refusalCount: samples.length - commitCount,
    sampleCount: samples.length,
    tolerance,
    verdict,
  };
}

function parseDeclaredReport(value: unknown): ArcReplayResult<ArcCalibrationReport> {
  if (!isRecord(value)) return refused("calibration.report must be an object");
  const numericKeys = [
    "brierScore",
    "commitCount",
    "expectedCalibrationError",
    "meanSelectedMass",
    "maximumGateCalibrationError",
    "observedSelectedRate",
    "refusalCount",
    "sampleCount",
    "tolerance",
  ] as const;
  if (numericKeys.some((key) => typeof value[key] !== "number" || !Number.isFinite(value[key]))) {
    return refused("calibration.report metrics must be finite numbers");
  }
  if (
    !Number.isInteger(value.commitCount) ||
    Number(value.commitCount) < 0 ||
    !Number.isInteger(value.refusalCount) ||
    Number(value.refusalCount) < 0 ||
    !Number.isInteger(value.sampleCount) ||
    Number(value.sampleCount) < 0
  ) {
    return refused("calibration.report counts must be non-negative integers");
  }
  if (Number(value.tolerance) < 0 || Number(value.tolerance) > 1) {
    return refused("calibration.report.tolerance must be in [0,1]");
  }
  if (value.verdict !== "calibrated" && value.verdict !== "insufficient-data" && value.verdict !== "uncalibrated") {
    return refused("calibration.report.verdict is unknown");
  }
  return { ok: true, value: value as unknown as ArcCalibrationReport };
}

function reportsEqual(left: ArcCalibrationReport, right: ArcCalibrationReport): boolean {
  return (
    Object.is(left.brierScore, right.brierScore) &&
    Object.is(left.commitCount, right.commitCount) &&
    Object.is(left.expectedCalibrationError, right.expectedCalibrationError) &&
    Object.is(left.meanSelectedMass, right.meanSelectedMass) &&
    Object.is(left.maximumGateCalibrationError, right.maximumGateCalibrationError) &&
    Object.is(left.observedSelectedRate, right.observedSelectedRate) &&
    Object.is(left.refusalCount, right.refusalCount) &&
    Object.is(left.sampleCount, right.sampleCount) &&
    Object.is(left.tolerance, right.tolerance) &&
    left.verdict === right.verdict
  );
}

/** Validate the corpus and reject a producer report that disagrees with the browser meter. */
export function parseArcCalibration(value: unknown): ArcReplayResult<ArcCalibrationDocument> {
  if (!isRecord(value)) return refused("calibration must be an object");
  if (value.kind !== "arc-coordinate-calibration") return refused("calibration.kind is unsupported");
  if (value.calibrationVersion !== 1) return refused("calibration.calibrationVersion must be 1");
  if (typeof value.policy !== "string" || value.policy.length === 0) {
    return refused("calibration.policy must be a non-empty string");
  }
  if (!Array.isArray(value.samples)) return refused("calibration.samples must be an array");
  const samples: ArcCalibrationSample[] = [];
  for (let index = 0; index < value.samples.length; index++) {
    const sample = parseSample(value.samples[index], index);
    if (!sample.ok) return sample;
    samples.push(sample.value);
  }
  const declared = parseDeclaredReport(value.report);
  if (!declared.ok) return declared;
  const measured = measureCoordinateCalibration(samples, declared.value.tolerance);
  if (!reportsEqual(measured, declared.value)) {
    return refused("calibration.report does not match the recorded samples");
  }
  return {
    ok: true,
    value: {
      calibrationVersion: 1,
      kind: "arc-coordinate-calibration",
      policy: value.policy,
      report: measured,
      samples,
    },
  };
}
