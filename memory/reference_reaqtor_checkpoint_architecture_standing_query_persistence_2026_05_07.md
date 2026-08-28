---
name: Reaqtor checkpoint architecture — standing query persistence model for Zeta durability gap
description: Reaqtor (reaqtive.net) is Microsoft's durable Rx. IStatefulOperator with LoadState/SaveState + periodic checkpoints + Nuqleon DataModel serialization. Maps to Zeta's src/Core/Durability.fs StableStorage gap. Billions of standing queries in production (Bing, MSN, M365). MIT license, .NET Foundation.
type: reference
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Reaqtor checkpoint architecture

Reaqtor = Rx + durability + distribution. Created by Microsoft,
gifted to .NET Foundation, maintained by endjin. MIT license.

### Key architecture

1. **IStatefulOperator** — each Rx operator implements
   `LoadState(IOperatorStateReader, Version)` and
   `SaveState(IOperatorStateWriter, Version)`. Operators
   know how to serialize/deserialize their own state.

2. **Periodic checkpoints** — the reactive engine generates
   checkpoints regularly recording stream position +
   operator state. On restart, processing resumes from
   last checkpoint. Operations are not reapplied.

3. **Nuqleon DataModel** — serialization framework for
   query engine state persistence
   (`Reaqtor.QueryEngine.Serialization.DataModel`).

4. **IQbservable<T>** (expression-tree Rx) — the queryable
   form of IObservable<T>, dual of IQueryable<T>. Zeta's
   `src/Core/Rx.fs` already references this via Bart De
   Smet's duality thesis.

### Production scale

Billions of standing stateful queries in Bing, MSN, M365.
Thousands of events per second. Long-running queries
survive restarts, outages, and machine migrations.

### How this maps to Zeta

| Reaqtor concept | Zeta equivalent | Gap |
|----------------|-----------------|-----|
| IStatefulOperator | Circuit operators | No checkpoint interface yet |
| Periodic checkpoints | DurabilityMode.StableStorage | Advertised but not fulfilled |
| IQbservable<T> | RxAdapter.asObservable | Skeleton only in Rx.fs |
| Nuqleon DataModel | FsPickler / ArrowSerializer | Exists but not wired to checkpoint |
| Standing query registry | None | Needed for B-0250 |

### The gap Aaron named

"Code exists, persistence not perfect yet" = the operator
algebra is complete (Circuit, ZSet, retraction-native); the
checkpoint/recovery layer (`DurabilityMode.StableStorage`)
is defined but throws at runtime. Reaqtor's
`IStatefulOperator` pattern is the proven shape for this.

### Aaron's correction: BOTH Temporal AND Reaqtor, not one over the other (2026-05-07)

Aaron: "Temporal is preferred over Reaqtor both not over" +
"its durable functions" + "Aaron's preference over Reaqtor
is the design too cause of bonsai"

The three compose at different layers:

1. **Bonsai/Nuqleon** (Bart De Smet) — expression tree
   serialization. Serialize any LINQ/Rx expression as
   compact JSON/binary "Bonsai tree." Language-independent.
   This IS the `IQbservable<T>` layer Zeta's `Rx.fs`
   references. Used in production at Microsoft for years.

2. **Temporal** — durable execution engine. Event-history
   replay for workflow durability. Open source, self-
   hostable. .NET + TS SDKs.

3. **Reaqtor** — stateful Rx operators. Checkpoint/restore
   at the operator level. Standing queries that survive
   restart.

4. **Azure Durable Functions** — Microsoft's managed
   product sharing lineage with Bonsai/Nuqleon.

5. **AWS Step Functions** — Amazon's version.

6. **Google Dataflow/Beam** — streaming-first with
   windowing (connects to DBSP `z⁻¹`).

7. **TPL Dataflow / Mailbox** — .NET in-process dataflow
   (Aaron: "that's like mailbox and tpl dataflow").

8. **Orleans silos/grains** — virtual actors with identity,
   state persistence, location transparency. Grain = the
   standing query subscriber. Silo = the node in the BFT
   array. Aaron filed 6 issues on dotnet/orleans (2015-2018):
   productizing Orleans (#3608), durability guarantees
   (#4985), health checks ≠ membership (#2580). The grain
   addressing model composes with Temporal's durable
   execution — grain lifecycle IS durable execution at
   the actor level. B-0040 (P2) already tracks the actor-
   model-as-lens for factory coordination.

Zeta uses ALL of them as design input. Bonsai for query
serialization, Temporal's model for execution durability,
Reaqtor's pattern for operator-level state.

9. **CASPaxos** — leaderless single-decree consensus via
   compare-and-swap. Mixed with Rx (consensus over streams)
   and Bonsai (serialization of functions/expression trees).
   The quorum agrees on stream DEFINITIONS (Bonsai-
   serialized expression trees), NOT stream data — that
   would be slow. Consensus at definition layer; execution
   runs locally at full speed after agreement. Aaron
   filed jbakic/Shielded.Gossip #2 (2019) on CASPaxos
   as alternative to gossip. 7-year lineage.
   CASPaxos(Rx(Bonsai(function))) = BFT consensus over
   streams of serialized circuit operations.

Temporal .NET SDK: `github.com/temporalio/sdk-dotnet`
Temporal TS SDK: `github.com/temporalio/sdk-typescript`
MIT license. Self-hostable or Temporal Cloud.

### Sources

- [Reaqtor home](https://reaqtive.net/)
- [GitHub](https://github.com/reaqtive/reaqtor)
- [Durability talk](https://reaqtive.net/talks/durability-and-reliability-in-reaqtor-subscriptions)
- [How Reaqtor combines reactivity with reliable data processing](https://reaqtive.net/blog/2021/05/how-reaqtor-combines-reactivity-with-reliable-data-processing)
- [Cloud Native Rx overview](https://endjin.com/what-we-think/talks/an-overview-of-reaqtor-aka-cloud-native-rx)
- [Temporal .NET SDK](https://github.com/temporalio/sdk-dotnet)
- [Temporal durable execution](https://temporal.io/blog/what-is-durable-execution)
- [Temporal event history](https://docs.temporal.io/workflow-execution)
