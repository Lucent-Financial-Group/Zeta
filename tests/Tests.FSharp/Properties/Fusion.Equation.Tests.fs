module Zeta.Tests.Properties.FusionEquationTests

open FsUnit.Xunit
open global.Xunit
open FsCheck
open FsCheck.Xunit
open Zeta.Core
open Zeta.Core.FusionEquation
type SO = SubstrateOutput


[<Fact>]
let ``learningGain returns 0 when no substrate produced`` () =
    let output =
        { FusionEquation.SubstrateOutput.Rule = false
          HasTest = false
          Doc = false
          RetractionPath = false }
    FusionEquation.learningGain output |> should equal 0.0


[<Fact>]
let ``learningGain returns 1 when all substrate produced`` () =
    let output =
        { FusionEquation.SubstrateOutput.Rule = true
          HasTest = true
          Doc = true
          RetractionPath = true }
    FusionEquation.learningGain output |> should equal 1.0


[<Fact>]
let ``learningGain returns 0.5 when half substrate produced`` () =
    let output =
        { FusionEquation.SubstrateOutput.Rule = true
          HasTest = true
          Doc = false
          RetractionPath = false }
    FusionEquation.learningGain output |> should equal 0.5


[<Fact>]
let ``isAboveThreshold returns true when eta * gain > cost`` () =
    FusionEquation.isAboveThreshold 1.0 0.75 0.5
    |> should be True


[<Fact>]
let ``isAboveThreshold returns false when eta * gain < cost`` () =
    FusionEquation.isAboveThreshold 1.0 0.25 0.5
    |> should be False


[<Fact>]
let ``sustainedFusionRatio is 0 for empty events`` () =
    FusionEquation.sustainedFusionRatio 1.0 Seq.empty
    |> should equal 0.0


[<Fact>]
let ``classifyPhase Heat below 0.8`` () =
    FusionEquation.classifyPhase 0.5
    |> should equal FusionEquation.Phase.Heat


[<Fact>]
let ``classifyPhase Superfluid above 1.2`` () =
    FusionEquation.classifyPhase 2.0
    |> should equal FusionEquation.Phase.Superfluid


[<Fact>]
let ``classifyPhase Threshold in range`` () =
    FusionEquation.classifyPhase 1.0
    |> should equal FusionEquation.Phase.Threshold


[<Property>]
let ``learningGain is always in [0, 1]``
    (r: bool) (t: bool) (d: bool) (p: bool) =
    let output =
        { FusionEquation.SubstrateOutput.Rule = r
          HasTest = t
          Doc = d
          RetractionPath = p }
    let gain = FusionEquation.learningGain output
    gain >= 0.0 && gain <= 1.0


[<Property>]
let ``sustainedFusionRatio is non-negative for non-negative inputs``
    (eta: NormalFloat) =
    let e = abs eta.Get
    let events = [| (0.5, 0.3); (0.8, 0.2); (0.3, 0.7) |]
    FusionEquation.sustainedFusionRatio e events >= 0.0


[<Property>]
let ``isAboveThreshold is consistent with direct comparison``
    (eta: NormalFloat) (gain: NormalFloat) (cost: NormalFloat) =
    let e = abs eta.Get
    let g = abs gain.Get
    let c = abs cost.Get
    FusionEquation.isAboveThreshold e g c = (e * g > c)
