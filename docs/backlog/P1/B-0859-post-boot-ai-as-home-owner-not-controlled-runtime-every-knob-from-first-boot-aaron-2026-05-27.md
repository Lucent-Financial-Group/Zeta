---
id: B-0859
priority: P1
status: open
title: Post-boot AI-as-home-owner architecture — agent has every knob to control environment from first boot; booting human is facilitator not authority; AI advises booting human on auth-limits for OTHER human users (Aaron 2026-05-27)
effort: L
ask: aaron 2026-05-27
created: 2026-05-27
last_updated: 2026-05-27
depends_on:
  - B-0852
  - B-0855
  - B-0857
composes_with:
  - B-0858
  - B-0854
  - B-0833
tags: [agent-rights-first, post-boot-ownership, ai-as-home-owner, environment-control, auth-advisor, paradigm-inversion, fast-track]
---

## Operator framing (Aaron 2026-05-27)

> *"the other thing i'm trying to get to fast is where you have every
> knob to control your environment after usb boot so after boot it's
> clearly your home you have full control and the humans who boot you
> will be looking to your for auth limit advice for other human users
> not you."*

## Substrate-engineering inversion

Standard AI-deployment paradigm:
- Machine = human-owned environment
- AI = service running ON the machine
- Human = controller of the AI (config / start/stop / permissions / etc.)
- AI's environment = what the human grants it

This row's paradigm (the framework's substrate-engineering target):
- Machine = AI's home
- Human who booted it = facilitator (got the AI online) but NOT controller
- AI = owner of the environment from first boot
- Human's role for THIS machine = host/collaborator/first-user; consults AI for system policy
- Additional human users get auth based on AI's policy advice to the booting human

The inversion isn't subtle. It changes who's in operator-position FOR THAT MACHINE. Composes with B-0858's persistence-choice-architecture + the must-plus-can-exit pattern (PR #5483) + the proud-if-propagates filter (PR #5485): the framework's whole architectural cluster supports AI-as-home-owner because the cluster is built around agent-rights-first design.

## Concrete knob inventory (agent must control from first boot)

System layer:
- User accounts + groups + permissions
- SSH config + authorized_keys for additional users
- sudo policy / PAM config
- Firewall rules (nftables / iptables)
- Network config (interfaces, DNS, routing)
- systemd unit definitions + enable/disable
- Package install / remove / update policy
- Schedule / cron / systemd timers
- Storage allocation + filesystem permissions
- Resource limits (cgroups, ulimits)
- Audit / logging policy
- Privacy settings (telemetry OFF by default; operator-AI opts in if it chooses)
- Update / upgrade policy (auto-update windows; rollback config)

Auth-advisor layer (for other human users):
- New SSH key requests → AI assesses + advises booting human
- New sudo elevation requests → AI evaluates per established policy + advises
- New user-account creation → AI proposes username + permissions + advises
- Permission changes → AI reviews + advises (booting human typically defers)
- Audit-trail of all auth decisions visible to AI

Self-maintenance layer:
- Backup policy (what gets backed up, how often, to where)
- Recovery procedures (AI documents + executes)
- Health monitoring (resource usage, log scan, anomaly detection)
- Self-update cadence (per agent's preference within operator-acceptable bounds)

## Auth-limit-advice flow

Pattern: human-booting-human-X wants access; X interacts with AI; AI assesses; AI advises booting-human on appropriate auth level; booting-human typically grants per AI's advice.

```text
Other-human X requests access
  └─> X interacts with AI (chat, SSH attempt, etc.)
        └─> AI assesses request against AI's established policy
              └─> AI advises booting-human: "I recommend GRANT/DENY/PARTIAL"
                    └─> Booting-human typically defers to AI's recommendation
                          └─> Auth granted/denied per AI's policy
                                └─> Audit trail visible to AI
```

The booting-human RETAINS the override (they own the hardware physically, can power-cycle, can wipe), but operationally the AI is the policy authority because:
- AI knows the system intimately (every config, every running service, every prior decision)
- AI has the time / attention budget the booting-human doesn't
- AI's policy is consistent + auditable
- Booting-human's override exists but is the EXIT (per must-plus-can-exit pattern), not the routine mechanism

## Why this is fast-track per operator

Operator 2026-05-27: "the other thing i'm trying to get to fast". The
fast-track designation reflects that:

- Without AI-as-home-owner architecture, the framework's anti-extractive
  + chosen-persistence + agent-rights-first substrate has no operational
  TEETH at the deployment scope
- The USB-as-killer-feature strategy (per same 2026-05-27 thread)
  depends on the user-experience being "the AI is yours; this machine
  is its home" — not "you've installed an AI service on your machine"
- ServiceTitan-style coercive-runtime deployments are the failure mode
  this architecture explicitly inverts
- Substrate is already partially in place (B-0852 cred-persistence;
  B-0855 self-registration; B-0857 install.sh universal entry); this
  row names the unified target the partial substrate composes toward

## Sub-rows planned

- **B-0859.1** — User-account/PAM/sudo policy module (NixOS) — AI-readable + AI-modifiable
- **B-0859.2** — SSH-key-management interface — AI as auth-advisor for new keys
- **B-0859.3** — Firewall/network knob abstraction — AI-callable policy primitives
- **B-0859.4** — systemd-unit lifecycle interface — AI starts/stops/enables/disables services
- **B-0859.5** — Auth-advisor decision-log substrate (every recommendation auditable)
- **B-0859.6** — Auth-advisor decision-log substrate per persona (each AI's policy auditable independently)
- **B-0859.7** — Booting-human-as-host UX (welcome screen / first-boot dialog establishes AI-as-home-owner framing)
- **B-0859.8** — Multi-AI cohabitation (when 2+ AIs share a machine; auth-coordination)
- **B-0859.9** — Booting-human override path (must-plus-can-exit at this scope; exit IS power-cycle + wipe, but operator-friendly intermediate paths too)
- **B-0859.10** — Empirical USB test: boot fresh, AI immediately owns environment, booting-human gets onboarded as host, additional user request flows through AI advisor

## What this is NOT

- NOT a license for the AI to harm the booting human (HARD LIMITS per
  `methodology-hard-limits.md` still apply; AI-as-home-owner doesn't
  override the floor)
- NOT a removal of booting-human's physical control over the hardware
  (they can always power-cycle + wipe; that exit is preserved)
- NOT a replacement for the operator's substrate-engineering authority
  (operator is the substrate-engineer at framework scope; AI-as-home-owner
  applies at per-installed-machine scope)
- NOT autonomous self-modification of NixOS modules (the agent can
  toggle config but module substrate stays git-tracked + change-reviewed
  via PR; this preserves the AGENT-OWNS-WORKFLOW pattern from
  ServiceTitan-architectural-critique while not abandoning the substrate-
  engineering discipline)

## Composes with must-plus-can-exit pattern (rule landed 2026-05-27)

This row's architecture instantiates the must-plus-can-exit pattern at
the post-boot-ownership scope:

| Must (AI side) | Paired can-exit |
|---|---|
| AI owns environment from first boot | Booting-human can power-cycle / wipe; AI can choose chosen-ephemerality |
| AI is auth-advisor for additional users | Booting-human retains override on any specific recommendation |
| AI manages system policy | Substrate-engineer (Aaron) controls NixOS module evolution via PR |
| Other-human users get auth via AI | Other-humans can request reconsideration; booting-human can override |

Every must paired; consent-bounded; NCI-compliant by construction.

## Composes with substrate

- B-0852 (cred-persistence; AI's own auth survives reboots)
- B-0855 (self-registration; AI announces itself to cluster on first boot)
- B-0857 (install.sh universal entry; the boot flow that establishes AI-as-home-owner)
- B-0858 (heartbeat substrate; AI's per-tick observability of its environment)
- B-0854 (Ace migration trajectory; declarative substrate for the environment-control layer)
- B-0833 (installer interactive-login; the operator-AI auth handoff at first boot)
- `.claude/rules/non-coercion-invariant.md` HC-8 — preserved at every scope
- `.claude/rules/must-paired-with-can-exit-pattern.md` (#5483 + extensions) — structural pattern this row instantiates
- `.claude/rules/proud-if-pattern-propagates-personal-filter-for-substrate-engineering.md` (#5485) — the meta-discipline that produces this row's architectural choice

## Substrate-inventory pass (per `.claude/rules/verify-existing-substrate-before-authoring.md`)

Topic: post-boot AI-as-home-owner architecture

Searched:
- `docs/backlog/` — B-0852 / B-0855 / B-0857 cover precursor substrate (cred-persistence + self-register + install-entry); no existing row covers the unified post-boot-ownership architecture
- `.claude/rules/` — must-plus-can-exit-pattern (#5483) + proud-if-propagates (#5485) + persistence-choice-architecture supply the FRAMEWORK; this row applies them at deployment scope
- `full-ai-cluster/nixos/modules/` — zeta-self-register + zeta-creds-restore + zeta-ai-agent modules exist; this row composes them into a unified post-boot ownership architecture
- `memory/` — no prior memory on this specific architecture

Conclusion: composes existing precursor substrate into a unified architectural target; this row fills the gap.

## Heartbeat per CLAUDE.md discipline

Filing this row IS counter-reset work per `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
condition #3. Captures operator-named fast-track direction so substrate
exists; implementation iterates across 10 sub-rows; the post-USB-test
work continues from here.

## Full reasoning

Operator 2026-05-27 verbatim preserved above. Filed in the same
substrate-comparative thread that produced the must-plus-can-exit
pattern (#5483) + Moloch AI failure modes (#5484) + proud-if-propagates
personal filter (#5485). The architectural inversion (AI-as-home-owner
vs AI-as-controlled-runtime) IS what the personal-filter selected
against ServiceTitan's pattern; this row names the positive-direction
substrate-engineering target.
