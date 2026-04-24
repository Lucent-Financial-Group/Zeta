module Zeta.Tests.Algebra.VeridicalityTests

open System
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ─── Provenance / validateProvenance ─────────

let private goodProv () : Veridicality.Provenance =
    { SourceId = "repo/amara/ferry-10"
      RootAuthority = "amara@aurora"
      ArtifactHash = "blake3:3f8e..."
      BuilderId = Some "otto-115"
      TimestampUtc = DateTimeOffset.UtcNow
      EvidenceClass = "research"
      SignatureOk = true }

[<Fact>]
let ``validateProvenance accepts a fully-populated signed provenance`` () =
    Veridicality.validateProvenance (goodProv ()) |> should equal true

[<Fact>]
let ``validateProvenance rejects empty SourceId`` () =
    let p = { goodProv () with SourceId = "" }
    Veridicality.validateProvenance p |> should equal false

[<Fact>]
let ``validateProvenance rejects empty RootAuthority`` () =
    let p = { goodProv () with RootAuthority = "" }
    Veridicality.validateProvenance p |> should equal false

[<Fact>]
let ``validateProvenance rejects empty ArtifactHash`` () =
    let p = { goodProv () with ArtifactHash = "" }
    Veridicality.validateProvenance p |> should equal false

[<Fact>]
let ``validateProvenance rejects SignatureOk = false`` () =
    let p = { goodProv () with SignatureOk = false }
    Veridicality.validateProvenance p |> should equal false

[<Fact>]
let ``validateProvenance accepts BuilderId = None (not a hard gate)`` () =
    // BuilderId is a quality signal, not a validity gate. An
    // artifact can be legitimately signed without a builder
    // identity (e.g., a human-authored doc signed with a personal
    // key).
    let p = { goodProv () with BuilderId = None }
    Veridicality.validateProvenance p |> should equal true


// ─── Claim<'T> / validateClaim ─────────

[<Fact>]
let ``validateClaim wraps validateProvenance on the claim's provenance`` () =
    let c =
        { Id = "claim-001"
          Payload = 42
          Weight = 1L
          Prov = goodProv () }
    Veridicality.validateClaim c |> should equal true

[<Fact>]
let ``validateClaim is polymorphic over the Payload type`` () =
    // Same validation whether payload is int, string, record, etc.
    // The provenance discipline doesn't depend on payload shape.
    let c =
        { Id = "claim-002"
          Payload = "Zeta is a retraction-native substrate."
          Weight = 1L
          Prov = goodProv () }
    Veridicality.validateClaim c |> should equal true

[<Fact>]
let ``validateClaim rejects a claim with invalid provenance`` () =
    let c =
        { Id = "claim-003"
          Payload = ()
          Weight = 1L
          Prov = { goodProv () with SignatureOk = false } }
    Veridicality.validateClaim c |> should equal false

[<Fact>]
let ``Claim supports negative Weight for retraction semantics`` () =
    // Z-set style: negative weight = retraction. validateClaim
    // does NOT inspect Weight; a retraction claim is valid if its
    // provenance is valid. Retraction semantics are at the ledger
    // level, not the claim-validity level.
    let c =
        { Id = "claim-004"
          Payload = 7
          Weight = -1L
          Prov = goodProv () }
    Veridicality.validateClaim c |> should equal true
