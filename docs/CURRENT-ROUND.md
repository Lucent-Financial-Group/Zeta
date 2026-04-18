# Current Round — 30 (open)

Round 29 closed; narrative absorbed into
`docs/ROUND-HISTORY.md`. Round 30 opens with
**factory-improvement follow-ups + product work**
running in parallel.

## Status

- **Round number:** 30
- **Opened:** 2026-04-18 (continuous from round-29 close)
- **Classification:** split — product + factory debt
- **Reviewer budget:** `harsh-critic` + `maintainability-
  reviewer` floor per GOVERNANCE §20 on every code landing.
  `security-researcher` on any CI or install-script edit.
  `public-api-designer` on any public-API touch.

## Round 29 close — what landed

Round 29's anchor was the CI pipeline + three-way-parity
install script. Delivered:

- **CI landing.** `.github/workflows/gate.yml` — digest-
  pinned runners (`ubuntu-22.04`, `macos-14`), SHA-pinned
  third-party actions, concurrency groups, NuGet cache,
  `fail-fast: false` matrix, least-privilege permissions.
- **Install script.** `tools/setup/install.sh` dispatcher +
  `macos.sh` + `linux.sh` + `common/{mise,elan,dotnet-
  tools,verifiers,shellenv}.sh` + per-OS manifests +
  `.mise.toml` at repo root. Three-way parity per
  GOVERNANCE §24; `tools/install-verifiers.sh` retired
  greenfield.
- **Governance.** §23 upstream OSS contributions via `../`
  clones. §24 three-way parity (dev / CI / devcontainer).
  §25 upstream temporary-pin expiry (three-round
  re-evaluation). §26 research-doc lifecycle. §27
  skills-roles-personas abstraction layers.
- **Personas.** DevOps Engineer (Dejan); Skill Expert
  (Aarav's role wraps `skill-tune-up` + `skill-gap-finder`).
- **Skills — 21 new capability skills.** Language / tool
  experts (F#, C#, Bash, PowerShell, GitHub Actions,
  Java, Python, TLA+, Alloy, Lean 4, MSBuild). Infra
  skills (sweep-refs, commit-message-shape, round-open-
  checklist, git-workflow-expert, factory-audit). Domain
  skills (openspec-expert, semgrep-rule-authoring, nuget-
  publishing-expert, benchmark-authoring-expert, docker-
  expert). Meta-skills (skill-tune-up rename, skill-gap-
  finder, factory-audit, agent-qol). Bug-fixer opened to
  all agents.
- **Docs.** Three design docs (build-machine-setup,
  ci-workflow-design, ci-gate-inventory), CONTRIBUTING.md
  rewrite as landing page with pointer tree,
  `docs/security/THREAT-MODEL.md` supply-chain section.
- **Reviewer floor fired.** `harsh-critic` P0s (cache key
  lie, dotnet-tools detection, verifier partial-download
  trusted) landed in-round; `security-researcher` Important
  findings (TOFU doc, mise trust pre-swap hardening)
  tracked in DEBT.

## Round 30 anchor — threat model elevation (nation-state + supply-chain)

Aaron set the bar at round-29 close: *"in the real
threat model we should take into consideration nation
state and supply chain attacks."* He has serious
professional credentials for this work — built the US
smart grid (nation-state defense), is a gray hat with
hardware side-channel experience. The current
`docs/security/THREAT-MODEL.md` is solid but under-
scoped for that adversary class; `THREAT-MODEL-SPACE-
OPERA.md` is the fun teaching variant but worth
finishing with the same rigor.

Round-30 anchor sub-tasks (each its own review gate):

1. **Elevate `docs/security/THREAT-MODEL.md` to
   nation-state posture.** Revise the adversary model,
   expand supply-chain coverage (package registries,
   build toolchain, CI runners, action supply chain,
   mise / uv / elan / Homebrew install scripts, dep
   graphs), harden trust boundaries. Paired:
   `threat-model-critic` primary,
   `security-researcher` secondary.
2. **Validate threat-model claims against real
   controls.** Each mitigation cites the code /
   governance rule / CI gate / review cadence that
   enforces it. Unenforced mitigations are gaps, not
   mitigations.
3. **Complete `docs/security/THREAT-MODEL-SPACE-OPERA.md`
   as the serious-underneath-the-fun variant.** Every
   silly adversary maps to a real STRIDE class + real
   control + real CVE-style escalation path. The
   teaching narrative stays; the technical rigor
   matches the serious doc. `threat-model-critic`
   maintains.
4. **Side-channel + hardware adversary coverage.**
   Aaron's expertise area. Timing side channels,
   cache behavior, microarchitectural leaks in
   tenant-isolated deployments, speculative-execution
   considerations. Low priority for current deployment
   shape but worth writing down so future work doesn't
   silently assume it's covered.
5. **Nation-state supply-chain playbook.** What
   happens if `actions/checkout` is compromised?
   `mise.run` repo is hijacked? NuGet registry serves
   a poisoned package? Response protocol written down
   before we need it.

**Parallel tracks (lower priority than the anchor):**

- **Factory debt:** `maintainability-reviewer` prose
  polish after round-29 §27 sweep; remaining
  `harsh-critic` P1s on install script; `mise trust`
  hardening.
- **Product:** `LawRunner.checkBilinear`,
  `checkSinkTerminal`, Option-A promotion for
  `IStatefulStrictOperator` per round-28 design doc.

## Carried from round 29

Beyond the tracks above:
- Full `.mise.toml` migration for every tool (currently
  dotnet + python only); mise-lean plugin is a candidate
  upstream contribution per §23.
- Devcontainer / Codespaces image — closes third leg of
  §24 parity.
- Windows CI matrix — trigger: one week of clean mac +
  linux runs.
- Parity swap: CI's `actions/setup-dotnet` →
  `tools/setup/install.sh` (gated on `mise trust`
  hardening per DEBT).
- Upstream contribution log at
  `docs/UPSTREAM-CONTRIBUTIONS.md` (backlogged).
- Branch-protection required-check on `main` after one
  week of clean `gate.yml` runs.

## Open asks to the maintainer

- **Aaron decisions staged for round 30:**
  - After one week of clean `gate.yml` runs, flip the
    branch-protection required-check toggle on `main`.
  - `.mise.toml` full-migration decision — when to move
    Lean tooling in (depends on mise-lean plugin
    landing upstream, our OSS contribution or someone
    else's).
  - Windows matrix switch — Aaron flipped from "wait
    for a breaking test" to "just do it once stable."
- **NuGet prefix reservation** on `nuget.org` for
  `Zeta.*` — still maintainer-owned.
- **Repo visibility** — currently private on AceHack;
  flip to public when ready.

## Notes for the next architect waking

- 21 new skills landed in round 29 — factory cadence
  rule: `skill-tune-up` + `skill-gap-finder` should
  run early in round 30 to catch any drift before
  accretion.
- GOVERNANCE §27 abstraction rule is new; any skill
  edit in round 30 is expected to comply (role names
  in skills, not persona names).
- `factory-audit` is a new skill; consider a first run
  mid-round 30 now that there's enough factory
  surface to audit meaningfully.
- `bug-fixer` is now open to every agent — the
  procedure holds the quality bar.
- `memory/` is canonical; `memory/persona/<name>/` is
  per-persona.
- GOVERNANCE §20 reviewer floor is mandatory every
  code-landing round.
- `~/.claude/projects/` is Claude Code sandbox, not
  git (GOVERNANCE §22).
