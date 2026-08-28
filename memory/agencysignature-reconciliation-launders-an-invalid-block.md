---
name: agencysignature-reconciliation-launders-an-invalid-block
description: An individually-invalid AgencySignature block PASSES once a weaker block is appended — reconciliation masks the cross-field violation. Fix-forward with a corrected block does NOT clear it.
metadata:
  type: reference
---

Measured 2026-08-26 by running the real validator against #15545's rebuilt
squash preimage (not reasoned about — executed):

| preimage | exit | verdict |
|---|---|---|
| as-is (`not-implied-by-credential` + `chat`) | 1 | cross-field violation |
| + corrected `not-implied-by-credential` + `none` | **1** | blocks disagree on a governance-critical field |
| + `explicit` + `chat` | 1 | disagree |
| **+ `Human-Review: none` + `Human-Review-Evidence: none`** | **0** | **PASS** |

**Two separate facts here.**

**1. Fix-forward does not work.** `reconcileReviewEvidence` only resolves evidence
as a consequence of a *review* reconciliation. When the two blocks' `Human-Review`
values AGREE, there is nothing to reconcile and the cross-field violation stands.
I instructed two agents to fix it this way; it would have spent a commit and left
the check red. The correct route is close-and-rebranch (what the owner did:
#15545/#15549 -> #15558/#15559), NOT a force-push and NOT an added commit.

**2. The passing row is a laundering hole.** Appending a WEAKER block makes the
review values disagree, so the pair reconciles to the weakest claim — and the
original block's cross-field violation is never re-checked. A governance check
that goes green by ADDING a claim rather than fixing one. Sits next to the
already-admitted hole that the parser cannot distinguish a copied block from an
earned one.

**Also measured:** `agencysignature` is **not** in `gate (required)`'s `needs`
(`build-and-test, lint, lint-typescript, cross-verify, full-verify,
test-typescript-hermetic`). Proof: #15538 merged 09:24 with it red. Loud, not
blocking.

**How to apply:** never prescribe fix-forward for a bad signature pair. If a
branch carries one, close and rebranch. Never append a weaker block to go green —
that is the laundering path, and using it quietly is worse than the original
defect. Pair with [[agencysignature-canonical-ten-keys-and-the-two-jobs]] for the
field coupling that causes this in the first place.
