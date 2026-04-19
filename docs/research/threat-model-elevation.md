# Threat-model elevation — design for Zeta

**Round:** 30
**Status:** Aaron-reviewed 2026-04-18 — ready to land.
**Scope:** elevate Zeta's threat-model posture to nation-
state + supply-chain grade. Complete SPACE-OPERA as
imaginative teaching material. Every mitigation
validated against a real control.
**Sources:** paired research from `threat-model-critic`
(audit + gap analysis) and `security-researcher`
(2024-2026 attack-class landscape).
**Human framing:** Aaron — nation-state-adversary
posture, supply-chain primacy, pragmatic current-state
discipline.

## Aaron's decisions (locked 2026-04-18)

1. **Re-audit cadence: *often*.** Every round (or every
   few), not quarterly / annual. Pairs with an implicit
   assumption that dwell time is bounded by the round
   cadence itself — if adversary activity predates the
   current re-audit window, we catch it on the next.
2. **Smart-grid / hardware / side-channel sections: cut.**
   Personal context stays as framing; no rows in the
   threat model for these classes. Revisit when crypto
   lands (not this round, not this quarter).
3. **Maintainer-account controls: documented
   exception.** Today Aaron runs 2FA only. Hardware
   security keys, signed commits, co-maintainer cooling
   period — **called out as accepted risk with
   rationale**, not aspired to. The threat model names
   the bus-factor-1 + 2FA-only posture honestly. Agents
   educate Aaron over time; he chooses when to adopt
   further controls.
4. **SLSA: L1 now, walk up.** Explicit ladder —
   target L1 this round (we're essentially there);
   L2 mid-term; L3 pre-v1.0 public NuGet.
5. **SPACE-OPERA: creative license.** "*Really an
   imagination game at heart.*" Rewrite Psychic /
   Alien / Spore and others with pushed-limits
   imagination. Teaching structure stays (silly
   adversary → real STRIDE → real mitigation pattern
   → shipped / BACKLOG / aspirational). Mitigations
   can be aspirational if clearly tagged.
6. **TOFU on verifier jars + installers: accept today,
   improve over time.** Not deferred-forever; explicit
   gradient — ship SHA-256 pinning as a round-31+
   item, after Semgrep-in-CI lands.
7. **Bus factor 1 is an acknowledged structural
   exception.** Named in the threat model, not a
   P0 remediation this round.

## Why this round

Aaron at round-29 close: *"in the real threat model we
should take into consideration nation state and supply
chain attacks."* Round-29 CI + install script landing
added supply-chain surface the doc hadn't absorbed.
Round-30 fixes both.

## Current-state summary

- `docs/security/THREAT-MODEL.md` — competent STRIDE
  for a single-tenant embedded F# library. Narrow
  adversary model a nation-state reviewer would not
  be slowed by.
- `docs/security/THREAT-MODEL-SPACE-OPERA.md` — works
  as teaching, some entries aspirational. Per Aaron,
  push the imagination harder in round 30.
- `docs/security/SDL-CHECKLIST.md` — mostly accurate
  for old scope; old scope is now wrong post-round-29.
- `.semgrep.yml` — 14 rules. **CI runs zero of them.**
  Single largest posture-vs-reality gap.

## Gaps — adversary-model coverage

Severity: **P0** blocks nation-state claim; **P1**
closes before v1.0; **P2** post-v1 document now.

1. **[P0] No named APT-class adversary.** Current doc
   tacitly assumes T1 (opportunistic) + T2 (malicious
   operator). T3 (nation-state, months+ dwell, zero-day
   budget, maintainer compromise) absent.
2. **[P0] Supply-chain adversary not decomposed.**
   Round-29 section covers install-time TOFU only. Not
   covered: GitHub maintainer-account compromise,
   third-party-action SHA substitution via dependabot
   rubber-stamp, NuGet typosquat / ownership takeover /
   time-bomb, CI-runner-image compromise, MSBuild
   `.targets` build-time code execution from
   transitive deps, dependabot PR poisoning, cache
   poisoning persistence.
3. **[P1] Insider threat with CI-secret access
   undefined.** Today `gate.yml` has no secrets —
   invariant not documented. Becomes P0 when
   `NUGET_API_KEY` lands.
4. **[P1] Long-game / persistence adversary unnamed.**
   Backdoor from compromised maintainer laptop;
   Semgrep rule weakened in same PR that introduces
   the bug it would catch; SKILL.md safety clause
   quietly removed three rounds before exploitation.
   No automated regression detector.
5. **[P1] Build-reproducibility adversary not
   modelled.** Do two fresh clones produce byte-
   identical builds? Unknown.
6. **[P2] Cryptographic-downgrade.** Paper commitment
   for the day HMAC / signatures land.
7. **[P2] Multi-tenant cross-contamination.** Flagged;
   P0 when multi-tenancy lands.

**Excluded from this round (Aaron):** side-channel /
microarchitectural / hardware classes — we have no
crypto, too early.

## Gaps — trust boundaries

Current diagram ends at `DiskBackingStore`. Missing
boundaries the elevation adds:

- **B-CI.** `git push` → GHA runner → build. Owner:
  Aaron. Validation: SHA-pinned actions,
  `contents: read`, no secrets. Gap: no lint enforces
  SHA-pin on PR.
- **B-Installer.** Maintainer laptop →
  `tools/setup/install.sh` → upstreams → local
  toolchain. Owner: developer. Validation: documented
  TOFU. Gap: no known-good-hash record.
- **B-NuGet-In.** `Directory.Packages.props` →
  `nuget.org` → restored DLLs → build. Owner:
  `package-auditor`. Gap: `packages.lock.json`
  backlogged; audit is manual.
- **B-NuGet-Out (future).** `dotnet pack` → NuGet →
  consumers. **P0 before any public release.**
- **B-Skill-Supply-Chain.** PR diff → `.claude/skills/
  **/SKILL.md` → agent behaviour. Owner: `skill-
  creator` + `prompt-protector`. Gap: no diff-lint for
  safety-clause removal.
- **B-Mathlib / Lean / TLA+.** External formal-method
  artefacts. Owner: `formal-verification-expert`.
  Not enumerated today.

## Gaps — mitigation validation

| Claim | Cited control | Status |
|---|---|---|
| Semgrep rule 7 (weight multiply) | rule exists | ✅ verified |
| CRC32C for corruption not tampering | `HardwareCrc32C` | ✅ honest |
| Path traversal blocked | Semgrep rule 4 + `DiskSpine.fs pathFor` | ⚠ rule is WARNING not ERROR |
| No `BinaryFormatter`/`Activator` | Semgrep 8+11 | ✅ verified |
| Invisible-Unicode blocked | Semgrep rule 13 | ⚠ **rule exists, no CI job runs Semgrep** — aspirational today |
| SDL #7 3rd-party risk ✅ | `tools/audit-packages.sh` + manual | ⚠ downgrade to 🔜 |
| SDL #8 approved tools ✅ | analyzers run; Semgrep does not | ⚠ partial |
| SDL #9 SAST ✅ | 14 Semgrep rules + analyzers | ⚠ **Semgrep not in CI; CodeQL has no workflow** — downgrade to 🔜 |
| SDL #12 incident response ✅ | `SECURITY.md` disclosure | ⚠ disclosure exists; no playbook |
| Elder-plinius never fetched | CLAUDE.md + persona rules | ✅ socially enforced |
| Actions SHA-pinning | `gate.yml` SHA-pins | ⚠ **no PR-level lint enforces** — revert to `@v6` passes CI |

**Pattern:** mitigations real at writing lack
persistence controls. Round-30 closes the biggest:
Semgrep-in-CI.

## 2024-2026 attack-class landscape

Load-bearing case study: **tj-actions/changed-files
cascade** (CVE-2025-30066, March 2025). 4 hops deep,
3-4 month dwell, started with a single Coinbase target,
cascaded to 23,000 repos. Nation-state tradecraft in
the wild. SHA-pinning defends the tag-move step; does
not defend a dependabot rubber-stamp of a legitimately-
published compromised SHA.

Other classes that apply:

- **Shai-Hulud npm worm** (Sept + Nov 2025) — NuGet
  has no auto-execute postinstall, but MSBuild
  `.targets` / `.props` from transitive deps execute
  at build — residual class.
- **Nethereum typosquat** (Oct 2025, Cyrillic е) +
  **shanhai666 time-bomb** (ICS/PLC payload, 2027
  trigger) — motivates `packages.lock.json` +
  pre-registration of `Zeta.*` namespace.
- **`pull_request_target` RCE** (Timescale pgai,
  spotipy CVE-2025-47928, Google ai-ml-recipes, MS
  symphony). GitHub closed the default-branch loophole
  Dec 2025. Audit `gate.yml` for any use.
- **Actions cache poisoning** (Khan research). Caches
  persist across SHA-pin updates.
- **XZ Utils backdoor** (Jia Tan, 2.6 years). **Zeta
  has bus factor 1 — Aaron documented accepted risk.**
- **OIDC / `GITHUB_TOKEN` elevation** — relevant when
  OIDC-to-NuGet publish lands pre-v1.0.

## SPACE-OPERA completion — imagination game

Per Aaron: *"push the limits of the imagination."*
Structure (silly adversary → real STRIDE → real
mitigation pattern → shipped/BACKLOG/aspirational).
Mitigations can be aspirational if tagged.

**Rewrites — imagination pushed:**

- **Psychic / EM.** Rewritten as *"The Whispering
  Drone Swarm"* — swarm of micro-drones hovering
  outside Aaron's window reading RAM contents via
  electromagnetic emanations. STRIDE: I. Mitigation
  *(aspirational — when crypto lands)*: ring-buffer
  zero-on-free, constant-time compare for any future
  integrity code, `CryptographicOperations.ZeroMemory`.
  Reality tag: **future — no crypto to leak today.**
- **Alien SIGINT.** Rewritten as *"Echoes from the
  Dyson Sphere"* — an advanced civilisation's
  astronomical-scale signals-intelligence apparatus
  has been passively recording Earth internet since
  1962 and is now correlating Zeta commits against
  your coffee-shop WiFi. STRIDE: I. Mitigation
  *(aspirational)*: HTTPS everywhere, no secrets on
  the wire, least-privilege tokens. Reality tag:
  **allegorical — teaches "assume passive adversary
  with unlimited history."**
- **Spore Readers.** Rewritten as *"The Fungal
  Network"* — mycelial mats under the data centre
  are naturally acoustic sensors; a cunning adversary
  has trained them to transcribe keyboard sounds
  (Genkin et al. 2014 did this with microphones; the
  Spore Readers do it with mushrooms). STRIDE: I.
  Mitigation: no keystroke-derived secrets in the
  library surface. Reality tag: **teaching — real
  acoustic side-channels exist on cryptographic
  operations; we have none to target.**

**New adversaries:**

- **The Poisoned Bard.** A beloved open-source bard
  travels from codebase to codebase contributing
  delightful songs. One night, a spy replaces the
  bard. The songs still rhyme. The bard's GitHub
  account pushes a commit that looks just like
  theirs. STRIDE: S. Mitigation: hardware-key 2FA
  on repo *(Aaron: called-out accepted risk, 2FA
  only today)*, signed commits *(deferred)*. Reality
  tag: **documented exception.**
- **The Changeling Action.** A GitHub Action you
  trust has been replaced with a doppelgänger — same
  name, same tag, subtly different SHA. STRIDE: T.
  Mitigation: full 40-char commit SHA pin on every
  third-party action *(shipped in `gate.yml`)*;
  dependabot SHA-bump requires human review *(policy,
  not yet enforced — BACKLOG)*. Reality tag: **half-
  shipped.**
- **The Hungry Cache.** A GitHub-hosted cache is in
  fact a gateway to a parallel dimension where the
  cached NuGet package is a malicious clone. Returns
  the malicious version on cache hit. STRIDE: T.
  Mitigation: cache key pinned to Directory.Packages.
  props hash *(shipped)*; no `restore-keys` prefix
  fallback *(shipped)*. Reality tag: **shipped, but
  inherits `packages.lock.json` BACKLOG.**
- **The Time-Bomb Package.** A NuGet package ships
  benign for two years then, on the stroke of
  midnight 2028-01-01, reveals its true nature:
  it has been a backdoor all along. STRIDE: T.
  Mitigation: `packages.lock.json` + reproducible
  builds *(both BACKLOG)*. Reality tag: **real
  class, no defence yet.**
- **The Helpful Stranger.** An unusually friendly
  contributor has been submitting polite, high-
  quality PRs for 2.6 years. They would like to be
  added as a co-maintainer. They mention, repeatedly
  and kindly, that Aaron is overloaded and could use
  the help. STRIDE: E. Mitigation: 30-day cooling
  period + identity-linked vouch on any co-
  maintainer request *(aspirational policy today)*.
  Reality tag: **XZ lesson — structural control
  pending.**

**Aspirational-but-imaginative extras (teaching
material, not defended):**

- **The Moon Stares Back.** The moon has been
  fitted with a ground-based-laser side-channel
  reader. Our timing-attack defences must consider
  lunar phase. STRIDE: I. Mitigation tag: **pure
  teaching; zero crypto to target.**
- **The Ghost in the Git Blame.** Deceased
  contributors' commits contain steganographic
  messages to future maintainers; the ghosts have
  grievances. STRIDE: R. Mitigation tag: **signed
  commits resolve both the ghost and the
  maintainer-compromise case — bundled future
  work.**

**Retirements:** none. All three original side-
channel entries get imaginative rewrites per Aaron's
creative-license grant.

**Target round-30 ship:** 17 (original, rewritten) +
5 (new) + 2 (imaginative extras) = 24 adversaries.
V1.0 goal of 50 stays.

## Proposed new sections for `docs/security/THREAT-MODEL.md`

1. **§0 Adversary tiers.** T0 / T1 / T2 / T3 with
   explicit "defends to which tier" tagging per
   STRIDE row.
2. **§Re-audit cadence.** *"Every round"* is the
   default; any claim not re-verified in N rounds is
   a DEBT entry. Paired with `factory-audit` +
   `threat-model-critic` round cadence.
3. **§Bus-factor documented exception.** Aaron as
   sole maintainer today + 2FA-only account controls.
   Accepted risk; remediation ladder (hardware key →
   signed commits → co-maintainer with cooling
   period) documented as education-over-time items.
4. **§Supply-chain trust boundaries (expanded).**
   Replace ad-hoc TOFU section with structured
   boundary table.
5. **§Build and release integrity.** SLSA-aligned.
   Explicit ladder: **L1 now** (we're there) → L2
   mid-term → L3 pre-v1.0 NuGet release.
6. **§Persistence / long-game defences.** Safety-
   clause-diff lint, SHA-pin enforcement, Semgrep-
   in-CI, CodeQL-in-CI, reviewer count floor.
7. **§Invariants promoted to formal spec.** Cross-
   ref `tools/tla/specs/`, `tools/alloy/specs/`,
   `tools/lean4/`.
8. **§Adversary-tier → control matrix.** Reverse
   index. Forces honest tier scoring.

**Not added this round (Aaron's cuts):** §Smart-grid
adversary transfer, §Side-channel posture, §Hardware
adversary. Placeholder line noting deferral.

## Response playbook — new `docs/security/INCIDENT-PLAYBOOK.md`

- Triage-in-60-seconds decision tree (source / dep /
  toolchain / CI).
- Playbook A — third-party action ships malicious
  release.
- Playbook B — `mise.run` / Homebrew / elan mid-
  setup hijack.
- Playbook C — NuGet dep poisoning (typosquat,
  takeover, time-bomb).
- Playbook D — maintainer-account compromise.
- Playbook E — skill safety-clause regression.
- Contact tree + disclosure timeline.

## Controls to land this round

| # | Control | Effort | Notes |
|---|---|---|---|
| 1 | **Semgrep-in-CI as a lint gate** | M | The biggest win — 14 rules go from aspirational to enforced |
| 2 | CodeQL workflow | M | C# + F#; GitHub-hosted action |
| 3 | SHA-pin enforcement Semgrep rule | S | Match mutable tags (`@v4`, `@main`) in `.github/workflows/**` |
| 4 | Verifier-jar SHA-256 pinning | S | Closes TOFU on first fetch; improve-over-time |
| 5 | `.mise.toml` trust gate in CI | S | Already DEBT |
| 6 | `packages.lock.json` adoption | M | `RestoreLockedMode=true`; defeats time-bomb + transitive |
| 7 | Safety-clause-diff lint on `.claude/skills/**` | S | Long-game skill regression defence |

Deferred per Aaron:

- Hardware-key 2FA, signed commits, co-maintainer
  cooling period — documented exception, not
  enforced this round.
- SLSA L2/L3 — ladder target, not now.
- OIDC-to-NuGet publish — when NuGet publish lands.
- Pre-registration of `Zeta.*` namespace — before
  public release.

## Round-30 landing shape

1. `docs/security/THREAT-MODEL.md` expansion per
   §"Proposed new sections".
2. `docs/security/THREAT-MODEL-SPACE-OPERA.md`
   completion — 17 kept (3 rewritten), 5 new, 2
   imaginative extras.
3. `docs/security/INCIDENT-PLAYBOOK.md` — new file.
4. `docs/security/SDL-CHECKLIST.md` honest
   downgrades (3-4 cells ✅ → 🔜).
5. `.github/workflows/` — Semgrep lint gate;
   CodeQL workflow.
6. New Semgrep rule — SHA-pin enforcement on
   `.github/workflows/**`.
7. `tools/setup/manifests/verifiers.txt` — add
   SHA-256 column; `tools/setup/common/verifiers.sh`
   — verify after download.
8. `.mise.toml` trust gate in CI (the backlog item).
9. `packages.lock.json` adoption + CI lockfile
   enforcement.
10. Safety-clause-diff lint — Semgrep rule + CI job.

Reviewer floor: `threat-model-critic` +
`security-researcher` (primary on the security docs),
`harsh-critic` + `maintainability-reviewer` (§20
floor), `prompt-protector` on the skill-diff lint.

## Post-round-30 roadmap

| Round | Focus |
|---|---|
| 31 | Reproducible-build experiments; signed commits adoption if Aaron chooses |
| 32 | OIDC-to-NuGet publish scaffolding (when NuGet publish nears) |
| 33+ | SLSA L2 → L3 ladder |
| Pre-v1.0 | `Zeta.*` namespace pre-registration; NuGet publish design doc; release playbook |
