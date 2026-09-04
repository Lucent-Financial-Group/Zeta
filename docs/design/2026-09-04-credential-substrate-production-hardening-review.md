# Credential substrate production-hardening review

**For Aaron · 2026-09-04 · author: Riven · register: measured except
where marked**

Workitem: `081M1PYZRE5087G0R000HHG5HV`. Trajectory:
`docs/trajectories/cluster-encryption-credential-substrate/RESUME.md`.

Ask (this session): production-harden the CA; name the unseal
startup; use Lucent 1Password (maybe for unseal); inventory
checked-in pubkeys for agents and humans; verify GPG / SSH / wallets;
keep **3 keys per agent/human** so one can rotate and invalidate the
others; fold rolling into Z-sets and 0-downtime schema evolution;
treat 1Password AI materials as current (training data is stale).

This PR is **findings**. It does not mint CA material, unseal Vault,
flash USB, or install a 1Password injector.

**Method.** Filename and mtime inventory only. No private key was
read, printed, copied, or decrypted. `op` and Keychain were not
touched. 1Password pages were fetched on 2026-09-04.

Sibling: host files → Kubernetes Secrets landed as PR
[#16587](https://github.com/Lucent-Financial-Group/Zeta/pull/16587)
(`081M1PWSF56087G0R000FDS3NY`). That is the first hop so agent pods
do not wait on an unsealed Vault. This review does not block it.

## Verdict

The factory has a dual-key **treaty**, a one-seed HD **oracle**, two
1Password vaults in the 2026-06-21 write-up, and a Vault chart that
comes up sealed on purpose. What git actually holds is **one public
key per type per identity that has a tree**, a CA pubkey on disk, one
machine cert, and an unseal ceremony no agent is allowed to run.

Three live keys per agent/human is the right shape for a hub-less
fleet. It is named in research. It is **not** an inventory fact.

## Ranked findings

### P0 — ceremony and count

1. **Checked-in material is 1, not 3.** Every
   `maintainers/**/ssh-pubkeys.txt` is one `ssh-ed25519` line. Every
   `gpg-pubkey.asc` is one file. Every `keyring-public.json` holds
   one SSH fingerprint, one PGP id, one Nostr npub, one ETH, one BTC,
   one Solana. Dual-key (active + ≥1 standby) is the landed decision
   (`docs/DECISIONS/2026-06-15-zero-downtime-id-rotation-pattern-overlap-window-dual-key.md`,
   `tools/setup/persona-keys/keyset.ts`). Extra standby is already
   allowed (`makeKeyringSet(...moreStandby)`), so 1 active + 2
   standby is three live slots in the oracle. Git does not show
   that set for anyone.

2. **Vault unseal is a gated class and has never been run by an
   agent.** `full-ai-cluster/k8s/applications/vault/Application.yaml`
   says Vault comes up sealed until `vault operator init` +
   `vault operator unseal`, and those commands require fresh human
   authorization plus the biometric gate. Until that ceremony, the
   readiness probe exiting 2 is the correct state. Using Lucent
   1Password as the unseal store is a **design fork**, not a missing
   flag: either the human still unlocks (agent never holds unseal
   shares) or the gated-class rule changes. Do not smuggle the
   second into a chart bump.

3. **1Password-as-unseal has a chicken-egg, and it is the same
   shape as GitHub CLI.** The official Kubernetes Secrets Injector
   still needs an `OP_SERVICE_ACCOUNT_TOKEN` Kubernetes Secret
   created first
   (`kubectl create secret generic op-service-account
   --from-literal=token=…`). The Lucent token lives in Keychain
   today (trajectory RESUME 2026-06-21), not in git, not in the ISO.
   That is **not** a reason to invent a second store. GitHub already
   breaks this class of chicken-egg: `gh auth login` → USB blob →
   projector → `zeta-host-cred-gh-cli` (PR
   [#16587](https://github.com/Lucent-Financial-Group/Zeta/pull/16587)).
   Lucent 1Password can take the same hop **if** what we persist is
   a service-account token (`ops_…`), not an `op signin` session.
   Design: [Bootstrap 1Password like GitHub](#bootstrap-1password-like-github).
   Do not put a Lucent token in git or the ISO.

### P1 — coverage holes

1. **Persona trees in git:** `otto`, `alexa`, `ani`, `amara`. Named
   loops **without** a `maintainers/personas/<name>/` tree: `riven`,
   `vera`, `lior`. Hats (Kenji, Kira, …) are not expected to have
   their own keyrings; loops that commit are.

2. **Humans.** `aaron`: GPG + SSH + keyring, **no**
   `cluster-nodes/` (2026-08-16 spot-check still holds).
   `Addisons820`: GPG + SSH + keyring + two cluster-nodes.
   `maximdolphin`: two cluster-nodes, **no** GPG / SSH / keyring
   files.

3. **Machines.** `machines/` holds
   `acehacks-mac-studio.local.pub` and
   `acehacks-mac-studio.local-cert.pub`. One machine. No USB-metal
   node keys. CA pubkey: `maintainers/zeta/ssh-ca.pub` (one file,
   not three).

4. **TPM-seal is off.** `zeta.tpm2Seal.mode` default `"off"`.
   `"provision"` is refused until seal-key custody is a maintainer
   decision (`full-ai-cluster/nixos/modules/tpm2-seal-model.nix`).
   Captures still show macOS `unavailable`. TPM-seal and
   1Password-unseal are alternative second hops, not both-now.

### P2 — 2026 1Password stack vs 2026-06-21 trajectory

1. The June write-up (Lucent + Personal, two service accounts each
   in Keychain, CA private + Aaron SSH/GPG backed up to 1Password)
   is still the last **operational** claim. 1Password shipped newer
   agent materials in 2026. Cite those before designing unseal:

   - [SDK + AI agents tutorial](https://www.1password.dev/sdks/ai-agent)
     (dedicated vault, service account with **Read Items** only,
     `secrets.resolve()` + `op://vault/item/field`). Official
     security notice: do not pass raw credentials to the model.
   - [Environments MCP for Codex](https://1password.com/blog/1password-trusted-access-layer-for-openai-codex)
     (2026-05-20): local MCP, **user must approve every access**,
     secrets injected into the child process, values never in the
     model context window.
   - [Credential Broker public preview](https://1password.com/blog/1password-credential-broker-public-preview):
     OIDC-bound, no standing vault token. Custom OIDC (Kubernetes
     service account, AI agent frameworks) is named as a beta
     direction, not a shipped cluster unseal.
   - [Privileged Access](https://1password.com/press/2026/july/privileged-access)
     (2026-07, Apono): just-in-time, zero standing privilege for
     humans **and** AI identities.
   - [Kubernetes Secrets Injector](https://developer.1password.com/docs/k8s/injector):
     mutating webhook; does **not** create a Kubernetes Secret
     (the Operator does). Pods need a `command` field. Token still
     has to get onto the cluster somehow.

   Standing Lucent service-account tokens in Keychain are the
   **old** shape. Broker / MCP / JIT is the direction 1Password is
   selling. Our Lucent-vs-Personal split still holds: Personal
   stays human-only; Lucent is the only vault an agent path may
   name.

## Inventory (presence / count, not values)

Checked 2026-09-04 against this checkout. `cluster-nodes` counts
are directories, not keys.

| Identity | SSH lines | GPG file | keyring-public (one leaf per type) | cluster-nodes | 3-key set |
|---|---|---|---|---|---|
| aaron | 1 | yes | yes | 0 | no |
| Addisons820 | 1 | yes | yes | 2 | no |
| maximdolphin | 0 | no | no | 2 | no |
| otto | 1 | yes | yes | — | no |
| alexa | 1 | yes | yes | — | no |
| ani | 1 | yes | yes | — | no |
| amara | 1 | yes | yes | — | no |
| riven | missing tree | missing | missing | — | no |
| vera | missing tree | missing | missing | — | no |
| lior | missing tree | missing | missing | — | no |
| zeta CA | `ssh-ca.pub` ×1 | — | — | — | no |
| machines | 1 host + 1 cert | — | — | — | no |

HD leaves the oracle **can** derive (`tools/setup/persona-keys/derive.ts`):
SSH (`m/44'/1110'`), PGP (`m/44'/1111'`), Nostr (`m/44'/1237'`),
ETH (`m/44'/60'`), BTC (`m/84'/0'`), Solana (`m/44'/501'`).
Reticulum is named in `vocab/keys/README.md` and is **not** in
`derive.ts`. Wallets in git are public addresses / fingerprints
from that one leaf, not a rotated set.

USB blob `/boot/zeta-creds.enc` (scrypt + HKDF + AES-256-GCM) is
the host-login store. Restore CLI takes `--passphrase-file` or
`--passphrase-env` (no interactive prompt in the CLI). Nix restore
also probes QEMU `fw_cfg` (`opt/org.zeta/creds-passphrase`). Metal
probe is a no-op. That path restores **host files**, not Vault
unseal shares.

## 3 keys, Z-sets, 0-downtime

Landed decision is **dual** (overlap window: writer switches,
readers accept both, then drop). Aaron's ask is **three** so a
compromised key can be invalidated while the fleet still verifies:

| Slot | Why a hub-less fleet needs it |
|---|---|
| previous | a peer that has not learned the rotation still verifies |
| current | what we sign with now |
| next | published before use, so cutover needs no synchronizing message |

That argument is already written in
`docs/research/2026-08-09-every-node-is-its-own-identity-provider-repo-as-cluster-hats-grant-claims-bounded-duration-aaron.md`
(§ "3 keys because we are decentralized"). Dual was enough for Itron
because Itron **was** the hub. We are not.

Z-set reading (same as the 2026-06-15 ADR):

- publish next: `δ(next) = +1`
- promote: current becomes previous
- after overlap: `δ(old) = −1`

`keyset.rotate` today: promote standby → active, retire old active,
mint a fresh standby, **never drop below 2**. Three live keys is
"start with two standbys" plus a previous-honor bound. The bound
(how long `previous` is accepted) is still **OPEN** in that research
doc. Too short partitions; too long keeps a stolen key valid.

0-downtime schema evolution is the sibling, not a new invention:
`docs/specs/zero-downtime-schema-evolution/requirements.md`
Requirement 4 reuses the same overlap-window primitive. Key rolling
and schema rolling should share the machinery. Do not build a
second rotator.

## Startup / unseal map (what exists vs what would have to be true)

| Path | Status | Who unlocks |
|---|---|---|
| USB passphrase → host files | shipped (`zeta-creds-restore`) | operator at bringup |
| Host files → k8s Secrets | landed (#16587; allowlisted harness logins) | oneshot after restore + k3s |
| Vault `operator unseal` | designed, gated, not run by agents | human + biometric |
| TPM-seal | model exists, mode `"off"` | custody undecided |
| Lucent 1Password → unseal shares | **not designed as a ceremony** | chicken-egg + gated-class |
| ESO ClusterSecretStore → Vault | commented in the chart | needs an unsealed Vault |
| 1Password Injector / Operator in-cluster | not in this tree | token Secret is the missing first hop |

A Lucent-1Password unseal startup that does **not** break the
gated-class rule would look like: human unlocks 1Password (or
approves MCP / Broker issuance) → unseal shares resolve into the
`vault operator unseal` process only → agent never sees the shares
→ Personal vault is not in the path. Anything that lets an agent
pod hold the Lucent token **and** the unseal shares is a different
product, and it needs an explicit HC / GOVERNANCE change.

Putting the Lucent **service-account** token into `zeta-host-creds`
solves the injector bootstrap. It does **not** authorize an agent
to run `vault operator unseal`. Those stay separate.

## Bootstrap 1Password like GitHub

Aaron 2026-09-04: login to 1Password the way we login to GitHub,
save the credential in the harness, pass it through to Kubernetes,
use that to break the injector chicken-egg, refresh when it
expires, and notify on a dashboard before it dies. Prefer an
in-cluster relogin service over SSH; SSH is the blunt fallback.

**Verdict.** Yes, for the Lucent **service-account** token
(`ops_…`). No, for an `op signin` / `OP_SESSION` login. Official
CLI sessions expire after **30 minutes of inactivity**
([Sign in to 1Password CLI manually](https://developer.1password.com/docs/cli/sign-in-manually)).
Headless / remote: service account or Connect. A 30-minute session
cannot be the USB blob and cannot be the injector Secret.

Fetched live 2026-09-04. Training data is stale; these pages win.

### Same hop as GitHub, different bytes

| Surface | GitHub today | 1Password that lasts |
|---|---|---|
| Human login | `gh auth login` | `bun tools/setup/op-token-setup.ts` (secure dialog → macOS Keychain service `zeta-op-service-account`) |
| On-disk | `~/.config/gh/hosts.yml` (USB + projector) | **Gap.** Keychain only, macOS. Linux NixOS **refuses** and names the missing port (`libsecret` / `systemd-ask-password`, `081KVNRSGVR08QG0R003R3RNJX`). No USB manifest id. Not in `CLUSTER_PROJECTABLE_CRED_IDS`. |
| Cluster | `zeta-host-cred-gh-cli` | Would be `zeta-host-cred-1password-lucent` → `OP_SERVICE_ACCOUNT_TOKEN` for the injector |
| Cursor Cloud VM | `gh` / injected forge token | Same pattern as `ZETA_WORKFLOW_DISPATCH_TOKEN` (`docs/cloud-agent-workflow-dispatch-token.md`): a Cursor Secret, never `environment.json`, never git |

The cluster analog of Keychain is the USB encrypted blob
(`/boot/zeta-creds.enc`), not a file in the ISO. The projector
already copies allowlisted restored files into Opaque Secrets. Add
the Lucent id to the manifest and the allowlist; do not invent a
second projector.

Injector contract to match (do not rename away from upstream):

- Secret name the injector examples use: `op-service-account`
- Key: `token`
- Env: `OP_SERVICE_ACCOUNT_TOKEN`
- Cite: [Kubernetes Secrets Injector](https://developer.1password.com/docs/k8s/injector)

Our projector names Secrets `zeta-host-cred-<id>`. The Lucent slice
either aliases that name for the injector, or the injector
deployment `secretKeyRef`s `zeta-host-cred-1password-lucent`. Alias
is less surprising to anyone reading 1Password's docs.

`classifyCredId("1password-personal")` is already pinned
**unclassified** in `src/Core.TypeScript/installer/zeta-creds-to-k8s.test.ts`.
Keep that pin forever. Service accounts **cannot** access
Personal / Private / Employee vaults
([Get started with Service Accounts](https://developer.1password.com/docs/service-accounts/get-started)).
A Personal token on the cluster is a product change, not a
classification slip.

### What expiry actually is

Service-account tokens are **not** 30-minute sessions.

- Create: `op service-account create … --expires-in <duration>` is
  **optional**. Unset means valid until rotated or revoked
  ([Get started](https://developer.1password.com/docs/service-accounts/get-started)).
- Rotate: new token, same permissions; old token can expire now,
  in 1 hour, or in 3 days
  ([Manage service accounts](https://developer.1password.com/docs/service-accounts/manage-service-accounts)).
  That overlap window is the dual-key pattern we already ratified
  for SSH. Use it.
- Sign-in address change: tokens redirect for **30 days**, then
  they must be rotated (same page).
- `gh-cli` / `claude` / `gemini` / `codex` OAuth leases die too.
  The factory already learned that an expired forge token looks
  like a network blip if you stringify the error
  (`src/Core.TypeScript/observe/forge-diagnosis.ts`). This is not
  a 1Password-only problem.

The projector today stores **bytes only**. There is no `expiresAt`
sidecar. A dashboard cannot warn "expires in 4d" from a blob of
`ops_…`. The Lucent persist slice must write a **non-secret**
lease record next to the secret (issuedAt, expiresAt or
`unknown`, lastRotatedAt, lastAuthFailureAt). The token never
goes in that record.

If `--expires-in` was omitted, `expiresAt` is `unknown` until
1Password returns 401. The dashboard still shows the row: last
success, last 401, "no stated expiry — rotate on a schedule
anyway." Waiting for 401 is how we currently notice GitHub
tokens. That is the failure mode to stop repeating.

### Relogin: SSH works, an in-cluster Consent service is the product

SSH into the box works today. `ssh-operator-pubkey` is **host-only**
on USB on purpose: it is how the human reaches the node when
everything else is sealed. Blunt. Keep it as the break-glass.

The product Aaron asked for is an in-cluster service:

1. A portal / Consent route (hexagonal `ConsentPort`, biometric
   when the host has it) that asks the human to paste a **new**
   `ops_…` token, or to complete a device-flow if 1Password ships
   one we can use without putting the session on disk.
2. The service writes the token the same way `op-token-setup.ts`
   does at point of use (`withCredential` /
   `src/Core.TypeScript/secrets/credential.ts` — never
   `process.env`), then re-runs the projector so the Secret
   updates. Overlap: keep the old Secret until the new token
   authenticates once, matching 1Password's 1h / 3d expire-old
   choice.
3. Agents do not initiate the ceremony. They can **open the
   ticket** (dashboard warn, page the operator). They cannot mint
   or extend the token.

Do not build a long-lived SSH helper that `cat`s a token into
kubectl. The Consent service is the named port; SSH is the
fallback when the portal is down.

Cursor Cloud Agents are a third surface, not a substitute for
metal: inject `OP_SERVICE_ACCOUNT_TOKEN` as a Cursor Secret the
way `ZETA_WORKFLOW_DISPATCH_TOKEN` already is. That bootstraps
this VM. It does not boot a USB node. Metal still needs the
manifest id.

### Dashboard: warn before expiry, not only after 401

Portal `full-ai-cluster/portal/web/src/components/Dashboards.tsx`
already paints TLS as "expires in Nd" with a warning under 21
days. There is **no** credential-lease panel. Add one for every
projectable host cred (`gh-cli`, `claude`, `gemini`, `codex`,
and Lucent 1Password once it exists), fed from the lease sidecar,
never from the secret bytes.

Schedule:

- Known `expiresAt`: warn at 7d, page at 48h, Consent ticket at
  24h.
- `unknown`: calendar reminder (90d default) plus any 401.
- Rotation overlap in progress: show both "old expires" and
  "new accepted" so the dual window is visible.

Best case is the dashboard. SSH is how you recover when the
dashboard cannot reach the human.

### Gated class stays gated

Injector bootstrap ≠ Vault unseal. An agent pod may mount the
Lucent **service-account** Secret to resolve Lucent vault item
references. It may not run `vault operator init` or
`vault operator unseal`. Fetching unseal shares with that token
into an unseal job is still a **human + biometric ceremony**,
not a oneshot after k3s.

## What not to do in the next slice

- Do not implement Vault helm, ESO ClusterSecretStore, or a live
  1Password injector in the same PR as this review.
- Do not persist or project a Lucent token in this findings PR.
- Do not steal Otto helm-chart currency.
- Do not put Lucent or Personal tokens in git or the ISO.
- Do not treat `keyring-public.json` fingerprints as a 3-key set.
- Do not flash USB from this review.
- Do not persist `op signin` / `OP_SESSION`. It dies in 30 minutes.
- Do not flip `1password-personal` to projectable.

## Next slices (mint children when picking up; do not allocate `B-*`)

1. **Lucent SA persist like `gh-cli`** — close the Linux keystore
   port enough to write a 0600 file (or libsecret), add a
   `DEFAULT_MANIFEST` id, allowlist it in
   `CLUSTER_PROJECTABLE_CRED_IDS`, project to
   `zeta-host-creds` with an injector-shaped `token` key. Cursor
   Secret is the Cloud-Agent hop, not the metal hop. Keep Personal
   unclassified. **This PR does not do that work.**
2. **Lease sidecar + portal notify + in-cluster relogin** — non-secret
   `expiresAt` next to every projectable host cred; portal panel
   in the TLS "expires in Nd" style; Consent service for paste /
   device-flow; SSH remains break-glass. Warn before 401.
3. **Inventory lock test** — a hygiene check that counts SSH lines /
   GPG files / keyring leaves per `maintainers/**` identity and
   fails if a named loop (otto, alexa, riven, vera, lior, ani,
   amara) or named human (aaron, …) is below the decided floor
   (2 until 3 is ratified, 3 after). Presence only; never read
   private material.
4. **Ratify 3-key vs dual** — ADR addendum on the 2026-06-15
   decision: keep dual as the minimum invariant, require three
   live slots for decentralized verify, name the previous-honor
   bound. Wire `keyset.ts` tests to 1 active + 2 standby as the
   default `freshKeyringSet`.
5. **Unseal ceremony runbook** — human-gated, biometric, Lucent
   1Password as the **share store** (not the agent). Cite Credential
   Broker / MCP as the 2026 direction; USB passphrase stays the
   cold-start for host files. Injector bootstrap from slice 1 is
   a prerequisite, not a substitute.
6. **Fill missing persona trees** — riven / vera / lior public
   material, Aaron `cluster-nodes` self-register (Step 6.9), only
   after the 3-key default exists so we do not mint a third
   generation of 1-key trees.
7. **Vault ingest** — after the landed host→Secret projector and after
   unseal is a real ceremony, ESO ClusterSecretStore. Still not a Helm
   fight with Otto.

## Anchors

- Dual-key ADR: `docs/DECISIONS/2026-06-15-zero-downtime-id-rotation-pattern-overlap-window-dual-key.md`
- One-seed HD: `docs/research/2026-06-21-zeta-identity-crypto-substrate-one-seed-hd-keychain-dual-rotation-schema-evolvable-over-zsets-hexagonal.md`
- 3-key rationale: `docs/research/2026-08-09-every-node-is-its-own-identity-provider-repo-as-cluster-hats-grant-claims-bounded-duration-aaron.md`
- TPM / USB binding brief: `docs/design/2026-08-21-credential-binding-tpm-seal-or-usb-iserial-the-r8-decision-brief.md`
- Host→Secret: `docs/design/2026-09-04-host-creds-as-k8s-secrets.md` (landed [#16587](https://github.com/Lucent-Financial-Group/Zeta/pull/16587))
- GOVERNANCE §36 / ALIGNMENT HC-9: humans cannot unilaterally wipe persona memory
- Vault gated unseal: `full-ai-cluster/k8s/applications/vault/Application.yaml`
- Keyset oracle: `tools/setup/persona-keys/keyset.ts`
- Lucent SA capture: `tools/setup/op-token-setup.ts` (macOS Keychain only; Linux refuses)
- Point-of-use read: `src/Core.TypeScript/secrets/credential.ts`
- 1Password SA create / expiry: https://developer.1password.com/docs/service-accounts/get-started
- 1Password SA rotate / 1h–3d overlap / 30-day address redirect: https://developer.1password.com/docs/service-accounts/manage-service-accounts
- 1Password CLI session (30 min inactivity): https://developer.1password.com/docs/cli/sign-in-manually
- 1Password Kubernetes injector: https://developer.1password.com/docs/k8s/injector
