---
name: metering-protocols-dlms-cosem-ansi-c12-iec62056-candidate-primitives-paid-specs-cleanroom-itron-concept-not-code
description: Aaron 2026-06-01 — DLMS/COSEM, ANSI C12.18, C12.19, IEC 62056 are utility/smart-meter protocols he has PAID specs for + implemented BY HAND (clean-room-capable first-hand expertise); DLMS + ANSI are also in the proprietary Itron folder (concept-not-code, never reproduce). Candidate wire-codec / schema-driven primitives that fit the serializer roster + the DynamicValue runtime-schema-registry path (ANSI C12.19 tables = schemas; DLMS/COSEM OBIS = data model). TWO IP constraints: Itron source concept-not-code; paid specs clean-room only (route any spec-derived material through the _*_acceptance named-human IP-attribution pattern).
metadata:
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-01 (verbatim): "dlms cosem ansi c12.19 c12.18 iec 62056 are all
protocols i have paid specs for i've implimented them by hand and dlms and ansi
are in the itron folder too"

Surfaced in the serializer / DynamicValue / schema-registry primitive context
(this session built the F# + C# `DynamicValue` oracles + the runtime-schema-
registry framing). These are the real-world candidate protocols for that work.

## The protocols (utility / smart-meter wire + data-model standards)

| Protocol | What it is |
|---|---|
| **DLMS/COSEM** | Device Language Message Specification + COmpanion Specification for Energy Metering — the dominant *international* smart-meter protocol; OBIS-coded object data model + application/transport layers |
| **IEC 62056** | the IEC standardization of DLMS/COSEM (same family, ISO/IEC numbering) |
| **ANSI C12.19** | North American utility end-device **data tables** — i.e. the metering **schema** (table/element definitions) |
| **ANSI C12.18** | the two-way comms protocol over an optical port (the C12.x transport; siblings C12.21 modem, C12.22 networked) |

Aaron has **paid specs** for all of them and **implemented them by hand** —
first-hand, clean-room-capable domain expertise (the same lineage as his Itron
7-year tenure — `user_career_substrate_through_line.md` smart-grid row + the
C12.22/C12.19/DLMS/COSEM protocol list there, and the MacVector/NIST/Boost
first-hand-implementation pattern).

## Why they're candidate primitives (map to this session's work)

- **Serializer roster** (`docs/PRIMITIVE-REGISTRY.md`) — they're wire protocols
  → wire-codec adapters behind the `ISerializer<'T>` seam.
- **DynamicValue + runtime-schema-registry path** (this session) — the canonical
  real-world instance of "schema-required formats join via a runtime schema
  registry":
  - **ANSI C12.19 IS a schema** ("end-device data tables" = table/element
    definitions out-of-band) → the schema-driven decode → `DynamicValue` path.
  - **DLMS/COSEM** is an OBIS-coded object model (schema + partially self-
    describing) → same `DynamicValue` target.
  - These are exactly "runtime schemas and self-describing fit the same shape"
    with a concrete, high-value, billions-of-meters domain.
- **Metering/utility domain** — composes with the Itron/Aurora/smart-grid
  substrate + the "be the rail, meter the flow" through-line.

## The IP picture (Aaron 2026-06-01 correction — the specs ARE the clean room)

Aaron corrected an over-cautious first framing (verbatim): **"the specs are mine
i bought them the are the clean room."** Clean-room = implement from a SPEC (the
published standard) rather than from someone else's CODE. So:

1. **The owned specs ARE the legitimate clean-room source — use them.** Aaron
   bought/licensed the DLMS UA / ANSI / IEC specs; he owns them. Implementing the
   protocols FROM the owned specs IS the clean-room method (that's what specs
   exist for; the whole industry implements them — Gurux DLMS etc.). There is NO
   constraint against using the specs to implement; that is the correct path. The
   only narrow line is don't REDISTRIBUTE the copyrighted spec DOCUMENT verbatim
   — but we IMPLEMENT the protocol, we don't republish the document, so it's a
   non-issue; the `_*_acceptance` pattern would only matter if verbatim spec
   excerpts were preserved, which clean-room implementation doesn't require.
2. **The one real boundary: Itron CODE = concept-not-code, NEVER reproduce.** The
   DLMS + ANSI *implementations* in the proprietary Itron folder
   (`~/Downloads/Itron/`, `Itron.Platform.*`) are what to clean-room AWAY from —
   study concepts only; never read-to-reproduce. The owned specs are the clean
   reference; the Itron code is the contaminated source. Aaron's point:
   implementing from the spec is in fact CLEANER than reading Itron's impl — the
   spec IS the clean room.

## How to apply (future-Otto)

- When the serializer/DynamicValue work reaches metering protocols: treat DLMS/
  COSEM + ANSI C12.x + IEC 62056 as the flagship schema-driven domain for the
  runtime-schema-registry path. Implement from Aaron's owned specs (the legitimate
  clean-room reference) + his hand-impl expertise + public impls; the one boundary
  is never reproduce the Itron CODE (concept-not-code).
- Aaron is a peer-level domain expert here (paid specs + by-hand impl + Itron
  100M-meter scale) — engage at peer register; no "here's what DLMS is."
- This is FYI / candidate-substrate, NOT a "build it now" directive. Public-repo
  registry/backlog entry (framed as public-standard candidates with clean-room
  discipline) is OFFERED, pending Aaron's go — kept out of the public repo for
  now because the provenance (paid specs + Itron-folder) is IP-sensitive.

## Cross-references

- `user_career_substrate_through_line.md` — Itron smart-grid row + protocol list
  + first-hand-implementation lineage (extend there for career context; this
  file is the primitive-candidate + IP-constraint scope).
- `.claude/rules/human-audit-and-legal-risk-acceptance-pattern-in-settings.md` —
  the `_*_acceptance` named-human IP-attribution pattern for any spec-derived
  material.
- `docs/research/ip-questionable/` — the canonical precedent for IP-flagged
  content under named-human acceptance.
- `docs/PRIMITIVE-REGISTRY.md` serializer roster (line 49) + the DynamicValue /
  runtime-schema-registry line (the dynamic-object/polymorphic-shape entry).
- The Itron-concept-not-code standing constraint (all Itron-folder use).
