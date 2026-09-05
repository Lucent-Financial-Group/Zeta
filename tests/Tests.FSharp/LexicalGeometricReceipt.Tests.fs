module Zeta.Tests.LexicalGeometricReceiptTests

open global.Xunit
open Zeta.Core

let private seedIds = Set.ofList [ "seed-i"; "seed-you"; "seed-now" ]

let private lexicon =
    LexicalGeometricReceipt.tryCreateLexicon seedIds [ "I", "seed-i"; "you", "seed-you"; "now", "seed-now" ]
    |> Result.defaultWith (fun error -> failwithf "fixture lexicon refused: %A" error)

let private entry seedId rgb x y z uncertaintyPpm : LexicalGeometricReceipt.CalibrationEntry =
    { SeedId = seedId
      Rgb = rgb
      X = x
      Y = y
      Z = z
      UncertaintyPpm = uncertaintyPpm }

let private calibration entries =
    LexicalGeometricReceipt.tryCreateCalibration
        seedIds
        { Algorithm = LexicalGeometricReceipt.Algorithm
          CalibrationVersion = "non-personal-fixture/v1"
          SeedVersion = "nsm-english-candidate/v0"
          Entries = entries }
    |> Result.defaultWith (fun error -> failwithf "fixture calibration refused: %A" error)

let private emptyConflicts : LexicalGeometricReceipt.CorrectionConflict array = [||]

[<Fact>]
let ``lexical geometry resolves only an exact declared form with one declared calibration`` () =
    let input = calibration [| entry "seed-i" "#FF0000" 0.5 -0.25 0.75 250_000 |]
    let receipt = LexicalGeometricReceipt.project input emptyConflicts lexicon "I unknown"
    Assert.Equal(2, receipt.Projections.Length)
    match receipt.Projections.[0], receipt.Projections.[1] with
    | LexicalGeometricReceipt.Resolved resolved, LexicalGeometricReceipt.UnresolvedToken(original, normalized) ->
        Assert.Equal("I", resolved.OriginalSurface)
        Assert.Equal("i", resolved.NormalizedSurface)
        Assert.Equal("seed-i", resolved.SeedId)
        Assert.Equal("#FF0000", resolved.Rgb)
        Assert.Equal(0.5, resolved.Coordinate.E1, 12)
        Assert.Equal(-0.25, resolved.Coordinate.E2, 12)
        Assert.Equal(0.75, resolved.Coordinate.E3, 12)
        Assert.True(ConformalGA.isNull 1e-12 resolved.ConformalPoint)
        Assert.Equal("unknown", original)
        Assert.Equal("unknown", normalized)
    | observed -> failwithf "expected resolved then retained unknown token, got %A" observed

[<Fact>]
let ``calibration permutations have the same fingerprint and source-order projection receipt`` () =
    let a = entry "seed-i" "#FF0000" 0.5 0.0 0.0 10
    let b = entry "seed-you" "#00FF00" -0.5 0.0 0.0 20
    let left = calibration [| a; b |] |> fun value -> LexicalGeometricReceipt.project value emptyConflicts lexicon "I you"
    let right = calibration [| b; a |] |> fun value -> LexicalGeometricReceipt.project value emptyConflicts lexicon "I you"
    Assert.Equal(left.CalibrationFingerprint, right.CalibrationFingerprint)
    Assert.Equal(left.Fingerprint, right.Fingerprint)

[<Fact>]
let ``missing calibration remains explicit and no coordinate is synthesized`` () =
    let receipt = LexicalGeometricReceipt.project (calibration [||]) emptyConflicts lexicon "you"
    match receipt.Projections with
    | [| LexicalGeometricReceipt.UnresolvedCalibration(original, normalized, seedId) |] ->
        Assert.Equal("you", original)
        Assert.Equal("you", normalized)
        Assert.Equal("seed-you", seedId)
    | observed -> failwithf "expected retained unresolved calibration, got %A" observed

[<Fact>]
let ``duplicate calibration mappings remain a conflict rather than selecting a coordinate`` () =
    let first = entry "seed-i" "#FF0000" 0.5 0.0 0.0 10
    let second = entry "seed-i" "#0000FF" -0.5 0.0 0.0 20
    let receipt = LexicalGeometricReceipt.project (calibration [| first; second |]) emptyConflicts lexicon "i"
    match receipt.Projections with
    | [| LexicalGeometricReceipt.Conflict(_, _, reason, contentIds) |] ->
        Assert.Equal("duplicate-calibration-seed-id", reason)
        Assert.Equal(2, contentIds.Length)
    | observed -> failwithf "expected visible duplicate-calibration conflict, got %A" observed

[<Fact>]
let ``lexical correction conflict remains visible and is never rewritten to a seed`` () =
    let conflicts: LexicalGeometricReceipt.CorrectionConflict array =
        [| { NormalizedSurface = "i"
             ContentIds = [| "content-b"; "content-a" |] } |]
    let receipt = LexicalGeometricReceipt.project (calibration [| entry "seed-i" "#FF0000" 0.0 0.0 0.0 0 |]) conflicts lexicon "I"
    match receipt.Projections with
    | [| LexicalGeometricReceipt.Conflict(_, _, reason, contentIds) |] ->
        Assert.Equal("lexical-correction-conflict", reason)
        Assert.Equal<string array>([| "content-a"; "content-b" |], contentIds)
    | observed -> failwithf "expected retained correction conflict, got %A" observed

[<Fact>]
let ``multiple correction conflicts union their visible content IDs in either arrival order`` () =
    let first: LexicalGeometricReceipt.CorrectionConflict =
        { NormalizedSurface = "i"
          ContentIds = [| "content-c"; "content-a" |] }
    let second: LexicalGeometricReceipt.CorrectionConflict =
        { NormalizedSurface = "I"
          ContentIds = [| "content-b"; "content-a" |] }
    let receipt conflicts =
        LexicalGeometricReceipt.project
            (calibration [| entry "seed-i" "#FF0000" 0.0 0.0 0.0 0 |])
            conflicts
            lexicon
            "i"
    let left = receipt [| first; second |]
    let right = receipt [| second; first |]
    Assert.Equal(left.Fingerprint, right.Fingerprint)
    match left.Projections with
    | [| LexicalGeometricReceipt.Conflict(_, _, reason, contentIds) |] ->
        Assert.Equal("lexical-correction-conflict", reason)
        Assert.Equal<string array>([| "content-a"; "content-b"; "content-c" |], contentIds)
    | observed -> failwithf "expected canonical union of visible correction conflicts, got %A" observed

[<Fact>]
let ``coordinate and color mutations bind fingerprints without changing unrelated projections`` () =
    let baseEntries = [| entry "seed-i" "#FF0000" 0.0 0.0 0.0 0; entry "seed-you" "#00FF00" 0.25 0.0 0.0 0 |]
    let coordinateMutation = [| entry "seed-i" "#FF0000" 0.5 0.0 0.0 0; baseEntries.[1] |]
    let colorMutation = [| entry "seed-i" "#FFFFFF" 0.0 0.0 0.0 0; baseEntries.[1] |]
    let baseReceipt = LexicalGeometricReceipt.project (calibration baseEntries) emptyConflicts lexicon "i you"
    let coordinateReceipt = LexicalGeometricReceipt.project (calibration coordinateMutation) emptyConflicts lexicon "i you"
    let colorReceipt = LexicalGeometricReceipt.project (calibration colorMutation) emptyConflicts lexicon "i you"
    Assert.NotEqual<string>(baseReceipt.Fingerprint, coordinateReceipt.Fingerprint)
    Assert.NotEqual<string>(baseReceipt.Fingerprint, colorReceipt.Fingerprint)
    match baseReceipt.Projections.[1], coordinateReceipt.Projections.[1], colorReceipt.Projections.[1] with
    | LexicalGeometricReceipt.Resolved baseline, LexicalGeometricReceipt.Resolved coordinateChanged, LexicalGeometricReceipt.Resolved colorChanged ->
        Assert.Equal(baseline.CalibrationEntryFingerprint, coordinateChanged.CalibrationEntryFingerprint)
        Assert.Equal(baseline.CalibrationEntryFingerprint, colorChanged.CalibrationEntryFingerprint)
    | observed -> failwithf "expected the unrelated projection to remain unchanged, got %A" observed

[<Fact>]
let ``invalid calibration rejects a bad RGB and an out-of-range coordinate before projection`` () =
    let badRgb =
        LexicalGeometricReceipt.tryCreateCalibration
            seedIds
            { Algorithm = LexicalGeometricReceipt.Algorithm
              CalibrationVersion = "fixture"
              SeedVersion = "seed"
              Entries = [| entry "seed-i" "red" 0.0 0.0 0.0 0 |] }
    let badCoordinate =
        LexicalGeometricReceipt.tryCreateCalibration
            seedIds
            { Algorithm = LexicalGeometricReceipt.Algorithm
              CalibrationVersion = "fixture"
              SeedVersion = "seed"
              Entries = [| entry "seed-i" "#FF0000" 1.01 0.0 0.0 0 |] }
    match badRgb, badCoordinate with
    | Error rgbError, Error coordinateError ->
        Assert.Equal("LEXGEO-INVALID-RGB", rgbError.Code)
        Assert.Equal("LEXGEO-INVALID-COORDINATE", coordinateError.Code)
    | observed -> failwithf "expected two pre-projection teaching errors, got %A" observed
