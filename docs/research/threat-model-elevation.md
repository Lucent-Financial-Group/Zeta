# Threat-model elevation — design for Zeta

**Round:** 30
**Status:** design draft — awaits Aaron sign-off before
any `docs/security/*.md` file is touched.
**Scope:** elevate Zeta's threat-model posture to nation-
state + supply-chain grade. Complete the SPACE-OPERA
teaching variant as serious-underneath-the-fun. Every
mitigation validated against a real control.
**Sources:** paired research from `threat-model-critic`
(audit of current state + gap analysis) and
`security-researcher` (2024-2026 attack-class landscape).
**Human consulting input:** Aaron — US smart grid /
nation-state defense / hardware side-channel experience.

## Why this round

Aaron at round-29 close set the bar: *"in the real threat
model we should take into consideration nation state and
supply chain attacks. I helped build the US smart grid
and protect against nation state level attackers."* The
current `docs/security/THREAT-MODEL.md` is a competent
STRIDE matrix for a single-tenant embedded F# library;
the adversary model is stated narrowly enough that a
nation-state red-teamer would not be slowed by it.
Round-29 CI + install-script landing added supply-chain
surface that the doc hasn't absorbed. Round-30 fixes both.

## Current-state summary

- `docs/security/THREAT-MODEL.md` — good-citizen STRIDE
  by component. Adversary model: malicious operator
  author + compromised storage volume. Recent: agent-
  injection row, round-29 supply-chain section (TOFU
  jars, curl-pipe-sh installers).
- `docs/security/THREAT-MODEL-SPACE-OPERA.md` —
  succeeds as teaching: each adversary maps to a real
  STRIDE class + concrete mitigation. Subset is
  aspirational ("CMB-seed ChaosEnvironment") and reads
  as decoration.
- `docs/security/SDL-CHECKLIST.md` — mostly accurate for
  the old scope; the old scope is now wrong. Several
  "✅ shipped" cells no longer match under a nation-
  state bar.
- `.semgrep.yml` — 14 rules. **CI runs zero of them.**
  Largest posture-vs-reality gap in the whole surface.

**Bottom line:** rigorous within a narrow adversary model;
cavalier about the model itself. Elevation is primarily
adversary-model expansion + trust-boundary extension +
closing the "claimed mitigations with no persistence
control" gaps. Not a STRIDE rewrite.

## Gaps — adversary-model coverage (from threat-model-critic)

Severity: **P0** blocks nation-state claim; **P1**
closes before v1.0; **P2** post-v1 document now.

1. **[P0] No named APT-class adversary.** Current doc
   tacitly assumes T1 (opportunistic) and names T2
   (malicious operator author). Nation-state = T3:
   persistence months-to-years, zero-day budget,
   maintainer-compromise tactics.
2. **[P0] Supply-chain adversary not decomposed.** The
   round-29 section covers *install-time* TOFU but
   not: GitHub maintainer-account compromise, third-
   party-action substitution via tag-move attacks,
   NuGet typosquat / ownership-takeover, CI-runner-
   image supply-chain, MSBuild `.targets` build-time
   code execution from transitive deps, dependabot PR
   poisoning, cache-poisoning persistence.
3. **[P0] Side-channel / microarchitectural absent
   from serious doc.** No rows on constant-time
   compare (HMAC / checkpoint signature), cache-
   timing on dictionary lookups, Spectre descendants
   on shared-tenant hosts (matters when multi-
   tenancy ships), timing-leaks in Arrow IPC schema-
   check path. Aaron-input territory.
4. **[P1] Insider threat with CI-secret access
   undefined.** Today `gate.yml` declares `contents:
   read` with zero secrets — invariant not
   documented. Becomes P0 when `NUGET_API_KEY`
   lands.
5. **[P1] Long-game / persistence adversary unnamed.**
   Backdoor from compromised maintainer laptop; a
   Semgrep rule weakened in the same PR that
   introduces the bug it would catch; a SKILL.md
   safety clause quietly removed three rounds before
   exploitation lands. No automated "did a safety
   clause regress" detector.
6. **[P1] Build-reproducibility adversary not
   modelled.** Fresh clone → `dotnet build -c Release`
   → byte-identical output? We don't know. SLSA L1
   at best.
7. **[P2] Cryptographic-downgrade.** No-negotiated-
   algorithm commitment for future HMAC / signature
   code.
8. **[P2] Multi-tenant cross-contamination.** Flagged
   by Aminata's standing research; P0 when multi-
   tenancy lands.
9. **[P2] Speculative-execution leaks in user-lambda
   code path.** User lambdas are semi-trusted; if two
   tenants ever share a process, Spectre-v1 across
   ZSets. Aaron-input.

## Gaps — trust boundaries

Current trust-boundary diagram ends at `DiskBackingStore`.
Missing boundaries the elevation adds:

- **B-CI.** `git push` → GHA runner → build artefacts.
  Owner: Aaron. Validation: SHA-pinned actions,
  `permissions: contents: read`, no secrets. Gap: no
  automated enforcement that a PR can't revert the
  SHA-pin.
- **B-Installer.** Maintainer laptop →
  `tools/setup/install.sh` → Homebrew / mise / elan
  upstreams → local toolchain. Owner: developer.
  Validation: documented TOFU. Gap: no machine-
  readable record of accepted hashes; re-running
  produces a different world undetectably.
- **B-NuGet-In.** `Directory.Packages.props` →
  `nuget.org` → restored DLLs → build. Owner:
  `package-auditor`. Validation: pinned versions +
  `packages.lock.json` (backlogged). Gap: lockfile not
  shipped; audit manual.
- **B-NuGet-Out (future).** `dotnet pack` → NuGet →
  downstream consumers. Owner: Aaron. Validation:
  nothing yet. **P0 before any public release.**
- **B-Skill-Supply-Chain.** PR diff → `.claude/skills/
  **/SKILL.md` → agent behaviour. Owner: skill-
  creator + prompt-protector. Gap: no diff-lint for
  removal of a safety clause.
- **B-Mathlib / Lean / TLA+.** External formal-method
  artefacts pulled at setup time. Owner: `formal-
  verification-expert`. Not currently enumerated.

## Gaps — mitigation validation (from threat-model-critic)

| Claim | Cited control | Status |
|---|---|---|
| Semgrep rule 7 (weight multiply) | rule exists | ✅ verified |
| CRC32C detects corruption not tampering | `HardwareCrc32C` | ✅ honest |
| Path traversal blocked | Semgrep rule 4 + `DiskSpine.fs pathFor` | ⚠ rule is WARNING not ERROR |
| No `BinaryFormatter`/`Activator` | Semgrep 8+11 | ✅ verified |
| Invisible-Unicode blocked | Semgrep rule 13 | ⚠ **rule exists but no CI job runs Semgrep.** Claim is aspirational today. |
| SDL #7 3rd-party risk ✅ | `tools/audit-packages.sh` + manual | ⚠ downgrade to 🔜 under nation-state bar |
| SDL #8 approved tools ✅ | analyzers run; Semgrep does not | ⚠ partial |
| SDL #9 SAST ✅ | 14 Semgrep rules + analyzers | ⚠ **Semgrep not in CI; CodeQL P1 but no workflow** — downgrade to 🔜 |
| SDL #12 incident response ✅ | `SECURITY.md` disclosure | ⚠ disclosure exists; no playbook — see §Response playbook |
| Elder-plinius never fetched | CLAUDE.md + persona rules | ✅ socially enforced |
| Actions SHA-pinning | `gate.yml` SHA-pins | ⚠ **no PR-level lint enforces it** — a contributor reverting to `@v6` passes CI |

**Pattern:** mitigations *real at writing* lack *persistence
controls*. Under long-game adversary modeling, undefended
controls aren't controls.

## 2024-2026 attack-class landscape (from security-researcher)

The load-bearing case study for Zeta's posture is the
**tj-actions/changed-files cascade** (CVE-2025-30066,
March 2025):
- SpotBugs maintainer PAT stolen via `pull_request_target`
  misconfig (Nov–Dec 2024)
- → reviewdog PAT
- → tj-actions PAT
- → 23,000+ repos compromised
- Original target: one Coinbase repo
- Dwell time: 3–4 months
- Depth: 4 supply-chain hops

This **is** nation-state-grade tradecraft in the wild,
and the structure is the shape to install in Zeta's
threat model. SHA-pinning defends the tag-move step;
it does not defend the dependabot-rubber-stamp of a
legitimately-published compromised SHA.

Other classes that apply to Zeta's shape:

- **Shai-Hulud npm worm (Sept & Nov 2025, 795 packages,
  100M+ downloads).** First self-replicating npm worm.
  NuGet has no auto-execute `postinstall`, but MSBuild
  `.targets`/`.props` from transitive deps execute at
  build — residual class.
- **Nethereum homoglyph typosquat** (Oct 2025, Cyrillic
  "е") and **shanhai666 time-bomb** (9 packages,
  dormant until 2027/2028 trigger targeting ICS/PLC) —
  motivates defensive pre-registration of `Zeta.*` +
  lockfile + reproducible builds (time-bomb packages
  pass today's audit).
- **`pull_request_target` RCE / secret exfil** (Timescale
  pgai, spotipy CVE-2025-47928, Google ai-ml-recipes
  leaking Gemini key, Microsoft symphony). GitHub is
  cutting over Dec 8 2025 so workflow runs from default
  branch only — audit `gate.yml` for any.
- **Actions cache poisoning** (Khan research) — caches
  persist across action SHA-pin updates.
- **XZ Utils backdoor** (Jia Tan, 2024) — 2.6-year
  trust-building campaign, sock-puppet pressure to add
  co-maintainer. Zeta has **bus factor 1** today
  (Aaron). Structural CVE worth naming.
- **Spectre descendants** (BPI CVE-2024-45332 on Intel
  Kaby Lake+, PB-Inception AMD Zen 1/2, Native BHI,
  BPRC) — belong to *host-process* threat model if Zeta
  is ever multi-tenant-hosted. Library-level concern:
  constant-time claims on integrity paths.
- **OIDC / `GITHUB_TOKEN` elevation** — when we adopt
  OIDC-to-NuGet for publishing, subject-claim must pin
  `{repo, ref, workflow, environment}` minimum.

## SPACE-OPERA completion plan

Triage of 17 current adversaries against the "every
entry maps to real STRIDE + real CVE-class + real
mitigation + shipped-or-BACKLOG" bar:

| # | Adversary | Current quality | Action |
|---|---|---|---|
| 1 | Time Lord (S) | Real — sigstore/Merkle | Keep |
| 2 | Quantum Twin (S) | Real pattern, unshipped | Keep, mark BACKLOG |
| 3 | Simulation Theory (S) | Mitigation is nonsense | **Rewrite** — cite RandomNumberGenerator + ChaosEnvironment seed hygiene |
| 4 | Wizard / Counterspell (T) | Strong | Keep, promote TLA+ stub to P1 spec |
| 5 | Mimic Storage (T) | Strong | Keep, rename mitigation to cite WDC |
| 6 | Malicious Prime (T) | Strongest entry | Keep |
| 7 | Quantum Immortality (R) | Mitigation handwaves EIP-4844 | **Rewrite** to cite sigstore/Rekor only |
| 8 | Git Revisionist (R) | Strong — force-push + sigstore | Keep |
| 9 | Psychic / EM (I) | TEMPEST class (Aaron's domain), mitigation is a joke | **Rewrite** — cite ring-buffer zero, `CryptographicOperations.ZeroMemory`, constant-time compare; **Aaron-input callout** |
| 10 | Alien SIGINT (I) | Duplicates Psychic | **Retire** |
| 11 | Spore Readers (I) | Real (Genkin 2014 GnuPG acoustic) | Keep, cite paper |
| 12 | AI That Learned (D) | Strong — Shard.Salt shipped | Keep |
| 13 | Lorem Ipsum (D) | Strong — bounded channel | Keep |
| 14 | Grey Goo (D) | WeightInvariant NOT YET shipped | Keep, mark P1 |
| 15 | AI Takeover (E) | ALC isolation BACKLOG | Keep |
| 16 | Liminal Attack (E) | Reproducible-build / SLSA | **Elevate** — frontier for nation-state posture |
| 17 | Necromancer (E) | Strong — Semgrep rule 3 | Keep |

**New adversaries to add (silly → real mitigation):**

- **The Poisoned Bard** — maintainer-account compromise
  (XZ-class). Mitigation: hardware-key 2FA on repo;
  signed commits; co-maintainer cooling-period policy.
- **The Changeling Action** — SHA-tag-move attack on
  third-party action (tj-actions-class). Mitigation:
  pre-commit lint that asserts full 40-char SHA pin +
  CODEOWNERS-required review on dependabot action bumps.
- **The Hungry Cache** — CI cache poisoning (Khan).
  Mitigation: cache key pinned to package-lock hash;
  no `restore-keys` prefix fallback; explicit "poisoned
  cache persists across action updates" acknowledgement.
- **The Time-Bomb Package** — shanhai666 class. NuGet
  package benign at audit, hostile at a calendar
  trigger. Mitigation: reproducible builds +
  `packages.lock.json` + SBOM diff on release.
- **The Helpful Stranger** — XZ-class sock-puppet
  pressure campaign. Mitigation: 30-day cooling period
  + identity-linked vouch on any co-maintainer request.

**Target round-30 ship:** 25 adversaries (keeps 13,
rewrites 3, retires 1, adds 5, the v1.0 target of 50
stays).

## Proposed new sections for `docs/security/THREAT-MODEL.md`

1. **§0 Adversary tiers.** T0 bored user → T1
   opportunistic → T2 organised crime (ransomware) →
   T3 APT / nation-state (months dwell, zero-day
   budget, maintainer-compromise tactics). Each STRIDE
   row tagged with "defends to which tier."
2. **§Supply-chain trust boundaries (expanded).**
   Replace ad-hoc TOFU section with structured table:
   boundary → upstream identity → acceptance control →
   verification control → rotation cadence → failure
   playbook.
3. **§Side-channel posture.** Own section: which
   classes we defend, which we don't, list of
   constant-time-required code paths. Aaron-drafted.
4. **§Build and release integrity.** SLSA-aligned:
   source → build → artefact attestations. State where
   we are (~L1) vs target for v1.0 NuGet release (L3).
5. **§Persistence / long-game defences.** Defence-of-
   defence controls: safety-clause-diff lint, SHA-pin
   enforcement, Semgrep-in-CI, CodeQL-in-CI, minimum
   reviewer count on security-relevant files.
6. **§Invariants promoted to formal spec.** Cross-ref
   `tools/tla/specs/`, `tools/alloy/specs/`,
   `tools/lean4/`: which STRIDE quadrants have
   machine-checked artefacts.
7. **§Adversary-tier → control matrix.** Reverse
   index: for each control, which tier it defends to.
   Forces honesty about T3.
8. **§Bus-factor risk.** Name the structural CVE
   (Aaron-as-sole-maintainer). Remediation plan with
   milestones.

## Response playbook — new `docs/security/INCIDENT-PLAYBOOK.md`

- **Triage-in-60-seconds.** Decision tree: source /
  dep / toolchain / CI compromise?
- **Playbook A — third-party action ships malicious
  release.** SHA-pins defend against auto-update.
  Freeze CI → audit `gate.yml` diff → `workflow_dispatch`
  on pristine fork → rotate any compromised SHA.
- **Playbook B — `mise.run` / Homebrew / elan mid-
  setup hijack.** Detection-not-prevention. Compare
  local binary vs known-good hash; wipe
  `~/.local/share/mise` / Homebrew cellar; reinstall
  from different network path; notify.
- **Playbook C — NuGet dep poisoning (typosquat,
  ownership takeover, time-bomb).** `nuget locals all
  --clear`; diff `Directory.Packages.props` vs last-
  known-good; file advisory; package-auditor re-runs
  full audit; check for MSBuild `.targets` injection.
- **Playbook D — maintainer-account compromise
  (Aaron's GitHub).** Freeze main; rotate keys and
  PATs; revoke deploy keys; rebuild from last signed
  tag; human-assisted recovery.
- **Playbook E — skill safety-clause regression.**
  Revert PR; prompt-protector runs injection test
  suite against affected agent; post-mortem.
- **Playbook F — suspected side-channel leak in
  production.** Aaron-owned template.
- **Contact tree + disclosure timeline.** Extends
  `SECURITY.md`.

## Recommended controls not yet in Zeta (prioritised)

| # | Control | Round-30? |
|---|---|---|
| 1 | Verifier-jar SHA-256 pinning (tla2tools, alloy) | Yes — closes TOFU on first fetch |
| 2 | `.mise.toml` `mise trust` gate in CI | Yes — `[env]`/hooks are code execution; DEBT already |
| 3 | Semgrep-in-CI as a gate | **Yes — the single biggest posture gap** |
| 4 | CodeQL-in-CI | Yes — low config cost |
| 5 | SHA-pin enforcement lint on dependabot action bumps | Yes — closes tj-actions class |
| 6 | Central Package Management + `packages.lock.json` + `RestoreLockedMode=true` | Yes — defeats time-bomb + transitive attacks |
| 7 | SLSA L3 provenance via `actions/attest-build-provenance` | Pre-v1.0 blocker, not round-30 |
| 8 | OIDC-based NuGet publish (no long-lived API key) | Pre-v1.0 blocker |
| 9 | Signed commits required on main | Yes — defeats Renovate-spoof (tj-actions) |
| 10 | Pre-register `Zeta.*` / `Dbsp.*` NuGet IDs | Pre-public-release blocker |
| 11 | MSBuild `.targets`/`.props` allowlist check | Yes — closes NuGet build-time code-exec |
| 12 | Reproducible-build target | V1.0 stretch |
| 13 | Safety-clause-diff lint on `.claude/skills/**/SKILL.md` | Yes — closes long-game skill regression |

## Questions that need Aaron's domain input

1. **APT dwell-time assumption.** 6 months? 18? Drives
   "how often do we re-verify shipped mitigations."
2. **Smart-grid CVE classes to import.** Malicious-
   firmware-update, signed-update-chain break, field-
   device provisioning TOFU — which transfer?
3. **Side-channel triage for F#/.NET library on
   consumer hardware in T3 deployment.** Realistic
   list of constant-time-required ops — HMAC verify,
   checkpoint sig compare, what else?
4. **Hardware adversary acceptance.** Commit to no-
   hardware-side-channel posture for v1.0 or
   explicitly out-of-scope? Current doc implies
   neither.
5. **Maintainer-compromise controls on Aaron's own
   account.** Hardware-key 2FA? Signed commits? Co-
   maintainer required for main push? Document-now-
   enforce-later or enforce-now?
6. **Reproducible-build target for v1.0.** SLSA L3,
   L2, or explicitly deferred?
7. **Space-Opera Psychic/Alien/Spore entries.**
   Aaron rewrites with real mitigations; Aminata
   (threat-model-critic) provides STRIDE framing,
   Aaron provides the physics.
8. **Round-29 TOFU acceptance under T3.** Currently
   accepted residual risk. Does elan installer (runs
   as user, accesses dev environment) warrant
   revisiting?

## Round-30 shape estimate

Documentation-mostly, with one load-bearing engineering
task (Semgrep-in-CI, because 14 rules with zero gate is
the single largest posture-vs-reality gap).

- `docs/security/THREAT-MODEL.md` expansion: ~500
  added lines (adversary tiers, supply-chain expanded,
  side-channel section, build-integrity, long-game,
  formal cross-ref, tier-matrix, bus-factor).
- `docs/security/THREAT-MODEL-SPACE-OPERA.md`: ~50 net
  lines (3 rewrites, 1 retire, 5 adds).
- `docs/security/INCIDENT-PLAYBOOK.md` (new): ~300
  lines.
- `docs/security/SDL-CHECKLIST.md`: 3–4 cell
  downgrades ✅ → 🔜.
- `.semgrep.yml` + `.github/workflows/`: new
  `lint.yml` (or merge into `gate.yml`) running
  `semgrep --config .semgrep.yml`. Small.
- CodeQL workflow: use `github/codeql-action`, C# +
  F#. Small.
- SHA-pin-enforcement check: Semgrep rule on
  `.github/workflows/**` matching mutable tags. Small.
- **`packages.lock.json` adoption** + audit: medium;
  backlogged per round-29 DEBT, promoted to in-round
  because it closes the time-bomb vector.
- Aaron-drafted sections (side-channel, maintainer-
  compromise, smart-grid CVE imports): his cadence.

**Size:** one round if Aaron's input lands
synchronously; two rounds if it splits. Engineering
follow-through (SLSA L3, OIDC NuGet, signed commits,
reproducible builds) spans round-31 and round-32 as
v1.0-blocker sequence.

## What lands after Aaron signs off on this doc

1. `docs/security/THREAT-MODEL.md` expansion per
   §"Proposed new sections" + tier matrix.
2. `docs/security/THREAT-MODEL-SPACE-OPERA.md`
   completion per §"SPACE-OPERA completion plan".
3. `docs/security/INCIDENT-PLAYBOOK.md` — new file.
4. `docs/security/SDL-CHECKLIST.md` honest
   downgrades.
5. Semgrep-in-CI, CodeQL-in-CI, SHA-pin-enforcement
   Semgrep rule.
6. `packages.lock.json` adoption.
7. Safety-clause-diff lint for `.claude/skills/**`.

Reviewer floor per GOVERNANCE §20 on every landing:
`threat-model-critic` + `security-researcher` (primary
voices), `harsh-critic` + `maintainability-reviewer`
(§20 floor), `prompt-protector` on the skill-diff
lint.
