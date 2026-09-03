namespace Zeta.Tests.FSharp

open System
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core

/// The cross-language treaty for the I/O boundary.
///
/// HOW THIS PAIR WAS FOUND. A sweep of the 535 F# modules against the 1411 TypeScript ones found 68
/// concepts implemented in BOTH languages; 62 were pinned by a treaty or golden vectors and six were
/// not — `ErasureCharge`, `IndexedZSet`, `IoBoundary`, `RecoverableSpine`, `SnapshotStore`,
/// `SpecializationCache`. An unpinned pair is two implementations of one idea with nothing checking
/// they agree.
///
/// WHY THIS ONE FIRST. `IoBoundary` is the §13 noninterference membrane: it decides what leaves the
/// interior. If the two sides disagreed, one of them would leak a fact the other retracted.
///
/// THE TWO REAL DIVERGENCE RISKS, both of which have vectors:
///
///   1. F# `IoBoundary.fuse` DELEGATES to `FusionReconstruction.fuse`; TypeScript REIMPLEMENTS the
///      positive-support filter inline. They agree today — and "agree today" has a shelf life.
///   2. ORDER. F# takes its ascending order from `'K : comparison`, which is ORDINAL for strings;
///      TypeScript takes an explicit `compare`. A `localeCompare` on the TS side would order
///      mixed-case keys differently. The string vectors are deliberately case-mixed so that
///      difference cannot hide: `[B;a;A;b]` fuses to `[A;B;a;b]` ordinally and to `[a;A;b;B]` under
///      a locale collation.
///
/// Same shape as `HatTreaty.Tests.fs` and `WorkflowEngine.Tests.fs`, deliberately — a second
/// convention for the same job would be its own kind of drift.
module IoBoundaryTreatyTests =

    [<Literal>]
    let private MaxTranscriptBytes = 4L * 1024L * 1024L

    // ── JSON readers ────────────────────────────────────────────────────────

    let private strOf (el: JsonElement) (p: string) = el.GetProperty(p).GetString()
    let private boolOf (el: JsonElement) (p: string) = el.GetProperty(p).GetBoolean()
    let private intOf (el: JsonElement) (p: string) = el.GetProperty(p).GetInt32()
    let private items (el: JsonElement) (p: string) = [ for x in el.GetProperty(p).EnumerateArray() -> x ]

    /// One (key, weight) pair from a ledger spec, as a STRING key.
    let private strEntry (el: JsonElement) : string * int64 =
        el.GetProperty("e").GetString(), int64 (el.GetProperty("w").GetInt32())

    let private intEntry (el: JsonElement) : int * int64 =
        el.GetProperty("e").GetInt32(), int64 (el.GetProperty("w").GetInt32())

    let private strLedger (el: JsonElement) (p: string) : ZSet<string> =
        items el p |> List.map strEntry |> ZSet.ofSeq

    let private intLedger (el: JsonElement) (p: string) : ZSet<int> =
        items el p |> List.map intEntry |> ZSet.ofSeq

    let private expectedStrings (el: JsonElement) (p: string) : string list =
        [ for x in el.GetProperty(p).EnumerateArray() -> x.GetString() ]

    let private expectedInts (el: JsonElement) (p: string) : int list =
        [ for x in el.GetProperty(p).EnumerateArray() -> x.GetInt32() ]

    // ── The transcript ──────────────────────────────────────────────────────

    let private repoRoot () =
        let mutable dir = DirectoryInfo(AppContext.BaseDirectory)

        while dir <> null && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
            dir <- dir.Parent

        if dir = null then
            invalidOp "could not locate the repo root (no Zeta.sln above the test binary)"

        dir.FullName

    let private transcript =
        lazy
            (let path =
                Path.Join(repoRoot (), "src", "Core.TypeScript", "io-boundary", "io-boundary-treaty-transcript.json")

             let info = FileInfo(path)

             if not info.Exists then
                 invalidOp (
                     sprintf
                         "I/O boundary treaty transcript missing at %s — regenerate with: bun src/Core.TypeScript/io-boundary/generate-io-boundary-treaty-transcript.ts"
                         path
                 )

             if info.Length > MaxTranscriptBytes then
                 invalidOp $"I/O boundary treaty transcript is too large: {info.Length} bytes."

             use stream = File.OpenRead path
             let doc = JsonDocument.Parse(stream)
             [ for v in doc.RootElement.EnumerateArray() -> v ])

    let private vectorsOf (kind: string) =
        transcript.Value |> List.filter (fun v -> strOf v "vectorType" = kind)

    // ── The replays ─────────────────────────────────────────────────────────

    [<Fact>]
    let ``fuse: positive support crosses the boundary and nothing else does`` () =
        let vectors = vectorsOf "Fuse"
        Assert.NotEmpty vectors

        for v in vectors do
            if boolOf v "numeric" then
                let outside = intLedger v "ledger" |> IoBoundary.input |> IoBoundary.fuse
                Assert.Equal<int list>(expectedInts v "expectedExterior", IoBoundary.toList outside)
                Assert.Equal(intOf v "expectedCount", IoBoundary.count outside)
                Assert.Equal(boolOf v "expectedIsEmpty", IoBoundary.isEmpty outside)
            else
                let outside = strLedger v "ledger" |> IoBoundary.input |> IoBoundary.fuse
                Assert.Equal<string list>(expectedStrings v "expectedExterior", IoBoundary.toList outside)
                Assert.Equal(intOf v "expectedCount", IoBoundary.count outside)
                Assert.Equal(boolOf v "expectedIsEmpty", IoBoundary.isEmpty outside)

    [<Fact>]
    let ``compose then fuse: signed evidence cancels INSIDE, before observation`` () =
        let vectors = vectorsOf "ComposeThenFuse"
        Assert.NotEmpty vectors

        for v in vectors do
            let left = strLedger v "left" |> IoBoundary.input
            let right = strLedger v "right" |> IoBoundary.input
            let outside = IoBoundary.compose left right |> IoBoundary.fuse
            Assert.Equal<string list>(expectedStrings v "expectedExterior", IoBoundary.toList outside)

    [<Fact>]
    let ``composeAll then fuse`` () =
        let vectors = vectorsOf "ComposeAllThenFuse"
        Assert.NotEmpty vectors

        for v in vectors do
            let insides =
                [ for l in v.GetProperty("ledgers").EnumerateArray() ->
                      [ for e in l.EnumerateArray() -> strEntry e ] |> ZSet.ofSeq |> IoBoundary.input ]

            let outside = IoBoundary.composeAll insides |> IoBoundary.fuse
            Assert.Equal<string list>(expectedStrings v "expectedExterior", IoBoundary.toList outside)

    [<Fact>]
    let ``contains: membership is asked of the EXTERIOR view`` () =
        let vectors = vectorsOf "Contains"
        Assert.NotEmpty vectors

        for v in vectors do
            let outside = strLedger v "ledger" |> IoBoundary.input |> IoBoundary.fuse
            Assert.Equal(boolOf v "expected", IoBoundary.contains (strOf v "key") outside)

    [<Fact>]
    let ``emit and retract cancel before observation — the boundary's stated purpose`` () =
        let vectors = vectorsOf "EmitRetractThenFuse"
        Assert.NotEmpty vectors

        for v in vectors do
            let insides =
                [ for o in v.GetProperty("ops").EnumerateArray() ->
                      let key = o.GetProperty("key").GetString()

                      match o.GetProperty("op").GetString() with
                      | "emit" -> IoBoundary.emit key
                      | "retract" -> IoBoundary.retract key
                      | other -> failwithf "unknown op: %s" other ]

            let outside = IoBoundary.composeAll insides |> IoBoundary.fuse
            Assert.Equal<string list>(expectedStrings v "expectedExterior", IoBoundary.toList outside)

    [<Fact>]
    let ``the transcript is not truncated`` () =
        // A generated transcript that lost most of its vectors must not pass as a green treaty.
        // The count is asserted low-water rather than exact so adding vectors is not a chore.
        Assert.True(
            transcript.Value.Length >= 50,
            sprintf "expected at least 50 treaty vectors, found %d — regenerate the transcript" transcript.Value.Length
        )

        for kind in [ "Fuse"; "ComposeThenFuse"; "ComposeAllThenFuse"; "Contains"; "EmitRetractThenFuse" ] do
            Assert.True(not (List.isEmpty (vectorsOf kind)), sprintf "no vectors of type %s in the transcript" kind)

    [<Fact>]
    let ``the case-mixed vector is present, so an ordinal-vs-locale sort cannot hide`` () =
        // This is the vector that catches a `localeCompare` on the TypeScript side: ordinally
        // [B;a;A;b] fuses to [A;B;a;b], while a locale collation gives [a;A;b;B]. Asserting the
        // vector EXISTS keeps someone from quietly deleting the one case that discriminates.
        let hasCaseMixed =
            vectorsOf "Fuse"
            |> List.exists (fun v ->
                let keys = [ for e in v.GetProperty("ledger").EnumerateArray() -> e.GetProperty("e").ToString() ]
                List.contains "\"A\"" keys || List.contains "A" keys)

        Assert.True(hasCaseMixed, "the treaty lost its case-mixed vector — the ordinal collation is no longer pinned")
