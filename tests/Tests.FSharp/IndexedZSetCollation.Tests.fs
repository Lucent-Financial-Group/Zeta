namespace Zeta.Tests.FSharp

open System.Globalization
open Xunit
open Zeta.Core

/// The regression pack for a live defect the `IndexedZSet` cross-language treaty found:
/// **`indexWith` built its group array under one comparator and every consumer searched it under
/// another.**
///
/// `indexWith` sorted the keys with a bare `keysSpan.Sort<'K>()`, which resolves to
/// `Comparer<'K>.Default` — CULTURE-SENSITIVE for `string`. Meanwhile:
///
///   * the `Item` indexer BINARY-SEARCHES the groups with `KeyComparerCache<'K>.Instance` (ordinal)
///   * `(+)` — and therefore `add` and `sub` — merge-joins them with the same ordinal comparer
///   * `join` merge-joins them with `Collation.forKey<'K> ()` (ordinal)
///
/// So this was never "the output came out in a surprising order". A binary search over an array
/// sorted by a DIFFERENT comparator has lost its invariant: `idx.["A"]` could return **empty for a
/// key that is present**, and a merge could walk straight past a matching key. Both are silent.
///
/// The sharpest detail is in `join`'s own comment, which cites workitem 081KT07NV0008QG0R001YDB73K —
/// the culture-sensitive-comparison fix. That fix reached every CONSUMER and missed the PRODUCER, so
/// the module looked thoroughly fixed while the array feeding all of it was still built wrong.
///
/// These tests are deliberately separate from `IndexedZSetTreaty.Tests.fs`: the treaty catches this
/// through a generated transcript, and a transcript can be regenerated. A named regression cannot be
/// regenerated away.
///
/// HONEST LIMIT. Whether `Comparer<string>.Default` DIFFERS from ordinal depends on the host's
/// globalization mode; under `InvariantGlobalization` the two can coincide and the bug would be
/// invisible. So the assertions below state the invariant positively — ordinal order, and every
/// indexed key findable — rather than asserting that some particular wrong order appears. They are
/// correct under every culture and they went red under this host's.
module IndexedZSetCollationTests =

    /// Case-mixed on purpose. Ordinal (code-point) order is A, B, a, b; most linguistic collations
    /// give a, A, b, B. Nothing else discriminates the two.
    let private caseMixed =
        [ ("B", "v"), 1L
          ("a", "v"), 1L
          ("A", "v"), 1L
          ("b", "v"), 1L ]

    let private indexed () =
        caseMixed |> ZSet.ofSeq |> IndexedZSet.indexWith fst snd

    let private keysOf (i: IndexedZSet<string, string>) =
        [ for g in i.AsSpan().ToArray() -> g.Key ]

    [<Fact>]
    let ``groups are ordered ORDINALLY, not by the ambient culture`` () =
        Assert.Equal<string list>([ "A"; "B"; "a"; "b" ], keysOf (indexed ()))

    [<Fact>]
    let ``every key that was indexed is findable through the indexer`` () =
        // THE ACTUAL FAILURE. Under the defect the groups were culture-ordered and this binary search
        // was ordinal, so a present key returned an empty Z-set — indistinguishable from absent.
        let i = indexed ()

        for key in [ "A"; "B"; "a"; "b" ] do
            let found = i.[key]

            Assert.False(
                ZSet.isEmpty found,
                sprintf "key %s was indexed but the indexer reports it empty — the group array and the binary search disagree on order" key
            )

        // …and a key that genuinely is not there still reports empty rather than throwing.
        Assert.True(ZSet.isEmpty i.["missing"])

    [<Fact>]
    let ``add does not lose a key whose position differs between the two orders`` () =
        // A merge-join over two arrays sorted differently from the comparator it merges with skips
        // keys silently: the walk concludes one side is exhausted while entries remain.
        let a = indexed ()
        let b = [ ("A", "w"), 1L; ("b", "w"), 1L ] |> ZSet.ofSeq |> IndexedZSet.indexWith fst snd
        let sum = IndexedZSet.add a b

        Assert.Equal<string list>([ "A"; "B"; "a"; "b" ], keysOf sum)
        // "A" carries a value from each side; losing the merge would leave it with one.
        Assert.Equal(2, ZSet.count sum.["A"])
        Assert.Equal(2, ZSet.count sum.["b"])

    [<Fact>]
    let ``join pairs every matching key`` () =
        let a = indexed ()

        // The right side is {B, a} DELIBERATELY. My first version used {A, a}, and it passed under
        // the defect — both arrays happened to hold their keys in the same relative order, so the
        // merge walked them in step and matched anyway. A regression test that a restored defect
        // does not fail is not a regression test, so this is the pair that actually desyncs:
        //
        //   culture order   a: [a, A, b, B]   b: [a, B]
        //   ordinal merge   "a"="a" match, then "A" vs "B" advances a, then "b" vs "B" advances b —
        //                   and b is exhausted with the "B" match never made.
        let b = [ ("B", "w"), 1L; ("a", "w"), 1L ] |> ZSet.ofSeq |> IndexedZSet.indexWith fst snd

        let joined = IndexedZSet.join (fun k va vb -> k + "|" + va + "|" + vb) a b
        let pairs = [ for e in joined.AsSpan().ToArray() -> e.Key ]

        Assert.Equal<string list>([ "B|v|w"; "a|v|w" ], pairs)

    [<Fact>]
    let ``the invariant holds under an explicitly non-ordinal culture`` () =
        // The tests above run under whatever culture the host has. This one PICKS a culture whose
        // linguistic order differs from ordinal, so the defect cannot hide behind an invariant host.
        //
        // Under `InvariantGlobalization` this culture request silently yields invariant behaviour, in
        // which case the test still asserts a true statement and simply stops discriminating. Said
        // plainly, because a test that quietly stops testing is the failure this repo cares most
        // about — and the assertion is correct either way.
        let original = CultureInfo.CurrentCulture

        try
            CultureInfo.CurrentCulture <- CultureInfo "en-US"
            Assert.Equal<string list>([ "A"; "B"; "a"; "b" ], keysOf (indexed ()))
            Assert.False(ZSet.isEmpty (indexed ()).["A"])
        finally
            CultureInfo.CurrentCulture <- original
