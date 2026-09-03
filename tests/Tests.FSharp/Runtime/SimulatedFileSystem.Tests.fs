module Zeta.Tests.Runtime.SimulatedFileSystemTests

open System
open System.IO
open System.Threading
open System.Threading.Tasks
open Xunit
open Zeta.Core

[<Fact>]
let ``InMemoryFileSystem read, write, move, exists, and delete work correctly`` () =
    let fs = InMemoryFileSystem() :> IFileSystem
    let path = "/test/data.bin"
    let bytes = [| 1uy; 2uy; 3uy; 4uy |]

    // 1. Exists is false initially
    Assert.False(fs.Exists path)

    // 2. Write file
    use stream = fs.OpenWrite(path, false)
    stream.Write(bytes, 0, bytes.Length)
    stream.Close()

    // 3. Exists is true, ReadAllBytes matches
    Assert.True(fs.Exists path)
    let readBytes = fs.ReadAllBytes path
    Assert.Equal<byte>(bytes, readBytes)

    // 4. Move file
    let newPath = "/test/data_new.bin"
    fs.Move(path, newPath, true)
    Assert.False(fs.Exists path)
    Assert.True(fs.Exists newPath)
    Assert.Equal<byte>(bytes, fs.ReadAllBytes newPath)

    // 5. Delete file
    fs.Delete newPath
    Assert.False(fs.Exists newPath)

[<Fact>]
let ``InMemoryFileSystem GetFiles correctly filters by suffix and path`` () =
    let fs = InMemoryFileSystem() :> IFileSystem
    fs.OpenFile("/root/segment1.delta", FileMode.Create, FileAccess.Write, FileShare.None).Close()
    fs.OpenFile("/root/segment2.delta", FileMode.Create, FileAccess.Write, FileShare.None).Close()
    fs.OpenFile("/root/manifest.meta", FileMode.Create, FileAccess.Write, FileShare.None).Close()
    fs.OpenFile("/other/other1.delta", FileMode.Create, FileAccess.Write, FileShare.None).Close()

    let deltaFiles = fs.GetFiles("/root", "*.delta")
    Assert.Equal(2, deltaFiles.Length)
    Assert.Contains("/root/segment1.delta", deltaFiles)
    Assert.Contains("/root/segment2.delta", deltaFiles)
    Assert.DoesNotContain("/root/manifest.meta", deltaFiles)
    Assert.DoesNotContain("/other/other1.delta", deltaFiles)

[<Fact>]
let ``InMemoryFileSystem error injection is deterministic per seed`` () =
    let runSim seed =
        let fs = InMemoryFileSystem()
        let ifs = fs :> IFileSystem
        fs.SetFaults(0.3, 0L, seed) // 30% error rate
        
        let mutable successCount = 0
        let mutable failureCount = 0
        
        for i in 1 .. 50 do
            try
                fs.Files.[sprintf "/file-%d" i] <- [| byte i |]
                let _ = ifs.Exists(sprintf "/file-%d" i)
                successCount <- successCount + 1
            with
            | _ -> failureCount <- failureCount + 1
            
        successCount, failureCount

    let s1, f1 = runSim 42L
    let s2, f2 = runSim 42L
    let s3, f3 = runSim 99L

    // Replay determinism
    Assert.Equal(s1, s2)
    Assert.Equal(f1, f2)
    // Distinct seed produces distinct trace (probabilistically)
    Assert.NotEqual(s1, s3)
    Assert.True(f1 > 0, "Expected some failures to be injected")

[<Fact>]
let ``InMemoryFileSystem delay injection is virtual time not wall clock`` () =
    let fs = InMemoryFileSystem()
    fs.SetFaults(0.0, 250L, 42L)

    let path = "/test/delay.bin"
    let sw = System.Diagnostics.Stopwatch.StartNew()
    use stream = (fs :> IFileSystem).OpenWrite(path, false)
    stream.Write([| 42uy |], 0, 1)
    stream.Close()
    sw.Stop()

    Assert.True(
        fs.VirtualElapsedMs >= 250L,
        sprintf "Expected >= 250 virtual ms, got %d" fs.VirtualElapsedMs
    )
    Assert.True(
        sw.ElapsedMilliseconds < 80L,
        sprintf "wall clock must not sleep the injected latency, got %dms" sw.ElapsedMilliseconds
    )

[<Fact>]
let ``DiskSpine store runs successfully under InMemoryFileSystem`` () =
    // Register simulated filesystem globally
    let mockFs = InMemoryFileSystem()
    FileSystem.Register(mockFs)
    
    try
        let key = 1L
        let z = ZSet.ofKeys [ key ]
        
        let rootPath = "/spine_test_root"
        // inMemoryQuotaBytes = 0L forces direct spill to files
        let store = DiskBackingStore<int64>(rootPath, inMemoryQuotaBytes = 0L) :> IBackingStore<int64>
        
        // Save and load batch
        let handle = store.Save(0, z)
        let loaded = store.Load(handle)
        
        let eq = (z = loaded)
        Assert.True(eq)
        
        // Check that files are written in memory only (no real directories created)
        Assert.NotEmpty(mockFs.Files.Keys)
        Assert.False(System.IO.Directory.Exists rootPath)
        
        store.Release handle
        
    finally
        // Ensure registry is cleaned up
        FileSystem.Reset()

[<Fact>]
let ``InMemoryFileSystem swarm stress test scenario`` () =
    let seed = ChaosEnvironment.getSeedFromEnv(12345L)
    
    // Seed 999L is configured as a deterministic failure trigger for Swarm Testing validation
    if seed = 999L then
        failwith "Simulated deterministic swarm stress test failure under seed 999"
        
    let mockFs = InMemoryFileSystem()
    mockFs.SetFaults(0.01, 2L, seed)
    FileSystem.Register(mockFs)
    
    try
        let store = DiskBackingStore<int64>("/swarm_stress_root", inMemoryQuotaBytes = 0L) :> IBackingStore<int64>
        let z = ZSet.ofKeys [ 42L ]
        let h = store.Save(0, z)
        let loaded = store.Load(h)
        Assert.Equal<ZSet<int64>>(z, loaded)
        store.Release h
    finally
        FileSystem.Reset()

[<Fact>]
let ``InMemoryFileSystem Flush publishes without firing crash-mid-write`` () =
    let fs = InMemoryFileSystem()
    let ifs = fs :> IFileSystem
    fs.ArmCrashMidWrite("/flushed", 8)
    let payload = Array.init 100 (fun i -> byte i)
    let stream = ifs.OpenWrite("/flushed", false)
    stream.Write(payload, 0, payload.Length)
    stream.Flush()
    Assert.True(ifs.Exists "/flushed")
    Assert.Equal(100, ifs.ReadAllBytes("/flushed").Length)
    Assert.Equal<byte>(payload, ifs.ReadAllBytes("/flushed"))
    let ex = Assert.Throws<CrashMidWriteException>(fun () -> stream.Dispose())
    Assert.Equal(8, ex.CommittedBytes)
    Assert.Equal(8, ifs.ReadAllBytes("/flushed").Length)
    Assert.Equal<byte>(Array.sub payload 0 8, ifs.ReadAllBytes("/flushed"))

[<Fact>]
let ``InMemoryFileSystem crash-mid-write commits a prefix then throws`` () =
    let fs = InMemoryFileSystem()
    let ifs = fs :> IFileSystem
    fs.ArmCrashMidWrite("/torn", 8)
    let payload = Array.init 100 (fun i -> byte i)
    let stream = ifs.OpenWrite("/torn", false)
    stream.Write(payload, 0, payload.Length)
    let ex = Assert.Throws<CrashMidWriteException>(fun () -> stream.Dispose())
    Assert.Equal("/torn", ex.Path)
    Assert.Equal(8, ex.CommittedBytes)
    Assert.Equal(100, ex.AttemptedBytes)
    Assert.Equal<byte>(Array.sub payload 0 8, ifs.ReadAllBytes("/torn"))

[<Fact>]
let ``InMemoryFileSystem crash-mid-write is one-shot and the same arm replays`` () =
    let run () =
        let fs = InMemoryFileSystem()
        let ifs = fs :> IFileSystem
        fs.ArmCrashMidWrite("/torn", 8)
        let payload = Array.init 100 (fun i -> byte (i + 3))
        let stream = ifs.OpenWrite("/torn", false)
        stream.Write(payload, 0, payload.Length)
        Assert.Throws<CrashMidWriteException>(fun () -> stream.Dispose()) |> ignore
        let torn = ifs.ReadAllBytes("/torn")
        let stream2 = ifs.OpenWrite("/torn-full", false)
        stream2.Write(payload, 0, payload.Length)
        stream2.Dispose()
        torn, ifs.ReadAllBytes("/torn-full")

    let tornA, fullA = run ()
    let tornB, fullB = run ()
    Assert.Equal(8, tornA.Length)
    Assert.Equal<byte>(tornA, tornB)
    Assert.Equal(100, fullA.Length)
    Assert.Equal<byte>(fullA, fullB)

[<Fact>]
let ``InMemoryFileSystem corrupt-last-write flips a suffix and still acks`` () =
    let fs = InMemoryFileSystem()
    let ifs = fs :> IFileSystem
    fs.ArmCorruptLastWrite("/corrupt", 8)
    let payload = Array.init 100 (fun i -> byte i)
    let stream = ifs.OpenWrite("/corrupt", false)
    stream.Write(payload, 0, payload.Length)
    stream.Dispose()
    let got = ifs.ReadAllBytes("/corrupt")
    Assert.Equal(100, got.Length)
    Assert.Equal(payload.[0], got.[0])
    Assert.Equal(payload.[91], got.[91])
    Assert.Equal(payload.[92] ^^^ 0xA5uy, got.[92])
    Assert.Equal(payload.[99] ^^^ 0xA5uy, got.[99])

[<Fact>]
let ``InMemoryFileSystem corrupt-last-write is one-shot and the same arm replays`` () =
    let run () =
        let fs = InMemoryFileSystem()
        let ifs = fs :> IFileSystem
        fs.ArmCorruptLastWrite("/corrupt", 8)
        let payload = Array.init 100 (fun i -> byte (i + 3))
        let stream = ifs.OpenWrite("/corrupt", false)
        stream.Write(payload, 0, payload.Length)
        stream.Dispose()
        let flipped = ifs.ReadAllBytes("/corrupt")
        let stream2 = ifs.OpenWrite("/corrupt-full", false)
        stream2.Write(payload, 0, payload.Length)
        stream2.Dispose()
        flipped, ifs.ReadAllBytes("/corrupt-full")

    let a, fullA = run ()
    let b, fullB = run ()
    Assert.Equal<byte>(a, b)
    Assert.Equal<byte>(fullA, fullB)
    Assert.Equal(fullA.[99], byte (99 + 3))
    Assert.Equal(a.[99], byte (99 + 3) ^^^ 0xA5uy)

[<Fact>]
let ``InMemoryFileSystem reorder holds the first write until the second commits`` () =
    let fs = InMemoryFileSystem()
    let ifs = fs :> IFileSystem
    fs.ArmReorderNextTwo("/pair")
    let aBytes = [| 1uy; 2uy |]
    let bBytes = [| 3uy; 4uy |]
    let streamA = ifs.OpenWrite("/pair/a", false)
    streamA.Write(aBytes, 0, aBytes.Length)
    streamA.Dispose()
    Assert.False(ifs.Exists "/pair/a")
    Assert.Equal(0, fs.CommitOrder.Length)
    let streamB = ifs.OpenWrite("/pair/b", false)
    streamB.Write(bBytes, 0, bBytes.Length)
    streamB.Dispose()
    Assert.True(ifs.Exists "/pair/a")
    Assert.True(ifs.Exists "/pair/b")
    Assert.Equal<byte>(aBytes, ifs.ReadAllBytes "/pair/a")
    Assert.Equal<byte>(bBytes, ifs.ReadAllBytes "/pair/b")
    Assert.Equal<string>([| "/pair/b"; "/pair/a" |], fs.CommitOrder)

[<Fact>]
let ``InMemoryFileSystem reorder is one-shot and the same arm replays`` () =
    let run () =
        let fs = InMemoryFileSystem()
        let ifs = fs :> IFileSystem
        fs.ArmReorderNextTwo("/pair")
        let sa = ifs.OpenWrite("/pair/a", false)
        sa.Write([| 1uy |], 0, 1)
        sa.Dispose()
        let sb = ifs.OpenWrite("/pair/b", false)
        sb.Write([| 2uy |], 0, 1)
        sb.Dispose()
        let sc = ifs.OpenWrite("/pair/c", false)
        sc.Write([| 3uy |], 0, 1)
        sc.Dispose()
        fs.CommitOrder

    let expected = [| "/pair/b"; "/pair/a"; "/pair/c" |]
    Assert.Equal<string>(expected, run ())
    Assert.Equal<string>(expected, run ())

[<Fact>]
let ``FileSystemBlockIo reads back a block written through IFileSystem`` () =
    let mock = InMemoryFileSystem() :> IFileSystem
    let io = FileSystemBlockIo(mock, "/vol/blocks", 4096) :> IBlockIo
    Assert.Equal(4096, io.BlockSize)
    let payload = [| 1uy; 2uy; 3uy; 4uy |]
    Assert.Equal(4, io.Write(0UL, System.ReadOnlyMemory<byte>.op_Implicit payload))
    io.Flush()
    let dst = Array.zeroCreate<byte> 4
    Assert.Equal(4, io.Read(0UL, System.Memory<byte>.op_Implicit dst))
    Assert.Equal<byte>(payload, dst)

[<Fact>]
let ``FileSystemBlockIo crash-mid-write tears the LBA and keeps the previous one`` () =
    let mock = InMemoryFileSystem()
    let path = "/vol/lba-crash"
    let io = FileSystemBlockIo(mock, path, 4096) :> IBlockIo
    let first = Array.create 4096 1uy
    let second = Array.create 4096 2uy
    Assert.Equal(4096, io.Write(0UL, System.ReadOnlyMemory<byte>.op_Implicit first))
    mock.ArmCrashMidWrite(path, 8)
    let ex =
        Assert.Throws<CrashMidWriteException>(fun () ->
            io.Write(1UL, System.ReadOnlyMemory<byte>.op_Implicit second)
            |> ignore)

    Assert.Equal(8, ex.CommittedBytes)
    Assert.Equal(4096, ex.AttemptedBytes)
    let got0 = Array.zeroCreate<byte> 4096
    Assert.Equal(4096, io.Read(0UL, System.Memory<byte>.op_Implicit got0))
    Assert.Equal<byte>(first, got0)
    let got1 = Array.zeroCreate<byte> 4096
    Assert.Equal(8, io.Read(1UL, System.Memory<byte>.op_Implicit got1))
    Assert.Equal<byte>(Array.sub second 0 8, Array.sub got1 0 8)

[<Fact>]
let ``FileSystemBlockIo corrupt-last-write flips the new LBA and keeps the previous one`` () =
    let mock = InMemoryFileSystem()
    let path = "/vol/lba-corrupt"
    let io = FileSystemBlockIo(mock, path, 4096) :> IBlockIo
    let first = Array.create 4096 1uy
    let second = Array.init 4096 (fun i -> byte (i % 250))
    Assert.Equal(4096, io.Write(0UL, System.ReadOnlyMemory<byte>.op_Implicit first))
    mock.ArmCorruptLastWrite(path, 8)
    Assert.Equal(4096, io.Write(1UL, System.ReadOnlyMemory<byte>.op_Implicit second))
    let got0 = Array.zeroCreate<byte> 4096
    Assert.Equal(4096, io.Read(0UL, System.Memory<byte>.op_Implicit got0))
    Assert.Equal<byte>(first, got0)
    let got1 = Array.zeroCreate<byte> 4096
    Assert.Equal(4096, io.Read(1UL, System.Memory<byte>.op_Implicit got1))
    Assert.Equal(second.[0], got1.[0])
    Assert.Equal(second.[4087], got1.[4087])
    Assert.Equal(second.[4088] ^^^ 0xA5uy, got1.[4088])
    Assert.Equal(second.[4095] ^^^ 0xA5uy, got1.[4095])

[<Fact>]
let ``SimulatedBlockIo reads back a write without IFileSystem`` () =
    let io = SimulatedBlockIo(4096) :> IBlockIo
    Assert.Equal(4096, io.BlockSize)
    let payload = [| 1uy; 2uy; 3uy; 4uy |]
    Assert.Equal(4, io.Write(0UL, System.ReadOnlyMemory<byte>.op_Implicit payload))
    io.Flush()
    let dst = Array.zeroCreate<byte> 4
    Assert.Equal(4, io.Read(0UL, System.Memory<byte>.op_Implicit dst))
    Assert.Equal<byte>(payload, dst)

[<Fact>]
let ``SimulatedBlockIo crash-mid-write commits a prefix then throws`` () =
    let device = SimulatedBlockIo(4096)
    let io = device :> IBlockIo
    device.ArmCrashMidWrite(8)
    let payload = Array.init 100 (fun i -> byte i)
    let ex =
        Assert.Throws<CrashMidWriteException>(fun () ->
            io.Write(0UL, System.ReadOnlyMemory<byte>.op_Implicit payload)
            |> ignore)

    Assert.Equal(8, ex.CommittedBytes)
    Assert.Equal(100, ex.AttemptedBytes)
    Assert.Equal(1, device.Writes)
    let dst = Array.zeroCreate<byte> 100
    Assert.Equal(100, io.Read(0UL, System.Memory<byte>.op_Implicit dst))
    Assert.Equal<byte>(Array.sub payload 0 8, Array.sub dst 0 8)
    Assert.Equal(0uy, dst.[8])
    let whole = Array.init 16 (fun i -> byte (200 + i))
    Assert.Equal(16, io.Write(1UL, System.ReadOnlyMemory<byte>.op_Implicit whole))
    let got = Array.zeroCreate<byte> 16
    Assert.Equal(16, io.Read(1UL, System.Memory<byte>.op_Implicit got))
    Assert.Equal<byte>(whole, got)

[<Fact>]
let ``SimulatedBlockIo corrupt-last-write flips a suffix and still acks`` () =
    let device = SimulatedBlockIo(4096)
    let io = device :> IBlockIo
    device.ArmCorruptLastWrite(8)
    let payload = Array.init 100 (fun i -> byte i)
    Assert.Equal(100, io.Write(0UL, System.ReadOnlyMemory<byte>.op_Implicit payload))
    let got = Array.zeroCreate<byte> 100
    Assert.Equal(100, io.Read(0UL, System.Memory<byte>.op_Implicit got))
    Assert.Equal(payload.[0], got.[0])
    Assert.Equal(payload.[91], got.[91])
    Assert.Equal(payload.[92] ^^^ 0xA5uy, got.[92])
    Assert.Equal(payload.[99] ^^^ 0xA5uy, got.[99])

[<Fact>]
let ``SimulatedBlockIo reorder holds the first write until the second commits`` () =
    let device = SimulatedBlockIo(4096)
    let io = device :> IBlockIo
    device.ArmReorderNextTwo()
    let a = [| 1uy; 2uy |]
    let b = [| 3uy; 4uy |]
    Assert.Equal(2, io.Write(0UL, System.ReadOnlyMemory<byte>.op_Implicit a))
    let unseen = Array.zeroCreate<byte> 2
    Assert.Equal(2, io.Read(0UL, System.Memory<byte>.op_Implicit unseen))
    Assert.Equal(0uy, unseen.[0])
    Assert.Equal(0uy, unseen.[1])
    Assert.Equal(2, io.Write(1UL, System.ReadOnlyMemory<byte>.op_Implicit b))
    let gotA = Array.zeroCreate<byte> 2
    let gotB = Array.zeroCreate<byte> 2
    Assert.Equal(2, io.Read(0UL, System.Memory<byte>.op_Implicit gotA))
    Assert.Equal(2, io.Read(1UL, System.Memory<byte>.op_Implicit gotB))
    Assert.Equal<byte>(a, gotA)
    Assert.Equal<byte>(b, gotB)
    Assert.Equal<uint64>([| 1UL; 0UL |], device.CommitOrder)

[<Fact>]
let ``BlockSuper log dual slot keeps previous logical after crash-mid-write`` () =
    let device = SimulatedBlockIo(4096)
    let io = device :> IBlockIo
    Assert.Equal(8192L, BlockLog.origin io)
    BlockSuper.writeLog io 100L

    match BlockSuper.tryReadLog io with
    | Some n -> Assert.Equal(100L, n)
    | None -> Assert.Fail("expected logical 100")

    device.ArmCrashMidWrite(8)
    let ex =
        Assert.Throws<CrashMidWriteException>(fun () -> BlockSuper.writeLog io 200L)

    Assert.Equal(8, ex.CommittedBytes)
    let cloned = device.CloneMedia() :> IBlockIo

    match BlockSuper.tryReadLog cloned with
    | Some n -> Assert.Equal(100L, n)
    | None -> Assert.Fail("torn new slot must not hide the previous generation")

[<Fact>]
let ``BlockSuper log dual slot keeps previous logical after corrupt-last-write`` () =
    let device = SimulatedBlockIo(4096)
    let io = device :> IBlockIo
    BlockSuper.writeLog io 100L
    device.ArmCorruptLastWrite(8)
    BlockSuper.writeLog io 200L

    match BlockSuper.tryReadLog io with
    | Some n -> Assert.Equal(100L, n)
    | None -> Assert.Fail("corrupt new slot must not hide the previous generation")

[<Fact>]
let ``BlockSuper log crash on the first slot recovers empty`` () =
    let device = SimulatedBlockIo(4096)
    let io = device :> IBlockIo
    device.ArmCrashMidWrite(8)
    Assert.Throws<CrashMidWriteException>(fun () -> BlockSuper.writeLog io 100L)
    |> ignore

    match BlockSuper.tryReadLog io with
    | Some _ -> Assert.Fail("torn first slot must not parse")
    | None -> ()

[<Fact>]
let ``BlockSuper CAS dual slot keeps previous index after crash-mid-write`` () =
    let device = SimulatedBlockIo(4096)
    let io = device :> IBlockIo
    BlockSuper.writeCas io [| "aa", 8192L, 3 |]

    match BlockSuper.tryReadCas io with
    | Some entries ->
        Assert.Equal(1, entries.Length)

        match entries.[0] with
        | key, _, _ -> Assert.Equal("aa", key)
    | None -> Assert.Fail("expected one CAS entry")

    device.ArmCrashMidWrite(8)

    Assert.Throws<CrashMidWriteException>(fun () ->
        BlockSuper.writeCas io [| "aa", 8192L, 3; "bb", 8195L, 1 |])
    |> ignore

    let cloned = device.CloneMedia() :> IBlockIo

    match BlockSuper.tryReadCas cloned with
    | Some entries ->
        Assert.Equal(1, entries.Length)

        match entries.[0] with
        | key, _, _ -> Assert.Equal("aa", key)
    | None -> Assert.Fail("torn new CAS slot must not hide the previous generation")
