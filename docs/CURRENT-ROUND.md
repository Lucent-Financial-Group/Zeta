# Current Round — 32 (open)

Round 31 closed as a rest round (maintainer-called after the
first fully-green gate in the repo's history — PR #6 round 30,
then PR #7 round 31 rest marker). Round 32 shifted scope from
"Track A product + Track B security" to "factory shape + CI
parity + v1.0 security scoping." Product work (LawRunner bilinear
+ sink-terminal) slides to round 33.

## Status

- **Round number:** 32
- **Opened:** 2026-04-18 (immediately post round-31 rest)
- **Classification:** factory + parity + security-scoping
  (product work deferred to round 33)
- **Reviewer budget:** `harsh-critic` + `maintainability-reviewer`
  floor per GOVERNANCE §20. `security-researcher` on any workflow
  / install-script / threat-model touch. `public-api-designer`
  on any public-API change. `threat-model-critic` on any
  security doc edit (round cadence per §0 of THREAT-MODEL.md).

## Round 32 — what landed this round

1. **CI parity-swap (GOVERNANCE §24 target).** `gate.yml`
   replaces `actions/setup-dotnet` with
   `./tools/setup/install.sh`; single source of truth for
   toolchain shared by dev laptop + CI runner. Verifier
   jars, mise-pinned dotnet + python, elan, dotnet tools
   all provisioned from `tools/setup/manifests/`. Caches
   added for mise runtimes / elan / dotnet-tools / verifier
   jars / NuGet packages, all keyed on their manifest hash.
   TLC + Alloy tests now *run* on CI instead of skipping.
2. **`mise trust` policy decision.** Held as ceremony; becomes
   meaningful once branch-protection-on-main lands. Documented
   in `V1-SECURITY-GOALS.md` and in `gate.yml` header comment.
3. **Persona memory-layout normalization.** Every persona now
   owns a directory: `memory/persona/<name>/NOTEBOOK.md` +
   `MEMORY.md` (index) + `OFFTIME.md` (§14 log, even zero-
   entry rounds log honestly). Sweep of 26 files updated the
   `owns_notes:` frontmatter + body references. Promotes Kenji-
   only pattern to the whole roster.
4. **OFFTIME seeded for 13 personas.** Kira, Rune, Mateo,
   Nadia plus the rest of the cast each get their first zero-
   entry OFFTIME record. Template matches Kenji's shape.
5. **v1.0 security goals doc.** `docs/security/V1-SECURITY-GOALS.md`
   names the realistic floor for 0.x → 1.0; out-of-scope
   items (hardware side-channel, nation-state bespoke, HSM
   signing, reproducible builds, SLSA L3/L4, ISO/SOC2/FedRAMP,
   DAST, pen-test) land in `SECURITY-BACKLOG.md` with explicit
   triggers for revisit.
6. **`tools/setup/doctor.sh`** — read-only health check for
   toolchain drift. Reports missing executables, jar drift
   inside repo + `$HOME`, mise state, managed shellenv.
   Addresses Aaron's "jars in random locations" observation.

## Round 33 — deferred

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
   Bomb Package mitigation).
2. **Verifier-jar SHA-256 pinning** (round-30 TOFU
   gradient step).
3. **Safety-clause-diff lint** on
   `.claude/skills/**/SKILL.md`.
4. **CodeQL workflow** (SDL #9 follow-through).
5. **Branch-protection required-check on `main`** once
   `gate.yml` has one week of consistent green runs
   under the new install.sh path.

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
