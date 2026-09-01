#r "../../../src/Core/bin/Debug/net10.0/Zeta.Core.dll"
#r "../../../src/Bayesian/bin/Debug/net10.0/Zeta.Bayesian.dll"

open System
open System.Text.Json
open Zeta.Bayesian
open Zeta.Core

module R = ReferenceFrameFactorHeterarchy

let unwrap (result: Result<'value, R.TeachingError>) =
    match result with
    | Ok value -> value
    | Error error -> failwithf "%s:%s:%s" error.Code error.Observed error.SafeNextStep

let vector x y z : R.Vec3 = { X = x; Y = y; Z = z }
let diagonal x y z : R.Symmetric3 = { XX = x; XY = 0.0; XZ = 0.0; YY = y; YZ = 0.0; ZZ = z }
let gaussian mean covariance = R.Gaussian3.tryOfMeanCovariance mean covariance |> unwrap
let pose rotation translation : R.Pose = { Rotation = rotation; Translation = translation }

let message id emitter objectEvidence position senderToRoom : R.ColumnMessage =
    { EvidenceId = id
      EmitterColumn = emitter
      LogicalSequence = 0L
      ObjectEvidence = objectEvidence
      ObservedPosition = position
      SenderToRoom = senderToRoom
      GeneratorOrder = "declared"
      Status = R.Unresolved }

let empty () = R.tryCreate [ "cup"; "bowl" ] |> unwrap
let add observation state = R.applyMessage observation state |> unwrap

let position = gaussian (vector 1.0 0.0 0.0) (diagonal 2.0 2.0 2.0)
let agreeingA = message "a" "column-a" (Map.ofList [ ("cup", log 9.0) ]) position R.identityPose
let agreeingB = message "b" "column-b" (Map.ofList [ ("cup", log 9.0) ]) position R.identityPose
let _, agreeingOnce = add agreeingA (empty ())
let _, agreeingTwice = add agreeingB agreeingOnce

let contradictB = message "b" "column-b" (Map.ofList [ ("bowl", log 9.0) ]) position R.identityPose
let _, contradictOnce = add agreeingA (empty ())
let _, contradictTwice = add contradictB contradictOnce

let permutations values =
    let rec generate prefix remaining =
        seq {
            match remaining with
            | [] -> yield List.rev prefix
            | _ ->
                for index in 0 .. List.length remaining - 1 do
                    let selected = List.item index remaining
                    let rest = remaining |> List.mapi (fun i value -> i, value) |> List.choose (fun (i, value) -> if i = index then None else Some value)
                    yield! generate (selected :: prefix) rest
        }
    generate [] values

let orderedMessages =
    [ message "e1" "a" (Map.ofList [ ("cup", log 2.0) ]) position R.identityPose
      message "e2" "b" (Map.ofList [ ("cup", log 3.0) ]) position R.identityPose
      message "e3" "c" (Map.ofList [ ("bowl", log 5.0) ]) position R.identityPose ]

let permutationPosteriors =
    permutations orderedMessages
    |> Seq.map (fun ordering ->
        let state = ordering |> List.fold (fun current observation -> add observation current |> snd) (empty ())
        R.objectPosterior state, R.positionPosterior state)
    |> Seq.toArray

let covariancePose = pose (Cl3.rotor (Math.PI / 4.0) Cl3.e12) (vector 0.0 0.0 0.0)
let covarianceInput = gaussian (vector 1.0 0.0 0.0) (diagonal 4.0 1.0 9.0)
let covarianceOutput = R.tryTransformGaussian covariancePose covarianceInput |> unwrap |> R.Gaussian3.covariance

let coordinateChange = pose (Cl3.rotor 0.63 Cl3.e12) (vector 4.0 -2.0 1.0)
let firstPosition = gaussian (vector 1.0 0.0 2.0) (diagonal 4.0 1.0 2.0)
let secondPosition = gaussian (vector -1.0 3.0 0.5) (diagonal 1.0 3.0 5.0)
let firstOriginal = message "n1" "a" Map.empty firstPosition R.identityPose
let secondOriginal = message "n2" "b" Map.empty secondPosition R.identityPose
let _, original1 = add firstOriginal (empty ())
let _, original2 = add secondOriginal original1
let originalPosterior = R.positionPosterior original2 |> Option.get
let firstChanged = { firstOriginal with SenderToRoom = coordinateChange }
let secondChanged = { secondOriginal with SenderToRoom = coordinateChange }
let _, changed1 = add firstChanged (empty ())
let _, changed2 = add secondChanged changed1
let changedPosterior = R.positionPosterior changed2 |> Option.get
let expectedChanged = R.tryTransformGaussian coordinateChange originalPosterior |> unwrap
let changedMean = R.Gaussian3.mean changedPosterior
let expectedMean = R.Gaussian3.mean expectedChanged
let changedCovariance = R.Gaussian3.covariance changedPosterior
let expectedCovariance = R.Gaussian3.covariance expectedChanged
let naturalityMaxError =
    [ abs (changedMean.X - expectedMean.X)
      abs (changedMean.Y - expectedMean.Y)
      abs (changedMean.Z - expectedMean.Z)
      abs (changedCovariance.XX - expectedCovariance.XX)
      abs (changedCovariance.XY - expectedCovariance.XY)
      abs (changedCovariance.YY - expectedCovariance.YY) ]
    |> List.max

let duplicateReceipt, duplicateState = add agreeingA agreeingOnce
let changed = { agreeingA with ObjectEvidence = Map.ofList [ ("bowl", log 9.0) ] }
let conflictReceipt, conflictState = add changed agreeingOnce

let lateralWith =
    R.tryCreateTopology [ "a"; "b" ] [] ([ { Left = "a"; Right = "b" } ]: R.LateralLink list)
    |> unwrap
let lateralWithout = R.tryCreateTopology [ "a"; "b" ] [] [] |> unwrap
let lateralMessage = message "l1" "a" Map.empty position R.identityPose
let lateralAccepted = R.applyLateralMessage "b" lateralMessage lateralWith (empty ()) |> Result.isOk
let lateralMissingCode =
    match R.applyLateralMessage "b" lateralMessage lateralWithout (empty ()) with
    | Error error -> error.Code
    | Ok _ -> "unexpected-ok"

let cycleCode =
    let links: R.ParentChildLink list =
        [ { Parent = "a"; Child = "b"; ChildToParent = R.identityPose }
          { Parent = "b"; Child = "a"; ChildToParent = R.identityPose } ]
    match R.tryCreateTopology [ "a"; "b" ] links [] with
    | Error error -> error.Code
    | Ok _ -> "unexpected-ok"

let generatorMismatchCode =
    match R.applyMessage { lateralMessage with GeneratorOrder = "reversed" } (empty ()) with
    | Error error -> error.Code
    | Ok _ -> "unexpected-ok"

let chromaticNumber vertices edges =
    let adjacency =
        vertices
        |> List.map (fun vertex ->
            vertex,
            edges
            |> List.choose (fun (left, right) -> if left = vertex then Some right elif right = vertex then Some left else None)
            |> Set.ofList)
        |> Map.ofList
    let order = vertices |> List.sortByDescending (fun vertex -> adjacency.[vertex].Count)
    let tryColors count =
        let assignment = Collections.Generic.Dictionary<string, int>()
        let rec search index =
            if index = order.Length then true
            else
                let vertex = order.[index]
                let forbidden =
                    adjacency.[vertex]
                    |> Seq.choose (fun neighbour -> match assignment.TryGetValue neighbour with | true, color -> Some color | _ -> None)
                    |> Set.ofSeq
                [ 0 .. count - 1 ]
                |> List.exists (fun color ->
                    if forbidden.Contains color then false
                    else
                        assignment.[vertex] <- color
                        let solved = search (index + 1)
                        if not solved then assignment.Remove vertex |> ignore
                        solved)
        search 0
    [ 1 .. vertices.Length ] |> List.find tryColors

let k4Vertices = [ "a"; "b"; "c"; "d" ]
let k4Edges = [ for i in 0 .. 3 do for j in i + 1 .. 3 do yield k4Vertices.[i], k4Vertices.[j] ]
let k5Vertices = [ "a"; "b"; "c"; "d"; "e" ]
let k5Edges = [ for i in 0 .. 4 do for j in i + 1 .. 4 do yield k5Vertices.[i], k5Vertices.[j] ]

let agreeingPositionCovariance = R.positionPosterior agreeingTwice |> Option.get |> R.Gaussian3.covariance
let report =
    {| agreeingCupProbability = (R.objectPosterior agreeingTwice).["cup"]
       agreeingPositionVarianceX = agreeingPositionCovariance.XX
       contradictionCupProbability = (R.objectPosterior contradictTwice).["cup"]
       contradictionBowlProbability = (R.objectPosterior contradictTwice).["bowl"]
       permutationCount = permutationPosteriors.Length
       permutationInvariant = permutationPosteriors |> Array.forall ((=) permutationPosteriors.[0])
       rotatedCovariance = [| covarianceOutput.XX; covarianceOutput.XY; covarianceOutput.YY; covarianceOutput.ZZ |]
       naturalityMaxError = naturalityMaxError
       duplicateDisposition = string duplicateReceipt.Disposition
       duplicateAcceptedCount = R.acceptedEvidenceCount duplicateState
       conflictDisposition = string conflictReceipt.Disposition
       conflictCount = R.conflictReceipts conflictState |> Array.length
       lateralAccepted = lateralAccepted
       lateralMissingCode = lateralMissingCode
       cycleCode = cycleCode
       generatorMismatchCode = generatorMismatchCode
       k4ChromaticNumber = chromaticNumber k4Vertices k4Edges
       k5ChromaticNumber = chromaticNumber k5Vertices k5Edges |}

printfn "%s" (JsonSerializer.Serialize report)
