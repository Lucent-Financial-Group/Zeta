# Zeta Security Backlog (post-v1.0)

Controls that do not make the v1.0 floor but are tracked as
post-v1 goals. Partner document to
`docs/security/V1-SECURITY-GOALS.md`.

Rule for landing on this list: the control fails at least one of
the three v1.0 gates (plausible adversary, quiet failure, bounded
cost) but is still worth shipping eventually.

## Format

```markdown
### <control>
- **Why deferred:** which v1.0 gate it fails + reasoning
- **Trigger to revisit:** the event / milestone that changes the
  calculus
- **Rough cost estimate:** S / M / L / XL
- **Priority:** P1 (start-of-v2) / P2 (when consumer demands) /
  P3 (speculative)
```

## Deferred controls

### Hardware side-channel resistance (power / EM / acoustic)

- **Why deferred:** adversary not plausible against a library
  consumed in-process. Cost XL (implementation + verification +
  constant-time-discipline across the algebra layer).
- **Trigger to revisit:** Zeta ships a co-processor or becomes a
  cryptographic primitive boundary.
- **Rough cost estimate:** XL
- **Priority:** P3

### Constant-time implementations

- **Why deferred:** no crypto surface in v1.0 to make constant-
  time. Pre-v1 the operator algebra is value-correctness-first.
- **Trigger to revisit:** addition of signing / auth / crypto
  primitive to the Zeta surface.
- **Rough cost estimate:** M per primitive
- **Priority:** P2

### TEE integration (SGX / SEV / TDX)

- **Why deferred:** wrong layer. Consumers who need TEE wrap
  Zeta in their own enclave.
- **Trigger to revisit:** a named consumer requires in-enclave
  Zeta execution and is willing to co-fund the work.
- **Rough cost estimate:** L
- **Priority:** P3

### SLSA Build L3 / L4 (reproducible builds + signed provenance)

- **Why deferred:** L1 reachable this quarter, L2 mid-term, L3
  needs upstream work on F# and Lean compilers (neither are
  reproducible today). L4 adds two-person-integrity which
  doesn't fit a one-maintainer project.
- **Trigger to revisit:** F# / Lean compilers reach reproducible-
  build parity, or a consumer requires SLSA L3 attestation.
- **Rough cost estimate:** L (per level)
- **Priority:** P1 for L2; P2 for L3; P3 for L4

### HSM-backed signing for releases

- **Why deferred:** v1.0 uses software signing keys (NuGet API
  key stored in a maintainer-held secret manager). Plausible
  adversary is a NuGet account compromise (key rotates cheaply);
  HSM protects a narrower threat.
- **Trigger to revisit:** Zeta reaches a consumer scale where key
  rotation is disruptive, or a consumer contractually requires
  HSM attestation.
- **Rough cost estimate:** M (YubiKey-based signing fits most
  needs); L (corporate HSM).
- **Priority:** P2

### Penetration testing / Red-team engagement

- **Why deferred:** pre-v1 the threat model + reviewer floor +
  playbooks are the worked surface. Paying for an external
  pen-test before the rule surface is stable wastes both sides'
  effort.
- **Trigger to revisit:** v1.0 release commit, OR a consumer
  required by their audit to prove third-party pen-test.
- **Rough cost estimate:** L (typical external engagement)
- **Priority:** P1 at v1.0 release

### Dynamic analysis (DAST) / runtime fuzzing

- **Why deferred:** no runtime surface pre-v1 (Zeta is in-process
  library). SDL checklist #10 already marks DAST deferred with
  this reasoning.
- **Trigger to revisit:** addition of a network surface or a
  user-parseable input format.
- **Rough cost estimate:** M (AFL / libFuzzer harness per input
  format)
- **Priority:** P1 the moment we add a network surface

### Reproducible builds

- **Why deferred:** F# compiler embeds timestamps + path
  dependencies; Lean has similar issues. Upstream work needed
  before Zeta can even try.
- **Trigger to revisit:** F# compiler ships reproducible-build
  mode.
- **Rough cost estimate:** L (once upstream lands) → S (once
  tooling exists)
- **Priority:** P1 once upstream is ready

### Formal compliance certifications (ISO 27001 / SOC 2 / FedRAMP)

- **Why deferred:** enterprise consumers certify at their
  deployment layer; Zeta provides the evidence trail but does
  not carry the audit cost.
- **Trigger to revisit:** named enterprise consumer willing to
  co-fund the certification.
- **Rough cost estimate:** XL
- **Priority:** P3

### `mise trust` CI hardening (allow-list / diff-vs-main / review-gate)

- **Why deferred:** meaningful only after branch-protection-on-
  main lands (PRs reviewed before merge). Until then, the
  existing `mise trust` ceremony is what it is.
- **Trigger to revisit:** branch-protection-on-main lands.
- **Rough cost estimate:** S
- **Priority:** P1 (immediate follow-up after branch protection)

### Verifier-jar SHA-256 pinning with reproducible verification

- **Why deferred:** round-30 TOFU gradient step. Manifest
  currently carries `<path> <url>`; v1.0 wants `<path> <url>
  <sha256>` and `verifiers.sh` computing + verifying. Currently
  DEBT for round 33.
- **Trigger to revisit:** round 33 Track B item 2 (already
  scheduled).
- **Rough cost estimate:** S
- **Priority:** P1

### Safety-clause-diff lint on `.claude/skills/**/SKILL.md`

- **Why deferred:** XZ-class long-game defence. Semgrep generic-
  mode regex insufficient; needs a bespoke diff-level tool.
  Currently DEBT for round 33.
- **Trigger to revisit:** round 33 Track B item 3.
- **Rough cost estimate:** M
- **Priority:** P1

### Devcontainer / Codespaces image (GOVERNANCE §24 third leg)

- **Why deferred:** two-leg parity (dev + CI) is the v1.0 floor;
  devcontainer is a consumer-experience boost, not a security
  control per se.
- **Trigger to revisit:** first external contributor onboards
  and friction measures the gap, OR Codespaces becomes the
  default onboarding path.
- **Rough cost estimate:** S
- **Priority:** P2

### documentation-agent cadence

- **Why deferred:** the documentation-agent skill only triggers
  when someone spots drift. Round 33 surfaced multiple stale-
  comment / out-of-date-documentation issues that would have
  been caught by a scheduled doc-state audit (e.g., my own
  `.markdownlint-cli2.jsonc` comment drifted from the actual
  suppression strategy in one round). Aaron round 33: "is the
  documentation person looking for out of date documentation
  on any kind of cadence?"
- **Trigger to revisit:** round 34 factory-improvement slot.
  Add documentation-agent to `factory-audit`'s every-10-rounds
  walk scope. Each walk: scan comments in config files +
  doc-to-code alignment + retired-file references.
- **Rough cost estimate:** S (just add to cadence)
- **Priority:** P1

### Post-install repo automation: Bun + TypeScript + package.json

- **Why deferred:** `tools/setup/install.sh` (bash) owns bootstrap
  because it can't assume Bun/Node/anything pre-install. After
  install, Zeta's eventual polyglot repo-automation surface
  (format-repo, coverage-collect, benchmark-compare, lint
  orchestration) benefits from a single cross-platform runtime.
  Aaron: "I used bun and typescript and package.json for repo
  automation after the point of install … better than maintaining
  bash and pwsh scripts everywhere." Pattern visible in
  `../SQLSharp/tools/automation/` and `../scratch`.
- **Trigger to revisit:** first post-install automation task that
  would need cross-platform scripting (benchmark comparison,
  coverage aggregation, format-repo across .fs/.cs/.md/etc., or
  the first case where bash+pwsh would have to be maintained in
  parallel).
- **Rough cost estimate:** M (introduce `bun`/`package.json`
  at repo root, first TypeScript automation entry point, wire
  Bun install into `tools/setup/`)
- **Priority:** P2 (on-demand; not blocking)
- **Note:** post-install only; install.sh stays bash so the
  bootstrap can't depend on its own output.

### `static-analysis-gap-finder` skill (missing-lint-tool detection)

- **Why deferred:** Round 33 Track D surfaced that Zeta had no
  markdown / workflow / shell linter until this round. Nobody
  was proactively scanning for missing linters. Aaron: "we need
  another gap analysis tool around static analysis and linting
  and tools and rules we maybe missing." Parallel to
  `openspec-gap-finder` and `skill-gap-finder`; owned by the
  `spec-zealot` role (Viktor) along with those other gap-finders
  — one role wearing multiple gap-finding skills, Aarav pattern.
  Proactive lint discovery: on a new-project template, this
  skill would enumerate committed languages/surfaces + check
  whether a matching linter is on the lint gate.
- **Trigger to revisit:** round 34 factory-improvement slot.
- **Rough cost estimate:** M
- **Priority:** P1

### Crank lint configurations to HIGH across the board

- **Why deferred:** Aaron round 33: "in general when there is
  static analysis configuration or linting things of that nature
  we want to crank it up to high." Current configs are mid-
  stringency (several relaxed rules in markdownlint, severity-
  floor-style on shellcheck, default ruleset on actionlint).
  A post-round-33 pass should research each tool's
  recommended-strict preset and adopt.
- **Trigger to revisit:** round 34, after round-33 Track D
  baseline has proven itself stable.
- **Rough cost estimate:** S-per-tool, L cumulative
- **Priority:** P1

### `openspec-gap-finder` skill (missing-spec detection)

- **Why deferred:** Viktor (spec-zealot) reviews spec-to-code
  alignment for an existing capability but doesn't scan the repo
  for capabilities shipped without a spec. Aaron's round-32
  observation: "someone should be responsible for looking for
  missing openspec, do we already have one that looks for ones
  that are out of sync, we should be checking these too every
  now and then as well." Gap is parallel to `skill-gap-finder`
  (finds absent skills); needs `openspec-gap-finder` (finds
  absent specs + flags drift between spec and shipped artefact).
- **Trigger to revisit:** round 33 factory-improvement slot.
- **Rough cost estimate:** M (skill + skill-creator workflow +
  first audit run)
- **Priority:** P1 (GOVERNANCE §28 enforcement depends on it)

### Declarative-manifest setup (match `../scratch`'s shape)

- **Why deferred:** Zeta's `tools/setup/manifests/` is already
  declarative-ish (`apt.txt`, `brew.txt`, `dotnet-tools.txt`,
  `verifiers.txt`) but flat and un-tiered. `../scratch`'s
  `declarative/` directory has tiered profiles
  (`min`/`runner`/`quality`/`all`) per platform per tool,
  matching dotnet's `.dotnet-tools` / `.dotnet-workloads` /
  Brewfile / Caskfile / `.apt` / `.uv-tools` / `.bun-global`
  formats. Aaron's round-32 ask: "push hard each sprint" on
  closing this gap.
- **Trigger to revisit:** every round, track at least one
  incremental step toward the scratch shape — e.g., split
  `brew.txt` into min/runtimes/quality tiers this round,
  convert `dotnet-tools.txt` to `.dotnet-tools` next.
- **Rough cost estimate:** L (incremental over 4-6 rounds)
- **Priority:** P1 (ratchet toward v1.0)

### Windows CI matrix

- **Why deferred:** stable green on mac + linux is the immediate
  target. Windows expands surface by 50% of CI-minute budget
  for a v1.0 consumer base that is predominantly mac + linux.
- **Trigger to revisit:** named Windows consumer, OR 4 weeks
  stable on the current two-OS matrix.
- **Rough cost estimate:** M (install.sh Windows path + CI job)
- **Priority:** P2

### Signed-commit requirement on `main`

- **Why deferred:** Aaron round-30: bus-factor exception, 2FA
  only for now, education-over-time on signing keys.
- **Trigger to revisit:** Aaron decides to adopt hardware key +
  signed commits (standing open decision).
- **Rough cost estimate:** S (enable + CI check)
- **Priority:** P1 (maintainer-call timing)

### Prefix reservation on `nuget.org` for `Zeta.*`

- **Why deferred:** request is outstanding to nuget.org but
  depends on their response cadence. Not in Zeta's control.
- **Trigger to revisit:** first NuGet publish.
- **Rough cost estimate:** S (one email + follow-up)
- **Priority:** P1

## Graduation

When a backlog item moves to shipped, delete the entry here and
update the corresponding ✅ cell in `SDL-CHECKLIST.md`. The
backlog shrinks over time; that's the success signal.
