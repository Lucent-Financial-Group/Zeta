#r "../../../src/Bayesian/bin/Debug/net10.0/Zeta.Bayesian.dll"

open Zeta.Bayesian

module Query = SignedProbitEp

let catalogue : Query.Observation list =
    [ { SourceRow = 4; Group = Query.Group.HousingYes; Label = -1 }
      { SourceRow = 1; Group = Query.Group.HousingNo; Label = 1 }
      { SourceRow = 6; Group = Query.Group.HousingYes; Label = 1 }
      { SourceRow = 2; Group = Query.Group.HousingNo; Label = -1 }
      { SourceRow = 5; Group = Query.Group.HousingYes; Label = -1 }
      { SourceRow = 3; Group = Query.Group.HousingNo; Label = 1 }
      { SourceRow = 7; Group = Query.Group.HousingUnknown; Label = 1 } ]

let flipSourceRow =
    let args = System.Environment.GetCommandLineArgs()
    match args |> Array.tryFindIndex ((=) "--flip-source-row") with
    | Some index when index + 1 < args.Length -> Some(int args.[index + 1])
    | Some _ -> failwith "--flip-source-row requires a positive source row"
    | None -> None

let effectiveCatalogue =
    match flipSourceRow with
    | None -> catalogue
    | Some sourceRow when sourceRow < 1 -> failwith "--flip-source-row requires a positive source row"
    | Some sourceRow ->
        let mutable changed = false
        let result =
            catalogue
            |> List.map (fun observation ->
                if observation.SourceRow = sourceRow then
                    changed <- true
                    { observation with Label = -observation.Label }
                else
                    observation)

        if not changed then
            failwithf "unknown declared source row: %d" sourceRow

        result

let groupName group =
    match group with
    | Query.Group.HousingNo -> "housing-no"
    | Query.Group.HousingYes -> "housing-yes"
    | Query.Group.HousingUnknown -> "housing-unknown"

match Query.query Query.defaultConfig effectiveCatalogue with
| Error failure -> failwithf "signed-probit query refused: %A" failure
| Ok receipt ->
    let groups =
        receipt.Groups
        |> List.map (fun group ->
            sprintf
                "{\"group\":\"%s\",\"count\":%d,\"mean\":%.17g,\"variance\":%.17g,\"predictive\":%.17g}"
                (groupName group.Group)
                group.ObservationCount
                group.Mean
                group.Variance
                group.PredictiveSuccessProbability)
        |> String.concat ","

    printfn "{\"fingerprint\":\"%s\",\"groups\":[%s]}" receipt.CanonicalInputFingerprint groups
