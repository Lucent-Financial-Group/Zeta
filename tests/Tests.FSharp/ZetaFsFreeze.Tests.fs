module Zeta.Tests.ZetaFsFreezeTests

open System
open System.IO
open System.Threading
open System.Threading.Tasks
open global.Xunit
open Zeta.Core
open Zeta.Core.FSharp.Blake3

let private rng () =
    let e = Environment.createVirtual 17L :> Zeta.Core.ISimulationEnvironment
    ZetaFsNamespace.Entropy(fun () -> e.NextInt64())

let private mintId () =
    let entropy = rng ()
    let ns = ZetaFsNamespace.create entropy
    let id, _ = ZetaFsNamespace.mint ns ZetaFsNamespace.EntityKind.File entropy
    id

let private ensureHasher () =
    System.Runtime.CompilerServices.RuntimeHelpers.RunClassConstructor(typeof<OwnBlake3Hasher>.TypeHandle)

let private tempStore () =
    let path = Path.Combine(Path.GetTempPath(), sprintf "zetafs-freeze-%s" (Guid.NewGuid().ToString("N")))
    Directory.CreateDirectory path |> ignore
    path

let private freezeAsync (volume: ZetaFsFreeze.Volume) id cls =
    ZetaFsFreeze.freezeAsync volume id cls CancellationToken.None

[<Fact>]
let ``Journaled freeze ContentId matches the mutbuf snapshot, not a later pwrite`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let volume = ZetaFsFreeze.create "/freeze-mem" (ZetaFsMutbuf.create "/freeze-mem" ZetaFsMutbuf.Coherence.Shared) None

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let! first = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask().ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 9uy; 9uy; 9uy |] |> ignore
                let! second = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask().ConfigureAwait(false)

                match second with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok second ->
                    Assert.NotEqual<string>(first.Content.ToHex(), second.Content.ToHex())
                    Assert.Equal(0UL, first.Generation)
                    Assert.Equal(1UL, second.Generation)
                    Assert.True(ZetaFsFreeze.isReadable volume first.Content)
                    Assert.True(ZetaFsFreeze.isReadable volume second.Content)
        finally
            ZetaFsFreeze.dispose volume
            FileSystem.Reset()
    }

[<Fact>]
let ``Buffered freeze is not POSIX-readable (no freeze-commit)`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let volume = ZetaFsFreeze.create "/freeze-buf" (ZetaFsMutbuf.create "/freeze-buf" ZetaFsMutbuf.Coherence.Shared) None

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 7uy |] |> ignore
            let! r = (freezeAsync volume id ZetaFsFreeze.Buffered).AsTask().ConfigureAwait(false)

            match r with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok r ->
                Assert.False(ZetaFsFreeze.isReadable volume r.Content)
                Assert.Equal(0L, r.CommitLsn)
                Assert.Equal(0, ZetaFsFreeze.logBoatCount volume)
        finally
            ZetaFsFreeze.dispose volume
            FileSystem.Reset()
    }

[<Fact>]
let ``Durable freeze on a real directory fsyncs and is readable`` () : Task =
    task {
        ensureHasher ()
        let store = tempStore ()
        let volume = ZetaFsFreeze.create store (ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared) None

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L (Array.init 4096 (fun i -> byte i)) |> ignore
            let! r = (freezeAsync volume id ZetaFsFreeze.Durable).AsTask().ConfigureAwait(false)

            match r with
            | Error e ->
                if OperatingSystem.IsWindows() then
                    Assert.Equal("WindowsDurableNotClaimed", ZetaFsFreeze.errorName e)
                else
                    Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok r ->
                Assert.False(OperatingSystem.IsWindows())
                Assert.True(ZetaFsFreeze.isReadable volume r.Content)
                Assert.True(r.CommitLsn > 0L)
                Assert.True(File.Exists(Path.Combine(store, "log", "freeze")))
                Assert.True(ZetaFsFreeze.logBoatCount volume >= 1)
        finally
            ZetaFsFreeze.dispose volume
            Directory.Delete(store, true)
    }

type private Rec () =
    member val Journaled = 0 with get, set
    member val Durable = 0 with get, set

    interface ZetaFsFreeze.IDurabilityObserver with
        member this.OnJournaled _ =
            this.Journaled <- this.Journaled + 1
            Ok()

        member this.OnDurable _ =
            this.Durable <- this.Durable + 1
            Ok()

[<Fact>]
let ``observer OnJournaled fires for Journaled and not for Buffered`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let recb = Rec()
        let volume =
            ZetaFsFreeze.create "/freeze-obs" (ZetaFsMutbuf.create "/freeze-obs" ZetaFsMutbuf.Coherence.Shared) (Some(recb :> ZetaFsFreeze.IDurabilityObserver))

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy |] |> ignore
            let! _ = (freezeAsync volume id ZetaFsFreeze.Buffered).AsTask().ConfigureAwait(false)
            Assert.Equal(0, recb.Journaled)
            let! _ = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask().ConfigureAwait(false)
            Assert.Equal(1, recb.Journaled)
            Assert.Equal(0, recb.Durable)
        finally
            ZetaFsFreeze.dispose volume
            FileSystem.Reset()
    }

[<Fact>]
let ``sealed log does not leave freeze-intent ASCII in the clear`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let mutbuf = ZetaFsMutbuf.create "/freeze-enc" ZetaFsMutbuf.Coherence.Shared
        let vault = Array.init 32 (fun i -> byte i)
        let mutable volume: ZetaFsFreeze.Volume option = None

        try
            match ZetaFsCrypto.sessionFromVaultKey 1u vault with
            | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
            | Ok session ->
                let v = ZetaFsFreeze.createWith "/freeze-enc" mutbuf None (Some session)
                volume <- Some v
                let id = mintId ()
                let h = ZetaFsMutbuf.openHandle mutbuf id
                ZetaFsMutbuf.pwrite mutbuf h 0L [| 1uy; 2uy |] |> ignore
                let! r = (freezeAsync v id ZetaFsFreeze.Journaled).AsTask().ConfigureAwait(false)

                match r with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok r ->
                    Assert.True(ZetaFsFreeze.isReadable v r.Content)
                    let logBytes = FileSystem.Current.ReadAllBytes(Path.Combine("/freeze-enc", "log", "freeze"))
                    let needle = Text.Encoding.UTF8.GetBytes "freeze-intent/1"
                    Assert.Equal(-1, MemoryExtensions.IndexOf(ReadOnlySpan<byte> logBytes, ReadOnlySpan<byte> needle))
        finally
            match volume with
            | Some v -> ZetaFsFreeze.dispose v
            | None -> ()
            FileSystem.Reset()
    }

[<Fact>]
let ``a fresh volume replays a sealed Journaled freeze from the log`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-sealed-replay"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let vault = Array.init 32 (fun i -> byte i)
        let mutable volume: ZetaFsFreeze.Volume option = None

        try
            match ZetaFsCrypto.sessionFromVaultKey 1u vault with
            | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
            | Ok session ->
                let v = ZetaFsFreeze.createManualWith store mutbuf None (Some session)
                volume <- Some v
                let id = mintId ()
                let h = ZetaFsMutbuf.openHandle mutbuf id
                ZetaFsMutbuf.pwrite mutbuf h 0L [| 1uy; 2uy |] |> ignore
                let pending = (freezeAsync v id ZetaFsFreeze.Journaled).AsTask()
                do! (ZetaFsFreeze.pumpLog v CancellationToken.None).ConfigureAwait(false)
                let! first = pending.ConfigureAwait(false)

                match first with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok first ->
                    ZetaFsFreeze.dispose v
                    volume <- None
                    let reopened = ZetaFsFreeze.createManualWith store mutbuf None (Some session)

                    try
                        Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                    finally
                        ZetaFsFreeze.dispose reopened
        finally
            match volume with
            | Some v -> ZetaFsFreeze.dispose v
            | None -> ()
            FileSystem.Reset()
    }

[<Fact>]
let ``sealed replay with the wrong vault key recovers nothing and leaves the log`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-sealed-wrong-key"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let vault = Array.init 32 (fun i -> byte i)
        let other = Array.init 32 (fun i -> byte (i + 1))
        let mutable volume: ZetaFsFreeze.Volume option = None

        try
            match ZetaFsCrypto.sessionFromVaultKey 1u vault, ZetaFsCrypto.sessionFromVaultKey 1u other with
            | Error e, _ -> Assert.Fail(ZetaFsCrypto.errorName e)
            | _, Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
            | Ok session, Ok otherSession ->
                let v = ZetaFsFreeze.createManualWith store mutbuf None (Some session)
                volume <- Some v
                let id = mintId ()
                let h = ZetaFsMutbuf.openHandle mutbuf id
                ZetaFsMutbuf.pwrite mutbuf h 0L [| 9uy |] |> ignore
                let pending = (freezeAsync v id ZetaFsFreeze.Journaled).AsTask()
                do! (ZetaFsFreeze.pumpLog v CancellationToken.None).ConfigureAwait(false)
                let! first = pending.ConfigureAwait(false)

                match first with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok first ->
                    let logPath = Path.Combine(store, "log", "freeze")
                    let before = FileSystem.Current.ReadAllBytes logPath
                    ZetaFsFreeze.dispose v
                    volume <- None
                    let reopened = ZetaFsFreeze.createManualWith store mutbuf None (Some otherSession)

                    try
                        Assert.False(ZetaFsFreeze.isReadable reopened first.Content)
                        let after = FileSystem.Current.ReadAllBytes logPath
                        Assert.True((after.Length = before.Length))
                    finally
                        ZetaFsFreeze.dispose reopened
        finally
            match volume with
            | Some v -> ZetaFsFreeze.dispose v
            | None -> ()
            FileSystem.Reset()
    }

[<Fact>]
let ``cancelled token before admit does not start a log boat`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let volume =
            ZetaFsFreeze.createManual "/freeze-cancel" (ZetaFsMutbuf.create "/freeze-cancel" ZetaFsMutbuf.Coherence.Shared) None

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy |] |> ignore
            use cts = new CancellationTokenSource()
            cts.Cancel()
            let t = (ZetaFsFreeze.freezeAsync volume id ZetaFsFreeze.Journaled cts.Token).AsTask()
            Assert.True(t.IsCompleted)
            Assert.True(t.IsCanceled)
            Assert.Equal(0, ZetaFsFreeze.logBoatCount volume)
        finally
            ZetaFsFreeze.dispose volume
            FileSystem.Reset()
    }

[<Fact>]
let ``manual pump packs N journaled freezes into one log boat`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let volume =
            ZetaFsFreeze.createManual "/freeze-boat" (ZetaFsMutbuf.create "/freeze-boat" ZetaFsMutbuf.Coherence.Shared) None

        try
            let pending = ResizeArray<Task<Result<ZetaFsFreeze.FreezeResult, ZetaFsFreeze.FreezeError>>>(16)

            for i in 1 .. 16 do
                let id = mintId ()
                let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
                ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| byte i |] |> ignore
                pending.Add((freezeAsync volume id ZetaFsFreeze.Journaled).AsTask())

            Assert.Equal(0, ZetaFsFreeze.logBoatCount volume)
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            Assert.Equal(1, ZetaFsFreeze.logBoatCount volume)
            Assert.Equal(16, ZetaFsFreeze.logLastBoatSize volume)

            for t in pending do
                let! r = t.ConfigureAwait(false)

                match r with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok ok -> Assert.True(ZetaFsFreeze.isReadable volume ok.Content)
        finally
            ZetaFsFreeze.dispose volume
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze crash-mid-write leaves a torn log and does not finish`` () : Task =
    task {
        ensureHasher ()
        let mock = InMemoryFileSystem()
        let logNeedle = Path.Combine("log", "freeze")
        mock.ArmCrashMidWrite(logNeedle, 8)
        FileSystem.Register(mock)
        let store = "/crash-mid-freeze"
        let volume =
            ZetaFsFreeze.createManual store (ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared) None

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! ex =
                Assert
                    .ThrowsAsync<CrashMidWriteException>(fun () -> pending :> Task)
                    .ConfigureAwait(false)

            Assert.Equal(8, ex.CommittedBytes)
            Assert.Equal(1, ZetaFsFreeze.logBoatCount volume)
            let logPath = Path.Combine(store, "log", "freeze")
            Assert.True(FileSystem.Current.Exists logPath)
            Assert.Equal(8, FileSystem.Current.ReadAllBytes(logPath).Length)
        finally
            ZetaFsFreeze.dispose volume
            FileSystem.Reset()
    }

[<Fact>]
let ``a fresh volume replays an intact Journaled freeze from the log`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-replay"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let volume = ZetaFsFreeze.createManual store mutbuf None

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                ZetaFsFreeze.dispose volume
                let reopened = ZetaFsFreeze.createManual store mutbuf None

                try
                    Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                finally
                    ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``reopen after a torn second freeze keeps the first and drops the tail`` () : Task =
    task {
        ensureHasher ()
        let mock = InMemoryFileSystem()
        FileSystem.Register(mock)
        let store = "/freeze-replay-torn"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let volume = ZetaFsFreeze.createManual store mutbuf None
        let logNeedle = Path.Combine("log", "freeze")
        let logPath = Path.Combine(store, "log", "freeze")

        try
            let id1 = mintId ()
            let h1 = ZetaFsMutbuf.openHandle volume.Mutbuf id1
            ZetaFsMutbuf.pwrite volume.Mutbuf h1 0L [| 1uy |] |> ignore
            let pending1 = (freezeAsync volume id1 ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending1.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                let intactBytes = FileSystem.Current.ReadAllBytes logPath
                mock.ArmCrashMidWrite(logNeedle, intactBytes.Length + 8)
                let id2 = mintId ()
                let h2 = ZetaFsMutbuf.openHandle volume.Mutbuf id2
                ZetaFsMutbuf.pwrite volume.Mutbuf h2 0L [| 2uy |] |> ignore
                let pending2 = (freezeAsync volume id2 ZetaFsFreeze.Journaled).AsTask()
                do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
                let! _ =
                    Assert
                        .ThrowsAsync<CrashMidWriteException>(fun () -> pending2 :> Task)
                        .ConfigureAwait(false)

                let tornLen = FileSystem.Current.ReadAllBytes(logPath).Length
                Assert.True(tornLen > intactBytes.Length)
                ZetaFsFreeze.dispose volume
                let reopened = ZetaFsFreeze.createManual store mutbuf None

                try
                    Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                    let recoveredLen = FileSystem.Current.ReadAllBytes(logPath).Length
                    Assert.True(recoveredLen < tornLen)
                    Assert.True((recoveredLen = intactBytes.Length))
                finally
                    ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze that acks with a corrupt last write is not readable after reopen`` () : Task =
    task {
        ensureHasher ()
        let mock = InMemoryFileSystem()
        let logNeedle = Path.Combine("log", "freeze")
        mock.ArmCorruptLastWrite(logNeedle, 8)
        FileSystem.Register(mock)
        let store = "/corrupt-last-freeze"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let volume = ZetaFsFreeze.createManual store mutbuf None

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                Assert.True(ZetaFsFreeze.isReadable volume first.Content)
                ZetaFsFreeze.dispose volume
                let reopened = ZetaFsFreeze.createManual store mutbuf None

                try
                    Assert.False(ZetaFsFreeze.isReadable reopened first.Content)
                finally
                    ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze crash during leaf put leaves extra garbage and is not readable`` () : Task =
    task {
        ensureHasher ()
        let mock = InMemoryFileSystem()
        mock.ArmCrashMidWrite("objects", 0)
        FileSystem.Register(mock)
        let store = "/crash-intent-leaves"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let volume = ZetaFsFreeze.createManual store mutbuf None
        let logPath = Path.Combine(store, "log", "freeze")

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! _ =
                Assert
                    .ThrowsAsync<CrashMidWriteException>(fun () -> pending :> Task)
                    .ConfigureAwait(false)

            Assert.Equal(1, ZetaFsFreeze.logBoatCount volume)
            Assert.True(FileSystem.Current.Exists logPath)
            let intentLen = FileSystem.Current.ReadAllBytes(logPath).Length
            Assert.True(intentLen > 0)
            Assert.Equal(logPath, mock.CommitOrder.[0])
            ZetaFsFreeze.dispose volume
            let reopened = ZetaFsFreeze.createManual store mutbuf None

            try
                let recoveredLen = FileSystem.Current.ReadAllBytes(logPath).Length
                Assert.True(recoveredLen < intentLen)
                Assert.Equal(0, recoveredLen)
            finally
                ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``reopen after a mid-log CRC mismatch keeps the prefix and drops the suffix`` () : Task =
    task {
        ensureHasher ()
        let mock = InMemoryFileSystem()
        FileSystem.Register(mock)
        let store = "/freeze-mid-crc"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let volume = ZetaFsFreeze.createManual store mutbuf None
        let logPath = Path.Combine(store, "log", "freeze")

        try
            let id1 = mintId ()
            let h1 = ZetaFsMutbuf.openHandle volume.Mutbuf id1
            ZetaFsMutbuf.pwrite volume.Mutbuf h1 0L [| 1uy |] |> ignore
            let pending1 = (freezeAsync volume id1 ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending1.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                let prefixLen = FileSystem.Current.ReadAllBytes(logPath).Length
                let id2 = mintId ()
                let h2 = ZetaFsMutbuf.openHandle volume.Mutbuf id2
                ZetaFsMutbuf.pwrite volume.Mutbuf h2 0L [| 2uy |] |> ignore
                let pending2 = (freezeAsync volume id2 ZetaFsFreeze.Journaled).AsTask()
                do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
                let! second = pending2.ConfigureAwait(false)

                match second with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok second ->
                    Assert.True(ZetaFsFreeze.isReadable volume first.Content)
                    Assert.True(ZetaFsFreeze.isReadable volume second.Content)
                    let full = mock.Files.[logPath]
                    Assert.True(full.Length > prefixLen + 8)
                    let flipped = Array.copy full
                    flipped.[prefixLen + 4] <- flipped.[prefixLen + 4] ^^^ 0xA5uy
                    mock.Files.[logPath] <- flipped
                    ZetaFsFreeze.dispose volume
                    let reopened = ZetaFsFreeze.createManual store mutbuf None

                    try
                        Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                        Assert.False(ZetaFsFreeze.isReadable reopened second.Content)
                        let recovered = FileSystem.Current.ReadAllBytes logPath
                        Assert.True(recovered.Length < flipped.Length)
                        Assert.True(recovered.Length > 8)
                        Assert.True((recovered.Length = prefixLen))
                    finally
                        ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``reopen after a mid-log sealed MAC mismatch keeps the prefix and drops the suffix`` () : Task =
    task {
        ensureHasher ()
        let mock = InMemoryFileSystem()
        FileSystem.Register(mock)
        let store = "/freeze-mid-mac"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let vault = Array.init 32 (fun i -> byte i)
        let mutable volume: ZetaFsFreeze.Volume option = None
        let logPath = Path.Combine(store, "log", "freeze")

        try
            match ZetaFsCrypto.sessionFromVaultKey 1u vault with
            | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
            | Ok session ->
                let v = ZetaFsFreeze.createManualWith store mutbuf None (Some session)
                volume <- Some v
                let id1 = mintId ()
                let h1 = ZetaFsMutbuf.openHandle mutbuf id1
                ZetaFsMutbuf.pwrite mutbuf h1 0L [| 1uy |] |> ignore
                let pending1 = (freezeAsync v id1 ZetaFsFreeze.Journaled).AsTask()
                do! (ZetaFsFreeze.pumpLog v CancellationToken.None).ConfigureAwait(false)
                let! first = pending1.ConfigureAwait(false)

                match first with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok first ->
                    let prefixLen = FileSystem.Current.ReadAllBytes(logPath).Length
                    let id2 = mintId ()
                    let h2 = ZetaFsMutbuf.openHandle mutbuf id2
                    ZetaFsMutbuf.pwrite mutbuf h2 0L [| 2uy |] |> ignore
                    let pending2 = (freezeAsync v id2 ZetaFsFreeze.Journaled).AsTask()
                    do! (ZetaFsFreeze.pumpLog v CancellationToken.None).ConfigureAwait(false)
                    let! second = pending2.ConfigureAwait(false)

                    match second with
                    | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                    | Ok second ->
                        let full = mock.Files.[logPath]
                        Assert.True(full.Length > prefixLen + 12)
                        let flipped = Array.copy full
                        flipped.[prefixLen + 12] <- flipped.[prefixLen + 12] ^^^ 0xA5uy
                        mock.Files.[logPath] <- flipped
                        ZetaFsFreeze.dispose v
                        volume <- None
                        let reopened = ZetaFsFreeze.createManualWith store mutbuf None (Some session)

                        try
                            Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                            Assert.False(ZetaFsFreeze.isReadable reopened second.Content)
                            let recovered = FileSystem.Current.ReadAllBytes logPath
                            Assert.True(recovered.Length < flipped.Length)
                            Assert.True(recovered.Length > 12)
                            Assert.True((recovered.Length = prefixLen))
                        finally
                            ZetaFsFreeze.dispose reopened
        finally
            match volume with
            | Some v -> ZetaFsFreeze.dispose v
            | None -> ()
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze through SimulatedBlockIo is readable after reopen`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-blocks"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let blocks = SimulatedBlockIo(4096)
        let volume = ZetaFsFreeze.createManualWithBlocks store mutbuf None blocks

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                Assert.True(ZetaFsFreeze.isReadable volume first.Content)
                Assert.True(blocks.LogicalBytes > 0L)
                ZetaFsFreeze.dispose volume
                let reopened = ZetaFsFreeze.createManualWithBlocks store mutbuf None blocks

                try
                    Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                finally
                    ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze crash-mid-write on IBlockIo does not finish`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-blocks-crash"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let blocks = SimulatedBlockIo(4096)
        blocks.ArmCrashMidWrite(8)
        let volume = ZetaFsFreeze.createManualWithBlocks store mutbuf None blocks

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! _ =
                Assert
                    .ThrowsAsync<CrashMidWriteException>(fun () -> pending :> Task)
                    .ConfigureAwait(false)

            Assert.Equal(1, ZetaFsFreeze.logBoatCount volume)
            ZetaFsFreeze.dispose volume
            let reopened = ZetaFsFreeze.createManualWithBlocks store mutbuf None blocks

            try
                Assert.Equal(0L, blocks.LogicalBytes)
            finally
                ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze CAS objects on IBlockIo are readable and not POSIX files`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-cas-blocks"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let logDev = SimulatedBlockIo(4096)
        let objDev = SimulatedBlockIo(4096)
        let cas = BlockCas(objDev)
        let volume = ZetaFsFreeze.createManualWithBlockStore store mutbuf None logDev cas

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                Assert.True(ZetaFsFreeze.isReadable volume first.Content)
                Assert.True(cas.Count > 0)
                Assert.Equal(0, FileSystem.Current.GetFiles(Path.Combine(store, "objects"), "*").Length)
                ZetaFsFreeze.dispose volume
                let reopened = ZetaFsFreeze.createManualWithBlockStore store mutbuf None logDev cas

                try
                    Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                finally
                    ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze crash during block CAS put drops the trailing intent`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-cas-crash"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let logDev = SimulatedBlockIo(4096)
        let objDev = SimulatedBlockIo(4096)
        objDev.ArmCrashMidWrite(8)
        let cas = BlockCas(objDev)
        let volume = ZetaFsFreeze.createManualWithBlockStore store mutbuf None logDev cas

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! _ =
                Assert
                    .ThrowsAsync<CrashMidWriteException>(fun () -> pending :> Task)
                    .ConfigureAwait(false)

            Assert.Equal(1, ZetaFsFreeze.logBoatCount volume)
            Assert.True(logDev.LogicalBytes > 0L)
            Assert.Equal(0, cas.Count)
            ZetaFsFreeze.dispose volume
            let reopened = ZetaFsFreeze.createManualWithBlockStore store mutbuf None logDev cas

            try
                Assert.Equal(0L, logDev.LogicalBytes)
                Assert.Equal(0, cas.Count)
            finally
                ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze log superblock reopens from cloned media without LogicalBytes`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-super-log"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let blocks = SimulatedBlockIo(4096)
        let volume = ZetaFsFreeze.createManualWithBlocks store mutbuf None blocks

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                ZetaFsFreeze.dispose volume
                let cloned = blocks.CloneMedia()
                Assert.Equal(0L, cloned.LogicalBytes)
                let reopened = ZetaFsFreeze.createManualWithBlocks store mutbuf None cloned

                try
                    Assert.True(cloned.LogicalBytes > 0L)
                    Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                finally
                    ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Journaled freeze CAS superblock reopens from cloned media without the in-memory index`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-super-cas"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let logDev = SimulatedBlockIo(4096)
        let objDev = SimulatedBlockIo(4096)
        let cas = BlockCas(objDev)
        let volume = ZetaFsFreeze.createManualWithBlockStore store mutbuf None logDev cas

        try
            let id = mintId ()
            let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
            ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
            let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
            do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
            let! first = pending.ConfigureAwait(false)

            match first with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok first ->
                Assert.True(cas.Count > 0)
                ZetaFsFreeze.dispose volume
                let logClone = logDev.CloneMedia()
                let objClone = objDev.CloneMedia()
                let cas2 = BlockCas(objClone)
                Assert.True(cas2.Count > 0)
                Assert.Equal(0L, logClone.LogicalBytes)
                let reopened = ZetaFsFreeze.createManualWithBlockStore store mutbuf None logClone cas2

                try
                    Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                finally
                    ZetaFsFreeze.dispose reopened
        finally
            FileSystem.Reset()
    }

[<Fact>]
let ``Sealed journaled freeze through SimulatedBlockIo is readable after CloneMedia`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-sealed-blocks"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let vault = Array.init 32 (fun i -> byte i)
        let blocks = SimulatedBlockIo(4096)

        match ZetaFsCrypto.sessionFromVaultKey 1u vault with
        | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
        | Ok session ->
            let volume = ZetaFsFreeze.createManualWithSealedBlocks store mutbuf None session blocks

            try
                let id = mintId ()
                let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
                ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 1uy; 2uy |] |> ignore
                let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
                do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
                let! first = pending.ConfigureAwait(false)

                match first with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok first ->
                    let device = blocks :> IBlockIo
                    let logBytes = BlockLog.readAt device (BlockLog.origin device) blocks.LogicalBytes
                    let needle = Text.Encoding.UTF8.GetBytes "freeze-intent/1"
                    Assert.Equal(-1, MemoryExtensions.IndexOf(ReadOnlySpan<byte> logBytes, ReadOnlySpan<byte> needle))
                    ZetaFsFreeze.dispose volume
                    let cloned = blocks.CloneMedia()
                    let reopened =
                        ZetaFsFreeze.createManualWithSealedBlocks store mutbuf None session cloned

                    try
                        Assert.True(ZetaFsFreeze.isReadable reopened first.Content)
                    finally
                        ZetaFsFreeze.dispose reopened
            finally
                FileSystem.Reset()
    }

[<Fact>]
let ``Sealed block replay with the wrong vault key recovers nothing and does not truncate`` () : Task =
    task {
        ensureHasher ()
        FileSystem.Register(InMemoryFileSystem())
        let store = "/freeze-sealed-blocks-wrong-key"
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let vault = Array.init 32 (fun i -> byte i)
        let other = Array.init 32 (fun i -> byte (i + 1))
        let blocks = SimulatedBlockIo(4096)

        match ZetaFsCrypto.sessionFromVaultKey 1u vault, ZetaFsCrypto.sessionFromVaultKey 1u other with
        | Error e, _ -> Assert.Fail(ZetaFsCrypto.errorName e)
        | _, Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
        | Ok session, Ok otherSession ->
            let volume = ZetaFsFreeze.createManualWithSealedBlocks store mutbuf None session blocks

            try
                let id = mintId ()
                let h = ZetaFsMutbuf.openHandle volume.Mutbuf id
                ZetaFsMutbuf.pwrite volume.Mutbuf h 0L [| 9uy |] |> ignore
                let pending = (freezeAsync volume id ZetaFsFreeze.Journaled).AsTask()
                do! (ZetaFsFreeze.pumpLog volume CancellationToken.None).ConfigureAwait(false)
                let! first = pending.ConfigureAwait(false)

                match first with
                | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
                | Ok first ->
                    let before = blocks.LogicalBytes
                    ZetaFsFreeze.dispose volume
                    let cloned = blocks.CloneMedia()
                    Assert.Equal(0L, cloned.LogicalBytes)
                    let reopened =
                        ZetaFsFreeze.createManualWithSealedBlocks store mutbuf None otherSession cloned

                    try
                        Assert.False(ZetaFsFreeze.isReadable reopened first.Content)
                        Assert.True((cloned.LogicalBytes = before))
                    finally
                        ZetaFsFreeze.dispose reopened
            finally
                FileSystem.Reset()
    }
