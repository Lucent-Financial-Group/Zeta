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

### Sub-target 2 — Boot-sequence auth-method picker

`zeta-install.sh` Step 6.9 (new) presents a menu BEFORE Step 6.95b (interactive auth):

```
GitHub authentication method:
  1) Restore from encrypted USB blob (requires passphrase) — DEFAULT if blob present
  2) Fresh device-flow login (current behavior; uses gh CLI quota)
  3) Operator-provided PAT (paste at prompt; bypasses device-flow entirely)
  4) Skip (cluster operates degraded; no GitHub-side substrate)
```

Selection logic:
- If `/esp/zeta-creds.enc` exists → default = (1); operator can override
- If first boot of fresh USB → default = (3) since operator just created PAT per their stated workflow
- Multi-vendor scope: the picker fires ONCE then applies the chosen method to ALL 3 vendors (claude/gemini/codex) in sequence

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

- **Phase 2**: Path B (look at PC before formatting + try to recover creds from existing install; operator-supervised boot menu option)
- **Phase 3**: Hardware-bound key (TPM / YubiKey / Touch-ID-derived) replacing operator-passphrase; survives operator-passphrase forgetting
- **Phase 4**: Per-AI distinct passphrases (each persona's creds encrypted with persona-specific key, so persona compromise doesn't leak peers)
- **Phase 5**: Cross-cluster blob join via BFT (multi-cluster credential federation; composes with multi-tic-per-persona substrate)
- **In-cluster GitLab migration** (future B-NNNN candidate) — removes external GitHub dep entirely; this row's substrate carries forward unchanged at GitLab scope

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

Substrate-inventory pass (per `.claude/rules/verify-existing-substrate-before-authoring.md`):
- Topic: credential persistence / gh auth caching / encrypted blob / boot-sequence picker
- Searched: docs/backlog/ (no prior B-NNNN for cred-persistence-on-USB-ESP); .claude/rules/ (no prior rule); memory/ (no prior memory)
- Found: B-0833 (closest sibling — interactive-login-vs-baked-in-keys), B-0835 (gh-auth-not-respected), iter-4.2 ESP write channel (existing pattern)
- Conclusion: no existing substrate covers Phase 1 scope; this row is new substrate composing with adjacent backlog
