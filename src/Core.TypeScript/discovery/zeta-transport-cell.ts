/**
 * zeta-transport-cell.ts — Bounded adaptive fan-out prototype.
 *
 * The cell accepts caller-provided transport descriptors, attempts a payload on
 * active descriptors in local priority order, and records success/failure
 * feedback in local scheduler and DimensionalBnn state. It is not itself a
 * socket, discovery, DHT, mesh, privacy, or durable-evidence implementation.
 *
 * Transport kind labels are adapter categories only. Their presence does not
 * establish that a given UDP, Reticulum, WebSocket, Git, or browser transport
 * has been configured, connected, authorized, secure, or consented to.
 *
 * Optional PriorHints are serialized scalar inputs. They are not CRDT evidence
 * state, do not create a shared posterior by themselves, and do not predict
 * future outcomes. The bounded rejection-pattern state may reduce a local
 * descriptor's priority; it is a scheduling heuristic, not a physical model or
 * a claim about time, causality, consciousness, or biology.
 *
 * Cross-module similarities are implementation analogies only. They do not
 * prove homoiconicity, universal transport equivalence, or group-level effects.
 */

import type { SalonTransport } from "./gossip-salon";
import { envelopeId, type ErrorDimension, type ErrorEnvelope } from "../protocol/error-envelope";
import { mergePriorHint, type PriorHint } from "../protocol/batch-teaching-envelope";
import {
  makeQuasiState,
  updateQuasiState,
  makeLaneFeedbackTracker,
  updateLaneFeedback,
  upgradeAck,
  dominantDimension,
  type LaneFeedbackTracker,
  type QuasiCrystalState,
} from "../ferry-throttler/four-corner-feedback";
import {
  createHeatAwareScheduler,
  createStrictPriorityScheduler,
  type HeatAwareScheduler,
} from "../ferry-throttler";
import { batchTemperatureBand } from "../protocol/batch-heat-bridge";
import {
  createDimensionalBnn,
  absorbError,
  replaceDimensionPosterior,
  ALL_DIMENSIONS,
  dimensionPosterior,
  type DimensionalBnn,
} from "../planning/error-bnn-bridge";
// ── Transport descriptor ───────────────────────────────────────────────────────

export type TransportKind = "udp" | "reticulum" | "websocket" | "git" | "broadcast";

export interface TransportDescriptor {
  readonly kind: TransportKind;
  readonly transport: SalonTransport;
  /** Local priority (0 = highest); may be updated from local feedback state. */
  priority: number;
  /** Bounded local rejection-pattern state for this descriptor. */
  quasiState: QuasiCrystalState;
  /** Lane feedback tracker for this transport. */
  feedback: LaneFeedbackTracker;
  /** Local scheduling factor (1 = active, 0 = skipped). */
  dilationFactor: number;
}

// ── ZetaTransportCell ──────────────────────────────────────────────────────────

export interface ZetaTransportCellOptions {
  /** Available transports (at least one required). */
  readonly transports: readonly TransportDescriptor[];
  /** Optional local dimensional feedback state shared by these descriptors. */
  readonly bnn?: DimensionalBnn;
  /** Node identity (stamped on outgoing events). */
  readonly nodeId: string;
  /** Callback when a teaching ack is received. */
  readonly onTeachingAck?: (kind: TransportKind, dimension: ErrorDimension, generatorFn: string) => void;
  /**
   * Optional HeatAwareScheduler for per-transport heat throttling.
   * When provided, failed sends signal recordHeat(laneIndex, band) and
   * successful sends signal recordDrain(laneIndex, items, bytes).
   * The lane index maps to the transport order in `transports`.
   * Defaults to a new HeatAwareScheduler wrapping StrictPriorityScheduler.
   */
  readonly heatScheduler?: HeatAwareScheduler;
}

export interface SendResult {
  readonly ok: boolean;
  readonly transport: TransportKind;
  readonly reason?: string;
  readonly teachingAck?: { dimension: ErrorDimension; generatorFn: string };
}

/**
 * ZetaTransportCell — local adaptive fan-out over supplied descriptors.
 *
 * Fan-out attempts supplied active transports. Local feedback may alter a
 * future attempt order or scheduling factor. This does not establish delivery,
 * network reachability, or a learned/general routing policy.
 */
export class ZetaTransportCell {
  private readonly _transports: TransportDescriptor[];
  private readonly _bnn: DimensionalBnn;
  private readonly _nodeId: string;
  private readonly _onTeachingAck:
    | ((kind: TransportKind, dimension: ErrorDimension, generatorFn: string) => void)
    | undefined;
  /** Per-transport heat scheduler — throttles hot transports via AIMD backpressure. */
  private readonly _heatScheduler: HeatAwareScheduler;

  constructor(opts: ZetaTransportCellOptions) {
    this._transports = [...opts.transports];
    this._bnn = opts.bnn ?? createDimensionalBnn();
    this._nodeId = opts.nodeId;
    this._onTeachingAck = opts.onTeachingAck;
    this._heatScheduler = opts.heatScheduler
      ?? createHeatAwareScheduler(createStrictPriorityScheduler(), opts.transports.length);
  }

  /** Attempt an event over all active supplied descriptors (local fan-out). */
  async send(event: string): Promise<SendResult[]> {
    // Sort by priority (lowest number = highest priority), skip fully dilated
    const active = this._transports
      .filter(t => t.dilationFactor > 0.05)
      .sort((a, b) => a.priority - b.priority);

    const results: SendResult[] = [];
    for (const desc of active) {
      try {
        // Serialize optional local scalar hints. A recipient must explicitly
        // choose whether and how to consume them; this is not CRDT state merge.
        const priorHints: PriorHint[] = ALL_DIMENSIONS.map((d): PriorHint => {
          const p = dimensionPosterior(this._bnn, d);
          return {
            dimension: d,
            mu: p.mu,
            sigma2: p.sigma2,
            robustnessWeight: p.robustnessWeight,
            obsCount: 0,
            senderZid: this._nodeId,
          };
        });
        // Embed hints as a JSON annotation; receivers that do not recognize the
        // field retain the original event payload.
        let eventWithHints = event;
        try {
          const parsed = JSON.parse(event) as Record<string, unknown>;
          parsed.__priorHints = priorHints;
          eventWithHints = JSON.stringify(parsed);
        } catch { /* not JSON — send as-is */ }
        await desc.transport.publish(eventWithHints);
        // Successful local publish callback → update local rejection pattern.
        desc.quasiState = updateQuasiState(desc.quasiState, false);
        desc.feedback = updateLaneFeedback(desc.feedback, { kind: "received", frameId: event.slice(0, 16) });
        // Successful callback → local scheduler recovery for this lane.
        const laneIdx = this._transports.indexOf(desc);
        if (laneIdx >= 0) this._heatScheduler.recordDrain(laneIdx, 1, event.length);
        results.push({ ok: true, transport: desc.kind });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        // Failed callback → local error feedback and scheduler update.
        const rawAck = { kind: "rejected" as const, frameId: event.slice(0, 16), reason };
        const teachingAck = upgradeAck(rawAck, desc.priority);
        if (teachingAck.kind === "rejected") {
          // Update the optional local feedback state.
          const corrId = `${desc.kind}:${event.slice(0, 8)}`;
          const envelope: ErrorEnvelope = {
            envelopeId: envelopeId(corrId, teachingAck.dimension, `transport ${desc.kind} rejected event`, reason),
            correlationId: corrId,
            beacon: `Transport ${desc.kind} rejected event: ${reason}. Fix: ${teachingAck.generatorFn}`,
            mirror: {
              what: `transport ${desc.kind} rejected event`,
              why: reason,
              howToFix: teachingAck.generatorFn,
              dimension: teachingAck.dimension,
              severity: "error",
              ...(teachingAck.retractableBeliefId === undefined
                ? {}
                : { retractableBeliefId: teachingAck.retractableBeliefId }),
            },
            emittedAt: new Date().toISOString(),
          };
          absorbError(this._bnn, envelope);
          // Update bounded local rejection-pattern state.
          desc.quasiState = updateQuasiState(desc.quasiState, true);
          desc.feedback = updateLaneFeedback(desc.feedback, teachingAck);
          // Update the local scheduling factor.
          desc.dilationFactor = desc.quasiState.dilationFactor;
          // Derive local priority from the bounded feedback state.
          const status = ALL_DIMENSIONS.map(d => ({ dimension: d, ...dimensionPosterior(this._bnn, d) }));
          const transportStatus = status.find(s => s.dimension === teachingAck.dimension);
          if (transportStatus) {
            desc.priority = Math.round((1 - transportStatus.mu) * 10);
          }
          this._onTeachingAck?.(desc.kind, teachingAck.dimension, teachingAck.generatorFn);
          // Failed callback → local backpressure band derived from feedback state.
          const laneIdx = this._transports.indexOf(desc);
          if (laneIdx >= 0) {
            const transportStatus = ALL_DIMENSIONS.map(d => ({ dimension: d, ...dimensionPosterior(this._bnn, d) }))
              .find(s => s.dimension === "transport");
            // mu > 0.5 = more failures than successes → hot; > 0.67 → critical
            const band = transportStatus
              ? batchTemperatureBand({ unaccountedHeat: Math.round(transportStatus.mu * 10), failedItems: 10 })
              : "hot";
            this._heatScheduler.recordHeat(laneIdx, band);
          }
          results.push({ ok: false, transport: desc.kind, reason, teachingAck: { dimension: teachingAck.dimension, generatorFn: teachingAck.generatorFn } });
        }
      }
    }
    return results;
  }

  /** Register a caller-provided handler on all supplied transport descriptors. */
  onMessage(handler: (msg: string, from: TransportKind) => void): void {
    for (const desc of this._transports) {
      desc.transport.onFrame((msg) => handler(msg, desc.kind));
    }
  }

  /**
   * Combine accepted scalar PriorHints into the local feedback state. The caller
   * is responsible for admission and trust policy; this method does not verify
   * the sender, prove independence, or merge replicated evidence state.
   */
  mergePriorHints(hints: PriorHint[], trustWeight = 0.5): void {
    for (const hint of hints) {
      const local = dimensionPosterior(this._bnn, hint.dimension);
      const merged = mergePriorHint(
        { mu: local.mu, sigma2: local.sigma2 },
        hint,
        trustWeight,
      );
      // A peer belief is not an error. absorbError mapped every hint to
      // severity "info" → z = 0.5, so mu=4 and mu=0 were indistinguishable
      // (081M005CBQ6087G0R003N21Z9J). Write the merged posterior directly.
      replaceDimensionPosterior(this._bnn, hint.dimension, merged);
    }
  }

  /** Get the current local per-dimension feedback-state summary. */
  bnnStatus() {
    return ALL_DIMENSIONS.map(d => ({
      dimension: d,
      ...dimensionPosterior(this._bnn, d),
    }));
  }

  /** Get the current local descriptor scheduling summary. */
  health(): Array<{ kind: TransportKind; priority: number; dilationFactor: number; quasiPeriod: number; dominantError: ErrorDimension; heatWeight: number }> {
    return this._transports.map((t, i) => ({
      kind: t.kind,
      priority: t.priority,
      dilationFactor: t.dilationFactor,
      quasiPeriod: t.quasiState.period,
      dominantError: dominantDimension(t.feedback),
      heatWeight: this._heatScheduler.heatWeights[i] ?? 1.0,
    }));
  }
  /** Get local scheduler weights (1.0 = active, 0.05 = near-stall). */
  heatWeights(): readonly number[] {
    return this._heatScheduler.heatWeights;
  }

  /**
   * Reset local scheduler weights to 1.0 and skip counters to zero. This does
   * not change a remote transport, delivery history, or feedback-state summary.
   */
  resetHeat(): void {
    this._heatScheduler.resetHeat();
  }

  /** Serialize the local feedback-state summary for a caller-selected store. */
  serializeBnn(): string {
    return JSON.stringify(this.bnnStatus());
  }
}

// ── Factory helpers ────────────────────────────────────────────────────────────

/** Create a TransportDescriptor from a SalonTransport. */
export function makeTransportDescriptor(
  kind: TransportKind,
  transport: SalonTransport,
  priority = 0,
): TransportDescriptor {
  return {
    kind,
    transport,
    priority,
    quasiState: makeQuasiState(),
    feedback: makeLaneFeedbackTracker(priority),
    dilationFactor: 1,
  };
}

/** Create a ZetaTransportCell from a map of transport kinds to SalonTransports. */
export function createZetaTransportCell(
  nodeId: string,
  transports: Partial<Record<TransportKind, SalonTransport>>,
  opts?: Partial<Omit<ZetaTransportCellOptions, "nodeId" | "transports">>,
): ZetaTransportCell {
  const descs: TransportDescriptor[] = [];
  const order: TransportKind[] = ["broadcast", "websocket", "udp", "reticulum", "git"];
  for (let i = 0; i < order.length; i++) {
    const kind = order[i]!;
    const t = transports[kind];
    if (t) descs.push(makeTransportDescriptor(kind, t, i));
  }
  if (descs.length === 0) throw new RangeError("ZetaTransportCell: at least one transport required");
  return new ZetaTransportCell({ nodeId, transports: descs, ...opts });
}
