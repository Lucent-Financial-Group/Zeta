namespace Zeta.Core

open System
open System.Buffers
open System.Collections.Concurrent
open System.Threading
open System.Threading.Tasks


/// Arrow Flight-shaped duplex for Z-set deltas, without gRPC in Core.
///
/// Beacon: Apache Arrow Flight RPC (Wester & Le Dem; Arrow format spec
/// §Flight). The verbs this slice ships are `DoPut` / `DoGet` /
/// `DoExchange`. The gRPC encoding is one adapter and is **not** taken
/// here — Core stays off `Grpc.Net` / ASP.NET; a network transport is
/// a later hexagonal port over the same verbs.
///
/// Payloads are the existing Arrow IPC frames (`ISerializer`, zstd by
/// default via `ArrowIpc`). One call = one Z-set = one record batch.
/// Streaming many batches per call is a later increment.
module ArrowFlight =

    /// Flight descriptor. `Path` is the named dataset; `Command` is an
    /// opaque application ticket. Distinct constructors never share a
    /// store key.
    type Descriptor =
        | Path of segments: string list
        | Command of payload: byte array

    let internal descriptorKey (desc: Descriptor) : string =
        match desc with
        | Path segs ->
            // Unit separator so a segment containing `/` cannot collide
            // with a split path (Ordinal; not linguistic).
            "path:" + String.Join("\u001f", segs)
        | Command bytes -> "cmd:" + Convert.ToHexString bytes

    /// Flight verbs over a Z-set of `'K`. Completed `ValueTask`s — the
    /// in-process store is synchronous; a network adapter keeps the
    /// same signatures and actually yields.
    type IArrowFlight<'K when 'K : comparison> =
        /// Replace the snapshot at `desc`. Last writer wins.
        abstract DoPut: desc: Descriptor * zset: ZSet<'K> * ct: CancellationToken -> ValueTask
        /// Read the snapshot at `desc`. Missing path is empty, not an error.
        abstract DoGet: desc: Descriptor * ct: CancellationToken -> ValueTask<ZSet<'K>>
        /// Integrate `delta` into the snapshot (Z-set `+`) and return the
        /// post-integrate value so both peers converge. CAS-retried.
        abstract DoExchange: desc: Descriptor * delta: ZSet<'K> * ct: CancellationToken -> ValueTask<ZSet<'K>>

    /// In-process Flight peer. Two clients constructed from the same
    /// `InProcessHub` share one store — the two-node test without a
    /// network. Standalone `InProcessFlight(ser)` is a private store.
    [<Sealed>]
    type InProcessFlight<'K when 'K : comparison>
        private (ser: ISerializer<'K>, store: ConcurrentDictionary<string, byte[]>) =

        let encode (z: ZSet<'K>) =
            let buf = ArrayBufferWriter<byte> 256
            ser.Write(buf, z)
            buf.WrittenSpan.ToArray()

        let decode (bytes: byte[]) = ser.Read(ReadOnlySpan<byte> bytes)

        new(ser: ISerializer<'K>) =
            InProcessFlight(ser, ConcurrentDictionary(StringComparer.Ordinal))

        static member internal Attach(ser: ISerializer<'K>, store: ConcurrentDictionary<string, byte[]>) =
            InProcessFlight(ser, store)

        interface IArrowFlight<'K> with
            member _.DoPut(desc, zset, ct) =
                ct.ThrowIfCancellationRequested()
                store.[descriptorKey desc] <- encode zset
                ValueTask()

            member _.DoGet(desc, ct) =
                ct.ThrowIfCancellationRequested()
                match store.TryGetValue(descriptorKey desc) with
                | true, bytes -> ValueTask<ZSet<'K>>(decode bytes)
                | false, _ -> ValueTask<ZSet<'K>>(ZSet<'K>.Empty)

            member _.DoExchange(desc, delta, ct) =
                let rec swap () =
                    ct.ThrowIfCancellationRequested()
                    let key = descriptorKey desc
                    match store.TryGetValue key with
                    | false, _ ->
                        let encoded = encode delta
                        if store.TryAdd(key, encoded) then delta else swap ()
                    | true, prevBytes ->
                        let next = decode prevBytes + delta
                        let encoded = encode next
                        if store.TryUpdate(key, encoded, prevBytes) then next else swap ()

                ValueTask<ZSet<'K>>(swap ())

    /// Shared in-process hub. Each `Connect` is a Flight peer on the
    /// same snapshot table — DoPut on one is DoGet on the other.
    [<Sealed>]
    type InProcessHub<'K when 'K : comparison>(ser: ISerializer<'K>) =
        let store = ConcurrentDictionary<string, byte[]>(StringComparer.Ordinal)
        member _.Connect() : IArrowFlight<'K> =
            InProcessFlight.Attach(ser, store) :> IArrowFlight<'K>
