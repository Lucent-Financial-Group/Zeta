# Design Document: Ferry Throttler Priority Lanes

## Overview

This design adds a **composition layer** — `PriorityFerryThrottler` — on top of the existing `FerryThrottler` and `FerryThrottlerWithResult`. The priority layer manages N internal lane queues and a **shared ferry pool** with a configurable draining policy that determines which lane's next boat sails when a ferry becomes free.

The architecture follows **Approach B: N internal queues + draining policy orchestrator**. This preserves the "same code scales" philosophy: at one lane, `PriorityFerryThrottler` degenerates to a plain `FerryThrottler`; at N lanes with DoP=1, drain order is fully deterministic (DST-replayable); at N lanes with DoP=M, the same code scales to M concurrent ferries.

**Key invariants:**
- Ferries are shared across lanes (global DoP), not per-lane DoP.
- The existing `FerryThrottler` / `FerryThrottlerWithResult` classes remain unchanged.
- No runtime-specific APIs (pure ECMAScript).
- At DoP=1 + strict priority, drain order is a total order determined by (priority, enqueue-sequence) — replayable from a seed.

**Primary consumers:**
- `tools/observe/world-infra.ts` — infrastructure signal polling (high-priority lane for critical signals, low-priority for background refresh).
- `tools/github/poll-pr-gate-batch.ts` — bounded-concurrency PR polling where urgent PRs (CLEAN/actionable) can preempt background scans.

## Architecture

```mermaid
graph TD
    subgraph "Producer API"
        P1[enqueue(item, priority?)]
        P2[process(item, priority?)]
    end

    subgraph "PriorityFerryThrottler"
        Router[Priority Router]
        Q0[Lane 0 Queue<br/>priority=0, high]
        Q1[Lane 1 Queue<br/>priority=1, normal]
        Q2[Lane N Queue<br/>priority=N, low]
        Sched[Drain Scheduler<br/>strict | weighted-fair]
        Ferry1[Ferry 1]
        Ferry2[Ferry 2]
        FerryM[Ferry M]
    end

    subgraph "Processing"
        PB[processBatch callback]
    end

    P1 --> Router
    P2 --> Router
    Router --> Q0
    Router --> Q1
    Router --> Q2
    Q0 --> Sched
    Q1 --> Sched
    Q2 --> Sched
    Sched --> Ferry1
    Sched --> Ferry2
    Sched --> FerryM
    Ferry1 --> PB
    Ferry2 --> PB
    FerryM --> PB
```

**Composition strategy:** `PriorityFerryThrottler` does NOT internally instantiate `FerryThrottler` instances (that would give per-lane DoP). Instead, it owns:
- N **lane queues** (the same `InternalChannel` primitive used inside `FerryThrottler`, extracted/shared).
- A **ferry pool** of M async ferry loops (the same ferry-loop pattern from the existing implementation).
- A **drain scheduler** that, when a ferry is free, picks the next lane to drain from.

This means the ferry loop is re-implemented in `PriorityFerryThrottler` with the added scheduling step, but the batching logic (self-clocking, anti-Nagle, byte budget, backpressure) remains identical per-lane.

## Components and Interfaces

### Type Definitions

```typescript
/** Priority level — lower number = higher priority. */
export type PriorityLevel = number;

/** Draining policy discriminator. */
export type DrainingPolicy =
  | { readonly kind: "strict" }
  | { readonly kind: "weighted-fair"; readonly weights: ReadonlyMap<PriorityLevel, number> };

/** Per-lane configuration overrides. */
export interface LaneConfig {
  readonly priority: PriorityLevel;
  readonly maxBatchSize?: number;
  readonly maxBatchBytes?: number;
  readonly maxQueueSize?: number;
  /** Weight for weighted-fair draining. Required when policy is weighted-fair. */
  readonly weight?: number;
}

/** Top-level configuration for PriorityFerryThrottler. */
export interface PriorityFerryThrottlerConfig {
  /** Total ferries shared across all lanes. */
  readonly maxDegreeOfParallelism: number;
  /** Default batch size when lane doesn't override. */
  readonly defaultMaxBatchSize: number;
  /** Default batch bytes when lane doesn't override. */
  readonly defaultMaxBatchBytes?: number;
  /** Lane definitions, ordered by priority (ascending = higher priority first). */
  readonly lanes: readonly LaneConfig[];
  /** Which lane enqueue defaults to when priority is omitted. */
  readonly defaultPriority: PriorityLevel;
  /** The draining policy. */
  readonly drainingPolicy: DrainingPolicy;
}

/** Deterministic two-lane config for DST replay. */
export const DETERMINISTIC_PRIORITY_CONFIG: PriorityFerryThrottlerConfig = {
  maxDegreeOfParallelism: 1,
  defaultMaxBatchSize: 256,
  lanes: [
    { priority: 0, maxQueueSize: undefined },  // high
    { priority: 1, maxQueueSize: undefined },  // low
  ],
  defaultPriority: 1,
  drainingPolicy: { kind: "strict" },
};
```

### PriorityFerryThrottler (fire-and-forget arity)

```typescript
export class PriorityFerryThrottler<T> {
  constructor(
    config: PriorityFerryThrottlerConfig,
    processBatch: ProcessBatch<T>,
    itemSizeBytes?: ItemSizeBytes<T>,
  );

  /** Enqueue with explicit priority. Backpressure per-lane. */
  enqueue(item: T, priority?: PriorityLevel, signal?: AbortSignal): Promise<void>;

  /** Try-enqueue without waiting. Returns false if the target lane is full. */
  tryEnqueue(item: T, priority?: PriorityLevel): boolean;

  /** Signal completion, await full drain respecting priority order. */
  complete(): Promise<void>;

  /** Abort all ferries, reject queued items. */
  dispose(): void;
}
```

### PriorityFerryThrottlerWithResult (request/response arity)

```typescript
export class PriorityFerryThrottlerWithResult<T, R> {
  constructor(
    config: PriorityFerryThrottlerConfig,
    processBatch: ProcessBatchWithResult<T, R>,
    itemSizeBytes?: ItemSizeBytes<T>,
  );

  /** Submit item with priority, receive aligned result. */
  process(item: T, priority?: PriorityLevel, signal?: AbortSignal): Promise<R>;

  /** Signal completion, await full drain. */
  complete(): Promise<void>;

  /** Abort all ferries. */
  dispose(): void;
}
```

### Configuration Serializer

```typescript
export function serializeConfig(config: PriorityFerryThrottlerConfig): string;
export function deserializeConfig(json: string): PriorityFerryThrottlerConfig;
```

### Drain Scheduler (internal)

```typescript
/** Per-lane snapshot exposed to the scheduler — richer than a bare boolean so the soft
 *  layer (coupled-oscillator / per-lane pressure) can read what it needs without a
 *  separate observation channel. The strict-priority scheduler ignores everything except
 *  `hasWork`; the weighted-fair DRR uses `queueDepth`; the future soft scheduler uses all. */
interface LaneSnapshot {
  readonly hasWork: boolean;
  readonly queueDepth: number;
  readonly bytesQueued: number;
  readonly drainCount: number;
}

interface DrainScheduler {
  /** Called when a ferry is free. Returns the lane index to drain next, or -1 if all empty. */
  selectLane(lanes: readonly LaneSnapshot[]): number;
  /** Record that a drain happened from this lane (batch size + bytes for soft accounting). */
  recordDrain(laneIndex: number, batchSize: number, batchBytes: number): void;
}
```

> **Design note (soft-readiness):** The `LaneSnapshot` interface is intentionally richer than
> the strict-priority scheduler needs. Per Aaron (2026-06-12): pressure is per-lane, everything
> can be soft, and the flux tank should be per-lane (or coupled, configurable). Widening the
> scheduler interface now avoids a breaking change when the soft layer arrives. See
> `docs/research/2026-06-12-soft-priority-ferry-throttler-math-handoff.md`.

## Data Models

### Internal Lane State

Each lane maintains:

```typescript
interface LaneState<T> {
  readonly priority: PriorityLevel;
  readonly config: {
    maxBatchSize: number;
    maxBatchBytes: number | undefined;
    maxQueueSize: number | undefined;
  };
  readonly queue: InternalChannel<T>;  // or InternalChannel<FerryRequest<T,R>>
}
```

### Drain Scheduler State

**Strict priority scheduler** — stateless. `selectLane` iterates lanes in priority order, returns the first with pending work. O(N) where N = number of lanes (typically 2–4).

**Weighted-fair scheduler** — maintains a deficit counter per lane:

```typescript
interface WeightedFairState {
  /** Accumulated deficit per lane. Higher deficit = more "owed" drains. */
  deficits: number[];
  /** Configured weights, normalized so they sum to 1. */
  normalizedWeights: readonly number[];
}
```

The weighted-fair algorithm is **Deficit Round Robin (DRR)**:
1. When a ferry is free, add each lane's normalized weight to its deficit.
2. Select the lane with the highest deficit that has pending work.
3. Subtract 1 from that lane's deficit (or the batch weight) after selection.
4. Ties broken by priority (lower priority number wins).

This guarantees no lane with pending work is starved indefinitely, while higher-weighted lanes get proportionally more drains.

### Ferry Loop (pseudocode)

```
async ferryLoop():
  while not aborted:
    waitUntilAnyLaneHasWork(signal)
    snapshots = lanes.map(l => laneSnapshot(l))
    laneIndex = scheduler.selectLane(snapshots)
    if laneIndex == -1: break  // all lanes completed
    boat = collectBoat(lanes[laneIndex])
    await processBatch(boat, signal)
    scheduler.recordDrain(laneIndex, boat.length, boatBytes)
```

The `waitUntilAnyLaneHasWork` step uses a single shared notification primitive (a promise that resolves when any lane transitions from empty → non-empty, or when any lane completes). This is the cross-lane equivalent of `waitToRead` in the single-channel implementation.

### Shared Notification Primitive

```typescript
interface LaneNotifier {
  /** Signal that a lane has new work or has completed. */
  notify(): void;
  /** Wait until any lane has work or all lanes are done. */
  wait(signal: AbortSignal): Promise<void>;
}
```

Implementation: a simple promise + resolver pair, replaced each time it fires. Each lane's queue calls `notify()` on write; each ferry's idle loop awaits `wait()`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Strict priority drain ordering

*For any* set of items enqueued across multiple lanes with the strict priority draining policy active and DoP=1, no item from a lower-priority lane shall be processed while any higher-priority lane has pending items.

**Validates: Requirements 1.1, 1.2, 2.1**

### Property 2: Weighted-fair no-starvation

*For any* multi-lane workload where all lanes have pending items and the weighted-fair draining policy is active, every lane with pending items shall eventually have at least one item drained (no complete starvation), and over a sufficient number of drains the proportion of drains per lane converges to the configured weights.

**Validates: Requirements 2.2**

### Property 3: DST-replayable determinism

*For any* sequence of enqueue operations across lanes at DoP=1, replaying the identical enqueue sequence shall produce the identical drain order — the drain order is a deterministic function of (priority levels, enqueue order within each lane, draining policy).

**Validates: Requirements 2.3**

### Property 4: Single-lane equivalence (model-based)

*For any* sequence of operations (enqueue, complete) applied to a single-lane `PriorityFerryThrottler` with a given configuration, the observable behavior (drain order, backpressure timing, batch sizes) shall be identical to a plain `FerryThrottler` constructed with the equivalent `FerryThrottlerConfig`.

**Validates: Requirements 3.2, 3.4**

### Property 5: Valid configuration acceptance

*For any* `PriorityFerryThrottlerConfig` where all priority levels are distinct, at least one lane is defined, maxDegreeOfParallelism >= 1, and (if weighted-fair) every lane has a weight, construction shall succeed without error.

**Validates: Requirements 4.1, 4.2**

### Property 6: Invalid configuration rejection

*For any* `PriorityFerryThrottlerConfig` containing duplicate priority levels, zero lanes, or maxDegreeOfParallelism < 1, construction shall throw a descriptive error.

**Validates: Requirements 4.4**

### Property 7: Per-lane backpressure isolation

*For any* multi-lane configuration where one lane's queue is at capacity, enqueuing into a different lane whose queue has room shall resolve immediately without blocking.

**Validates: Requirements 5.1, 5.2**

### Property 8: No-drop under backpressure

*For any* workload enqueued into a `PriorityFerryThrottler` (regardless of per-lane saturation), every non-cancelled enqueued item shall eventually be processed — no items are silently dropped.

**Validates: Requirements 5.3, 6.1**

### Property 9: Dispose rejects all queued items

*For any* in-progress workload, calling `dispose()` shall cause all not-yet-processed items to be rejected with an abort error, and all ferry loops shall terminate.

**Validates: Requirements 6.2**

### Property 10: Cancelled items are skipped without blocking

*For any* item whose AbortSignal is aborted before the item's boat sails, the item shall be skipped during drain and not appear in the batch passed to `processBatch`, and other items in the same boat shall process normally.

**Validates: Requirements 6.3**

### Property 11: Configuration serialization round-trip

*For any* valid `PriorityFerryThrottlerConfig`, serializing to JSON then deserializing shall produce a deeply-equal configuration object.

**Validates: Requirements 7.3**

### Property 12: Invalid priority rejection

*For any* priority level not present in the configured lanes, attempting to enqueue at that priority shall be rejected with a descriptive error.

**Validates: Requirements 1.3**

## Error Handling

| Scenario | Behavior | Error Type |
|----------|----------|-----------|
| Invalid config at construction | Throw synchronously | `RangeError` with descriptive message |
| Enqueue with invalid priority | Reject the returned promise | `RangeError("Priority level N is not a configured lane")` |
| Enqueue after `complete()` | Reject the returned promise | `Error("Channel closed")` |
| Enqueue with aborted signal | Reject immediately | Signal's `reason` (typically `AbortError`) |
| `processBatch` throws | Reject all items in that boat | Original error propagated |
| Result count mismatch (WithResult) | Reject all items in that boat | `Error("result count mismatch: ...")` |
| `itemSizeBytes` throws (WithResult) | Reject that single item, skip it | Original error propagated |
| `dispose()` called | Abort all ferries, reject all queued | `AbortError` |
| Weighted-fair config missing weights | Throw at construction | `RangeError("Weighted-fair policy requires weight for each lane")` |
| Duplicate priority levels | Throw at construction | `RangeError("Duplicate priority level: N")` |
| Malformed JSON in deserializeConfig | Return/throw descriptive error | `Error("Invalid config JSON: ...")` |

Error propagation follows the existing `FerryThrottler` pattern:
- Errors never cross between items in different boats.
- A single item's sizer failure doesn't fault the whole boat (WithResult arity).
- `AbortError` is caught silently by ferry loops (normal shutdown path).
- All other errors from `processBatch` propagate to the items in that boat.

## Testing Strategy

### Property-Based Tests (fast-check)

The property-based testing library is **fast-check** (TypeScript-native, zero runtime dependencies, composable arbitraries).

Each property test runs a minimum of **100 iterations** with randomized inputs.

Tag format for each test: `Feature: ferry-throttler-priority-lanes, Property {N}: {property text}`

**Properties to implement:**

| # | Property | Generator Strategy |
|---|----------|-------------------|
| 1 | Strict priority drain ordering | Random items × random lane assignment, DoP=1, verify drain order |
| 2 | Weighted-fair no-starvation | Random items × random weights, verify all lanes drain |
| 3 | DST-replayable determinism | Random enqueue sequence, run twice, assert identical order |
| 4 | Single-lane equivalence | Random ops through both PriorityFerryThrottler(1 lane) and FerryThrottler |
| 5 | Valid config acceptance | Arbitrary valid configs, assert no throw |
| 6 | Invalid config rejection | Arbitrary invalid configs (dup priorities, 0 lanes, DoP<1), assert throw |
| 7 | Per-lane backpressure isolation | Fill one lane, enqueue into another, assert immediate resolution |
| 8 | No-drop under backpressure | Saturated workload, complete(), verify all items processed |
| 9 | Dispose rejects all | In-flight workload, dispose(), verify all rejected |
| 10 | Cancelled items skipped | Random cancellation pattern, verify skipped + others process |
| 11 | Config serialization round-trip | Arbitrary valid configs, serialize/deserialize, deep-equal |
| 12 | Invalid priority rejection | Random priority ∉ configured set, assert rejection |

### Unit Tests (example-based)

- `DETERMINISTIC_PRIORITY_CONFIG` has correct shape (DoP=1, 2 lanes, strict).
- `processBatch` callback signature compatibility with existing types.
- Weighted-fair DRR: concrete 3-lane example with weights [3, 2, 1] — verify drain proportions.
- Integration with `AbortController` — abort mid-batch.
- `complete()` on empty throttler resolves immediately.

### Integration Tests

- Existing `FerryThrottler` test suite passes unchanged (regression gate).
- `PriorityFerryThrottler` wired into a mock observe-loop scenario with high/low priority signals.
