---
id: B-0852
priority: P1
status: open
title: credential persistence on USB ESP + boot-sequence auth-method picker — encrypted blob bound to USB UUID + operator passphrase (Phase 1); removes gh-login-throttle on USB re-boot workflow (Aaron 2026-05-27)
effort: M
ask: aaron 2026-05-27
created: 2026-05-27
last_updated: 2026-05-27
depends_on:
  - B-0850
composes_with:
  - B-0833
  - B-0835
  - B-0831
  - B-0847
  - B-0851
tags: [installer, credentials, gh-auth, esp-write, encrypted-blob, boot-sequence, auth-method-picker, multi-vendor, phase-1, operator-passphrase, usb-uuid-binding]
---

## Operator framing (Aaron 2026-05-27)

After flashing the 3-vendor 25.11 ISO and booting the USB 3 times to test, Aaron hit a GitHub login rate-limit:

> *"gh has throttled me for loggin in"* + *"we dident even git to those just gh login failed cause this is the 3rd time i booted"*

Root cause: each re-boot of the live USB triggers a fresh `gh auth login` (device-flow) because the live overlay (tmpfs) discards `~/.config/gh/hosts.yml` on shutdown. 3 boots in one day → 3 device-flow logins → GitHub throttle.

Operator-authorized fix:

> *"key bound to uuid and operator passphrase seems best for an easy phase one lets get that going and also change the boot sequence and i can create github token and the bootup can ask which method github is required for now."*

## Phase 1 scope (this row's bounded slice)

Three composing sub-targets all land together as the smallest end-to-end working slice:

### Sub-target 1 — Encrypted cred-blob on USB ESP

- Write `/esp/zeta-creds.enc` after successful auth (post-install service trigger)
- Encryption: AES-256-GCM with key derived from `HKDF(USB-UUID || operator-passphrase, salt, info)`
- Per-AI identity (per B-0847) — blob contains a map: `{ otto: {...}, lior: {...}, vera: {...} }` so each persona's creds round-trip independently
- Contents: `gh/hosts.yml` + `claude/credentials.json` + `gemini/oauth_creds.json` + `codex/auth.json` (per-vendor schemas)
- Key derivation NEVER hits disk; passphrase typed at boot only

### Sub-target 2 — Boot-sequence auth-method picker (correct step layout)

Current `full-ai-cluster/usb-nixos-installer/zeta-install.sh` step layout (verified on origin/main `1740eead6`):

| Step | Owner | What it does |
|---|---|---|
| 6.5 | iter-4.2 | probe boot USB for operator SSH pubkey |
| 6.55 | iter-5.3 (B-0792) | prompt-for-initial-password |
| 6.6 | iter-5.2 (B-0792) | hostname injection |
| 6.7 | iter-5.1 (B-0792) | wifi persistence |
| 6.8 | iter-5.4.0 | homelab gh-auth + operator pubkey copy |
| **6.81-6.83** | **B-0852 (NEW)** | **detection + escape-hatch banner + branch** |
| 6.9 | iter-5.4.1 (B-0812) | self-registration commit+push |
| 7 | iter-4 (B-0789) | print initial credentials |

The auth-method picker integrates AS A NEW SUB-RANGE 6.81-6.83 between the existing Step 6.8 (gh-auth) and Step 6.9 (self-registration), preserving every existing step's number + meaning. Picker runs AFTER Step 6.8's gh-auth flow completes so it has access to both the just-acquired creds (for the persist path) AND the existing creds (for the detect/restore path).

Picker menu shape (Step 6.82):

```text
GitHub authentication method:
  1) Restore from encrypted USB blob (requires passphrase) — DEFAULT if blob present
  2) Fresh device-flow login (current behavior; uses gh CLI quota)
  3) Operator-provided PAT (paste at prompt; bypasses device-flow entirely)
  4) Skip (cluster operates degraded; no GitHub-side substrate)
```

Selection logic:

- If `/esp/zeta-creds.enc` exists → default = (1); operator can override
- If first boot of fresh USB → default = (3) since operator just created PAT per their stated workflow
- Multi-vendor scope: the picker fires ONCE then applies the chosen method to ALL 3 vendors (claude/gemini/codex) in sequence — vendor-CLI installs happen later in the install sequence (post-`nixos-install` first-boot scope); the picker captures the operator intent in `/esp/zeta-creds.enc` so first-boot vendor-CLI install can read the blob without re-prompting

### Sub-target 3 — Passphrase prompt + key derivation

- Passphrase prompt uses `systemd-ask-password` (TTY-bound; no echo)
- Operator types passphrase ONCE at boot; key derived in-memory; decrypted blob written to live overlay
- Wrong passphrase → 3 retries → fall through to (2) fresh login OR (3) PAT
- No "remember passphrase" — re-prompt every boot (substrate-honest about not caching the master key)

## What ships when Phase 1 lands

- `tools/installer/zeta-creds-persist.ts` — write encrypted blob to ESP after successful auth
- `tools/installer/zeta-creds-restore.ts` — read encrypted blob, decrypt with passphrase, restore to per-vendor cred locations
- `tools/installer/zeta-creds-crypto.ts` — pure crypto module (key derivation + AES-GCM); unit-tested
- `full-ai-cluster/usb-nixos-installer/zeta-install.sh` — new Step 6.9 (auth-method picker) + Step 6.95c (persist after successful auth)
- `full-ai-cluster/nixos/modules/zeta-cred-persistence.nix` — NixOS module wrapping the persist + restore services
- Tests: round-trip (encrypt → decrypt with right passphrase = original); wrong-passphrase rejection; tamper detection (GCM auth tag)

## Acceptance criteria

- [ ] Fresh USB + fresh PC: pick (3) operator-PAT → auth succeeds → blob written to ESP
- [ ] Same USB + same/different PC: reboot → pick (1) stored → typed passphrase → auth restored → NO `gh auth login` call
- [ ] Wrong passphrase on (1) → 3 retries → fall through to (3) OR (2)
- [ ] Multi-vendor: all 3 (claude/gemini/codex) creds round-trip in one blob; per-persona substrate-inheritance preserved
- [ ] Tampered blob (modified bytes) → AES-GCM auth fails → fall through to (2)/(3)
- [ ] Re-boot 3+ times same USB → ZERO `gh auth login` device-flow calls (vs current behavior of 3)

## Composes with

- **B-0850** (parent) — multi-vendor systemd substrate the auth flow serves
- **B-0833** — installer interactive-login-vs-baked-in-keys CI test tension; this row resolves the tension WITHOUT shipping creds in the ISO (creds live on ESP, written post-install)
- **B-0835** — installer config bugs including gh-auth-not-respected; this row addresses the gh-auth persistence half
- **B-0831** — CI cascade 6 full-install + cluster-auto-join; auth-method picker (3) PAT path makes CI scriptable
- **B-0847** — per-AI GitHub identity; this row's blob is the per-persona credential carrier
- **B-0851** — persona-first scheduler; chooses which persona's creds to restore per active assignment
- `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md` — implementation work uses isolated worktrees off operator's primary

## Composes with prior substrate

- iter-4.2 ESP SSH pubkey injection (bidirectional channel — pubkey write at flash, creds write at install)
- iter-5.5.0 3-vendor systemd guard post substrate (the auth flow this serves)
- iter-6.x distro-upgrade / current-version-audit substrate (B-0800-B-0805) — composes with the auto-upgrade path

## Future phases (NOT this row's scope)

- **Phase 2**: Path B (look at PC before formatting + try to recover creds from existing install; operator-supervised boot menu option). Composes with Phase 1 — operator confirmed: *"we can do both like you said this will be nice together"*. Phase 2 security model per Aaron 2026-05-27: *"for option b we need to do something to make sure we protect against with like some encryption or someting like you say so randos with physicall access cant get acess we can put a key on the usb too if wnated tied to the uuid so it can't be copied to uuid, we can go hard on security over time but just enough to so i can iterate quickly for now."* Design constraints:
  - Recovered creds encrypted at-rest on USB (NOT plaintext on FAT32 ESP)
  - Optional UUID-bound key on USB so blob can't be defeated by copying to a different-UUID USB (attacker copying ESP contents to another stick doesn't unlock; the unlock derivation requires the original USB UUID)
  - **Iterate-quickly-not-paranoia floor** — Phase 2 ships with enough security to prevent casual physical-access leaks; full hardware-bound + tamper-resistant work defers to Phase 3+ when load-bearing
  - Operator-supervised at boot menu (operator physically present + explicit confirm before any cred scrape happens)
- **Phase 3**: Hardware-bound key (TPM / YubiKey / Touch-ID-derived) replacing operator-passphrase; survives operator-passphrase forgetting; defeats the "USB stolen with both blob AND known UUID" attack
- **Phase 4**: Per-AI distinct passphrases (each persona's creds encrypted with persona-specific key, so persona compromise doesn't leak peers)
- **Phase 5**: Cross-cluster blob join via BFT (multi-cluster credential federation; composes with multi-tic-per-persona substrate)
- **In-cluster GitLab migration** (future B-NNNN candidate) — removes external GitHub dep entirely; this row's substrate carries forward unchanged at GitLab scope

## Phase 1 + Phase 2 composition (operator-confirmed)

Aaron 2026-05-27: *"we can do both like you said this will be nice together"*. The two phases compose into a full credential-lifecycle substrate:

```
Boot menu (after Phase 1 + 2 both land):
  1. Fresh install + fresh device-flow login                 (current default; uses gh quota)
  2. Fresh install + operator-provided PAT                   (Phase 1 sub-target 2; bypasses device-flow)
  3. Fresh install + restore from this USB's encrypted blob  (Phase 1 replay)
  4. Fresh install + import from THIS PC's existing install  (Phase 2; operator-supervised)
  5. Live mode (no install)                                  (current default)
```

Composition value:

- **Multi-boot same USB same PC**: option 3 (Phase 1 replay) — no re-login, no gh-quota burn
- **Fresh USB, PC has existing creds**: option 4 (Phase 2 harvest) — re-uses operator's existing setup work
- **Fresh USB, fresh PC, operator has PAT**: option 2 (Phase 1 PAT) — bootstrap path
- **All paths**: encrypted at-rest on USB ESP via Phase 1 substrate; Phase 2 reuses Phase 1's crypto module for the harvested-cred-blob

The same UUID-bound-key + operator-passphrase derivation protects both Path A (write-back after login) and Path B (write-after-harvest from existing install). Single crypto module + single key-derivation pattern + two-source ingest = bandwidth-efficient substrate that doesn't fragment into per-path encryption schemes.

## Auto-recover-by-default + escape-hatch (Aaron 2026-05-27)

Operator-confirmed extension to the picker semantics — the boot-menu picker shouldn't ASK every boot; it should DETECT + RECOVER as default behavior, with explicit Esc-to-cancel window:

> *"it will be very nice when i reformat if it starts picking up previous answers and reapplies them so i don't have to for passwords and secrets and such we can make it seucre over time but this will help with testing and self healing, we just need an override escape hatch so we get a chance to say don't recover start fresh but recover is the default."*

Refined boot flow (replaces the always-prompt menu shape above for the default path):

```
On boot, zeta-install.sh runs cred-detection BEFORE Step 6.9 picker:
  1. Probe /esp/zeta-creds.enc — present + valid magic?
  2. Probe PC root partition for harvestable creds — mountable + recoverable?
  3. If EITHER source detected → show 5-second countdown banner:
     "RECOVER MODE active in 5s: USB blob → cred restore + persona substrate.
      Press Esc to override and pick auth method manually."
  4. No Esc → proceed with detected-source recovery (passphrase prompt if needed)
  5. Esc pressed → fall through to Step 6.9 explicit menu (the 5-option picker)
```

Composes value:

- **Self-healing**: same answers don't re-prompt every iteration; operator's prior setup work compounds across reformats
- **Iteration speed**: re-flash + re-boot cycle goes from "answer 5 questions each time" → "wait 5 seconds, recover automatically, validate"
- **Override safety**: the Esc escape hatch preserves operator agency per NCI HC-8; the default is recover but the choice is always preserved
- **Cred persistence answers all**: passwords + secrets + hostname + cluster-name + ssh keys + gh tokens + claude/gemini/codex auths all in the encrypted blob

Sub-target shift in implementation: B-0852.3 (`zeta-install.sh` Step 6.9) becomes Step 6.8 (detection) + Step 6.9 (5-second escape-hatch banner) + Step 6.10 (explicit menu if Esc OR no detected source). The crypto module + cred schema map (B-0852.1 + 5) are unchanged; only the picker UX shifts to detect-recover-default.

## Why P1

- Operator explicitly authorized + named the scope ("lets get that going")
- Removes immediate operational pain (gh-login throttle on multi-boot)
- Bounded scope (Phase 1 is one ISO build + one boot test)
- Unblocks fresh-USB queued for next-flash test workflow
- Composes cleanly with existing iter-4.2 ESP-write channel + B-0847 per-AI identity (no new architectural primitives required)

## Sub-rows to file when implementing

- B-0852.1 — TS crypto module (key derivation + AES-GCM); pure functions; unit-tested first
- B-0852.2 — TS persist/restore CLIs; round-trip test
- B-0852.3 — zeta-install.sh Step 6.9 auth-method picker; integration test
- B-0852.4 — NixOS module wrapping persist service; post-install systemd unit
- B-0852.5 — multi-vendor cred-schema map (per-vendor blob format)
- B-0852.6 — wrong-passphrase + tamper fallthrough logic
- B-0852.7 — empirical Phase 1 ISO build + fresh-USB flash + boot-test validation
- B-0852.8 — composes-with check + memory file landing for cred-persistence-as-architectural-pattern

Order suggestion: 1 → 2 (foundational); 5 (schema before integration); 3 → 4 (integration); 6 → 7 (fallthroughs + validation); 8 (substrate landing).

## Substrate-honest framing

This row addresses the IMMEDIATE operator pain (gh-login throttle on multi-boot test workflow). It does NOT solve the bigger picture (self-sustaining cluster + in-cluster GitLab) but COMPOSES cleanly with that work whenever it lands.

The Phase 1 scope is deliberately narrow: single passphrase + USB UUID binding. Hardware-bound keys (Phase 3) are the substrate-honest stronger answer; Phase 1 is the practical pre-substrate that unblocks Aaron's USB-multi-boot workflow today.

Per `.claude/rules/non-coercion-invariant.md` HC-8 floor — operator authority over their own credentials remains absolute; the encrypted blob is operator-controllable + operator-removable; no creds are baked into the ISO image (per B-0833 + the no-credentials-on-ISO discipline).

## Full reasoning

Aaron 2026-05-27 conversation arc (verbatim):

1. *"gh has throttled me for loggin in"*
2. *"we dident even git to those just gh login failed cause this is the 3rd time i booted"*
3. *"unless we have it testing in ci or something"* (CI ruled out; clean)
4. *"if i leave usb in computer can it save a copy there after login and/or look at pc before formatting and try to recover credentials that already exist?"*
5. *"key bound to uuid and operator passphrase seems best for an easy phase one lets get that going and also change the boot sequence and i can create github token and the bootup can ask which method github is required for now."*
6. *"i have a new usb in there we can try too next time you need to format"* (Phase 1 test target queued)
7. *"for option b we need to do something to make sure we protect against with like some encryption ... we can put a key on the usb too if wnated tied to the uuid so it can't be copied to uuid, we can go hard on security over time but just enough to so i can iterate quickly for now."* (Phase 2 security model)
8. *"we can do both like you said this will be nice together"* (Phase 1 + 2 composition confirmed)
9. *"it will be very nice when i reformat if it starts picking up previous answers and reapplies them so i don't have to ... we just need an override escape hatch so we get a chance to say don't recover start fresh but recover is the default."* (auto-recover-by-default + escape-hatch picker semantics)

Substrate-inventory pass (per `.claude/rules/verify-existing-substrate-before-authoring.md`):

- Topic: credential persistence / gh auth caching / encrypted blob / boot-sequence picker
- Searched: docs/backlog/ (no prior B-NNNN for cred-persistence-on-USB-ESP); .claude/rules/ (no prior rule); memory/ (no prior memory)
- Found: B-0833 (closest sibling — interactive-login-vs-baked-in-keys), B-0835 (gh-auth-not-respected), iter-4.2 ESP write channel (existing pattern)
- Conclusion: no existing substrate covers Phase 1 scope; this row is new substrate composing with adjacent backlog
