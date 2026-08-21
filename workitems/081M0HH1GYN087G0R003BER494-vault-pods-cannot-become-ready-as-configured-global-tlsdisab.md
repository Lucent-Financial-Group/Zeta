---
id: 081M0HH1GYN087G0R003BER494
type: bug
state: backlog
priority: P2
slug: vault-pods-cannot-become-ready-as-configured-global-tlsdisab
title: "Vault pods cannot become Ready as configured: global.tlsDisable=false sets VAULT_ADDR to https while the un-overridden vault-helm listener default is tls_disable=1, and no Certificate for Vault exists in the tree"
created: 2026-08-21T06:44:56.405Z
depends_on: []
composes_with: [081M0HH1H05087G0R00213P1JV]
---

# Vault pods cannot become Ready as configured: global.tlsDisable=false sets VAULT_ADDR to https while the un-overridden vault-helm listener default is tls_disable=1, and no Certificate for Vault exists in the tree

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0HH1GYN087G0R003BER494-*.md` glob. -->

## What was measured (2026-08-21, static — no cluster was contacted)

The chain, every link cited:

1. `full-ai-cluster/k8s/applications/vault/Application.yaml` sets
   `global.tlsDisable: false` and does **not** override `server.ha.raft.config`.
   `full-ai-cluster/k8s/bootstrap/vault-install.yaml` sets the same flag and does not
   override `server.standalone.config`.
2. vault-helm `v0.29.1` `templates/_helpers.tpl` — `vault.scheme` is
   `{{- if .Values.global.tlsDisable -}}http{{- else -}}https{{- end -}}`. So
   `tlsDisable: false` ⇒ scheme `https`.
3. vault-helm `v0.29.1` `templates/server-statefulset.yaml` — `VAULT_ADDR` is
   `"{{ include "vault.scheme" . }}://127.0.0.1:8200"`, i.e. **https**.
4. vault-helm `v0.29.1` `values.yaml` — `server.readinessProbe.enabled: true` with `path`
   left commented out, so the statefulset takes the **exec** branch:
   `["/bin/sh","-ec","vault status -tls-skip-verify"]`. That reads `VAULT_ADDR`.
5. vault-helm `v0.29.1` `values.yaml` — the default `server.standalone.config` and
   `server.ha.raft.config` both contain `listener "tcp" { tls_disable = 1 ... }`. Neither
   is overridden here, so the **listener is plaintext**.

⇒ an https client against a plaintext listener, on the readiness path. `-tls-skip-verify`
does not help: it skips certificate *verification*, not the TLS handshake.

**Second, independent reason the same probe fails:** the seal. See
`081M0HH1H05087G0R00213P1JV` — `vault status` exits non-zero on a sealed Vault, and this
deployment runs the Shamir seal with no unsealer. Fixing the scheme alone does not produce
a Ready pod. Two causes, one symptom; do not let one fix read as both.

**And there is nothing to serve a cert with anyway.** Three comments in the tree asserted
"Vault TLS certs come from cert-manager". No cert-manager `Certificate` for Vault has ever
existed under `full-ai-cluster/k8s`, and the only issuers present are the two Let's Encrypt
ACME `ClusterIssuer`s in `applications/platform/clusterissuer.yaml`, whose
HTTP-01-over-Gateway solver cannot issue for `vault-internal.vault.svc`. Those three
comments were corrected rather than fixed, and
`full-ai-cluster/tools/k8s-manifests.test.ts` §"vault TLS" now goes red if a Certificate
for Vault appears — which is the signal to correct them back.

## Why this was NOT fixed in place

Both one-line fixes are posture decisions that belong to the maintainer, not to the agent
that found the mismatch:

- `tlsDisable: true` — plaintext Vault API inside the cluster. Cilium is configured with
  WireGuard `nodeEncryption: true` (`k8s/bootstrap/cilium-install.yaml:65-68`), which
  covers node-to-node but not same-node pod-to-pod.
- issue Vault a cert — needs a self-signed/CA `Issuer` + a `Certificate` for the internal
  SANs **and** a `server.*.config` override carrying `tls_cert_file`/`tls_key_file`. That
  override is also the exact place a `seal` stanza would land, so it should be designed
  once, with the seal question, not twice.

## UNVERIFIED

Everything above is read off the chart source and this repo's YAML. **No cluster was
contacted and no Vault pod was observed failing.** The prediction is falsifiable in one
command on a live cluster: `kubectl -n vault logs vault-0` plus
`kubectl -n vault get pod vault-0 -o jsonpath='{.status.conditions}'`.
