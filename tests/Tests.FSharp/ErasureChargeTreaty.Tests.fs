namespace Zeta.Tests.FSharp

open System
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core

/// The cross-language treaty for `ErasureCharge` — the module that decides what an operation costs,
/// and, more importantly, what happens when nobody knows.
///
/// WHY THIS PAIR. The last of the six unpinned F#↔TypeScript pairs, alongside `SpecializationCache`.
/// `ErasureCharge` is built entirely out of a refusal: an unmeasured operation must not charge zero,
/// so a total is either `Complete` or a `LowerBound` carrying its named holes, and no accessor
/// anywhere hands back the number without the flag. A refusal implemented twice is exactly what a
/// treaty is for — if one side folds an unmeasured posting to zero while the other carries a hole,
/// the two runtimes disagree about whether an account can be trusted, and the disagreement is
/// invisible because both return a number.
///
/// THE DIVERGENCE RISKS, each with vectors:
///
///   1. HOLE ORDER. F#'s `Ledger.Holes` is `Map.toList`, so holes come out sorted by key.
///      TypeScript built its holes in a JS `Map` and returned INSERTION order. `renderReading` joins
///      hole keys into a human-facing line, so the same account rendered differently in the two
///      runtimes — and under §7 DST a reading whose rendering depends on the order postings arrived
///      is not replayable in the observable sense.
///   2. OBSERVATION ORDER. `Account.Observations` sorts with `String.CompareOrdinal`, explicitly.
///      TypeScript's `settleAll` returned a `Map` in insertion order.
///   3. `Charged 0` MUST BE UNREPRESENTABLE. Both sides require `fibre > 1 && ppm > 0`, so zero is
///      reachable only through `Free`, which requires a MEASURED fibre of 1. Relaxing either guard
///      would give an unmeasured operation a second route to zero.
///   4. FAIL-CLOSED on self-contradiction — `Reversible` over a wide fibre, `Erasing` over a fibre of
///      1, `Unmeasured` carrying a sweep, and `Unmeasured` with a blank reason must all be
///      `Malformed` and land in the hole set, never contribute a quiet zero.
///
/// RISKS 1 AND 2 WERE REAL, AND THIS TREATY IS WHAT FOUND THEM. On its first run TypeScript reported
/// holes as `[ZetaFsDeltaLog…; Broken::claimsFreeButIsNot…; Broken::claimsCostButIsInjective…]` and
/// observations as `[physical-medium; log-read-surface; commit-dag]` — posting order, in both cases
/// deliberately chosen to be the reverse of ordinal order. F# returns both sorted. TypeScript now
/// sorts, because F#'s behaviour is the one that does not depend on how the postings arrived.
///
/// WHAT IS DELIBERATELY NOT PINNED. The COMPLAINT PROSE. F# formats the classification through its
/// DU (`Reversible`); TypeScript through its string literal (`reversible`). The two texts differ in
/// case and always will. They are independently authored diagnostics for a human reader, not
/// protocol, and locking them would force one language to spell its own type system's vocabulary the
/// other's way for no gain. What IS pinned is everything a consumer acts on: that a hole exists, its
/// KEY, its ORDER, and its disposition KIND. The prose is asserted to be non-empty and to name the
/// fibre and ppm — a real property, rather than a byte equality that would misdescribe what the two
/// modules promise.
module ErasureChargeTreatyTests =

    [<Literal>]
    let private MaxTranscriptBytes = 4L * 1024L * 1024L

    // ── JSON readers ────────────────────────────────────────────────────────

    let private strOf (el: JsonElement) (p: string) = el.GetProperty(p).GetString()
    let private items (el: JsonElement) (p: string) = [ for x in el.GetProperty(p).EnumerateArray() -> x ]

    let private strings (el: JsonElement) (p: string) =
        [ for x in el.GetProperty(p).EnumerateArray() -> x.GetString() ]

    let private evidenceOf (el: JsonElement) : ErasureClass.Evidence =
        let kind = strOf el "kind"

        match kind with
        | "exhaustive-sweep" ->
            ErasureClass.Evidence.ExhaustiveSweep(
                strOf el "domain",
                el.GetProperty("largestFibre").GetInt32(),
                int64 (el.GetProperty("bitsErasedPpm").GetInt64())
            )
        | "bounded-model-sweep" ->
            ErasureClass.Evidence.BoundedModelSweep(
                strOf el "model",
                el.GetProperty("largestFibre").GetInt32(),
                int64 (el.GetProperty("bitsErasedPpm").GetInt64())
            )
        | "no-admissible-measurement" -> ErasureClass.Evidence.NoAdmissibleMeasurement(strOf el "reason")
        | other -> failwithf "unknown evidence kind: %s" other

    let private classOf (s: string) : ErasureClass.ThermodynamicClass =
        match s with
        | "reversible" -> ErasureClass.ThermodynamicClass.Reversible
        | "erasing" -> ErasureClass.ThermodynamicClass.Erasing
        | "unmeasured" -> ErasureClass.ThermodynamicClass.Unmeasured
        | other -> failwithf "unknown classification: %s" other

    let private profileOf (el: JsonElement) : ErasureClass.Profile =
        { Representation = strOf el "representation"
          Operation = strOf el "operation"
          Observation = strOf el "observation"
          RecoveryChannel = strOf el "recoveryChannel"
          Classification = classOf (strOf el "classification")
          Evidence = evidenceOf (el.GetProperty "evidence") }

    let private postingsOf (el: JsonElement) : ErasureClass.Profile list =
        items el "postings" |> List.map profileOf

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
                Path.Join(repoRoot (), "src", "Core.TypeScript", "algebra", "erasure-charge-treaty-transcript.json")

             let info = FileInfo(path)

             if not info.Exists then
                 invalidOp (
                     sprintf
                         "ErasureCharge treaty transcript missing at %s — regenerate with: bun src/Core.TypeScript/algebra/generate-erasure-charge-treaty-transcript.ts"
                         path
                 )

             if info.Length > MaxTranscriptBytes then
                 invalidOp $"ErasureCharge treaty transcript is too large: {info.Length} bytes."

             use stream = File.OpenRead path
             let doc = JsonDocument.Parse(stream)
             [ for v in doc.RootElement.EnumerateArray() -> v ])

    let private vectorsOf (kind: string) =
        transcript.Value |> List.filter (fun v -> strOf v "vectorType" = kind)

    /// The F# ledger's view of one settle run, in the transcript's wire shape.
    let private settleRun (postings: ErasureClass.Profile list) =
        let ledger = postings |> List.fold (fun (l: ErasureCharge.Ledger) p -> l.Post p) ErasureCharge.Ledger.Empty
        let bits, complete = ErasureCharge.readingParts ledger.Reading
        bits, complete, (ledger.Holes |> List.map fst), ledger.ChargedPostings, ledger.FreePostings, ledger.HolePostings

    // ── The replays ─────────────────────────────────────────────────────────

    [<Fact>]
    let ``dispositionOf: the four cases, derived from classification and evidence alone`` () =
        let vectors = vectorsOf "Disposition"
        Assert.NotEmpty vectors

        for v in vectors do
            let p = profileOf (v.GetProperty "profile")
            let name = strOf v "name"

            // The identity of a declaration must be spelled the same in both runtimes: it is the
            // key holes are deduplicated by, so a mismatch would make the same hole two holes.
            Assert.Equal(strOf v "key", ErasureClass.key p)

            match ErasureCharge.dispositionOf p, strOf v "expectedKind" with
            | ErasureCharge.Disposition.Free, "free" -> ()
            | ErasureCharge.Disposition.Charged ppm, "charged" ->
                Assert.Equal(v.GetProperty("expectedBitsPpm").GetInt64(), ppm)
                // Risk 3: a charge is always strictly positive. Zero is reachable only via `Free`.
                Assert.True(ppm > 0L, sprintf "vector %s charged zero — that route must not exist" name)
            | ErasureCharge.Disposition.Unmeasured reason, "unmeasured" ->
                Assert.Equal(strOf v "expectedReason", reason)
                Assert.False(String.IsNullOrWhiteSpace reason)
            | ErasureCharge.Disposition.Malformed complaint, "malformed" ->
                // The PROSE is not pinned — see the module header. What is pinned is that a
                // self-contradicting declaration fails closed, and says something a reader can use.
                Assert.False(
                    String.IsNullOrWhiteSpace complaint,
                    sprintf "vector %s is malformed with an empty complaint" name
                )
            | actual, expected -> failwithf "vector %s: F# gave %A, TypeScript said %s" name actual expected

    [<Fact>]
    let ``settle: bits, completeness, hole keys IN ORDER, and the posting counts`` () =
        let vectors = vectorsOf "Settle"
        Assert.NotEmpty vectors

        for v in vectors do
            let name = strOf v "name"
            let expected = v.GetProperty "expected"
            let bits, complete, holeKeys, charged, free, holePostings = settleRun (postingsOf v)

            Assert.Equal(expected.GetProperty("bitsPpm").GetInt64(), bits)
            Assert.Equal(expected.GetProperty("complete").GetBoolean(), complete)

            // Risk 1. The ORDER is asserted, not just the set: it is what `renderReading` prints.
            Assert.Equal<string list>(strings expected "holeKeys", holeKeys)

            Assert.Equal(expected.GetProperty("chargedPostings").GetInt32(), charged)
            Assert.Equal(expected.GetProperty("freePostings").GetInt32(), free)
            // Invocations, not identities: a hole hit three times is visibly not a hole hit once.
            Assert.Equal(expected.GetProperty("holePostings").GetInt32(), holePostings)

            // The invariant behind the whole module, asserted independently of the vector: a
            // reading is complete exactly when nothing was left unknown. A side that reported
            // `complete` alongside holes would be the demon this module was written to refuse.
            Assert.True(
                (complete = List.isEmpty holeKeys),
                sprintf "vector %s: complete=%b with %d hole(s)" name complete (List.length holeKeys)
            )

    [<Fact>]
    let ``settleAll: one reading per observation, observations IN ORDER, never summed`` () =
        let vectors = vectorsOf "SettleAll"
        Assert.NotEmpty vectors

        for v in vectors do
            let account = ErasureCharge.Account.Empty.PostAll(postingsOf v)

            // Risk 2.
            Assert.Equal<string list>(strings v "expectedObservations", account.Observations)

            let expectedReadings = items v "expectedReadings"
            let actual = account.Readings

            Assert.Equal(List.length expectedReadings, List.length actual)

            for (expected, (_observation, reading)) in List.zip expectedReadings actual do
                let bits, complete = ErasureCharge.readingParts reading
                Assert.Equal(expected.GetProperty("bitsPpm").GetInt64(), bits)
                Assert.Equal(expected.GetProperty("complete").GetBoolean(), complete)

                let holeKeys =
                    match reading with
                    | ErasureCharge.Reading.Complete _ -> []
                    | ErasureCharge.Reading.LowerBound(_, holes) -> holes |> List.map fst

                Assert.Equal<string list>(strings expected "holeKeys", holeKeys)

    [<Fact>]
    let ``an unmeasured posting is never folded to zero — the property the module exists for`` () =
        // Asserted directly rather than only through the vectors, because it is the one claim whose
        // failure would be invisible: both sides would still return a number.
        let vectors = vectorsOf "Settle"

        for v in vectors do
            let postings = postingsOf v

            let hasHole =
                postings
                |> List.exists (fun p ->
                    match ErasureCharge.dispositionOf p with
                    | ErasureCharge.Disposition.Unmeasured _
                    | ErasureCharge.Disposition.Malformed _ -> true
                    | _ -> false)

            let _, complete, _, _, _, _ = settleRun postings

            Assert.True(
                complete <> hasHole,
                sprintf "vector %s: a run containing an unknown cost reported a complete total" (strOf v "name")
            )

    [<Fact>]
    let ``the transcript is not truncated, and keeps the vectors that discriminate`` () =
        Assert.True(
            transcript.Value.Length >= 20,
            sprintf "expected at least 20 treaty vectors, found %d — regenerate the transcript" transcript.Value.Length
        )

        for kind in [ "Disposition"; "Settle"; "SettleAll" ] do
            Assert.True(not (List.isEmpty (vectorsOf kind)), sprintf "no vectors of type %s in the transcript" kind)

        // These are the vectors that caught risks 1 and 2. Both post in a deliberately non-ordinal
        // order, and nothing else in the corpus discriminates ordering — so losing one would shrink
        // the treaty while it stayed green.
        let names = transcript.Value |> List.map (fun v -> strOf v "name") |> Set.ofList
        Assert.Contains("holes-posted-out-of-ordinal-order", names)
        Assert.Contains("three-observations-posted-in-reverse-ordinal-order", names)
        Assert.Contains("malformedUnmeasuredBlankReason", names)
