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
