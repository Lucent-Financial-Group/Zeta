namespace Zeta.Core

open System
open System.Globalization
open System.Security.Cryptography
open System.Text

/// Deterministic aggregate receipt for the finite contextual-grid v1 carrier.
///
/// It is a result serializer and verifier for one declared roster only. It does
/// not claim paper reproduction, general transfer, intrinsic motivation, or a
/// society-level outcome. A caller must retain a cross-oracle mismatch rather
/// than treating this module's own output as independently verified evidence.
[<RequireQualifiedAccess>]
module ContextualGridResultReceipt =

    [<Literal>]
    let SchemaVersion = "zeta.contextual-grid/result-receipt/v1"

    [<Literal>]
    let SeedFirst = 0UL

    [<Literal>]
    let SeedLast = 99UL

    [<Literal>]
    let SeedCount = 100

    [<Literal>]
    let BootstrapReplicates = 10_000

    [<Literal>]
    let BootstrapResamplerSeed = 0x4354584752494456UL

    [<Literal>]
    let BootstrapConfidenceLevelPercent = 95

    let private expectedPolicies =
        [ ContextualGridBenchmark.UniformRandom
          ContextualGridBenchmark.QEpsilon
          ContextualGridBenchmark.QUcb
          ContextualGridBenchmark.CountFirst ]

    type RosterFailure =
        | IncompleteOrNoncanonicalRoster of detail: string
        | CarrierVerificationFailure of detail: string
        | UnexpectedRunnerAdmissionFailure of ContextualGridBenchmark.AdmissionFailure

    type SeedRow =
        { Seed: uint64
          HeldOutReturnPpm: int
          TrainingGoalEpisodes: int
          TrainingReturnPpm: int64
          TrainingUniqueStates: int
          TrainingUniqueStateActions: int
          MeanPreIncrementNoveltyBits: string
          TrainingTraceDigest: string
          EvaluationTraceDigest: string
          QDigestBeforeEvaluation: string
          QDigestAfterEvaluation: string
          StreamDraws: int }

    type PolicyRow =
        { Policy: string
          MeanHeldOutReturnPpm: int64
          MeanSuboptimalityPpm: int64
          Seeds: SeedRow list }

    type BootstrapComparison =
        { BaselinePolicy: string
          CandidateMeanDeltaPpm: int64
          LowerPpm: int64
          UpperPpm: int64 }

    type BootstrapReceipt =
        { Draws: int
          Rejections: int
          IndexDigest: string
          Comparisons: BootstrapComparison list }

    type ResultReceipt =
        { OptimalHeldOutReturnPpm: int
          Policies: PolicyRow list
          Bootstrap: BootstrapReceipt
          ComparisonVerdict: string }

    let canonicalRoster = [ SeedFirst .. SeedLast ]

    let private sha256Hex (bytes: byte array) =
        SHA256.HashData bytes |> Convert.ToHexString |> fun value -> value.ToLowerInvariant()

    let private digestText (text: string) =
        text |> Encoding.UTF8.GetBytes |> sha256Hex

    let private quote (value: string) = "\"" + value + "\""

    let private policyName policy =
        match policy with
        | ContextualGridBenchmark.UniformRandom -> "uniform-random/v1"
        | ContextualGridBenchmark.QEpsilon -> "q-epsilon/v1"
        | ContextualGridBenchmark.QUcb -> "q-ucb/v1"
        | ContextualGridBenchmark.CountFirst -> "count-first/v1"

    let private floatBits (value: float) =
        BitConverter.DoubleToInt64Bits value
        |> uint64
        |> fun bits -> bits.ToString("x16", CultureInfo.InvariantCulture)

    let private validateRoster roster =
        if roster = canonicalRoster then
            Ok()
        else
            Error(IncompleteOrNoncanonicalRoster "roster must be the exact ascending unsigned sequence 0 through 99")

    let private seedRow (receipt: ContextualGridBenchmark.RunReceipt) =
        { Seed = receipt.Seed
          HeldOutReturnPpm = receipt.HeldOutReturnPpm
          TrainingGoalEpisodes = receipt.TrainingGoalEpisodes
          TrainingReturnPpm = receipt.TrainingReturnPpm
          TrainingUniqueStates = receipt.TrainingUniqueStates
          TrainingUniqueStateActions = receipt.TrainingUniqueStateActions
          MeanPreIncrementNoveltyBits = floatBits receipt.MeanPreIncrementNovelty
          TrainingTraceDigest = receipt.TrainingTraceDigest
          EvaluationTraceDigest = receipt.EvaluationTraceDigest
          QDigestBeforeEvaluation = receipt.QDigestBeforeEvaluation
          QDigestAfterEvaluation = receipt.QDigestAfterEvaluation
          StreamDraws = receipt.StreamDraws }

    let private runPolicy policy roster =
        let rec loop remaining completed =
            match remaining with
            | [] -> Ok(List.rev completed)
            | seed :: tail ->
                match ContextualGridBenchmark.runKnown policy seed with
                | Ok receipt -> loop tail (seedRow receipt :: completed)
                | Error failure -> Error(UnexpectedRunnerAdmissionFailure failure)
        loop roster []

    let private meanPpm values =
        let total = values |> List.fold (fun acc value -> acc + int64 value) 0L
        total / int64 SeedCount

    let private drawBootstrapIndex stream =
        let word, next = ContextualGridBenchmark.nextStream stream
        let lower32 = uint32 word
        if lower32 >= 4_294_967_200u then
            None, next
        else
            Some(int (lower32 % 100u)), next

    let private bootstrapIndices () =
        let mutable stream: ContextualGridBenchmark.Stream = { State = BootstrapResamplerSeed; Draws = 0 }
        let mutable rejections = 0
        let mutable accepted: int list = []
        let mutable replicates: int list list = []
        for _ in 1 .. BootstrapReplicates do
            let mutable replica: int list = []
            while replica.Length < SeedCount do
                let index, next = drawBootstrapIndex stream
                stream <- next
                match index with
                | Some value ->
                    accepted <- value :: accepted
                    replica <- value :: replica
                | None -> rejections <- rejections + 1
            replicates <- List.rev replica :: replicates
        let orderedAccepted = List.rev accepted
        let indexDigest = orderedAccepted |> List.map string |> String.concat "\n" |> digestText
        List.rev replicates, stream.Draws, rejections, indexDigest

    let private percentileIndices =
        let lower = int (floor (0.025 * float (BootstrapReplicates - 1)))
        let upper = int (ceil (0.975 * float (BootstrapReplicates - 1)))
        lower, upper

    let private bootstrapComparison baseline candidate samples =
        let deltas =
            List.map2
                (fun candidateRow baselineRow -> int64 baselineRow.HeldOutReturnPpm - int64 candidateRow.HeldOutReturnPpm)
                candidate
                baseline
        let mean = (deltas |> List.sum) / int64 SeedCount
        let estimates =
            samples
            |> List.map (fun indices -> (indices |> List.sumBy (fun index -> deltas.[index])) / int64 SeedCount)
            |> List.sort
        let lowerIndex, upperIndex = percentileIndices
        mean, estimates.[lowerIndex], estimates.[upperIndex]

    let private makeBootstrap policyRows =
        let candidate = policyRows |> List.find (fun row -> row.Policy = "count-first/v1")
        let samples, draws, rejections, indexDigest = bootstrapIndices ()
        let comparisons =
            policyRows
            |> List.filter (fun row -> row.Policy <> candidate.Policy)
            |> List.map (fun baseline ->
                let mean, lower, upper = bootstrapComparison baseline.Seeds candidate.Seeds samples
                { BaselinePolicy = baseline.Policy
                  CandidateMeanDeltaPpm = mean
                  LowerPpm = lower
                  UpperPpm = upper })
        { Draws = draws
          Rejections = rejections
          IndexDigest = indexDigest
          Comparisons = comparisons }

    let private comparisonVerdict bootstrap =
        let delta baseline =
            bootstrap.Comparisons
            |> List.find (fun comparison -> comparison.BaselinePolicy = baseline)
            |> fun comparison -> comparison.CandidateMeanDeltaPpm
        let betterThanUniform = delta "uniform-random/v1" < 0L
        let betterThanEpsilon = delta "q-epsilon/v1" < 0L
        let noWorseThanUcb = delta "q-ucb/v1" <= 0L
        if betterThanUniform && betterThanEpsilon && noWorseThanUcb then
            "criterion-met-on-declared-grid"
        elif betterThanUniform && betterThanEpsilon then
            "criterion-met-except-ucb-on-declared-grid"
        else
            "criterion-not-met-on-declared-grid"

    let run roster : Result<ResultReceipt, RosterFailure> =
        match validateRoster roster with
        | Error failure -> Error failure
        | Ok() ->
            let rec collect policies completed =
                match policies with
                | [] -> Ok(List.rev completed)
                | policy :: tail ->
                    match runPolicy policy roster with
                    | Error failure -> Error failure
                    | Ok rows ->
                        let meanHeldOut = rows |> List.map (fun row -> row.HeldOutReturnPpm) |> meanPpm
                        let optimal = ContextualGridBenchmark.optimalHeldOutReturn ContextualGridBenchmark.EpisodeActionCap
                        let policyRow =
                            { Policy = policyName policy
                              MeanHeldOutReturnPpm = meanHeldOut
                              MeanSuboptimalityPpm = int64 optimal - meanHeldOut
                              Seeds = rows }
                        collect tail (policyRow :: completed)
            match collect expectedPolicies [] with
            | Error failure -> Error failure
            | Ok policyRows ->
                let bootstrap = makeBootstrap policyRows
                Ok
                    { OptimalHeldOutReturnPpm = ContextualGridBenchmark.optimalHeldOutReturn ContextualGridBenchmark.EpisodeActionCap
                      Policies = policyRows
                      Bootstrap = bootstrap
                      ComparisonVerdict = comparisonVerdict bootstrap }

    let runVerified repositoryRoot roster =
        match ContextualGridBenchmark.verifyRepositoryCarriers repositoryRoot with
        | Error failure -> Error(CarrierVerificationFailure failure)
        | Ok() -> run roster

    let runCanonical repositoryRoot = runVerified repositoryRoot canonicalRoster

    let private renderSeedRow row =
        String.concat ""
            [ "{\"seed\":"; quote (string row.Seed)
              ",\"heldOutReturnPpm\":"; string row.HeldOutReturnPpm
              ",\"trainingGoalEpisodes\":"; string row.TrainingGoalEpisodes
              ",\"trainingReturnPpm\":"; string row.TrainingReturnPpm
              ",\"trainingUniqueStates\":"; string row.TrainingUniqueStates
              ",\"trainingUniqueStateActions\":"; string row.TrainingUniqueStateActions
              ",\"meanPreIncrementNoveltyBits\":"; quote row.MeanPreIncrementNoveltyBits
              ",\"trainingTraceDigest\":"; quote row.TrainingTraceDigest
              ",\"evaluationTraceDigest\":"; quote row.EvaluationTraceDigest
              ",\"qDigestBeforeEvaluation\":"; quote row.QDigestBeforeEvaluation
              ",\"qDigestAfterEvaluation\":"; quote row.QDigestAfterEvaluation
              ",\"streamDraws\":"; string row.StreamDraws; "}" ]

    let private renderPolicyRow row =
        String.concat ""
            [ "{\"policy\":"; quote row.Policy
              ",\"meanHeldOutReturnPpm\":"; string row.MeanHeldOutReturnPpm
              ",\"meanSuboptimalityPpm\":"; string row.MeanSuboptimalityPpm
              ",\"seeds\":["; row.Seeds |> List.map renderSeedRow |> String.concat ","; "]}" ]

    let private renderBootstrapComparison comparison =
        String.concat ""
            [ "{\"baselinePolicy\":"; quote comparison.BaselinePolicy
              ",\"candidateMeanDeltaPpm\":"; string comparison.CandidateMeanDeltaPpm
              ",\"lowerPpm\":"; string comparison.LowerPpm
              ",\"upperPpm\":"; string comparison.UpperPpm; "}" ]

    /// Emits the exact canonical UTF-8 receipt text described by the v1 result contract.
    let render receipt =
        String.concat ""
            [ "{\"schemaVersion\":"; quote SchemaVersion
              ",\"configuration\":{\"actionCap\":"; string ContextualGridBenchmark.EpisodeActionCap
              ",\"episodes\":"; string ContextualGridBenchmark.TrainingEpisodes
              ",\"seedCount\":"; string SeedCount
              ",\"seedFirst\":"; quote (string SeedFirst)
              ",\"seedLast\":"; quote (string SeedLast); "}"
              ",\"environmentFingerprint\":"; quote ContextualGridBenchmark.EnvironmentFingerprint
              ",\"evaluatorCatalogueFingerprint\":"; quote ContextualGridBenchmark.EvaluatorCatalogueFingerprint
              ",\"optimalHeldOutReturnPpm\":"; string receipt.OptimalHeldOutReturnPpm
              ",\"policies\":["; receipt.Policies |> List.map renderPolicyRow |> String.concat ","; "]"
              ",\"bootstrap\":{\"confidenceLevelPercent\":"; string BootstrapConfidenceLevelPercent
              ",\"replicates\":"; string BootstrapReplicates
              ",\"resamplerSeed\":"; quote (string BootstrapResamplerSeed)
              ",\"draws\":"; string receipt.Bootstrap.Draws
              ",\"rejections\":"; string receipt.Bootstrap.Rejections
              ",\"indexDigest\":"; quote receipt.Bootstrap.IndexDigest
              ",\"comparisons\":["; receipt.Bootstrap.Comparisons |> List.map renderBootstrapComparison |> String.concat ","; "]}"
              ",\"comparisonVerdict\":"; quote receipt.ComparisonVerdict; "}" ]

    /// Compares receipt bytes with an already executed canonical replay. A
    /// different byte string is a refusal, never a parser-normalized success.
    let verifyRenderedReceipt (receipt: ResultReceipt) (text: string) : Result<unit, string> =
        let expected = render receipt
        if text = expected then Ok() else Error "INVALID_RECEIPT: bytes differ from canonical 100-seed replay"

    /// Replays the unique admitted roster and compares every emitted byte.
    /// This convenience function is intentionally retained for external callers;
    /// tests should reuse their fresh replay through `verifyRenderedReceipt`.
    let verifyCanonicalReceipt repositoryRoot (text: string) : Result<unit, string> =
        match runCanonical repositoryRoot with
        | Error failure -> Error(sprintf "could not replay canonical receipt: %A" failure)
        | Ok receipt -> verifyRenderedReceipt receipt text
