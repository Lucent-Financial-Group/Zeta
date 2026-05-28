# OpenSpec Catch-up: Phase 1 Audit & Sequencing

This document contains the audit and sequencing for Phase 1 of the OpenSpec catch-up project (B-0171). The goal of this phase is to identify the most critical, unspecced capabilities in the Zeta codebase and prioritize them for spec authoring.

## 1. Audit of Existing Specs (`openspec/specs/`)

An audit of the `openspec/specs/` directory on 2026-05-28 revealed that the existing subdirectories are placeholders and do not contain any formal specifications. The `DbspSpec.tla` file was found under `tools/tla/specs`, but it is not part of the `openspec` directory.

**Conclusion:** The `openspec/specs/` directory is effectively empty. All core capabilities are currently unspecced within the OpenSpec framework.

## 2. Audit of Core Capabilities

The following core capabilities were identified as load-bearing and were audited for existing implementations and specifications.

### Z-Set Algebra
- **Implementations:** `src/Core/ZSet.fs`, `src/Core/IndexedZSet.fs`
- **Specs:** None found in `openspec/specs/`.
- **Notes:** This is a mature, core data structure with a rich set of operations and extensive tests. It is a prime candidate for a formal spec.

### Tick-History Schema
- **Implementations:** A suite of tools under `tools/hygiene/` (e.g., `append-tick-history-row.ts`, `check-tick-history-order.ts`) operate on the tick history shards.
- **Specs:** None found.
- **Notes:** The structure of the tick-history shards is a critical, cross-cutting concern. A formal spec would document the schema, frontmatter fields, and the invariants that the hygiene tools enforce.

### DBSP Operators
- **Implementations:** Various research documents and a Lean proof (`DbspChainRule.lean`) reference DBSP.
- **Specs:** A TLA+ spec exists at `tools/tla/specs/DbspSpec.tla`.
- **Notes:** While a spec exists, it needs to be audited for completeness and brought into the `openspec/specs/` directory.

### Retraction-Native Semantics
- **Implementations:** This concept is diffuse and appears in many places. The ADR `docs/DECISIONS/2026-04-24-graph-substrate-zset-backed-retraction-native.md` is a key document.
- **Specs:** None found.
- **Notes:** This is a foundational principle of the factory. A spec would need to be created to formalize the rules and guarantees of retraction-native operations.

## 3. Phase 1 Sequencing

Based on the audit, the following is the prioritized sequence for authoring new specs in Phase 2.

1.  **`spec/z-set-algebra`:** Formalize the Z-Set and IndexedZSet data structures, their operations, and their algebraic properties. This is the highest priority as it is a core building block.
2.  **`spec/tick-history`:** Define the canonical schema for tick-history shards, including frontmatter, body format, and invariants.
3.  **`spec/retraction-native`:** Create a spec that defines the principles and guarantees of retraction-native semantics, using the existing ADR as a starting point.
4.  **`spec/dbsp-operators`:** Audit the existing `DbspSpec.tla`, move it to the `openspec/specs/` directory, and update it to reflect the current state of research and implementation.

This concludes the Phase 1 audit. The next step is to begin authoring the specs in the prioritized order, starting with Z-Set Algebra.
