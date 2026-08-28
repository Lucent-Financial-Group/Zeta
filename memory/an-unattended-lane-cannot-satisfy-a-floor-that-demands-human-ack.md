---
name: an-unattended-lane-cannot-satisfy-a-floor-that-demands-human-ack
description: "The search-index lane rebuilds over the whole repo, so it touches cross-oracle floor files, but as a machine lane it can never supply ZETA_FLOOR_VECTORS_ACK — a standing collision, not a flake"
metadata:
  type: project
---

2026-08-26: `rebuild the git-native inverted index` failed (exit 3) with its push
refused by the `pre-push[floor]` hook:

```
pre-push[floor]: BLOCKED (treaty-byte-lock-vectors): this push touches cross-oracle contracts
  src/Core.TypeScript/dynamic-value/golden-vectors-arrow.json
  src/Core.TypeScript/society/golden-vectors-rho-star-not-a-gate.json
  tests/cross-verification/_harness/codegen-clifford-cross-verify.test.ts
pre-push[floor]: Run the oracles (cross-verify) locally, then re-push with
                 ZETA_FLOOR_VECTORS_ACK=1 to state the change is deliberate.
```

**Both halves are behaving correctly, which is what makes it a design question.** The
floor refuses an unacknowledged change to cross-oracle contracts — exactly its job.
The lane rebuilds an index **over the whole repo**, so it touches floor paths as a
matter of course. But it is an *unattended machine lane*, and the remedy the floor
offers is an attestation that a human ran the oracles. **The lane can never supply
it.** So this fails on every tick until the design is changed, and it is a standing
collision, not a flake to retry.

**Do NOT set `ZETA_FLOOR_VECTORS_ACK=1` from an agent to clear it.** That variable
*means* "a human ran the oracles and states this is deliberate." An agent setting it
asserts compliance it did not earn — the same class as copying another agent's
AgencySignature block (see
[[.claude/rules/maintenance-commit-on-another-agents-branch-carries-no-block]]).
It is the strongest guard in the repo, and this is it working.

**AT LEAST TWO LANES, not one — this is structural, and it spreads.** Confirmed
2026-08-26:

| lane | check name | outcome |
|---|---|---|
| search-index | `rebuild the git-native inverted index` | refused, `treaty-byte-lock-vectors` |
| snapshot | `snapshot` | refused, same floor, same remedy |

Both cite `tests/cross-verification/_harness/codegen-clifford-cross-verify.test.ts`.
Any lane whose output sweeps the repo will eventually touch a floor path, so expect
more. Treat a new `exit 3` in `Flush to main via staging branch + PR` as this class
until the reason line says otherwise.

**The real options** (Aaron's call): scope each lane's flush to exclude floor paths,
or route floor-touching output through an attended path.

**Related but DIFFERENT failure, same step, same exit code 3** — do not conflate them:
`Refresh Red State dashboard data` also fails in `Flush to main via staging branch +
PR` with exit 3, but its cause is a stale `--force-with-lease` after a human pushed
to `heartbeat/red-state` (2026-08-25T03:23:10Z). Exit 3 is the flush script's generic
"push refused"; the *reason line* is what distinguishes them. Read it before
assuming.

Related: [[a-manual-push-to-an-automation-lane-branch-breaks-its-lease]] (if written) ·
[[heartbeat-flush-prs-are-self-healing-never-hand-maintain-dirty-ones]]
