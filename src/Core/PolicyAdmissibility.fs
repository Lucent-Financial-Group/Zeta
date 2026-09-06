namespace Zeta.Core

open System
open System.IO
open System.Security.Cryptography
open System.Text
open System.Text.Json

/// Finite policy self-knowledge and tick-admissibility receipt. This validates
/// declarations and caller-owned envelopes; it never ranks policies or proves
/// that a declared asymptotic shape holds for an implementation.
[<RequireQualifiedAccess>]
module PolicyAdmissibility =

    type SelfReport =
        { PolicyId: string
          Revision: string
          Operation: string
          InputMeasureId: string
          TimeO: string
          SpaceO: string
          DeclaredBy: string
          DeclarationKind: string }

    type TickEnvelope =
        { SourceId: string
          MaxTicks: int
          ChosenBy: string
          Rationale: string
          EnvelopeKind: string }

    type ConstraintBasis =
        { Kind: string
          BasisId: string
          EvidenceRef: string
          Scope: string
          Status: string }

    type Carrier<'T> =
        { Value: 'T
          Sha256: string }

    type Decision =
        | AdmitForTicks
        | DeferUnmatchedRegistry
        | DeferBasisNotImplemented
        | RefuseInvalidSelfReport
        | RefuseInvalidEnvelope
        | RefuseInvalidBasis

    type Receipt =
        { Version: string
          SelfReportSha256: string
          TickEnvelopeSha256: string
          ConstraintBasisSha256: string
          TimeDegree: int
          TimeLogs: int
          SpaceDegree: int
          SpaceLogs: int
          RegistryRelation: string
          Decision: Decision
          Detail: string }

    type ExecutionRequest =
        { TickEnvelopeSha256: string
          MaxTicks: int
          UndeclaredExternalLimits: string list }

    let private sha256 (bytes: byte[]) =
        SHA256.HashData(bytes) |> Convert.ToHexString |> fun text -> text.ToLowerInvariant()

    let private stringProperty (root: JsonElement) (name: string) : Result<string, string> =
        match root.TryGetProperty name with
        | true, property when property.ValueKind = JsonValueKind.String ->
            let value = property.GetString()
            if String.IsNullOrWhiteSpace value then Error(sprintf "missing-or-empty:%s" name) else Ok value
        | _ -> Error(sprintf "missing-or-nonstring:%s" name)

    let private intProperty (root: JsonElement) (name: string) : Result<int, string> =
        match root.TryGetProperty name with
        | true, property when property.ValueKind = JsonValueKind.Number ->
            match property.TryGetInt32() with
            | true, value -> Ok value
            | _ -> Error(sprintf "non-int32:%s" name)
        | _ -> Error(sprintf "missing-or-nonnumeric:%s" name)

    let private parseSelfReport (path: string) : Result<Carrier<SelfReport>, string> =
        let bytes = File.ReadAllBytes path
        use document = JsonDocument.Parse bytes
        let root = document.RootElement
        match
            stringProperty root "policyId",
            stringProperty root "revision",
            stringProperty root "operation",
            stringProperty root "inputMeasureId",
            stringProperty root "timeO",
            stringProperty root "spaceO",
            stringProperty root "declaredBy",
            stringProperty root "declarationKind"
            with
        | Ok policyId, Ok revision, Ok operation, Ok inputMeasureId, Ok timeO, Ok spaceO, Ok declaredBy, Ok declarationKind ->
            Ok
                { Value =
                    { PolicyId = policyId
                      Revision = revision
                      Operation = operation
                      InputMeasureId = inputMeasureId
                      TimeO = timeO
                      SpaceO = spaceO
                      DeclaredBy = declaredBy
                      DeclarationKind = declarationKind }
                  Sha256 = sha256 bytes }
        | _ -> Error "invalid-self-report-json"

    let private parseTickEnvelope (path: string) : Result<Carrier<TickEnvelope>, string> =
        let bytes = File.ReadAllBytes path
        use document = JsonDocument.Parse bytes
        let root = document.RootElement
        match
            stringProperty root "sourceId",
            intProperty root "maxTicks",
            stringProperty root "chosenBy",
            stringProperty root "rationale",
            stringProperty root "envelopeKind"
            with
        | Ok sourceId, Ok maxTicks, Ok chosenBy, Ok rationale, Ok envelopeKind ->
            Ok
                { Value =
                    { SourceId = sourceId
                      MaxTicks = maxTicks
                      ChosenBy = chosenBy
                      Rationale = rationale
                      EnvelopeKind = envelopeKind }
                  Sha256 = sha256 bytes }
        | _ -> Error "invalid-tick-envelope-json"

    let private parseConstraintBasis (path: string) : Result<Carrier<ConstraintBasis>, string> =
        let bytes = File.ReadAllBytes path
        use document = JsonDocument.Parse bytes
        let root = document.RootElement
        match
            stringProperty root "kind",
            stringProperty root "basisId",
            stringProperty root "evidenceRef",
            stringProperty root "scope",
            stringProperty root "status"
            with
        | Ok kind, Ok basisId, Ok evidenceRef, Ok scope, Ok status ->
            Ok
                { Value =
                    { Kind = kind
                      BasisId = basisId
                      EvidenceRef = evidenceRef
                      Scope = scope
                      Status = status }
                  Sha256 = sha256 bytes }
        | _ -> Error "invalid-constraint-basis-json"

    let private allowedInputMeasures = Set.ofList [ "observations"; "cells"; "branches"; "handlers" ]

    let private decisionText decision =
        match decision with
        | AdmitForTicks -> "admit-for-ticks"
        | DeferUnmatchedRegistry -> "defer-unmatched-registry"
        | DeferBasisNotImplemented -> "defer-basis-not-implemented"
        | RefuseInvalidSelfReport -> "refuse-invalid-self-report"
        | RefuseInvalidEnvelope -> "refuse-invalid-envelope"
        | RefuseInvalidBasis -> "refuse-invalid-basis"

    let private registryRelation (report: SelfReport) timeShape spaceShape =
        match Map.tryFind (report.PolicyId, report.Operation) ComplexityRegistry.declared with
        | Some cost ->
            match ComplexityRegistry.parseO cost.Time, ComplexityRegistry.parseO cost.Space with
            | Some registryTime, Some registrySpace when registryTime = timeShape && registrySpace = spaceShape ->
                match cost.By with
                | ComplexityRegistry.Provenance.Proven -> "registry-proven-match"
                | ComplexityRegistry.Provenance.Derived -> "registry-derived-match"
            | _ -> "unmatched"
        | None -> "unmatched"

    let private admitParsed (report: Carrier<SelfReport>) (envelope: Carrier<TickEnvelope>) (basis: Carrier<ConstraintBasis>) : Receipt =
        let fallback decision detail =
            { Version = "PolicyAdmissibilityReceipt/v1"
              SelfReportSha256 = report.Sha256
              TickEnvelopeSha256 = envelope.Sha256
              ConstraintBasisSha256 = basis.Sha256
              TimeDegree = -1
              TimeLogs = -1
              SpaceDegree = -1
              SpaceLogs = -1
              RegistryRelation = "unavailable"
              Decision = decision
              Detail = detail }

        if report.Value.DeclarationKind <> "self-reported" || not (allowedInputMeasures.Contains report.Value.InputMeasureId) then
            fallback RefuseInvalidSelfReport "unsupported-declaration-kind-or-input-measure"
        elif envelope.Value.MaxTicks < 1 || envelope.Value.EnvelopeKind <> "bounded-duration" then
            fallback RefuseInvalidEnvelope "invalid-bounded-duration-envelope"
        elif basis.Value.Status <> "declared" || Set.ofList [ "test-only"; "nci-preservation"; "recorded-consensus" ] |> Set.contains basis.Value.Kind |> not then
            fallback RefuseInvalidBasis "unknown-or-undeclared-basis"
        else
            match ComplexityRegistry.parseO report.Value.TimeO, ComplexityRegistry.parseO report.Value.SpaceO with
            | Some timeShape, Some spaceShape ->
                let relation = registryRelation report.Value timeShape spaceShape
                let decision, detail =
                    match basis.Value.Kind, relation with
                    | "nci-preservation", _
                    | "recorded-consensus", _ -> DeferBasisNotImplemented, "basis-carried-but-not-implemented"
                    | "test-only", "unmatched" -> DeferUnmatchedRegistry, "self-report-has-no-matching-registry-row"
                    | "test-only", _ -> AdmitForTicks, "structural-admission-only; no-policy-ranking-or-complexity-proof"
                    | _ -> RefuseInvalidBasis, "unreachable-basis-kind"
                { Version = "PolicyAdmissibilityReceipt/v1"
                  SelfReportSha256 = report.Sha256
                  TickEnvelopeSha256 = envelope.Sha256
                  ConstraintBasisSha256 = basis.Sha256
                  TimeDegree = timeShape.Degree
                  TimeLogs = timeShape.Logs
                  SpaceDegree = spaceShape.Degree
                  SpaceLogs = spaceShape.Logs
                  RegistryRelation = relation
                  Decision = decision
                  Detail = detail }
            | _ -> fallback RefuseInvalidSelfReport "unparseable-time-or-space-shape"

    let admit (selfReportPath: string) (tickEnvelopePath: string) (constraintBasisPath: string) : Result<Receipt, string> =
        match parseSelfReport selfReportPath, parseTickEnvelope tickEnvelopePath, parseConstraintBasis constraintBasisPath with
        | Ok report, Ok envelope, Ok basis -> Ok(admitParsed report envelope basis)
        | Error detail, _, _ -> Error(sprintf "refuse-invalid-self-report:%s" detail)
        | _, Error detail, _ -> Error(sprintf "refuse-invalid-envelope:%s" detail)
        | _, _, Error detail -> Error(sprintf "refuse-invalid-basis:%s" detail)

    let verifyCarrierFingerprints
        (receipt: Receipt)
        (selfReportPath: string)
        (tickEnvelopePath: string)
        (constraintBasisPath: string)
        : Result<unit, string> =
        match parseSelfReport selfReportPath, parseTickEnvelope tickEnvelopePath, parseConstraintBasis constraintBasisPath with
        | Ok report, Ok envelope, Ok basis ->
            if receipt.SelfReportSha256 = report.Sha256
               && receipt.TickEnvelopeSha256 = envelope.Sha256
               && receipt.ConstraintBasisSha256 = basis.Sha256 then
                Ok()
            else
                Error "refuse-carrier-mismatch"
        | Error detail, _, _ -> Error(sprintf "refuse-invalid-self-report:%s" detail)
        | _, Error detail, _ -> Error(sprintf "refuse-invalid-envelope:%s" detail)
        | _, _, Error detail -> Error(sprintf "refuse-invalid-basis:%s" detail)

    let render (receipt: Receipt) =
        sprintf
            "{\"version\":\"%s\",\"selfReportSha256\":\"%s\",\"tickEnvelopeSha256\":\"%s\",\"constraintBasisSha256\":\"%s\",\"timeDegree\":%d,\"timeLogs\":%d,\"spaceDegree\":%d,\"spaceLogs\":%d,\"registryRelation\":\"%s\",\"decision\":\"%s\",\"detail\":\"%s\"}\n"
            receipt.Version
            receipt.SelfReportSha256
            receipt.TickEnvelopeSha256
            receipt.ConstraintBasisSha256
            receipt.TimeDegree
            receipt.TimeLogs
            receipt.SpaceDegree
            receipt.SpaceLogs
            receipt.RegistryRelation
            (decisionText receipt.Decision)
            receipt.Detail

    let verifyRenderedReceipt (receipt: Receipt) (rendered: string) : Result<unit, string> =
        if render receipt = rendered then Ok() else Error "invalid-receipt-canonical-bytes"

    let authorizeExecution (receipt: Receipt) (request: ExecutionRequest) : Result<int, string> =
        if receipt.Decision <> AdmitForTicks then
            Error "refuse-not-admitted"
        elif request.TickEnvelopeSha256 <> receipt.TickEnvelopeSha256 || request.MaxTicks < 1 then
            Error "refuse-invalid-envelope"
        elif not (List.isEmpty request.UndeclaredExternalLimits) then
            Error "refuse-undeclared-external-budget"
        else
            Ok request.MaxTicks
