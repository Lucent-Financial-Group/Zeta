namespace Zeta.Tests.FSharp

open System
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core

/// The cross-language treaty for the Hat/Persona migration.
///
/// `src/Core/Hat.fs` + `src/Core/Persona.fs` + `src/Core/ActionGrammar.fs` are CANONICAL; the
/// TypeScript oracle (`src/Core.TypeScript/hat/`) conforms to them. This test is what makes that
/// claim mechanical rather than aspirational: the TS side computes every expected value into
/// `hat-treaty-transcript.json`, and this replays the identical inputs through the F# and asserts
/// equality. Either implementation changing behaviour reddens this test.
///
/// Same shape as `WorkflowEngine.Tests.fs`, deliberately — a second convention for the same job
/// would be its own kind of drift.
///
/// TRAVERSALS ARE NOT IN THE TREATY, by nature and not by convenience: `Traversal.Traversal<'r>`
/// carries functions, which do not survive JSON. Every hat here therefore has `Traversals = []`,
/// and `Persona.traversals` is the one ported function with no vector. Stated so the gap is a known
/// limit rather than an unnoticed hole.
module HatTreatyTests =

    [<Literal>]
    let private MaxTranscriptBytes = 4L * 1024L * 1024L

    // ── JSON readers ────────────────────────────────────────────────────────

    let private str (el: JsonElement) (p: string) = el.GetProperty(p).GetString()
    let private int32Of (el: JsonElement) (p: string) = el.GetProperty(p).GetInt32()
    let private boolOf (el: JsonElement) (p: string) = el.GetProperty(p).GetBoolean()
    let private arr (el: JsonElement) (p: string) = [ for x in el.GetProperty(p).EnumerateArray() -> x ]

    /// A 16-bool action.
    let private action (el: JsonElement) : bool[] =
        [| for x in el.EnumerateArray() -> x.GetBoolean() |]

    let private actionAt (el: JsonElement) (p: string) : bool[] = action (el.GetProperty(p))

    let private actions (el: JsonElement) (p: string) : bool[] list =
        [ for x in el.GetProperty(p).EnumerateArray() -> action x ]

    let private strings (el: JsonElement) (p: string) : string list =
        [ for x in el.GetProperty(p).EnumerateArray() -> x.GetString() ]

    let private ints (el: JsonElement) (p: string) : int list =
        [ for x in el.GetProperty(p).EnumerateArray() -> x.GetInt32() ]

    let private ground (el: JsonElement) : SolidGround.Ground =
        match el.GetProperty("tag").GetString() with
        | "Constant" -> SolidGround.Constant(el.GetProperty("value").GetInt32())
        | "Monotonic" -> SolidGround.Monotonic(el.GetProperty("value").GetInt32())
        | "Erratic" -> SolidGround.Erratic
        | other -> failwithf "Unknown ground tag: %s" other

    let private lens (el: JsonElement) : LensRouter.Lens =
        { Name = el.GetProperty("name").GetString()
          Cells = [ for c in el.GetProperty("cells").EnumerateArray() -> c.GetString() ] }

    /// Rebuild a hat. `'r` is pinned to `int` because every treaty hat has no traversals.
    let private hat (el: JsonElement) : Hat.Hat<int> =
        { Name = str el "name"
          Scope =
            match str el "scope" with
            | "Meta" -> Hat.Meta
            | "GameSpecific" -> Hat.GameSpecific
            | other -> failwithf "Unknown hat scope: %s" other
          Lenses = [ for l in el.GetProperty("lenses").EnumerateArray() -> lens l ]
          Landmarks =
            [ for lm in el.GetProperty("landmarks").EnumerateArray() ->
                (lm.[0].GetString(), ground lm.[1]) ]
          AllowedActions = actions el "allowedActions"
          Traversals = []
          Controls = strings el "controls" }

    let private hatAt (el: JsonElement) (p: string) : Hat.Hat<int> = hat (el.GetProperty(p))

    let private hats (el: JsonElement) (p: string) : Hat.Hat<int> list =
        [ for x in el.GetProperty(p).EnumerateArray() -> hat x ]

    // ── the replay ──────────────────────────────────────────────────────────

    [<Fact>]
    let ``hat treaty: F# matches the TypeScript oracle on every vector`` () =
        let root =
            let mutable dir = DirectoryInfo(AppContext.BaseDirectory)
            while dir <> null && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
                dir <- dir.Parent
            if dir = null then failwith "Could not locate the repository root (no Zeta.sln above the test binary)."
            dir.FullName

        let transcriptPath =
            Path.Join(root, "src", "Core.TypeScript", "hat", "hat-treaty-transcript.json")

        let info = FileInfo(transcriptPath)
        if not info.Exists then
            failwithf
                "Hat treaty transcript missing at %s — regenerate with: bun src/Core.TypeScript/hat/generate-hat-treaty-transcript.ts"
                transcriptPath
        if info.Length > MaxTranscriptBytes then
            invalidOp $"Hat treaty transcript is too large: {info.Length} bytes."

        use stream = File.OpenRead transcriptPath
        use doc = JsonDocument.Parse(stream)

        let mutable count = 0

        for el in doc.RootElement.EnumerateArray() do
            let vectorType = str el "vectorType"

            match vectorType with
            | "Lattice" ->
                let a = actionAt el "a"
                let b = actionAt el "b"
                Assert.Equal<bool[]>(actionAt el "join", ActionGrammar.join a b)
                Assert.Equal<bool[]>(actionAt el "meet", ActionGrammar.meet a b)
                Assert.Equal<bool[]>(actionAt el "complementA", ActionGrammar.complement a)
                Assert.Equal(boolOf el "leqAB", ActionGrammar.leq a b)
                Assert.Equal(int32Of el "weightA", ActionGrammar.weight a)
                Assert.Equal<int list>(ints el "keysA", ActionGrammar.keys a)

            | "Single" ->
                // `single` MASKS (k &&& 0xF) — 16 wraps to 0, -1 wraps to 15.
                Assert.Equal<bool[]>(actionAt el "expected", ActionGrammar.single (int32Of el "k"))

            | "OfGrid" ->
                // `ofGrid` CLAMPS — the opposite boundary rule to `single`, on purpose.
                Assert.Equal(int32Of el "expected", ActionGrammar.ofGrid (int32Of el "row") (int32Of el "col"))

            | "ToGrid" ->
                let row, col = ActionGrammar.toGrid (int32Of el "k")
                Assert.Equal(int32Of el "row", row)
                Assert.Equal(int32Of el "col", col)

            | "OfKeys" ->
                Assert.Equal<bool[]>(actionAt el "expected", ActionGrammar.ofKeys (ints el "ks"))

            | "Holds" ->
                Assert.Equal(boolOf el "expected", ActionGrammar.holds (int32Of el "k") (actionAt el "a"))

            | "HatAddress" ->
                Assert.Equal(str el "expected", Hat.address (str el "gameKey") (hatAt el "hat"))

            | "HatLandmarkCells" ->
                Assert.Equal<string list>(strings el "expected", Hat.landmarkCells (hatAt el "hat"))

            | "HatIsPersona" ->
                Assert.Equal(boolOf el "expected", Hat.isPersona (hatAt el "hat"))

            | "HatControls" ->
                Assert.Equal(boolOf el "expected", Hat.controls (str el "other") (hatAt el "hat"))

            | "HatPermits" ->
                Assert.Equal(boolOf el "expected", Hat.permits (actionAt el "action") (hatAt el "hat"))

            | "HatRestrict" ->
                Assert.Equal<bool[] list>(actions el "expected", Hat.restrict (actions el "actions") (hatAt el "hat"))

            | "HatPersonasOf" ->
                let names = hats el "hats" |> Hat.personas |> List.map (fun h -> h.Name)
                Assert.Equal<string list>(strings el "expected", names)

            | "HatGameSpecificOf" ->
                let names = hats el "hats" |> Hat.gameSpecific |> List.map (fun h -> h.Name)
                Assert.Equal<string list>(strings el "expected", names)

            | "PersonaOps" ->
                let available = hats el "available"
                let byName n = available |> List.tryFind (fun h -> h.Name = n)

                let mutable p : Persona.Persona<int> = Persona.create "otto"
                for op in arr el "ops" do
                    match op.GetProperty("tag").GetString() with
                    | "Wear" ->
                        match byName (op.GetProperty("hatName").GetString()) with
                        | Some h -> p <- Persona.wear h p
                        | None -> ()
                    | "Doff" -> p <- Persona.doff (op.GetProperty("hatName").GetString()) p
                    | "WearAll" -> p <- Persona.wearAll available p
                    | "Decide" ->
                        let chosen = [ for c in op.GetProperty("chosen").EnumerateArray() -> c.GetString() ]
                        p <- Persona.decide chosen available p
                    | other -> failwithf "Unknown persona op: %s" other

                Assert.Equal<string list>(strings el "wornNames", p.Worn |> List.map (fun h -> h.Name))
                Assert.Equal<bool[] list>(actions el "allowedActions", Persona.allowedActions p)
                Assert.Equal<string list>(
                    (arr el "lenses" |> List.map (fun l -> l.GetProperty("name").GetString())),
                    (Persona.lenses p |> List.map (fun l -> l.Name)))
                Assert.Equal<string list>(
                    (arr el "landmarks" |> List.map (fun lm -> lm.[0].GetString())),
                    (Persona.landmarks p |> List.map fst))
                Assert.Equal<string list>(strings el "controls", Persona.controls p)
                Assert.Equal(int32Of el "hatFlags", Persona.hatFlags available p)

            | "PersonaAddress" ->
                let scopeEl = el.GetProperty("scope")
                let scope =
                    match scopeEl.GetProperty("kind").GetString() with
                    | "Global" -> Persona.Global
                    | "GameScoped" -> Persona.GameScoped(scopeEl.GetProperty("key").GetString())
                    | other -> failwithf "Unknown persona scope: %s" other
                let p : Persona.Persona<int> = Persona.create (str el "name") |> Persona.withScope scope
                Assert.Equal(str el "expected", Persona.address p)

            | "PersonaRoute" ->
                let available = hats el "available"
                let relEl = el.GetProperty("relevance")
                let relevance (h: Hat.Hat<int>) =
                    match relEl.TryGetProperty(h.Name) with
                    | true, v -> v.GetDouble()
                    | false, _ -> 0.0
                let p = Persona.route relevance (int32Of el "k") available (Persona.create "otto")
                Assert.Equal<string list>(strings el "wornNames", p.Worn |> List.map (fun h -> h.Name))

            | "PersonaRegularization" ->
                let p : Persona.Persona<int> =
                    Persona.create "otto"
                    |> Persona.withPrivate (Array.zeroCreate (int32Of el "privLength"))
                Assert.Equal(int32Of el "expected", Persona.regularization p)

            | other -> failwithf "Unknown vectorType: %s" other

            count <- count + 1

        Assert.True(count > 0, "No treaty vectors were processed")
        // The transcript is generated; a truncated one must not pass as a green treaty.
        Assert.True(count >= 200, $"Expected the full treaty (>= 200 vectors), processed {count}")
