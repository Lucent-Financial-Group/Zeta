#r "../../../src/Bayesian/bin/Debug/net10.0/Zeta.Bayesian.dll"

open System
open System.IO
open System.Security.Cryptography
open Zeta.Bayesian

module Query = SignedProbitEp

let expectedCsvSha256 = "74ADFC578BF77A7FF4BB1BA4A9F8709D9E3C6907342959C2C8416847E0AFB4D8"
let trainingRows = 32950

let jsonString (value: string) = value.Replace("\\", "\\\\").Replace("\"", "\\\"")
let finiteProbability value = max 1e-15 (min (1.0 - 1e-15) value)

let emitUnavailable reason =
    printfn "{\"status\":\"Unavailable\",\"reason\":\"%s\"}" (jsonString reason)

let emitRefused reason =
    printfn "{\"status\":\"Refused\",\"reason\":\"%s\"}" (jsonString reason)

let trimField (value: string) = value.Trim().Trim('"')

let groupName group =
    match group with
    | Query.Group.HousingNo -> "housing-no"
    | Query.Group.HousingYes -> "housing-yes"
    | Query.Group.HousingUnknown -> "housing-unknown"

let parseRecord (sourceRow: int) (line: string) : Result<Query.Observation, string> =
    let fields = line.Split(';') |> Array.map trimField

    if fields.Length <> 21 then
        Error(sprintf "source row %d has %d fields, expected 21" sourceRow fields.Length)
    else
        let group =
            match fields.[5] with
            | "no" -> Ok Query.Group.HousingNo
            | "yes" -> Ok Query.Group.HousingYes
            | "unknown" -> Ok Query.Group.HousingUnknown
            | value -> Error(sprintf "source row %d has unknown housing value %s" sourceRow value)

        let label =
            match fields.[20] with
            | "no" -> Ok -1
            | "yes" -> Ok 1
            | value -> Error(sprintf "source row %d has unknown y value %s" sourceRow value)

        match group, label with
        | Ok admittedGroup, Ok admittedLabel ->
            Ok { SourceRow = sourceRow; Group = admittedGroup; Label = admittedLabel }
        | Error reason, _
        | _, Error reason -> Error reason

let score (probability: float) (label: int) =
    let observed = if label = 1 then 1.0 else 0.0
    let safeProbability = finiteProbability probability
    let brier = (safeProbability - observed) * (safeProbability - observed)
    let negativeLogPredictiveDensity =
        if label = 1 then -log safeProbability else -log (1.0 - safeProbability)

    brier, negativeLogPredictiveDensity

let args = fsi.CommandLineArgs |> Array.skip 1

match args with
| [||] -> emitUnavailable "no CSV path supplied"
| [| path |] when not (File.Exists path) -> emitUnavailable "CSV path does not exist"
| [| path |] ->
    let digest = SHA256.HashData(File.ReadAllBytes path) |> Convert.ToHexString

    if digest <> expectedCsvSha256 then
        emitRefused(sprintf "CSV SHA-256 mismatch: %s" digest)
    else
        let lines = File.ReadAllLines path

        if lines.Length <> 41189 then
            emitRefused(sprintf "CSV row count mismatch: %d lines, expected header plus 41188 rows" lines.Length)
        else
            let parsed =
                lines
                |> Array.skip 1
                |> Array.mapi (fun index line -> parseRecord (index + 1) line)

            match parsed |> Array.tryPick (function | Error reason -> Some reason | Ok _ -> None) with
            | Some reason -> emitRefused reason
            | None ->
                let observations = parsed |> Array.choose (function | Ok observation -> Some observation | Error _ -> None)
                let train = observations |> Array.take trainingRows |> Array.toList
                let heldOut = observations |> Array.skip trainingRows

                match Query.query Query.defaultConfig train with
                | Error failure -> emitRefused(sprintf "signed-probit query refused: %A" failure)
                | Ok receipt ->
                    let predictions = receipt.Groups |> List.map (fun group -> group.Group, group.PredictiveSuccessProbability) |> Map.ofList
                    let successes = train |> List.sumBy (fun observation -> if observation.Label = 1 then 1 else 0)
                    // Training-only Beta(1,1) posterior-predictive mean: (s + 1)/(n + 2).
                    let baseline = float (successes + 1) / float (train.Length + 2)
                    let mutable epBrier = 0.0
                    let mutable epNlpd = 0.0
                    let mutable baselineBrier = 0.0
                    let mutable baselineNlpd = 0.0

                    for observation in heldOut do
                        let prediction = predictions.[observation.Group]
                        let currentEpBrier, currentEpNlpd = score prediction observation.Label
                        let currentBaselineBrier, currentBaselineNlpd = score baseline observation.Label
                        epBrier <- epBrier + currentEpBrier
                        epNlpd <- epNlpd + currentEpNlpd
                        baselineBrier <- baselineBrier + currentBaselineBrier
                        baselineNlpd <- baselineNlpd + currentBaselineNlpd

                    let groupJson =
                        receipt.Groups
                        |> List.map (fun group ->
                            let positiveCount =
                                train
                                |> List.sumBy (fun observation ->
                                    if observation.Group = group.Group && observation.Label = 1 then 1 else 0)

                            sprintf
                                "{\"group\":\"%s\",\"count\":%d,\"successes\":%d,\"mean\":%.17g,\"variance\":%.17g,\"predictive\":%.17g}"
                                (groupName group.Group)
                                group.ObservationCount
                                positiveCount
                                group.Mean
                                group.Variance
                                group.PredictiveSuccessProbability)
                        |> String.concat ","

                    let heldOutCount = heldOut.Length

                    printfn
                        "{\"status\":\"Ready\",\"csvSha256\":\"%s\",\"canonicalInputFingerprint\":\"%s\",\"trainingRows\":%d,\"heldOutRows\":%d,\"baseline\":%.17g,\"epBrier\":%.17g,\"epNlpd\":%.17g,\"baselineBrier\":%.17g,\"baselineNlpd\":%.17g,\"groups\":[%s]}"
                        digest
                        receipt.CanonicalInputFingerprint
                        train.Length
                        heldOutCount
                        baseline
                        (epBrier / float heldOutCount)
                        (epNlpd / float heldOutCount)
                        (baselineBrier / float heldOutCount)
                        (baselineNlpd / float heldOutCount)
                        groupJson
| _ -> emitRefused "expected exactly one CSV path"
