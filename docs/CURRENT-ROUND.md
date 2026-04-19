# Current Round — 33 (open)

Round 32 closed merged as PR #8. Round 33 picks up the deferred
product work (LawRunner Track A) and the factory-improvement asks
surfaced mid-round 32 that scoped out: `openspec-gap-finder`,
declarative-manifest tiering push.

## Status

- **Round number:** 33
- **Opened:** 2026-04-19 (immediately post round-32 merge)
- **Classification:** split — product (LawRunner) + factory
  (openspec-gap-finder) + security follow-through
- **Reviewer budget:** `harsh-critic` +
  `maintainability-reviewer` floor per GOVERNANCE §20.
  `security-researcher` + `threat-model-critic` on any
  security / install-script / threat-model touch. `spec-zealot`
  on any spec edit (new with GOVERNANCE §28). `public-api-designer`
  on any public-API change.

## Round 33 — parallel tracks

**Track A — product (LawRunner):**

1. `LawRunner.checkBilinear` — join-shaped ops with a
   `BilinearOp` fixture. Builds on round-28 Option B
   foundation.
2. `LawRunner.checkSinkTerminal` — retraction-lossy
   sink verification; re-run against `BayesianRateOp`.
3. Config-record refactor (round-28 DEBT) before
   adding a third law to the positional-arg shape.

**Track B — security follow-through:**

1. **`packages.lock.json` adoption** (round-30 Time-Bomb
   Package mitigation).
2. **Verifier-jar SHA-256 pinning** (round-30 TOFU gradient
   step).
3. **Safety-clause-diff lint** on `.claude/skills/**/SKILL.md`.
4. **CodeQL workflow** (SDL #9 follow-through).
5. **Branch-protection required-check on `main`** — round 32
   gave us two clean green runs; one more round of green
   seals the trigger.

**Track C — factory (from round-32 surface):**

1. **`openspec-gap-finder` skill** (Aaron round-32 ask).
   Parallel to `skill-gap-finder`; scans for committed
   artefacts lacking an openspec + flags spec↔code drift.
   Ships via `skill-creator` workflow.
2. **Declarative-manifest tiering (scratch-shape ratchet).**
   Aaron round-32 ask: push hard each sprint. This round's
   step: split `brew.txt` into `min.Brewfile` + `all.Brewfile`
   (matches scratch convention), pick up one more tier in
   each subsequent round.
3. **BP-NN candidate** — per GOVERNANCE §28 + bash profile:
   deterministic scripts, no retries/polling. Harvest into
   `docs/AGENT-BEST-PRACTICES.md` once the openspec
   requirement has been exercised in a few rounds.

## Carried in flight

**Round-32 DEBT follow-ups:**
- Devcontainer third leg (GOVERNANCE §24) — unscheduled.
- Windows CI matrix — unscheduled (gate on stable green on
  mac + linux first).
- `mise trust` hardening — now a post-branch-protection
  follow-up per SECURITY-BACKLOG.

**Round-29 DEBT carry-over:**
- `LawRunner` config-record refactor (before `checkBilinear`
  lands).
- Structured `LawViolation.Reason` DU.
- Test covering ops that omit the marker tag.
- Skill-file prose polish after §27 sweep.
- Install-script P1 follow-ups.

**Round-27+ deferred pool:**
- `IsDbspLinear` Lean predicate + B1/B2/B3/chain_rule closures.
- Full `.mise.toml` migration when Lean plugin lands (candidate
  upstream contribution per §23).

## Open asks to the maintainer

- **Aaron decisions staged for round 33:**
  - `packages.lock.json` adoption — every project or just
    `Zeta.Core`?
  - Branch-protection required-check on `main` — flip after
    round 33 if CI stays green for a third round?
  - `openspec-gap-finder` persona — name this round, or spawn
    as a skill without a persona first and attach a name once
    it runs cleanly?

- **Round 32 standing asks (carried):**
  - NuGet prefix reservation on `nuget.org` for `Zeta.*`.
  - `global.json` `rollForward` (status quo vs relaxed).
  - Repo visibility — currently private on AceHack.

## Notes for the next architect waking

- **Round 32 landed the SQLSharp-proven CI pattern:** dotnet
  leaves mise, installed via Microsoft's `dotnet-install.sh`;
  `BASH_ENV` propagation replaces explicit per-step source.
  CI is green and stays green.
- **GOVERNANCE §28 is binding:** every committed artefact needs
  an openspec. spec-less scripts are smells.
- **Deterministic scripts are binding:** retries and polling
  are last-resort, not default. See
  `openspec/specs/repo-automation/profiles/bash.md`.
- **Memory is first-class:** every persona carries a directory
  (`NOTEBOOK.md` + `MEMORY.md` + `OFFTIME.md`). Agents write
  their own memory freely per user-level memory rule.
- **Reality tags in SPACE-OPERA are honest signal.** `shipped` =
  enforced; `BACKLOG` = designed not shipped; `aspirational` =
  pattern elsewhere not Zeta; `teaching` = allegorical.
- `memory/` canonical; `memory/persona/<name>/` per-persona.
- GOVERNANCE §20 reviewer floor mandatory every code-landing
  round.
- `~/.claude/projects/` sandbox, not git (§22).
