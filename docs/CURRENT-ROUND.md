# Current Round — 32 (open)

Round 31 closed as a rest round (maintainer-called after the
first fully-green gate in the repo's history — PR #6 round 30,
then PR #7 round 31 rest marker). Round 32 picks up the Track A
+ Track B plan that originally sat on round 31.

## Status

- **Round number:** 32
- **Opened:** 2026-04-18 (immediately post round-31 rest)
- **Classification:** split — product + security follow-through
- **Reviewer budget:** `harsh-critic` + `maintainability-reviewer`
  floor per GOVERNANCE §20. `security-researcher` on any workflow
  / install-script / threat-model touch. `public-api-designer`
  on any public-API change. `threat-model-critic` on any
  security doc edit (round cadence per §0 of THREAT-MODEL.md).

## Round 32 — parallel tracks

**Track A — product (LawRunner):**

1. `LawRunner.checkBilinear` — join-shaped ops with a
   `BilinearOp` fixture. Builds on round-28 Option B
   foundation.
2. `LawRunner.checkSinkTerminal` — retraction-lossy
   sink verification; re-run against `BayesianRateOp`.
3. Config-record refactor (round-28 DEBT) before
   adding a third law to the positional-arg shape.

**Track B — security follow-through:**

1. **`packages.lock.json` adoption** (round-30 Time-
   Bomb Package mitigation). `RestorePackagesWithLockFile`
   per project; `RestoreLockedMode=true` on CI;
   committed lock files. Closes the transitive-dep
   time-bomb vector.
2. **Verifier-jar SHA-256 pinning** (round-30 TOFU
   gradient step). Extend
   `tools/setup/manifests/verifiers.txt` to
   `<path> <url> <sha256>`; `verifiers.sh` verifies
   after download.
3. **Safety-clause-diff lint** on
   `.claude/skills/**/SKILL.md` (round-30 XZ-class
   defence, closes INCIDENT-PLAYBOOK Playbook E
   detection gap). Bespoke diff-level tool; Semgrep
   generic-mode regex is insufficient.
4. **`mise trust` CI hardening** (DEBT pre-req for
   CI parity swap to `install.sh`).
5. **CodeQL workflow** (SDL #9 follow-through). C#
   + F# scan on weekly schedule.

## Carried from round 30

**Reviewer floor P2s** (deferred):
- SPACE-OPERA Simulation Theory entry still has
  tag-only mitigation clarity (teaching-only, no
  defence); worth one-line polish at next cadence.
- Install-script harsh-critic P1s from round-29 still
  on DEBT list.

**Round-29 DEBT carry-over:**
- `LawRunner` config-record refactor (before
  `checkBilinear` lands).
- Structured `LawViolation.Reason` DU.
- Test covering ops that omit the marker tag.
- Skill-file prose polish after §27 sweep.
- Install-script P1 follow-ups.

**Round-27+ deferred pool:**
- `IsDbspLinear` Lean predicate + B1/B2/B3/chain_rule
  closures.
- Full `.mise.toml` migration when Lean plugin lands
  (candidate upstream contribution per §23).
- Devcontainer / Codespaces image (GOVERNANCE §24
  third leg).
- Windows CI matrix (trigger: stable on mac + linux).
- Parity swap: CI's `actions/setup-dotnet` →
  `tools/setup/install.sh` (gated on `mise trust`
  hardening — Track B item 4).
- Branch-protection required-check on `main`.

## Open asks to the maintainer

- **Aaron decisions staged for round 32:**
  - `packages.lock.json` adoption — do we want it on
    every project or just the library (`Zeta.Core`)?
  - `mise trust` CI hardening approach — allow-list
    `.mise.toml` schema (strict) vs diff-vs-main
    (permissive) vs require human review on any
    `.mise.toml` change (policy).
  - When to flip branch-protection required-check on
    `main` (one week of clean `gate.yml` runs is the
    proposed trigger; round 30 + round 31 are two
    green runs so far).
  - Track A vs Track B first — or parallel?

- **Round 30 standing asks (carried):**
  - NuGet prefix reservation on `nuget.org` for
    `Zeta.*`.
  - `global.json` `rollForward` (status quo vs
    relaxed).
  - Repo visibility — currently private on AceHack.

## Notes for the next architect waking

- **First fully-green gate landed in round 30.** Round
  31 was the rest round. If a PR fails `gate.yml`, the
  fix is always to the code (not to lower a rule's
  severity). Weakening a rule is a design-doc moment.
- **Any round-32 PR touching security docs auto-invokes
  `threat-model-critic` re-audit** per §0 of
  `docs/security/THREAT-MODEL.md`.
- **Reality tags in SPACE-OPERA are honest signal.**
  `shipped` means enforced; `BACKLOG` means designed
  not shipped; `aspirational` means defence pattern
  exists elsewhere but not Zeta; `teaching` means the
  adversary is allegorical.
- **Bus-factor exception is documented, not fixed.**
  Aaron chooses when to adopt the remediation ladder
  (hardware key, signed commits, co-maintainer
  cooling period). Education-over-time.
- `memory/` canonical; `memory/persona/<name>/`
  per-persona.
- GOVERNANCE §20 reviewer floor mandatory every
  code-landing round.
- `~/.claude/projects/` sandbox, not git (§22).
