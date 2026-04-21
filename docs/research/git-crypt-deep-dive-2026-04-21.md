# git-crypt deep-dive — 2026-04-21

> **Decision (2026-04-21): REJECTED.** Aaron, after reading
> this research: *"git crypto no go i read your initial
> review"*. git-crypt is out of the candidate set for Zeta
> secrets-at-rest. Rejection is encoded in
> `docs/WONT-DO.md` (*Engineering patterns → git-crypt for
> secrets management*). This document is **kept as the
> rationale artifact** — *"keeep the reserach ... so i
> don't ask you tomorrow"* — so future-self sees the
> reasoning without re-running it. The remaining candidate
> set for the eventual ADR is SOPS + KMS (long-lived
> secrets) and `age` (ephemeral / PQC-curious); `git-secret`
> is also out by sibling reasoning (same OpenPGP-GPG + no-
> revocation properties).

**Date:** 2026-04-21
**Author:** Architect (Kenji) — cartographer pass, not a
decision. Feeds into the P2 BACKLOG row *"Gitops-friendly key
management + rotation — ADR first, then pick one tool"*
(`docs/BACKLOG.md`).
**Triggering ask:** Aaron, 2026-04-21 — *"while you are here
reserch gitcrypt for secrets on backlog"*.
**Status:** REJECTED 2026-04-21 (see banner above). Rationale
artifact retained. SOPS / age remain in the candidate set;
ADR under `docs/DECISIONS/YYYY-MM-DD-gitops-key-management.md`
not yet drafted.

## TL;DR

- **git-crypt v0.8.0** (released 2025-09-24, GPL-3.0,
  `github.com/AGWA/git-crypt`). 101 open issues, 205
  commits on master, still pre-v1.0 with authors reserving
  the right to break compatibility.
- **One thing it is great at:** mixed-public-private repos
  where a handful of files carry secrets and you want `git
  add / commit / push` to keep working transparently via a
  `.gitattributes` filter.
- **Three things it is fundamentally bad at — each one a
  Zeta-values mismatch:**
  1. **No access revocation.** Authors explicit: *"git-crypt
     does not support revoking access to an encrypted
     repository which was previously granted."* Once a user
     has the key, they have every historical version of every
     encrypted file, forever. This is the exact opposite of
     retraction-native (value #4 in `CONFLICT-RESOLUTION.md`).
  2. **Binary diffs break code review.** Encrypted files
     appear as opaque blobs in diffs — reviewers cannot read
     what changed, which breaks the review gate the rest of
     the factory depends on.
  3. **Metadata leak by design.** No encryption of filenames,
     commit messages, symlink targets, or repo metadata. A
     `.gitattributes` entry like `secrets/prod.yaml filter=
     git-crypt diff=git-crypt` tells the world there is a
     `prod.yaml` secret — only the contents are hidden.
- **Recommendation scaffolding for the ADR:** git-crypt
  scores well on gitops-first (value-aligned), poorly on
  retraction (value-misaligned), medium on team-scale
  (works for ≤5-10 contributors, degrades past that), medium
  on audit (commits visible, contents opaque). SOPS with
  external KMS scores better on retraction and audit;
  `age` scores better on post-quantum readiness and
  passphrase UX. The four-way scorecard remains open.

## 1. Current maintenance snapshot

| Metric | Value |
|---|---|
| Version | 0.8.0 |
| Released | 2025-09-24 |
| License | GPL-3.0 |
| Repo | `github.com/AGWA/git-crypt` |
| Open issues | 101 |
| Total commits (master) | 205 |
| Pre-v1.0 | yes; authors may break compat |
| Last security audit | none located (2026-04-21) |

Authors' self-description: *"bug-free and reliable"* but
*"not as documented, featureful, or easy-to-use as it
should be"*. Interpret as: stable primitive, small surface,
maintained but not thriving.

## 2. Security model

Encryption: AES-256 in CTR mode with a synthetic IV derived
from the SHA-1 HMAC of the plaintext (convergent-encryption
style). Provides provable semantic security under
deterministic chosen-plaintext attack that *leaks no
information beyond whether two files are identical*.

Two key modes:

- **Symmetric (shared key)** — one AES key committed into
  the repo encrypted under a passphrase. Simple; every user
  who can decrypt the passphrase has every secret.
- **GPG (public-key)** — each collaborator's GPG key is
  added via `git-crypt add-gpg-user`; the symmetric key is
  re-encrypted to every authorised GPG key. Scales better
  for small teams; still cannot revoke prior access.

## 3. Five concrete gotchas (collected 2026-04-21)

1. **Revocation is impossible without history rewrite.**
   Removing a user requires generating a new symmetric key
   AND *rewriting every historical commit* that contains
   encrypted content, then force-pushing. This is
   prohibitively expensive on an active repo and breaks
   every outstanding clone / fork / PR.
2. **Third-party git GUIs can leak plaintext.** Upstream
   README warns that *"git-crypt does not work reliably
   with some third-party git GUIs, such as Atlassian
   SourceTree and GitHub for Mac. Files might be left in an
   unencrypted state."* Silent data-plane failure — CI
   workflows that blindly trust the local checkout could
   commit unencrypted secrets.
3. **`.gitattributes` footguns.** Pattern-matching mistakes
   (e.g. `secrets/*` missing sub-directories, or `*.yaml`
   over-matching) silently leave files unencrypted. No
   tooling to warn; the only signal is staring at
   `git diff`.
4. **Non-compressible storage.** Encrypted files are stored
   as full versions at every commit (git's delta compression
   requires readable content); repo size grows linearly with
   (file size × change count). Not a problem at the
   secret-file scale typical of this use case, but bounds
   how much you can protect this way.
5. **Cannot `cat secret` without unlock state.** All team
   automation that touches a secret requires the repo to be
   unlocked (`git-crypt unlock`). Forgotten-unlock
   incidents are a recurring ops hazard in the community
   threads.

## 4. Zeta-specific scorecard (for the ADR)

Axes per the BACKLOG row. Scoring: **good** / *mixed* /
**bad**. Scores are draft; the ADR finalises.

| Axis | git-crypt | Why |
|---|---|---|
| Gitops-first | **good** | Pure-git primitive, no external runtime, every op visible in history. |
| Retraction-friendly | **bad** | Authors explicit: no revocation. Core Zeta-values mismatch. |
| Merge-conflict behaviour | *mixed* | Encrypted files can conflict; resolution requires unlock + manual edit. Fine at ≤5-10 contributors, friction grows. |
| Code review visibility | **bad** | Binary diffs. Reviewer cannot tell a key rotation from a key theft. |
| Metadata protection | **bad** | Filenames + commit messages + `.gitattributes` layout all leak. |
| Team-scale ceiling | *mixed* | Works for small teams; "past 5-10 people and the limitations become problematic" per community consensus. |
| PQC readiness | **bad** | AES + GPG (OpenPGP). Post-quantum migration requires OpenPGP PQC WG finalisation (years). |
| Rotation of signing keys | N/A | Out of scope — signing keys ≠ secrets at rest. |
| HSM integration | **bad** | No HSM story; keys live on disk. |
| Implementation effort | **good** | Hours, not days. `brew install git-crypt` + `.gitattributes` + one-time init. |

## 5. What git-crypt is still good for

- **Single-contributor repos** where revocation is moot
  because there's nobody to revoke.
- **Short-lived ephemeral keys** that rotate by
  repo-scrap-and-rebuild rather than by in-place revocation
  — e.g. a test-only NuGet API key in a throwaway dev
  profile (which is exactly the pilot use case the BACKLOG
  row names).
- **Config files where leakage of existence is acceptable**
  but content must be hidden (e.g. an obviously-named
  `deploy-secrets.yaml` whose existence is public, whose
  content is not).

The pilot the BACKLOG row proposes (test-only NuGet API
key in a throwaway dev profile) fits the first and second
conditions. If the ADR concludes "git-crypt is fine for the
pilot", that does **not** generalise to the production
posture — which should be re-evaluated against SOPS + KMS
and `age` before broader rollout.

## 6. What git-crypt is explicitly wrong for (Zeta alignment)

- **Any secret whose leak needs to be retractable.** Value
  #4 in `CONFLICT-RESOLUTION.md` is retraction-native; a
  primitive that cannot retract access is a values-level
  mismatch.
- **Any secret whose rotation cadence is shorter than the
  repo's life.** Every rotation is an O(history) force-push
  incident.
- **Any secret that needs PQC posture before 2028-ish.**
  GPG OpenPGP PQC work is slower than age's draft or
  SOPS-on-KMS where the KMS already supports PQC hybrids
  in preview.
- **Any secret whose leak must survive a compromised
  contributor laptop.** Disk-resident GPG private keys
  make contributor-laptop compromise equivalent to full
  secret disclosure.

## 7. Comparison to the other candidates on the BACKLOG row

Scoring placeholder — expand in the ADR. All three
alternatives score **good** on retraction-friendliness where
git-crypt scores **bad**.

| Candidate | Retraction | Code review | PQC path | Team-scale | GitOps |
|---|---|---|---|---|---|
| git-crypt | **bad** | **bad** (binary diff) | bad | mixed | good |
| git-secret (GPG wrapper) | **bad** | bad | bad | mixed | good |
| SOPS (KMS / Vault / age) | good | **good** (plaintext keys / encrypted values; YAML diffs readable) | good (KMS-dependent; age hybrid draft) | good | good |
| age (modern file encryption) | good (by rotation of recipient identities) | mixed (binary-like, but format simpler, tooling improving) | **good** (draft X25519-PQ) | good (small-team) / mixed (cloud-KMS story thinner than SOPS) | good |

## 8. Cross-references

- `docs/BACKLOG.md` — P2 *Gitops-friendly key management +
  rotation* (lines ~4133-4171).
- `docs/BACKLOG.md` — P2 *Adopt at least one
  NIST-standardised post-quantum primitive* (sibling; affects
  which candidates remain viable long-term).
- `docs/research/ci-retractability-inventory.md` — names
  SLSA signing keys as the one genuinely-non-retractable
  surface; separate decision from secrets-at-rest.
- `docs/security/CRYPTO.md` — crypto primitive inventory,
  hash-based signatures mention.
- `memory/user_security_credentials.md` — nation-state
  threat-model anchor.

## 9. Review panel (per the BACKLOG row, for the ADR)

- **Mateo** (security-researcher) — primary on primitive
  selection + PQC path.
- **Nazar** (security-operations-engineer) — primary on
  rotation cadence + HSM integration.
- **Aminata** (threat-model-critic) — gate on the
  nation-state adversary model.
- **Architect (Kenji)** — integrates + signs the ADR.

## 10. Open questions for the ADR

1. Is the pilot use case (test-only NuGet API key in a
   throwaway dev profile) durable enough that we would
   accept git-crypt's no-revocation property, or does even
   the pilot deserve a retraction-friendly primitive from
   day one?
2. Is the **code-review opacity** of git-crypt a showstopper
   on its own? SOPS's plaintext-keys-encrypted-values format
   preserves review-grade diffs; that alone may be decisive
   regardless of the other axes.
3. Do we need a **hybrid posture**: one primitive for
   long-lived secrets (SOPS + KMS for rotation) and a
   second for ephemeral-dev-convenience (git-crypt for
   solo-dev laptop-only artefacts)? The ADR should state
   explicitly whether "one tool wins" or "tools split by
   use case".

## Sources

- [git-crypt README — github.com/AGWA/git-crypt](https://github.com/AGWA/git-crypt)
- [Opensource.com — 4 secrets management tools for Git encryption](https://opensource.com/article/19/2/secrets-management-tools-git)
- [Medium / Brian Davis — Securely storing secrets in Git](https://medium.com/@slimm609/securely-storing-secrets-in-git-542771d3ed8c)
- [NixOS Discourse — git-crypt / agenix / sops-nix](https://discourse.nixos.org/t/handling-secrets-in-nixos-an-overview-git-crypt-agenix-sops-nix-and-when-to-use-them/35462)
- [KX Cloudingenium — Mozilla SOPS for GitOps](https://kx.cloudingenium.com/en/sops-secrets-encryption-version-control-gitops-guide/)
- [GitGuardian — Comprehensive guide to SOPS](https://blog.gitguardian.com/a-comprehensive-guide-to-sops/)
- [Infisical — Open-source secrets management 2026](https://infisical.com/blog/open-source-secrets-management-devops)
- [GitGuardian — Secret scanning tools 2026](https://blog.gitguardian.com/secret-scanning-tools/)
- [The Dave Stack — Secrets in Git](https://en.thedavestack.com/git-crypt/)
