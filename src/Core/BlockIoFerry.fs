namespace Zeta.Core

open System
open System.Threading
open System.Threading.Tasks

/// Block-door IO as an effect (Haskell `IO a`): a description until a ferry
/// interprets it. Combinators are generated from `FerryThrottler` already in
/// this repo. Adjacent whole-block writes coalesce in `processBatch`
/// (batch/single). Native NVMe is not claimed.
///
/// Dispatch (caller / device):
/// - single / single — `RunAsync` one op (may still share a boat)
/// - batch / batch — `RunManyAsync` N in, N out, aligned
/// - single / batch — caller already holds N ops; `fillBoat` still cuts
/// - batch / multibatch — `MaxBatchSize` / byte budget splits one submit
/// - batch / single — consecutive whole-block writes to sequential LBAs
///   become one device `Write`; each row still gets its own outcome
///
/// Primitive `IBlockIo` stays the device. This door is the interpreter.
/// DoP must be 1: two ferries would reorder writes on one device.
/// Buffers in `Op.Read` / `Op.Write` must stay alive until the ferry
/// interprets that op. Read, Flush, partial blocks, and LBA holes
/// break a coalesce run.
module BlockIoFerry =

    type Op =
        | Read of lba: uint64 * dst: Memory<byte>
        | Write of lba: uint64 * src: ReadOnlyMemory<byte>
        | Flush

    type Outcome = { Bytes: int }

    let interpret (device: IBlockIo) (op: Op) : Outcome =
        match op with
        | Op.Read(lba, dst) -> { Bytes = device.Read(lba, dst) }
        | Op.Write(lba, src) -> { Bytes = device.Write(lba, src) }
        | Op.Flush ->
            device.Flush()
            { Bytes = 0 }

    type internal Request =
        { Op: Op
          Reply: TaskCompletionSource<Outcome> }

    /// DoP=1 interpreter. `manual` is the DST pump (no background ferry).
    [<Sealed>]
    type Door(device: IBlockIo, config: FerryThrottlerConfig, ?manual: bool) =

        do
            if config.MaxDegreeOfParallelism <> 1 then
                invalidArg (nameof config) "BlockIoFerry.Door is one device; MaxDegreeOfParallelism must be 1."

        let isManual = defaultArg manual false
        let mutable boats = 0
        let mutable lastBoat = 0
        let mutable deviceWrites = 0
        let blockSize = device.BlockSize

        let isWholeBlock (src: ReadOnlyMemory<byte>) =
            src.Length > 0 && blockSize > 0 && src.Length % blockSize = 0

        let processBatch (boat: ReadOnlyMemory<Request>) (ct: CancellationToken) : Task =
            let fail (ex: exn) =
                for i in 0 .. boat.Length - 1 do
                    boat.Span.[i].Reply.TrySetException ex |> ignore

                Task.CompletedTask

            try
                ct.ThrowIfCancellationRequested()
                boats <- boats + 1
                lastBoat <- boat.Length
                let mutable i = 0

                while i < boat.Length do
                    match boat.Span.[i].Op with
                    | Op.Write(lba, src) when isWholeBlock src ->
                        let mutable j = i + 1
                        let mutable nextLba = lba + uint64 (src.Length / blockSize)
                        let mutable total = src.Length
                        let mutable merging = true

                        while merging && j < boat.Length do
                            match boat.Span.[j].Op with
                            | Op.Write(l2, s2) when isWholeBlock s2 && l2 = nextLba ->
                                total <- total + s2.Length
                                nextLba <- nextLba + uint64 (s2.Length / blockSize)
                                j <- j + 1
                            | _ -> merging <- false

                        if j = i + 1 then
                            boat.Span.[i].Reply.TrySetResult(interpret device boat.Span.[i].Op)
                            |> ignore

                            deviceWrites <- deviceWrites + 1
                            i <- i + 1
                        else
                            let buf = Array.zeroCreate total
                            let mutable off = 0

                            for k in i .. j - 1 do
                                match boat.Span.[k].Op with
                                | Op.Write(_, s) ->
                                    s.Span.CopyTo(Span(buf, off, s.Length))
                                    off <- off + s.Length
                                | _ -> ()

                            device.Write(lba, System.ReadOnlyMemory<byte>.op_Implicit buf)
                            |> ignore

                            deviceWrites <- deviceWrites + 1

                            for k in i .. j - 1 do
                                match boat.Span.[k].Op with
                                | Op.Write(_, s) ->
                                    boat.Span.[k].Reply.TrySetResult({ Bytes = s.Length })
                                    |> ignore
                                | _ -> ()

                            i <- j
                    | Op.Write _ ->
                        boat.Span.[i].Reply.TrySetResult(interpret device boat.Span.[i].Op)
                        |> ignore

                        deviceWrites <- deviceWrites + 1
                        i <- i + 1
                    | _ ->
                        boat.Span.[i].Reply.TrySetResult(interpret device boat.Span.[i].Op)
                        |> ignore

                        i <- i + 1

                Task.CompletedTask
            with ex ->
                fail ex

        let throttler = new FerryThrottler<Request>(config, processBatch, manual = isManual)

        member _.Boats = boats
        member _.LastBoatSize = lastBoat
        member _.DeviceWrites = deviceWrites

        member _.RunAsync(op: Op, ct: CancellationToken) : ValueTask<Outcome> =
            let reply =
                TaskCompletionSource<Outcome>(TaskCreationOptions.RunContinuationsAsynchronously)

            let req = { Op = op; Reply = reply }

            if ct.IsCancellationRequested then
                req.Reply.TrySetCanceled ct |> ignore
                ValueTask<Outcome>(Task.FromCanceled<Outcome> ct)
            else
                let write = throttler.EnqueueAsync(req, ct)

                let wait (enqueue: ValueTask) =
                    task {
                        try
                            if not enqueue.IsCompletedSuccessfully then
                                do! enqueue.AsTask().ConfigureAwait(false)

                            return! req.Reply.Task.WaitAsync(ct).ConfigureAwait(false)
                        with
                        | :? OperationCanceledException as ex ->
                            req.Reply.TrySetCanceled ct |> ignore
                            return raise ex
                        | ex ->
                            req.Reply.TrySetException ex |> ignore
                            return raise ex
                    }

                if write.IsCompletedSuccessfully then
                    ValueTask<Outcome>(wait (ValueTask()))
                else
                    ValueTask<Outcome>(wait write)

        member this.RunManyAsync(ops: ReadOnlyMemory<Op>, ct: CancellationToken) : Task<Outcome[]> =
            if ops.IsEmpty then
                Task.FromResult Array.empty
            else
                let n = ops.Length
                let vts = Array.zeroCreate<ValueTask<Outcome>> n

                for i in 0 .. n - 1 do
                    vts.[i] <- this.RunAsync(ops.Span.[i], ct)

                task {
                    let results = Array.zeroCreate n

                    for i in 0 .. n - 1 do
                        let vt = vts.[i]

                        if vt.IsCompletedSuccessfully then
                            results.[i] <- vt.Result
                        else
                            let! r = vt.AsTask().ConfigureAwait(false)
                            results.[i] <- r

                    return results
                }

        member _.PumpToIdleAsync(ct: CancellationToken) : Task =
            throttler.PumpToIdleAsync(ct)

        interface IDisposable with
            member _.Dispose() = (throttler :> IDisposable).Dispose()
