namespace Zeta.Tests.FSharp

open System
open System.Collections.Generic
open System.IO
open System.Text.Json
open System.Threading
open Xunit
open Zeta.Core

/// Can the F# `DiskDeltaLog` replay a log the TypeScript one wrote?
///
/// WHY THE GOLDEN VECTORS DO NOT ALREADY ANSWER THIS.
/// `src/Core.TypeScript/delta-log-entry/golden-vectors.json` locks the FRAME — one entry's canonical
/// CBOR, byte-identical across four languages — and it passes. That is a codec treaty. It says
/// nothing about the DIRECTORY the frames live in: the filename and its padding, the exclusive
/// replay boundary, how a reopened log recovers its high-water mark. Two implementations can agree
/// on every byte of every frame and still be unable to read each other's LOG.
///
/// WHAT WAS ACTUALLY MISSING. F# ships four durable log backends; TypeScript shipped only
/// `InMemoryDeltaLog`. So `RecoverableSpine.recover` in TypeScript restored a snapshot and then
/// replayed a tail that had died with the process — recovery SUCCEEDED and came back short, which
/// is worse than a missing feature, because nothing reports it. `disk-delta-log.ts` is the missing
/// backend and it was written to F#'s on-disk format deliberately, so the two can read each other.
/// This test is the check on that claim.
///
/// WHY HEX-IN-JSON RATHER THAN A COMMITTED DIRECTORY. The frames are canonical CBOR, and
/// `.claude/rules/no-binary-in-proof-lineage.md` keeps binary out of the proof lineage — its
/// enforcer is scoped to `src/wasm-dla/bytelock/`, so a binary fixture here would be unaudited as
/// well as forbidden. The fixture records the bytes TypeScript's `append` produced, verbatim; this
/// test writes them back out under the same filenames and runs the REAL F# store over them. The
/// materialisation is transport, not re-encoding — nothing here constructs a frame.
module DeltaLogInteropTests =

    let private keyEnc (s: string) = DynamicValue.String s

    let private keyDec (dv: DynamicValue) =
        match dv with
        | DynamicValue.String s -> s
        | other -> failwithf "delta-log interop: key is not a string: %A" other

    let private repoRoot () =
        let mutable dir = DirectoryInfo(AppContext.BaseDirectory)

        while dir <> null && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
            dir <- dir.Parent

        if dir = null then
            invalidOp "could not locate the repo root (no Zeta.sln above the test binary)"

        dir.FullName

    let private fixturePath =
        Path.Join(repoRoot (), "src", "Core.TypeScript", "durability", "delta-log-interop-fixture.json")

    let private fromHex (hex: string) : byte[] =
        Assert.True(hex.Length % 2 = 0, sprintf "fixture hex has odd length: %d" hex.Length)
        Array.init (hex.Length / 2) (fun i -> Convert.ToByte(hex.Substring(i * 2, 2), 16))

    /// Write the recorded files into a fresh directory, exactly as TypeScript named them.
    let private materialise () =
        Assert.True(
            File.Exists fixturePath,
            sprintf
                "fixture missing at %s — regenerate with: bun src/Core.TypeScript/durability/generate-delta-log-interop-fixture.ts"
                fixturePath
        )

        let doc = JsonDocument.Parse(File.ReadAllText fixturePath)
        let files = [ for f in doc.RootElement.GetProperty("files").EnumerateArray() -> f ]

        Assert.True(
            not (List.isEmpty files),
            "the fixture carries no files — a crossing test over an empty directory would pass by asserting nothing"
        )

        let dir =
            Path.Join(Path.GetTempPath(), "zeta-delta-interop-" + Guid.NewGuid().ToString("N"))

        Directory.CreateDirectory dir |> ignore

        for f in files do
            let name = f.GetProperty("name").GetString()
            File.WriteAllBytes(Path.Join(dir, name), fromHex (f.GetProperty("hex").GetString()))

        dir, files.Length

    let private openLog (dir: string) =
        DiskDeltaLog<string>(dir, CborEntryCodec<string>(keyEnc, keyDec)) :> IDeltaLog<string>

    [<Fact>]
    let ``the F# store replays a log the TypeScript store wrote`` () =
        let dir, count = materialise ()

        try
            let log = openLog dir
            let entries = log.ReplayAsync(0L, CancellationToken.None).AsTask().GetAwaiter().GetResult()

            Assert.Equal(count, entries.Length)
            Assert.Equal<int64 list>([ 1L; 2L; 3L ], [ for e in entries -> e.Seq ])

            // Entry 1 — a multi-key delta carrying a RETRACTION. A codec that dropped the sign would
            // still round-trip its own bytes and would break right here.
            Assert.Equal<ZSet<string>>(ZSet.ofSeq [ "alpha", 2L; "beta", -1L ], entries.[0].Delta)
            Assert.Equal("1700000000", entries.[0].Captured.["clock"])
            Assert.Equal("4", entries.[0].Captured.["seed"])

            // Entry 2 — case-mixed keys. Ordinally this is A, B, a, b; under a locale collation it
            // would be a, A, b, B. The vector exists so that difference cannot hide.
            Assert.Equal<ZSet<string>>(ZSet.ofSeq [ "A", -3L; "B", 1L; "a", 1L; "b", 5L ], entries.[1].Delta)

            // Entry 3 — the degenerate frame: empty delta, empty captured. An encoder that writes
            // null instead of an empty container diverges precisely here.
            Assert.True(ZSet.isEmpty entries.[2].Delta)
            Assert.Empty entries.[2].Captured
        finally
            Directory.Delete(dir, true)

    [<Fact>]
    let ``a reopened log continues TypeScript's sequence instead of overwriting entry 1`` () =
        // The high-water mark is recovered from the FILENAMES, so this is the assertion that the two
        // implementations agree on naming and not merely on framing. If F# read a different sequence
        // out of TypeScript's names, its next append would silently overwrite a committed entry.
        let dir, count = materialise ()

        try
            let log = openLog dir
            Assert.Equal(int64 count, log.HighWater)

            let next =
                log
                    .AppendAsync(ZSet.ofSeq [ "written-by-fsharp", 1L ], Map.empty, CancellationToken.None)
                    .AsTask()
                    .GetAwaiter()
                    .GetResult()

            Assert.Equal(int64 count + 1L, next)

            // …and TypeScript's entries are all still there, alongside the new one.
            let after = log.ReplayAsync(0L, CancellationToken.None).AsTask().GetAwaiter().GetResult()
            Assert.Equal(count + 1, after.Length)
        finally
            Directory.Delete(dir, true)

    [<Fact>]
    let ``replay is EXCLUSIVE of the given sequence on both sides`` () =
        // An off-by-one here re-applies a delta that is already folded into the snapshot, or skips
        // one that is not. Neither raises an error; both produce a wrong state.
        let dir, count = materialise ()

        try
            let log = openLog dir
            let fromOne = log.ReplayAsync(1L, CancellationToken.None).AsTask().GetAwaiter().GetResult()
            Assert.Equal(count - 1, fromOne.Length)
            Assert.Equal(2L, fromOne.[0].Seq)

            let past = log.ReplayAsync(int64 count, CancellationToken.None).AsTask().GetAwaiter().GetResult()
            Assert.Empty past
        finally
            Directory.Delete(dir, true)
