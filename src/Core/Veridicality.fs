namespace Zeta.Core

open System


/// **Veridicality — provenance-aware claim scoring (foundation).**
///
/// This module hosts the primitives for what the bootstrap-era
/// conversation called the "bullshit detector" and Amara's
/// subsequent ferries (7th-10th) formalized as veridicality
/// scoring. The name `Veridicality` (from Latin *veridicus*,
/// "truth-telling") names the scorable quantity: how true-to-
/// reality a claim looks given its provenance, falsifiability,
/// coherence, drift, and compression-gap signals. "Bullshit" is
/// the informal inverse (`bullshit = 1 - veridicality`).
///
/// **First graduation (this file):** `Provenance` + `Claim<'T>`
/// record types + `validateProvenance`. These are the input
/// shapes for every downstream scorer. The actual veridicality
/// scorer (`V(c) = σ(β₀ + β₁(1-P) + β₂(1-F) + β₃(1-K) + …)` from
/// Amara's 7th ferry, or `BS(c) = σ(w₁·C + w₂·(1-P) + …)` from
/// the 10th ferry) is a separate graduation that composes over
/// these types.
///
/// **Attribution.**
/// * **Concept** — the bullshit-detector / provenance-aware-
///   scoring framing is Aaron's design, present in the bootstrap
///   conversation (`docs/amara-full-conversation/**`) before
///   Amara's ferries formalized it. Aaron 2026-04-24 Otto-112:
///   *"bullshit, it was in our conversation history too, not
///   just her ferry."*
/// * **Formalization** — Amara (7th/8th/9th/10th ferries):
///   veridicality formula, semantic-canonicalization "rainbow
///   table", oracle-rule specification, 7-feature composite.
/// * **Implementation** — Otto, under the Otto-105 graduation
///   cadence. Fifth graduation.
///
/// Future graduations add (in priority order): `antiConsensusGate`
/// (requires `Provenance`); `canonicalizeClaim` (semantic
/// canonicalization → `CanonicalClaimKey`); `scoreVeridicality`
/// (the composite function).
[<AutoOpen>]
module Veridicality =

    /// **Provenance** — the evidence trail behind a claim.
    ///
    /// Every accepted claim MUST carry provenance with at minimum
    /// `SourceId`, `RootAuthority`, `ArtifactHash`, and
    /// `SignatureOk = true`. Empty-string `SourceId` or
    /// `RootAuthority`, empty `ArtifactHash`, or `SignatureOk =
    /// false` all indicate unverified or missing evidence.
    ///
    /// Fields match Amara's 9th/10th ferry specification verbatim
    /// (`docs/aurora/2026-04-23-amara-aurora-deep-research-
    /// report-10th-ferry.md` §ADR-style spec for oracle rules and
    /// implementation).
    ///
    /// `RootAuthority` vs `SourceId`: a single source may speak
    /// under different authorities (a mailing list, an academic
    /// publication, a company blog), and consumers of the claim
    /// need both to distinguish "two sources, same root
    /// authority" (anti-consensus-gate failure) from "two sources,
    /// two independent roots" (anti-consensus-gate pass).
    type Provenance =
        { SourceId: string
          RootAuthority: string
          ArtifactHash: string
          BuilderId: string option
          TimestampUtc: DateTimeOffset
          EvidenceClass: string
          SignatureOk: bool }

    /// **Claim<'T>** — a piece of information with a payload,
    /// a weight (matches the Z-set weight model for retraction-
    /// native semantics), and its provenance.
    ///
    /// `Id` is the claim's identity in the claim ledger. `Payload`
    /// is the domain-specific information being claimed (a string,
    /// a record, a numeric oracle reading — whatever the caller
    /// has). `Weight` is a signed multiplicity: positive for
    /// assertion, negative for retraction. Total net-zero after
    /// assertion+retraction matches Z-set semantics.
    type Claim<'T> =
        { Id: string
          Payload: 'T
          Weight: int64
          Prov: Provenance }

    /// **Validate provenance** — returns `true` when the
    /// provenance has the minimum fields populated + a valid
    /// signature. Returns `false` on empty-string `SourceId`,
    /// `RootAuthority`, or `ArtifactHash`, or when `SignatureOk
    /// = false`.
    ///
    /// Matches Amara's 10th-ferry snippet:
    ///
    /// ```
    /// let validateProvenance c =
    ///     c.Prov.SourceId <> ""
    ///     && c.Prov.RootAuthority <> ""
    ///     && c.Prov.ArtifactHash <> ""
    ///     && c.Prov.SignatureOk
    /// ```
    ///
    /// `BuilderId = None`, `TimestampUtc`, and `EvidenceClass`
    /// are NOT checked by this predicate — they are evidence
    /// quality signals that downstream scorers consume, not
    /// hard validity gates. An unsigned artifact with known
    /// source/root/hash is still rejected, because cryptographic
    /// attestation is the minimum trust bar.
    let validateProvenance (p: Provenance) : bool =
        p.SourceId <> ""
        && p.RootAuthority <> ""
        && p.ArtifactHash <> ""
        && p.SignatureOk

    /// Convenience alias for `validateProvenance` on a full
    /// `Claim<'T>`, matching Amara's 10th-ferry snippet which
    /// takes a claim rather than bare provenance.
    let validateClaim (c: Claim<'T>) : bool =
        validateProvenance c.Prov
