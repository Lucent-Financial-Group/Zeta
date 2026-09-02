namespace Zeta.Bayesian

open System
open System.Globalization
open System.Security.Cryptography
open System.Text
open Zeta.Core

/// A bounded column-inspired reference-frame factor heterarchy.
///
/// This module implements typed object-plus-pose evidence fusion. It is not a cortical simulation,
/// a learner, or a claim that all language/cognition is spatial. `Cl3` supplies only the measured
/// 3-D rotation action; probability remains an independent factor-graph message algebra.
[<RequireQualifiedAccess>]
module ReferenceFrameFactorHeterarchy =

    type Vec3 =
        { X: float
          Y: float
          Z: float }

    type Symmetric3 =
        { XX: float
          XY: float
          XZ: float
          YY: float
          YZ: float
          ZZ: float }

    type Gaussian3 =
        { PrecisionMean: Vec3
          Precision: Symmetric3 }

    type Pose =
        { Rotation: Cl3.Mv
          Translation: Vec3 }

    type LogCategorical =
        { Natural: Map<string, float> }

    type MessageStatus =
        | Resolved
        | Unresolved

    type ColumnMessage =
        { EvidenceId: string
          EmitterColumn: string
          LogicalSequence: int64
          ObjectEvidence: Map<string, float>
          ObservedPosition: Gaussian3
          SenderToRoom: Pose
          GeneratorOrder: string
          Status: MessageStatus }

    type ParentChildLink =
        { Parent: string
          Child: string
          ChildToParent: Pose }

    type LateralLink =
        { Left: string
          Right: string }

    type Topology =
        private
            { Modules: Set<string>
              ParentChild: ParentChildLink array
              Lateral: Set<string * string> }

    type TeachingError =
        { Code: string
          Field: string
          Observed: string
          SafeNextStep: string }

    type ConflictReceipt =
        { EvidenceId: string
          RetainedFingerprint: string
          ChangedFingerprint: string
          Emitters: string array }

    type EvidenceDisposition =
        | Accepted
        | DuplicateIgnored
        | ConflictDetected

    type EvidenceReceipt =
        { EvidenceId: string
          ContentFingerprint: string
          EmitterColumn: string
          Disposition: EvidenceDisposition
          ObjectFactorId: int option
          PositionFactorId: int option }

    type ConsensusStatus =
        | NoEvidence
        | PosteriorUnresolved of probabilities: Map<string, float>
        | PosteriorResolved of objectId: string * probability: float
        | EvidenceConflicted of conflictCount: int * probabilities: Map<string, float>

    type Heterarchy =
        private
            { Candidates: Set<string>
              GeneratorOrder: string
              ObjectGraph: FactorGraph<LogCategorical>
              PositionGraph: FactorGraph<Gaussian3>
              Evidence: Map<string, string * string>
              Conflicts: ConflictReceipt array
              FactorOwners: Map<int, string> }

    type InferenceArchitectureCensus =
        { ObjectVariableIds: int array
          PositionVariableIds: int array
          ObjectFactorCount: int
          PositionFactorCount: int
          ObjectMultiNeighborFactorCount: int
          PositionMultiNeighborFactorCount: int
          ObjectMessagesChangeAfterSevenMoreRounds: bool
          PositionMessagesChangeAfterSevenMoreRounds: bool }

    let private finite value = Double.IsFinite value

    let private addVector left right =
        { X = left.X + right.X
          Y = left.Y + right.Y
          Z = left.Z + right.Z }

    let private subVector left right =
        { X = left.X - right.X
          Y = left.Y - right.Y
          Z = left.Z - right.Z }

    let private scaleVector scalar value =
        { X = scalar * value.X
          Y = scalar * value.Y
          Z = scalar * value.Z }

    let private addSymmetric left right =
        { XX = left.XX + right.XX
          XY = left.XY + right.XY
          XZ = left.XZ + right.XZ
          YY = left.YY + right.YY
          YZ = left.YZ + right.YZ
          ZZ = left.ZZ + right.ZZ }

    let private subSymmetric left right =
        { XX = left.XX - right.XX
          XY = left.XY - right.XY
          XZ = left.XZ - right.XZ
          YY = left.YY - right.YY
          YZ = left.YZ - right.YZ
          ZZ = left.ZZ - right.ZZ }

    let private determinant matrix =
        matrix.XX * (matrix.YY * matrix.ZZ - matrix.YZ * matrix.YZ)
        - matrix.XY * (matrix.XY * matrix.ZZ - matrix.XZ * matrix.YZ)
        + matrix.XZ * (matrix.XY * matrix.YZ - matrix.XZ * matrix.YY)

    let private isFiniteVector value =
        finite value.X && finite value.Y && finite value.Z

    let private isFiniteSymmetric value =
        finite value.XX
        && finite value.XY
        && finite value.XZ
        && finite value.YY
        && finite value.YZ
        && finite value.ZZ

    let private isPositiveDefinite matrix =
        isFiniteSymmetric matrix
        && matrix.XX > 0.0
        && matrix.XX * matrix.YY - matrix.XY * matrix.XY > 0.0
        && determinant matrix > 0.0

    let private multiplySymmetric matrix vector =
        { X = matrix.XX * vector.X + matrix.XY * vector.Y + matrix.XZ * vector.Z
          Y = matrix.XY * vector.X + matrix.YY * vector.Y + matrix.YZ * vector.Z
          Z = matrix.XZ * vector.X + matrix.YZ * vector.Y + matrix.ZZ * vector.Z }

    let private inverseSymmetric matrix =
        let det = determinant matrix
        { XX = (matrix.YY * matrix.ZZ - matrix.YZ * matrix.YZ) / det
          XY = (matrix.XZ * matrix.YZ - matrix.XY * matrix.ZZ) / det
          XZ = (matrix.XY * matrix.YZ - matrix.XZ * matrix.YY) / det
          YY = (matrix.XX * matrix.ZZ - matrix.XZ * matrix.XZ) / det
          YZ = (matrix.XY * matrix.XZ - matrix.XX * matrix.YZ) / det
          ZZ = (matrix.XX * matrix.YY - matrix.XY * matrix.XY) / det }

    [<RequireQualifiedAccess>]
    module Gaussian3 =

        let uniform =
            { PrecisionMean = { X = 0.0; Y = 0.0; Z = 0.0 }
              Precision = { XX = 0.0; XY = 0.0; XZ = 0.0; YY = 0.0; YZ = 0.0; ZZ = 0.0 } }

        let isProper value =
            isFiniteVector value.PrecisionMean && isPositiveDefinite value.Precision

        let tryOfMeanCovariance mean covariance =
            if not (isFiniteVector mean) then
                Error
                    { Code = "RFFH-NONFINITE-MEAN"
                      Field = "ObservedPosition.mean"
                      Observed = sprintf "%A" mean
                      SafeNextStep = "Provide three finite position coordinates." }
            elif not (isPositiveDefinite covariance) then
                Error
                    { Code = "RFFH-NON-SPD-COVARIANCE"
                      Field = "ObservedPosition.covariance"
                      Observed = sprintf "%A" covariance
                      SafeNextStep = "Provide a finite symmetric positive-definite 3x3 covariance." }
            else
                let precision = inverseSymmetric covariance
                Ok
                    { PrecisionMean = multiplySymmetric precision mean
                      Precision = precision }

        let mean value =
            multiplySymmetric (inverseSymmetric value.Precision) value.PrecisionMean

        let covariance value =
            inverseSymmetric value.Precision

        let product left right =
            { PrecisionMean = addVector left.PrecisionMean right.PrecisionMean
              Precision = addSymmetric left.Precision right.Precision }

        let divide left right =
            { PrecisionMean = subVector left.PrecisionMean right.PrecisionMean
              Precision = subSymmetric left.Precision right.Precision }

        let algebra: IMessage<Gaussian3> =
            { new IMessage<Gaussian3> with
                member _.Uniform = uniform
                member _.Product(left, right) = product left right
                member _.Divide(left, right) = divide left right }

    [<RequireQualifiedAccess>]
    module LogCategorical =

        let uniform = { Natural = Map.empty }

        let private combine operation (left: LogCategorical) (right: LogCategorical) =
            Set.union (left.Natural |> Map.keys |> Set.ofSeq) (right.Natural |> Map.keys |> Set.ofSeq)
            |> Seq.map (fun key ->
                let leftValue = left.Natural |> Map.tryFind key |> Option.defaultValue 0.0
                let rightValue = right.Natural |> Map.tryFind key |> Option.defaultValue 0.0
                key, operation leftValue rightValue)
            |> Map.ofSeq
            |> fun natural -> { Natural = natural }

        let product left right = combine (+) left right

        let divide left right = combine (-) left right

        let probabilities candidates value =
            if Set.isEmpty candidates then Map.empty
            else
                let logits =
                    candidates
                    |> Seq.map (fun candidate -> candidate, value.Natural |> Map.tryFind candidate |> Option.defaultValue 0.0)
                    |> Seq.toArray
                let maximum = logits |> Array.maxBy snd |> snd
                let masses = logits |> Array.map (fun (label, score) -> label, exp (score - maximum))
                let total = masses |> Array.sumBy snd
                masses |> Array.map (fun (label, mass) -> label, mass / total) |> Map.ofArray

        let algebra: IMessage<LogCategorical> =
            { new IMessage<LogCategorical> with
                member _.Uniform = uniform
                member _.Product(left, right) = product left right
                member _.Divide(left, right) = divide left right }

    type private Matrix3 = float array array

    let private toCl3 (vector: Vec3) = Cl3.vector vector.X vector.Y vector.Z

    let private fromCl3 (value: Cl3.Mv) : Vec3 =
        { X = value.E1
          Y = value.E2
          Z = value.E3 }

    let private rotationCoefficients (rotation: Cl3.Mv) =
        [| rotation.S; rotation.E1; rotation.E2; rotation.E12; rotation.E3; rotation.E13; rotation.E23; rotation.E123 |]

    let private tryValidatePose (pose: Pose) =
        let coefficients = rotationCoefficients pose.Rotation
        if coefficients |> Array.exists (finite >> not) || not (isFiniteVector pose.Translation) then
            Error
                { Code = "RFFH-NONFINITE-POSE"
                  Field = "SenderToRoom"
                  Observed = sprintf "%A" pose
                  SafeNextStep = "Provide a finite even unit rotor and finite translation." }
        elif abs pose.Rotation.E1 > 1e-10
             || abs pose.Rotation.E2 > 1e-10
             || abs pose.Rotation.E3 > 1e-10
             || abs pose.Rotation.E123 > 1e-10 then
            Error
                { Code = "RFFH-NON-EVEN-ROTOR"
                  Field = "SenderToRoom.Rotation"
                  Observed = sprintf "%A" pose.Rotation
                  SafeNextStep = "Use a Cl3 scalar-plus-bivector rotor." }
        elif abs (Cl3.normSq pose.Rotation - 1.0) > 1e-9 then
            Error
                { Code = "RFFH-NONUNIT-ROTOR"
                  Field = "SenderToRoom.Rotation"
                  Observed = sprintf "normSq=%.17g" (Cl3.normSq pose.Rotation)
                  SafeNextStep = "Normalize the rotor before transporting evidence." }
        else Ok ()

    let private rotationMatrix rotation : Matrix3 =
        let e1 = Cl3.rotate rotation (Cl3.vector 1.0 0.0 0.0) |> fromCl3
        let e2 = Cl3.rotate rotation (Cl3.vector 0.0 1.0 0.0) |> fromCl3
        let e3 = Cl3.rotate rotation (Cl3.vector 0.0 0.0 1.0) |> fromCl3
        [| [| e1.X; e2.X; e3.X |]
           [| e1.Y; e2.Y; e3.Y |]
           [| e1.Z; e2.Z; e3.Z |] |]

    let private matrixVector (matrix: Matrix3) vector =
        { X = matrix.[0].[0] * vector.X + matrix.[0].[1] * vector.Y + matrix.[0].[2] * vector.Z
          Y = matrix.[1].[0] * vector.X + matrix.[1].[1] * vector.Y + matrix.[1].[2] * vector.Z
          Z = matrix.[2].[0] * vector.X + matrix.[2].[1] * vector.Y + matrix.[2].[2] * vector.Z }

    let private covarianceArray covariance =
        [| [| covariance.XX; covariance.XY; covariance.XZ |]
           [| covariance.XY; covariance.YY; covariance.YZ |]
           [| covariance.XZ; covariance.YZ; covariance.ZZ |] |]

    let private multiplyMatrices (left: Matrix3) (right: Matrix3) : Matrix3 =
        Array.init 3 (fun row ->
            Array.init 3 (fun column ->
                [| 0; 1; 2 |] |> Array.sumBy (fun inner -> left.[row].[inner] * right.[inner].[column])))

    let private transpose (matrix: Matrix3) : Matrix3 =
        Array.init 3 (fun row -> Array.init 3 (fun column -> matrix.[column].[row]))

    let private symmetricOfArray (matrix: Matrix3) =
        { XX = matrix.[0].[0]
          XY = 0.5 * (matrix.[0].[1] + matrix.[1].[0])
          XZ = 0.5 * (matrix.[0].[2] + matrix.[2].[0])
          YY = matrix.[1].[1]
          YZ = 0.5 * (matrix.[1].[2] + matrix.[2].[1])
          ZZ = matrix.[2].[2] }

    let identityPose =
        { Rotation = Cl3.one
          Translation = { X = 0.0; Y = 0.0; Z = 0.0 } }

    let tryTransformPoint pose point =
        tryValidatePose pose
        |> Result.map (fun () ->
            Cl3.rotate pose.Rotation (toCl3 point)
            |> fromCl3
            |> addVector pose.Translation)

    /// Compose `first` then `second`, matching the machine-checked semidirect law.
    let tryComposePose second first =
        tryValidatePose first
        |> Result.bind (fun () -> tryValidatePose second)
        |> Result.bind (fun () ->
            tryTransformPoint
                { Rotation = second.Rotation
                  Translation = { X = 0.0; Y = 0.0; Z = 0.0 } }
                first.Translation
            |> Result.map (fun translated ->
                { Rotation = Cl3.gp second.Rotation first.Rotation
                  Translation = addVector translated second.Translation }))

    let tryInversePose pose =
        tryValidatePose pose
        |> Result.bind (fun () ->
            let inverseRotation = Cl3.reverse pose.Rotation
            tryTransformPoint
                { Rotation = inverseRotation
                  Translation = { X = 0.0; Y = 0.0; Z = 0.0 } }
                (scaleVector -1.0 pose.Translation)
            |> Result.map (fun translation ->
                { Rotation = inverseRotation
                  Translation = translation }))

    let tryTransformGaussian pose belief =
        tryValidatePose pose
        |> Result.bind (fun () ->
            if not (Gaussian3.isProper belief) then
                Error
                    { Code = "RFFH-IMPROPER-GAUSSIAN"
                      Field = "ObservedPosition"
                      Observed = sprintf "%A" belief
                      SafeNextStep = "Construct the observation from a finite SPD covariance." }
            else
                let rotation = rotationMatrix pose.Rotation
                let mean = matrixVector rotation (Gaussian3.mean belief) |> addVector pose.Translation
                let covariance = Gaussian3.covariance belief |> covarianceArray
                let transformed = multiplyMatrices (multiplyMatrices rotation covariance) (transpose rotation)
                Gaussian3.tryOfMeanCovariance mean (symmetricOfArray transformed))

    let private canonicalFloat (value: float) =
        value.ToString("R", CultureInfo.InvariantCulture)

    /// Deterministic compensated addition for accepted finite natural parameters.
    /// Sorting by magnitude makes the reduction independent of factor-map insertion order;
    /// Neumaier compensation retains low-order terms across large cancellation.
    let private stableSum (values: seq<float>) =
        let ordered =
            values
            |> Seq.sortBy (fun value -> -abs value, value)
        let mutable sum = 0.0
        let mutable compensation = 0.0
        for value in ordered do
            let next = sum + value
            compensation <-
                compensation
                + if abs sum >= abs value then (sum - next) + value else (value - next) + sum
            sum <- next
        sum + compensation

    let private messageFingerprint (message: ColumnMessage) =
        let rotation = rotationCoefficients message.SenderToRoom.Rotation |> Array.map canonicalFloat |> String.concat ","
        let translation =
            [| message.SenderToRoom.Translation.X; message.SenderToRoom.Translation.Y; message.SenderToRoom.Translation.Z |]
            |> Array.map canonicalFloat
            |> String.concat ","
        let position =
            [| message.ObservedPosition.PrecisionMean.X
               message.ObservedPosition.PrecisionMean.Y
               message.ObservedPosition.PrecisionMean.Z
               message.ObservedPosition.Precision.XX
               message.ObservedPosition.Precision.XY
               message.ObservedPosition.Precision.XZ
               message.ObservedPosition.Precision.YY
               message.ObservedPosition.Precision.YZ
               message.ObservedPosition.Precision.ZZ |]
            |> Array.map canonicalFloat
            |> String.concat ","
        let objects =
            message.ObjectEvidence
            |> Map.toArray
            |> Array.map (fun (label, score) -> label + "=" + canonicalFloat score)
            |> String.concat ";"
        let canonical =
            String.concat "|"
                [ message.EmitterColumn
                  string message.LogicalSequence
                  objects
                  position
                  rotation
                  translation
                  message.GeneratorOrder
                  string message.Status ]
        SHA256.HashData(Encoding.UTF8.GetBytes canonical)
        |> Convert.ToHexString
        |> _.ToLowerInvariant()

    let private deterministicFactorIds evidenceId fingerprint =
        let identityBytes = Encoding.UTF8.GetBytes(evidenceId + "|" + fingerprint)
        let digest = SHA256.HashData identityBytes
        let baseId = BitConverter.ToUInt32(digest, 0) &&& 0x3fffffffu
        int (baseId <<< 1), int ((baseId <<< 1) ||| 1u)

    let tryCreateWithGeneratorOrder generatorOrder (candidates: seq<string>) =
        let normalized =
            candidates
            |> Seq.filter (String.IsNullOrWhiteSpace >> not)
            |> Set.ofSeq
        if String.IsNullOrWhiteSpace generatorOrder then
            Error
                { Code = "RFFH-EMPTY-ROOM-GENERATOR-ORDER"
                  Field = "GeneratorOrder"
                  Observed = "empty"
                  SafeNextStep = "Declare the room's coordinate/generator orientation convention." }
        elif Set.isEmpty normalized then
            Error
                { Code = "RFFH-EMPTY-CANDIDATES"
                  Field = "Candidates"
                  Observed = "empty"
                  SafeNextStep = "Declare at least one room/task object candidate." }
        else
            Ok
                { Candidates = normalized
                  GeneratorOrder = generatorOrder
                  ObjectGraph = FactorGraph.empty LogCategorical.algebra
                  PositionGraph = FactorGraph.empty Gaussian3.algebra
                  Evidence = Map.empty
                  Conflicts = [||]
                  FactorOwners = Map.empty }

    let tryCreate (candidates: seq<string>) =
        tryCreateWithGeneratorOrder "declared" candidates

    let private tryValidateMessage (state: Heterarchy) (message: ColumnMessage) =
        if String.IsNullOrWhiteSpace message.EvidenceId then
            Error
                { Code = "RFFH-EMPTY-EVIDENCE-ID"
                  Field = "EvidenceId"
                  Observed = "empty"
                  SafeNextStep = "Assign a stable evidence identity before transmission." }
        elif String.IsNullOrWhiteSpace message.EmitterColumn then
            Error
                { Code = "RFFH-EMPTY-EMITTER"
                  Field = "EmitterColumn"
                  Observed = "empty"
                  SafeNextStep = "Name the emitting module without implying authority." }
        elif message.LogicalSequence < 0L then
            Error
                { Code = "RFFH-NEGATIVE-LOGICAL-SEQUENCE"
                  Field = "LogicalSequence"
                  Observed = string message.LogicalSequence
                  SafeNextStep = "Use a non-negative emitter-local logical sequence." }
        elif String.IsNullOrWhiteSpace message.GeneratorOrder then
            Error
                { Code = "RFFH-EMPTY-GENERATOR-ORDER"
                  Field = "GeneratorOrder"
                  Observed = "empty"
                  SafeNextStep = "Declare the coordinate/generator orientation convention." }
        elif message.GeneratorOrder <> state.GeneratorOrder then
            Error
                { Code = "RFFH-GENERATOR-ORDER-MISMATCH"
                  Field = "GeneratorOrder"
                  Observed = sprintf "room=%s,message=%s" state.GeneratorOrder message.GeneratorOrder
                  SafeNextStep = "Transform the message into the room convention or route it to a matching room." }
        elif message.ObjectEvidence |> Map.exists (fun label score -> not (state.Candidates.Contains label) || not (finite score)) then
            Error
                { Code = "RFFH-INVALID-OBJECT-EVIDENCE"
                  Field = "ObjectEvidence"
                  Observed = sprintf "%A" message.ObjectEvidence
                  SafeNextStep = "Use finite log-evidence over the room's declared candidate support." }
        elif message.Status = Resolved && Map.isEmpty message.ObjectEvidence then
            Error
                { Code = "RFFH-VACUOUS-RESOLUTION"
                  Field = "Status"
                  Observed = "Resolved with no object evidence"
                  SafeNextStep = "Mark the message unresolved or provide explicit object evidence." }
        else
            tryTransformGaussian message.SenderToRoom message.ObservedPosition |> Result.map ignore

    let applyMessage (message: ColumnMessage) (state: Heterarchy) =
        tryValidateMessage state message
        |> Result.bind (fun () ->
            let fingerprint = messageFingerprint message
            match state.Evidence |> Map.tryFind message.EvidenceId with
            | Some (retainedFingerprint, retainedEmitter) when retainedFingerprint = fingerprint ->
                Ok
                    ({ EvidenceId = message.EvidenceId
                       ContentFingerprint = fingerprint
                       EmitterColumn = message.EmitterColumn
                       Disposition = DuplicateIgnored
                       ObjectFactorId = None
                       PositionFactorId = None },
                     state)
            | Some (retainedFingerprint, retainedEmitter) ->
                let receipt =
                    { EvidenceId = message.EvidenceId
                      RetainedFingerprint = retainedFingerprint
                      ChangedFingerprint = fingerprint
                      Emitters = [| retainedEmitter; message.EmitterColumn |] |> Array.distinct |> Array.sort }
                Ok
                    ({ EvidenceId = message.EvidenceId
                       ContentFingerprint = fingerprint
                       EmitterColumn = message.EmitterColumn
                       Disposition = ConflictDetected
                       ObjectFactorId = None
                       PositionFactorId = None },
                     // IDEMPOTENT. Appending unconditionally made the conflict COUNT a channel
                     // through which at-least-once delivery changed the conclusion: redeliver one
                     // conflicting message N times and `EvidenceConflicted(N, _)` grew without
                     // bound -- in the one module whose stated invariant is that replaying the
                     // same evidence identity must not change what is concluded. The same
                     // conflict, reported again, is ONE conflict.
                     //
                     // DEDUPED ON THE WHOLE RECEIPT, not on a subset of its fields. An earlier
                     // draft keyed on (EvidenceId, RetainedFingerprint, ChangedFingerprint) and
                     // merged emitter labels into the matched receipt, on the theory that a NEW
                     // emitter reporting a known conflict was new information. That branch is
                     // UNREACHABLE: the content fingerprint already covers the emitter column, so
                     // two emitters asserting byte-identical content still produce different
                     // fingerprints and are, by this module's own definition, two conflicts. The
                     // merge was code for a case that cannot occur -- so it is gone rather than
                     // left in looking load-bearing. RFFH-10c pins the behaviour that made it
                     // unreachable, so a future change to the fingerprint has to face this.
                     { state with
                         Conflicts =
                             if Array.contains receipt state.Conflicts then state.Conflicts
                             else Array.append state.Conflicts [| receipt |] })
            | None ->
                tryTransformGaussian message.SenderToRoom message.ObservedPosition
                |> Result.bind (fun roomPosition ->
                    let objectEvidence =
                        state.Candidates
                        |> Seq.map (fun candidate ->
                            candidate, message.ObjectEvidence |> Map.tryFind candidate |> Option.defaultValue 0.0)
                        |> Map.ofSeq
                        |> fun natural -> { Natural = natural }
                    let objectFactorId, positionFactorId = deterministicFactorIds message.EvidenceId fingerprint
                    match state.FactorOwners |> Map.tryFind objectFactorId with
                    | Some retainedEvidenceId when retainedEvidenceId <> message.EvidenceId ->
                        Error
                            { Code = "RFFH-FACTOR-ID-COLLISION"
                              Field = "EvidenceId"
                              Observed = sprintf "%s collides with %s" message.EvidenceId retainedEvidenceId
                              SafeNextStep = "Retain both messages outside the fold and widen or replace the deterministic factor-id projection." }
                    | _ ->
                        let objectGraph =
                            state.ObjectGraph
                            |> FactorGraph.addFactor objectFactorId (Factor.prior 0 objectEvidence)
                            |> FactorGraph.passOnce
                        let positionGraph =
                            state.PositionGraph
                            |> FactorGraph.addFactor positionFactorId (Factor.prior 0 roomPosition)
                            |> FactorGraph.passOnce
                        Ok
                            ({ EvidenceId = message.EvidenceId
                               ContentFingerprint = fingerprint
                               EmitterColumn = message.EmitterColumn
                               Disposition = Accepted
                               ObjectFactorId = Some objectFactorId
                               PositionFactorId = Some positionFactorId },
                             { state with
                                 ObjectGraph = objectGraph
                                 PositionGraph = positionGraph
                                 Evidence = state.Evidence |> Map.add message.EvidenceId (fingerprint, message.EmitterColumn)
                                 FactorOwners =
                                     state.FactorOwners
                                     |> Map.add objectFactorId message.EvidenceId
                                     |> Map.add positionFactorId message.EvidenceId })))

    let objectPosterior (state: Heterarchy) =
        let messages =
            state.ObjectGraph.FactorToVar
            |> Map.values
            |> Seq.choose (Map.tryFind 0)
            |> Seq.toArray
        state.Candidates
        |> Seq.map (fun candidate ->
            candidate,
            messages
            |> Seq.map (fun message -> message.Natural |> Map.tryFind candidate |> Option.defaultValue 0.0)
            |> stableSum)
        |> Map.ofSeq
        |> fun natural -> { Natural = natural }
        |> LogCategorical.probabilities state.Candidates

    let positionPosterior (state: Heterarchy) =
        if Map.isEmpty state.Evidence then None
        else
            let messages =
                state.PositionGraph.FactorToVar
                |> Map.values
                |> Seq.choose (Map.tryFind 0)
                |> Seq.toArray
            let sumNaturalComponent selector = messages |> Seq.map selector |> stableSum
            let posterior =
                { PrecisionMean =
                    { X = sumNaturalComponent (fun message -> message.PrecisionMean.X)
                      Y = sumNaturalComponent (fun message -> message.PrecisionMean.Y)
                      Z = sumNaturalComponent (fun message -> message.PrecisionMean.Z) }
                  Precision =
                    { XX = sumNaturalComponent (fun message -> message.Precision.XX)
                      XY = sumNaturalComponent (fun message -> message.Precision.XY)
                      XZ = sumNaturalComponent (fun message -> message.Precision.XZ)
                      YY = sumNaturalComponent (fun message -> message.Precision.YY)
                      YZ = sumNaturalComponent (fun message -> message.Precision.YZ)
                      ZZ = sumNaturalComponent (fun message -> message.Precision.ZZ) } }
            if Gaussian3.isProper posterior then Some posterior else None

    let tryConsensusStatus resolutionThreshold (state: Heterarchy) =
        if not (finite resolutionThreshold) || resolutionThreshold <= 0.5 || resolutionThreshold > 1.0 then
            Error
                { Code = "RFFH-INVALID-RESOLUTION-THRESHOLD"
                  Field = "resolutionThreshold"
                  Observed = sprintf "%.17g" resolutionThreshold
                  SafeNextStep = "Use a finite threshold in (0.5, 1]." }
        elif Map.isEmpty state.Evidence then
            Ok NoEvidence
        else
            let probabilities = objectPosterior state
            if state.Conflicts.Length > 0 then
                Ok (EvidenceConflicted (state.Conflicts.Length, probabilities))
            else
                let objectId, probability = probabilities |> Map.toArray |> Array.maxBy snd
                if probability >= resolutionThreshold then
                    Ok (PosteriorResolved (objectId, probability))
                else
                    Ok (PosteriorUnresolved probabilities)

    let acceptedEvidenceCount (state: Heterarchy) = state.Evidence.Count

    let conflictReceipts (state: Heterarchy) = Array.copy state.Conflicts

    let candidateObjects (state: Heterarchy) = state.Candidates

    let generatorOrder (state: Heterarchy) = state.GeneratorOrder

    let private graphVariableIds (graph: FactorGraph<'message>) =
        graph.Factors
        |> Map.values
        |> Seq.collect _.Neighbors
        |> Seq.distinct
        |> Seq.sort
        |> Seq.toArray

    let private multiNeighborFactorCount (graph: FactorGraph<'message>) =
        graph.Factors
        |> Map.values
        |> Seq.filter (fun factor -> factor.Neighbors.Length > 1)
        |> Seq.length

    let inferenceArchitectureCensus (state: Heterarchy) =
        let objectAfter = FactorGraph.passRounds 7 state.ObjectGraph
        let positionAfter = FactorGraph.passRounds 7 state.PositionGraph
        { ObjectVariableIds = graphVariableIds state.ObjectGraph
          PositionVariableIds = graphVariableIds state.PositionGraph
          ObjectFactorCount = state.ObjectGraph.Factors.Count
          PositionFactorCount = state.PositionGraph.Factors.Count
          ObjectMultiNeighborFactorCount = multiNeighborFactorCount state.ObjectGraph
          PositionMultiNeighborFactorCount = multiNeighborFactorCount state.PositionGraph
          ObjectMessagesChangeAfterSevenMoreRounds = state.ObjectGraph.FactorToVar <> objectAfter.FactorToVar
          PositionMessagesChangeAfterSevenMoreRounds = state.PositionGraph.FactorToVar <> positionAfter.FactorToVar }

    let private canonicalPair left right =
        if String.CompareOrdinal(left, right) <= 0 then left, right else right, left

    let tryCreateTopology modules (parentChild: ParentChildLink seq) (lateral: LateralLink seq) =
        let moduleSet = modules |> Seq.filter (String.IsNullOrWhiteSpace >> not) |> Set.ofSeq
        let parentLinks = parentChild |> Seq.toArray
        let lateralLinks = lateral |> Seq.toArray
        let unknown =
            [| yield! parentLinks |> Array.collect (fun link -> [| link.Parent; link.Child |])
               yield! lateralLinks |> Array.collect (fun link -> [| link.Left; link.Right |]) |]
            |> Array.filter (moduleSet.Contains >> not)
            |> Array.distinct
            |> Array.sort
        if Set.isEmpty moduleSet then
            Error
                { Code = "RFFH-EMPTY-TOPOLOGY"
                  Field = "Modules"
                  Observed = "empty"
                  SafeNextStep = "Declare at least one module before wiring relations." }
        elif unknown.Length > 0 then
            Error
                { Code = "RFFH-UNKNOWN-MODULE"
                  Field = "Topology"
                  Observed = String.concat "," unknown
                  SafeNextStep = "Declare every parent, child, and lateral endpoint in Modules." }
        elif parentLinks |> Array.exists (fun link -> link.Parent = link.Child) then
            Error
                { Code = "RFFH-SELF-PARENT"
                  Field = "ParentChild"
                  Observed = "self edge"
                  SafeNextStep = "Remove the self-parent edge or name distinct modules." }
        elif lateralLinks |> Array.exists (fun link -> link.Left = link.Right) then
            Error
                { Code = "RFFH-SELF-LATERAL"
                  Field = "Lateral"
                  Observed = "self edge"
                  SafeNextStep = "Remove the self-lateral edge; local evidence needs no transport link." }
        else
            let childrenByParent =
                parentLinks
                |> Array.groupBy _.Parent
                |> Array.map (fun (parent, links) -> parent, links |> Array.map _.Child)
                |> Map.ofArray
            let visiting = Collections.Generic.HashSet<string>()
            let visited = Collections.Generic.HashSet<string>()
            let rec hasCycle node =
                if visiting.Contains node then true
                elif visited.Contains node then false
                else
                    visiting.Add node |> ignore
                    let cycle = childrenByParent |> Map.tryFind node |> Option.defaultValue [||] |> Array.exists hasCycle
                    visiting.Remove node |> ignore
                    visited.Add node |> ignore
                    cycle
            if moduleSet |> Seq.exists hasCycle then
                Error
                    { Code = "RFFH-PARENT-CYCLE"
                      Field = "ParentChild"
                      Observed = "directed cycle"
                      SafeNextStep = "Keep the exact first implementation acyclic or add separately tested loopy BP." }
            else
                let invalidPose =
                    parentLinks
                    |> Array.tryPick (fun link ->
                        match tryValidatePose link.ChildToParent with
                        | Ok () -> None
                        | Error error -> Some error)
                match invalidPose with
                | Some error -> Error error
                | None ->
                    Ok
                        { Modules = moduleSet
                          ParentChild = parentLinks
                          Lateral = lateralLinks |> Array.map (fun link -> canonicalPair link.Left link.Right) |> Set.ofArray }

    let canExchangeLaterally left right (topology: Topology) =
        left = right || topology.Lateral.Contains(canonicalPair left right)

    let applyLateralMessage (receiver: string) (message: ColumnMessage) (topology: Topology) (state: Heterarchy) =
        if not (topology.Modules.Contains receiver) then
            Error
                { Code = "RFFH-UNKNOWN-RECEIVER"
                  Field = "receiver"
                  Observed = receiver
                  SafeNextStep = "Route only to a module declared by the topology." }
        elif not (canExchangeLaterally message.EmitterColumn receiver topology) then
            Error
                { Code = "RFFH-NO-LATERAL-EDGE"
                  Field = "Lateral"
                  Observed = sprintf "%s->%s" message.EmitterColumn receiver
                  SafeNextStep = "Add an explicit lateral link or keep the evidence local." }
        else
            applyMessage message state

    let tryComposeParentPath (path: string list) (topology: Topology) =
        match path with
        | [] | [ _ ] -> Ok identityPose
        | _ ->
            let rec collect accumulator remaining =
                match remaining with
                | child :: (parent :: _ as tail) ->
                    match topology.ParentChild |> Array.tryFind (fun link -> link.Child = child && link.Parent = parent) with
                    | None ->
                        Error
                            { Code = "RFFH-MISSING-PARENT-LINK"
                              Field = "ParentChild"
                              Observed = sprintf "%s->%s" child parent
                              SafeNextStep = "Supply an explicit child-to-parent transform for every path step." }
                    | Some link ->
                        tryComposePose link.ChildToParent accumulator
                        |> Result.bind (fun composed -> collect composed tail)
                | _ -> Ok accumulator
            collect identityPose path

    let topologyModules (topology: Topology) = topology.Modules

    let parentChildLinks (topology: Topology) = Array.copy topology.ParentChild
