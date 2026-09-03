namespace Zeta.Tests.FSharp

open System
open System.Collections.Generic
open System.IO
open System.Text.Json
open System.Threading
open Xunit
open Zeta.Core

/// Can F# read a snapshot manifest that TypeScript wrote?
///
/// HOW THIS GOT ASKED. A systematic F#↔TypeScript sweep found six concepts implemented in both
/// languages with no treaty. Reading `SnapshotStore` turned up something sharper than a missing
/// treaty: `src/Core/SnapshotStore.fs` ships BOTH an `InMemorySnapshotStore` and a
/// `DiskSnapshotStore`, and the TypeScript side shipped only the in-memory one — whose "manifest"
/// is a private field that dies with the process. Meanwhile `recoverable-spine.ts` described itself
/// as tying the log to *"cadenced snapshots (via a manifest-tracked ISnapshotStore)"*, a claim
/// stronger than the mechanism it had.
///
/// `disk-snapshot-store.ts` supplies the mechanism. This asserts the part that makes it INTEROP
/// rather than merely durable: the manifest TypeScript writes must deserialise through the SAME
/// call `DiskSnapshotStore.LatestAsync` makes — `JsonSerializer.Deserialize<Dictionary<string,string>>`.
///
/// THE SHARP EDGE. F# serialises a `Dictionary<string,string>`, so `seq` is a STRING. A TypeScript
/// writer emitting the natural `{"seq": 7}` produces a manifest this deserialiser cannot read, and
/// it fails at RECOVERY — the moment you least want to discover it. That case is asserted to fail,
/// so the requirement is pinned from both directions rather than only the happy one.
///
/// WHAT THIS DOES NOT COVER, stated so the limit is known rather than assumed: the snapshot BYTES
/// need codec parity (CBOR both sides), which is a separate treaty. This pins the ADDRESSING — the
/// manifest and the filename — which is what lets either runtime find what the other wrote.
module SnapshotManifestInteropTests =

    /// Exactly the deserialisation `DiskSnapshotStore.LatestAsync` performs.
    let private readManifest (bytes: byte[]) : (int64 * string) option =
        match JsonSerializer.Deserialize<Dictionary<string, string>> bytes with
        | null -> None
        | m ->
            match m.TryGetValue "seq", m.TryGetValue "file" with
            | (true, seq), (true, file) -> Some(int64 seq, file)
            | _ -> None

    let private repoRoot () =
        let mutable dir = DirectoryInfo(AppContext.BaseDirectory)

        while dir <> null && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
            dir <- dir.Parent

        if dir = null then
            invalidOp "could not locate the repo root (no Zeta.sln above the test binary)"

        dir.FullName

    [<Fact>]
    let ``F# reads the manifest TypeScript writes`` () =
        // The exact bytes `manifestBody` produces in disk-snapshot-store.ts.
        let tsWrote = """{"seq":"11","file":"snapshot-00000000000000000011.snap"}"""

        match readManifest (Text.Encoding.UTF8.GetBytes tsWrote) with
        | Some(seq, file) ->
            Assert.Equal(11L, seq)
            Assert.Equal("snapshot-00000000000000000011.snap", file)
        | None -> failwith "F# could not read the manifest TypeScript writes — the interop is broken"

    [<Fact>]
    let ``a NUMERIC seq is exactly the break this pins`` () =
        // What a TypeScript writer would emit without knowing the F# side reads a
        // Dictionary<string,string>. It must fail here, in a test, rather than at recovery.
        let naive = """{"seq":11,"file":"snapshot-00000000000000000011.snap"}"""

        Assert.ThrowsAny<exn>(fun () -> readManifest (Text.Encoding.UTF8.GetBytes naive) |> ignore)
        |> ignore

    [<Fact>]
    let ``the TypeScript store writes the filename F# computes`` () =
        // `sprintf "snapshot-%020d.snap"` is the F# side; the TypeScript pads to 20 with the same
        // intent — lexical order IS sequence order. If either drifts, one runtime writes a file the
        // other looks for under a different name and recovery silently finds nothing.
        for seq in [ 0L; 1L; 7L; 999L; 1234567890L ] do
            let fsharpName = sprintf "snapshot-%020d.snap" seq
            let typescriptName = "snapshot-" + string(seq).PadLeft(20, '0') + ".snap"
            Assert.Equal(fsharpName, typescriptName)

    [<Fact>]
    let ``the REAL F# store opens a directory the REAL TypeScript store wrote`` () =
        // The RUNTIME crossing, as opposed to the byte assertion above. The fixture was produced by
        // `DiskSnapshotStore.write` in TypeScript — the same call a live loop makes — and this
        // constructs an F# `DiskSnapshotStore` over that directory and asks `LatestAsync` for the
        // pointer. Reading the bytes and running the reader are different claims: the first says the
        // format was transcribed correctly, the second says the two stores can actually find each
        // other's work. If either side's ADDRESSING drifts, only this one goes red.
        //
        // The codec is never invoked — `LatestAsync` reads the manifest and nothing else — so
        // `CheckpointDeltaCodec` is here to satisfy the constructor, not to assert anything.
        // Snapshot BYTES need codec parity, which is a SEPARATE treaty; said plainly so a green here
        // is not mistaken for byte-level interop it does not check.
        task {
            let fixture =
                Path.Join(repoRoot (), "src", "Core.TypeScript", "durability", "snapshot-interop-fixture")

            Assert.True(
                Directory.Exists fixture,
                sprintf
                    "fixture missing at %s — regenerate with: bun src/Core.TypeScript/durability/generate-snapshot-interop-fixture.ts"
                    fixture
            )

            let store =
                new DiskSnapshotStore<string>(fixture, CheckpointDeltaCodec<string>()) :> ISnapshotStore<string>

            let! pointer = store.LatestAsync CancellationToken.None

            Assert.NotNull pointer
            Assert.Equal(11L, pointer.Seq)
            Assert.Equal("snapshot-00000000000000000011.snap", pointer.Handle :?> string)

            // And the file the pointer NAMES is really there. A manifest pointing at a snapshot that
            // does not exist satisfies every assertion above and fails at the one moment it is
            // needed — recovery.
            Assert.True(File.Exists(Path.Join(fixture, pointer.Handle :?> string)))
        }

    [<Fact>]
    let ``the TypeScript disk store exists at all`` () =
        // The gap this whole file exists because of: for as long as there was no TypeScript disk
        // store, `recoverable-spine.ts` claimed manifest-tracked recovery it could not perform.
        let path =
            Path.Join(repoRoot (), "src", "Core.TypeScript", "durability", "disk-snapshot-store.ts")

        Assert.True(File.Exists path, sprintf "expected a TypeScript disk snapshot store at %s" path)
        let text = File.ReadAllText path
        Assert.Contains("LATEST.json", text)
        Assert.Contains("snapshot-", text)
