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

/// File-based checkpoint store with fsync for crash-safe
/// operator state persistence. StableStorage mode for
/// the checkpoint control plane.
///
/// Design lineage:
/// - Reaqtor checkpoint persistence (periodic state snapshots)
/// - Atomic-rename pattern (write-to-temp, fsync, rename)
/// - WitnessDurableBackingStore path-canonicalization pattern
[<Sealed>]
type FileCheckpointStore(rootDir: string) =
    // Canonicalise path once — same TOCTOU-avoidance pattern
    // as WitnessDurableBackingStore.
    let canonicalRoot = Path.GetFullPath rootDir

    do
        Directory.CreateDirectory canonicalRoot |> ignore

    let checkpointPath (circuitId: string) =
        Path.Combine(canonicalRoot, circuitId + ".checkpoint")

    interface ICheckpointStore with
        member _.SaveCheckpointAsync
            (circuitId, tick, states, _ct) =
            // Serialize to a MemoryStream first, then write
            // atomically via temp-file + fsync + rename.
            use ms = new MemoryStream()
            use bw = new BinaryWriter(ms)
            bw.Write tick
            bw.Write(states.Length)
            for (opId, checkpointable) in states do
                bw.Write opId
                bw.Write checkpointable.StateVersion
                // Capture operator state into a sub-buffer so
                // we can length-prefix the data blob.
                use opMs = new MemoryStream()
                use opBw = new BinaryWriter(opMs)
                let writer =
                    { new ICheckpointWriter with
                        member _.WriteInt32 v = opBw.Write v
                        member _.WriteInt64 v = opBw.Write v
                        member _.WriteFloat v = opBw.Write v
                        member _.WriteBool v = opBw.Write v
                        member _.WriteBytes v =
                            opBw.Write(v.Length)
                            opBw.Write v
                        member _.WriteString v = opBw.Write v }
                checkpointable.SaveState writer
                opBw.Flush()
                let data = opMs.ToArray()
                bw.Write(data.Length)
                bw.Write data
            bw.Flush()

            let payload = ms.ToArray()
            let target = checkpointPath circuitId
            let tmpPath =
                target + ".tmp." + Guid.NewGuid().ToString("N")

            // Write to temp file, fsync, then atomic rename.
            use fs =
                new FileStream(
                    tmpPath,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.None)
            fs.Write(payload, 0, payload.Length)
            // Flush(true) = FlushFileBuffers / fsync
            fs.Flush true
            fs.Close()

            File.Move(tmpPath, target, true)
            ValueTask.CompletedTask

        member _.LoadCheckpointAsync(circuitId, _ct) =
            let path = checkpointPath circuitId
            if not (File.Exists path) then
                ValueTask.FromResult ValueNone
            else
                let bytes = File.ReadAllBytes path
                use ms = new MemoryStream(bytes)
                use br = new BinaryReader(ms)
                let tick = br.ReadInt64()
                let count = br.ReadInt32()
                let readers =
                    Array.init count (fun _ ->
                        let opId = br.ReadInt32()
                        let _version = br.ReadInt32()
                        let dataLen = br.ReadInt32()
                        let data = br.ReadBytes dataLen
                        let opMs = new MemoryStream(data)
                        let opBr = new BinaryReader(opMs)
                        let reader =
                            { new ICheckpointReader with
                                member _.ReadInt32() =
                                    opBr.ReadInt32()
                                member _.ReadInt64() =
                                    opBr.ReadInt64()
                                member _.ReadFloat() =
                                    opBr.ReadDouble()
                                member _.ReadBool() =
                                    opBr.ReadBoolean()
                                member _.ReadBytes() =
                                    let len = opBr.ReadInt32()
                                    opBr.ReadBytes len
                                member _.ReadString() =
                                    opBr.ReadString() }
                        (opId, reader))
                ValueTask.FromResult(
                    ValueSome(struct (tick, readers)))


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
