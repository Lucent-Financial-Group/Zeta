module Zeta.Tests.ZetaFsFreezeTests

open System
open System.IO
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
    // OwnBlake3Hasher.cctor installs ContentHash256.ofBytes. `ignore hasher`
    // is incidental and Release may elide it (jumprope tests, #16229).
    System.Runtime.CompilerServices.RuntimeHelpers.RunClassConstructor(typeof<OwnBlake3Hasher>.TypeHandle)

let private tempStore () =
    let path = Path.Combine(Path.GetTempPath(), sprintf "zetafs-freeze-%s" (Guid.NewGuid().ToString("N")))
    Directory.CreateDirectory path |> ignore
    path

[<Fact>]
let ``Journaled freeze ContentId matches the mutbuf snapshot, not a later pwrite`` () =
    ensureHasher ()
    FileSystem.Register(InMemoryFileSystem())

    try
        let id = mintId ()
        let mutbuf = ZetaFsMutbuf.create "/freeze-mem" ZetaFsMutbuf.Coherence.Shared
        let h = ZetaFsMutbuf.openHandle mutbuf id
        ZetaFsMutbuf.pwrite mutbuf h 0L [| 1uy; 2uy; 3uy |] |> ignore
        let volume = ZetaFsFreeze.create "/freeze-mem" mutbuf None

        match ZetaFsFreeze.freeze volume id ZetaFsFreeze.Journaled with
        | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
        | Ok first ->
            ZetaFsMutbuf.pwrite mutbuf h 0L [| 9uy; 9uy; 9uy |] |> ignore
            match ZetaFsFreeze.freeze volume id ZetaFsFreeze.Journaled with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok second ->
                Assert.NotEqual<string>(first.Content.ToHex(), second.Content.ToHex())
                Assert.Equal(0UL, first.Generation)
                Assert.Equal(1UL, second.Generation)
                Assert.True(ZetaFsFreeze.isReadable volume first.Content)
                Assert.True(ZetaFsFreeze.isReadable volume second.Content)
    finally
        FileSystem.Reset()

[<Fact>]
let ``Buffered freeze is not POSIX-readable (no freeze-commit)`` () =
    ensureHasher ()
    FileSystem.Register(InMemoryFileSystem())

    try
        let id = mintId ()
        let mutbuf = ZetaFsMutbuf.create "/freeze-buf" ZetaFsMutbuf.Coherence.Shared
        let h = ZetaFsMutbuf.openHandle mutbuf id
        ZetaFsMutbuf.pwrite mutbuf h 0L [| 7uy |] |> ignore
        let volume = ZetaFsFreeze.create "/freeze-buf" mutbuf None

        match ZetaFsFreeze.freeze volume id ZetaFsFreeze.Buffered with
        | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
        | Ok r ->
            Assert.False(ZetaFsFreeze.isReadable volume r.Content)
            Assert.Equal(0L, r.CommitLsn)
    finally
        FileSystem.Reset()

[<Fact>]
let ``Durable freeze on a real directory fsyncs and is readable`` () =
    ensureHasher ()
    let store = tempStore ()

    try
        let id = mintId ()
        let mutbuf = ZetaFsMutbuf.create store ZetaFsMutbuf.Coherence.Shared
        let h = ZetaFsMutbuf.openHandle mutbuf id
        ZetaFsMutbuf.pwrite mutbuf h 0L (Array.init 4096 (fun i -> byte i)) |> ignore
        let volume = ZetaFsFreeze.create store mutbuf None

        match ZetaFsFreeze.freeze volume id ZetaFsFreeze.Durable with
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
    finally
        Directory.Delete(store, true)

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
let ``observer OnJournaled fires for Journaled and not for Buffered`` () =
    ensureHasher ()
    FileSystem.Register(InMemoryFileSystem())

    try
        let recb = Rec()
        let id = mintId ()
        let mutbuf = ZetaFsMutbuf.create "/freeze-obs" ZetaFsMutbuf.Coherence.Shared
        let h = ZetaFsMutbuf.openHandle mutbuf id
        ZetaFsMutbuf.pwrite mutbuf h 0L [| 1uy |] |> ignore
        let volume = ZetaFsFreeze.create "/freeze-obs" mutbuf (Some(recb :> ZetaFsFreeze.IDurabilityObserver))
        ZetaFsFreeze.freeze volume id ZetaFsFreeze.Buffered |> ignore
        Assert.Equal(0, recb.Journaled)
        ZetaFsFreeze.freeze volume id ZetaFsFreeze.Journaled |> ignore
        Assert.Equal(1, recb.Journaled)
        Assert.Equal(0, recb.Durable)
    finally
        FileSystem.Reset()

[<Fact>]
let ``sealed log does not leave freeze-intent ASCII in the clear`` () =
    ensureHasher ()
    FileSystem.Register(InMemoryFileSystem())

    try
        let id = mintId ()
        let mutbuf = ZetaFsMutbuf.create "/freeze-enc" ZetaFsMutbuf.Coherence.Shared
        let h = ZetaFsMutbuf.openHandle mutbuf id
        ZetaFsMutbuf.pwrite mutbuf h 0L [| 1uy; 2uy |] |> ignore
        let vault = Array.init 32 (fun i -> byte i)

        match ZetaFsCrypto.sessionFromVaultKey 1u vault with
        | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
        | Ok session ->
            let volume = ZetaFsFreeze.createWith "/freeze-enc" mutbuf None (Some session)

            match ZetaFsFreeze.freeze volume id ZetaFsFreeze.Journaled with
            | Error e -> Assert.Fail(ZetaFsFreeze.errorName e)
            | Ok r ->
                Assert.True(ZetaFsFreeze.isReadable volume r.Content)
                // BUILD THE PATH THE WAY PRODUCTION DOES. This line was the literal
                // "/freeze-enc/log/freeze", while `ZetaFsFreeze.logPath` composes it with
                // `Path.Combine` -- which yields "/freeze-enc\\log\\freeze" on Windows.
                // `InMemoryFileSystem` keys on the exact string, so the read missed and the
                // test failed with FileNotFoundException on windows-11-arm ONLY.
                //
                // MEASURED: windows-11-arm was green on the seven gate runs before 7c6eae0e
                // and red on it. The job is `continue-on-error` for windows/macos, so the
                // break was advisory and merged without blocking -- which is how a
                // platform-specific defect gets in. A test that hardcodes a separator is
                // asserting about ONE platform while claiming to assert about the code.
                let logBytes = FileSystem.Current.ReadAllBytes(Path.Combine("/freeze-enc", "log", "freeze"))
                let needle = Text.Encoding.UTF8.GetBytes "freeze-intent/1"
                Assert.Equal(-1, MemoryExtensions.IndexOf(ReadOnlySpan<byte> logBytes, ReadOnlySpan<byte> needle))
    finally
        FileSystem.Reset()
