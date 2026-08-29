namespace Zeta.Core

open System
open System.Buffers
open System.Buffers.Binary
open System.Collections.Concurrent
open System.IO
open System.Text
open System.Threading
open System.Threading.Tasks


/// Arrow Flight-shaped duplex for Z-set deltas, without gRPC in Core.
///
/// Beacon: Apache Arrow Flight RPC (Wester & Le Dem; Arrow format spec
/// §Flight). The verbs this slice ships are `DoPut` / `DoGet` /
/// `DoExchange`. The gRPC encoding is one adapter and is **not** taken
/// here — Core stays off `Grpc.Net` / ASP.NET. `StreamClient` /
/// `StreamServer` is the stream adapter (pipes, `NetworkStream`).
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

    // ── Stream duplex (gRPC not taken) ──────────────────────────────
    // Request: verb, descriptor, payload. Response: payload.
    // Put=1 Get=2 Exchange=3. Empty Get/Put-ack is length 0.

    module private Frame =
        let utf8 = UTF8Encoding(false, true)

        let writeInt32 (s: Stream) (n: int) (ct: CancellationToken) =
            let buf = Array.zeroCreate 4
            BinaryPrimitives.WriteInt32LittleEndian(Span buf, n)
            s.WriteAsync(ReadOnlyMemory buf, ct)

        let readInt32 (s: Stream) (ct: CancellationToken) =
            task {
                let buf = Array.zeroCreate 4
                do! s.ReadExactlyAsync(Memory buf, ct)
                return BinaryPrimitives.ReadInt32LittleEndian(ReadOnlySpan buf)
            }

        let writeBytes (s: Stream) (bytes: byte array) (ct: CancellationToken) =
            task {
                do! writeInt32 s bytes.Length ct
                if bytes.Length > 0 then
                    do! s.WriteAsync(ReadOnlyMemory bytes, ct)
            }

        let readBytes (s: Stream) (ct: CancellationToken) =
            task {
                let! n = readInt32 s ct
                if n < 0 then invalidOp "negative Flight frame"
                if n = 0 then return Array.empty
                else
                    let buf = Array.zeroCreate n
                    do! s.ReadExactlyAsync(Memory buf, ct)
                    return buf
            }

        let writeDesc (s: Stream) (desc: Descriptor) (ct: CancellationToken) =
            task {
                match desc with
                | Path segs ->
                    do! s.WriteAsync(ReadOnlyMemory [| 1uy |], ct)
                    do! writeInt32 s segs.Length ct
                    for seg in segs do
                        do! writeBytes s (utf8.GetBytes seg) ct
                | Command payload ->
                    do! s.WriteAsync(ReadOnlyMemory [| 2uy |], ct)
                    do! writeBytes s payload ct
            }

        let readDesc (s: Stream) (ct: CancellationToken) =
            task {
                let kind = Array.zeroCreate 1
                do! s.ReadExactlyAsync(Memory kind, ct)
                match kind.[0] with
                | 1uy ->
                    let! n = readInt32 s ct
                    let segs = ResizeArray n
                    for _ in 1 .. n do
                        let! b = readBytes s ct
                        segs.Add(utf8.GetString b)
                    return Path(List.ofSeq segs)
                | 2uy ->
                    let! b = readBytes s ct
                    return Command b
                | k -> return invalidOp ("unknown Flight descriptor kind " + string k)
            }

        let encode (ser: ISerializer<'K>) (z: ZSet<'K>) =
            let buf = ArrayBufferWriter<byte> 256
            ser.Write(buf, z)
            buf.WrittenSpan.ToArray()

        let decode (ser: ISerializer<'K>) (bytes: byte array) =
            if bytes.Length = 0 then ZSet<'K>.Empty
            else ser.Read(ReadOnlySpan bytes)

    /// Client over a request/response pair of streams. One in-flight
    /// call at a time (SemaphoreSlim). `NetworkStream` / pipe streams
    /// are the intended adapters; gRPC is not.
    [<Sealed>]
    type StreamClient<'K when 'K : comparison>
        (ser: ISerializer<'K>, request: Stream, response: Stream) =
        let gate = new SemaphoreSlim(1, 1)

        let call (verb: byte) (desc: Descriptor) (payload: byte array) (ct: CancellationToken) =
            task {
                do! gate.WaitAsync ct
                try
                    do! request.WriteAsync(ReadOnlyMemory [| verb |], ct)
                    do! Frame.writeDesc request desc ct
                    do! Frame.writeBytes request payload ct
                    do! request.FlushAsync ct
                    return! Frame.readBytes response ct
                finally
                    gate.Release() |> ignore
            }

        interface IArrowFlight<'K> with
            member _.DoPut(desc, zset, ct) =
                ValueTask(
                    task {
                        let! _ = call 1uy desc (Frame.encode ser zset) ct
                        return ()
                    })

            member _.DoGet(desc, ct) =
                ValueTask<ZSet<'K>>(
                    task {
                        let! bytes = call 2uy desc Array.empty ct
                        return Frame.decode ser bytes
                    })

            member _.DoExchange(desc, delta, ct) =
                ValueTask<ZSet<'K>>(
                    task {
                        let! bytes = call 3uy desc (Frame.encode ser delta) ct
                        return Frame.decode ser bytes
                    })

        interface IDisposable with
            member _.Dispose() = gate.Dispose()

    /// Server: read requests from `request`, dispatch to `inner`,
    /// write responses to `response`. Ends on EOF or cancellation.
    [<Sealed>]
    type StreamServer<'K when 'K : comparison>
        (inner: IArrowFlight<'K>, ser: ISerializer<'K>, request: Stream, response: Stream) =

        member _.RunAsync(ct: CancellationToken) : Task =
            task {
                try
                    while not ct.IsCancellationRequested do
                        let verb = Array.zeroCreate 1
                        do! request.ReadExactlyAsync(Memory verb, ct)
                        let! desc = Frame.readDesc request ct
                        let! payload = Frame.readBytes request ct
                        match verb.[0] with
                        | 1uy ->
                            do! inner.DoPut(desc, Frame.decode ser payload, ct)
                            do! Frame.writeBytes response Array.empty ct
                        | 2uy ->
                            let! z = inner.DoGet(desc, ct)
                            do! Frame.writeBytes response (Frame.encode ser z) ct
                        | 3uy ->
                            let! z = inner.DoExchange(desc, Frame.decode ser payload, ct)
                            do! Frame.writeBytes response (Frame.encode ser z) ct
                        | k -> invalidOp ("unknown Flight verb " + string k)
                        do! response.FlushAsync ct
                with
                | :? OperationCanceledException -> ()
                | :? EndOfStreamException -> ()
            }
