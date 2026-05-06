module Zeta.Tests.MajiTests

open Xunit
open Zeta.Core.Maji

[<Fact>]
let ``identity distance of identical tuples is zero`` () =
    let id = { emptyIdentity with Values = ["truth"; "consent"]; Goals = ["ship"] }
    let w = { Values = 1.0; Goals = 1.0; Roles = 1.0; Policies = 1.0
              MemoryGraph = 1.0; CorrectionHistory = 1.0; CrossRefTopology = 1.0; Provenance = 1.0 }
    Assert.Equal(0.0, identityDistance w id id)

[<Fact>]
let ``identity distance of disjoint tuples is maximal`` () =
    let a = { emptyIdentity with Values = ["truth"] }
    let b = { emptyIdentity with Values = ["lies"] }
    let w = { Values = 1.0; Goals = 0.0; Roles = 0.0; Policies = 0.0
              MemoryGraph = 0.0; CorrectionHistory = 0.0; CrossRefTopology = 0.0; Provenance = 0.0 }
    Assert.Equal(1.0, identityDistance w a b)

[<Fact>]
let ``projection preserved within epsilon`` () =
    let prior = { emptyIdentity with Values = ["truth"; "consent"]; Goals = ["ship"] }
    let expanded = { prior with Goals = ["ship"; "scale"] }
    let w = { Values = 1.0; Goals = 1.0; Roles = 1.0; Policies = 1.0
              MemoryGraph = 1.0; CorrectionHistory = 1.0; CrossRefTopology = 1.0; Provenance = 1.0 }
    Assert.True(projectionPreserved w 0.5 prior expanded)

[<Fact>]
let ``projection NOT preserved when values drift`` () =
    let prior = { emptyIdentity with Values = ["truth"; "consent"; "family"] }
    let drifted = { emptyIdentity with Values = ["power"; "control"] }
    let w = { Values = 1.0; Goals = 0.0; Roles = 0.0; Policies = 0.0
              MemoryGraph = 0.0; CorrectionHistory = 0.0; CrossRefTopology = 0.0; Provenance = 0.0 }
    Assert.False(projectionPreserved w 0.5 prior drifted)

[<Fact>]
let ``MessiahScore capture risk subtracts`` () =
    let score = { AlignmentWithOmega = 1.0; ProjectionPreservation = 1.0
                  FrictionReduction = 1.0; Generativity = 1.0
                  IndependentConvergence = 1.0
                  CaptureRiskRaw = 10.0; CollapseRiskRaw = 0.0 }
    let weights = [| 1.0; 1.0; 1.0; 1.0; 1.0; 1.0; 1.0 |]
    let result = computeScore weights score
    Assert.True(result < 0.0, "High capture risk should produce negative score")

[<Fact>]
let ``MessiahScore collapse risk subtracts`` () =
    let score = { AlignmentWithOmega = 1.0; ProjectionPreservation = 1.0
                  FrictionReduction = 1.0; Generativity = 1.0
                  IndependentConvergence = 1.0
                  CaptureRiskRaw = 0.0; CollapseRiskRaw = 10.0 }
    let weights = [| 1.0; 1.0; 1.0; 1.0; 1.0; 1.0; 1.0 |]
    let result = computeScore weights score
    Assert.True(result < 0.0, "High collapse risk should produce negative score")

[<Fact>]
let ``MajiMode has three constructors`` () =
    let modes = [Search; Steward; SearchAgain]
    Assert.Equal(3, modes.Length)

[<Fact>]
let ``empty index has zero coverage`` () =
    Assert.Equal(0.0, emptyIndex.CoverageScore)
