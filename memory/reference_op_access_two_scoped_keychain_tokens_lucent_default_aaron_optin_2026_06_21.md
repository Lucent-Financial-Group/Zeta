---
name: op-access-two-scoped-keychain-tokens-lucent-default-aaron-optin
description: "How Otto reaches 1Password (op): two scoped service-account tokens in the macOS Keychain — zeta-op-service-account (Lucent vault, auto-exported as OP_SERVICE_ACCOUNT_TOKEN) + zeta-op-aaron (Personal vault, opt-in via secret-clip get). Separation verified 2026-06-21."
metadata: 
  node_type: memory
  type: reference
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Operational layout for `op` (1Password CLI) access on acehacks-mac-studio (set up 2026-06-21):

- **`op` binary**: via mise (`1password-cli` pinned in `.mise.toml`), cross-OS.
- **THREE scoped service-account tokens, each ENCRYPTED in the macOS login Keychain** (stored via
  `tools/setup/secret-clip.sh`, never echoed):
  - **`zeta-op-service-account`** → the **Lucent** vault (shared/work). **Auto-exported** as
    `OP_SERVICE_ACCOUNT_TOKEN` in every shell via `~/.config/zeta/secrets-env.sh` (sourced by
    the managed `shellenv.sh` → profile). So plain `op …` hits Lucent by default. Read/write.
  - **`zeta-op-aaron`** → the **Personal** vault (Aaron's private keys: GPG/SSH/derivation seed).
    **NOT auto-exported** — opt-in per command:
    `OP_SERVICE_ACCOUNT_TOKEN="$(bash tools/setup/secret-clip.sh get zeta-op-aaron)" op …`. R/W.
  - **`zeta-op-ca`** → the **CA** vault (the **trust root**: `zeta-ca-private (ssh_ca_ed25519)`,
    moved here from Lucent 2026-06-21). **NOT auto-exported** — opt-in (same pattern as aaron).
    **Full-trust-bootstrap posture (Aaron's call):** the agent currently HOLDS the CA-vault token
    = it can read the trust root. End-state (workitem 081KVNTNTDQ0) removes this — CA vault →
    human-only, agent gets no token (the agent signs via the LOCAL CA file, never needs the vault).
- **Separation verified**: each token lists ONLY its own vault (aaron→Personal, lucent→Lucent,
  ca→CA); none sees the others. Independently revocable (delete a service account = that access
  gone). Vault map: **CA** = trust root (CA private) · **Lucent** = shared/work · **Personal** =
  Aaron's identity keys. Machine keys: never in 1Password.
- **Active + Standby per vault (rotation-ready, 2026-06-21).** Each vault has TWO service accounts
  for overlap-window dual-key rotation: Active + Standby (the alt). All six audited 2026-06-21 =
  single-vault-scoped + read/write:
  - Lucent: `zeta-op-service-account` (Active, auto-export) + `zeta-op-lucent-standby` (Standby).
  - Personal: `zeta-op-aaron` (Active) + `zeta-op-personal-standby` (Standby).
  - CA: `zeta-op-ca` (Active) + `zeta-op-ca-standby` (Standby).
  Rotate = Standby→Active, old→retired after overlap (KeyState). **2 per vault is correct; a 3rd
  hot key is overkill** — the only legit extra is a CA-only **cold/offline human-only** disaster-
  recovery key (paper/HSM, NOT an agent token, NOT in the hot vault).

**Usage:** default `op` = Lucent. For Personal-vault items, prefix with the opt-in fetch above.
Retrieve any stored secret generically: `bash tools/setup/secret-clip.sh get <name>`.

**Custody posture (2026-06-21):** full-trust bootstrap — the agent currently holds BOTH tokens
(Aaron's call). The end-state ([[feedback_config_secrets_topology_emerges_from_events_zset_dbsp_no_static_maps_revoke_is_retract_aaron_2026_06_21]]
sibling; design in workitem 081KVNTNTDQ08QG0R0017NBBWB) removes the trust-root + the human's seed
from any agent-readable vault (agent → lucent only; Personal human-only). Tokens are temporary/
regenerable. Migration target: Vault + cert-manager + the 1Password SSH agent (sign-without-exposing).
Blueprint: `.claude/skills/security/blueprints/op-service-account-token-provisioning.md`.
