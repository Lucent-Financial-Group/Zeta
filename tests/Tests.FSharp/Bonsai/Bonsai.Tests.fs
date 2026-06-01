module Zeta.Tests.Bonsai.BonsaiTests

open System.IO
open System.Reflection
open System.Text.Json
open global.Xunit
open Zeta.Core

// Bonsai-subset serializer — the F# oracle (#2 of TS/F#/C#/Rust) for B-0976
// slice 1. The TS reference oracle (src/Core.TypeScript/bonsai/) authors the
// shared golden vectors; this proves the F# impl replays them byte-for-byte:
// serialize(parse canonical) = canonical (the cross-language byte lock) AND an
// independently F#-constructed tree serializes to the same canonical bytes.
// "The compilers don't lie."

// Walk up from the test assembly to the repo root (Zeta.sln sentinel) — same
// pattern as the algebra-ladder golden-vector tests.
let private repoRoot () : string =
    let mutable dir = DirectoryInfo(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location))

    while not (isNull dir) && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
        dir <- dir.Parent

    if isNull dir then
        failwith "Could not locate repo root (Zeta.sln) from test assembly location."

    dir.FullName

// Read each golden case's (name, canonical) eagerly so the JsonDocument is safe
// to dispose before the values are used.
let private goldenCanonicals () : (string * string) list =
    let path = Path.Join(repoRoot (), "src", "Core.TypeScript", "bonsai", "golden-vectors.json")
    use doc = JsonDocument.Parse(File.ReadAllText(path))

    [ for c in doc.RootElement.GetProperty("cases").EnumerateArray() ->
          c.GetProperty("name").GetString(), c.GetProperty("canonical").GetString() ]

[<Fact>]
let ``F# serialize is the byte-exact fixed point of every shared Bonsai golden canonical`` () =
    let cases = goldenCanonicals ()
    Assert.True(cases.Length > 0, "no golden cases loaded")

    for (name, canonical) in cases do
        let round = Bonsai.serialize (Bonsai.parse canonical)
        Assert.True((round = canonical), sprintf "case %s: serialize(parse canonical) != canonical\n exp: %s\n got: %s" name canonical round)

[<Fact>]
let ``F#-constructed factorial serializes to the shared canonical bytes`` () =
    // Independent construction path (not via parse) — proves F# serialize emits
    // the exact TS reference bytes for a non-trivial tree (cond + recursive call).
    let fact =
        Bonsai.Lambda(
            [ "n" ],
            Bonsai.Cond(
                Bonsai.Binary(Bonsai.Lt, Bonsai.Param "n", Bonsai.Const(Bonsai.CInt 2L)),
                Bonsai.Const(Bonsai.CInt 1L),
                Bonsai.Binary(
                    Bonsai.Mul,
                    Bonsai.Param "n",
                    Bonsai.Call("fact", [ Bonsai.Binary(Bonsai.Sub, Bonsai.Param "n", Bonsai.Const(Bonsai.CInt 1L)) ])
                )
            )
        )

    let expected = goldenCanonicals () |> List.find (fun (n, _) -> n = "factorial") |> snd
    Assert.Equal(expected, Bonsai.serialize fact)

[<Fact>]
let ``parse round-trips structurally (DU equality, every case)`` () =
    for (_, canonical) in goldenCanonicals () do
        Assert.Equal<Bonsai.Expr>(Bonsai.parse canonical, Bonsai.parse canonical)

[<Fact>]
let ``parse rejects an unknown node kind`` () =
    Assert.Throws<System.Exception>(fun () -> Bonsai.parse "{\"v\":1,\"expr\":{\"kind\":\"bogus\"}}" |> ignore)
    |> ignore

[<Fact>]
let ``parse rejects an unsupported version`` () =
    Assert.Throws<System.Exception>(fun () -> Bonsai.parse "{\"v\":2,\"expr\":{\"kind\":\"param\",\"name\":\"x\"}}" |> ignore)
    |> ignore

// Cross-language byte-exact parity guards (match the hardened TS oracle, which
// rejects ints beyond the JS safe-integer range and escapes lone surrogates —
// both are values a peer oracle could not reproduce byte-for-byte).

[<Fact>]
let ``parse rejects an int beyond the safe-integer range (an int64 a peer oracle could not preserve)`` () =
    // 2^53 + 1 = 9007199254740993 — a valid int64 that TS's number rounds to
    // 9007199254740992, breaking the byte contract; reject rather than diverge.
    Assert.Throws<System.Exception>(fun () ->
        Bonsai.parse "{\"v\":1,\"expr\":{\"kind\":\"const\",\"value\":{\"t\":\"int\",\"v\":9007199254740993}}}"
        |> ignore)
    |> ignore

[<Fact>]
let ``serialize rejects an int beyond the safe-integer range`` () =
    Assert.Throws<System.Exception>(fun () -> Bonsai.serialize (Bonsai.Const(Bonsai.CInt 9007199254740993L)) |> ignore)
    |> ignore

[<Fact>]
let ``serialize accepts the safe-integer boundary (2^53 - 1)`` () =
    // The boundary value itself is in-domain and must serialize, not throw.
    let s = Bonsai.serialize (Bonsai.Const(Bonsai.CInt 9007199254740991L))
    Assert.Equal("{\"v\":1,\"expr\":{\"kind\":\"const\",\"value\":{\"t\":\"int\",\"v\":9007199254740991}}}", s)

[<Fact>]
let ``serialize escapes a lone high surrogate as lowercase backslash-u (matches JSON.stringify)`` () =
    // A lone high surrogate (U+D800) has no valid UTF-8 encoding; well-formed
    // JSON.stringify escapes it \ud800, so the F# oracle must too.
    let s = Bonsai.serialize (Bonsai.Param(System.String([| '\uD800' |])))
    Assert.Contains("\\ud800", s)

[<Fact>]
let ``serialize keeps a valid surrogate pair literal (matches JSON.stringify)`` () =
    // U+1F600 = high D83D + low DE00 — JSON.stringify emits the astral character
    // literally (not an escape); F# must emit the pair, not \ud83d.
    let pair = System.String([| '\uD83D'; '\uDE00' |])
    let s = Bonsai.serialize (Bonsai.Param pair)
    Assert.Contains(pair, s)
    Assert.DoesNotContain("\\ud83d", s)

// Canonical-only parse parity (matches the TS oracle): a structurally-valid but
// non-canonical vector is rejected, so both oracles agree on the valid-input
// domain and the serialize(parse s) = s fixed point holds.

[<Fact>]
let ``parse rejects a non-canonical vector carrying an unknown extra field`` () =
    Assert.Throws<System.Exception>(fun () ->
        Bonsai.parse "{\"v\":1,\"expr\":{\"kind\":\"param\",\"name\":\"x\",\"extra\":0}}" |> ignore)
    |> ignore

[<Fact>]
let ``parse rejects non-canonical whitespace (canonical form is whitespace-free)`` () =
    Assert.Throws<System.Exception>(fun () ->
        Bonsai.parse "{\"v\":1, \"expr\":{\"kind\":\"param\",\"name\":\"x\"}}" |> ignore)
    |> ignore

[<Fact>]
let ``parse rejects non-canonical key order (canonical fixes v/kind first)`` () =
    Assert.Throws<System.Exception>(fun () ->
        Bonsai.parse "{\"expr\":{\"kind\":\"param\",\"name\":\"x\"},\"v\":1}" |> ignore)
    |> ignore
