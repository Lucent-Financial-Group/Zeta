# Host credentials as Kubernetes Secrets

**For Aaron · 2026-09-04 · author: Riven · register: measured except where marked**

Ask: credentials entered on the host (GitHub, other AI logins) should
persist on USB **and** be available as Kubernetes Secrets so future
agent pods pick up what the machine already has.

This is **not** Otto helm-chart currency. External Secrets and Vault
stay the later hop.

## What already ships

USB persist/restore writes host files from `/boot/zeta-creds.enc`:

- `zeta-creds-restore.service` decrypts onto
  `/home/zeta/.config/{gh,claude,gemini,codex}`
- Manifest: `src/Core.TypeScript/installer/zeta-creds-manifest.ts`
- Proven in QEMU: `zeta-creds-restore: wrote 1 creds`

That path stops at the filesystem. Nothing created a Secret.

## What this slice adds

Control-plane oneshot `zeta-creds-to-k8s.service`:

1. After `zeta-creds-restore.service` and `k3s.service`
2. Reads allowlisted restored files
3. `k3s kubectl apply` of Namespace + ServiceAccount + Role +
   RoleBinding + Opaque Secrets into `zeta-host-creds`
4. Missing blob / bun / kubeconfig is a named skip (exit 0)
5. API-not-ready exits 1 so systemd retries
6. A projector miss does **not** take k3s down (`requiredBy` is
   absent on purpose)

Allowlisted: `gh-cli`, `claude`, `gemini`, `codex`.

Host-only (never a Secret): wifi, ssh-host-keys, ssh-operator-pubkey,
install-answers. Personal 1Password stays personal.

## Why not Helm / ESO / Vault first

- ESO is installed; its ClusterSecretStore against Vault is still
  commented. Vault may be sealed at first boot.
- Sealed Secrets would put ciphertext in git. The USB blob is the
  source of truth; git must not gain these values.
- A new chart would collide with Otto's chart-currency work and
  would not run before Vault is healthy.

Host files → kubectl apply is the first hop. Vault ingest can be a
follow-up once unseal is routine.

## Agent pod contract

Secrets live in namespace `zeta-host-creds`. ServiceAccount
`zeta-agent` can `get/list/watch` them. Kubernetes will not mount a
Secret from another namespace; pods elsewhere need a copy or a later
ExternalSecret.

Logs print names and byte counts, never values.

Reads of restored files are one syscall: `readFileSync`, then classify
the errno (`ENOENT` missing, `EISDIR` directory, else unreadable).
`existsSync` / `lstatSync` before the read is a check-then-use race
(CWE-367) and is refused by `lint-check-then-use-file-races`.

## Tests

- `src/Core.TypeScript/installer/zeta-creds-to-k8s.test.ts`
- `src/Core.TypeScript/cluster/zeta-creds-to-k8s-nix.test.ts`
- `full-ai-cluster/nixos/tests/zeta-creds-to-k8s-eval-test.nix`

Workitem: `081M1PWSF56087G0R000FDS3NY`.
