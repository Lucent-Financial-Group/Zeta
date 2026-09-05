#r "../../../src/Core/bin/Debug/net10.0/Zeta.Core.dll"

open System
open Zeta.Core

let seedIds = Set.ofList [ "seed-i"; "seed-you"; "seed-now" ]

let lexicon =
    LexicalGeometricReceipt.tryCreateLexicon seedIds [ "I", "seed-i"; "you", "seed-you"; "now", "seed-now" ]
    |> Result.defaultWith (fun error -> failwithf "fixture lexicon refused: %A" error)

let entry seedId rgb x y z uncertaintyPpm : LexicalGeometricReceipt.CalibrationEntry =
    { SeedId = seedId
      Rgb = rgb
      X = x
      Y = y
      Z = z
      UncertaintyPpm = uncertaintyPpm }

let calibration entries =
    LexicalGeometricReceipt.tryCreateCalibration
        seedIds
        { Algorithm = LexicalGeometricReceipt.Algorithm
          CalibrationVersion = "non-personal-fixture/v1"
          SeedVersion = "nsm-english-candidate/v0"
          Entries = entries }
    |> Result.defaultWith (fun error -> failwithf "fixture calibration refused: %A" error)

let renderProjection = function
    | LexicalGeometricReceipt.Resolved value ->
        String.Join(
            "|",
            [| "resolved"
               value.OriginalSurface
               value.NormalizedSurface
               value.SeedId
               value.Rgb
               value.Coordinate.E1.ToString("R")
               value.Coordinate.E2.ToString("R")
               value.Coordinate.E3.ToString("R")
               string value.UncertaintyPpm
               value.CalibrationEntryFingerprint |])
    | LexicalGeometricReceipt.UnresolvedToken(original, normalized) -> String.Join("|", [| "unresolved-token"; original; normalized |])
    | LexicalGeometricReceipt.UnresolvedCalibration(original, normalized, seedId) ->
        String.Join("|", [| "unresolved-calibration"; original; normalized; seedId |])
    | LexicalGeometricReceipt.Conflict(original, normalized, reason, contentIds) ->
        String.Join("|", Array.concat [ [| "conflict"; original; normalized; reason |]; contentIds |> Array.sort ])

let renderReceipt (receipt: LexicalGeometricReceipt.Receipt) =
    String.Join(
        "\n",
        Array.concat
            [ [| $"calibration={receipt.CalibrationFingerprint}"; $"receipt={receipt.Fingerprint}" |]
              receipt.Projections |> Array.map renderProjection ])

let baseEntries =
    [| entry "seed-i" "#FF0000" 0.25 0.0 0.0 250_000
       entry "seed-you" "#00FF00" -0.5 0.0 0.0 500_000 |]

let entries =
    if Environment.GetCommandLineArgs() |> Array.contains "--mutate-coordinate" then
        [| entry "seed-i" "#FF0000" 0.75 0.0 0.0 250_000; baseEntries.[1] |]
    else
        baseEntries

let orderedEntries =
    if Environment.GetCommandLineArgs() |> Array.contains "--reverse-calibration" then Array.rev entries else entries

let conflicts: LexicalGeometricReceipt.CorrectionConflict array =
    if Environment.GetCommandLineArgs() |> Array.contains "--correction-conflict" then
        [| { NormalizedSurface = "now"
             ContentIds = [| "correction-b"; "correction-a" |] } |]
    else
        [||]

LexicalGeometricReceipt.project (calibration orderedEntries) conflicts lexicon "I you now unknown"
|> renderReceipt
|> printfn "%s"
