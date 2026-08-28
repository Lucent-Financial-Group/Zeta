module Zeta.Core.Consent.KskAuthorization

open System

/// Signer identity for N-of-M multi-sig KSK override.
type Signer = {
    Id: string
    PublicKey: byte[]
}

/// Configuration for KSK (Key Signing Key) override authorization.
type KskConfig = {
    Signers: Signer list
    Threshold: int
    Scope: string
}

/// Authorization request for KSK override (emergency bypass of consent gate).
type KskAuthorizationRequest = {
    Scope: string
    Signatures: (string * byte[]) list  // signerId * signature
}

/// Result of KSK threshold check.
type KskCheckResult =
    | Authorized of signerCount: int * threshold: int
    | InsufficientSigners of provided: int * required: int
    | ScopeMismatch of requested: string * configured: string
    | DuplicateSigners of duplicates: string list

/// Validates N-of-M threshold for KSK override.
/// Returns Result< KskCheckResult, string > for error surfacing.
let checkKskAuthorization (config: KskConfig) (req: KskAuthorizationRequest) : Result<KskCheckResult, string> =
    if req.Scope <> config.Scope then
        Ok (ScopeMismatch (req.Scope, config.Scope))
    else
        let uniqueSigners = req.Signatures |> List.map fst |> List.distinct
        let provided = uniqueSigners.Length
        let required = config.Threshold
        if provided < required then
            Ok (InsufficientSigners (provided, required))
        elif provided > config.Signers.Length then
            Ok (DuplicateSigners (uniqueSigners |> List.filter (fun s -> req.Signatures |> List.map fst |> List.filter ((=) s) |> List.length > 1)))
        else
            Ok (Authorized (provided, required))

// Note: full signature verification (crypto) deferred to follow-up slice; this is threshold logic only.
