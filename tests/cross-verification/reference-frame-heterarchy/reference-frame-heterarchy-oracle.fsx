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

// Independent frame-alignment witness: Q(x,y,z)=(-y,x,z) at +π/2 in e12, so
// Q(2,3,4)+(4,-2,1)=(1,0,5). The expected values below do not use production transforms.
let alignmentTarget = vector 1.0 0.0 5.0
let alignmentPose = pose (Cl3.rotor (Math.PI / 2.0) Cl3.e12) (vector 4.0 -2.0 1.0)
let alignmentA = message "align-a" "a" Map.empty (gaussian alignmentTarget (diagonal 2.0 2.0 2.0)) R.identityPose
let alignmentB = message "align-b" "b" Map.empty (gaussian (vector 2.0 3.0 4.0) (diagonal 2.0 2.0 2.0)) alignmentPose
let _, alignment1 = add alignmentA (empty ())
let _, alignment2 = add alignmentB alignment1
let alignmentPosterior = R.positionPosterior alignment2 |> Option.get
let alignmentMean = R.Gaussian3.mean alignmentPosterior
let alignmentCovariance = R.Gaussian3.covariance alignmentPosterior

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
let changedMean = R.Gaussian3.mean changedPosterior
let changedCovariance = R.Gaussian3.covariance changedPosterior
let fusedX, fusedY, fusedZ = -3.0 / 5.0, 3.0 / 4.0, 11.0 / 7.0
let varianceX, varianceY, varianceZ = 4.0 / 5.0, 3.0 / 4.0, 10.0 / 7.0
let originalMean = R.Gaussian3.mean originalPosterior
let originalCovariance = R.Gaussian3.covariance originalPosterior
let originalFusionMaxError =
    [ abs (originalMean.X - fusedX)
      abs (originalMean.Y - fusedY)
      abs (originalMean.Z - fusedZ)
      abs (originalCovariance.XX - varianceX)
      abs originalCovariance.XY
      abs originalCovariance.XZ
      abs (originalCovariance.YY - varianceY)
      abs originalCovariance.YZ
      abs (originalCovariance.ZZ - varianceZ) ]
    |> List.max
let cosine, sine = cos 0.63, sin 0.63
let expectedMean =
    vector
        (cosine * fusedX - sine * fusedY + 4.0)
        (sine * fusedX + cosine * fusedY - 2.0)
        (fusedZ + 1.0)
let expectedXX = cosine * cosine * varianceX + sine * sine * varianceY
let expectedYY = sine * sine * varianceX + cosine * cosine * varianceY
let expectedXY = cosine * sine * (varianceX - varianceY)
let naturalityMaxError =
    [ abs (changedMean.X - expectedMean.X)
      abs (changedMean.Y - expectedMean.Y)
      abs (changedMean.Z - expectedMean.Z)
      abs (changedCovariance.XX - expectedXX)
      abs (changedCovariance.XY - expectedXY)
      abs changedCovariance.XZ
      abs (changedCovariance.YY - expectedYY)
      abs changedCovariance.YZ
      abs (changedCovariance.ZZ - varianceZ) ]
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

let narrowState = R.tryCreateWithFactorIdBitWidth 8 [ "cup"; "bowl" ] |> unwrap
let narrowFirst =
    message "collision-source" "column-a" (Map.ofList [ ("cup", log 5.0) ]) position R.identityPose
let narrowReceipt, narrowAccepted = add narrowFirst narrowState
let narrowObjectFactorId = narrowReceipt.ObjectFactorId |> Option.get
let narrowPositionFactorId = narrowReceipt.PositionFactorId |> Option.get
let narrowCollisionCode =
    seq { 0 .. 4095 }
    |> Seq.map (fun index ->
        message (sprintf "collision-candidate-%d" index) "column-b" (Map.ofList [ ("bowl", log 7.0) ]) position R.identityPose)
    |> Seq.pick (fun candidate ->
        match R.applyMessage candidate narrowAccepted with
        | Error error when error.Code = "RFFH-FACTOR-ID-COLLISION" -> Some error.Code
        | _ -> None)

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
let k33Vertices = [ "a1"; "a2"; "a3"; "b1"; "b2"; "b3" ]
let k33Edges = [ for left in [ "a1"; "a2"; "a3" ] do for right in [ "b1"; "b2"; "b3" ] do yield left, right ]
let crownVertices = [ "1a"; "1b"; "2a"; "2b"; "3a"; "3b" ]
let crownEdges =
    [ for leftIndex, left in [ "1a"; "2a"; "3a" ] |> List.indexed do
          for rightIndex, right in [ "1b"; "2b"; "3b" ] |> List.indexed do
              if leftIndex <> rightIndex then yield left, right ]

let agreeingPositionCovariance = R.positionPosterior agreeingTwice |> Option.get |> R.Gaussian3.covariance
let report =
    {| agreeingCupProbability = (R.objectPosterior agreeingTwice).["cup"]
       agreeingPositionVarianceX = agreeingPositionCovariance.XX
       contradictionCupProbability = (R.objectPosterior contradictTwice).["cup"]
       contradictionBowlProbability = (R.objectPosterior contradictTwice).["bowl"]
       permutationCount = permutationPosteriors.Length
       permutationInvariant = permutationPosteriors |> Array.forall ((=) permutationPosteriors.[0])
       rotatedCovariance = [| covarianceOutput.XX; covarianceOutput.XY; covarianceOutput.YY; covarianceOutput.ZZ |]
       alignmentMean = [| alignmentMean.X; alignmentMean.Y; alignmentMean.Z |]
       alignmentVarianceX = alignmentCovariance.XX
       originalFusionMaxError = originalFusionMaxError
       naturalityMaxError = naturalityMaxError
       duplicateDisposition = string duplicateReceipt.Disposition
       duplicateAcceptedCount = R.acceptedEvidenceCount duplicateState
       conflictDisposition = string conflictReceipt.Disposition
       conflictCount = R.conflictReceipts conflictState |> Array.length
       lateralAccepted = lateralAccepted
       lateralMissingCode = lateralMissingCode
       cycleCode = cycleCode
       generatorMismatchCode = generatorMismatchCode
       narrowObjectFactorId = narrowObjectFactorId
       narrowPositionFactorId = narrowPositionFactorId
       narrowCollisionCode = narrowCollisionCode
       narrowAcceptedCount = R.acceptedEvidenceCount narrowAccepted
       k4ChromaticNumber = chromaticNumber k4Vertices k4Edges
       k5ChromaticNumber = chromaticNumber k5Vertices k5Edges
       k33ChromaticNumber = chromaticNumber k33Vertices k33Edges
       crownChromaticNumber = chromaticNumber crownVertices crownEdges |}

printfn "%s" (JsonSerializer.Serialize report)
