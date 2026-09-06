namespace Zeta.Core

open System
open System.Globalization
open System.IO
open System.Security.Cryptography
open System.Text
open System.Text.Json

/// A finite, deterministic contextual-grid benchmark carrier.
///
/// Design boundary: this module measures declared tabular policies on one frozen
/// environment. It does not select a global fitness function, infer semantics,
/// apply tangle steering, or compute a society-level objective. The runner refuses
/// a mismatched environment or evaluator catalogue fingerprint before action one.
[<RequireQualifiedAccess>]
module ContextualGridBenchmark =

    [<Literal>]
    let EnvironmentFingerprint = "389fca213b59a18f9afe32640a0cefffc32c7423e155dd7fc866e8b4ed3e6338"

    [<Literal>]
    let EvaluatorCatalogueFingerprint = "bedd7617e115d7d4a718edd2d5906bfb945a5b7ddbf385a50b17ae279d6b916c"

    [<Literal>]
    let EnvironmentManifestRelativePath = "docs/research/data/2026-09-05-contextual-grid-v1-manifest.json"

    [<Literal>]
    let EvaluatorCatalogueRelativePath = "docs/research/data/2026-09-05-contextual-grid-v1-evaluator-catalogue.json"

    [<Literal>]
    let TrainingEpisodes = 1000

    [<Literal>]
    let EpisodeActionCap = 250

    type Position = { X: int; Y: int }

    type Action =
        | North
        | East
        | South
        | West

    type Policy =
        | UniformRandom
        | QEpsilon
        | QUcb
        | CountFirst

    type AdmissionFailure =
        | UnknownFingerprint of supplied: string
        | CatalogueFingerprintMismatch of supplied: string

    type CarrierId =
        | V1
        | ReflectX

    type Carrier =
        { Id: CarrierId
          EnvironmentFingerprint: string
          EvaluatorCatalogueFingerprint: string
          EnvironmentManifestRelativePath: string
          EvaluatorCatalogueRelativePath: string
          TrainingStart: Position
          HeldOutStart: Position
          Goal: Position
          NonterminalRewardPpm: int
          TerminalRewardPpm: int }

    type Stream =
        { State: uint64
          Draws: int }

    type RunReceipt =
        { Policy: string
          Seed: uint64
          HeldOutReturnPpm: int
          HeldOutActions: string list
          TrainingGoalEpisodes: int
          TrainingReturnPpm: int64
          TrainingUniqueStates: int
          TrainingUniqueStateActions: int
          MeanPreIncrementNovelty: float
          TrainingTraceDigest: string
          EvaluationTraceDigest: string
          QDigestBeforeEvaluation: string
          QDigestAfterEvaluation: string
          StreamDraws: int }

    let private actions = [ North; East; South; West ]
    let private trainingStart = { X = 0; Y = 0 }
    let private heldOutStart = { X = 0; Y = 4 }
    let private goal = { X = 4; Y = 0 }
    let private nonterminalRewardPpm = -40_000
    let private terminalRewardPpm = 2_000_000

    let private actionName action =
        match action with
        | North -> "north"
        | East -> "east"
        | South -> "south"
        | West -> "west"

    let private reflectedEnvironmentFingerprint = "7477bb597b44805212e7202751ad4988dcae81e4c22e418f7f892cb1c35a1d5a"
    let private reflectedEvaluatorCatalogueFingerprint = "1872f54a6fce5f54e3a52456c443012e01c71a8cce33515ef28fb07465da39d7"
    let private reflectedEnvironmentManifestRelativePath = "docs/research/data/2026-09-06-contextual-grid-v1-reflect-x-manifest.json"
    let private reflectedEvaluatorCatalogueRelativePath = "docs/research/data/2026-09-06-contextual-grid-v1-reflect-x-evaluator-catalogue.json"
    let private canonicalActionNames = [ "north"; "east"; "south"; "west" ]

    let private v1Carrier =
        { Id = V1
          EnvironmentFingerprint = EnvironmentFingerprint
          EvaluatorCatalogueFingerprint = EvaluatorCatalogueFingerprint
          EnvironmentManifestRelativePath = EnvironmentManifestRelativePath
          EvaluatorCatalogueRelativePath = EvaluatorCatalogueRelativePath
          TrainingStart = trainingStart
          HeldOutStart = heldOutStart
          Goal = goal
          NonterminalRewardPpm = nonterminalRewardPpm
          TerminalRewardPpm = terminalRewardPpm }

    let private policyName policy =
        match policy with
        | UniformRandom -> "uniform-random/v1"
        | QEpsilon -> "q-epsilon/v1"
        | QUcb -> "q-ucb/v1"
        | CountFirst -> "count-first/v1"

    let private sha256Hex (bytes: byte array) =
        SHA256.HashData bytes |> Convert.ToHexString |> fun value -> value.ToLowerInvariant()

    let private digestText (text: string) =
        text |> Encoding.UTF8.GetBytes |> sha256Hex

    let private verifyFile (root: string) (relativePath: string) (expected: string) : Result<unit, string> =
        let path = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar))
        if not (File.Exists path) then
            Error(sprintf "missing benchmark carrier: %s" path)
        else
            let actual = File.ReadAllBytes path |> sha256Hex
            if actual = expected then Ok() else Error(sprintf "carrier hash mismatch for %s: %s" relativePath actual)

    let private parsePosition (property: JsonElement) =
        let values = property.EnumerateArray() |> Seq.toList
        match values with
        | [ x; y ] -> { X = x.GetInt32(); Y = y.GetInt32() }
        | _ -> failwith "carrier position must be a two-element coordinate"

    let private metadata carrierId =
        match carrierId with
        | V1 ->
            EnvironmentFingerprint,
            EvaluatorCatalogueFingerprint,
            EnvironmentManifestRelativePath,
            EvaluatorCatalogueRelativePath,
            "zeta.contextual-grid/v1",
            "zeta.contextual-grid/evaluators/v1"
        | ReflectX ->
            reflectedEnvironmentFingerprint,
            reflectedEvaluatorCatalogueFingerprint,
            reflectedEnvironmentManifestRelativePath,
            reflectedEvaluatorCatalogueRelativePath,
            "zeta.contextual-grid/v1-reflect-x",
            "zeta.contextual-grid/evaluators/v1-reflect-x"

    /// Loads a carrier only after its two raw-byte identities and their explicit
    /// environment binding are verified. Equivalent parsed JSON is insufficient.
    let loadVerifiedCarrier repositoryRoot carrierId : Result<Carrier, string> =
        let environmentFingerprint, catalogueFingerprint, environmentPath, cataloguePath, transitionVersion, catalogueVersion = metadata carrierId
        match verifyFile repositoryRoot environmentPath environmentFingerprint with
        | Error failure -> Error failure
        | Ok() ->
            match verifyFile repositoryRoot cataloguePath catalogueFingerprint with
            | Error failure -> Error failure
            | Ok() ->
                try
                    let environmentBytes = File.ReadAllBytes(Path.Combine(repositoryRoot, environmentPath.Replace('/', Path.DirectorySeparatorChar)))
                    let catalogueBytes = File.ReadAllBytes(Path.Combine(repositoryRoot, cataloguePath.Replace('/', Path.DirectorySeparatorChar)))
                    use environment = JsonDocument.Parse environmentBytes
                    use catalogue = JsonDocument.Parse catalogueBytes
                    let root = environment.RootElement
                    let actionNames = root.GetProperty("actions").EnumerateArray() |> Seq.map (fun value -> value.GetString()) |> Seq.toList
                    let catalogueEntries = catalogue.RootElement.GetProperty("entries").EnumerateArray() |> Seq.map (fun value -> value.GetString()) |> Seq.toList
                    if actionNames <> canonicalActionNames then
                        Error "carrier action order is not the declared canonical order"
                    elif root.GetProperty("transitionVersion").GetString() <> transitionVersion then
                        Error "carrier transition version does not match selected identity"
                    elif catalogue.RootElement.GetProperty("catalogueVersion").GetString() <> catalogueVersion then
                        Error "carrier catalogue version does not match selected identity"
                    elif catalogue.RootElement.GetProperty("environmentFingerprint").GetString() <> environmentFingerprint then
                        Error "carrier catalogue is not bound to the selected environment fingerprint"
                    elif catalogueEntries <> [ "external-return/v1"; "state-action-count/v1"; "q-epsilon/v1"; "q-ucb/v1"; "count-first/v1" ] then
                        Error "carrier evaluator entries are not the declared canonical catalogue"
                    else
                        Ok
                            { Id = carrierId
                              EnvironmentFingerprint = environmentFingerprint
                              EvaluatorCatalogueFingerprint = catalogueFingerprint
                              EnvironmentManifestRelativePath = environmentPath
                              EvaluatorCatalogueRelativePath = cataloguePath
                              TrainingStart = parsePosition (root.GetProperty("trainingStart"))
                              HeldOutStart = parsePosition (root.GetProperty("heldOutStart"))
                              Goal = parsePosition (root.GetProperty("goal"))
                              NonterminalRewardPpm = root.GetProperty("nonterminalRewardPpm").GetInt32()
                              TerminalRewardPpm = root.GetProperty("terminalRewardPpm").GetInt32() }
                with error -> Error(sprintf "carrier parse failure: %s" error.Message)

    /// Verifies exact raw carrier bytes. Parsing equivalent JSON is intentionally insufficient.
    let verifyRepositoryCarriers (repositoryRoot: string) : Result<unit, string> =
        match verifyFile repositoryRoot EnvironmentManifestRelativePath EnvironmentFingerprint with
        | Error failure -> Error failure
        | Ok() -> verifyFile repositoryRoot EvaluatorCatalogueRelativePath EvaluatorCatalogueFingerprint

    let private admitCarrier carrier environmentFingerprint evaluatorCatalogueFingerprint : Result<unit, AdmissionFailure> =
        if environmentFingerprint <> carrier.EnvironmentFingerprint then
            Error(UnknownFingerprint environmentFingerprint)
        elif evaluatorCatalogueFingerprint <> carrier.EvaluatorCatalogueFingerprint then
            Error(CatalogueFingerprintMismatch evaluatorCatalogueFingerprint)
        else
            Ok()

    /// Retained v1 admission wrapper for existing callers and regression receipts.
    let admit environmentFingerprint evaluatorCatalogueFingerprint : Result<unit, AdmissionFailure> =
        admitCarrier v1Carrier environmentFingerprint evaluatorCatalogueFingerprint

    /// Benchmark-local stateful SplitMix64 stream. It reuses the repository's
    /// published constants but deliberately does not claim that the stateless
    /// `SplitMix64.mix` function is already a stateful stream interface.
    let nextStream (stream: Stream) : uint64 * Stream =
        let nextState = stream.State + 0x9E3779B97F4A7C15UL
        let mutable z = nextState
        z <- (z ^^^ (z >>> 30)) * 0xBF58476D1CE4E5B9UL
        z <- (z ^^^ (z >>> 27)) * 0x94D049BB133111EBUL
        z ^^^ (z >>> 31), { State = nextState; Draws = stream.Draws + 1 }

    let rec private drawBelow bound stream =
        if bound <= 0 then invalidArg "bound" "drawBelow requires a positive bound"
        let value, next = nextStream stream
        let bound64 = uint64 bound
        let limit = UInt64.MaxValue - (UInt64.MaxValue % bound64)
        if value >= limit then drawBelow bound next else int (value % bound64), next

    let private qValue q key = Map.tryFind key q |> Option.defaultValue 0.0
    let private countValue counts key = Map.tryFind key counts |> Option.defaultValue 0

    let private greedyAction q position =
        actions
        |> List.fold (fun best candidate ->
            if qValue q (position, candidate) > qValue q (position, best) then candidate else best) North

    let private minimumCountAction counts position stream =
        let minimum = actions |> List.map (fun action -> countValue counts (position, action)) |> List.min
        let candidates = actions |> List.filter (fun action -> countValue counts (position, action) = minimum)
        let index, next = drawBelow candidates.Length stream
        candidates.[index], next

    let private chooseTrainingAction policy q counts time stream position =
        match policy with
        | UniformRandom ->
            let index, next = drawBelow actions.Length stream
            actions.[index], next
        | QEpsilon ->
            let sample, sampled = drawBelow 10 stream
            if sample = 0 then
                let index, next = drawBelow actions.Length sampled
                actions.[index], next
            else
                greedyAction q position, sampled
        | QUcb ->
            let unseen = actions |> List.filter (fun action -> countValue counts (position, action) = 0)
            if not unseen.IsEmpty then
                let index, next = drawBelow unseen.Length stream
                unseen.[index], next
            else
                let t = float (max 1 (time + 1))
                let score action =
                    let visits = float (countValue counts (position, action))
                    qValue q (position, action) + 45.0 * sqrt (log t / visits)
                let bestScore = actions |> List.map score |> List.max
                let candidates = actions |> List.filter (fun action -> score action = bestScore)
                let index, next = drawBelow candidates.Length stream
                candidates.[index], next
        | CountFirst -> minimumCountAction counts position stream

    let private transition carrier position action =
        let dx, dy =
            match action with
            | North -> 0, -1
            | East -> 1, 0
            | South -> 0, 1
            | West -> -1, 0
        let attempted = { X = position.X + dx; Y = position.Y + dy }
        let next =
            if attempted.X < 0 || attempted.X > 4 || attempted.Y < 0 || attempted.Y > 4 then position else attempted
        if next = carrier.Goal then next, carrier.TerminalRewardPpm, true else next, carrier.NonterminalRewardPpm, false

    let private maxNextQ q position = actions |> List.map (fun action -> qValue q (position, action)) |> List.max

    /// Computes the finite-horizon, undiscounted held-out return directly from
    /// the declared transition/reward table. It does not inspect a learned Q
    /// table and therefore remains an external denominator for suboptimality.
    let optimalHeldOutReturnFor carrier actionCap =
        if actionCap < 0 then invalidArg "actionCap" "actionCap must be non-negative"
        let positions =
            [ for y in 0 .. 4 do
                  for x in 0 .. 4 do
                      yield { X = x; Y = y } ]
        let mutable previous = positions |> List.map (fun position -> position, 0) |> Map.ofList
        for _ in 1 .. actionCap do
            previous <-
                positions
                |> List.map (fun position ->
                    let best =
                        actions
                        |> List.map (fun action ->
                            let next, reward, terminal = transition carrier position action
                            reward + if terminal then 0 else Map.find next previous)
                        |> List.max
                    position, best)
                |> Map.ofList
        Map.find carrier.HeldOutStart previous

    /// Retained v1 dynamic-programming denominator for existing result receipts.
    let optimalHeldOutReturn actionCap = optimalHeldOutReturnFor v1Carrier actionCap

    let private floatBits (value: float) =
        BitConverter.DoubleToInt64Bits value
        |> uint64
        |> fun bits -> bits.ToString("x16", CultureInfo.InvariantCulture)

    let private qDigest (q: Map<Position * Action, float>) =
        q
        |> Map.toList
        |> List.map (fun ((position, action), value) ->
            String.concat "|" [ string position.X; string position.Y; actionName action; floatBits value ])
        |> String.concat "\n"
        |> digestText

    let private traceLine kind episode step position action next reward countBefore =
        String.concat "|"
            [ kind
              string episode
              string step
              string position.X
              string position.Y
              actionName action
              string next.X
              string next.Y
              string reward
              string countBefore ]

    let runForCarrier
        carrier
        environmentFingerprint
        evaluatorCatalogueFingerprint
        policy
        seed
        episodes
        actionCap
        : Result<RunReceipt, AdmissionFailure> =
        match admitCarrier carrier environmentFingerprint evaluatorCatalogueFingerprint with
        | Error failure -> Error failure
        | Ok() ->
            if episodes < 0 then invalidArg "episodes" "episodes must be non-negative"
            if actionCap < 0 then invalidArg "actionCap" "actionCap must be non-negative"

            let mutable q = Map.empty
            let mutable counts = Map.empty
            let mutable stream = { State = seed; Draws = 0 }
            let mutable time = 0
            let mutable visitedStates = Set.empty
            let mutable trainingGoalEpisodes = 0
            let mutable trainingReturn = 0L
            let mutable noveltySum = 0.0
            let mutable noveltyCount = 0
            let mutable trainingTraceRev: string list = []

            for episode in 1 .. episodes do
                let mutable position = carrier.TrainingStart
                let mutable step = 0
                let mutable terminal = false
                visitedStates <- Set.add position visitedStates

                while step < actionCap && not terminal do
                    let action, nextStream = chooseTrainingAction policy q counts time stream position
                    stream <- nextStream
                    let key = position, action
                    let countBefore = countValue counts key
                    noveltySum <- noveltySum + 1.0 / sqrt (1.0 + float countBefore)
                    noveltyCount <- noveltyCount + 1
                    let nextPosition, reward, reachedGoal = transition carrier position action
                    trainingReturn <- trainingReturn + int64 reward
                    let bootstrap = if reachedGoal then 0.0 else maxNextQ q nextPosition
                    let alpha = 0.05 / sqrt (float (max 1 (time + 1)))
                    let updated = qValue q key + alpha * (float reward + 0.9 * bootstrap - qValue q key)
                    q <- Map.add key updated q
                    counts <- Map.add key (countBefore + 1) counts
                    time <- time + 1
                    step <- step + 1
                    trainingTraceRev <- traceLine "T" episode step position action nextPosition reward countBefore :: trainingTraceRev
                    position <- nextPosition
                    visitedStates <- Set.add position visitedStates
                    terminal <- reachedGoal
                    if reachedGoal then trainingGoalEpisodes <- trainingGoalEpisodes + 1

            let qBeforeEvaluation = qDigest q
            let mutable evaluationPosition = carrier.HeldOutStart
            let mutable evaluationStep = 0
            let mutable evaluationTerminal = false
            let mutable heldOutReturn = 0
            let mutable evaluationActionsRev: string list = []
            let mutable evaluationTraceRev: string list = []

            while evaluationStep < actionCap && not evaluationTerminal do
                let action = greedyAction q evaluationPosition
                let countBefore = countValue counts (evaluationPosition, action)
                let nextPosition, reward, reachedGoal = transition carrier evaluationPosition action
                evaluationStep <- evaluationStep + 1
                heldOutReturn <- heldOutReturn + reward
                evaluationActionsRev <- actionName action :: evaluationActionsRev
                evaluationTraceRev <- traceLine "E" 0 evaluationStep evaluationPosition action nextPosition reward countBefore :: evaluationTraceRev
                evaluationPosition <- nextPosition
                evaluationTerminal <- reachedGoal

            let qAfterEvaluation = qDigest q
            let trainingTrace = trainingTraceRev |> List.rev |> String.concat "\n"
            let evaluationTrace = evaluationTraceRev |> List.rev |> String.concat "\n"
            Ok
                { Policy = policyName policy
                  Seed = seed
                  HeldOutReturnPpm = heldOutReturn
                  HeldOutActions = List.rev evaluationActionsRev
                  TrainingGoalEpisodes = trainingGoalEpisodes
                  TrainingReturnPpm = trainingReturn
                  TrainingUniqueStates = visitedStates.Count
                  TrainingUniqueStateActions = counts |> Map.count
                  MeanPreIncrementNovelty = if noveltyCount = 0 then 0.0 else noveltySum / float noveltyCount
                  TrainingTraceDigest = digestText trainingTrace
                  EvaluationTraceDigest = digestText evaluationTrace
                  QDigestBeforeEvaluation = qBeforeEvaluation
                  QDigestAfterEvaluation = qAfterEvaluation
                  StreamDraws = stream.Draws }

    /// Retained v1 execution wrapper for existing tests and result receipts.
    let run
        environmentFingerprint
        evaluatorCatalogueFingerprint
        policy
        seed
        episodes
        actionCap
        =
        runForCarrier v1Carrier environmentFingerprint evaluatorCatalogueFingerprint policy seed episodes actionCap

    /// Executes a selected carrier only after raw-byte verification and
    /// environment/catalogue cross-binding validation at the repository root.
    let runKnownCarrier repositoryRoot carrierId policy seed =
        match loadVerifiedCarrier repositoryRoot carrierId with
        | Error failure -> Error(UnknownFingerprint failure)
        | Ok carrier ->
            runForCarrier
                carrier
                carrier.EnvironmentFingerprint
                carrier.EvaluatorCatalogueFingerprint
                policy
                seed
                TrainingEpisodes
                EpisodeActionCap

    let runKnown policy seed =
        run EnvironmentFingerprint EvaluatorCatalogueFingerprint policy seed TrainingEpisodes EpisodeActionCap
