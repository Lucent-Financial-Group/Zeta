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
> three live keys is the hub-less ask. Lucent 1Password is a share store
> for a human-gated unseal, not an agent-held token in the ISO.

## Pickup order (mint children; do not allocate `B-*`)

1. Inventory lock test (presence counts, never private material).
2. ADR addendum: dual as minimum, three live slots as default, previous-honor bound.
3. Unseal ceremony runbook (human + biometric; Lucent 1Password as share store).
4. Fill missing persona trees (riven / vera / lior) and Aaron cluster-nodes after the 3-key default exists.
5. Vault ingest / ESO after host→Secret (#16587) and after unseal is real.

## Do not

- Helm-fight Otto on Vault / chart currency.
- Put Lucent or Personal tokens in git or the ISO.
- Flash USB from this item.
