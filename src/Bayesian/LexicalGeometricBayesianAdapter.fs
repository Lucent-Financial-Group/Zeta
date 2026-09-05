namespace Zeta.Bayesian

open System
open Zeta.Core

/// One-way admission adapter from a resolved user-declared lexical geometry
/// receipt to an existing frame-tagged Gaussian observation. This neither
/// infers a posterior nor changes the canonical CRDT evidence-state boundary.
[<RequireQualifiedAccess>]
module LexicalGeometricBayesianAdapter =

    type AdapterError =
        | UnresolvedProjection of LexicalGeometricReceipt.Projection
        | InvalidFrame of string
        | GaussianRejected of ReferenceFrameFactorHeterarchy.TeachingError

    type FrameObservation =
        { Frame: string
          SourceReceiptFingerprint: string
          Position: ReferenceFrameFactorHeterarchy.Gaussian3 }

    let private varianceFromUncertainty uncertaintyPpm =
        1e-6 + (1.0 - 1e-6) * float uncertaintyPpm / 1_000_000.0

    let tryAsFrameObservation frame sourceReceiptFingerprint projection =
        if String.IsNullOrWhiteSpace frame then
            Error(InvalidFrame frame)
        else
            match projection with
            | LexicalGeometricReceipt.Resolved geometry ->
                let variance = varianceFromUncertainty geometry.UncertaintyPpm
                let mean: ReferenceFrameFactorHeterarchy.Vec3 =
                    { X = geometry.Coordinate.E1
                      Y = geometry.Coordinate.E2
                      Z = geometry.Coordinate.E3 }
                let covariance: ReferenceFrameFactorHeterarchy.Symmetric3 =
                    { XX = variance
                      XY = 0.0
                      XZ = 0.0
                      YY = variance
                      YZ = 0.0
                      ZZ = variance }
                ReferenceFrameFactorHeterarchy.Gaussian3.tryOfMeanCovariance mean covariance
                |> Result.mapError GaussianRejected
                |> Result.map (fun position ->
                    { Frame = frame
                      SourceReceiptFingerprint = sourceReceiptFingerprint
                      Position = position })
            | unresolved -> Error(UnresolvedProjection unresolved)
