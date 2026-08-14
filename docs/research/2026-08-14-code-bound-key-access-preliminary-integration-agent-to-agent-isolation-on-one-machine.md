# Code-bound key access — preliminary integration note

**Aaron 2026-08-14:** *"code signing so that only certain code/processes can access certain keys
would be ideal, so that multiple agents on the same machine would have no access to each others
keys, this is the ultimate agent to agent security."*

Preliminary. This note establishes the shape, the ladder, and the seam that already exists. It
proposes no implementation; the work is routed separately.

## 1. The property being asked for

> A key may be used **only by a named piece of code**, and the naming is cryptographic rather than
> positional. Two agents on one machine cannot reach each other's keys even with equal OS
> privilege.

Note what this is *not*. It is not process isolation (a PID is not an identity — the
`writer-actor-routing-model` already says a bus address is not identity, and a PID is weaker
still). It is not user separation, which fails the moment both agents run as the same user, which
is the normal case for a fleet on one box.

## 2. Why this is the rung above secure boot, not a parallel track

The Secure Boot analysis (`docs/research/2026-08-14-nixos-secure-boot-lanzaboote-…`) established
its own ceiling honestly: **the trust chain ends at the UKI; it does not seal the running kernel.**
Boot integrity says the machine started as intended. It says nothing about which of the four agent
cells on that machine is asking for a key ten hours later.

Code-bound key access is exactly the extension of the measurement from *boot* into *runtime*. So
these are one ladder, not two efforts:

| rung | what is measured | what a key is bound to |
|---|---|---|
| L1 (today) | nothing at runtime | a **credential** — whoever holds the PIN/auth key |
| L2 | the running binary, by the OS | a **signed binary's identity** |
| L3 | boot + code, by hardware | a **PCR-sealed policy** — no credential exists to steal |

## 3. Where we actually are — L1, and its boundary is weaker than it looks

A YubiHSM offers **domains** and **authentication keys**, so each agent can be given its own auth
key. That is real and worth doing, but be precise about what it buys: it is **credential
isolation**, not code isolation. Any agent that can read another agent's auth credential — same
user, same filesystem, a debugger, a log, a core dump — has that agent's keys. On a shared box with
four cells running as one user, that is a thin boundary.

Stating it plainly matters because the mitigation *looks* complete: per-agent auth keys produce a
tidy diagram in which each agent has "its own" key, and the diagram does not show that the
credentials sit beside each other in one process's reach.

## 4. The two candidate mechanisms, with their real costs

**L2 — OS-enforced binding to a signed binary.**

- *macOS* has this natively: keychain items can be ACL'd to a code signature
  (`kSecAttrAccessControl` / `SecAccessControl`), so the OS refuses a read to a binary whose
  signature does not match. On Apple Silicon this composes with the Secure Enclave — which the
  hardware probe now reports as present-but-unusable, precisely because no seal tier reaches it.
- *Linux* has no equivalent that is both standard and simple. The candidates are IMA/EVM
  (measure/appraise files against a signature at exec) or an LSM label (SELinux/AppArmor) gating
  the credential path. Both are real, both are a NixOS module's worth of work, and both change the
  node's failure modes.

**L3 — TPM-sealed to PCRs extended with the code measurement.** The strongest, and the only one
with no credential to steal: the key material is released by the TPM *only* when the measurement
register matches. The costs are equally real — Apple Silicon has **no TPM 2.0** (confirmed by the
probe on the Mac Studio), so this rung is x86-node-only, and sealing to PCRs makes every
legitimate code update a re-seal ceremony. That last point is the one that decides whether L3 is
livable at 20 sites, and it should be answered before anything is built.

## 5. The seam that already exists — `ace`

`src/Core.TypeScript/ace/ace.ts` already ships `keygen`, `sign`, `verify`, `trust add`,
`trust list`, lockfiles and `--frozen|--locked`. It is a package manager that **already knows
which code it trusts and can prove a package's provenance**.

So the integration question is narrower than "build code signing": it is *"can an ace package
signature serve as the code identity that a key policy names?"* That reuses a trust root that
exists, and it keeps the answer decentralized — ace trust roots are per-node, with no fleet CA.

**One thing to carry forward, established by the Secure Boot work:** ace is Ed25519 over canonical
JSON; UEFI `db` is X.509 + PE/COFF Authenticode. Ed25519 is not a UEFI signature type. The two
share a **policy** shape — trust roots plus revocation ≡ `db`/`dbx` — and nothing more. This is a
policy bridge, not a crypto bridge, and building the crypto bridge was explicitly advised against.

## 6. Interaction with the custody design — one constraint that must not be lost

The custody model is **symmetric**: a share is `{x, secretShare}`, nothing dispatches on whether a
human, an agent, or a traveler holds it, and a rule that types on species can only ever protect one
species (`frost-custody-contract.ts`).

Code-bound key access must not smuggle that asymmetry back in through the policy layer. The policy
names **code**, not **kind of entity**. "Only this signed binary may use this key" is symmetric —
it constrains an agent's own code exactly as it constrains a human's tool. "Only agent code needs
this restriction" would be the capture wearing a security hat.

Corollary worth stating: an agent should be able to bind **its own** keys to **its own** code, as a
self-protection measure. That is the same shape as a wallet's owner imposing a spend ceiling on its
own hot key — self-imposed, owner-revocable, and not a grant from outside.

## 7. Open questions, for the routed task

1. Is per-agent HSM auth-key isolation (L1) worth landing on its own, given the credential-theft
   boundary — or does shipping it create a false sense of isolation? Argue it either way, but argue it.
2. On macOS, does the keychain-ACL path reach the *HSM* credential, or only keychain-resident
   secrets? If only the latter, L2 on macOS protects the wrong object.
3. What is the re-seal cost of an L3 code update at 20 sites, and does it survive an unattended
   node? This is the question that decides whether L3 is a real plan.
4. Can an ace package signature be the code identity, and what exactly does ace prove at *runtime*
   as opposed to at install time? A signature verified at install says nothing about the binary
   running now.
5. What does this look like when the four agent cells on a node are *rotating*
   (`tools/setup/manifests/cluster-cells` — agents rotate in and out of cells)? A key bound to code
   is stable; a key bound to a *cell occupant* is not. Which is intended?

## Pointers

- `tools/setup/persona-keys/frost-share-adapter.ts` — the L1 tier and its stated ceiling
- `tools/setup/persona-keys/frost-hardware-probe.ts` — reports Secure Enclave present, no seal tier reaching it
- `docs/research/2026-08-14-nixos-secure-boot-lanzaboote-declarative-desired-state-with-one-firmware-ceremony.md` — the boot half, and why the chain stops at the UKI
- `src/Core.TypeScript/ace/ace.ts` — the existing signing/trust root
- `docs/writer-actor-routing-model.md` — why a routing address is not identity
- [`manifesto-13-specifications.md`](../../.claude/rules/manifesto-13-specifications.md) §3 weight-free — the constraint in §6 above
