module Zeta.Tests.Runtime.BlockIoFerryTests

open System
open System.Threading
open System.Threading.Tasks
open Xunit
open Zeta.Core

let private memPayload (bytes: byte[]) =
    System.ReadOnlyMemory<byte>.op_Implicit bytes

let private memDst (bytes: byte[]) =
    System.Memory<byte>.op_Implicit bytes

[<Fact>]
let ``BlockIoFerry single write then read round-trips through FileSystemBlockIo`` () : Task =
    task {
        let mock = InMemoryFileSystem() :> IFileSystem
        let device = FileSystemBlockIo(mock, "/vol/blocks", 4096) :> IBlockIo
        let config = FerryThrottlerConfig.deterministic
        use door = new BlockIoFerry.Door(device, config, manual = true)
        let payload = [| 9uy; 8uy; 7uy; 6uy |]
        let write = door.RunAsync(BlockIoFerry.Op.Write(0UL, memPayload payload), CancellationToken.None)
        let flush = door.RunAsync(BlockIoFerry.Op.Flush, CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! wrote = write.AsTask().ConfigureAwait(false)
        let! _ = flush.AsTask().ConfigureAwait(false)
        Assert.Equal(4, wrote.Bytes)
        let dst = Array.zeroCreate<byte> 4
        let read = door.RunAsync(BlockIoFerry.Op.Read(0UL, memDst dst), CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! got = read.AsTask().ConfigureAwait(false)
        Assert.Equal(4, got.Bytes)
        Assert.Equal<byte>(payload, dst)
        Assert.Equal(2, door.Boats)
    }

[<Fact>]
let ``BlockIoFerry RunMany packs N writes into one boat`` () : Task =
    task {
        let mock = InMemoryFileSystem() :> IFileSystem
        let device = FileSystemBlockIo(mock, "/vol/many", 4096) :> IBlockIo
        let config = { FerryThrottlerConfig.deterministic with MaxBatchSize = 64 }
        use door = new BlockIoFerry.Door(device, config, manual = true)
        let ops =
            [| for i in 0 .. 3 ->
                   BlockIoFerry.Op.Write(uint64 i, memPayload [| byte i |]) |]

        let pending = door.RunManyAsync(ReadOnlyMemory ops, CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! results = pending.ConfigureAwait(false)
        Assert.Equal(4, results.Length)
        Assert.Equal(1, door.Boats)
        Assert.Equal(4, door.LastBoatSize)
        Assert.Equal(1, results.[0].Bytes)
        Assert.Equal(1, results.[3].Bytes)
    }

[<Fact>]
let ``BlockIoFerry MaxBatchSize splits one submit into several boats`` () : Task =
    task {
        let mock = InMemoryFileSystem() :> IFileSystem
        let device = FileSystemBlockIo(mock, "/vol/split", 4096) :> IBlockIo
        let config = { FerryThrottlerConfig.deterministic with MaxBatchSize = 2 }
        use door = new BlockIoFerry.Door(device, config, manual = true)
        let ops =
            [| for i in 0 .. 4 ->
                   BlockIoFerry.Op.Write(uint64 i, memPayload [| byte i |]) |]

        let pending = door.RunManyAsync(ReadOnlyMemory ops, CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! results = pending.ConfigureAwait(false)
        Assert.Equal(5, results.Length)
        Assert.Equal(3, door.Boats)
        Assert.Equal(1, door.LastBoatSize)
    }

[<Fact>]
let ``BlockIoFerry cancelled token before admit does not start a boat`` () : Task =
    task {
        let mock = InMemoryFileSystem() :> IFileSystem
        let device = FileSystemBlockIo(mock, "/vol/cancel", 4096) :> IBlockIo
        use door =
            new BlockIoFerry.Door(device, FerryThrottlerConfig.deterministic, manual = true)

        use cts = new CancellationTokenSource()
        cts.Cancel()
        let t = door.RunAsync(BlockIoFerry.Op.Flush, cts.Token).AsTask()
        Assert.True(t.IsCompleted)
        Assert.True(t.IsCanceled)
        Assert.Equal(0, door.Boats)
    }

let private blockBytes (seed: byte) =
    Array.init 4096 (fun i -> byte ((int seed + i) &&& 0xFF))

[<Fact>]
let ``BlockIoFerry coalesces adjacent whole-block writes into one device write`` () : Task =
    task {
        let mock = InMemoryFileSystem() :> IFileSystem
        let device = FileSystemBlockIo(mock, "/vol/coal", 4096) :> IBlockIo
        let config = { FerryThrottlerConfig.deterministic with MaxBatchSize = 64 }
        use door = new BlockIoFerry.Door(device, config, manual = true)
        let a = blockBytes 1uy
        let b = blockBytes 2uy
        let ops =
            [| BlockIoFerry.Op.Write(0UL, memPayload a)
               BlockIoFerry.Op.Write(1UL, memPayload b) |]

        let pending = door.RunManyAsync(ReadOnlyMemory ops, CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! results = pending.ConfigureAwait(false)
        Assert.Equal(2, results.Length)
        Assert.Equal(1, door.Boats)
        Assert.Equal(1, door.DeviceWrites)
        Assert.Equal(4096, results.[0].Bytes)
        Assert.Equal(4096, results.[1].Bytes)
        let gotA = Array.zeroCreate<byte> 4096
        let gotB = Array.zeroCreate<byte> 4096
        let readA = door.RunAsync(BlockIoFerry.Op.Read(0UL, memDst gotA), CancellationToken.None)
        let readB = door.RunAsync(BlockIoFerry.Op.Read(1UL, memDst gotB), CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! _ = readA.AsTask().ConfigureAwait(false)
        let! _ = readB.AsTask().ConfigureAwait(false)
        Assert.Equal<byte>(a, gotA)
        Assert.Equal<byte>(b, gotB)
    }

[<Fact>]
let ``BlockIoFerry does not coalesce a hole, a flush, or a partial block`` () : Task =
    task {
        let mock = InMemoryFileSystem() :> IFileSystem
        let device = FileSystemBlockIo(mock, "/vol/hole", 4096) :> IBlockIo
        let config = { FerryThrottlerConfig.deterministic with MaxBatchSize = 64 }
        use door = new BlockIoFerry.Door(device, config, manual = true)
        let a = blockBytes 3uy
        let b = blockBytes 4uy
        let hole =
            [| BlockIoFerry.Op.Write(0UL, memPayload a)
               BlockIoFerry.Op.Write(2UL, memPayload b) |]

        let pendingHole = door.RunManyAsync(ReadOnlyMemory hole, CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! _ = pendingHole.ConfigureAwait(false)
        Assert.Equal(2, door.DeviceWrites)
        let afterHole = door.DeviceWrites
        let barrier =
            [| BlockIoFerry.Op.Write(3UL, memPayload a)
               BlockIoFerry.Op.Flush
               BlockIoFerry.Op.Write(4UL, memPayload b) |]

        let pendingBarrier = door.RunManyAsync(ReadOnlyMemory barrier, CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! _ = pendingBarrier.ConfigureAwait(false)
        Assert.Equal(afterHole + 2, door.DeviceWrites)
        let afterBarrier = door.DeviceWrites
        let partial =
            [| BlockIoFerry.Op.Write(5UL, memPayload [| 1uy |])
               BlockIoFerry.Op.Write(6UL, memPayload [| 2uy |]) |]

        let pendingPartial = door.RunManyAsync(ReadOnlyMemory partial, CancellationToken.None)
        do! door.PumpToIdleAsync(CancellationToken.None).ConfigureAwait(false)
        let! _ = pendingPartial.ConfigureAwait(false)
        Assert.Equal(afterBarrier + 2, door.DeviceWrites)
    }
