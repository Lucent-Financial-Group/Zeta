---
name: adding-zeta-ir-v2-interface-register-in-cross-verify-expectednames
description: Adding a *.ir.json to zeta-ir-v2/interfaces/ requires registering the interface name in cross-verify.ts expectedNames AND running cross-verify-all.ts — the byte-lock oracle is non-required so a miss merges red silently
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

When adding a new interface IR under
`tests/cross-verification/zeta-ir-v2/interfaces/*.ir.json` (e.g. the DBSP-operator
and IKleeneAlgebra oracle mirrors, #9137/#9138), you MUST also:

1. Register the interface `name` in the frozen allowlist
   `expectedNames` in `tests/cross-verification/zeta-ir-v2/cross-verify.ts`
   (it rejects any unlisted interface as "unexpected interface").
2. Run **`bun src/Core.TypeScript/ci/cross-verify-all.ts`** (the byte-lock /
   golden-vector oracle — gate.yml's "Cross-language byte-lock" step). Running only
   the interface *law* test (`cross-verify-interfaces.test.ts`) is NOT enough — it
   doesn't exercise the frozen-allowlist oracle.
3. The oracle regenerates `zeta-ir-v2/ts-output.json`; commit the regenerated snapshot.

**Why:** the cross-verify job in `gate.yml` is NON-REQUIRED (doesn't block
auto-merge), so a broken byte-lock oracle merges to main RED and silently — I did
this twice (#9137/#9138) and only caught it on a later CI-health tick (fixed in
#9141). Also: extends-chain checks in that oracle are literal — the `IStarRing must
extend ISemiring` check had to be made transitive after 081KWG9JQ9H rebased
IStarRing onto IRing. **When you touch cross-verification IRs, run cross-verify-all.ts
before pushing.** Pairs with the always-run-the-real-CI-command discipline.
