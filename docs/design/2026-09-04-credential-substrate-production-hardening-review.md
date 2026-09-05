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
Follow-up: adversarial review of Google's 1Password + ESO + sidecar
unseal sketch; we are going for automation very close to that.

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
machine cert, and an init ceremony no agent is allowed to run.
Post-init unseal on pod restart is the automation we are going
for (Google-shaped extraContainer, rewritten below).

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

2. **Vault `operator init` stays gated. Post-init unseal is the
   automation we are going for.** `full-ai-cluster/k8s/applications/vault/Application.yaml`
   says Vault comes up sealed until `vault operator init` +
   `vault operator unseal`, and those commands require fresh human
   authorization plus the biometric gate. That remains true for
   **init** (and for the first unseal that proves the shares).
   Standing "a human re-unseals every pod restart" is the smell.
   The close-to-Google path: after a human has inited and saved
   Shamir shares into Lucent, an extraContainer unseals
   localhost on 503. That is an explicit `TOPOLOGY.md` §5 /
   GOVERNANCE recast of step 5, not a silent chart bump, and not
   HashiCorp auto-unseal. Design:
   [Google's 1Password unseal loop](#googles-1password-unseal-loop).

3. **1Password-as-unseal has a chicken-egg, and metal first boot
   is the break.** The injector still needs an
   `OP_SERVICE_ACCOUNT_TOKEN` Secret first. That token must not
   live in git or the ISO. It **does** live as a 1Password **item**.
   USB boots the production box; `tty1` asks the operator to login;
   that login retrieves Lucent items; the projector writes the
   Secret. A 30-minute `op signin` session is not that login. The
   laptop is not that hop. After first boot, rotation is
   automation. Design: [The token is a Lucent item](#the-token-is-a-lucent-item).

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
| Vault `operator init` | designed, gated, never automated | human + biometric + witness |
| First `operator unseal` after init | gated (proves the shares) | human + biometric |
| Later unseal (pod restart / 503) | **going-for:** extraContainer, fetch-at-unseal from Lucent | unsealer process, not a general agent |
| TPM-seal | model exists, mode `"off"` | custody undecided |
| Lucent 1Password → unseal shares | share **store**; fetch at unseal time | SA token already projected; shares stay out of etcd |
| ESO ClusterSecretStore → Vault | commented in the chart | needs an unsealed Vault; not the share copy path |
| 1Password Injector / Operator in-cluster | not in this tree | token Secret is the missing first hop |

Putting the Lucent **service-account** token into `zeta-host-creds`
solves the injector bootstrap **and** is the credential the
unsealer uses to `secrets.resolve()` Shamir fields at unseal
time. A general agent still may not run `vault operator init` or
`unseal`. The unsealer is a named extraContainer with one job.
That recast is named here; it is not yet in `TOPOLOGY.md` §5
(which still says "Do not automate step 5 against Vault CE").
The extraContainer slice edits that paragraph when it lands.

## Bootstrap 1Password like GitHub

Aaron 2026-09-04: login to 1Password the way we login to GitHub,
save the credential in the harness, pass it through to Kubernetes,
use that to break the injector chicken-egg, refresh when it
expires, and notify on a dashboard before it dies. Prefer an
in-cluster relogin service over SSH; SSH is the blunt fallback.

**Verdict.** Yes, for a Lucent **service-account** token (`ops_…`)
stored as a **1Password item**, fetched at **metal first boot**
after the USB login prompt, then projected into Kubernetes. No, for
parking an `op signin` / `OP_SESSION` on USB. Official CLI sessions
expire after **30 minutes of inactivity**
([Sign in manually](https://developer.1password.com/docs/cli/sign-in-manually)).
A 30-minute session cannot be the blob and cannot be the injector
Secret. The item can. Two or three tokens in that item (or three
items) are the rotation set. After first boot, rotation is
**automation**. A key that cannot auto-rotate is a smell unless it
is FIDO / a device assigned to a human.

Fetched live 2026-09-04. Training data is stale; these pages win.

### The token is a Lucent item

Aaron 2026-09-04 follow-up: keep a secret **in** 1Password that
**is** the long-term token — or two or three of them for rotation.
The USB's job is **new machine boot** on self-hosted production
hardware: the node asks the operator to login **on that console**,
then retrieves the needed materials from Lucent 1Password. Not the
laptop. After that, rotation is automation (or a tightly limited
rotation agent). A key that cannot auto-rotate is a smell unless
it is FIDO / a human-assigned device.

On create and on every rotate, the wizard shows the token **once**
and offers **Save in 1Password**
([Get started](https://developer.1password.com/docs/service-accounts/get-started),
[Manage service accounts](https://developer.1password.com/docs/service-accounts/manage-service-accounts)).
The item is the source of truth. Keychain / USB / the Kubernetes
Secret are caches of the last fetch, not a second original.

Three hops, in order, on the **new machine**:

1. **USB metal first boot, login on that console.** That is what
   the USB is for. Shipped today: `zeta-creds-restore` falls back
   to `systemd-ask-password` on `tty1` (`docs/uefi-keyfile-restore-metal-path.md`).
   QEMU has never proven that prompt; metal-capable is the named
   gap. The operator is standing at the production box, not at a
   laptop. This is **not** `eval "$(op signin)"` and not a 30-minute
   `OP_SESSION` copied onto the stick.
2. **Retrieve from Lucent 1Password** — `op read op://Lucent/<item>/current`
   (and `previous` / `next` when rotating). The login on that
   console is what authorizes the read. The item is the source of
   truth. Personal / Private / Employee vaults stay unreachable
   to any service account, so the item lives in Lucent.
3. **Projector writes the injector-shaped Secret.** After that the
   node is headless. Reboots use the USB cache / k8s Secret. A
   human does not sit at `tty1` for every rotation.

Chicken-egg, closed: the injector needs a token Secret; the token
Secret is a copy of a Lucent item; first boot on metal has a human
at the console who can login and produce that copy. Nothing in git,
nothing in the ISO.

The laptop 1Password app is a **dev** convenience, not the
production hop. `op-token-setup.ts` (Keychain paste) is the same
class. NixOS metal without a GUI still uses the `tty1` prompt;
Consent paste / SSH are break-glass when that prompt cannot reach
1Password, not the happy path.

### Two or three tokens, not one

Official rotate on **one** service account gives **two** live
tokens: new token now, old token expires immediately / in 1 hour /
in 3 days, and you Save the new value back into 1Password. That is
the dual-key overlap we already ratified. Use it as the minimum.

Three live slots (previous / current / next) is the hub-less ask.
1Password will not give three overlapping tokens on one SA — rotate
is two at a time. Three slots means **three items** (or one item
with three concealed fields) backed by **three service accounts**
created with the same Lucent vault permissions (permissions are
immutable after create, so you mint the set together). Name them
in the item, not in git:

| Slot | What it is for |
|---|---|
| previous | cluster copy that has not been replaced yet still works |
| current | what the projector writes now |
| next | published in Lucent before cutover, so rotate needs no surprise |

The dashboard lease panel watches which slot the cluster is on and
when `previous` should drop — same overlap-window primitive as
SSH / schema evolution. Do not invent a second rotator.

Do not put the three `ops_…` values in the ISO "so we have a
backup." The Lucent item **is** the backup. Metal first-boot login
is how you reach it.

### After first boot: auto-rotate, or it is a smell

Aaron 2026-09-04: from that point, keys **auto-rotate**. If
automation cannot do the rotate, a **special-purpose** agent may
— tightly limited, trained for rotation only, fail-closed. Any
key that cannot be auto-rotated is a **smell** unless it is FIDO
or another device assigned to a human.

| Class | Who rotates | Smell? |
|---|---|---|
| Lucent SA token, gh-cli, AI-login OAuth, TLS, SPIFFE SVIDs | Automation (overlap window, lease sidecar, projector refresh) | Yes if a human must re-type it on a schedule |
| Same, when the rotator is stuck | Rotation-only agent: named credential classes, no git, no ISO, no Vault `operator unseal`, no Personal vault, dual-key overlap required | The stuck rotator is the smell; the agent is a temporary brake |
| FIDO / YubiKey / human-assigned hardware | The human who holds the device. No auto-rotate; the device **is** the key | No. This is the exception |
| Vault unseal shares | Init + first unseal: human at metal console (gated, biometric, witness). After that: unsealer extraContainer fetches shares from Lucent at unseal time | Standing human-every-reboot is the smell. PKCS#11 / FIDO is the later hardware path. Copying shares into etcd via ESO is also a smell |

The rotation agent is **not** a general loop with a new skill.
Limits that have to be real before it exists: one job (rotate
named slots), fail-closed on anything else, overlap window
mandatory, cannot mint a token that is not already a Lucent item
class, cannot extend its own mandate, cannot unseal Vault (that
is the unsealer extraContainer, a different process). GOVERNANCE
/ HC change if this agent ever grows past rotate.

1Password's own rotate (new token, expire old in 1h / 3d, Save
in 1Password) is the automation primitive for SA tokens. A
rotation-service account with `write_items` on Lucent, not on
Personal, is how that runs without a human at `tty1`. The SDK
rotation demo shape (previous+current live, drop the one before
previous) is the same dual-key overlap. Use it. Do not invent a
fourth rotator.

### Same hop as GitHub, different bytes

| Surface | GitHub today | 1Password that lasts |
|---|---|---|
| First login | USB restore of `hosts.yml` after `tty1` passphrase | USB metal first boot: login **on that console**, then fetch Lucent item. Not the laptop. |
| Source of truth | `~/.config/gh/hosts.yml` | Lucent vault **item** (Save in 1Password on create/rotate). 2–3 tokens for overlap. |
| Cache | USB blob → projector | Last-fetched `ops_…` on USB / `zeta-host-creds` so later boots are headless |
| After first boot | token expires → human `gh auth login` (smell) | Automation rotates; rotation-only agent if stuck; FIDO is the only standing exception |
| Cluster | `zeta-host-cred-gh-cli` | Injector-shaped Secret from the fetched item |
| Cursor Cloud VM | `gh` / injected forge token | Cursor Secret is a cache of the same item, never `environment.json`, never git |

USB (`/boot/zeta-creds.enc`) is the **bringup vehicle and the
cache** of the last fetch, not a file in the ISO and not a second
original. First boot on metal: login at `tty1`, retrieve from
Lucent, project. Later boots: cache only. Add a Lucent id to the
manifest and the allowlist for that cache; do not invent a second
projector.

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

### Init stays gated; post-init unseal is the named recast

Injector bootstrap ≠ Vault **init**. An agent pod may mount the
Lucent **service-account** Secret to resolve Lucent vault item
references. It may not run `vault operator init`. The first
unseal after init stays a human + biometric + witness ceremony
(`TOPOLOGY.md` §5 steps 1–5 as written today). After that,
standing human-every-reboot is the smell, and the extraContainer
below is the automation we are going for. `TOPOLOGY.md` still
says "Do not automate step 5 against Vault CE"; that sentence is
the amendment the unsealer slice must make, not a silent
`valuesObject` bump.

## Google's 1Password unseal loop

Aaron 2026-09-04, discussing with Google: automate Vault unsealing
with 1Password on Kubernetes, **very close to** Google's sidecar
shape. Adversarial review of that proposal. We are going for the
automation. We are not going for every line of the sketch.

Google's shape, restated without the marketing: 1Password is not
a Vault `seal` stanza (those are AWS KMS, Azure Key Vault, GCP
CKMS, AliCloud/OCI KMS, PKCS#11 **Enterprise**, or Transit through
a second Vault). So the pattern is a process that notices Vault
is sealed and applies Shamir shares. Google put that process in
`server.extraContainers` on the Helm values, with shares synced
into a Kubernetes Secret by External Secrets Operator (and a
1Password Connect server in front of ESO).

**Keep (the product):**

- After a human has **inited**, something in-cluster unseals on
  pod restart without a human at `tty1`.
- `server.extraContainers` / `extraVolumes` on the **existing**
  Helm `valuesObject` in
  `full-ai-cluster/k8s/applications/vault/Application.yaml`.
  That is the allowed seam. Do not fork the chart. Do not fight
  Otto/Dejan on chart currency (`targetRevision: 0.34.1`,
  measured).
- Lucent 1Password as the **store** for Shamir shares.
- Single-node first. The chart declares
  `cluster.zeta.io/topology: single-node`, `ha.enabled: true`,
  `replicas: 1`, raft, `zeta-local-path`, `tlsDisable: true`.
  Google's "expand the loop for HA Raft secondaries" is not the
  current product. `TOPOLOGY.md` §3 is the three-node delta;
  unseal of joiners waits on that flip.

**Reject / rewrite:**

| P0 | Why |
|---|---|
| Rekey threshold to **1** | Catastrophic. Keep Shamir N-of-M. The unsealer applies threshold-many distinct keys, not one. |
| `alpine:latest` + `apk add curl` at start | Unpinned, non-reproducible, supply chain. The same script then calls `vault operator unseal`, which alpine does not ship — curl is installed, the Vault CLI is not. Pinned image, no runtime `apk`, talk HTTP `PUT /v1/sys/unseal` (or a factory image that already has the client). TypeScript, not a heredoc shell. |
| `KEY1=$(cat …)` **once**, then loop | File updates from ESO / kubelet never reach the process. Google's claim that "ESO refresh updates the sidecar seamlessly" is **false**. Re-read each iteration if a file must be mounted. Prefer fetch-from-Lucent **at unseal time** so there is no long-lived key file. |
| ESO copies unseal keys into a Kubernetes Secret | Downgrade vs "Lucent item is the source of truth." Anyone who can `get`/`list` Secrets in `vault` gets the barrier keys. Etcd snapshots become unseal-key backups. ESO `onepasswordSDK` ([provider docs](https://external-secrets.io/main/provider/1password-sdk/)) is the right bridge for **app** secrets **after** Vault is up. It is the wrong place to park Shamir shares. |
| Deploy 1Password **Connect** as the first hop | Extra chicken-egg (Connect needs its own token). ESO's SDK provider uses a service-account token — the same Lucent `ops_…` metal first-boot already has to project for the injector. Do not add Connect to break a chicken-egg we already named a hop for. |
| Health URL `http://127.0.0` | Typo. Listener is `http://127.0.0.1:8200` (`tlsDisable: true`). HTTP 503 = sealed (correct trigger). HTTP 200 = unsealed (sleep). HTTP 501 / `initialized=false` = **not inited** — the sidecar must **not** init. curl `000` is a miss, not a seal. |
| Sidecar that can `operator init` | Init stays gated forever. Unsealer may only unseal. No root token in the Lucent item the unsealer can read. |
| Calling this "auto-unseal" | HashiCorp auto-unseal wraps the root key in KMS. This is a Shamir unseal loop. Name it honestly in comments, dashboards, and `TOPOLOGY.md`. |

**Close-to-Google architecture we are going for:**

1. Metal first boot (hops above): human at `tty1` → projector
   writes the Lucent SA Secret.
2. Human `vault operator init` (gated, biometric, witness).
   Shamir shares **saved into Lucent item(s)** — not git, not
   ISO, not the same item as the SA token. Root token used once
   and revoked (`TOPOLOGY.md` §5 step 4, unchanged).
3. Human applies threshold-many `unseal` once, proving the
   shares. Readiness probe exit 2 until then is still correct.
4. Unsealer extraContainer: pinned image, fetch shares from
   Lucent **at unseal time** (`secrets.resolve()` / SDK) using
   the already-projected SA token, `PUT` threshold keys to
   `http://127.0.0.1:8200/v1/sys/unseal`, loop, fail-closed,
   cannot init, cannot write git, cannot read Personal.
   Dedicated Lucent vault, **Read Items** only, holding unseal
   shares (1Password's own agent tutorial shape). Blast radius
   of that SA: it can unseal Vault. Say that out loud.
5. ESO 1Password SDK ClusterSecretStore is fine for other app
   secrets after Vault is up. Do not use it as the primary copy
   of unseal shares into etcd.
6. PKCS#11 / YubiHSM / FIDO (OpenBao later;
   `seal-stanza-requires-vault-enterprise` refuses PKCS#11 on
   HashiCorp CE) is the non-smell hardware path. Sidecar Shamir
   is the on-prem automation until that exists. TOPOLOGY.md was
   right that a process which can read shares is worse than a
   human holding them **if the alternative is HashiCorp
   Enterprise KMS**. It is not worse than a human at `tty1` on
   every reboot, which is the smell we are removing.
7. HA Raft unseal of joiners: out of scope until topology flips
   to three-node.

Custody still open (`TOPOLOGY.md` §5): Vault's own Shamir vs
`tools/setup/persona-keys/shamir.ts`. Maintainer + witness.
This review does not settle it.

This findings PR does **not** add `extraContainers` to the
chart. The next unsealer slice does, and it amends
`TOPOLOGY.md` §5 in the same commit so the recast is not a
comment lying next to a sidecar.

## μένω names the recast (2026-09-05)

Aaron's Greek verb **μένω** (I remain / abide / persist) is
the name of the split this review already made: init
**remains** a gated human ceremony; the unsealer **acts**
from Lucent shares and drops them. You do not act in order
to abide. Pickup: `docs/trajectories/cluster-encryption-credential-substrate/MENO.md`.
Ferry (research-grade, architecture only):
`docs/research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md`.

The TypeScript decision loop (`vault-unsealer.ts`) can land
without Helm. Fetch-this-tick is the IInput Google's
`KEY1=$(cat)` once missed. HTTP 000 is a miss, not a seal.
S=2√2 is a measurement, not a config flag. Copying Shamir
shares into etcd is S=4 (coercion). Do not mint public
`IInput` / `IFeedback` F# types in the unsealer slice.

## What not to do in the next slice

- Do not implement Vault helm `extraContainers`, ESO ClusterSecretStore,
  or a live 1Password injector in the same PR as this review.
- Do not persist or project a Lucent token in this findings PR.
- Do not steal Otto helm-chart currency.
- Do not put Lucent or Personal tokens in git or the ISO.
- Do not treat `keyring-public.json` fingerprints as a 3-key set.
- Do not flash USB from this review.
- Do not persist `op signin` / `OP_SESSION`. It dies in 30 minutes.
- Do not treat Keychain / USB as the original. The Lucent item is.
- Do not flip `1password-personal` to projectable.
- Do not rekey Vault to a threshold of 1.
- Do not copy Shamir shares into etcd via ESO.

## Next slices (mint children when picking up; do not allocate `B-*`)

1. **Fetch Lucent item → project** — metal first-boot login on
   that console reads `op://Lucent/<item>/{previous,current,next}`,
   writes the current slot into the projector allowlist as an
   injector-shaped `token` key. USB/Keychain are caches. Mint the
   2–3 SA items in Lucent first (human, biometric). Keep Personal
   unclassified. **This PR does not do that work.** Prerequisite
   for the unsealer (same SA token, Read Items on the share vault).
2. **TypeScript unsealer decision loop** — can precede Helm.
   Classify health (200 sleep / 503 fetch-this-tick / 501
   refuse-init / 000 miss). Threshold-many distinct keys.
   Cannot init. Shares never persist. Named μένω: the loop
   *acts*; init *remains*.
3. **Unsealer extraContainer** — close to Google, rewritten:
   `valuesObject` `extraContainers` only (no chart fork); fetch
   Shamir shares from Lucent **at unseal time**; threshold-many
   keys; HTTP unseal to localhost:8200; cannot init; pinned image;
   amend `TOPOLOGY.md` §5 in the same commit ("Do not automate
   step 5" becomes "init stays gated; post-init unseal is this
   extraContainer"). Not ESO-into-etcd for shares. Not HA joiner
   unseal until three-node. Same commit as the sidecar.
4. **Lease sidecar + portal notify + in-cluster relogin** — non-secret
   `expiresAt` next to every projectable host cred; portal panel
   in the TLS "expires in Nd" style; Consent service for paste /
   device-flow; SSH remains break-glass. Warn before 401.
5. **Inventory lock test** — a hygiene check that counts SSH lines /
   GPG files / keyring leaves per `maintainers/**` identity and
   fails if a named loop (otto, alexa, riven, vera, lior, ani,
   amara) or named human (aaron, …) is below the decided floor
   (2 until 3 is ratified, 3 after). Presence only; never read
   private material.
6. **Ratify 3-key vs dual** — ADR addendum on the 2026-06-15
   decision: keep dual as the minimum invariant, require three
   live slots for decentralized verify, name the previous-honor
   bound. Wire `keyset.ts` tests to 1 active + 2 standby as the
   default `freshKeyringSet`.
7. **Fill missing persona trees** — riven / vera / lior public
   material, Aaron `cluster-nodes` self-register (Step 6.9), only
   after the 3-key default exists so we do not mint a third
   generation of 1-key trees.
8. **Vault ingest** — after the unsealer is real, ESO
   ClusterSecretStore for **app** secrets. Still not a Helm fight
   with Otto. Still not the Shamir-share copy path.

## Anchors

- Dual-key ADR: `docs/DECISIONS/2026-06-15-zero-downtime-id-rotation-pattern-overlap-window-dual-key.md`
- One-seed HD: `docs/research/2026-06-21-zeta-identity-crypto-substrate-one-seed-hd-keychain-dual-rotation-schema-evolvable-over-zsets-hexagonal.md`
- 3-key rationale: `docs/research/2026-08-09-every-node-is-its-own-identity-provider-repo-as-cluster-hats-grant-claims-bounded-duration-aaron.md`
- TPM / USB binding brief: `docs/design/2026-08-21-credential-binding-tpm-seal-or-usb-iserial-the-r8-decision-brief.md`
- Host→Secret: `docs/design/2026-09-04-host-creds-as-k8s-secrets.md` (landed [#16587](https://github.com/Lucent-Financial-Group/Zeta/pull/16587))
- GOVERNANCE §36 / ALIGNMENT HC-9: humans cannot unilaterally wipe persona memory
- Vault gated init / topology: `full-ai-cluster/k8s/applications/vault/Application.yaml`, `TOPOLOGY.md` §5
- ESO 1Password SDK (app secrets, not share copy): https://external-secrets.io/main/provider/1password-sdk/
- Keyset oracle: `tools/setup/persona-keys/keyset.ts`
- Lucent SA capture: `tools/setup/op-token-setup.ts` (macOS Keychain only; Linux refuses)
- Point-of-use read: `src/Core.TypeScript/secrets/credential.ts`
- 1Password SA create / expiry: https://developer.1password.com/docs/service-accounts/get-started
- 1Password SA rotate / 1h–3d overlap / 30-day address redirect: https://developer.1password.com/docs/service-accounts/manage-service-accounts
- 1Password CLI session (30 min inactivity): https://developer.1password.com/docs/cli/sign-in-manually
- 1Password CLI app integration (console/biometric login): https://developer.1password.com/docs/cli/app-integration
- 1Password Kubernetes injector: https://developer.1password.com/docs/k8s/injector
