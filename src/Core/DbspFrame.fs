namespace Zeta.Core

open System

/// TimeAxis represents the temporal remember-when axis.
/// In incremental computation, it is a retraction-aware timeline of time-stamped state changes.
/// A Z-set has a group structure (with subtraction representing retraction).
type TimeAxis<'K when 'K : comparison> = {
    History: Map<int64, ZSet<'K>>
}
with
    static member Empty : TimeAxis<'K> = { History = Map.empty }

    /// Add a delta to the timeline at a specific timestamp.
    /// In Zeta's retraction-aware arithmetic, if we add a retraction ZSet, it cancels out/subtracts elements.
    member this.Add(timestamp: int64, delta: ZSet<'K>) : TimeAxis<'K> =
        let current =
            match this.History.TryFind timestamp with
            | Some z -> ZSet.add z delta
            | None -> delta
        
        let newHistory =
            if current.IsEmpty then
                this.History.Remove timestamp
            else
                this.History.Add(timestamp, current)
        { History = newHistory }

    /// Reconstruct the state up to a given time by summing all Z-sets up to that timestamp.
    member this.AsOf(timestamp: int64) : ZSet<'K> =
        this.History
        |> Map.filter (fun t _ -> t <= timestamp)
        |> Map.fold (fun acc _ z -> ZSet.add acc z) ZSet<'K>.Empty


/// FocusAxis represents the present-state pay-attention focus.
/// It is represented as the active change/Z-set representing the present delta.
type FocusAxis<'K when 'K : comparison> = {
    Active: ZSet<'K>
}
with
    static member Empty : FocusAxis<'K> = { Active = ZSet<'K>.Empty }


/// GnosticBase represents the 2D base frame: remember-when (temporal) × pay-attention (focus).
type GnosticBase<'K when 'K : comparison> = {
    rememberWhen: TimeAxis<'K>
    payAttention: FocusAxis<'K>
}
with
    static member Empty : GnosticBase<'K> = {
        rememberWhen = TimeAxis<'K>.Empty
        payAttention = FocusAxis<'K>.Empty
    }


/// Meta-frame tagging structures.
type EmotionMeta = {
    GoodWolfBasin: float
    BadWolfBasin: float
}

type CliffordMeta = {
    Coordinates: float[]
}

type PrometheusMeta = {
    CpuUsage: float
    MemoryBytes: int64
    UptimeSeconds: float
}


/// Composed DBSP Frame wrapping base state and its meta-dimensions.
type DbspFrame<'TBase, 'TMeta> = {
    BaseState: 'TBase
    Metadata: 'TMeta
}


/// Monadic FrameComposition representing an in-flight mapping or layering of dimensions.
type FrameComposition<'TBase, 'TMeta when 'TBase : comparison> = 
    | Composition of (GnosticBase<'TBase> -> 'TMeta)


/// F# Computation Expression builder for composing meta-frames recursively.
type FrameCompositionBuilder() =
    member _.Return(meta: 'TMeta) : FrameComposition<'TBase, 'TMeta> when 'TBase : comparison =
        Composition (fun _ -> meta)

    member _.Bind(m: FrameComposition<'TBase, 'M1>, f: 'M1 -> FrameComposition<'TBase, 'M2>) : FrameComposition<'TBase, 'M1 * 'M2> when 'TBase : comparison =
        Composition (fun baseState ->
            let (Composition run1) = m
            let m1Value = run1 baseState
            let (Composition run2) = f m1Value
            let m2Value = run2 baseState
            (m1Value, m2Value)
        )

    member _.Zero() : FrameComposition<'TBase, unit> when 'TBase : comparison =
        Composition (fun _ -> ())

    /// Applicative merging of parallel meta-frame inputs (and! syntax support).
    member _.MergeSources(m1: FrameComposition<'TBase, 'M1>, m2: FrameComposition<'TBase, 'M2>) : FrameComposition<'TBase, 'M1 * 'M2> when 'TBase : comparison =
        Composition (fun baseState ->
            let (Composition run1) = m1
            let (Composition run2) = m2
            (run1 baseState, run2 baseState)
        )


[<AutoOpen>]
module DbspFrameBuilders =
    /// Computation expression builder instance.
    let composeFrame = FrameCompositionBuilder()

    /// Builder for the two-wolves emotion meta-frame. Good Wolf vs. Bad Wolf basin values derived from base state metrics.
    let twoWolvesEmotionFrame (threshold: int) : FrameComposition<'K, EmotionMeta> when 'K : comparison =
        Composition (fun (baseState: GnosticBase<'K>) ->
            let historyCount = float (baseState.rememberWhen.History.Count)
            let activeCount = float (baseState.payAttention.Active.Count)
            let balance = historyCount / (activeCount + 1.0)
            
            if balance > float threshold then
                { GoodWolfBasin = balance; BadWolfBasin = 0.0 }
            else
                { GoodWolfBasin = 0.0; BadWolfBasin = 1.0 / (balance + 0.1) }
        )

    /// Builder for the Clifford-space coordinates meta-frame. Mapped to coordinates based on element count.
    let cliffordTaggedDims (dims: int) : FrameComposition<'K, CliffordMeta> when 'K : comparison =
        Composition (fun (baseState: GnosticBase<'K>) ->
            let activeCount = float (baseState.payAttention.Active.Count)
            let coords = Array.init dims (fun i -> activeCount * float (i + 1))
            { Coordinates = coords }
        )

    /// Builder for the Prometheus health metrics meta-frame. Tags frames with mock CPU/memory based on active load.
    let prometheusMetricsFrame () : FrameComposition<'K, PrometheusMeta> when 'K : comparison =
        Composition (fun (baseState: GnosticBase<'K>) ->
            let load = float (baseState.payAttention.Active.Count)
            {
                CpuUsage = Math.Min(100.0, load * 5.0)
                MemoryBytes = int64 (load * 1024.0 * 1024.0)
                UptimeSeconds = float (baseState.rememberWhen.History.Count)
            }
        )
