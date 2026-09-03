namespace Zeta.Tests.FSharp

open System
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core

/// The cross-language treaty for `IndexedZSet` — the DBSP core.
///
/// WHY THIS PAIR. The F#↔TypeScript sweep found six concepts implemented in both languages with
/// nothing checking they agree. `IoBoundary`, `SnapshotStore` and `RecoverableSpine` are pinned;
/// this is the largest surface left (380 F# lines against 329 TypeScript) and it is the indexed
/// relation every incremental join runs through. A divergence here is a divergence in the query
/// engine, not in a peripheral.
///
/// FOUR REAL DIVERGENCE RISKS, each with vectors:
///
///   1. The two sides are not merely different code, they are different DATA STRUCTURES. F# carries
///      an `ImmutableArray` of groups PLUS a `PatriciaTree` trie (built only for integral keys);
///      TypeScript carries a plain sorted array. Two representations of one idea is exactly the
///      shape that agrees until it does not.
///   2. Grouping equality differs in KIND. F# buckets with `Dictionary<'K,int>` under
///      `EqualityComparer<'K>.Default`; TypeScript uses a JS `Map`, which is SameValueZero. Both
///      then ORDER by a comparator. For the ordinal string keys here they agree — a fact about the
///      keys chosen, not about the code, so it is stated rather than assumed.
///   3. COLLATION. F# takes key order from `'K : comparison`, ordinal for strings; TypeScript takes
///      an explicit `compare`. The vectors are case-mixed, because `[B; a; A; b]` orders as
///      `A, B, a, b` ordinally and `a, A, b, B` under a locale collation.
///   4. The EMPTY-GROUP invariant. A key whose values cancel to zero must DISAPPEAR, not survive as
///      a group holding an empty Z-set. If one side keeps it, `keyCount` and `isEmpty` disagree
///      while every value in the structure is still identical — which reads as a counting bug long
///      before anyone suspects the index.
///
/// WHAT IS DELIBERATELY NOT COVERED. `join` multiplies weights: F# uses `Checked.(*)` on `int64` and
/// THROWS on overflow, TypeScript uses a JS number and silently loses precision above 2^53. There is
/// no vector for that, because there is no agreeing answer to lock — one throws and the other lies.
/// Every vector stays far inside both ranges, and the cliff is named rather than left untested-looking.
///
/// Same shape as `IoBoundaryTreaty.Tests.fs` and `HatTreaty.Tests.fs`, deliberately.
module IndexedZSetTreatyTests =

    [<Literal>]
    let private MaxTranscriptBytes = 4L * 1024L * 1024L

    /// The separator the TypeScript side used to join a (key, value) pair into one string. F# returns
    /// `ZSet<'K * 'V>` from `toZSet` while TypeScript takes a `combine`, so the treaty pins the pairs
    /// and their ORDER rather than the signature. No vector key or value contains a `|`, which is
    /// what keeps the joined-string order equal to tuple order.
    [<Literal>]
    let private Joiner = "|"

    // ── JSON readers ────────────────────────────────────────────────────────

    let private strOf (el: JsonElement) (p: string) = el.GetProperty(p).GetString()
    let private intOf (el: JsonElement) (p: string) = el.GetProperty(p).GetInt32()
    let private boolOf (el: JsonElement) (p: string) = el.GetProperty(p).GetBoolean()
    let private items (el: JsonElement) (p: string) = [ for x in el.GetProperty(p).EnumerateArray() -> x ]

    /// A flat source entry `{k, v, w}` as a ((key, value), weight) pair.
    let private srcEntry (el: JsonElement) : (string * string) * int64 =
        (el.GetProperty("k").GetString(), el.GetProperty("v").GetString()),
        int64 (el.GetProperty("w").GetInt32())

    /// Build the index the way the TypeScript side did: a flat Z-set of tuples, then `indexWith`.
    let private indexOf (el: JsonElement) (p: string) : IndexedZSet<string, string> =
        items el p |> List.map srcEntry |> ZSet.ofSeq |> IndexedZSet.indexWith fst snd

    /// (value, weight) entries, in the order the structure holds them.
    let private valueEntries (z: ZSet<string>) : (string * int64) list =
        [ for e in z.AsSpan().ToArray() -> e.Key, e.Weight ]

    /// The wire shape of an index: groups in key order, each with its (value, weight) entries.
    let private groupsOf (i: IndexedZSet<string, string>) : (string * (string * int64) list) list =
        [ for g in i.AsSpan().ToArray() -> g.Key, valueEntries g.Values ]

    let private expectedGroups (el: JsonElement) : (string * (string * int64) list) list =
        [ for g in el.GetProperty("expectedGroups").EnumerateArray() ->
              g.GetProperty("key").GetString(),
              [ for e in g.GetProperty("values").EnumerateArray() ->
                    e.GetProperty("e").GetString(), int64 (e.GetProperty("w").GetInt32()) ] ]

    let private expectedEntries (el: JsonElement) (p: string) : (string * int64) list =
        [ for e in el.GetProperty(p).EnumerateArray() ->
              e.GetProperty("e").GetString(), int64 (e.GetProperty("w").GetInt32()) ]

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
                Path.Join(
                    repoRoot (),
                    "src",
                    "Core.TypeScript",
                    "indexed-z-set",
                    "indexed-z-set-treaty-transcript.json"
                )

             let info = FileInfo(path)

             if not info.Exists then
                 invalidOp (
                     sprintf
                         "IndexedZSet treaty transcript missing at %s — regenerate with: bun src/Core.TypeScript/indexed-z-set/generate-indexed-z-set-treaty-transcript.ts"
                         path
                 )

             if info.Length > MaxTranscriptBytes then
                 invalidOp $"IndexedZSet treaty transcript is too large: {info.Length} bytes."

             use stream = File.OpenRead path
             let doc = JsonDocument.Parse(stream)
             [ for v in doc.RootElement.EnumerateArray() -> v ])

    let private vectorsOf (kind: string) =
        transcript.Value |> List.filter (fun v -> strOf v "vectorType" = kind)

    // ── The replays ─────────────────────────────────────────────────────────

    [<Fact>]
    let ``indexWith: grouping, key order, and the counts`` () =
        let vectors = vectorsOf "IndexWith"
        Assert.NotEmpty vectors

        for v in vectors do
            let i = indexOf v "src"
            let name = strOf v "name"

            Assert.Equal<(string * (string * int64) list) list>(expectedGroups v, groupsOf i)
            Assert.Equal(intOf v "expectedKeyCount", IndexedZSet.keyCount i)
            Assert.Equal(intOf v "expectedTupleCount", IndexedZSet.tupleCount i)

            // Asserted separately from keyCount: a side that kept empty groups would report the same
            // VALUES with a different count, which is risk 4 and the reason both are pinned.
            Assert.True(
                boolOf v "expectedIsEmpty" = IndexedZSet.isEmpty i,
                sprintf "isEmpty disagrees for vector %s" name
            )

    [<Fact>]
    let ``neg: every weight flips and the structure is otherwise untouched`` () =
        let vectors = vectorsOf "Neg"
        Assert.NotEmpty vectors

        for v in vectors do
            Assert.Equal<(string * (string * int64) list) list>(
                expectedGroups v,
                groupsOf (IndexedZSet.neg (indexOf v "src"))
            )

    [<Fact>]
    let ``get: a key's values, and an absent key is EMPTY rather than an error`` () =
        let vectors = vectorsOf "Get"
        Assert.NotEmpty vectors

        for v in vectors do
            let i = indexOf v "src"
            // F# exposes the lookup as the INDEXER, not a module function; TypeScript exposes `get`.
            // The treaty pins the behaviour, not the spelling.
            let found = i.[strOf v "key"]
            Assert.Equal<(string * int64) list>(expectedEntries v "expectedValues", valueEntries found)

    [<Fact>]
    let ``toZSet: the flat (key, value) pairs, in order`` () =
        let vectors = vectorsOf "ToZSet"
        Assert.NotEmpty vectors

        for v in vectors do
            let flat = IndexedZSet.toZSet (indexOf v "src")

            let actual =
                [ for e in flat.AsSpan().ToArray() ->
                      let k, value = e.Key
                      k + Joiner + value, e.Weight ]

            Assert.Equal<(string * int64) list>(expectedEntries v "expectedPairs", actual)

    [<Fact>]
    let ``add: per-key union, and a key that cancels DISAPPEARS`` () =
        let vectors = vectorsOf "Add"
        Assert.NotEmpty vectors

        for v in vectors do
            let sum = IndexedZSet.add (indexOf v "left") (indexOf v "right")
            Assert.Equal<(string * (string * int64) list) list>(expectedGroups v, groupsOf sum)

    [<Fact>]
    let ``sub: a - a is EMPTY, not a list of groups holding empty Z-sets`` () =
        let vectors = vectorsOf "Sub"
        Assert.NotEmpty vectors

        for v in vectors do
            let diff = IndexedZSet.sub (indexOf v "left") (indexOf v "right")
            Assert.Equal<(string * (string * int64) list) list>(expectedGroups v, groupsOf diff)

    [<Fact>]
    let ``join: the per-key cartesian product with weights MULTIPLIED`` () =
        let vectors = vectorsOf "Join"
        Assert.NotEmpty vectors

        for v in vectors do
            let joined =
                IndexedZSet.join
                    (fun k va vb -> k + Joiner + va + Joiner + vb)
                    (indexOf v "left")
                    (indexOf v "right")

            let actual = [ for e in joined.AsSpan().ToArray() -> e.Key, e.Weight ]
            Assert.Equal<(string * int64) list>(expectedEntries v "expectedPairs", actual)

    [<Fact>]
    let ``the transcript is not truncated`` () =
        // A generated transcript that lost most of its vectors must not pass as a green treaty.
        Assert.True(
            transcript.Value.Length >= 120,
            sprintf "expected at least 120 treaty vectors, found %d — regenerate the transcript" transcript.Value.Length
        )

        for kind in [ "IndexWith"; "Neg"; "Get"; "ToZSet"; "Add"; "Sub"; "Join" ] do
            Assert.True(not (List.isEmpty (vectorsOf kind)), sprintf "no vectors of type %s in the transcript" kind)

    [<Fact>]
    let ``the discriminating vectors are still present`` () =
        // Each of these is the ONLY vector that catches one specific divergence, so losing one would
        // quietly shrink the treaty while it stayed green. Asserting they exist keeps a regeneration
        // from deleting the cases that do the work.
        let names = transcript.Value |> List.map (fun v -> strOf v "name") |> Set.ofList

        // Risk 3: ordinal vs locale collation.
        Assert.Contains("case-mixed-keys", names)
        Assert.Contains("case-mixed-values-under-one-key", names)
        // Risk 4: the empty-group invariant, at the key level and for the whole index.
        Assert.Contains("values-cancel-so-the-key-disappears", names)
        Assert.Contains("everything-cancels", names)
        // An absent key must return empty rather than throw.
        Assert.Contains("empty/missing", names)
