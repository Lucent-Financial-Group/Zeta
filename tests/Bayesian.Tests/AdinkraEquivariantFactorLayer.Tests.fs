namespace Zeta.Bayesian.Tests

open System
open Xunit
open Zeta.Bayesian
open Zeta.Bayesian.AdinkraEquivariantFactorLayer

module AdinkraEquivariantFactorLayerTests =

    let private beliefs equalVariance =
        Array.init 16 (fun index ->
            let variance = if equalVariance then 2.0 else 1.0 + float index * 0.125
            Gaussian.ofMeanVariance (float index - 7.5) variance)

    let private assertNear expected actual =
        Assert.True(abs (expected - actual) < 1e-11, sprintf "expected %.17g, got %.17g" expected actual)

    let private get = function
        | Ok value -> value
        | Error error -> failwithf "unexpected error: %A" error

    [<Fact>]
    let ``AEFL-1 sectorization preserves means and variances through exact round trip`` () =
        let input = beliefs false
        let sectorized = trySectorize 0 input |> get
        let restored = roundTrip sectorized
        Assert.Equal(8, sectorized.Plus.Length)
        Assert.Equal(8, sectorized.Minus.Length)
        Assert.Equal("not-used: source-sector adapter", sectorized.TargetSelector)
        Array.iter2 (fun expected actual ->
            assertNear (Gaussian.mean expected) (Gaussian.mean actual)
            assertNear (Gaussian.variance expected) (Gaussian.variance actual)) input restored

    [<Fact>]
    let ``AEFL-2 sector beliefs become real independent Gaussian factor roots`` () =
        let sectorized = trySectorize 0 (beliefs true) |> get
        let layer = tryAddPriorFactors 100 500 Forward sectorized |> get
        Assert.Equal<int array>([| 100 .. 107 |], layer.PlusVariables)
        Assert.Equal<int array>([| 108 .. 115 |], layer.MinusVariables)
        for index in 0 .. 7 do
            let plus = FactorGraph.marginal layer.PlusVariables.[index] layer.Graph
            let minus = FactorGraph.marginal layer.MinusVariables.[index] layer.Graph
            assertNear (Gaussian.mean sectorized.Plus.[index].Belief) (Gaussian.mean plus)
            assertNear (Gaussian.variance sectorized.Plus.[index].Belief) (Gaussian.variance plus)
            assertNear (Gaussian.mean sectorized.Minus.[index].Belief) (Gaussian.mean minus)
            assertNear (Gaussian.variance sectorized.Minus.[index].Belief) (Gaussian.variance minus)

    [<Fact>]
    let ``AEFL-3 unequal variances are preserved because the central word is diagonal`` () =
        let input = beliefs false
        let sectorized = trySectorize 0 (beliefs false) |> get
        let restored = roundTrip sectorized
        Array.iter2 (fun expected actual -> assertNear (Gaussian.variance expected) (Gaussian.variance actual)) input restored

    [<Fact>]
    let ``AEFL-4 representative choices canonicalize to the same sector messages`` () =
        let input = beliefs true
        let baseline = trySectorize 0 input |> get
        Assert.Equal<int array>([| 1; 2; 4; 7; 8; 11; 13; 14 |], baseline.Plus |> Array.map _.Input)
        Assert.Equal<int array>([| 0; 3; 5; 6; 9; 10; 12; 15 |], baseline.Minus |> Array.map _.Input)
        for repSeed in [ 1; 3; 5; 17; 85; 255 ] do
            let candidate = trySectorize repSeed input |> get
            Assert.Equal<SectorFeature array>(baseline.Plus, candidate.Plus)
            Assert.Equal<SectorFeature array>(baseline.Minus, candidate.Minus)

    [<Fact>]
    let ``AEFL-5 generator reversal swaps labels but preserves the unordered sector pair`` () =
        let input = beliefs true
        let baseline = trySectorizeWithMutation 0 Baseline input |> get
        let reversed = trySectorizeWithMutation 0 ReverseGeneratorOrder input |> get
        Assert.Equal<int array>(baseline.Plus |> Array.map _.Input, reversed.Minus |> Array.map _.Input)
        Assert.Equal<int array>(baseline.Minus |> Array.map _.Input, reversed.Plus |> Array.map _.Input)
        Assert.Equal<int array>([| 0; 3; 5; 6; 9; 10; 12; 15 |], reversed.Plus |> Array.map _.Input)
        Assert.Equal<int array>([| 1; 2; 4; 7; 8; 11; 13; 14 |], reversed.Minus |> Array.map _.Input)
        Assert.Equal("reversed", reversed.Orientation)

    [<Fact>]
    let ``AEFL-6 malformed source action is refused before Bayesian conversion`` () =
        match trySectorizeWithMutation 0 FlipFirstGeneratorCoordinate (beliefs true) with
        | Error (SourceAlgebraViolation (clifford, centrality, _)) ->
            Assert.Equal(14, clifford)
            Assert.Equal(14, centrality)
        | other -> failwithf "expected source algebra refusal, got %A" other

    [<Fact>]
    let ``AEFL-7 factor insertion order does not change Gaussian marginals`` () =
        let sectorized = trySectorize 0 (beliefs true) |> get
        let forward = tryAddPriorFactors 0 100 Forward sectorized |> get
        let reverse = tryAddPriorFactors 0 100 Reverse sectorized |> get
        for variable in 0 .. 15 do
            let a = FactorGraph.marginal variable forward.Graph
            let b = FactorGraph.marginal variable reverse.Graph
            Assert.Equal(a, b)

    [<Fact>]
    let ``AEFL-8 DAG descriptor is a non-learning independent-root schema`` () =
        let sectorized = trySectorize 0 (beliefs true) |> get
        let descriptor = tryToFactorDagLayer 200 sectorized |> get
        Assert.Equal<int array>([| 200 .. 215 |], descriptor.NodeIds)
        Assert.All(descriptor.Parents, fun parents -> Assert.Empty parents)
        Assert.False(descriptor.LearnsWeights)
        Assert.Contains("independent Gaussian roots", descriptor.Exactness)

    [<Fact>]
    let ``AEFL-9 pure Gaussian factor graph baseline remains unchanged`` () =
        let prior = Gaussian.ofMeanVariance 3.5 1.25
        let graph = FactorGraph.empty Gaussian.algebra |> FactorGraph.addFactor 9 (Factor.prior 4 prior) |> FactorGraph.passOnce
        Assert.Equal(prior, FactorGraph.marginal 4 graph)

    [<Fact>]
    let ``AEFL-10 invalid and improper inputs are teaching errors`` () =
        match trySectorize 0 [||] with
        | Error (InvalidFeatureCount 0) -> ()
        | other -> failwithf "expected feature-count error, got %A" other
        let improper = beliefs true
        improper.[7] <- Gaussian.One
        match trySectorize 0 improper with
        | Error (ImproperInput 7) -> ()
        | other -> failwithf "expected improper-input error, got %A" other
