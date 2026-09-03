# Tasks

## Task 1: Extract InternalChannel as shared module

- [ ] Extract `InternalChannel<T>` interface and `createInternalChannel` from `ferry-throttler.ts` into a new file `src/Core.TypeScript/ferry-throttler/internal-channel.ts`
- [ ] Re-export from the original file so existing imports are unaffected
- [ ] Add `queueDepth` readonly property to `InternalChannel` (returns `buffer.length + writerWaiters.length`)
- [ ] Verify existing `ferry-throttler.test.ts` still passes (regression gate)

## Task 2: Implement LaneSnapshot and DrainScheduler interfaces

- [ ] Create `src/Core.TypeScript/ferry-throttler/drain-scheduler.ts`
- [ ] Define `LaneSnapshot` interface: `hasWork`, `queueDepth`, `bytesQueued`, `drainCount`
- [ ] Define `DrainScheduler` interface: `selectLane(lanes: readonly LaneSnapshot[]): number`, `recordDrain(laneIndex: number, batchSize: number, batchBytes: number): void`
- [ ] Implement `StrictPriorityScheduler` — stateless, scans lanes in index order (lanes pre-sorted by priority), returns first with `hasWork === true`
- [ ] Implement `WeightedFairScheduler` — Deficit Round Robin: add normalized weight to deficit, select highest-deficit lane with work, subtract after selection, ties broken by index (= priority order)
- [ ] Add unit tests for both schedulers in `drain-scheduler.test.ts`

## Task 3: Implement LaneNotifier (shared notification primitive)

- [ ] Create `src/Core.TypeScript/ferry-throttler/lane-notifier.ts`
- [ ] Implement `LaneNotifier` interface: `notify(): void`, `wait(signal: AbortSignal): Promise<void>`
- [ ] Implementation: single promise + resolver pair, re-created each time it fires; `notify()` resolves the current promise; `wait()` awaits it (with AbortSignal support)
- [ ] Add unit tests verifying: notify wakes waiters, multiple waiters wake on single notify, abort rejects wait

## Task 4: Implement PriorityFerryThrottlerConfig and validation

- [ ] Create `src/Core.TypeScript/ferry-throttler/priority-config.ts`
- [ ] Define `PriorityLevel`, `DrainingPolicy`, `LaneConfig`, `PriorityFerryThrottlerConfig` types
- [ ] Export `DETERMINISTIC_PRIORITY_CONFIG` constant (DoP=1, 2 lanes [0, 1], strict, default priority 1)
- [ ] Implement `validatePriorityConfig` — throws `RangeError` on: duplicate priorities, zero lanes, DoP < 1, weighted-fair without weights on every lane, maxBatchBytes without itemSizeBytes (deferred to class constructor)
- [ ] Add unit tests for valid/invalid configs (Properties 5, 6)

## Task 5: Implement PriorityFerryThrottler (fire-and-forget arity)

- [ ] Create `src/Core.TypeScript/ferry-throttler/priority-ferry-throttler.ts`
- [ ] Implement `PriorityFerryThrottler<T>` class:
  - Constructor: validate config, create N lane queues (via `createInternalChannel`), create `LaneNotifier`, create drain scheduler, start M ferry loops
  - `enqueue(item, priority?, signal?)`: route to lane by priority (default if omitted), reject if priority invalid, backpressure per-lane
  - `tryEnqueue(item, priority?)`: synchronous try-write to lane
  - `complete()`: complete all lane channels, await all ferries
  - `dispose()`: complete channels + abort controller
- [ ] Ferry loop: `waitUntilAnyLaneHasWork` → build `LaneSnapshot[]` → `scheduler.selectLane` → `collectBoat` (per-lane maxBatchSize/maxBatchBytes, self-clocking, one-item pushback) → `processBatch` → `scheduler.recordDrain`
- [ ] Add basic unit tests: DoP=1 strict priority ordering, DoP=N set-equal, single-lane equivalence

## Task 6: Implement PriorityFerryThrottlerWithResult (request/response arity)

- [ ] Create `src/Core.TypeScript/ferry-throttler/priority-ferry-throttler-with-result.ts`
- [ ] Implement `PriorityFerryThrottlerWithResult<T, R>` class:
  - Same structure as fire-and-forget but lane queues hold `FerryRequest<T, R>` objects
  - `process(item, priority?, signal?)`: create request, write to lane, return result promise
  - Cancelled request skipping in ferry loop (same as existing `FerryThrottlerWithResult`)
  - Result count mismatch → fault entire boat
  - `itemSizeBytes` throw → fault single item, skip it
  - `complete()` and `dispose()` same pattern
- [ ] Add unit tests: aligned results, fault on mismatch, fault on throw, cancel skipping, byte budget with results

## Task 7: Implement configuration serializer

- [ ] Add `serializeConfig` and `deserializeConfig` functions to `priority-config.ts`
- [ ] `serializeConfig`: convert `PriorityFerryThrottlerConfig` to JSON string (handle `ReadonlyMap` → plain object for `weights`)
- [ ] `deserializeConfig`: parse JSON, validate structure, reconstruct types (plain object → `ReadonlyMap` for weights), throw descriptive error on malformed input
- [ ] Add unit tests: round-trip property, malformed JSON rejection, missing fields rejection

## Task 8: Add barrel exports and update index

- [ ] Update `src/Core.TypeScript/ferry-throttler/index.ts` to export all new public types and classes
- [ ] Verify no circular imports
- [ ] Run `tsc --noEmit` to verify clean compilation under strict settings
- [ ] Verify existing `ferry-throttler.test.ts` still passes unchanged

## Task 9: Property-based tests (fast-check)

- [ ] Install `fast-check` as a dev dependency (exact version pin)
- [ ] Create `src/Core.TypeScript/ferry-throttler/priority-ferry-throttler.property.test.ts`
- [ ] Property 1: Strict priority drain ordering (random items × random lanes, DoP=1, verify no low-priority item processed while high-priority has work)
- [ ] Property 2: Weighted-fair no-starvation (random items × random weights, verify all lanes with work eventually drain)
- [ ] Property 3: DST-replayable determinism (random enqueue sequence, run twice, assert identical drain order)
- [ ] Property 7: Per-lane backpressure isolation (fill one lane, enqueue into another, assert immediate)
- [ ] Property 8: No-drop under backpressure (saturated workload, complete(), verify all items processed)
- [ ] Property 11: Config serialization round-trip (arbitrary valid configs, serialize then deserialize, deep-equal)
- [ ] Property 12: Invalid priority rejection (random priority ∉ configured set, assert rejection)

## Task 10: Integration smoke test with mock observe loop

- [ ] Create `src/Core.TypeScript/ferry-throttler/priority-ferry-throttler.integration.test.ts`
- [ ] Simulate the observe loop scenario: high-priority lane for critical signals, low-priority for background refresh
- [ ] Verify high-priority items preempt low-priority under strict policy
- [ ] Verify weighted-fair gives both lanes drain time proportional to weights
- [ ] Verify existing `FerryThrottler` tests still pass (regression confirmation)
