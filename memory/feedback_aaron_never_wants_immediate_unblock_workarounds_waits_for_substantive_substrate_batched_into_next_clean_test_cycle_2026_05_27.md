---
name: aaron-never-wants-immediate-unblock-workarounds-waits-for-substantive-substrate-batched-into-next-clean-test-cycle
description: "Aaron 2026-05-27: 'never looking for immeate unblock waiting for substansive changes before next format around using propert declarative depedencies and the other 2 or 3 things we called out that for usb features.' Operator-explicit preference: DO NOT offer sed/manual-edit/live-shell workarounds when install fails. Aaron is NEVER looking for immediate-unblock; he waits for substantive substrate changes to compose into the next clean ISO build + USB flash + fresh-boot test. The right pattern: file the P0 fix-fwd (substrate landing), continue grinding the queued substantive Phase implementations (B-0852 cred-persistence + B-0853 sigstore + B-0854 Ace migration), batch everything into next ISO build, fresh USB flash, clean boot test."
metadata:
  type: feedback
  created: 2026-05-27
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## Verbatim operator framing (Aaron 2026-05-27)

> *"never looking for immeate unblock waiting for substansive changes before next format around using propert declarative depedencies and the other 2 or 3 things we called out that for usb features"*

Context: Aaron's USB boot test failed at nixos-install with `unknown option --fallback`. I (Otto-VSCode) filed the P0 fix-fwd PR + then offered an immediate-unblock sed/manual-edit workaround for his live interactive shell. Aaron rejected the unblock offer + explicitly named the discipline.

## The discipline

**Aaron's preferred operational pattern (per this 2026-05-27 catch + composes with prior memory)**:

1. **Operator observes failure** on live USB boot test
2. **Otto files P0 fix-fwd PR** (substrate landing; merges to main)
3. **Otto continues grinding queued substantive substrate** (Phase 1 implementations of B-NNNN sub-rows)
4. **Multiple substantive changes compose into next ISO build** (CI cascade triggers build)
5. **Aaron flashes fresh USB** (next clean cycle)
6. **Aaron boots fresh USB → next round of empirical test**
7. **Iterate from step 1**

NOT this pattern:

- ~~File P0 fix-fwd~~
- ~~Offer sed/manual-edit on live shell to keep current boot going~~
- ~~Try to coach operator through workaround commands~~
- ~~Suggest skipping to next phase via shell intervention~~

The immediate-unblock workaround is operator-cognitive-cost + violates the clean-substrate-cycle Aaron operates under.

## Why this matters

Aaron operates the framework as a **substrate-engineering iteration loop**, not a debug-the-current-broken-state loop. Each USB cycle = fresh-substrate + fresh-test; if substrate is broken, the right action is fix-the-substrate-and-batch (NOT patch-the-current-USB).

The "other 2 or 3 things we called out for USB features" Aaron names:

| Substrate | Row | Status |
|---|---|---|
| `--fallback` P0 fix | PR #5410 | In flight |
| Declarative credentials (Ace-shape) | B-0852 declarative cred-manifest | Row landed; sub-row implementation queued |
| Sigstore artifact signing | B-0853 | Row landed; sub-row implementation queued |
| `ace install zeta` migration | B-0854 | Row landed; Phase 0/1 implementation queued |
| `gh ssh-key list --json` graceful handling | (separate; not yet filed) | Identified non-blocker; needs row |

All of these compose into the next ISO build. The right Otto-side work pattern: grind the sub-row implementations + bundle into next ISO + Aaron tests on fresh USB.

## Operational discipline for future-Otto cold-boots

When operator observes install/boot failure on live USB:

1. **File P0 fix-fwd PR immediately** (substrate-landing scope) — this is correct
2. **DO NOT offer live-USB workarounds** (sed / manual file edit / shell commands to keep current broken boot going)
3. **Acknowledge the failure substrate-honestly** (what broke; what the fix is; PR link)
4. **State explicitly that batching happens at next ISO cycle** (no live-USB intervention expected)
5. **Continue grinding queued substantive implementation work** (don't go quiet; sub-row implementations are the load-bearing next slice per `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` Pattern B per Daya 2026-05-27 proposal)
6. **Compose multiple substantive substrate landings** so next ISO build delivers value across multiple axes
7. **Aaron flashes fresh USB when ready** (operator-paced; not Otto-prompted)

## Composes with

- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` — the Standing-by failure mode rule (and Daya's 2026-05-27 proposed Pattern B extension covering planning-row-landed → sub-row-pending = next slice)
- `.claude/rules/non-coercion-invariant.md` HC-8 — operator authority over their own USB + test cycle; Otto's substrate-engineering work serves operator's clean-cycle test pattern
- `.claude/rules/never-be-idle.md` — sub-row implementation work is the operational state, not waiting on operator's USB cycle
- `.claude/rules/no-directives.md` — operator's preference for clean-cycle iteration is operator-self-disposition, not directive for Otto to enforce
- `.claude/rules/refresh-before-decide.md` — applies at substrate-engineering scope; check what's in flight + what's queued before authoring more substrate
- The "fresh USB queued for Phase 1 test" pattern (Aaron 2026-05-27 earlier in session: "i have a new usb in there we can try too next time you need to format")
- B-0833 (interactive-login-vs-baked-in-keys CI test tension) — composes with the no-creds-on-ISO discipline at install-cycle scope

## Composes with substrate

- PR #5410 (P0 --fallback fix-fwd; the substrate-honest landing)
- B-0852 (credential persistence; declarative cred-manifest discipline per "we should declare each credential we need and save and restore so it's not so imparative too")
- B-0853 (sigstore artifact signing; free-stuff substrate)
- B-0854 (zeta-install.sh → ace install zeta migration; declarative dependencies trajectory)
- B-0846 (WiFi-reproducibility substrate that #5383 added --fallback for; #5410 corrects the API)
- B-0835 (installer-config-bugs canonical bag; this becomes Bug 9 anchor)

## Memory for next-Otto cold-boot

When operator surfaces an install/boot failure on live USB:

1. File P0 fix-fwd PR (substrate landing)
2. Acknowledge the failure with PR link + state that batching happens at next ISO
3. Continue grinding queued substantive substrate (Phase 1 implementations)
4. NEVER offer sed/manual-edit/shell workarounds for live USB
5. Compose multiple substantive landings into next ISO build
6. Aaron flashes fresh USB when ready (operator-paced)

The pattern: fix-the-substrate-and-batch, not patch-the-current-USB. This memory makes that explicit.
