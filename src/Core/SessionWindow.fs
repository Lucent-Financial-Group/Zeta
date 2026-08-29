namespace Zeta.Core

open System
open System.Collections.Generic
open System.Runtime.CompilerServices
open System.Threading
open System.Threading.Tasks


/// Session windows — dynamic event-time bounds. Consecutive events of
/// the same partition whose timestamps differ by **more than** `gap`
/// start a new session. A late event that lands in the inactivity gap
/// between two sessions **merges** them: retract the split labels, emit
/// the merged session (DBSP-native; Beam RETRACTING without a mode flag).
///
/// ROADMAP P1: `IndexedZSet` + watermark + coalesce gap > T. This slice
/// labels every current member speculatively (optimistic + retract).
/// `SessionWindows.isClosed` is the watermark close predicate; eviction
/// of dormant sessions is the BalancedSpine TTL follow-up — state here
/// is the integrated membership and grows with distinct keys.
///
/// References:
///   - Akidau, Chernyak, Lax, *Streaming Systems* (O'Reilly 2018), ch. 4
///   - Akidau et al., "The Dataflow Model" (VLDB 2015)
///   - Apache Flink `EventTimeSessionWindows.withGap`
[<Sealed>]
type internal TimedEntryComparer<'K when 'K : comparison> private () =
    static member val Instance = TimedEntryComparer<'K>()
    interface IComparer<struct (int64 * 'K * int64)> with
        member _.Compare(a, b) =
            let struct (ta, ka, _) = a
            let struct (tb, kb, _) = b
            let c = ta.CompareTo tb
            if c <> 0 then c else KeyComparerCache<'K>.Instance.Compare(ka, kb)


[<RequireQualifiedAccess>]
[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module SessionWindows =

    /// `a + b` saturating at `Int64.MaxValue`. `b` must be ≥ 0.
    let saturatingAddNonNeg (a: int64) (b: int64) : int64 =
        if b < 0L then invalidArg (nameof b) "must be non-negative"
        if a > Int64.MaxValue - b then Int64.MaxValue
        else a + b

    /// True when `next` is more than `gap` after `prev` (Flink session gap).
    /// Equal or earlier `next` never splits. Overflow of `prev + gap` cannot
    /// be exceeded by any finite `next`, so we refuse to invent a boundary.
    let exceedsGap (prev: int64) (next: int64) (gap: int64) : bool =
        if gap <= 0L then invalidArg (nameof gap) "must be positive"
        if next <= prev then false
        elif prev > Int64.MaxValue - gap then false
        else next > prev + gap

    /// Exclusive session end: last event-time + gap, saturating.
    let sessionEnd (lastEventTime: int64) (gap: int64) : int64 =
        if gap <= 0L then invalidArg (nameof gap) "must be positive"
        saturatingAddNonNeg lastEventTime gap

    /// Session is closed when no in-gap event can still arrive:
    /// `lastEventTime + gap <= frontier.ClosedThrough`.
    let isClosed (lastEventTime: int64) (gap: int64) (frontier: Frontier) : bool =
        sessionEnd lastEventTime gap <= frontier.ClosedThrough

    /// Coalesce each partition's current members into sessions. Output key
    /// is `(sessionStart, row)` — session start is the first event-time in
    /// the coalesced run. Weights are preserved (retraction-native).
    let assignIndexed<'K, 'P
        when 'K : comparison and 'P : comparison and 'P : not null>
        (gap: int64)
        (timeOf: Func<'K, int64>)
        (indexed: IndexedZSet<'P, 'K>) : ZSet<int64 * 'K> =
        if gap <= 0L then invalidArg (nameof gap) "must be positive"
        if isNull (box timeOf) then nullArg (nameof timeOf)
        let groups = indexed.AsSpan()
        if groups.IsEmpty then ZSet<int64 * 'K>.Empty
        else
            let total = IndexedZSet.tupleCount indexed
            if total = 0 then ZSet<int64 * 'K>.Empty
            else
                let outBuf = Pool.Rent<ZEntry<int64 * 'K>> total
                try
                    let mutable o = 0
                    for gi in 0 .. groups.Length - 1 do
                        let vs = groups.[gi].Values.AsSpan()
                        if vs.Length = 1 then
                            let t = timeOf.Invoke vs.[0].Key
                            outBuf.[o] <- ZEntry((t, vs.[0].Key), vs.[0].Weight)
                            o <- o + 1
                        elif vs.Length > 1 then
                            let timed = Pool.Rent<struct (int64 * 'K * int64)> vs.Length
                            try
                                for i in 0 .. vs.Length - 1 do
                                    timed.[i] <-
                                        struct (timeOf.Invoke vs.[i].Key, vs.[i].Key, vs.[i].Weight)
                                Array.Sort(timed, 0, vs.Length, TimedEntryComparer<'K>.Instance)
                                let struct (t0, k0, w0) = timed.[0]
                                let mutable sessionStart = t0
                                let mutable lastTime = t0
                                outBuf.[o] <- ZEntry((sessionStart, k0), w0)
                                o <- o + 1
                                for i in 1 .. vs.Length - 1 do
                                    let struct (t, k, w) = timed.[i]
                                    if exceedsGap lastTime t gap then sessionStart <- t
                                    outBuf.[o] <- ZEntry((sessionStart, k), w)
                                    o <- o + 1
                                    lastTime <- t
                            finally
                                Pool.Return timed
                    if o = 0 then ZSet<int64 * 'K>.Empty
                    else
                        let live = ZSetBuilder.sortAndConsolidate (Span<_>(outBuf, 0, o))
                        if live = 0 then ZSet<int64 * 'K>.Empty
                        else ZSet(Pool.FreezeSlice(outBuf, live))
                finally
                    Pool.Return outBuf

    /// Index `z` by `partition`, then coalesce.
    let assign<'K, 'P
        when 'K : comparison and 'P : comparison and 'P : not null>
        (gap: int64)
        (partition: Func<'K, 'P>)
        (timeOf: Func<'K, int64>)
        (z: ZSet<'K>) : ZSet<int64 * 'K> =
        if isNull (box partition) then nullArg (nameof partition)
        let indexed =
            IndexedZSet.indexWith (fun k -> partition.Invoke k) (fun k -> k) z
        assignIndexed gap timeOf indexed


/// Integrates input deltas into per-partition membership, re-coalesces
/// sessions, and emits the **delta of the labeling** (`new − previous`).
/// A bridging late event therefore shows up as `−(oldStart, row) +
/// (mergedStart, row)` — the merge the window skill names.
[<Sealed>]
type internal SessionWindowOp<'K, 'P
    when 'K : comparison and 'P : comparison and 'P : not null>
    (input: Op<ZSet<'K>>,
     partition: Func<'K, 'P>,
     timeOf: Func<'K, int64>,
     gap: int64) =
    inherit Op<ZSet<int64 * 'K>>()
    do
        if gap <= 0L then invalidArg (nameof gap) "must be positive"
        if isNull (box partition) then nullArg (nameof partition)
        if isNull (box timeOf) then nullArg (nameof timeOf)
    let inputs = [| input :> Op |]
    let mutable indexed = IndexedZSet<'P, 'K>.Empty
    let mutable prevLabeled = ZSet<int64 * 'K>.Empty
    override _.Name = "sessionWindow"
    override _.Inputs = inputs
    override this.StepAsync(_: CancellationToken) =
        let delta = input.Value
        if not delta.IsEmpty then
            let di =
                IndexedZSet.indexWith (fun k -> partition.Invoke k) (fun k -> k) delta
            indexed <- IndexedZSet.add indexed di
        let labeled = SessionWindows.assignIndexed gap timeOf indexed
        this.Value <- labeled - prevLabeled
        prevLabeled <- labeled
        ValueTask.CompletedTask


[<Extension>]
type SessionWindowExtensions =

    /// Session window over the whole stream (one partition). Emits
    /// `Z[sessionStart × row]`; compose with `GroupBy*` on `fst` for
    /// `OVER SESSION(gap)` aggregates.
    [<Extension>]
    static member SessionWindow<'K when 'K : comparison>
        (this: Circuit, s: Stream<ZSet<'K>>, timeOf: Func<'K, int64>, gap: int64)
        : Stream<ZSet<int64 * 'K>> =
        if gap <= 0L then invalidArg (nameof gap) "must be positive"
        this.RegisterStream(
            SessionWindowOp(s.Op, Func<'K, int>(fun _ -> 0), timeOf, gap))

    /// Session window partitioned by `partition` (Flink `keyBy` + session).
    [<Extension>]
    static member SessionWindow<'K, 'P
        when 'K : comparison and 'P : comparison and 'P : not null>
        (this: Circuit,
         s: Stream<ZSet<'K>>,
         partition: Func<'K, 'P>,
         timeOf: Func<'K, int64>,
         gap: int64) : Stream<ZSet<int64 * 'K>> =
        if gap <= 0L then invalidArg (nameof gap) "must be positive"
        this.RegisterStream(SessionWindowOp(s.Op, partition, timeOf, gap))
