namespace Zeta.Core

open System

/// Sequoia Memory Hierarchy Levels
type SequoiaLevel =
    | L1Cache
    | L2Memory
    | L3Distributed
    | PersistentStorage

/// High-performance flat multi-dimensional TensorBridge for zero-copy wire-format bridge.
type TensorBridge<'T when 'T : struct> = {
    Shape: int[]
    Data: 'T[]
}
with
    static member Create2D(rows: int, cols: int, initial: 'T) : TensorBridge<'T> =
        let arr = Array.create (rows * cols) initial
        { Shape = [| rows; cols |]; Data = arr }

    member this.Item(r: int, c: int) =
        this.Data.[r * this.Shape.[1] + c]


/// 4-particle primitives representation
type Observe<'TBase, 'TMeta when 'TBase : comparison> = {
    Level: SequoiaLevel
    State: GnosticBase<'TBase>
    Tag: 'TMeta
}

type LimitPreview<'TBase, 'TMeta when 'TBase : comparison> = {
    Dialectical: DbspFrame<'TBase, 'TMeta>
    Classical: DbspFrame<'TBase, 'TMeta>
}

type ChoicePath<'TBase, 'TMeta when 'TBase : comparison> = {
    EnergyCost: float
    ComposedFrame: DbspFrame<'TBase, 'TMeta>
}


/// Signal Blocking primitive
type SignalBlock<'K when 'K : comparison> = {
    BlockedChannels: Set<'K>
}
with
    static member Empty : SignalBlock<'K> = { BlockedChannels = Set.empty }
    
    member this.Add(channel: 'K) =
        { BlockedChannels = Set.add channel this.BlockedChannels }

    member this.IsBlocked(channel: 'K) =
        Set.contains channel this.BlockedChannels

    /// First-class block implementation. Block = receive + immediately retract = net-zero state change.
    /// In Zeta retraction semantics, blocking channel returns the inverse of the delta ZSet.
    member this.Block(channel: 'K, delta: ZSet<'K>) : ZSet<'K> =
        if this.IsBlocked channel then
            ZSet.neg delta
        else
            delta


/// Eve-Protocol 3-layer RF trust gate
type TrustLevel =
    | InsideTrust
    | AtTrustBoundary
    | OutsideTrust

type DiplomaticResult<'K when 'K : comparison> =
    | Admit of ZSet<'K>
    | Reject
    | Negotiated of ZSet<'K> * string // negotiated payload + rationale


[<RequireQualifiedAccess>]
module V8Primitives =
    
    /// Primitives for 4-particle cycle
    let observe (level: SequoiaLevel) (baseState: GnosticBase<'K>) (tag: 'M) : Observe<'K, 'M> when 'K : comparison =
        { Level = level; State = baseState; Tag = tag }

    let limit (dialectical: DbspFrame<'K, 'M>) (classical: DbspFrame<'K, 'M>) : LimitPreview<'K, 'M> when 'K : comparison =
        { Dialectical = dialectical; Classical = classical }

    let choose (paths: ChoicePath<'K, 'M> seq) : ChoicePath<'K, 'M> when 'K : comparison =
        if Seq.isEmpty paths then
            invalidOp "Cannot choose from empty paths"
        else
            paths |> Seq.minBy (fun p -> p.EnergyCost)

    let emit (level: SequoiaLevel) (frame: DbspFrame<'K, 'M>) : SequoiaLevel * DbspFrame<'K, 'M> when 'K : comparison =
        (level, frame)

    /// Enforce polymorphic diplomacy at trust boundary
    let gateSignal (trust: TrustLevel) (channel: 'K) (delta: ZSet<'K>) (reputation: float) (blocker: SignalBlock<'K>) : DiplomaticResult<'K> when 'K : comparison =
        if blocker.IsBlocked channel then
            Reject
        else
            match trust with
            | InsideTrust -> 
                // High-trust peers flow freely
                Admit delta
            | AtTrustBoundary ->
                // Subjects to reputation × context negotiation
                if reputation > 0.8 then
                    Admit delta
                elif reputation > 0.5 then
                    Negotiated (delta, "Accept under medium trust baseline")
                else
                    Reject
            | OutsideTrust ->
                // Deny all unless explicit override or blocked automatically
                Reject
