namespace Zeta.Core

open System


/// Result of checking an operation against a Limit boundary.
[<RequireQualifiedAccess>]
type PermissionState =
    | Deny
    | Allow


/// Validation failures for constructing Limit primitives.
[<RequireQualifiedAccess>]
type LimitValidationError =
    | BlankOperation
    | BlankGrantId


/// Stable operation identity checked by the Limit primitive.
[<Struct>]
type LimitOperation =
    private
    | LimitOperation of value: string

    member this.Value =
        let (LimitOperation value) = this
        value


[<RequireQualifiedAccess>]
[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module LimitOperation =

    /// Build an operation identity. Blank or whitespace-only input is
    /// malformed and therefore cannot become an allowable operation.
    let tryCreate (value: string) : Result<LimitOperation, LimitValidationError> =
        if String.IsNullOrWhiteSpace value then
            Error LimitValidationError.BlankOperation
        else
            Ok (LimitOperation(value.Trim()))


/// Opaque identifier for the explicit grant evidence opening one boundary.
[<Struct>]
type LimitGrantId =
    private
    | LimitGrantId of value: string

    member this.Value =
        let (LimitGrantId value) = this
        value


[<RequireQualifiedAccess>]
[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module LimitGrantId =

    /// Build a grant evidence identifier. Blank evidence remains no
    /// evidence; callers must supply a concrete positive grant.
    let tryCreate (value: string) : Result<LimitGrantId, LimitValidationError> =
        if String.IsNullOrWhiteSpace value then
            Error LimitValidationError.BlankGrantId
        else
            Ok (LimitGrantId(value.Trim()))


/// Explicit evidence that one operation is currently allowed.
type LimitGrantEvidence =
    private
        { Operation: LimitOperation
          GrantId: LimitGrantId
          GrantedAt: DateTimeOffset }


[<RequireQualifiedAccess>]
[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module LimitGrantEvidence =

    /// Build valid grant evidence. Construction requires already-valid
    /// operation and grant identifiers, so malformed input cannot be
    /// smuggled into the allow path.
    let create
        (operation: LimitOperation)
        (grantId: LimitGrantId)
        (grantedAt: DateTimeOffset) : LimitGrantEvidence =
        { Operation = operation
          GrantId = grantId
          GrantedAt = grantedAt }

    /// Operation opened by this grant evidence.
    let operation (evidence: LimitGrantEvidence) : LimitOperation =
        evidence.Operation

    /// Identifier of the explicit grant evidence.
    let grantId (evidence: LimitGrantEvidence) : LimitGrantId =
        evidence.GrantId

    /// Timestamp supplied by the caller when the grant was established.
    let grantedAt (evidence: LimitGrantEvidence) : DateTimeOffset =
        evidence.GrantedAt


/// Limit boundary. The default is not stored as mutable state: it is always
/// `Deny`, and only explicit valid grants create white patches.
type LimitBoundary =
    private
    | LimitBoundary of explicitGrants: Map<LimitOperation, LimitGrantEvidence>

    member _.Default =
        PermissionState.Deny

    member this.ExplicitGrants =
        let (LimitBoundary grants) = this
        grants


[<RequireQualifiedAccess>]
[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module LimitBoundary =

    /// Closed-by-default Limit boundary.
    let defaultLimit : LimitBoundary =
        LimitBoundary Map.empty

    /// Attach one explicit grant to a boundary.
    let withGrant (evidence: LimitGrantEvidence) (boundary: LimitBoundary) : LimitBoundary =
        let (LimitBoundary grants) = boundary
        LimitBoundary (Map.add (LimitGrantEvidence.operation evidence) evidence grants)

    /// Validate raw grant input and attach it when it is explicit and valid.
    let tryWithGrant
        (operation: LimitOperation)
        (grantId: string)
        (grantedAt: DateTimeOffset)
        (boundary: LimitBoundary) : Result<LimitBoundary, LimitValidationError> =
        match LimitGrantId.tryCreate grantId with
        | Error error -> Error error
        | Ok validGrantId ->
            Ok (withGrant (LimitGrantEvidence.create operation validGrantId grantedAt) boundary)

    /// Check an operation. Absence of a matching valid grant always denies.
    let checkOperation (operation: LimitOperation) (boundary: LimitBoundary) : PermissionState =
        let (LimitBoundary grants) = boundary

        match Map.tryFind operation grants with
        | Some _ -> PermissionState.Allow
        | None -> PermissionState.Deny
