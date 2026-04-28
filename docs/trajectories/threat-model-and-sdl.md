# Trajectory — Threat Model + SDL

## Scope

The shipped threat model under `docs/security/THREAT-MODEL.md`,
the Security Development Lifecycle (SDL) checklist, the
adversarial-review pipeline (Aminata threat-model-critic;
Mateo proactive security research; Nazar security-operations;
Nadia prompt-protector), and the supply-chain-security stack
(SLSA signing, sigstore, SBOM, dependency provenance). Open-ended
because new attack classes emerge continuously, crypto primitives
need quantum-resistant migration, and supply-chain primitives
evolve. Bar: every realistic adversary class has a documented
mitigation; mitigations are validated; the model doesn't go stale.

## Cadence

- **Per-commit**: prompt-protector + threat-model-critic on
  agent-skill changes; security-researcher scans for novel
  classes.
- **Quarterly**: full threat model review (Aminata's adversarial
  pass).
- **Per-CVE**: when a relevant CVE drops, security-operations
  triages + patches.
- **Per-crypto-evolution**: when NIST PQC standards update,
  migration trajectory advances.

## Current state (2026-04-28)

- `docs/security/THREAT-MODEL.md` — shipped threat model
- `docs/security/V1-SECURITY-GOALS.md` — pre-v1 security bar
- SDL checklist — `docs/security/sdl-checklist.md`
- Adversaries enumerated: prompt-injection, supply-chain (NPM/NuGet),
  CVE-class (latest tj-actions/changed-files cascade
  CVE-2025-30066 March 2025), crypto (Nagravision/VC2/SIKE
  collapsed), tag-rewrite attacks (gha-action-mutable-tag rule)
- PQC migration: planning stage; Kyber/Dilithium/Falcon/SPHINCS+
  candidates documented; lattice-ZK for consent-attestation
  research-grade
- Supply chain: full-SHA action pinning; Dependabot enabled;
  Sonatype dependency audit; secret scanning + push protection;
  SLSA signing planned (V1)
- Personas: Aminata (threat-model-critic) reviews
  shipped THREAT-MODEL.md adversarially; Mateo (security-researcher)
  scouts novel classes + files BUGS.md P0-security entries;
  Nazar (security-operations-engineer) handles incident response;
  Nadia (prompt-protector) hardens agent skills against injection

## Target state

- Every realistic adversary in scope has a mitigation cited in
  the threat model + a verification artifact (test, spec, or
  proof).
- Crypto primitives are PQC-current: Kyber for KEM, Dilithium
  for signatures, Falcon where compactness matters,
  SPHINCS+ for hash-based fallback. All cryptography
  quantum-resistant per Aaron 2026-04-23.
- Supply chain: SLSA Level 3+ signing on all releases; SBOM
  shipped per release; dependency provenance auditable.
- Adversarial review (Aminata) finds zero stale mitigations on
  quarterly pass.
- BUGS.md P0-security entries don't accumulate (proactive close).

## What's left

In leverage order:

1. **PQC migration** — currently classical-only crypto in load-
   bearing places; Kyber + Dilithium adoption is ongoing
   research, not yet executed.
2. **SLSA signing operations** — Nazar's persona owns this;
   not yet running.
3. **HSM key rotation** — pre-v1 security goal; not yet
   automated.
4. **Adversarial-review quarterly cadence** — Aminata
   threat-model-critic reviews on cadence; last review pass
   uncertain.
5. **BUGS.md P0-security audit** — periodic re-read for stale
   entries; cadence not active.
6. **Threat-model SPACE-OPERA teaching variant** — Aminata's
   pedagogy variant; documentation pass.

## Recent activity + forecast

- 2026-04-28: gha-action-mutable-tag semgrep rule fired on PR #25
  (caught CVE-2025-30066-class attack shape).
- 2026-04-27: EIP-7702 production threat model (phishing-via-
  delegation, sweeper contracts, broken tx.origin invariant)
  documented in wallet-v0 spec.
- 2026-04-23: all-cryptography-quantum-resistant policy memory
  filed (no mixed-tier crypto).
- 2026-04-21: lattice-based cryptographic identity verification
  research absorb.

**Forecast (next 1-3 months):**

- PQC migration trajectory step (research → first adoption).
- SLSA signing operationalization candidate.
- Wallet experiment v0 attack-surface enumeration when v0 ships.
- Possible new threat-model adversaries from external-contributor
  workflow (when it opens).

## Pointers

- Skill: `.claude/skills/threat-model-critic/SKILL.md` (Aminata)
- Skill: `.claude/skills/security-researcher/SKILL.md` (Mateo)
- Skill: `.claude/skills/security-operations-engineer/SKILL.md` (Nazar)
- Skill: `.claude/skills/prompt-protector/SKILL.md` (Nadia)
- Skill: `.claude/skills/space-opera-writer/SKILL.md` (teaching variant)
- Doc: `docs/security/THREAT-MODEL.md`
- Doc: `docs/security/V1-SECURITY-GOALS.md`
- Doc: `docs/security/sdl-checklist.md`
- Memory: `memory/feedback_all_cryptography_quantum_resistant_*.md`
- Memory: `memory/user_lattice_based_cryptographic_identity_verification.md`

## Research / news cadence

External tracking required — this is an active-tracking trajectory.

| Source | What to watch | Cadence |
|---|---|---|
| NIST PQC standards (FIPS 203/204/205/206) | Updates to Kyber/Dilithium/Falcon/SPHINCS+; new candidate algorithms | Quarterly |
| NIST CSF / SP 800-* | Updated security frameworks | Quarterly |
| CVE feeds (NVD, GitHub Advisory) | Vulnerabilities affecting Zeta's dependencies + supply chain | Real-time |
| OWASP Top 10 + LLM Top 10 | New attack classes | Quarterly |
| OWASP Prompt-Injection Cheat Sheet | Hardening patterns for agent-skill injection defense | Quarterly |
| GitHub Security Lab + advisories | Supply-chain attacks (tj-actions/changed-files cascade was caught here) | Real-time |
| Kyber / Dilithium / Falcon library releases | PQC primitive maturity, side-channel research | Quarterly |
| Lattice-cryptography research papers | LatticeFold (Boneh-Chen 2024 etc.), ZK improvements | Monthly |
| Sigstore / SLSA evolution | Supply-chain integrity primitives | Quarterly |
| ZachXBT / rekt.news / DeFi attack postmortems | Live attack-class evidence (informed wallet-v0 EIP-7702 threat model) | Weekly |

Findings capture: P0-security findings → BUGS.md entry by
Mateo (security-researcher) directly. Routine tracking →
research-doc absorb + threat-model update on quarterly cadence.
Crypto-class evolution → migration trajectory steps.
