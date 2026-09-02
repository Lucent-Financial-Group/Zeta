namespace Zeta.Bayesian.Tests

open System
open Xunit
open Zeta.Bayesian
open Zeta.Core

module Rffh = ReferenceFrameFactorHeterarchy

module ReferenceFrameFactorHeterarchyTests =

    let private unwrap (result: Result<'value, Rffh.TeachingError>) : 'value =
        match result with
        | Ok value -> value
        | Error error -> failwithf "%s: %s (%s)" error.Code error.Observed error.SafeNextStep

    let private vector x y z : Rffh.Vec3 = { X = x; Y = y; Z = z }

    let private diagonal x y z : Rffh.Symmetric3 =
        { XX = x; XY = 0.0; XZ = 0.0; YY = y; YZ = 0.0; ZZ = z }

    let private gaussian mean covariance = Rffh.Gaussian3.tryOfMeanCovariance mean covariance |> unwrap

    let private pose rotation translation : Rffh.Pose =
        { Rotation = rotation; Translation = translation }

    let private message id emitter objectEvidence position senderToRoom : Rffh.ColumnMessage =
        { EvidenceId = id
          EmitterColumn = emitter
          LogicalSequence = 0L
          ObjectEvidence = objectEvidence
          ObservedPosition = position
          SenderToRoom = senderToRoom
          GeneratorOrder = "declared"
          Status = Rffh.Unresolved }

    let private empty () = Rffh.tryCreate [ "cup"; "bowl" ] |> unwrap

    let private add observation state = Rffh.applyMessage observation state |> unwrap

    let private close tolerance expected actual =
        Assert.True(abs (expected - actual) <= tolerance, $"expected {expected:R}, got {actual:R}")

    let private closeVector (tolerance: float) (expected: Rffh.Vec3) (actual: Rffh.Vec3) =
        close tolerance expected.X actual.X
        close tolerance expected.Y actual.Y
        close tolerance expected.Z actual.Z

    let private permutations values =
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

    [<Fact>]
    let ``RFFH-1: one typed message is unchanged by identity-frame factor insertion`` () =
        let observation =
            message "e1" "column-a" (Map.ofList [ "cup", log 9.0 ])
                (gaussian (vector 1.0 2.0 3.0) (diagonal 1.0 2.0 3.0))
                Rffh.identityPose
        let receipt, state = add observation (empty ())
        Assert.Equal<Rffh.EvidenceDisposition>(Rffh.Accepted, receipt.Disposition)
        Assert.Equal(1, Rffh.acceptedEvidenceCount state)
        let posterior = Rffh.positionPosterior state |> Option.get
        closeVector 1e-12 (vector 1.0 2.0 3.0) (Rffh.Gaussian3.mean posterior)
        close 1e-12 (9.0 / 10.0) (Rffh.objectPosterior state).["cup"]

    [<Fact>]
    let ``RFFH-2: independent agreeing modules multiply odds and precision`` () =
        let basePosition = gaussian (vector 1.0 0.0 0.0) (diagonal 2.0 2.0 2.0)
        let first = message "e1" "column-a" (Map.ofList [ "cup", log 9.0 ]) basePosition Rffh.identityPose
        let second = message "e2" "column-b" (Map.ofList [ "cup", log 9.0 ]) basePosition Rffh.identityPose
        let _, once = add first (empty ())
        let _, twice = add second once
        close (1e-12) (81.0 / 82.0) (Rffh.objectPosterior twice).["cup"]
        let covariance = Rffh.positionPosterior twice |> Option.get |> Rffh.Gaussian3.covariance
        close 1e-12 1.0 covariance.XX
        match Rffh.tryConsensusStatus 0.95 twice |> unwrap with
        | Rffh.PosteriorResolved (objectId, probability) ->
            Assert.Equal("cup", objectId)
            close 1e-12 (81.0 / 82.0) probability
        | other -> failwithf "expected resolved posterior, got %A" other

    [<Fact>]
    let ``RFFH-3: contradictory modules remain a finite unresolved posterior`` () =
        let position = gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)
        let cup = message "e1" "column-a" (Map.ofList [ "cup", log 9.0 ]) position Rffh.identityPose
        let bowl = message "e2" "column-b" (Map.ofList [ "bowl", log 9.0 ]) position Rffh.identityPose
        let _, state1 = add cup (empty ())
        let _, state2 = add bowl state1
        match Rffh.tryConsensusStatus 0.9 state2 |> unwrap with
        | Rffh.PosteriorUnresolved probabilities ->
            close 1e-12 0.5 probabilities.["cup"]
            close 1e-12 0.5 probabilities.["bowl"]
        | other -> failwithf "contradiction was not retained: %A" other

    [<Fact>]
    let ``RFFH-4: replaying one evidence identity does not double-count it`` () =
        let observation =
            message "same" "column-a" (Map.ofList [ "cup", log 4.0 ])
                (gaussian (vector 2.0 0.0 0.0) (diagonal 2.0 3.0 4.0)) Rffh.identityPose
        let _, once = add observation (empty ())
        let beforeObjects = Rffh.objectPosterior once
        let beforePosition = Rffh.positionPosterior once
        let receipt, twice = add observation once
        Assert.Equal<Rffh.EvidenceDisposition>(Rffh.DuplicateIgnored, receipt.Disposition)
        Assert.Equal<Map<string, float>>(beforeObjects, Rffh.objectPosterior twice)
        Assert.Equal<Rffh.Gaussian3 option>(beforePosition, Rffh.positionPosterior twice)
        Assert.Equal(1, Rffh.acceptedEvidenceCount twice)

    [<Fact>]
    let ``RFFH-5: every arrival permutation yields the same factor posterior`` () =
        let position = gaussian (vector 1.0 -1.0 0.5) (diagonal 1.0 2.0 4.0)
        let messages =
            [ message "e1" "a" (Map.ofList [ "cup", log 2.0 ]) position Rffh.identityPose
              message "e2" "b" (Map.ofList [ "cup", log 3.0 ]) position Rffh.identityPose
              message "e3" "c" (Map.ofList [ "bowl", log 5.0 ]) position Rffh.identityPose ]
        let snapshots =
            permutations messages
            |> Seq.map (fun ordering ->
                let state = ordering |> List.fold (fun current observation -> add observation current |> snd) (empty ())
                Rffh.objectPosterior state, Rffh.positionPosterior state)
            |> Seq.toArray
        snapshots |> Array.tail |> Array.iter (fun snapshot -> Assert.Equal(snapshots.[0], snapshot))

    [<Fact>]
    let ``RFFH-6: two sender frames align to one room-frame point`` () =
        // Independent closed form: the declared +π/2 e12 action is
        // Q(x,y,z)=(-y,x,z). Q(2,3,4)+(4,-2,1)=(1,0,5).
        // The expected side deliberately does not call inverse/point/Gaussian production transforms.
        let target = vector 1.0 0.0 5.0
        let rotated = pose (Cl3.rotor (Math.PI / 2.0) Cl3.e12) (vector 4.0 -2.0 1.0)
        let senderPoint = vector 2.0 3.0 4.0
        let first = message "e1" "a" Map.empty (gaussian target (diagonal 2.0 2.0 2.0)) Rffh.identityPose
        let second = message "e2" "b" Map.empty (gaussian senderPoint (diagonal 2.0 2.0 2.0)) rotated
        let _, state1 = add first (empty ())
        let _, state2 = add second state1
        let posterior = Rffh.positionPosterior state2 |> Option.get
        closeVector 1e-10 target (Rffh.Gaussian3.mean posterior)
        close 1e-10 1.0 (Rffh.Gaussian3.covariance posterior).XX

    [<Fact>]
    let ``RFFH-7: Clifford rotation transports anisotropic covariance, not only the mean`` () =
        let rotation = pose (Cl3.rotor (Math.PI / 4.0) Cl3.e12) (vector 0.0 0.0 0.0)
        let input = gaussian (vector 1.0 0.0 0.0) (diagonal 4.0 1.0 9.0)
        let output = Rffh.tryTransformGaussian rotation input |> unwrap
        let covariance = Rffh.Gaussian3.covariance output
        close 1e-10 2.5 covariance.XX
        close 1e-10 2.5 covariance.YY
        // SIGNED, not `abs`. This line read `abs covariance.XY` until 2026-09-01, and an
        // adversarial review showed what that cost: a REVERSED rotor sandwich (R~vR instead
        // of RvR~) produces XY = -1.5 instead of +1.5, and the absolute value let that pass.
        // Handedness is exactly the defect a Clifford transport must not get wrong, and it
        // was the one thing this assertion could not see -- a check that cannot fail for the
        // failure it is named after.
        close 1e-10 1.5 covariance.XY
        close 1e-10 9.0 covariance.ZZ

    [<Fact>]
    let ``RFFH-8: passive room-frame change commutes with Gaussian fusion`` () =
        let firstPosition = gaussian (vector 1.0 0.0 2.0) (diagonal 4.0 1.0 2.0)
        let secondPosition = gaussian (vector -1.0 3.0 0.5) (diagonal 1.0 3.0 5.0)
        let first = message "e1" "a" Map.empty firstPosition Rffh.identityPose
        let second = message "e2" "b" Map.empty secondPosition Rffh.identityPose
        let _, original1 = add first (empty ())
        let _, original2 = add second original1
        let originalPosterior = Rffh.positionPosterior original2 |> Option.get
        let coordinateChange = pose (Cl3.rotor 0.63 Cl3.e12) (vector 4.0 -2.0 1.0)
        let firstChanged = { first with SenderToRoom = coordinateChange }
        let secondChanged = { second with SenderToRoom = coordinateChange }
        let _, changed1 = add firstChanged (empty ())
        let _, changed2 = add secondChanged changed1
        let actual = Rffh.positionPosterior changed2 |> Option.get

        // Independent information-form fusion, computed from the literal diagonal inputs:
        // μ=(-3/5,3/4,11/7), Σ=diag(4/5,3/4,10/7).
        let fusedX, fusedY, fusedZ = -3.0 / 5.0, 3.0 / 4.0, 11.0 / 7.0
        let varianceX, varianceY, varianceZ = 4.0 / 5.0, 3.0 / 4.0, 10.0 / 7.0
        closeVector 1e-10 (vector fusedX fusedY fusedZ) (Rffh.Gaussian3.mean originalPosterior)
        let originalCovariance = Rffh.Gaussian3.covariance originalPosterior
        close 1e-10 varianceX originalCovariance.XX
        close 1e-10 varianceY originalCovariance.YY
        close 1e-10 varianceZ originalCovariance.ZZ
        let cosine, sine = cos 0.63, sin 0.63
        let expectedMean =
            vector
                (cosine * fusedX - sine * fusedY + 4.0)
                (sine * fusedX + cosine * fusedY - 2.0)
                (fusedZ + 1.0)
        let expectedXX = cosine * cosine * varianceX + sine * sine * varianceY
        let expectedYY = sine * sine * varianceX + cosine * cosine * varianceY
        let expectedXY = cosine * sine * (varianceX - varianceY)

        closeVector 1e-10 expectedMean (Rffh.Gaussian3.mean actual)
        let actualCovariance = Rffh.Gaussian3.covariance actual
        close 1e-10 expectedXX actualCovariance.XX
        close 1e-10 expectedXY actualCovariance.XY
        close 1e-10 0.0 actualCovariance.XZ
        close 1e-10 expectedYY actualCovariance.YY
        close 1e-10 0.0 actualCovariance.YZ
        close 1e-10 varianceZ actualCovariance.ZZ

    [<Fact>]
    let ``RFFH-11: parent-child path composition agrees with sequential Clifford actions`` () =
        let first = pose (Cl3.rotor 0.31 Cl3.e12) (vector 1.0 2.0 0.0)
        let second = pose (Cl3.rotor -0.47 Cl3.e23) (vector -2.0 1.0 3.0)
        let point = vector 0.25 -0.5 2.0
        let links: Rffh.ParentChildLink array =
            [| { Parent = "column"; Child = "sensor"; ChildToParent = first }
               { Parent = "room"; Child = "column"; ChildToParent = second } |]
        let topology = Rffh.tryCreateTopology [ "sensor"; "column"; "room" ] links [] |> unwrap
        let composed = Rffh.tryComposeParentPath [ "sensor"; "column"; "room" ] topology |> unwrap
        let direct = Rffh.tryTransformPoint composed point |> unwrap
        let sequential = point |> Rffh.tryTransformPoint first |> unwrap |> Rffh.tryTransformPoint second |> unwrap
        closeVector 1e-10 sequential direct

    [<Fact>]
    let ``RFFH-9: malformed rotors and covariances produce teaching errors`` () =
        let nonUnit = pose (Cl3.scalar 2.0) (vector 0.0 0.0 0.0)
        match Rffh.tryTransformPoint nonUnit (vector 0.0 0.0 0.0) with
        | Error error ->
            Assert.Equal("RFFH-NONUNIT-ROTOR", error.Code)
            Assert.Contains("Normalize", error.SafeNextStep)
        | Ok _ -> failwith "accepted a non-unit rotor"
        match Rffh.Gaussian3.tryOfMeanCovariance (vector 0.0 0.0 0.0) (diagonal 1.0 -1.0 1.0) with
        | Error error ->
            Assert.Equal("RFFH-NON-SPD-COVARIANCE", error.Code)
            Assert.Contains("positive-definite", error.SafeNextStep)
        | Ok _ -> failwith "accepted a non-SPD covariance"

    [<Fact>]
    let ``RFFH-10: changed content under one evidence identity is retained as a conflict`` () =
        let position = gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)
        let original = message "same" "a" (Map.ofList [ "cup", log 9.0 ]) position Rffh.identityPose
        let changed = message "same" "b" (Map.ofList [ "bowl", log 9.0 ]) position Rffh.identityPose
        let _, once = add original (empty ())
        let before = Rffh.objectPosterior once
        let receipt, twice = add changed once
        Assert.Equal<Rffh.EvidenceDisposition>(Rffh.ConflictDetected, receipt.Disposition)
        Assert.Equal<Map<string, float>>(before, Rffh.objectPosterior twice)
        Assert.Equal(1, Rffh.acceptedEvidenceCount twice)
        let conflicts = Rffh.conflictReceipts twice
        Assert.Single(conflicts) |> ignore
        Assert.Equal<string array>([| "a"; "b" |], conflicts.[0].Emitters)
        match Rffh.tryConsensusStatus 0.9 twice |> unwrap with
        | Rffh.EvidenceConflicted (1, _) -> ()
        | other -> failwithf "expected visible conflict, got %A" other

    [<Fact>]
    let ``RFFH-10b: REDELIVERING one conflict does not grow the conflict count`` () =
        // The falsifier for at-least-once delivery. Before this, every redelivery of
        // the SAME conflicting message appended another receipt, so
        // `EvidenceConflicted(N, _)` counted deliveries rather than conflicts -- an
        // unbounded channel through which replay changed the conclusion, in the one
        // module whose stated invariant forbids exactly that.
        let position = gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)
        let original = message "same" "a" (Map.ofList [ "cup", log 9.0 ]) position Rffh.identityPose
        let changed = message "same" "b" (Map.ofList [ "bowl", log 9.0 ]) position Rffh.identityPose
        let _, once = add original (empty ())
        let _, twice = add changed once
        let _, thrice = add changed twice
        let _, fourth = add changed thrice
        Assert.Equal(1, Rffh.conflictReceipts fourth |> Array.length)
        Assert.Equal<string array>([| "a"; "b" |], (Rffh.conflictReceipts fourth).[0].Emitters)
        match Rffh.tryConsensusStatus 0.9 fourth |> unwrap with
        | Rffh.EvidenceConflicted (1, _) -> ()
        | other -> failwithf "expected ONE conflict after redelivery, got %A" other

    [<Fact>]
    let ``RFFH-10c: the content fingerprint COVERS the emitter, so two emitters are two conflicts`` () =
        // Pins the property that makes emitter-merging unreachable, and it is worth
        // pinning because it is not obvious: "b" and "c" assert byte-identical
        // content under one evidence identity and still produce DIFFERENT
        // fingerprints, hence two receipts. Discovered by writing a merge branch
        // for the case and finding it could never fire.
        //
        // If the fingerprint is ever narrowed to exclude the emitter, this test goes
        // red and whoever narrows it has to decide -- deliberately -- whether two
        // columns disagreeing identically is one conflict or two.
        let position = gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)
        let original = message "same" "a" (Map.ofList [ "cup", log 9.0 ]) position Rffh.identityPose
        let fromB = message "same" "b" (Map.ofList [ "bowl", log 9.0 ]) position Rffh.identityPose
        let fromC = message "same" "c" (Map.ofList [ "bowl", log 9.0 ]) position Rffh.identityPose
        let _, s1 = add original (empty ())
        let _, s2 = add fromB s1
        let _, s3 = add fromC s2
        let conflicts = Rffh.conflictReceipts s3
        Assert.Equal(2, conflicts |> Array.length)
        Assert.NotEqual<string>(conflicts.[0].ChangedFingerprint, conflicts.[1].ChangedFingerprint)
        // ...and redelivering either of them still adds nothing.
        let _, s4 = add fromB s3
        let _, s5 = add fromC s4
        Assert.Equal(2, Rffh.conflictReceipts s5 |> Array.length)

    [<Fact>]
    let ``RFFH-12: removing the lateral edge blocks designated cross-column evidence`` () =
        let withLink =
            Rffh.tryCreateTopology
                [ "a"; "b" ]
                []
                ([ { Left = "a"; Right = "b" } ]: Rffh.LateralLink list)
            |> unwrap
        let withoutLink = Rffh.tryCreateTopology [ "a"; "b" ] [] [] |> unwrap
        let observation =
            message "e1" "a" (Map.ofList [ "cup", log 9.0 ])
                (gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)) Rffh.identityPose
        let receipt, linked = Rffh.applyLateralMessage "b" observation withLink (empty ()) |> unwrap
        Assert.Equal<Rffh.EvidenceDisposition>(Rffh.Accepted, receipt.Disposition)
        Assert.Equal(1, Rffh.acceptedEvidenceCount linked)
        match Rffh.applyLateralMessage "b" observation withoutLink (empty ()) with
        | Error error ->
            Assert.Equal("RFFH-NO-LATERAL-EDGE", error.Code)
            Assert.Contains("explicit lateral link", error.SafeNextStep)
        | Ok _ -> failwith "cross-column evidence crossed a missing lateral edge"

    [<Fact>]
    let ``RFFH-13: parent cycles are refused rather than called exact loopy inference`` () =
        let links: Rffh.ParentChildLink list =
            [ { Parent = "a"; Child = "b"; ChildToParent = Rffh.identityPose }
              { Parent = "b"; Child = "a"; ChildToParent = Rffh.identityPose } ]
        match Rffh.tryCreateTopology [ "a"; "b" ] links [] with
        | Error error ->
            Assert.Equal("RFFH-PARENT-CYCLE", error.Code)
            Assert.Contains("loopy BP", error.SafeNextStep)
        | Ok _ -> failwith "accepted a parent cycle as an exact DAG"

    [<Fact>]
    let ``RFFH-14: distinct evidence identities with equal content remain independent observations`` () =
        let position = gaussian (vector 0.0 0.0 0.0) (diagonal 2.0 2.0 2.0)
        let first = message "e1" "a" (Map.ofList [ "cup", log 4.0 ]) position Rffh.identityPose
        let second = { first with EvidenceId = "e2" }
        let _, once = add first (empty ())
        let _, twice = add second once
        Assert.Equal(2, Rffh.acceptedEvidenceCount twice)
        close 1e-12 (16.0 / 17.0) (Rffh.objectPosterior twice).["cup"]
        close 1e-12 1.0 (Rffh.positionPosterior twice |> Option.get |> Rffh.Gaussian3.covariance).XX

    [<Fact>]
    let ``RFFH-15: unresolved empty object evidence abstains without manufacturing a label`` () =
        let observation =
            message "e1" "a" Map.empty
                (gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)) Rffh.identityPose
        let _, state = add observation (empty ())
        close 1e-12 0.5 (Rffh.objectPosterior state).["cup"]
        close 1e-12 0.5 (Rffh.objectPosterior state).["bowl"]
        match Rffh.tryConsensusStatus 0.9 state |> unwrap with
        | Rffh.PosteriorUnresolved _ -> ()
        | other -> failwithf "abstention manufactured a verdict: %A" other

    [<Fact>]
    let ``RFFH-16: generator-order mismatch is refused at the room boundary`` () =
        let observation =
            { message "e1" "a" Map.empty
                  (gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)) Rffh.identityPose with
                GeneratorOrder = "reversed" }
        match Rffh.applyMessage observation (empty ()) with
        | Error error ->
            Assert.Equal("RFFH-GENERATOR-ORDER-MISMATCH", error.Code)
            Assert.Contains("room=declared,message=reversed", error.Observed)
        | Ok _ -> failwith "pooled evidence expressed under a different generator convention"

    [<Fact>]
    let ``RFFH-17: changed logical sequence or status under one identity is a visible conflict`` () =
        let position = gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)
        let original = message "same" "a" (Map.ofList [ "cup", log 2.0 ]) position Rffh.identityPose
        let _, once = add original (empty ())
        let sequenceChanged = { original with LogicalSequence = 1L }
        let sequenceReceipt, twice = add sequenceChanged once
        Assert.Equal<Rffh.EvidenceDisposition>(Rffh.ConflictDetected, sequenceReceipt.Disposition)
        let statusChanged = { original with Status = Rffh.Resolved }
        let statusReceipt, three = add statusChanged twice
        Assert.Equal<Rffh.EvidenceDisposition>(Rffh.ConflictDetected, statusReceipt.Disposition)
        Assert.Equal(2, Rffh.conflictReceipts three |> Array.length)

    [<Fact>]
    let ``RFFH-18: the strict majority threshold makes a tied maximum unresolvable`` () =
        let position = gaussian (vector 0.0 0.0 0.0) (diagonal 1.0 1.0 1.0)
        let observation = message "e1" "a" Map.empty position Rffh.identityPose
        let _, state = add observation (empty ())
        match Rffh.tryConsensusStatus 0.5 state with
        | Error error ->
            Assert.Equal("RFFH-INVALID-RESOLUTION-THRESHOLD", error.Code)
            Assert.Contains("(0.5, 1]", error.SafeNextStep)
        | Ok other -> failwithf "accepted a threshold at which a tied maximum could resolve: %A" other
        match Rffh.tryConsensusStatus 0.5000001 state |> unwrap with
        | Rffh.PosteriorUnresolved probabilities ->
            close 1e-12 0.5 probabilities.["cup"]
            close 1e-12 0.5 probabilities.["bowl"]
        | other -> failwithf "a lexicographic tie-break manufactured resolution: %A" other
