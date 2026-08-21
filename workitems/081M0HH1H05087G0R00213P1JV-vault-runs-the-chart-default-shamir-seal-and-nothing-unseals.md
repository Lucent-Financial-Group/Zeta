---
id: 081M0HH1H05087G0R00213P1JV
type: task
state: backlog
priority: P2
slug: vault-runs-the-chart-default-shamir-seal-and-nothing-unseals
title: "Vault runs the chart-default Shamir seal and nothing unseals it; TPM/HSM auto-unseal (seal pkcs11) is Vault Enterprise-only, so decide between seal transit, an unseal operator, or accepting a human at every pod restart"
created: 2026-08-21T06:44:56.453Z
depends_on: []
composes_with: [081M0HH1GYN087G0R003BER494]
---

# Vault runs the chart-default Shamir seal and nothing unseals it; TPM/HSM auto-unseal (seal pkcs11) is Vault Enterprise-only, so decide between seal transit, an unseal operator, or accepting a human at every pod restart

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0HH1H05087G0R00213P1JV-*.md` glob. -->

## The finding (2026-08-21, static — no cluster was contacted)

**Current seal: Shamir, by chart default, in both Vault deployments.**

- `full-ai-cluster/k8s/applications/vault/Application.yaml` (ArgoCD, `sync-wave: -60`) —
  no `seal` stanza, and no `server.ha.raft.config` override.
- `full-ai-cluster/k8s/bootstrap/vault-install.yaml` (k3s `HelmChart` CR) — no `seal`
  stanza, and no `server.standalone.config` override.
- vault-helm `v0.29.1` `values.yaml` — the default `server.standalone.config` and
  `server.ha.raft.config` carry no `seal` stanza either; the only one present is a
  **commented-out** `seal "gcpckms"` example.

No seal stanza anywhere ⇒ Vault's built-in default ⇒ **Shamir**. Operationally: every
`vault-N` pod that starts is sealed and stays sealed until a human runs
`vault operator unseal` with key shares that live outside this repo. **No manifest, Job,
or script in this repo performs an unseal.** A first boot does not produce a usable Vault
unattended, and neither does any pod restart.

Pinned by `full-ai-cluster/tools/k8s-manifests.test.ts` §"vault seal", which asserts the
absence of both a `seal` stanza and a `config: |` override across the manifests found by
the walk, each preceded by a positive proving its detector can fire. It goes red the day a
seal lands — which is the signal that the prose in both manifests must be rewritten.

## Why the TPM/HSM seam is empty, and why filling it would be worse than leaving it

`seal "pkcs11"` is the hardware-rooted auto-unseal, and it is **Vault Enterprise only**:

> "Auto-unseal and seal wrapping for PKCS11 require Vault Enterprise."
> — `developer.hashicorp.com/vault/docs/configuration/seal/pkcs11`

The same gate covers **Managed Keys**, the feature that would keep a PKI CA key inside an
HSM: *"Appropriate Vault Enterprise license or HCP Vault Dedicated cluster required"*
(`developer.hashicorp.com/vault/docs/enterprise/managed-keys`). So a `seal "pkcs11"` block
written into these values would not give us a TPM-backed Vault — it would give us a Vault
that refuses to start. The absence is a licensing floor, not an oversight, and the seam
is marked in both manifests rather than filled.

## The options, stated honestly

| option | reachable in CE? | what it actually buys |
|---|---|---|
| Shamir (today) | yes | a human at every pod restart; key shares outside the cluster |
| `seal "transit"` | **yes** | auto-unseal — against a *second Vault*. Relocates the root of trust; does not hardware-root it. The second Vault's own seal becomes the question. |
| `seal "pkcs11"` (TPM/HSM) | **no — Enterprise** | the thing actually wanted |
| a k8s unseal operator holding shares in a Secret | yes | availability bought by putting the unseal key in the thing the seal protects |

Vault is expected to be replaced, so an Enterprise licence is not the answer; the real
choice is between accepting manual unseal and taking `transit` with its trust relocation
named out loud.

## What the repo already has, and what does NOT connect to it

The hardware-seal work here is real but lives at the **persona-key** layer, not the cluster
layer, and nothing joins them:

- `tools/setup/persona-keys/frost-share-adapter.ts` — `FrostSealTier` with
  `hardware-pkcs11` / `hardware-tpm2` tiers, fail-closed when the hardware is absent.
- `tools/setup/persona-keys/tpm2-linux-probe.ts` — five-state TPM 2.0 probe; `absent` has
  exactly one producer and a failed look is never counted as a negative.
- `src/Core.TypeScript/federated-identity/hsm-domain-map.ts` — SPIFFE-ID → YubiHSM 2
  domain authorization, decision enforced / separation not.

Per the standing constraint: a TPM 2.0 can be assumed on the Linux cluster nodes; an HSM
is **optional and must never be required** for tests or for a working cluster. Nothing in
this item changes that — the tests added alongside it read YAML only and need no hardware.

## UNVERIFIED

No cluster was contacted; no Vault was observed sealed. The claim is derived from this
repo's YAML plus vault-helm v0.29.1's own `values.yaml`, and is falsifiable with
`kubectl -n vault exec vault-0 -- vault status` on a live cluster.
