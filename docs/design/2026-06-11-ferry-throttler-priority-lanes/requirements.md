# Requirements Document

## Introduction

This feature adds priority lanes to the existing FerryThrottler TypeScript implementation. Priority lanes allow items to be enqueued at different priority levels, with higher-priority items draining before lower-priority ones. The design explores a composition-based approach: a `PriorityFerryThrottler` that orchestrates N `FerryThrottler` instances (one per lane) with a configurable draining policy, preserving the existing single-instance API for consumers that don't need priority and composing cleanly with the existing `FerryThrottler` and `FerryThrottlerWithResult` without breaking their APIs.

## Glossary

- **Ferry**: A concurrent processor (async loop) that drains boats from the queue. The count is controlled by `maxDegreeOfParallelism`.
- **Boat**: A batch of items dispatched to a single `processBatch` call.
- **Lane**: A priority level within the priority throttler, each backed by its own internal `FerryThrottler` instance or queue segment.
- **Draining_Policy**: The strategy that determines which lane to drain next when multiple lanes have pending items.
- **Priority_Level**: A numeric rank (lower number = higher priority) assigned to each enqueued item, determining drain order.
- **PriorityFerryThrottler**: The new composition layer that manages N lanes and a shared ferry pool with priority-aware drain ordering.
- **Strict_Priority_Draining**: A draining policy where higher-priority lanes are always drained before lower-priority ones (potential starvation of low-priority lanes under sustained high-priority load).
- **Weighted_Fair_Draining**: A draining policy where lanes are drained proportionally to configurable weights, preventing complete starvation.
- **Self_Clocking**: The anti-Nagle property — boats sail immediately with whatever is queued, never waiting to fill.
- **DST_Replayable**: Deterministic Simulation Testing replayable — at DoP=1, execution order is fully determined by enqueue order and priority, enabling replay from a seed.

## Requirements

### Requirement 1: Priority-Aware Enqueue

**User Story:** As a producer (e.g., the observe loop or poll-pr-gate-batch), I want to enqueue items with an explicit priority level, so that time-sensitive work drains before background work.

#### Acceptance Criteria

1. WHEN a producer enqueues an item with a priority level, THE PriorityFerryThrottler SHALL accept the item and place it in the corresponding lane.
2. WHEN a producer enqueues an item without specifying a priority level, THE PriorityFerryThrottler SHALL assign the item to a configurable default priority lane.
3. IF a producer specifies a priority level that does not correspond to a configured lane, THEN THE PriorityFerryThrottler SHALL reject the enqueue with a descriptive error.
4. THE PriorityFerryThrottler SHALL support both fire-and-forget enqueue (returning when accepted into the queue) and request/response enqueue (returning the aligned result).

### Requirement 2: Priority Drain Ordering

**User Story:** As the observe loop, I want higher-priority items to drain before lower-priority items, so that critical infrastructure signals are processed with minimal latency.

#### Acceptance Criteria

1. WHILE the Strict_Priority_Draining policy is active and a higher-priority lane has pending items, THE PriorityFerryThrottler SHALL drain that lane before any lower-priority lane.
2. WHILE the Weighted_Fair_Draining policy is active, THE PriorityFerryThrottler SHALL drain lanes proportionally to their configured weights, ensuring no lane is completely starved.
3. WHEN multiple items exist across lanes and DoP equals 1, THE PriorityFerryThrottler SHALL produce a deterministic drain order based solely on priority level and enqueue order within each lane (DST_Replayable).
4. WHEN a ferry becomes free and multiple lanes have pending items, THE PriorityFerryThrottler SHALL select the next boat according to the active Draining_Policy.

### Requirement 3: Composition with Existing FerryThrottler

**User Story:** As a developer, I want the priority mechanism to compose with existing FerryThrottler instances without modifying their public API, so that consumers without priority needs continue working unchanged.

#### Acceptance Criteria

1. THE PriorityFerryThrottler SHALL accept a `processBatch` callback with the same signature as the existing `FerryThrottler` and `FerryThrottlerWithResult`.
2. THE PriorityFerryThrottler SHALL preserve all 10 existing FerryThrottler behaviors: self-clocking, anti-Nagle, DoP knob, MaxBatchSize, MaxBatchBytes, MaxQueueSize backpressure, request/response arity, one-item pushback, cancelled request skipping, and CompleteAsync.
3. THE existing `FerryThrottler` and `FerryThrottlerWithResult` classes SHALL remain unchanged in their public API surface.
4. WHEN a single-lane PriorityFerryThrottler is configured, THE PriorityFerryThrottler SHALL behave identically to a plain `FerryThrottler` with the same configuration.

### Requirement 4: Configuration

**User Story:** As a developer, I want to configure the number of lanes, their priority levels, per-lane batch/queue limits, and the draining policy, so that the priority throttler adapts to different workload shapes.

#### Acceptance Criteria

1. THE PriorityFerryThrottler SHALL accept a configuration specifying the number of lanes, each lane's priority level, and per-lane overrides for maxBatchSize, maxBatchBytes, and maxQueueSize.
2. THE PriorityFerryThrottler SHALL accept a global maxDegreeOfParallelism that controls the total number of ferries shared across all lanes.
3. WHEN a Weighted_Fair_Draining policy is configured, THE PriorityFerryThrottler SHALL require a weight for each lane.
4. IF the configuration contains duplicate priority levels, zero lanes, or a maxDegreeOfParallelism less than 1, THEN THE PriorityFerryThrottler SHALL reject it at construction with a descriptive error.
5. THE PriorityFerryThrottler SHALL expose a `DETERMINISTIC_PRIORITY_CONFIG` constant for single-ferry, two-lane (high/low) usage suitable for DST replay.

### Requirement 5: Backpressure Across Lanes

**User Story:** As a system operator, I want per-lane backpressure to prevent a flood of low-priority items from consuming all queue capacity, so that high-priority items always have room to enqueue.

#### Acceptance Criteria

1. WHEN a lane's maxQueueSize is reached, THE PriorityFerryThrottler SHALL apply backpressure only to producers enqueuing into that lane, without blocking other lanes.
2. THE PriorityFerryThrottler SHALL allow each lane to have an independent maxQueueSize, enabling tighter bounds on low-priority lanes.
3. WHEN all lanes are at capacity and a producer attempts to enqueue, THE PriorityFerryThrottler SHALL cooperatively wait (backpressure) for the target lane without dropping work.

### Requirement 6: Completion and Disposal

**User Story:** As a consumer, I want to signal completion and wait for all lanes to drain, so that shutdown is orderly and no items are lost.

#### Acceptance Criteria

1. WHEN `complete()` is called, THE PriorityFerryThrottler SHALL signal all lanes that no more items will arrive and await full drain of every lane respecting priority order.
2. WHEN `dispose()` is called, THE PriorityFerryThrottler SHALL abort all in-flight ferries across all lanes and reject any queued items.
3. WHEN cancellation is requested on an individual enqueued item (via AbortSignal), THE PriorityFerryThrottler SHALL skip that item during drain without blocking the boat, consistent with existing cancelled-request-skipping behavior.

### Requirement 7: Serialization Round-Trip for Priority Configuration

**User Story:** As a developer, I want to serialize and deserialize PriorityFerryThrottler configurations to/from JSON, so that configurations can be stored, transmitted, and reloaded without loss.

#### Acceptance Criteria

1. THE Configuration_Serializer SHALL serialize a PriorityFerryThrottler configuration into a valid JSON representation.
2. THE Configuration_Serializer SHALL deserialize a valid JSON representation back into an equivalent PriorityFerryThrottler configuration.
3. FOR ALL valid PriorityFerryThrottler configurations, serializing then deserializing SHALL produce an equivalent configuration object (round-trip property).
4. IF the JSON representation is malformed or missing required fields, THEN THE Configuration_Serializer SHALL return a descriptive error.

### Requirement 8: Pure TypeScript, No Runtime-Specific APIs

**User Story:** As a developer, I want the priority lanes implementation to use only pure TypeScript with no runtime-specific APIs, so that it works across Bun, Node, Deno, and browser environments.

#### Acceptance Criteria

1. THE PriorityFerryThrottler SHALL use only standard ECMAScript APIs (Promises, AbortController, AbortSignal, arrays, Map) and no runtime-specific imports (no `node:*`, no `bun:*`, no Deno namespace).
2. THE PriorityFerryThrottler SHALL compile under strict TypeScript settings without type errors.
