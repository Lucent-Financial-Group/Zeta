---
id: 081M1PYZRE5087G0R000HHG5HV
type: task
state: backlog
priority: P1
slug: production-harden-ca-unseal-1password-and-3-key-rotation
title: "Production-harden CA, unseal, 1Password, and 3-key rotation"
created: 2026-09-04T19:40:32.581Z
depends_on: []
composes_with: ["081KVNXBR4S08QG0R0015DHBBN", "081M1PWSF56087G0R000FDS3NY"]
---

# Production-harden CA, unseal, 1Password, and 3-key rotation

Review findings (not an implementation PR):
[`docs/design/2026-09-04-credential-substrate-production-hardening-review.md`](../docs/design/2026-09-04-credential-substrate-production-hardening-review.md).

## Carved sentence

> Git holds one pubkey per type per identity, a files-on-disk CA, and a
> Vault that comes up sealed on purpose. Dual-key is the landed treaty;
> three live keys is the hub-less ask. Init stays gated. Post-init unseal
> is a Google-shaped extraContainer that fetches Shamir shares from
> Lucent at unseal time — not ESO-into-etcd, not threshold 1. The
> injector chicken-egg breaks when the long-lived `ops_…` is a Lucent
> **item** (2–3 slots) and metal first-boot login fetches it;
> USB / k8s are caches. Do not persist `OP_SESSION`. μένω names
> the split: init remains gated; the unsealer acts.

## Pickup order (mint children; do not allocate `B-*`)

1. Fetch Lucent item → project current slot (metal `tty1` login, then Lucent). Mint 2–3 SA items in Lucent first. USB/Keychain are caches. Cursor Secret is Cloud-Agent cache only. Human-blocked on this VM.
2. TypeScript unsealer decision loop (no Helm): `src/Core.TypeScript/cluster/vault-unsealer.ts`. HTTP 200/503/501/000. Fetch shares this tick. Threshold-many distinct keys. Cannot init. Named in [`MENO.md`](../docs/trajectories/cluster-encryption-credential-substrate/MENO.md).
3. Unsealer extraContainer (close to Google, rewritten): `valuesObject` only; fetch-at-unseal from Lucent; threshold-many keys; cannot init; amend `TOPOLOGY.md` §5 in the **same commit as the sidecar**. Not ESO-into-etcd for shares. Not HA joiners until three-node.
4. Lease sidecar + portal expiry panel + in-cluster Consent relogin (SSH is break-glass). Warn before 401. Applies to `gh-cli` / AI logins too.
5. Inventory lock test (presence counts, never private material).
6. ADR addendum: dual as minimum, three live slots as default, previous-honor bound.
7. Fill missing persona trees (riven / vera / lior) and Aaron cluster-nodes after the 3-key default exists.
8. Vault ingest / ESO for **app** secrets after the unsealer is real. Still not the Shamir-share copy path.

## Do not

- Helm-fight Otto on Vault / chart currency.
- Put Lucent or Personal tokens in git or the ISO.
- Persist `op signin` / `OP_SESSION` (30-minute inactivity).
- Treat Keychain / USB as the original. The Lucent item is.
- Flip `1password-personal` to projectable.
- Flash USB from this item.
- Implement persist / injector / portal panel / Vault extraContainers in this findings PR.
- Copy Shamir unseal shares into a Kubernetes Secret / etcd via ESO.
- Rekey Vault to a threshold of 1.
