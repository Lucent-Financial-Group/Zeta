namespace Zeta.Core

open System
open System.Collections.Generic
open System.Collections.Immutable
/// Per-shard event-time frontier — Timely Dataflow's antichain specialised
/// to totally-ordered `int64` watermarks indexed by shard id.
///
/// A timestamp `t` is **closed through** this frontier when it is late
/// relative to every reported shard (`Watermark.isLate ClosedThrough t`).
/// Downstream progress is the min across shards (Akidau: an operator
/// cannot progress past its slowest input).
///
/// **Empty is Akidau, not Timely.** `Frontier.Empty.ClosedThrough` is
/// `Int64.MinValue`, matching `Watermark.combine []` (no sources reported
/// → cannot close anything). Timely's empty antichain means "no outstanding
/// work" (`+∞`). Same word, opposite empty; the operations below are the
/// discriminator, not the name.
///
/// `Merge` is the meet: same shard keeps the more conservative (min)
/// watermark; disjoint shards union. `Advance` is monotone per shard (max).
///
/// References:
///   - Murray, McSherry, Isaacs, Isard, Barham, Abadi, "Naiad: A Timely
///     Dataflow System" (SOSP 2013)
///   - Akidau et al., "The Dataflow Model" (VLDB 2015)
[<Sealed>]
type Frontier private (shards: ImmutableArray<struct (int * int64)>) =

    static let emptyInst = Frontier ImmutableArray<struct (int * int64)>.Empty

    static member Empty = emptyInst

    member internal _.Shards = shards

    member _.ShardCount =
        if shards.IsDefaultOrEmpty then 0 else shards.Length

    member _.IsEmpty = shards.IsDefaultOrEmpty

    /// Greatest event-time that is late on **every** reported shard.
    /// Empty frontier → `Int64.MinValue` (Akidau: no sources).
    member _.ClosedThrough : int64 =
        if shards.IsDefaultOrEmpty then Int64.MinValue
        else
            let mutable m = Int64.MaxValue
            for i in 0 .. shards.Length - 1 do
                let struct (_, w) = shards.[i]
                if w < m then m <- w
            m

    /// Binary search. Found index, or `~~~insertionPoint` if absent.
    static member private IndexOf(shards: ImmutableArray<struct (int * int64)>, shard: int) : int =
        if shards.IsDefaultOrEmpty then ~~~0
        else
            let mutable lo = 0
            let mutable hi = shards.Length - 1
            let mutable found = ~~~0
            while lo <= hi && found < 0 do
                let mid = lo + ((hi - lo) >>> 1)
                let struct (s, _) = shards.[mid]
                if s = shard then found <- mid
                elif s < shard then lo <- mid + 1
                else hi <- mid - 1
            if found >= 0 then found else ~~~lo

    member _.WatermarkOf(shard: int) : int64 voption =
        let idx = Frontier.IndexOf(shards, shard)
        if idx >= 0 then
            let struct (_, w) = shards.[idx]
            ValueSome w
        else
            ValueNone

    member this.TryWatermarkOf(shard: int, watermark: byref<int64>) : bool =
        match this.WatermarkOf shard with
        | ValueSome w ->
            watermark <- w
            true
        | ValueNone -> false

    /// Monotone raise of one shard's watermark. A lower `watermark` is a
    /// no-op (progress never walks backwards).
    member this.Advance(shard: int, watermark: int64) : Frontier =
        let idx = Frontier.IndexOf(shards, shard)
        if idx >= 0 then
            let struct (_, cur) = shards.[idx]
            if watermark <= cur then this
            else
                let n = shards.Length
                let buf = Pool.Rent<struct (int * int64)> n
                try
                    shards.CopyTo buf
                    buf.[idx] <- struct (shard, watermark)
                    Frontier(Pool.FreezeSlice(buf, n))
                finally
                    Pool.Return buf
        else
            let insertAt = ~~~idx
            let n = shards.Length + 1
            let buf = Pool.Rent<struct (int * int64)> n
            try
                if insertAt > 0 then
                    let src = shards.AsSpan()
                    src.Slice(0, insertAt).CopyTo(Span<struct (int * int64)>(buf, 0, insertAt))
                buf.[insertAt] <- struct (shard, watermark)
                if insertAt < shards.Length then
                    let src = shards.AsSpan()
                    src.Slice(insertAt).CopyTo(Span<struct (int * int64)>(buf, insertAt + 1, shards.Length - insertAt))
                Frontier(Pool.FreezeSlice(buf, n))
            finally
                Pool.Return buf

    static member Singleton(shard: int, watermark: int64) =
        Frontier(ImmutableArray.Create(struct (shard, watermark)))

    /// Build from `(shard, watermark)` pairs. Duplicate shards keep the
    /// **max** (as if each pair were an `Advance` from empty).
    static member OfSeq(pairs: (int * int64) seq) : Frontier =
        let d = Dictionary<int, int64>()
        for shard, wm in pairs do
            let mutable prev = 0L
            if d.TryGetValue(shard, &prev) then
                if wm > prev then d.[shard] <- wm
            else
                d.[shard] <- wm
        if d.Count = 0 then Frontier.Empty
        else
            let keys = Pool.Rent<struct (int * int64)> d.Count
            try
                let mutable i = 0
                for kv in d do
                    keys.[i] <- struct (kv.Key, kv.Value)
                    i <- i + 1
                Array.Sort(
                    keys,
                    0,
                    d.Count,
                    Comparer<struct (int * int64)>.Create(fun a b ->
                        let struct (sa, _) = a
                        let struct (sb, _) = b
                        sa.CompareTo sb))
                Frontier(Pool.FreezeSlice(keys, d.Count))
            finally
                Pool.Return keys

    /// Conservative composition: union of shards, min on overlap.
    static member Merge(a: Frontier, b: Frontier) : Frontier =
        if obj.ReferenceEquals(a, b) then a
        elif a.IsEmpty then b
        elif b.IsEmpty then a
        else
            let sa = a.Shards
            let sb = b.Shards
            let cap = sa.Length + sb.Length
            let buf = Pool.Rent<struct (int * int64)> cap
            try
                let mutable i = 0
                let mutable j = 0
                let mutable k = 0
                while i < sa.Length && j < sb.Length do
                    let struct (sha, wa) = sa.[i]
                    let struct (shb, wb) = sb.[j]
                    if sha = shb then
                        buf.[k] <- struct (sha, if wa < wb then wa else wb)
                        k <- k + 1
                        i <- i + 1
                        j <- j + 1
                    elif sha < shb then
                        buf.[k] <- sa.[i]
                        k <- k + 1
                        i <- i + 1
                    else
                        buf.[k] <- sb.[j]
                        k <- k + 1
                        j <- j + 1
                while i < sa.Length do
                    buf.[k] <- sa.[i]
                    k <- k + 1
                    i <- i + 1
                while j < sb.Length do
                    buf.[k] <- sb.[j]
                    k <- k + 1
                    j <- j + 1
                if k = 0 then Frontier.Empty
                else Frontier(Pool.FreezeSlice(buf, k))
            finally
                Pool.Return buf

    member this.IsLate(eventTime: int64) : bool =
        Watermark.isLate this.ClosedThrough eventTime

    /// Late on a **named** shard. Unknown shard → not closed (no claim).
    member this.IsClosedOn(shard: int, eventTime: int64) : bool =
        match this.WatermarkOf shard with
        | ValueSome w -> Watermark.isLate w eventTime
        | ValueNone -> false

    override this.Equals(other: obj) =
        match other with
        | :? Frontier as that -> this.Equals that
        | _ -> false

    member this.Equals(other: Frontier) =
        if obj.ReferenceEquals(this, other) then true
        elif isNull (box other) then false
        elif this.ShardCount <> other.ShardCount then false
        else
            let a = this.Shards
            let b = other.Shards
            let mutable i = 0
            let mutable eq = true
            while eq && i < a.Length do
                let struct (sa, wa) = a.[i]
                let struct (sb, wb) = b.[i]
                if sa <> sb || wa <> wb then eq <- false
                i <- i + 1
            eq

    override this.GetHashCode() =
        let mutable h = HashCode()
        let s = this.Shards
        if not s.IsDefaultOrEmpty then
            for i in 0 .. s.Length - 1 do
                let struct (shard, wm) = s.[i]
                h.Add shard
                h.Add wm
        h.ToHashCode()

    interface IEquatable<Frontier> with
        member this.Equals other = this.Equals other


[<RequireQualifiedAccess>]
[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Frontier =

    let empty = Frontier.Empty

    let singleton shard watermark = Frontier.Singleton(shard, watermark)

    let ofSeq pairs = Frontier.OfSeq pairs

    let merge a b = Frontier.Merge(a, b)

    let advance (f: Frontier) shard watermark = f.Advance(shard, watermark)

    let closedThrough (f: Frontier) = f.ClosedThrough

    let isLate (f: Frontier) eventTime = f.IsLate eventTime

    let isClosedOn (f: Frontier) shard eventTime = f.IsClosedOn(shard, eventTime)

    let watermarkOf (f: Frontier) shard = f.WatermarkOf shard
