/**
 * reticulum-metered-transport.ts — Deterministic in-memory transport simulation
 * and descriptive timing statistics.
 *
 * Boundary:
 *   - ReticulumMeteredPeer records caller-supplied timestamps; it does not
 *     instrument physical hardware or establish that timestamps share a clock.
 *   - ReticulumMeshMeteredNetwork is an in-process synthetic latency simulator.
 *     It never opens a socket, discovers a peer, or broadcasts a real frame.
 *   - Entropy values below are histogram summaries only, not thermodynamic work
 *     or a Maxwell-demon claim.
 */

import { destinationHash } from "./reticulum-transport.js";

const UINT32_MAX_EXCLUSIVE = 4_294_967_296;
const DEFAULT_SIMULATION_SEED = 0x6d2b79f5;
const DEFAULT_INTER_BROADCAST_NS = 1_000_000n;

export interface TransportSample {
  readonly frameId: string;
  readonly srcDest: string;
  readonly dstDest: string;
  readonly sendTimeNs: bigint;
  readonly receiveTimeNs: bigint;
  readonly latencyNs: bigint;
  readonly payloadBytes: number;
}

export interface ReticulumEntropyMetrics {
  readonly totalPacketsMeasured: number;
  readonly meanLatencyMs: number;
  readonly medianLatencyMs: number;
  readonly jitterMs: number;
  readonly minLatencyMs: number;
  readonly maxLatencyMs: number;
  readonly interArrivalEntropyBits: number;
  readonly byteEntropyBits: number;
  /**
   * The non-negative gap between the observed inter-arrival histogram entropy
   * and the finite maximum used by this descriptive calculation.
   */
  readonly interArrivalUniformityGapBits: number;
}

/**
 * Declared inputs to the in-process latency simulator. A seed and logical clock
 * make a finite call sequence replayable in the declared JavaScript runtime.
 */
export interface MeshSimulationOptions {
  readonly seed?: number;
  readonly startTimeNs?: bigint;
  readonly interBroadcastNs?: bigint;
}

/** Calculates Shannon entropy H(X) = -sum(p_i * log2(p_i)) over histogram bins. */
export function calculateShannonEntropy(values: readonly number[], binCount: number = 32): number {
  if (!Number.isInteger(binCount) || binCount <= 0) {
    throw new Error(`binCount must be a positive integer; received ${binCount}`);
  }
  if (values.length === 0) return 0;

  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new Error("entropy values must be finite");
    }
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (min === max) return 0;

  const bins = new Uint32Array(binCount);
  const range = max - min;
  for (const value of values) {
    const binIndex = Math.min(binCount - 1, Math.floor(((value - min) / range) * binCount));
    bins[binIndex]!++;
  }

  let entropy = 0;
  const total = values.length;
  for (let index = 0; index < binCount; index++) {
    const count = bins[index]!;
    if (count > 0) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
  }

  return entropy;
}

function requireUint32Seed(seed: number): number {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_MAX_EXCLUSIVE) {
    throw new Error(`simulation seed must be an unsigned 32-bit integer; received ${seed}`);
  }

  // xorshift32's all-zero state cannot advance. Zero is deliberately mapped to
  // a fixed nonzero state rather than adding a time-dependent fallback.
  return seed === 0 ? DEFAULT_SIMULATION_SEED : seed;
}

function requireNonNegativeNs(value: bigint, label: string): bigint {
  if (value < 0n) {
    throw new Error(`${label} must be non-negative; received ${value}`);
  }
  return value;
}

/** Stores timestamp observations supplied by the caller. */
export class ReticulumMeteredPeer {
  readonly zid: string;
  readonly destHash: string;
  private readonly samples: TransportSample[] = [];
  private lastReceiveTimeNs?: bigint;

  constructor(zid: string) {
    this.zid = zid;
    this.destHash = destinationHash(zid);
  }

  /**
   * Records a caller-supplied arrival observation. Negative differences are
   * represented as zero rather than treated as evidence about clock ordering.
   */
  recordFrameArrival(
    frameId: string,
    srcDest: string,
    sendTimeNs: bigint,
    receiveTimeNs: bigint,
    payloadBytes: number,
  ): TransportSample {
    const latencyNs = receiveTimeNs >= sendTimeNs ? receiveTimeNs - sendTimeNs : 0n;
    const sample: TransportSample = {
      frameId,
      srcDest,
      dstDest: this.destHash,
      sendTimeNs,
      receiveTimeNs,
      latencyNs,
      payloadBytes,
    };
    this.samples.push(sample);
    this.lastReceiveTimeNs = receiveTimeNs;
    return sample;
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  get lastReceiveNs(): bigint | undefined {
    return this.lastReceiveTimeNs;
  }

  /** Computes finite descriptive summaries over retained caller-supplied samples. */
  computeEntropyMetrics(): ReticulumEntropyMetrics {
    if (this.samples.length === 0) {
      return {
        totalPacketsMeasured: 0,
        meanLatencyMs: 0,
        medianLatencyMs: 0,
        jitterMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        interArrivalEntropyBits: 0,
        byteEntropyBits: 0,
        interArrivalUniformityGapBits: 0,
      };
    }

    const latenciesMs = this.samples.map((sample) => Number(sample.latencyNs) / 1e6);
    const sortedLatencies = [...latenciesMs].sort((left, right) => left - right);
    const totalPacketsMeasured = this.samples.length;
    const meanLatencyMs = latenciesMs.reduce((accumulator, latency) => accumulator + latency, 0) / totalPacketsMeasured;
    const medianLatencyMs = sortedLatencies[Math.floor(totalPacketsMeasured / 2)]!;
    const minLatencyMs = sortedLatencies[0]!;
    const maxLatencyMs = sortedLatencies[totalPacketsMeasured - 1]!;
    const variance =
      latenciesMs.reduce((accumulator, latency) => accumulator + Math.pow(latency - meanLatencyMs, 2), 0) /
      totalPacketsMeasured;
    const jitterMs = Math.sqrt(variance);

    const interArrivalDeltasMs: number[] = [];
    for (let index = 1; index < this.samples.length; index++) {
      const deltaNs = this.samples[index]!.receiveTimeNs - this.samples[index - 1]!.receiveTimeNs;
      interArrivalDeltasMs.push(Number(deltaNs) / 1e6);
    }

    const interArrivalEntropyBits = calculateShannonEntropy(interArrivalDeltasMs);
    const byteEntropyBits = calculateShannonEntropy(this.samples.map((sample) => sample.payloadBytes));
    const maximumInterArrivalEntropyBits = Math.log2(Math.max(1, interArrivalDeltasMs.length));
    const interArrivalUniformityGapBits = Math.max(0, maximumInterArrivalEntropyBits - interArrivalEntropyBits);

    return {
      totalPacketsMeasured,
      meanLatencyMs,
      medianLatencyMs,
      jitterMs,
      minLatencyMs,
      maxLatencyMs,
      interArrivalEntropyBits,
      byteEntropyBits,
      interArrivalUniformityGapBits,
    };
  }
}

/**
 * Deterministic in-process mesh latency simulator. Its outputs are synthetic
 * receipts defined by this class's inputs and call order, not network traffic.
 */
export class ReticulumMeshMeteredNetwork {
  readonly peers: Map<string, ReticulumMeteredPeer> = new Map();
  private randomState: number;
  private logicalNowNs: bigint;
  private readonly interBroadcastNs: bigint;

  constructor(options: MeshSimulationOptions = {}) {
    this.randomState = requireUint32Seed(options.seed ?? DEFAULT_SIMULATION_SEED);
    this.logicalNowNs = requireNonNegativeNs(options.startTimeNs ?? 0n, "simulation startTimeNs");
    this.interBroadcastNs = requireNonNegativeNs(
      options.interBroadcastNs ?? DEFAULT_INTER_BROADCAST_NS,
      "simulation interBroadcastNs",
    );
  }

  addPeer(zid: string): ReticulumMeteredPeer {
    const peer = new ReticulumMeteredPeer(zid);
    this.peers.set(peer.destHash, peer);
    return peer;
  }

  private nextUnitInterval(): number {
    let state = this.randomState;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.randomState = state >>> 0;
    return this.randomState / UINT32_MAX_EXCLUSIVE;
  }

  private nextGaussian(): number {
    const first = Math.max(this.nextUnitInterval(), Number.MIN_VALUE);
    const second = this.nextUnitInterval();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  }

  /**
   * Simulates a frame delivery to each in-memory peer. Base latency and jitter
   * are synthetic model inputs expressed in milliseconds.
   */
  broadcastFrame(
    senderZid: string,
    frameId: string,
    payloadBytes: number,
    baseLatencyMs: number = 2.0,
    jitterStdDevMs: number = 0.5,
  ): TransportSample[] {
    if (!Number.isFinite(baseLatencyMs) || baseLatencyMs < 0) {
      throw new Error(`simulation baseLatencyMs must be finite and non-negative; received ${baseLatencyMs}`);
    }
    if (!Number.isFinite(jitterStdDevMs) || jitterStdDevMs < 0) {
      throw new Error(`simulation jitterStdDevMs must be finite and non-negative; received ${jitterStdDevMs}`);
    }

    const senderDest = destinationHash(senderZid);
    const sendTimeNs = this.logicalNowNs;
    const samples: TransportSample[] = [];

    for (const [destHash, peer] of this.peers.entries()) {
      if (destHash === senderDest) continue;
      const syntheticLatencyMs = Math.max(0.1, baseLatencyMs + this.nextGaussian() * jitterStdDevMs);
      const receiveTimeNs = sendTimeNs + BigInt(Math.floor(syntheticLatencyMs * 1e6));
      samples.push(peer.recordFrameArrival(frameId, senderDest, sendTimeNs, receiveTimeNs, payloadBytes));
    }

    this.logicalNowNs += this.interBroadcastNs;
    return samples;
  }
}
