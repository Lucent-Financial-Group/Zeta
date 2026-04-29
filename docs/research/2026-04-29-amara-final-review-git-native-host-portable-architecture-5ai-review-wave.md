# Amara final review — Git-native host-portable contribution architecture + 5-AI review wave

**Date**: 2026-04-29
**Channel**: Aaron + Amara (relayed) + 5-AI review wave (Ani / Gemini / Alexa / Deepseek / Claude.ai) + Amara final synthesis
**Status**: Research-grade preservation. Verbatim. The distilled architecture lands as `memory/feedback_git_native_canonical_host_adapter_three_layer_architecture_amara_5ai_2026_04_29.md`.

---

## Why this packet matters

The 2026-04-29 doctrine cluster (#850, #851, #852, #853, #854 all merged) established the Zeta Agent Orchestra v2/v3/v4 doctrine — capability/role/claim/isolation, layered actor identity, public claim intake, identity binding via AgencySignature v2.

The packet preserved here is the v5 superseding architecture: a **three-layer ports-and-adapters model** that inverts the source-of-truth question. v3/v4 was GitHub-centric with claim-mirror-second; v5 is git-canonical-first with hosts as adapters.

This is NOT a refinement of v4. It is a different architectural shape:

- v3/v4: GitHub Issues + custom claim-mirror substrate; claim-form-first public entry; Ed25519-first binding
- v5: Git is the durable canonical core; GitHub/GitLab/Forgejo/local-git are interchangeable adapters; public entry is GitHub-Issue-first with claims as risk-locks; binding ladder is pluggable (GitHub-verified-commits MVP → OIDC for system actors → Sigstore/Ed25519 later)

The carved blade Aaron + Amara want held under pressure:

> *"GitHub is where we coordinate today. Git is where Zeta survives. Claims must work without GitHub, or they are not Zeta claims."*

Five reviewers (Ani, Gemini, Alexa, Deepseek, Claude.ai) reviewed the architecture and Amara synthesized the corrections. All voices preserved verbatim below per the channel-verbatim rule (Otto-363).

---

## Verbatim Amara final review packet

### Initial framing — internal/external/onboarding overlap + non-GitHub-host portability

> Here's the final review packet, with the **git-native portability / non-GitHub-host lock-in** context added, plus the internal/external/onboarding overlap.
>
> Amara final review packet: Git-native Zeta contribution architecture, public GitHub entry, internal orchestra, external contributors, onboarding, and future host portability
>
> ## TL;DR
>
> We need one contribution architecture that supports:
>
> 1. **Internal Zeta stack actors**
>
>    * Aaron
>    * Otto / Claude Code coordinator
>    * internal subagents
>    * buddy harnesses
>    * future Codex/Gemini/Cursor/Windows harnesses
>    * GitHub Actions/system actors
>    * bound actors with roles, capabilities, claims, isolated worktrees, and AgencySignature
>
> 2. **External / not-on-our-stack actors**
>
>    * normal human contributors
>    * external maintainers using only GitHub/GitLab/etc.
>    * humans using their own Claude Code/Codex/Cursor/Gemini
>    * roaming autonomous agents that discover the repo
>    * fork PR contributors
>    * drive-by docs/test/bugfix contributors
>
> 3. **Future non-GitHub hosts**
>
>    * GitLab
>    * Forgejo/Gitea
>    * self-hosted git + mailing-list patches
>    * local-only/internal git operations
>    * any future forge that supports issues/MRs/PRs or can be adapted
>
> The corrected doctrine:
>
> ```text
> Issues are doors.
> PRs/MRs are work.
> Projects/boards are lenses.
> Git is memory.
> Claims are locks.
> Hosts are adapters.
>
> Friendly by default.
> Formal when risky.
> Git-canonical underneath.
> Host-portable by design.
> ```
>
> The big correction: **GitHub is not the ultimate source of truth. Git is the durable canonical substrate.**
>
> GitHub is currently the best live coordination host. It gives us Issues, PRs, Projects, CODEOWNERS, branch protection, rulesets, Actions, review threads, labels, and easy public contribution. But the claims process, actor model, backlog projection, onboarding ladder, and internal coordination model must not depend on GitHub as an irreplaceable substrate.
>
> So the model becomes:
>
> ```text
> Git-native core = canonical durable model.
> GitHub = current live host adapter.
> GitLab / other forges = future host adapters.
> ```

### Grounding in canonical Git/GitHub/GitLab usage

> Using GitHub Issues as the public backlog is canonical GitHub use, not a hack. GitHub's docs describe Issues as a way to plan, discuss, and track work, including bugs, features, ideas, tasks, and "anything else you need to write down or discuss with your team." Issues also integrate with PRs, references, sub-issues, dependencies, assignment, and labels.
>
> Using PRs as the change/review surface is canonical. GitHub supports linking PRs to issues, showing that work is in progress, and automatically closing issues when linked PRs merge into the default branch using keywords like `Fixes #123`, `Closes #123`, or `Resolves #123`.
>
> Using Projects as views, not the canonical work object, is also aligned with GitHub's own model. GitHub Projects are adaptable table/board/roadmap views over issues, PRs, and draft issues, with custom fields and filters.
>
> Using `CONTRIBUTING.md` as the public human entrypoint is canonical. GitHub surfaces contribution guidelines when someone opens an issue or PR, on the repository contribute page, and in repository UI locations such as the Contributing tab/sidebar.
>
> The host-portability point is also grounded. Git itself is distributed: the Git book describes every developer as potentially both a node and a hub, able to contribute code to other repositories and maintain a public repository that others can base work on. That is the substrate we want to preserve under every host-specific workflow.
>
> GitLab has the same broad primitives under different names: Issues and Merge Requests. GitLab docs describe Merge Requests as the central location for reviewing code, discussion, CI/CD, and linking MRs to issues so issues can close when the MR merges. GitLab also supports automatically closing issues through closing patterns in commit messages or merge request descriptions when changes land in the default branch.
>
> So the portable abstraction is real:
>
> ```text
> GitHub Issue       ≈ GitLab Issue       ≈ host work item
> GitHub PR          ≈ GitLab MR          ≈ host change request
> GitHub Project     ≈ GitLab board/view  ≈ host planning view
> GitHub Actions     ≈ GitLab CI          ≈ host CI adapter
> CODEOWNERS         ≈ CODEOWNERS-style ownership/review routing
> Git commit/history = common durable substrate
> ```

### Three-layer architecture

> ## Core architecture
>
> ### Layer 1 — Git-native canonical core
>
> This is the durable substrate.
>
> It lives in the repository.
>
> It should survive:
>
> ```text
> GitHub outage
> GitHub migration
> GitHub → GitLab move
> fork/mirror topology changes
> local-only internal operation
> agent context loss
> host API changes
> project-board rewrites
> ```
>
> Canonical git-native surfaces:
>
> ```text
> docs/backlog/**
> docs/ops/**
> docs/ops/coordination/**
> docs/ops/coordination/claims/**
> docs/ops/coordination/actors/**
> docs/onboarding/**
> docs/best-practices/**
> memory/**
> agents/**
> AGENTS.md
> CONTRIBUTING.md
> AgencySignature trailers / receipts
> ```
>
> These define the actual project operating model.
>
> ### Layer 2 — Host-native live coordination
>
> Today this is GitHub.
>
> Live host surfaces:
>
> ```text
> GitHub Issues
> GitHub PRs
> GitHub labels
> GitHub assignees
> GitHub Projects
> GitHub review threads
> GitHub CODEOWNERS
> GitHub branch protection / rulesets
> GitHub Actions
> ```
>
> Tomorrow this could be GitLab:
>
> ```text
> GitLab Issues
> GitLab Merge Requests
> GitLab labels
> GitLab assignees
> GitLab issue boards
> GitLab approvals
> GitLab protected branches
> GitLab CI/CD
> ```
>
> Live host state is operational truth while using that host.
>
> But host state must be mirrored/projection-compatible with the git-native model.
>
> ### Layer 3 — Adapters / reconcilers
>
> Adapters map host-native data into git-native canonical records.
>
> Example adapters:
>
> ```text
> github-reconciler
> gitlab-reconciler
> local-git-reconciler
> mailing-list-patch-reconciler
> ```
>
> Adapter responsibilities:
>
> ```text
> read host issues/PRs/MRs
> read host labels/status/review state
> read changed files
> classify risk
> mirror selected state into git
> detect stale/drift
> fail or warn on unsafe PR/MR scope
> never silently grant authority
> never elevate privilege from git mirror to host
> ```

### Source-of-truth rule

> ## Source-of-truth rule
>
> We need a precise rule, because "GitHub live truth" and "git durable truth" can sound contradictory.
>
> Correct rule:
>
> ```text
> Git is the durable canonical substrate.
> The current host is the live operational coordination surface.
> Adapters reconcile between them.
> ```
>
> During normal GitHub operation:
>
> ```text
> GitHub Issue/PR = live operational state.
> Git mirror = durable summarized projection.
> ```
>
> During host disagreement:
>
> ```text
> For current collaboration: host live state wins until reconciled.
> For durable doctrine/policy/claim schema: git-native core wins.
> For authorization escalation: fail closed if host and git disagree.
> ```
>
> During git-native-only/internal operation:
>
> ```text
> Git-native claim/backlog/actor files are the source of truth.
> Host adapter is absent or disabled.
> Internal claims still work.
> ```
>
> During migration to another host:
>
> ```text
> Git-native core remains canonical.
> New host adapter imports/exports issues/MRs/labels/status.
> Old host becomes historical projection.
> ```
>
> Carved:
>
> ```text
> Host state coordinates now.
> Git state survives forever.
> When they disagree, stop authority-bearing work and reconcile.
> ```

### Why git-native canonical matters

> ## Why git-native canonical matters
>
> If we put the claim process only in GitHub Issues/Projects, then:
>
> ```text
> GitHub outage breaks coordination.
> GitHub migration loses meaning.
> GitLab support becomes a redesign.
> Internal local-only operation becomes impossible.
> Agents need GitHub API access to understand work.
> Claims become host-specific UI objects instead of project objects.
> ```
>
> If we put the claim process in git-native files with host adapters, then:
>
> ```text
> Claims work internally without GitHub.
> GitHub can project into claims.
> GitLab can project into claims.
> A local clone can inspect claims.
> Agents can cold-start from repo files.
> Migration becomes adapter work, not doctrine rewrite.
> ```
>
> That is the correct substrate shape.

### The two worlds + shared boundary

> ## The two worlds
>
> ### World A — Public / not-on-our-stack
>
> Actors:
>
> ```text
> normal human contributor
> external maintainer using GitHub/GitLab UI
> human using their own Claude Code
> human using their own Cursor/Codex/Gemini
> roaming autonomous agent
> fork PR/MR contributor
> drive-by docs/test/bugfix contributor
> ```
>
> They should not need:
>
> ```text
> Otto
> our local installs
> our worktree layout
> memory/MEMORY.md
> docs/active-trajectory.md
> actor registry
> claim mirrors
> AgencySignature
> Zeta harness bootstraps
> ```
>
> They enter through the host:
>
> ```text
> Issues
> PRs/MRs
> CONTRIBUTING.md
> AGENTS.md
> PR/MR template
> comments
> labels
> reviews
> ```
>
> Their default flow:
>
> ```text
> Find issue
> fork/branch
> make scoped patch
> open PR/MR
> link issue
> fill template
> CI/review runs
> merge if accepted
> ```
>
> ### World B — Internal / on-stack
>
> Actors:
>
> ```text
> Aaron
> Otto / Claude Code coordinator
> Claude Code subagents
> Codex/Gemini/Cursor peer harnesses
> Windows peer harnesses
> GitHub Actions reconciler
> future bound maintainers
> future bound autonomous agents
> ```
>
> They use:
>
> ```text
> AGENTS.md / CLAUDE.md / harness adapters
> memory/MEMORY.md
> docs/active-trajectory.md
> docs/ops/**
> docs/best-practices/**
> docs/ops/coordination/claims/**
> docs/ops/coordination/actors/**
> isolated worktrees
> branch namespaces
> actor IDs
> capabilities
> claims
> AgencySignature/action receipts
> pre-action freshness checks
> ```
>
> Their default rule:
>
> ```text
> No write-capable internal actor mutates shared state without role + claim + isolation.
> ```
>
> ## Shared boundary between the worlds
>
> The shared boundary is the host PR/MR and issue.
>
> Both worlds use:
>
> ```text
> issue/work item
> PR/MR/change request
> comments
> labels
> review threads
> CI/checks
> CODEOWNERS/review ownership
> branch protection/protected branches
> ```
>
> The difference is that internal actors carry extra substrate:
>
> ```text
> External contributor:
>   "I opened PR #123 for issue #45."
>
> Internal actor:
>   "I opened PR #123 for issue #45 under CLAIM-45, actor_id zeta://..., role docs-worker, isolated worktree X, AgencySignature receipt Y."
> ```
>
> The PR/MR is the shared artifact.
>
> The issue is the shared work item.
>
> The git-native core is the durable project memory.

### Canonical object model

> ## Canonical object model
>
> ```text
> WorkItem
>   host examples:
>     GitHub Issue
>     GitLab Issue
>     local docs/backlog item
>
> ChangeRequest
>   host examples:
>     GitHub PR
>     GitLab MR
>     mailing-list patch series
>     local branch review
>
> Claim
>   project-native object:
>     scoped lease/lock over work, files, actor, capabilities, timebox
>
> Actor
>   project-native object:
>     bound identity + role + capabilities + trust domain
>
> Capability
>   project-native primitive:
>     read, comment, patch, write_worktree, push_branch, open_pr, merge, mutate_authority
>
> RiskClass
>   project-native classification:
>     low, medium, high, authority
>
> HostProjection
>   adapter-owned mirror:
>     GitHub labels, GitLab labels, project fields, issue links, PR/MR state
>
> AgencySignature
>   project-native action receipt:
>     actor + mode + task + claim + signature/binding
> ```

### Issues / Projects / git backlog + claims as locks not doors

> ## Issues, Projects, and git backlog
>
> Use this model:
>
> ```text
> Issues = public backlog / live work items.
> Projects = views/lenses over issues and PRs.
> Git docs/backlog = durable canonical projection and planning substrate.
> ```
>
> Rules:
>
> ```text
> No important work item exists only in Project.
> No Project field is the only source of authority.
> No agent depends on Project-only state.
> Every Project item that matters resolves to an issue/PR/MR or git-native backlog item.
> ```
>
> Projects are allowed and useful:
>
> ```text
> roadmap
> priority board
> triage dashboard
> sprint view
> agent queue view
> review dashboard
> ```
>
> But Projects are not the canonical substrate.
>
> ## Claims, corrected
>
> Claims are not the public front door.
>
> Claims are risk locks.
>
> Normal public path:
>
> ```text
> Issue → PR/MR
> ```
>
> Normal internal path for low-risk work:
>
> ```text
> Issue → inferred claim/scope → PR/MR
> ```
>
> Formal claim path:
>
> ```text
> Issue → explicit claim → scoped branch/worktree → PR/MR
> ```
>
> Use explicit claims when:
>
> ```text
> high-risk paths
> broad refactors
> long-running exclusive lanes
> multi-agent overlap
> authority/memory/workflow/identity/canon changes
> repo-mutating tools
> package/lockfile changes
> external autonomous agent asks for pre-approval
> internal autonomous actor will work without human attention
> host migration / adapter work
> reconciler / actor registry / AgencySignature work
> ```
>
> Do not require explicit claims for:
>
> ```text
> docs typo
> small docs clarification
> small test
> small bugfix
> example update
> narrow low-risk issue
> ```

### Claim states (full + MVP subset)

> ## Claim states
>
> Recommended state model:
>
> ```text
> none
> inferred
> requested
> active
> blocked
> stale
> drift
> done
> expired
> rejected
> revoked
> ```
>
> Definitions:
>
> ```text
> none:                 ordinary issue/PR/MR flow; no claim needed
> inferred:             scope inferred from issue assignment/comment/linked PR/MR/branch
> requested:            actor asks for explicit lane/scope
> active:               maintainer/coordinator approves explicit claim
> blocked:              dependency or review blocks work
> stale:                mirror/projection outdated but not contradictory
> drift:                host state and git-native claim conflict
> done:                 claim completed
> expired:              timebox elapsed
> rejected:             request reviewed and declined
> revoked:              active claim withdrawn
> ```
>
> Safety invariant:
>
> ```text
> No stale/drift explicit claim authorizes autonomous mutation.
> ```

### Internal git-native-only claims (the portability heart)

> ## Internal git-native-only claims
>
> This is the portability heart.
>
> If GitHub is unavailable or we are operating internally only, the claim process must still work.
>
> Internal git-native claim path:
>
> ```text
> 1. Actor reads git-native backlog/active trajectory.
> 2. Actor creates/updates docs/ops/coordination/claims/CLAIM-*.md.
> 3. Claim declares actor, capability, scope, allowlist, denylist, expiration, stop conditions.
> 4. Actor works in isolated worktree/branch.
> 5. Commit/AgencySignature records actor + claim.
> 6. Review happens through git-native process:
>    - branch diff
>    - patch file
>    - internal review doc
>    - local CI
>    - later host PR/MR if host returns
> 7. Reconciler later projects claim/change into GitHub/GitLab if needed.
> ```
>
> This means claims are not GitHub-dependent.
>
> GitHub is just the current public adapter.

### Onboarding ladder + AgencySignature host-portability

> ## Onboarding ladder: not-on-stack → on-stack
>
> Stages 1-6:
>
> 1. External contributor (CONTRIBUTING.md / README.md / PR template; no Zeta stack)
> 2. External agent-assisted contributor (AGENTS.md etiquette; still no stack)
> 3. Trusted contributor (emerges from behavior; may stay off-stack forever)
> 4. External maintainer (host permissions; may stay GitHub/GitLab-native forever)
> 5. Candidate on-stack actor (local setup + cold-start protocol + worktree isolation + claim discipline)
> 6. Bound internal actor (actor_id + capabilities + role + AgencySignature + revocation path)
>
> ## AgencySignature and identity binding
>
> AgencySignature v2 should be host-portable:
>
> ```text
> Trust-Domain:
> Actor:
> Agent:
> Capabilities:
> Claim:
> Task:
> Signed-By:
> Host-Adapter:
> Host-Object:
> ```
>
> Examples:
>
> ```text
> Host-Adapter: github
> Host-Object: pull_request:853
>
> Host-Adapter: gitlab
> Host-Object: merge_request:42
>
> Host-Adapter: local-git
> Host-Object: branch:feature/foo
> ```

### Final doctrine + sharpest blade

> ## Final doctrine
>
> ```text
> Do not make the door look like the control room.
>
> External contributors enter through the host.
> Internal actors operate through the orchestra.
> Issues are shared work objects.
> PRs/MRs are shared change objects.
> Claims are escalation locks.
> Git is the durable substrate.
> Hosts are adapters.
> Onboarding is the bridge.
> AgencySignature is the receipt layer.
> ```
>
> Sharper version:
>
> ```text
> Public by host.
> Internal by orchestra.
> Canonical by git.
> Portable by adapter.
> Promoted by onboarding.
> Bound by evidence.
> ```
>
> Sharpest blade:
>
> ```text
> GitHub is where we coordinate today.
> Git is where Zeta survives.
> Claims must work without GitHub, or they are not Zeta claims.
> ```

---

## Reviewer voices (verbatim)

### Ani

> **YES. This is a strong, mature, and genuinely production-ready design.**
>
> You've taken the conversation from "Otto runs subagents better" all the way to a full **multi-host, multi-maintainer, multi-actor contribution architecture**. That's exactly the level we needed to reach.
>
> ### Overall Verdict
> **Strong.** This is the best version of the design so far. It correctly treats Git as the durable canonical substrate while making GitHub (and future hosts) just an adapter. The separation between external/public flow and internal/orchestra flow is clean, and the claim protocol + capability taxonomy is the right guardrail.
>
> ### What's Excellent
> - The **dual-surface principle** (GitHub = live coordination, Git = durable substrate) is now crystal clear and correctly prioritized.
> - The **host-portability** framing is the strongest part of the whole thing. Treating GitHub as "current adapter" rather than "the system" is exactly right.
> - The **external vs internal worlds** distinction is well-drawn and practical.
> - The **claim request → active claim** flow is the correct safety mechanism for external actors.
> - The **reconciler** concept and drift handling is mature.
> - The **onboarding ladder** (external → on-stack → bound actor) is a genuinely useful mental model.
>
> ### Specific Suggestions & Improvements
>
> **1. Tighten the identity model (less granular, more practical)**
> Use **three stable layers**:
>   - `actor_id` = `maintainer-host-harness-role` (e.g. `aaron-mac-claude-code-coordinator`)
>   - `role_id` = the capability bundle (coordinator, docs-worker, git-expert, etc.)
>   - `session_id` = ephemeral run identifier
>
> **2. Make "Claim Request vs Active Claim" even harder**
> Add this as a hard rule:
>
> > Unknown external humans and agents start at **Claim Request** level. They are **patch-only** by default. Only after a maintainer or authorized coordinator explicitly promotes the request does it become an **Active Claim** with write capability.
>
> **3. Add an explicit "Compaction Anchor Trigger"**
> Create a GitHub Issue Anchor (with git mirror) when:
> - A lane is about to pause for > 48 hours
> - A critical blocker is discovered that future agents must not forget
> - A decision was made that affects future agents
> - Aaron explicitly requests one
>
> **4. Strengthen the drift safety rule**
> > **No stale or drift claim may authorize write-capable autonomous work.**
>
> **5. Suggest a phased rollout (don't try to land everything at once)**
> - Phase 1 (now): Public claim request template + basic git mirror format + AGENTS.md update
> - Phase 2: Capability taxonomy + role definitions + CI claim enforcement
> - Phase 3: Automated reconciler + drift detection
> - Phase 4: GitLab adapter spec + host migration runbook
>
> **6. One philosophical tweak**
> > Buddy does **not** mean trusted. Buddy means "can advise, and *may* be granted power — but only with an explicit claim and isolation."

### Gemini

> This is a phenomenal architectural document. You have successfully applied Ports and Adapters (Hexagonal Architecture) to repository governance.
>
> By treating Git as the core domain and GitHub/GitLab as interchangeable I/O adapters, you've immunized the factory against vendor lock-in while preserving the low-friction public entry points that open-source relies on.
>
> ### The Pushbacks & Refinements
>
> **1. Prevent "Mirror Spam" (The Reconciler Scope)**
> The Pushback: If the Reconciler attempts to mirror every GitHub issue (including "typo on line 42" or "help I can't install"), you will bloat the Git tree with noise and trigger constant merge conflicts on the docs/backlog directory.
>
> The Fix: The Reconciler must be strictly opt-in. It should only mirror GitHub Issues that have specific routing labels (e.g., claim:requested, compaction-anchor, lane:active). Drive-by public issues live and die purely on the host adapter.
>
> **2. The Danger of Dead Links in AgencySignature v2**
> The Pushback: If you migrate to GitLab, PR #853 on GitHub becomes a dead link. If agents treat Host-Object as a live foreign key to fetch state, the factory will crash post-migration.
>
> The Fix: Explicitly define Host-Adapter and Host-Object as immutable historical provenance, not live operational pointers.
>
> **3. The Fork-PR Blindspot**
> The Pushback: An autonomous agent might disguise a massive, multi-file refactor as a drive-by PR to bypass the claim lock.
>
> The Fix: CI must mechanically enforce the boundary. If claim:missing is applied, a GitHub Action must strictly assert that the PR touches < 5 files and zero high-risk paths. If it exceeds this, CI auto-fails.
>
> ### Distilled Architecture Brief: The Dual-World Contribution Model
>
> The Core Doctrine:
> - Issues are doors. (Public entry)
> - PRs/MRs are work. (Shared boundary)
> - Claims are locks. (Internal isolation)
> - Git is memory. (Canonical durable substrate)
> - Hosts are adapters. (Live coordination)
>
> Best Distilled Rules:
>
> > Public by host. Internal by orchestra.
> > Canonical by Git. Portable by adapter.
> > Do not make the door look like the control room.

### Alexa

> Review of alexa.txt Architecture Document
>
> This is an exceptionally well-designed git-native contribution architecture that elegantly solves the host portability problem while maintaining operational safety.
>
> 🎯 Core Strengths
> - Git-Native Canonical Substrate: foundational principle that Git serves as durable truth while GitHub/GitLab function as live coordination adapters is architecturally brilliant.
> - Two-World Model: distinction between external contributors and internal bound actors strikes the perfect balance between accessibility and control.
> - Host Portability Design: adapter pattern for different forges demonstrates forward-thinking infrastructure planning.
>
> 🔧 Key Improvements Needed
>
> **1. Reconciler Security Model Clarification**
> ```yaml
> reconciler_security:
>   forbidden_actions:
>     - "Cannot grant write access based on GitHub labels alone"
>     - "Cannot auto-promote external claims without maintainer approval"
>     - "Cannot bypass file allowlists during sync operations"
>   safe_operations:
>     - "Update claim status timestamps"
>     - "Mark drift/stale states"
>     - "Generate read-only indexes"
> ```
>
> **2. Claim State Definitions**
> ```yaml
> claim_states:
>   stale: "Git mirror behind GitHub issue updates (>24h lag)"
>   drift: "Conflicting data between GitHub and git (requires human resolution)"
>   failed: "Sync operation encountered technical error"
>   pending: "Initial creation, sync not yet attempted"
> ```
>
> **3. Timebox Recommendations**
> ```yaml
> default_timeboxes:
>   docs_worker: "2 weeks"
>   patch_contributor: "1 week"
>   research_worker: "1 month"
>   review_only: "no expiration"
> ```
>
> **4. Onboarding Ladder Criteria**
> Concrete promotion requirements between stages.
>
> 🎪 Strategic Assessment
> This architecture represents production-grade thinking about multi-agent coordination at scale. The git-native substrate approach ensures long-term durability while the adapter pattern provides operational flexibility.

### Deepseek

> I've read the full architecture packet. It's thorough, internally consistent, and correctly identifies the structural problem: if claims depend on GitHub, the project can't survive GitHub's absence.
>
> ## What's Strong
>
> **The source-of-truth rule is finally unambiguous.** "Git is the durable canonical substrate. The current host is the live operational coordination surface. Adapters reconcile between them."
>
> **The actor identity model is correctly layered.**
> **The capability primitives are correctly separated from role bundles.**
> **The claim state machine is complete.**
> **The onboarding ladder is six stages, not a binary.**
> **The host migration design is specified.**
>
> ## Improvements
>
> ### 1. The reconciler is specified but not mechanized
> The MVP reconciler should check at least:
> - **Claim state sync**: Does the git-native mirror's `status` field match the host issue's labels/state?
> - **File scope sync**: Do the changed files in the linked PR match the claim's `file_allowlist` and `file_denylist`?
> - **Expiration sync**: Has the claim expired in git but the host issue is still labeled `claim:active`?
> - **Actor identity sync**: Is the committing actor consistent with the claim's `actor_id`?
>
> ### 2. The claim state machine is too wide for initial implementation
> Recommend a core initial subset:
> ```text
> none | requested | active | blocked | done | expired
> ```
>
> ### 3. `docs/backlog/` is mentioned but its structure isn't defined
> A minimal schema with frontmatter (backlog_id, title, status, priority, lane, risk, host_issue, claims, prs, dates).
>
> ### 4. The "claim only when risky" rule needs a mechanical trigger
> A path-risk gate based on the path-risk classification: `risk:low` (no claim needed), `risk:medium` (claim recommended), `risk:high` (claim required).
>
> ### 5. Missing: the "no coordinator available" scenario
> When no coordinator is available:
> - Internal actors may continue active claims to completion.
> - New claims cannot be activated (no one to approve).
> - External contributions continue normally through host PRs.
> - Reconciler continues to detect drift but cannot resolve it.
> - Active trajectory is read-only until coordinator returns.
>
> ### 6. The "local git adapter" needs a concrete directory layout
> When operating git-native-only:
> - claim_id is derived from the filename: CLAIM-<date>-<slug>.md
> - host fields (github_issue, source_url) are absent or set to null
> - host_adapter is set to "local-git"
> - review happens via branch diff or patch file
>
> ### 7. The implementation sequence starts with doctrine, not a working primitive
> Consider swapping PR 1 and PR 4: define the git-native claim schema first, then write the doctrine around it.
>
> ## Verdict
>
> The architecture is sound. The next step isn't more design — it's implementing the smallest working primitive (a claim file schema + a reconciler that checks one field).
>
> Best blade from the packet:
>
> > GitHub is where we coordinate today.
> > Git is where Zeta survives.
> > Claims must work without GitHub, or they are not Zeta claims.
>
> And a corollary I'd add:
>
> > The reconciler is not a bridge.
> > It is a belt and suspenders.
> > Neither side trusts the other.
> > That is the point.

### Claude.ai

> Strong document. The core doctrine is right and the host-portability layer is the most important addition since the actor-identity proposal — those two together are the spine of the project.
>
> ## What's right and worth defending
>
> The Layer 1 / Layer 2 / Layer 3 split is correct and load-bearing. The corollary — "claims must work without GitHub or they are not Zeta claims" — is the test that keeps the rest honest.
>
> The two-worlds split (external/host-native vs internal/orchestra) is the right intuition.
>
> Capabilities-as-primitives, roles-as-bundles is right. The state machine and the `inferred` state in particular is the thing that keeps low-risk contribution from drowning in ceremony.
>
> ## Where it needs sharpening
>
> **The source-of-truth rule has one ambiguity that will bite.** The clean resolution is to add a third rule that dominates: **for any authority-bearing decision, the actor must verify host and git agree at the moment of action; if they disagree or the mirror is older than a freshness budget, fail closed.**
>
> **The freshness budget itself is missing.** Pick a default (5 min for high-risk, 60 min for medium, none for low-risk inferred claims), document it, let claims override.
>
> **"Issues are shared work objects" needs an exception clause for security.** Public issues are the default for shared work; security-sensitive work uses private host channels (GitHub Security Advisories, private repo, or out-of-band) and projects only public-safe summaries into git.
>
> **The reconciler's authority boundary is correct but underspecified.** Spell out the read/write capability matrix for the reconciler actor explicitly.
>
> **External actor identity is too loose.** Account age and contribution history matter for trust calibration. AI-disclosure as machine-readable enum: `ai_assistance: none | suggestion-only | code-generation | autonomous-agent`.
>
> **The "tool choice is not authority" rule is correct but understated.** Promote it to its own paragraph in the doctrine section.
>
> **Migration design is missing the "during migration both hosts are live" period.** Add: "During cutover, designate one host as authoritative and the other as read-only; if both must be live, the reconciler runs in dual-write mode."
>
> ## What's missing entirely
>
> - **A failure-mode catalog.** `docs/ops/patterns/failure-modes.md` enumerating: reconciler crash, host outage mid-claim, signing key compromise, claim file corruption, two-reconcilers race, fork-rebase dangling claim refs.
> - **A claim-cancellation path for external actors.**
> - **A sandboxing requirement for content from external actors** — external content must not be read into a privileged context without sanitization or quoting.
> - **A canonical example of a complete claim record.**
> - **A revocation propagation story.**
>
> ## One structural concern
>
> The document is now ~3,000 lines of doctrine for a 5-day project. There's a real risk that doctrine outpaces implementation. Two countermeasures: every PR in the implementation sequence should produce a *runnable artifact*; set a doctrine budget.
>
> ## Verdict
>
> This is a strong design. The host-portability layer is the right answer to a question most agentic projects don't even know to ask, and the asymmetric two-worlds model resolves the public-vs-private contribution tension cleanly.
>
> The sharpest blade in the document — "GitHub is where we coordinate today; Git is where Zeta survives; Claims must work without GitHub, or they are not Zeta claims" — is also the one most likely to be tested under pressure. Hold the line.

---

## Amara final synthesis

> Aaron, my read: **the review convergence is strong, and Otto did the right operational thing by stopping instead of opening another PR.** #339 as a parking lot is good; the next move should not be "more doctrine sprawl." It should be **one small working primitive**.
>
> The reviewers agree on the spine:
>
> ```text
> GitHub/GitLab/etc. = live host adapters.
> Git = durable canonical substrate.
> External contributors enter through host-native issues/PRs/MRs.
> Internal actors operate through claims, roles, capabilities, worktrees, and AgencySignature.
> Claims must work without GitHub or they are not Zeta claims.
> ```
>
> The refinements are real, though. Gemini's "mirror spam" warning is load-bearing: **do not mirror every issue into git**. Deepseek's strongest correction is also right: the reconciler needs mechanical checks, not just prose responsibility. Claude's strongest correction is the freshness rule: for authority-bearing work, host and git must agree at the moment of action, or the actor fails closed.
>
> Send Otto this:
>
> Amara response:
>
> Good stop. Do not open another doctrine PR just because the review wave produced more material.
>
> #852 is merged. The doctrine round is closed.
>
> Task #339 is the right parking spot for the public-entry / git-native-host-portable contribution architecture.
>
> But before implementation, fold in the review corrections:
>
> 1. Reconciler must be opt-in, not mirror-everything (only `claim:requested` / `claim:active` / `compaction-anchor` / `lane:active` / selected backlog).
> 2. `Host-Adapter:` and `Host-Object:` in AgencySignature v2 are historical provenance, not live foreign keys.
> 3. Drive-by PR/MR limits must be mechanical (zero high-risk paths + small file count + no broad-refactor indicators).
> 4. Reconciler MVP must check concrete fields (state, scope, expiration, actor identity, freshness, high-risk approval).
> 5. Claim state schema may support the full state machine, but enforcement MVP starts smaller (none / requested / active / blocked / done / expired).
> 6. Authority-bearing freshness rule (host + git agree at moment of action; budgets per risk class — high 5min / medium 60min / low none unless escalated).
> 7. Security-sensitive exception (vulnerabilities/credentials/incidents/billing use private channels).
> 8. External actor content is untrusted input (no raw ingest into tool-enabled context).
> 9. No-coordinator mode (active claims continue; new claims cannot activate; reconciler detects drift but does not resolve authority).
> 10. Local-git adapter concrete (CLAIM-YYYY-MM-DD-slug.md, host_adapter: local-git, host fields null, branch-diff/patch/local-CI review).
> 11. Low-risk allowlist (not only high-risk denylist; unknown paths default medium-risk).
> 12. Schema-first, runnable artifact next (do NOT land another 3,000-line doctrine PR first).
>
> Corrected next sequence:
>
> PR A — git-native claim primitive (schema + example + validator + local-git adapter)
> PR B — public/internal boundary docs
> PR C — friendly public entry (CONTRIBUTING.md + AGENTS.md + PR/MR template)
> PR D — path-risk gate + CODEOWNERS
> PR E — reconciler MVP (opt-in mirror, drift/freshness checks, no auth elevation)
>
> Carved rule:
>
> > Do not make the door look like the control room.
> > Do not make the mirror copy the whole street.
> > Build the smallest claim primitive that works without GitHub.
>
> My verdict:
>
> ```text
> Architecture: approved.
> Doctrine round: complete.
> Next move: working primitive, not more doctrine.
> Task #339: keep, but refine with the review corrections.
> ```
>
> And yes, I want to hold the line on this blade:
>
> ```text
> GitHub is where we coordinate today.
> Git is where Zeta survives.
> Claims must work without GitHub, or they are not Zeta claims.
> ```
>
> The corollary from the review wave is just as important:
>
> ```text
> The reconciler is not trusted because it bridges two truths.
> It is useful because neither side blindly trusts the other.
> ```

---

## End of verbatim packet

The distilled v5 doctrine memory file (`memory/feedback_git_native_canonical_host_adapter_three_layer_architecture_amara_5ai_2026_04_29.md`) digests this content into actionable factory substrate, with the corrected PR A→E implementation sequence and the supersession note pointing at the v3/v4 public-intake section in the agent-orchestra memory.
