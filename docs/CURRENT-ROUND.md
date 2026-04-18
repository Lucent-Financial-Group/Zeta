# Current Round — 31 (rest round, maintainer-called)

Round 30 closed; narrative absorbed into
`docs/ROUND-HISTORY.md`. Round 30 shipped the first
fully-green gate in the repo's history. Aaron called
a rest round in response — "everyone take a round
off." Planned round-31 work (LawRunner `checkBilinear`
+ `checkSinkTerminal`; `packages.lock.json` +
verifier SHA-pin + safety-clause-diff +
`mise trust` + CodeQL) shifts to **round 32**.

## Status

- **Round number:** 31 (rest)
- **Opened:** 2026-04-18 (continuous from round-30
  close)
- **Classification:** rest — no coding work, no
  reviewer dispatches, no DEBT reshuffling.
  Maintainer-called per first-green-gate milestone.
- **Reviewer budget:** `harsh-critic` +
  `maintainability-reviewer` floor per GOVERNANCE §20.
  `security-researcher` on any workflow / install-
  script / threat-model touch. `public-api-designer`
  on any public-API change. `threat-model-critic` on
  any security doc edit (round cadence per §0 of
  THREAT-MODEL.md).

## Round 30 close — what landed

Anchor: nation-state + supply-chain threat-model
elevation. Delivered:

- **Semgrep-in-CI** — 14 custom rules went from
  aspirational to enforced. `.github/workflows/gate.yml`
  `lint` job runs `semgrep --config .semgrep.yml
  --error` on every PR + push-to-main. Biggest single
  posture fix.
- **Semgrep rule 15** — SHA-pin enforcement on
  `.github/workflows/**`. Defends the tj-actions tag-
  rewrite class (CVE-2025-30066).
- **`docs/security/THREAT-MODEL.md` expansion** —
  adversary tiers T0-T3, re-audit cadence every round,
  bus-factor documented exception (Aaron runs 2FA
  only; further controls are education-over-time),
  supply-chain boundary decomposition, SLSA ladder
  (L1 now → L2 mid-term → L3 pre-v1.0), long-game
  persistence defences, adversary-tier-to-control
  matrix, formal-spec cross-reference.
- **`docs/security/THREAT-MODEL-SPACE-OPERA.md`
  rewritten** — 24 adversaries (was 17) with creative
  license. Reality-tag legend (shipped / BACKLOG /
  aspirational / teaching). New: Poisoned Bard,
  Changeling Action, Hungry Cache, Time-Bomb Package,
  Helpful Stranger, Moon Stares Back, Ghost in the
  Git Blame. Rewritten: Whispering Drone Swarm,
  Echoes from the Dyson Sphere, Fungal Network.
- **`docs/security/INCIDENT-PLAYBOOK.md`** (new) — 6
  playbooks (A: third-party GHA compromise, B:
  toolchain installer hijack, C: NuGet dep poisoning,
  D: maintainer-account compromise, E: skill safety-
  clause regression, F: escalation), triage-in-60-
  seconds, contact tree, disclosure timeline.
- **`docs/security/SDL-CHECKLIST.md` honest
  downgrades** — #7 / #8 / #9 ✅ → 🔜; #12 partial →
  ✅. Tightened ✅ definition: "shipped AND enforced
  by CI or governance."
- **Reviewer floor fired** — `threat-model-critic`
  caught a P0 (SPACE-OPERA rewrite silently didn't
  commit in the initial write) and four P1s (matrix
  overconfidence on build-gate T3 + Semgrep T3;
  INCIDENT-PLAYBOOK Playbook D recovery-code
  assumption; SDL ✅ definition self-contradiction
  with #12; prediction-in-doc on #9). All five fixed
  in-round.

## Round 31 — parallel tracks

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
  hardening).
- Branch-protection required-check on `main`.

## Open asks to the maintainer

- **Aaron decisions staged for round 31:**
  - `packages.lock.json` adoption — do we want it on
    every project or just the library (`Zeta.Core`)?
  - `mise trust` CI hardening approach — allow-list
    `.mise.toml` schema (strict) vs diff-vs-main
    (permissive) vs require human review on any
    `.mise.toml` change (policy).
  - When to flip branch-protection required-check on
    `main` (one week of clean `gate.yml` runs is the
    proposed trigger).

- **Round 30 standing asks (carried):**
  - NuGet prefix reservation on `nuget.org` for
    `Zeta.*`.
  - `global.json` `rollForward` (status quo vs
    relaxed).
  - Repo visibility — currently private on AceHack.

## Notes for the next architect waking

- **Round-30 landed big security posture work.** Any
  round-31 PR touching security docs auto-invokes
  `threat-model-critic` re-audit per new §0
  "re-audit every round" rule.
- **Semgrep-in-CI is live.** If a PR fails `lint`,
  the fix is always to the code (not to lower a rule's
  severity). Weakening a rule is a design-doc moment.
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
