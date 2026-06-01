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
