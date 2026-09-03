#r "../../../src/Core/bin/Debug/net10.0/Zeta.Core.dll"
#r "../../../src/Bayesian/bin/Debug/net10.0/Zeta.Bayesian.dll"

open System
open System.Text.Json
open Zeta.Bayesian

let unwrap = function
    | Ok value -> value
    | Error message -> failwith message

let bits (value: float) = BitConverter.DoubleToInt64Bits value

let priors =
    [| Gaussian.ofMeanVariance -0.5 1.25
       Gaussian.ofMeanVariance 0.25 0.8
       Gaussian.ofMeanVariance 1.0 1.5
       Gaussian.ofMeanVariance -0.75 0.6 |]
let variances = [| 0.4; 0.7; 0.3; 1.1 |]
let sequential = MultilayerBnn.tryCreate priors variances MultilayerBnn.Sequential |> unwrap
let receipt =
    MultilayerBnn.tryInferViaFactorGraph 1e-13 500 true [ 2.0; 2.0; 2.0 ] sequential
    |> unwrap
let denseSequential =
    MultilayerBnn.tryInferExactDenseGaussian [ 2.0; 2.0; 2.0 ] sequential
    |> unwrap
let denseReplay = MultilayerBnn.tryQueryExactDenseGaussian denseSequential.Network |> unwrap
let denseReplayBitInvariant =
    Array.forall2
        (fun left right ->
            bits left.Precision = bits right.Precision
            && bits left.PrecisionMean = bits right.PrecisionMean)
        denseSequential.Marginals
        denseReplay.Marginals
let replay = MultilayerBnn.tryInferViaFactorGraph 1e-13 500 true [] receipt.Network |> unwrap
let replayBitInvariant =
    Array.forall2
        (fun left right ->
            bits left.Precision = bits right.Precision
            && bits left.PrecisionMean = bits right.PrecisionMean)
        receipt.Marginals
        replay.Marginals

let backwardPriors =
    [| Gaussian.ofMeanVariance 0.0 1.0
       Gaussian.ofMeanVariance 0.0 2.0
       Gaussian.ofMeanVariance 8.0 0.1 |]
let backwardNet =
    MultilayerBnn.tryCreate backwardPriors [| 0.5; 0.25; 0.25 |] MultilayerBnn.Sequential
    |> unwrap
let backwardReceipt = MultilayerBnn.tryUpdateViaFactorGraph 1e-13 500 true 0.0 backwardNet |> unwrap
let backwardDelta =
    abs (
        Gaussian.mean backwardReceipt.Marginals.[0]
        - Gaussian.mean backwardReceipt.Network.Layers.[0].Posterior)

let loopyTopology = MultilayerBnn.SkipConnections [ (0, 2); (0, 3); (1, 3) ]
let loopy =
    MultilayerBnn.tryCreate
        (Array.create 4 (Gaussian.ofMeanVariance 0.0 1.0))
        (Array.create 4 1.0)
        loopyTopology
    |> unwrap
let strictError =
    match MultilayerBnn.tryUpdateViaFactorGraph 0.0 1 true 5.0 loopy with
    | Ok _ -> "unexpected-ok"
    | Error message -> message
let permissive = MultilayerBnn.tryUpdateViaFactorGraph 0.0 1 false 5.0 loopy |> unwrap
let convergedLoopy =
    MultilayerBnn.tryInferViaFactorGraph 1e-13 1000 true [ 5.0; 5.0; 5.0; 5.0 ] loopy
    |> unwrap
let denseLoopy =
    MultilayerBnn.tryInferExactDenseGaussian [ 5.0; 5.0; 5.0; 5.0 ] loopy
    |> unwrap
let loopyOnDenseEvidence =
    MultilayerBnn.tryInferViaFactorGraph 1e-13 1000 true [] denseLoopy.Network
    |> unwrap

let malformedError =
    let malformed =
        MultilayerBnn.tryCreate
            (Array.create 2 (Gaussian.ofMeanVariance 0.0 1.0))
            (Array.create 2 1.0)
            (MultilayerBnn.Dag [| []; [ -1 ] |])
        |> unwrap
    match MultilayerBnn.tryUpdateViaFactorGraph 1e-13 100 true 1.0 malformed with
    | Ok _ -> "unexpected-ok"
    | Error message -> message

let report =
    {| sequentialMeans = receipt.Marginals |> Array.map Gaussian.mean
       sequentialVariances = receipt.Marginals |> Array.map Gaussian.variance
       exactDenseSequentialMeans = denseSequential.Marginals |> Array.map Gaussian.mean
       exactDenseSequentialVariances = denseSequential.Marginals |> Array.map Gaussian.variance
       exactDenseLoopyMeans = denseLoopy.Marginals |> Array.map Gaussian.mean
       exactDenseLoopyVariances = denseLoopy.Marginals |> Array.map Gaussian.variance
       loopyOnDenseEvidenceMeans = loopyOnDenseEvidence.Marginals |> Array.map Gaussian.mean
       loopyOnDenseEvidenceVariances = loopyOnDenseEvidence.Marginals |> Array.map Gaussian.variance
       exactDenseLayerCount = denseSequential.LayerCount
       exactDenseAbsorbedObservationCount = denseSequential.AbsorbedObservationCount
       exactDenseReplayBitInvariant = denseReplayBitInvariant
       layerZeroPrecision = receipt.Network.Layers.[0].Posterior.Precision
       layerZeroObservationCount = receipt.Network.Layers.[0].Objective.ObservationCount
       deeperObservationCounts = receipt.Network.Layers.[1..] |> Array.map _.Objective.ObservationCount
       exactness = string receipt.Exactness
       converged = receipt.Converged
       rounds = receipt.Rounds
       replayBitInvariant = replayBitInvariant
       backwardDelta = backwardDelta
       strictError = strictError
       permissiveConverged = permissive.Converged
       permissiveExactness = string permissive.Exactness
       convergedLoopyExactness = string convergedLoopy.Exactness
       malformedError = malformedError |}

printfn "%s" (JsonSerializer.Serialize report)
