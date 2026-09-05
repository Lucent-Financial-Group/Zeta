module Zeta.Bayesian.Tests.SignedProbitEpTests

open FsUnit.Xunit
open global.Xunit
open Zeta.Bayesian

module Query = SignedProbitEp

let private catalogue : Query.Observation list =
    [ { SourceRow = 4; Group = Query.Group.HousingYes; Label = -1 }
      { SourceRow = 1; Group = Query.Group.HousingNo; Label = 1 }
      { SourceRow = 6; Group = Query.Group.HousingYes; Label = 1 }
      { SourceRow = 2; Group = Query.Group.HousingNo; Label = -1 }
      { SourceRow = 5; Group = Query.Group.HousingYes; Label = -1 }
      { SourceRow = 3; Group = Query.Group.HousingNo; Label = 1 }
      { SourceRow = 7; Group = Query.Group.HousingUnknown; Label = 1 } ]

let private queried observations = Query.query Query.defaultConfig observations

[<Fact>]
let ``signed-probit query canonicalizes source order and returns both declared group receipts`` () =
    match queried catalogue with
    | Error failure -> Assert.Fail(sprintf "unexpected signed-probit refusal: %A" failure)
    | Ok receipt ->
        receipt.CanonicalObservationCount |> should equal 7
        receipt.AllGroupsConverged |> should equal true
        receipt.Groups |> List.map (fun group -> group.Group) |> should equal [ Query.Group.HousingNo; Query.Group.HousingYes; Query.Group.HousingUnknown ]
        receipt.Groups |> List.map (fun group -> group.ObservationCount) |> should equal [ 3; 3; 1 ]
        receipt.Groups |> List.forall (fun group -> group.Variance > 0.0) |> should equal true

[<Fact>]
let ``signed-probit query returns one canonical receipt across source permutations`` () =
    let permuted = [ catalogue.[6]; catalogue.[5]; catalogue.[3]; catalogue.[1]; catalogue.[4]; catalogue.[0]; catalogue.[2] ]

    match queried catalogue, queried permuted with
    | Ok left, Ok right -> left |> should equal right
    | Error failure, _ -> Assert.Fail(sprintf "first query refused: %A" failure)
    | _, Error failure -> Assert.Fail(sprintf "permuted query refused: %A" failure)

[<Fact>]
let ``signed-probit query refuses duplicate source rows rather than absorbing non-idempotent evidence`` () =
    let duplicated = { catalogue.[0] with Label = 1 }

    match queried (duplicated :: catalogue) with
    | Error(Query.DuplicateSourceRow 4) -> ()
    | other -> Assert.Fail(sprintf "expected duplicate-source refusal, got %A" other)

[<Fact>]
let ``signed-probit query treats a repeated label under a new source row as a distinct datum`` () =
    let repeatedAtNewSourceRow = { catalogue.[0] with SourceRow = 8 }

    match queried catalogue, queried (repeatedAtNewSourceRow :: catalogue) with
    | Ok original, Ok repeated ->
        original.CanonicalInputFingerprint |> should not' (equal repeated.CanonicalInputFingerprint)
        original.Groups |> should not' (equal repeated.Groups)
    | Error failure, _ -> Assert.Fail(sprintf "original query refused: %A" failure)
    | _, Error failure -> Assert.Fail(sprintf "repeated-datum query refused: %A" failure)

[<Fact>]
let ``signed-probit query refuses labels outside the declared binary encoding`` () =
    let malformed = { catalogue.[0] with Label = 0 }

    match queried (malformed :: catalogue.Tail) with
    | Error(Query.InvalidObservation(4, _)) -> ()
    | other -> Assert.Fail(sprintf "expected invalid-label refusal, got %A" other)

[<Fact>]
let ``signed-probit label mutation changes its canonical posterior receipt`` () =
    let changed =
        catalogue
        |> List.map (fun observation ->
            if observation.SourceRow = 1 then
                { observation with Label = -1 }
            else
                observation)

    match queried catalogue, queried changed with
    | Ok original, Ok mutated ->
        original.CanonicalInputFingerprint |> should not' (equal mutated.CanonicalInputFingerprint)
        original.Groups |> should not' (equal mutated.Groups)
    | Error failure, _ -> Assert.Fail(sprintf "original query refused: %A" failure)
    | _, Error failure -> Assert.Fail(sprintf "mutated query refused: %A" failure)
