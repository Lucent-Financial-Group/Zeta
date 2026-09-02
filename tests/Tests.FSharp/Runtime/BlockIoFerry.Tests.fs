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
