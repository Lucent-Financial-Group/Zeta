namespace Zeta.Core

open System
open System.IO
open System.Threading
open System.Threading.Tasks

/// Checkpoint state reader — operators load their state
/// from this during recovery. Mirrors Reaqtor's
/// IOperatorStateReader pattern.
type ICheckpointReader =
    abstract ReadInt32: unit -> int32
    abstract ReadInt64: unit -> int64
    abstract ReadFloat: unit -> float
    abstract ReadBool: unit -> bool
    abstract ReadBytes: unit -> byte array
    abstract ReadString: unit -> string

/// Checkpoint state writer — operators save their state
/// to this during checkpoint. Mirrors Reaqtor's
/// IOperatorStateWriter pattern.
type ICheckpointWriter =
    abstract WriteInt32: int32 -> unit
    abstract WriteInt64: int64 -> unit
    abstract WriteFloat: float -> unit
    abstract WriteBool: bool -> unit
    abstract WriteBytes: byte array -> unit
    abstract WriteString: string -> unit

/// An operator that can save and restore its internal
/// state for durable execution. Operators implementing
/// this interface participate in circuit-level
/// checkpointing.
///
/// Design lineage:
/// - Reaqtor IStatefulOperator (Save/Load at yield points)
/// - Temporal deterministic replay (event history as source
///   of truth, operator state as optimization)
/// - Orleans grain persistence (grain = standing query with
///   durable state)
///
/// The checkpoint boundary is Circuit.StepAsync — state
/// is captured between steps. On recovery, the circuit
/// can either replay from the event stream (Temporal
/// model) or restore operator state directly (Reaqtor
/// model). Both are valid; the interface supports both.
type ICheckpointable =
    abstract SaveState: writer: ICheckpointWriter -> unit
    abstract LoadState: reader: ICheckpointReader -> unit
    abstract StateVersion: int

/// Checkpoint store — persists operator states keyed by
/// operator ID. The circuit coordinator calls this after
/// each step (or at a configured interval).
type ICheckpointStore =
    abstract SaveCheckpointAsync:
        circuitId: string *
        tick: int64 *
        states: (int * ICheckpointable) array *
        ct: CancellationToken ->
            ValueTask

    abstract LoadCheckpointAsync:
        circuitId: string *
        ct: CancellationToken ->
            ValueTask<struct (int64 * (int * ICheckpointReader) array) voption>

/// In-memory checkpoint store for testing and DST.
[<Sealed>]
type InMemoryCheckpointStore() =
    let mutable saved:
        struct (int64 * byte array array) voption = ValueNone

    interface ICheckpointStore with
        member _.SaveCheckpointAsync
            (_circuitId, tick, states, _ct) =
            let buffers =
                states
                |> Array.map (fun (opId, checkpointable) ->
                    use ms = new MemoryStream()
                    use bw = new BinaryWriter(ms)
                    let writer =
                        { new ICheckpointWriter with
                            member _.WriteInt32 v = bw.Write v
                            member _.WriteInt64 v = bw.Write v
                            member _.WriteFloat v = bw.Write v
                            member _.WriteBool v = bw.Write v
                            member _.WriteBytes v =
                                bw.Write(v.Length)
                                bw.Write v
                            member _.WriteString v = bw.Write v }
                    bw.Write opId
                    bw.Write checkpointable.StateVersion
                    checkpointable.SaveState writer
                    ms.ToArray())
            saved <- ValueSome(tick, buffers)
            ValueTask.CompletedTask

        member _.LoadCheckpointAsync(_circuitId, _ct) =
            match saved with
            | ValueNone -> ValueTask.FromResult ValueNone
            | ValueSome(tick, buffers) ->
                let readers =
                    buffers
                    |> Array.map (fun buf ->
                        let ms = new MemoryStream(buf)
                        let br = new BinaryReader(ms)
                        let opId = br.ReadInt32()
                        let _version = br.ReadInt32()
                        let reader =
                            { new ICheckpointReader with
                                member _.ReadInt32() = br.ReadInt32()
                                member _.ReadInt64() = br.ReadInt64()
                                member _.ReadFloat() = br.ReadDouble()
                                member _.ReadBool() = br.ReadBoolean()
                                member _.ReadBytes() =
                                    let len = br.ReadInt32()
                                    br.ReadBytes len
                                member _.ReadString() = br.ReadString() }
                        (opId, reader))
                ValueTask.FromResult(
                    ValueSome(struct (tick, readers)))
