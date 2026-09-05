namespace Zeta.Bayesian.Tests

open Xunit
open Zeta.Bayesian
open Zeta.Core

module LexicalGeometricBayesianAdapterTests =

    let private resolved : LexicalGeometricReceipt.Projection =
        let seedIds = Set.ofList [ "seed-i" ]
        let lexicon =
            LexicalGeometricReceipt.tryCreateLexicon seedIds [ "i", "seed-i" ]
            |> Result.defaultWith (fun error -> failwithf "fixture lexicon refused: %A" error)
        let calibration =
            LexicalGeometricReceipt.tryCreateCalibration
                seedIds
                { Algorithm = LexicalGeometricReceipt.Algorithm
                  CalibrationVersion = "non-personal-fixture/v1"
                  SeedVersion = "nsm-english-candidate/v0"
                  Entries =
                    [| { SeedId = "seed-i"
                         Rgb = "#FF0000"
                         X = 0.25
                         Y = -0.5
                         Z = 0.75
                         UncertaintyPpm = 250_000 } |] }
            |> Result.defaultWith (fun error -> failwithf "fixture calibration refused: %A" error)
        let receipt = LexicalGeometricReceipt.project calibration [||] lexicon "i"
        receipt.Projections.[0]

    [<Fact>]
    let ``resolved lexical geometry admits one proper frame-tagged Gaussian observation`` () =
        match LexicalGeometricBayesianAdapter.tryAsFrameObservation "personal-fixture-frame" "receipt-1" resolved with
        | Ok observation ->
            let mean = ReferenceFrameFactorHeterarchy.Gaussian3.mean observation.Position
            let covariance = ReferenceFrameFactorHeterarchy.Gaussian3.covariance observation.Position
            Assert.Equal("personal-fixture-frame", observation.Frame)
            Assert.Equal("receipt-1", observation.SourceReceiptFingerprint)
            Assert.Equal(0.25, mean.X, 12)
            Assert.Equal(-0.5, mean.Y, 12)
            Assert.Equal(0.75, mean.Z, 12)
            Assert.Equal(0.25000075, covariance.XX, 12)
            Assert.True(ReferenceFrameFactorHeterarchy.Gaussian3.isProper observation.Position)
        | Error observed -> failwithf "expected a proper finite frame observation, got %A" observed

    [<Fact>]
    let ``unresolved geometry and a blank frame are refused before a Gaussian observation exists`` () =
        let unresolved : LexicalGeometricReceipt.Projection = LexicalGeometricReceipt.UnresolvedToken("unknown", "unknown")
        match
            LexicalGeometricBayesianAdapter.tryAsFrameObservation "" "receipt-1" resolved,
            LexicalGeometricBayesianAdapter.tryAsFrameObservation "frame" "receipt-1" unresolved
        with
        | Error(LexicalGeometricBayesianAdapter.InvalidFrame _), Error(LexicalGeometricBayesianAdapter.UnresolvedProjection _) -> ()
        | observed -> failwithf "expected two pre-admission refusals, got %A" observed
