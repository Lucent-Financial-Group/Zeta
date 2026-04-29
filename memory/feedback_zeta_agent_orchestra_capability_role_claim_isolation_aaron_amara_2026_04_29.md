---
name: Zeta Agent Orchestra — capability + role + claim + isolation (Aaron + Amara, 2026-04-29)
description: Project-level multi-harness multi-maintainer multi-actor coordination model. Stop classifying agents by name (subagent vs CLI vs buddy) — classify by capability (review-only / patch / write-worktree / push / merge / authority). Pinned vs free vs buddy roles. GitHub-native live coordination + git-native durable substrate, both must agree. Declarative project-agent definition (proposed `.zeta/agents.yaml`). Paced protocol — land design, dry-run, then implementation. Composes with parallel-agent-worktree-isolation rule + best-practices-evidence-lineage rule landed same day.
type: feedback
---

# Zeta Agent Orchestra — coordination model

## The carved sentences

> *"Humans own intent. Harnesses run actors. Roles define authority. Claims bind work. GitHub coordinates now. Git preserves forever."* (Amara 2026-04-29)

> *"Subagents and buddy harnesses are both worker actors; the difference is runtime boundary, not coordination model."* (Amara 2026-04-29)

> *"Do not coordinate by personality name. Coordinate by role, capability, claim, and isolation."* (Amara 2026-04-29)

> *"Many maintainers. Many peer CLIs. Many branches. One coordination ledger. No shared mutable working tree."* (Amara 2026-04-29)

## The hierarchy

```text
Humans
  → Harnesses / runtimes (Claude Code, Codex CLI, Gemini CLI, Cursor, Copilot, Windows machine, CI workflow, ...)
      → Named agents / roles (coordinator, git-expert, typescript-steward, docs-worker, ...)
          → Work claims / lanes (CLAIM-NN with file allowlist + branch + worktree)
              → PRs / issues / patches / reviews (the visible work units)
```

## Cross-harness memory — the substrate / adapter split

**Canonical substrate** (one source-of-truth):
- `memory/` — durable cross-harness lessons + MEMORY.md index
- `docs/active-trajectory.md` — current lane pointer
- `docs/ops/**` — runbooks, patterns, incidents
- `docs/best-practices/**` — evidence-cited per-tool/language standards
- `docs/backlog/**` — planning surface

**Harness-specific bootstrap pointers** (thin adapters, not duplicates):
- `CLAUDE.md` — Claude Code
- `AGENTS.md` — closest to universal; Codex CLI auto-loads; other harnesses should point at it
- `.github/copilot-instructions.md` — Copilot PR review
- `GEMINI.md` — Gemini CLI (not yet present in repo)
- `.cursor/rules/**` — Cursor (not yet present in repo)
- `CODEX.md` / `.codex/**` — only if Codex CLI gains a canonical loader beyond AGENTS.md

**Design rule**: *"One canonical memory substrate. Many thin bootstrap adapters. Adapters point to memory; they do not duplicate memory."*

**Best shape**:
```text
AGENTS.md  = universal bootstrap map
CLAUDE.md  = Claude-specific notes + "read AGENTS.md"
GEMINI.md  = Gemini-specific notes + "read AGENTS.md"
.cursor/rules = Cursor-specific notes + "read AGENTS.md"
```

## Capability-based actor taxonomy (NOT name-based)

| Class | Can do | Isolation requirement |
|---|---|---|
| `review_only` | comment / review | none — no worktree needed |
| `patch_only` | output diff/patch; coordinator applies | none — no worktree needed |
| `write_worktree` | edit filesystem | **isolated worktree or clone required** |
| `push_branch` | commit + push to a branch | branch namespace + claim required |
| `open_pr` | open PR | claim + branch namespace |
| `merge_pr` | merge a PR | branch protection + policy gate |
| `authority_mutation` | rulesets / secrets / billing / force-push / deletion | NOT peer-autonomous; explicit policy or human gate required |

**Rule**: *"Isolation requirement follows capability, not actor name."*

A buddy can write code only when explicitly granted: branch + isolated worktree/clone + file allowlist + no repo-wide formatter authority + PR target + stop conditions. Otherwise buddy = review/advice only.

## Role types

1. **Pinned role** — durable named identity with stable responsibility, carries memory + doctrine + recurring duty.
   - Examples: `coordinator`, `git-expert`, `typescript-steward`, `budget-sentinel`, `recovery-archaeologist`, `pr-preservation-steward`, `best-practices-curator`, `anchor-ledger-steward`.
2. **Free role** — disposable worker slot, fillable by any compatible harness/agent if claim is safe.
   - Examples: `docs-worker`, `lint-fix-worker`, `research-worker`, `test-writer`, `migration-worker`.
3. **Buddy role** — peer/reviewer/advisor; review-only by default; can become write-capable only with explicit grant.

**Pinned roles preserve durable expertise. Free roles provide scalable labor. A free worker can do labor; a pinned role owns judgment.**

## Six safety levels

```text
Level 0 — Ask/review only      → always allowed
Level 1 — Patch proposal       → coordinator applies after review; usually allowed
Level 2 — Isolated write       → allowed with claim
Level 3 — Push PR              → allowed with claim + branch namespace
Level 4 — Merge/automerge      → allowed only with branch protection + green checks + review policy
Level 5 — Authority mutation   → NOT peer-autonomous unless signed policy explicitly exists
```

Default-down: when in doubt, reduce capability (review_only → patch_only → isolated write → push PR → merge → authority).

## Multi-maintainer safe-mode preconditions (12-condition checklist)

A maintainer may run a peer CLI autonomously only when all are true:

1. Clean or isolated local workspace.
2. Dedicated branch.
3. Dedicated worktree or clone.
4. GitHub issue/claim exists.
5. File allowlist declared.
6. File denylist declared.
7. PR target declared.
8. No overlapping active claim.
9. No active destructive/topology/reset lane.
10. Branch protection on LFG/main remains active.
11. Agent cannot push to main directly.
12. Agent cannot alter rulesets/secrets/billing/permissions.

If any fail: peer may run read-only or patch-only, not write-autonomous.

## Work claim protocol

**GitHub-native claim** (live truth):
- LFG issue or PR with labels (e.g. `claim:active`, `agent:codex`, `maintainer:aaron`, `lane:budget`, `risk:docs-only`)
- PR body declares: owner, actor, branch, worktree/clone, file allowlist, file denylist, stop conditions, expected deliverable.

**Git-native mirror** (durable truth): `docs/ops/coordination/claims/CLAIM-<issue>-<slug>.md`

```yaml
---
claim_id: CLAIM-123
github_issue: 123
owner_maintainer: "<name>"
actor: "codex-cli | gemini-cli | claude-code | cursor-agent | human"
capability: review-only | patch-producing | write-capable | push-capable
branch: "<branch>"
worktree_or_clone: "<path-or-machine>"
file_allowlist: [...]
file_denylist: [...]
started_at: ...
expires_at: ...
status: active | blocked | done | abandoned
stop_conditions: [...]
---
```

**Rule**: *"No autonomous write without a claim. No claim without either a PR or issue. No active claim without a file allowlist."*

## Branch naming convention

```text
<maintainer>/<actor>/<lane>/<date>
```

Examples:
- `aaron/codex/budget-cadence-2026-04-29`
- `aaron/gemini/best-practices-research-2026-04-29`
- `otto/claude/ts-hygiene-port-2026-04-29`
- `maintainer2/cursor/java-cleanup-2026-04-29`
- `aaron-windows/codex/docs-best-practices-2026-04-29`

No agent writes to `main`. No agent writes to another actor's branch unless explicitly reassigned.

## Stop conditions (immediate halt + report)

- Overlapping file claim
- Dirty shared worktree
- Branch switch conflict
- Repo-wide formatter touching outside allowlist
- Generated file not assigned to the lane
- Secret/env exposure risk
- Ruleset/permission/billing change
- Force-push/delete/ref mutation
- Ambiguous data loss
- Cold-start uncertainty
- Active trajectory mismatch

## GitHub-native + git-native agreement

A lane is valid only if both surfaces agree on:

| Surface | Source of truth for |
|---|---|
| GitHub issue/PR | live state (labels, assignees, status, branch existence, checks) |
| Git mirror | durable rules (claim allowlist, capability, stop conditions, sync history) |

If they disagree:
- Issue/PR is live truth (status, comments, blockers).
- Git mirror is durable truth (rules, allowlist, claim spec).
- Stale mirror must be refreshed before autonomous mutation.

## Coordinator role

A coordinator does not write all code. A coordinator allocates safe work.

Coordinator duties:
- maintain claim board
- assign branches/worktrees
- prevent file overlap
- stop unsafe agents
- reconcile PRs
- update active trajectory
- enforce cold-start packets
- ensure claims close cleanly

## Windows peer mode

Windows is fine when safe, but no hidden assumptions:
- Own clone or worktree
- Normalized path reporting
- No reliance on macOS shell behavior
- No untested Bashisms unless WSL/git-bash explicitly
- Explicit line-ending policy
- Explicit toolchain install check
- Branch namespace naming the machine/actor (e.g. `aaron-windows/codex/...`)
- Start in read-only / patch-only mode; promote to write-capable only after bootstrap + claim check pass

## Compact doctrine

```text
Review peers can be loose.
Write peers need isolated worktrees.
Push peers need claims.
Merge peers need policy.
Authority peers do not exist by default.
```

## Implementation discipline — 5-layer landing plan (multi-AI review v2, 2026-04-29)

**Do not land this as a monolith.** Five reviewers (Ani, Claude.ai, Gemini, Alexa, Deepseek) converged on "approved directionally; don't land everything at once." Amara synthesized into a layered landing sequence. Each layer is independently testable; each layer must validate before the next is adopted.

### Layer 0 — Doctrine only (THIS memory file)

Lands first. No automation. Captures:
- The carved sentences
- Capability taxonomy (review_only / patch_only / write_worktree / push_branch / open_pr / merge_pr / authority_mutation)
- Dual-ledger principle (GitHub = live truth, Git = durable truth)
- Isolation-follows-capability rule
- Pinned/free role distinction
- "No shared mutable working tree" invariant
- Source-of-truth conflict resolution (issue wins for live state; mirror wins for durable rules; if they disagree, GitHub issue/PR is truth until mirror updates)

### Layer 1 — Claim protocol

Define the claim schema and lifecycle:
- GitHub issue/PR = live operational truth
- Git mirror at `docs/ops/coordination/claims/CLAIM-<id>.md` = durable summarized truth
- Every write-capable actor needs a claim (no autonomous write without one)
- No claim without file allowlist + denylist
- No claim without stop conditions

### Layer 2 — Conflict resolution

Add explicit overlap rules (Claude.ai catch — design currently has detection but not resolution):

- **First valid active claim by GitHub timestamp wins.**
- Later overlapping claim must: choose non-overlapping scope, OR wait for the first claim to close, OR escalate to coordinator/maintainer for explicit reassignment.
- High-risk files always require coordinator approval on overlap, regardless of timestamp.

**High-risk files** (always require coordinator approval on any overlap):
- `memory/**`
- `docs/active-trajectory.md`
- `.github/**`
- `package.json`
- `bun.lock` and other lockfiles
- generated indexes (e.g. `docs/backlog/github-issue-index.md`)
- ruleset / security / billing docs

### Layer 3 — Mechanical enforcement (load-bearing)

**Do not declare the protocol operational until CI checks exist.** Without enforcement, the claim protocol relies on agent discipline — which the factory has already proved doesn't hold without mechanical guard (parallel-agent collision incident).

Required CI checks before protocol activation:
- `PR changed files ⊆ claim allowlist` (mechanical)
- `PR changed files ∩ claim denylist = empty` (mechanical)
- `claim exists for write-capable PR` (mechanical)
- `active claim is not expired` (mechanical)
- `high-risk overlap check passes` (mechanical)
- `actor role has declared capability` (mechanical, against `agents/project-agents.yaml`)

Claim protocol without enforcement = same shape as "bare main in automation" rule before its linter — chronic risk without mechanical guard.

### Layer 4 — Declarative topology

After claims are proven, add the project-level role definition file.

**Path**: `agents/project-agents.yaml` (visible-path preference per Claude.ai catch — `.zeta/agents.yaml` is sometimes excluded from grep tools / IDE search / linter scope, and the agent topology is meant to be HIGHLY visible).

**Schema** (Gemini correction — boolean capability fields, not string parsing, so CI can enforce mechanically):

```yaml
roles:
  typescript-steward:
    pinned: true
    capabilities:
      can_read: true
      can_review: true
      can_patch: true
      can_write_worktree: true
      can_push_branch: true
      can_open_pr: true
      can_merge_pr: false
      can_mutate_authority: false
    file_scopes:
      allowlist:
        - "tools/**/*.ts"
        - "docs/best-practices/languages/typescript.md"
        - "package.json"
        - "bun.lock"
      denylist:
        - "memory/**"
        - "docs/active-trajectory.md"
        - ".github/**"

  coordinator:
    pinned: true
    human_required: true  # Deepseek catch — until autonomous claim-board management proves safe, the coordinator role is human-filled.
    capabilities:
      can_read: true
      can_review: true
      can_patch: true
      can_write_worktree: true
      can_push_branch: true
      can_open_pr: true
      can_merge_pr: false      # merge requires explicit policy gate
      can_mutate_authority: false
```

### Layer 5 — Multi-harness dry run

First dry run:
- One non-coordinator harness (likely a Windows peer CLI)
- Read-only first → patch-only → isolated docs-only write → PR → no merge authority
- Success signal: a fresh maintainer/agent can start a peer lane, avoid overlap, open a PR, survive cold start, close the claim without corrupting another lane.

Windows peers require extra bootstrap before write mode (Ani + Deepseek + Claude.ai catches):
- WSL vs Git Bash vs native shell **declared explicitly**
- Line ending policy **declared** (`lf` or `crlf`)
- Path normalization behavior **declared**
- Case-sensitivity risk acknowledged (Windows is case-insensitive by default; macOS varies; Linux is case-sensitive — silent file-collision bugs that don't appear until cross-platform sync)
- Toolchain check passes
- A `WINDOWS.md` bootstrap file (or section in `AGENTS.md`) must exist before any Windows write-capable lane opens.

Example branch namespace: `aaron-windows/codex/docs-best-practices-2026-04-29`

**Branch-name slash caveat** (Claude.ai catch): GitHub branch protections operate on path patterns, and slashes in branch names interact with protection rules in non-obvious ways. Verify that `aaron/codex/budget-cadence-2026-04-29` doesn't accidentally inherit protections meant for top-level patterns. Alternatives: use `-` as the separator for the maintainer/actor/lane prefix and `/` only for the date suffix, or use a dedicated `lane/` namespace prefix.

## v2 review-driven additions (2026-04-29 multi-AI review)

Five reviewers (Ani, Claude.ai, Gemini, Alexa, Deepseek) reviewed v1; Amara synthesized v2. The following additions are load-bearing and must be incorporated before any layer past Layer 0 is operational.

### Actor identity (stable, separate from session identity)

**Status**: *Required before multi-maintainer use.* Currently undefined — must be specified before Layer 1 operationalizes.

The v1 design said "no autonomous write without a claim; no claim without a role; no role without declared capability." But what *is* an actor's identity? Is `aaron-windows/codex` one identifiable actor across many sessions, or a new actor per session?

**Claude.ai catch — future-policy shape**: actor IDs are stable; sessions are temporary.

- Every actor has a stable `actor_id` (e.g. `aaron-mac-claude-code-coordinator`, `aaron-windows-codex-peer`).
- Every session has a temporary `session_id`.
- Claims reference both `actor_id` (for revocation + audit) and `session_id` (for current-state debugging).
- Revocation operates on `actor_id` (across all sessions of that actor).
- Audit logs the actor_id history across sessions; trust calibration uses prior actor behavior, not session-bound state.

This matters for: revocation (compromised actor → immediate downgrade to `review_only` across all its sessions), audit (who did what across time), trust calibration (prior good behavior factors into capability grants).

### Compromised-actor recovery — kill switch (Claude.ai catch)

**Status**: *Required before write-capable autonomous peers operate.* Not yet implemented.

If a peer CLI is compromised — prompt-injected, deliberately misaligned, or just buggy — what's the recovery path? v1 had no actor-level kill switch.

**Future-policy shape** (must exist before any write-capable autonomous peer is granted): any sufficiently-authorized maintainer can immediately downgrade an actor's capability set to `review_only`, with the reduction taking effect at the next claim check.

On downgrade:
- No new write claims accepted from the actor.
- Active write claims become blocked (state: `actor-suspended`).
- Open PRs labeled `actor-suspended`; coordinator reviews before continuing.
- Audit log records the downgrade reason and authorizing maintainer.

Without this, a compromised write-capable actor can produce many PRs before being caught, and the only recovery is to manually close each one. **Layer 1 (claims) cannot operationalize write-capable actors until this kill switch exists.**

### Maintainer governance — open question (Claude.ai catch)

The v1 design distinguishes humans from harnesses but doesn't say what makes someone a maintainer with authority to grant claims. Currently it's Aaron.

Open questions for future rounds (do not solve in this design):
- How does a new maintainer get added?
- Who can revoke a maintainer?
- Can maintainers grant capabilities to other maintainers, or only to actors?
- How is the set of maintainers itself governed?

**For now** (provisional rule until governance lands): Aaron remains final authority for maintainer/capability governance until explicit governance lands. Other maintainers may operate under delegated authority (pinned role with `human_required: false` and capability bounded by Aaron's grant), but cannot themselves grant maintainer status.

### Emergency-action fast path (Claude.ai catch)

**Status**: *Future policy* — design specified here so it doesn't get reinvented; not active until claim infrastructure ships.

What happens when an actor needs to act before claim infrastructure is ready, or in a recoverable but urgent situation?

**Future-policy shape** — once claims are operational, an actor may take a write or destructive action without a pre-existing claim ONLY IF all are true:
1. The action is **reversible** (no force-push, no deletion, no authority mutation, no irreversible data loss).
2. The actor immediately creates a post-hoc claim referencing the emergency action.
3. The maintainer / coordinator is notified within a defined window (e.g. 1 hour).
4. **No emergency exception for irreversible loss**: authority mutation, ruleset/secret/billing change, force-push, ref deletion, or ambiguous data loss have NO emergency exception — must always wait for explicit grant, even in urgent situations.

Without the explicit emergency case, urgent work either violates the protocol or gets blocked by it — neither outcome is good.

### "Buddy" reframe (Ani catch)

v1 said *"Buddy does not mean powerless."* Ani flipped to:

> *"Buddy does NOT mean trusted. Buddy means 'can advise, may be granted power with explicit claim and isolation.'"*

Default-down framing: buddy is review-only by default. Power requires explicit grant + isolation, not default trust.

### No-silent-demotion rule for pinned roles (Claude.ai catch)

**Status**: *Active doctrine for role language now; operational enforcement future.*

A free role can be promoted to pinned through explicit governance review, but a pinned role **cannot be silently demoted** to free. Demotion requires explicit governance decision because pinned roles carry accumulated context (memory, doctrine, judgment history) that is lost on demotion.

Without this rule, "pinned" can drift to "named" over time and the durability guarantee weakens.

This is doctrine immediately; mechanical enforcement (rejecting silent-demote PRs in CI) lands with Layer 3 / Layer 4.

### Hidden-path concerns for declarative topology (Claude.ai catch)

`.zeta/agents.yaml` is a hidden directory. Hidden directories sometimes get excluded from grep tools, IDE search, and linter scope by default. The agent topology file is meant to be **highly visible** (it's the source of truth for capability questions).

**Preferred path**: `agents/project-agents.yaml` (visible at top-level; harder to miss in tools and reviews).

### CI enforcement is the load-bearing mechanism (Claude.ai + Deepseek catch)

The v1 design said "CI should eventually enforce..." This is the load-bearing enforcement mechanism. Without it, the entire claim protocol relies on agent discipline — which the factory has already established doesn't hold without mechanical enforcement.

**Rule**: the protocol is NOT operational until Layer 3 (CI enforcement) is in place. Layer 4 (declarative topology) and Layer 5 (dry-run) cannot be activated without Layer 3.

### Coordinator role is human-filled (Deepseek catch)

The `.zeta/agents.yaml` schema example explicitly marks coordinator with `human_required: true`. The coordinator role allocates claims, prevents file overlap, and stops unsafe agents. Until the system can prove autonomous claim management without drift, the coordinator role is human-filled.

When this can change: a successful Phase 2 dry-run that demonstrates autonomous claim-board management (no overlap drift, no claim-protocol violations, no unauthorized capability promotion) over a defined observation window. Until then, human required.

### Regime-change concern flagged (Claude.ai catch)

This design is the right *first* answer to the multi-maintainer question. The *complete* answer probably involves changes to:
- The alignment trajectory measurement (currently calibrated to single-maintainer regime)
- The bead system
- The consolidation gates
- The escrow protocol

These are beyond this design's scope. Flagged here so future rounds know the multi-maintainer transition will surface them.

The factory has been a single-maintainer-multi-agent system this whole time. With multiple maintainers, no one person reads everything; trust has to be distributed across the substrate itself rather than concentrated in a single reviewer. That's a different architectural problem than the orchestra design currently addresses.

## V2 review constraints — not operational yet

The v2 corrections above are **doctrine constraints**, not operational implementation. To prevent false-progress drift, the following constraints are explicit:

- **Do not land monolith** — the orchestra is a regime-change design, not a quick config file. Each layer (0 → 5) is its own PR with its own validation gate.
- **Conflict resolution required before claims become operational** — first-claim-wins-by-timestamp + high-risk-coordinator-approval is the rule, but it's not enforced anywhere yet.
- **CI enforcement required before claims become trusted** — Layer 3 cannot be deferred indefinitely. Without `PR-changed-files ⊆ allowlist` mechanically enforced, the protocol is agent discipline (which has already been proven insufficient).
- **Actor identity and revocation required before multi-maintainer use** — stable actor IDs separate from session IDs; kill-switch downgrade path. Currently undefined.
- **Maintainer governance unresolved** — who can add/revoke maintainers, who can grant capabilities, how the maintainer set is itself governed. Aaron is provisional sole authority until governance lands.
- **Windows write mode requires bootstrap/preflight** — `WINDOWS.md` (or AGENTS.md section) declaring shell, line endings, path normalization, case-sensitivity acknowledgment. Not yet present.
- **Coordinator remains human-filled until proven safe** — `human_required: true` on the coordinator role. Cannot be flipped without successful dry-run demonstrating autonomous claim-board management without drift.
- **Layer 3 enforcement cannot be deferred indefinitely** — flagged here so future rounds don't quietly defer it past the point where the protocol gets used in earnest.

## What this doctrine memory file is (and is NOT) — precision per Amara v2

**Allowed framing**:
- ✅ Zeta Agent Orchestra **doctrine captured**.
- ✅ Cold-start substrate updated.
- ✅ Capability/role/claim/isolation **vocabulary preserved**.
- ✅ Five-AI review convergence: "approved directionally; do not land as monolith."
- ✅ Phase 1 implementation/design task created (task 324).

**Not allowed framing** (prevents false-progress drift):
- ❌ NOT "claim protocol operational."
- ❌ NOT "multi-harness mode ready."
- ❌ NOT "agents.yaml accepted."
- ❌ NOT "conflict-resolution rules implemented."
- ❌ NOT "CI enforcement exists."
- ❌ NOT "Windows peer mode safe."
- ❌ NOT "multi-maintainer governance solved."

This file is **doctrine memory**, NOT the protocol. The next PR (per task 324) lands the actual Layer 0 + Layer 1 spec files:

- `docs/ops/patterns/project-agent-topology.md` — Layer 0 doctrine + capability taxonomy + isolation rule + pinned/free/buddy roles
- `docs/ops/coordination/claims/README.md` — Layer 1 claim schema + lifecycle + conflict resolution + actor identity + compromised-actor downgrade + emergency path
- `docs/ops/runbooks/start-agent-claim.md` — how to start one claim safely, the read-only → patch → isolated-write → PR ladder, stop conditions, Windows preflight checklist
- Optional: `agents/project-agents.example.yaml` (NOT active config; `.example.` suffix to make non-operational nature unambiguous; prefer visible `agents/project-agents.yaml` over hidden `.zeta/agents.yaml` once it becomes live config)

Each subsequent layer (2 → 3 → 4 → 5) is its own PR with its own validation gate. Layer 3 (CI enforcement) is the activation gate — nothing past it is operational without mechanical enforcement.

## Composes with

- `memory/feedback_parallel_agents_need_isolated_worktrees_coordinator_owns_main_aaron_amara_2026_04_29.md` — sibling rule landed same day; the operational discipline this orchestra encodes structurally
- `memory/feedback_best_practices_evidence_lineage_survival_substrate_aaron_amara_2026_04_29.md` — sibling rule; the orchestra lives inside the broader best-practices discipline
- `memory/feedback_lfg_only_development_flow_acehack_is_mirror_aaron_amara_2026_04_29.md` — same-day topology decision; LFG is the canonical PR/coordination repo
- task 320 (Zeta Issue Anchors) — issue-anchor design is a sibling pattern; claims are a generalization (anchors persist; claims expire)
- task 323 (per-tool/language expert skills) — pinned roles ARE the expert skills

## Trigger memory

Aaron 2026-04-29 sequence:

1. Asked about cross-harness memory ("does that durable memory thing work in other CLI harnesses or do they need a canonical folder?").
2. Confirmed the in-repo `memory/` is canonical; harness-specific bootstrap pointers are the missing piece.
3. Pushed Amara, who returned the multi-maintainer multi-peer protocol packet.
4. Then expanded into the project-level multi-harness agent orchestra: *"stop thinking in terms of 'Claude subagent' versus 'Codex CLI' versus 'Gemini buddy' versus 'Windows harness.' Those are implementation details. The project should define a declarative agent orchestra, and every harness reads the same project-level definition."*

Amara's three carved sentences (verbatim):

> *"Humans own intent. Harnesses run actors. Roles define authority. Claims bind work. GitHub coordinates now. Git preserves forever."*

> *"Subagents and buddy harnesses are both worker actors; the difference is runtime boundary, not coordination model."*

> *"Do not coordinate by personality name. Coordinate by role, capability, claim, and isolation."*

The compact rule:

```text
Review peers can be loose.
Write peers need isolated worktrees.
Push peers need claims.
Merge peers need policy.
Authority peers do not exist by default.
```

The names: **Zeta Agent Orchestra** or **Project Agent Topology**.
