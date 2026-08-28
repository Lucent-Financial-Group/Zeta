---
name: polymorphic-diplomacy-validation-pipeline-shape-selector-policy-vulns-default-closed-structural-provable-2026-06-04
description: "The safe-polymorphic-deserialization architecture (Aaron+Kestrel 2026-06-04): polymorphic diplomacy = shape-negotiation + interrogation = STRUCTURAL-safe (kills type-confusion/mismatch/version-skew/parse-halfway) NOT semantic-safe. Semantic layer = a razor-cut SHAPE LIBRARY (irreducible canonical shapes + semantics + known-vulns) validated by the kernel pipeline SHAPE → SELECTOR(verified-context, fail-closed) → POLICY(default-deny positive validation) → VULNS(known-bad blocklist over the default-deny base). DEFAULT-CLOSED/force-open-explicit kills the fail-open CVE class — make it STRUCTURAL (type: missing-case=deny) + PROVABLE (TLA+ allow-without-grant unreachable). Extends B-1010 + B-1017."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 (Aaron + Kestrel) — the architecture for "safe" polymorphic deserialization
("polymorphic diplomacy"). The policy kernel (B-1017) reused at the deserialize-safety
junction (B-1010). Honestly scoped layers:

**Layer 0 — polymorphic diplomacy (STRUCTURAL safety).** Shape-NEGOTIATION between
not-fully-trusting stream endpoints + an INTERROGATION interface (query the shape/version/
fields before committing to decode). Eliminates the BULK of real serialization errors —
the STRUCTURAL classes: type-confusion, structural-mismatch, version-skew, parse-halfway —
by making **shape checked-before-use**. Does NOT eliminate semantic/adversarial. Constraint:
the interrogation must **VERIFY the declared shape against the actual payload**, never trust
the peer's self-declaration (a malicious peer lies about its shape — verify-don't-trust /
source≠authority).

**Layer 1 — the SHAPE LIBRARY (semantic base).** A razor-cut library of irreducible
canonical shapes (isomorphism-collapsed, orthogonally labeled = the base ontology, now
with semantics attached). Semantics attach to the interned canonical shapes (the Eve
shape-cache), reused per-shape, composed like the shapes. Cross-shape RELATIONAL
constraints need an explicit layer (composite-semantics ≠ always conjunction-of-parts —
assume-guarantee seam).

**The validation PIPELINE = the policy kernel at the validation junction:**
`SHAPE → SELECTOR → POLICY → VULNS`
- **SHAPE** — what it is (from the library).
- **SELECTOR** — predicate picking which policy applies in this context. MUST key on
  **VERIFIED/authoritative context, not self-declared** (the source's trust-level claim is
  an input to validate, not an authority to let it pick its own policy). MUST **FAIL
  CLOSED** — unrecognized shape / unresolvable context → most-restrictive/default-deny
  policy, never no-policy-passthrough (the novel shape gets DENIED, not bypassed). =
  trust-context-sensitive with fail-closed default-deny.
- **POLICY** — positive / default-deny validation (valid iff matches an allowed spec —
  allowlist, NOT just reject-known-bad).
- **VULNS** — known-bad-pattern BLOCKLIST (signature-defense; the systematized RLS/CVE-
  pattern-catch). A STRENGTHENING layer OVER the default-deny base, NEVER the foundation —
  "we check known vulns" rounds up to "we're safe" = the trap (catches catalogued, misses
  novel). allow-only-known-good (base) + reject-also-known-bad (strengthen) = sound.
- **+ APPLY-GATING** — the residual: a correctly-shaped-but-untrusted **reified computation**
  (Bonsai Expr) negotiated fine as "computation of shape X" but running it is unsafe →
  no-auto-apply on untrusted; gate apply behind signed-instruction / capability (the
  reflective-loop / B-1010 surface at its sharpest).

**DEFAULT-CLOSED / force-open-explicit (the CVE-class killer, Aaron 2026-06-04):** the
overwhelming majority of high CVEs are FAIL-OPEN (unanticipated state → allow: auth bypass,
injection passthrough, RLS). Default-closed turns security bugs into AVAILABILITY bugs
(loud, self-revealing, fixed-forward vs silent-exploitable). Make it **STRUCTURAL not
convention**: the type/framework makes **missing-case = deny** (absence of a decision IS a
deny at the type level; no syntactic path to accidental-open; zero-effort default = the
safe side, because zero-effort is what happens under deadline). Force-to-open = a
deliberate, attributable, reviewable grant. **PROVABLE**: TLA+ "**allow-without-explicit-
grant is unreachable**" — the SAME gate-reachability as the policy-activation gate
("active-without-signoff unreachable", [[2026-06-04-kestrel-policy-shapes...]] /
PolicyKind.fs); types enforce missing-case=deny at compile.

Composes [[project_codecs_as_policy_parameterized_folds_add_ontology_to_value_tree_2026_06_04]]
(the kernel + reflective loop) + [[project_rodneys_razor_formalized_...]] (razor-cut shapes)
+ [[project_eve_protocol_...]] (shape-cache) + B-1010 (deserialize-safe pure subset) +
B-1017 (the policy kernel). Status: architecture captured; buildable later (a real
consumer / the security need pulls it). PolicyKind.fs already enforces a fail-closed
gate-by-construction (active requires matching signoff) — the same shape this generalizes.
