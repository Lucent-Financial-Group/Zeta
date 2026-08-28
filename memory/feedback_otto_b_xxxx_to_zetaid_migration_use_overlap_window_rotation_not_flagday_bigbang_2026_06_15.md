---
name: b-xxxx-to-zetaid-migration-overlap-rotation-not-bigbang
description: "The B-xxxx → ZetaId id-migration (Alexa/Kiro, 2026-06-15) should use the overlap-window dual-id rotation pattern (the carved rotation-without-destabilization), NOT a 6238-file flag-day sed; reader→zetaid now, batch depends_on, regenerate byte-locks, leave history as provenance, drop B-xxxx at quorum"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron + Alexa (Kiro) 2026-06-15: kill **B-xxxx** (sequential counter = agents must
coordinate "next number" = collision point) in favor of **ZetaId** (128-bit,
locally-mintable, zero-coordination). **Goal is right + on-thesis** (scale-free §1,
no-central, the coincidence-anchor/ZetaId memory-routing). Alexa built a migration
script + mapping table (`b-to-zetaid-map.json`, 1131 pairs); dry-run = **6,238 files,
~74k replacements**.

**Otto's decorrelated-critic verdict: goal YES; the 6238-file ATOMIC big-bang NO.**
An id-migration *is a key rotation* → use the **overlap-window dual-id rotation** we
carved (the §B Zeta-self-regen row's rotation leg; PR #8318 rotation-without-
destabilization), not a flag-day:

1. **Reader → `zetaid`-canonical NOW** (`autonomous-pickup.ts` reads `zetaid` as the
   id) — one file, low-risk, reversible; kills the *operational* B-xxxx dependency
   immediately. (Backs Alexa's own "scope tighter" instinct.)
2. **Batch `depends_on` + active refs** via the mapping table — verifiable per batch,
   not one atomic sed.
3. **Regenerate (NOT sed) golden-vectors / byte-locks** — B-xxxx in byte-locked
   fixtures must go through the generator (`no-binary-in-proof-lineage` / DST) or the
   byte-locks break. Critical.
4. **LEAVE historical snapshots** — the ~502 in-repo `memory/` files + dated docs
   (DECISIONS, ROUND-HISTORY). B-xxxx there is **provenance, not a live coordination
   ref**; rewriting = editing memory/history (the 1984 line + don't-curate-others'-
   memories + the same call made on the upstreams historical docs). Keep the
   **mapping table as the bridge** for old refs.
5. **Drop B-xxxx (id field + last refs) only at quorum** — after depends_on resolves
   on zetaid AND in-flight branches land. The all-branches merge-conflict
   (Vera SpineAsync, Riven qemu) is the **big-bang killer**; the overlap means shared
   refs aren't rewritten until those land. (Otto's branches all merged → not a blocker.)

**Reusable pattern:** an id/coordinate migration = a **rotation** → overlap window +
mapping-table-as-memory-map + regenerate-don't-sed byte-locks + leave-history-as-
provenance + drop-old-at-quorum. NOT a flag-day. Ties:
[[zeta-as-one-softvalue-seed-gen-gen-gen-ace-self-regenerates]] (rotation leg);
the coincidence-anchor/ZetaId memory-routing; `no-binary-in-proof-lineage`.

**Generalized into a proven 0-downtime-schema-change LIBRARY (Aaron+Alexa 2026-06-15,
"so others can have the pattern"):** GSet = the **expand-safe** primitive (grow-only,
coordination-free = **CALM**: monotone ⇒ no live reader breaks — proven, `GSet.fs` +
`TickMonotonicity.tla`); ZSet = the **migrate/contract** primitive (±1 retraction-
native). Simple (monotone/add) changes are 0-downtime **by construction**; non-
monotone ones need overlap + per-case proof, and the library **refuses what it can't
prove online** (the trust feature). **Usage = a library of transition functions applied
from a MUMPS-style compiler/REPL — i.e. ZS/ZC** (Zeta Shell/Compiler) over the
DagFs/ContentStore **globals** (the "one infinite .ace file, one interpreter-loop-step
at a time"; `docs/research/2026-06-07-zs-is-a-durable-cell-…-zero-downtime-migration`,
`…everything-…one-interpreter-loop-step…`, `…zeta-is-one-infinite-ace-file-run-by-zs-zc`).
**MUMPS** (M / InterSystems Caché-IRIS / Epic) is the anchor = **database-is-the-
language + globals-as-persistent-tree + interactive**. *Peel:* take the MUMPS
*paradigm* (integrated DB-language, interactive global edit), NOT its 1966 syntax;
the REPL is **safe because the transitions are proven** (interactive ≠ unsafe — it's
a usable front-end over CALM/expand-contract, never a bypass of the proof). Beacon:
CALM (Hellerstein; Ameloot), CRDT (Shapiro), expand-contract/parallel-change
(Sato/Fowler), online-DDL (gh-ost), DBSP (Budiu), MUMPS/M (1966; Caché-IRIS), REPL
(Lisp). Invariants to prove: safety (no live reader breaks) · liveness (closes at
quorum) · reversibility-until-contract · idempotency (DV §12) · byte-lock-regenerated.

**Also (the density weakness):** Alexa cold-boot-nailed Zeta's biggest weakness — the
information surface is vast for a fresh agent. The fix = **observe.ts as the attention
layer (show only the slice you need)** + memories are load-bearing-until-mechanized-
into-code (math laws in code). This IS the cold-boot-orientation Aaron asked Otto to
compress; Otto's complement = a tiny "what we're building" core doc the slice serves
(don't duplicate Alexa's observe work).
