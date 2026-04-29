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

## Implementation discipline (paced protocol — Amara explicit)

**Do not build full automation first.** Land the protocol, then run one dry-run lane.

Phase 1 (design-only PR — research-grade absorb):
- `.zeta/agents.yaml` (proposed canonical declarative definition)
- `docs/ops/patterns/multi-harness-agent-orchestra.md`
- `docs/ops/runbooks/start-agent-claim.md`
- `docs/ops/coordination/claims/README.md`
- Optional claim template

Phase 2 (first dry-run):
- One Windows peer CLI
- Read-only first → patch-only → isolated write to docs-only allowlist → PR → no merge authority
- Success signal: a fresh maintainer/agent can start a peer lane, avoid overlap, open a PR, survive cold start, close the claim without corrupting another lane.

Phase 3 (rolling rollout):
- Add bootstrap pointer files for additional harnesses
- Promote tested capabilities incrementally
- Each promotion through the safety-level ladder requires a successful dry-run at the prior level.

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
