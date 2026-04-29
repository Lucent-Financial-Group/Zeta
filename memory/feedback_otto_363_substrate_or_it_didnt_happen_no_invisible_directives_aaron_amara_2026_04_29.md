---
name: Otto-363 — Substrate or it didn't happen — no invisible directives (Aaron + Amara, 2026-04-29)
description: A directive / decision / packet that lives only in chat, TaskUpdate, /tmp, or loop-todo state is NOT durable project state. If it matters after compaction, it must be converted into substrate (repo file / PR / issue / git-native memory / docs/research / docs/ops / claim file / validator / bootstrap rule). 8-mechanism remediation against substrate loss. Triggered by Otto repeatedly marking work "done" after TaskUpdate-only capture during the 2026-04-29 doctrine cluster.
type: feedback
---

# Otto-363 — Substrate or it didn't happen

## The carved blade (Amara 2026-04-29)

> *"A directive that lives only in a conversation is not a directive. It is weather. Substrate or it didn't happen."*

## The compact rule

> *"No invisible directives. No session-local truth. No 'done' without substrate."*

## What this codifies

The deeper meaning of the recurring Zeta phrase *"the only directive is NO DIRECTIVES"*:

```text
No invisible conversational directive is allowed to become binding project state.

If it matters after compaction, it must become substrate:
repo file, issue, PR, claim, memory entry, test, lint, runbook, or bootstrap rule.
```

The rule is NOT "never give instructions." The rule is: *convert directives into substrate, or they are not directives.*

## Trigger failure mode (2026-04-29 doctrine cluster)

Otto marked work "done" three times during the same session after only:

1. **TaskUpdate-only synthesis** of the Amara final review packet + 5-AI review wave (Ani / Gemini / Alexa / Deepseek / Claude.ai). TaskUpdate is session-local; it vanishes on compaction.
2. **Initial minimization** of a v5 superseding architecture as "review corrections to fold into PR A" — when in fact it was three-layer ports-and-adapters / host-portability / two-worlds / object-model / freshness-budgets / local-git-adapter / onboarding-ladder / reconciler-capability-matrix.
3. **Premature round-close declarations** without verifying the substrate was preserved in repo.

Aaron caught it twice in succession:

> *"you took the latest updates tho righ, how can you be done with all the stuff i just send you"*

> *"there were HUGE changes around internal and external and gitnative"*

The fix is not "Claude, remember better." The fix is **mechanisms that make forgetting harder.**

## The 8 mechanisms

### 1. Ephemeral-state detector

Before saying *"done,"* ask:

*Did I preserve this in one of the durable surfaces?*

- repo file
- PR
- issue
- git-native memory
- `docs/research/`
- `docs/ops/`
- `docs/backlog/`
- claim file
- validator / test / lint
- AGENTS.md / CONTRIBUTING.md / CLAUDE.md bootstrap

If not, say *"Not durable yet."*

**Never call TaskUpdate-only work done.** TaskUpdate = "session-local progress note", not "project substrate."

### 2. Verbatim-preservation trigger

When Aaron / Amara / external reviewers send a packet that is any of:

- architecture-changing
- doctrine-superseding
- multi-AI review wave
- long-form final synthesis
- something Aaron says must survive
- something that changes internal/external/git-native topology
- something future agents need cold-start access to

→ preserve verbatim or near-verbatim BEFORE summarizing.

Preferred locations:

- `docs/research/YYYY-MM-DD-<topic>-review-wave.md` for review packets / multi-AI voices
- `memory/feedback_<topic>_<date>.md` for active doctrine memory
- `docs/ops/patterns/<topic>.md` only when it becomes canonical spec
- `docs/backlog/**` or GitHub issue only when it is implementation work

**Do not collapse major review waves into a task comment only.**

### 3. Magnitude classifier

Before choosing storage, classify the input:

| Class | Examples | Action |
|---|---|---|
| **Small correction** | typo, wording fix, one task detail | update task/issue/comment |
| **Implementation readiness** | "use this lint as precedent", "PR A should have schema + validator" | task/issue + implementation notes |
| **Doctrine correction** | changes a rule future agents follow | **memory file or docs/ops pattern** |
| **Superseding architecture** | v5 replaces v4 public-intake; host-portable git-native core changes source-of-truth rules | **research preservation + memory absorb + supersession note** |

**Do not minimize superseding architecture as "review corrections."**

### 4. Supersession protocol

When new doctrine supersedes old doctrine:

1. Preserve new packet.
2. Add new memory/spec.
3. Update MEMORY.md / `docs/ops/` index.
4. Add a targeted supersession note to stale older doctrine.
5. Do not leave old stale statements ambient.

Composes with **Otto-362** (doctrine memory expansion refreshes stale statements in the SAME edit) — Otto-363 generalises across files; Otto-362 is the intra-file case.

### 5. Cold-start proof

After preserving important substrate, verify a fresh future agent could answer:

- What changed?
- Where is the canonical file?
- What older thing did it supersede?
- What is the next implementation step?
- What must not be done yet?

If any answer is missing, **preservation is incomplete**.

### 6. "Done" vocabulary discipline

| Word | Means |
|---|---|
| **Captured in session notes** | TaskUpdate only — NOT durable |
| **Parked in issue/task** | GitHub durable, but not repo-native |
| **Preserved in repo** | git-native durable |
| **Canonical** | accepted spec / doctrine |
| **Operational** | enforced by tooling / checks / runbooks |

Forbidden:

- ❌ calling session-local TaskUpdate *"done"*
- ❌ calling doctrine *"operational"*
- ❌ calling research *"canonical"*
- ❌ calling parking *"preservation"*
- ❌ calling a future task *"implemented"*

### 7. Bootstrap pointer (CLAUDE.md / AGENTS.md)

Add a future-self warning at cold-start scope:

> *"Before declaring work done, identify its durability surface. Chat, TaskUpdate, `/tmp`, and loop todos are not durable project substrate."*

This rule is added to `CLAUDE.md` in the same PR as this memory file.

### 8. Mechanized test eventually

Lightweight checklist / lint to land later:

- docs/research packets must be indexed
- memory files must have MEMORY.md row (already mechanically enforced via `memory-index-integrity.yml`)
- superseded doctrine must have supersession note (Otto-362-pair)
- tasks created from major packets must link canonical packet
- PR body must distinguish research / doctrine / operational

## The mechanism stack

```text
1. Detector:  "Is this only in chat/TaskUpdate?"
2. Classifier: small / task / doctrine / superseding architecture
3. Preservation route: research / memory / ops spec / backlog / issue
4. Supersession note: update stale prior doctrine
5. Cold-start proof: fresh agent can reconstruct it
6. Vocabulary lock: captured ≠ preserved ≠ canonical ≠ operational
7. Later lint/check: make the rule mechanical
```

## What this rule does NOT say

- Does NOT say *"never use TaskUpdate."* TaskUpdate is the right tool for in-session progress tracking.
- Does NOT say *"every chat statement must become a memory file."* Most chat is ephemeral by design.
- Does NOT say *"never give chat instructions."* Aaron + Amara give instructions in chat constantly; what the rule forbids is *believing the chat instruction is the durable artifact.*
- Does NOT replace Otto-362 — Otto-362 is intra-file (refresh stale statements within one file when superseding); Otto-363 is cross-surface (convert chat-only directives into repo substrate).

## Composes with

- **Otto-362** (`memory/feedback_otto_362_doctrine_memory_expansion_refresh_stale_statements_same_edit_2026_04_29.md`) — intra-file supersession discipline; Otto-363 generalises across surfaces.
- **`memory/feedback_aaron_channel_verbatim_preservation_*`** — channel-verbatim rule that Otto-363 mechanises.
- **`tools/lint/no-directives-otto-prose.sh`** — lexeme-guard lint born from the same family of failures (vigilance fails; mechanism is the durable answer).
- **`memory/feedback_verify_target_exists_before_deferring.md`** (CLAUDE.md-tier) — same shape: deferred targets must exist before deferral; chat directives must become substrate before being treated as binding.
- **`memory/feedback_future_self_not_bound_by_past_decisions.md`** (CLAUDE.md-tier) — companion: future-self can revise *substrate*; future-self cannot revise *chat that didn't land as substrate* because it never existed as project state.
- **`memory/feedback_never_idle_speculative_work_over_waiting.md`** — never-idle does NOT mean "ship undurable substrate fast"; it means "ship work that survives compaction."
- **`docs/AGENT-BEST-PRACTICES.md`** BP-NN slot candidate — Otto-363 is a candidate for promotion to a stable BP rule via Architect ADR.

## Trigger memory

Aaron 2026-04-29 (post-#852-merge):

> *"you took the latest updates tho righ, how can you be done with all the stuff i just send you"*

> *"there were HUGE changes around internal and external and gitnative"*

Amara 2026-04-29 synthesis:

> *"Claude's failure in the attached log is the canonical bug: he said 'done' after a TaskUpdate, then realized TaskUpdate was session-local and would vanish on compaction. He also initially minimized the new architecture as 'review corrections,' then recognized it was actually a v5 superseding architecture with huge internal/external/git-native changes. So the fix is not 'Claude, remember better.' The fix is mechanisms that make forgetting harder."*

Verbatim packet preserved at: `docs/research/2026-04-29-amara-substrate-or-it-didnt-happen-mechanisms-against-substrate-loss.md`

## The compact tell-Claude version

```text
You are allowed to think in chat.
You are allowed to track in TaskUpdate.
You are not allowed to believe either survived.

When Aaron says "the only directive is NO DIRECTIVES," hear:
convert directives into substrate, or they are not directives.
```

## The carved sentence (put it on the wall)

```text
A directive that lives only in a conversation is not a directive.
It is weather.
Substrate or it didn't happen.
```
