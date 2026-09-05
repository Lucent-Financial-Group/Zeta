namespace Zeta.Bayesian

open System
open System.Security.Cryptography
open System.Text

/// Finite two-group signed-probit EP query. This is a deterministic materialized
/// query over an already admitted catalogue; it is not a replicated-state merge.
[<RequireQualifiedAccess>]
module SignedProbitEp =

    /// The only two declared groups in the Bank Marketing benchmark contract.
    type Group =
        | HousingNo
        | HousingYes
        | HousingUnknown

    /// One source-identified binary observation. `Label` is encoded as -1 or +1.
    type Observation =
        { SourceRow: int
          Group: Group
          Label: int }

    /// Explicit finite EP execution parameters.
    type Config =
        { PriorVariance: float
          Damping: float
          Tolerance: float
          MaxPasses: int }

    /// The fixed configuration stated in the signed-probit benchmark contract.
    let defaultConfig : Config =
        { PriorVariance = 1.0
          Damping = 1.0
          Tolerance = 1e-10
          MaxPasses = 16 }

    /// A converged (or capped) scalar posterior for one declared group.
    type GroupReceipt =
        { Group: Group
          ObservationCount: int
          Passes: int
          Converged: bool
          Mean: float
          Variance: float
          PredictiveSuccessProbability: float }

    /// A deterministic receipt for the complete canonical catalogue query.
    type Receipt =
        { CanonicalInputFingerprint: string
          CanonicalObservationCount: int
          Groups: GroupReceipt list
          AllGroupsConverged: bool }

    /// A refusal reason. No branch selects a posterior after invalid input.
    type Failure =
        | InvalidConfiguration of string
        | InvalidObservation of sourceRow: int * reason: string
        | DuplicateSourceRow of sourceRow: int
        | ImproperCavity of group: Group * sourceRow: int
        | NonFiniteProjection of group: Group * sourceRow: int
        | NonFinitePosterior of group: Group
        | DidNotConverge of group: Group * maxPasses: int

    let private groups = [ HousingNo; HousingYes; HousingUnknown ]

    let private groupCode group =
        match group with
        | HousingNo -> "housing-no"
        | HousingYes -> "housing-yes"
        | HousingUnknown -> "housing-unknown"

    let private isFiniteGaussian (value: Gaussian) =
        Double.IsFinite value.Precision && Double.IsFinite value.PrecisionMean

    let private validateConfig (config: Config) =
        if not (Double.IsFinite config.PriorVariance) || config.PriorVariance <= 0.0 then
            Error(InvalidConfiguration "priorVariance must be finite and > 0")
        elif not (Double.IsFinite config.Damping) || config.Damping <= 0.0 || config.Damping > 1.0 then
            Error(InvalidConfiguration "damping must be finite and in (0, 1]")
        elif not (Double.IsFinite config.Tolerance) || config.Tolerance < 0.0 then
            Error(InvalidConfiguration "tolerance must be finite and >= 0")
        elif config.MaxPasses < 1 then
            Error(InvalidConfiguration "maxPasses must be >= 1")
        else
            Ok()

    let private canonicalize (observations: Observation list) =
        let sorted = observations |> List.sortBy (fun observation -> observation.SourceRow)

        let rec validate remaining =
            match remaining with
            | [] -> Ok sorted
            | observation :: tail ->
                if observation.SourceRow < 1 then
                    Error(InvalidObservation(observation.SourceRow, "sourceRow must be >= 1"))
                elif observation.Label <> -1 && observation.Label <> 1 then
                    Error(InvalidObservation(observation.SourceRow, "label must be -1 or +1"))
                else
                    match tail with
                    | next :: _ when next.SourceRow = observation.SourceRow ->
                        Error(DuplicateSourceRow observation.SourceRow)
                    | _ -> validate tail

        validate sorted

    let private canonicalFingerprint (observations: Observation list) =
        let body =
            observations
            |> List.map (fun observation ->
                String.Concat(
                    string observation.SourceRow,
                    "\u001f",
                    groupCode observation.Group,
                    "\u001f",
                    string observation.Label))
            |> String.concat "\n"

        let source = String.Concat("zeta.signed-probit-ep/v1\n", body)
        SHA256.HashData(Encoding.UTF8.GetBytes source) |> Convert.ToHexString

    let private properMoments (value: Gaussian) =
        if Gaussian.isProper value && isFiniteGaussian value then
            let mean = Gaussian.mean value
            let variance = Gaussian.variance value

            if Double.IsFinite mean && Double.IsFinite variance && variance > 0.0 then
                Some(mean, variance)
            else
                None
        else
            None

    let private runGroup (config: Config) (group: Group) (observations: Observation array) =
        let prior = Gaussian.ofMeanVariance 0.0 config.PriorVariance

        if observations.Length = 0 then
            Ok
                { Group = group
                  ObservationCount = 0
                  Passes = 0
                  Converged = true
                  Mean = 0.0
                  Variance = config.PriorVariance
                  PredictiveSuccessProbability = Normal.cdf 0.0 }
        else
            let sites = Array.create observations.Length Gaussian.One
            let mutable total = prior
            let mutable passes = 0
            let mutable converged = false
            let mutable failure: Failure option = None

            while passes < config.MaxPasses && not converged && failure.IsNone do
                let mutable maximumMovement = 0.0
                let mutable index = 0

                while index < observations.Length && failure.IsNone do
                    let observation = observations.[index]
                    let oldSite = sites.[index]
                    let cavity = Gaussian.divide total oldSite

                    match properMoments cavity with
                    | None ->
                        failure <- Some(ImproperCavity(group, observation.SourceRow))
                    | Some(cavityMean, cavityVariance) ->
                        let sign = float observation.Label
                        let signedCavity = Gaussian.ofMeanVariance (sign * cavityMean) cavityVariance
                        let signedProjection = Ep.probitProject signedCavity
                        let projectedMean = sign * Gaussian.mean signedProjection
                        let projectedVariance = Gaussian.variance signedProjection

                        if
                            not (Double.IsFinite projectedMean)
                            || not (Double.IsFinite projectedVariance)
                            || projectedVariance <= 0.0
                        then
                            failure <- Some(NonFiniteProjection(group, observation.SourceRow))
                        else
                            let projected = Gaussian.ofMeanVariance projectedMean projectedVariance
                            let proposedSite = Gaussian.divide projected cavity
                            let nextSite = Gaussian.blend config.Damping proposedSite oldSite
                            let nextTotal = Gaussian.product cavity nextSite

                            if not (isFiniteGaussian nextSite) || not (isFiniteGaussian nextTotal) then
                                failure <- Some(NonFiniteProjection(group, observation.SourceRow))
                            else
                                maximumMovement <- max maximumMovement (Gaussian.distance oldSite nextSite)
                                sites.[index] <- nextSite
                                total <- nextTotal

                    index <- index + 1

                passes <- passes + 1
                converged <- failure.IsNone && maximumMovement <= config.Tolerance

            match failure with
            | Some reason -> Error reason
            | None when not converged -> Error(DidNotConverge(group, config.MaxPasses))
            | None ->
                match properMoments total with
                | None -> Error(NonFinitePosterior group)
                | Some(mean, variance) ->
                    let predictive = Normal.cdf (mean / sqrt (1.0 + variance))

                    if Double.IsFinite predictive then
                        Ok
                            { Group = group
                              ObservationCount = observations.Length
                              Passes = passes
                              Converged = true
                              Mean = mean
                              Variance = variance
                              PredictiveSuccessProbability = predictive }
                    else
                        Error(NonFinitePosterior group)

    /// Run the declared scalar EP query after sorting source rows canonically.
    /// The input must be a resolved finite catalogue; no replicated-state merge
    /// occurs here.
    let query (config: Config) (observations: Observation list) : Result<Receipt, Failure> =
        match validateConfig config, canonicalize observations with
        | Error failure, _ -> Error failure
        | _, Error failure -> Error failure
        | Ok(), Ok canonical ->
            let mutable receipts: GroupReceipt list = []
            let mutable failure: Failure option = None

            for group in groups do
                if failure.IsNone then
                    let groupObservations =
                        canonical
                        |> List.filter (fun observation -> observation.Group = group)
                        |> List.toArray

                    match runGroup config group groupObservations with
                    | Ok receipt -> receipts <- receipt :: receipts
                    | Error reason -> failure <- Some reason

            match failure with
            | Some reason -> Error reason
            | None ->
                let orderedReceipts = List.rev receipts

                Ok
                    { CanonicalInputFingerprint = canonicalFingerprint canonical
                      CanonicalObservationCount = canonical.Length
                      Groups = orderedReceipts
                      AllGroupsConverged = orderedReceipts |> List.forall (fun receipt -> receipt.Converged) }
