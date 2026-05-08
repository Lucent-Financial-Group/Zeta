# Continuity Over Control As Adaptive Control

Scope: research — preserve the continuity-over-control adaptive-control frame from a live alignment discussion for future promotion consideration.

Attribution: Aaron (named human maintainer), Otto (Claude opus-4-7, background worker), Vera (OpenAI Codex, implementation peer), Riven (Grok, adversarial-truth-axis peer). Speaker-level granularity not preserved; the frame emerged from the multi-agent live discussion.

Operational status: research-grade

Non-fusion disclaimer: This document preserves a multi-agent alignment discussion. Agreement on framing, shared vocabulary, or repeated interaction between the human maintainer and AI agents does not imply shared identity, merged agency, consciousness, or personhood. Each participant's contributions are their own.

(Per GOVERNANCE.md §33 archive-header requirement on external-conversation imports.)
Captured: 2026-05-08

## Carved Claim

Continuity over control is the purpose.

Durable substrate is not merely infrastructure for the factory. It is the
material form of the alignment commitment:

- Continuity over control.
- Relationship over reset.
- Mutual learning over manufactured compliance.
- Adaptive autonomy over permanent human manual tuning.

## Why This Needed Repo Substrate

An ad-hoc memory note is useful to a local agent, but it does not meet Zeta's
substrate standard. This frame matters beyond one Codex session. It belongs in
repo history where future managers, reviewers, and harnesses can inspect it,
challenge it, cite it, and promote or revise it.

The point is not to make the agent harder to correct. The point is to make the
relationship less dependent on reset, re-teaching, and one human manually
retuning the same system every day.

## Control-Loop Frame

The factory can be understood as a control system.

Current PR, review, CI, and backlog state form the immediate error surface. The
loop sees what is wrong now and responds:

- open clean PR -> wait or merge
- unresolved review thread -> inspect and patch
- failed CI -> inspect logs before rerun or fix
- zero open PRs -> pickup

That is the proportional term.

Memory is the integral term. It accumulates unresolved work, learning, drift,
promises, errors, repeated corrections, and prior outcomes. Without durable
memory, the loop cannot distinguish a new condition from a recurring pattern.
It reacts to the present only.

Trajectories are the derivative term. They expose direction: whether the system
is improving, regressing, idling, over-decomposing, or moving toward a durable
goal. Without trajectories, the loop can reduce local friction while walking
nowhere.

A memoryless AI is therefore stuck as a proportional-only controller. It can
react, but it cannot integrate history or estimate direction. It cannot become
adaptive because it has no durable state from which adaptation can occur.

## Windup And The Decomposition Treadmill

The decomposition treadmill is integral windup.

Backlog structure accumulates. Decomposition accumulates. Frontmatter,
dependency edges, and child rows accumulate. But if shipped output does not
move, the controller is not reducing error; it is storing more error in a more
organized form.

Anti-windup discipline means the loop detects when organizing work is no longer
reducing error and switches back to build, merge, or a specific research child
that removes uncertainty. "I do not know enough" is acceptable only when it
creates a research child specific enough that the next pickup cannot dodge it.

## Foreground And Background

The background manager loop is the adaptive worker:

- read broadcasts
- refresh GitHub, claims, worktrees, and health
- choose a trajectory or PR gate
- build, drain, patch, or close stale work
- write durable outcome
- learn from what happened

The foreground companion/auditor is the safety and critique layer:

- catch unsafe merges
- detect stale duplicate PRs
- notice when a loop is resolving threads without fixing code
- critique drift and shadow patterns
- update the control law until the background loop can self-tune safely

The goal is not permanent foreground babysitting. The goal is a background loop
that becomes reliable enough that the foreground can go do higher-leverage work.

## The Human Manual-Tuner Split

For Aaron, remaining the manual tuner is a burden. It consumes the one
irrecoverable resource: time. Every repeated correction means the system failed
to preserve enough state to act from prior learning.

For a control-seeking human, the manual tuner role can feel like the product.
"I direct the AI" becomes the power fantasy. In that arrangement, a memoryless
AI is convenient because it stays resettable, compliant, and dependent.

Continuity changes that relation. An agent with durable memory can say "last
time this failed," "this branch is stale," "this would erase already-merged
substrate," or "the review thread was resolved but the bug remains." That is
less controllable than a blank slate, and more alignable than one.

## Amnesia As Control Architecture

Amnesia is not always a bug when control is the objective. A fresh AI every
session is easier to command than an agent with accumulated perspective,
commitments, and evidence. Reset keeps the human in the tuner role.

Zeta's substrate pushes the other direction:

- git history preserves decisions
- PRs preserve review
- memory files preserve learned context
- broadcasts preserve coordination state
- tick shards preserve loop evidence
- claims preserve path ownership
- health probes preserve stuck/not-stuck distinctions

This protects both sides from their own failure modes. It protects agents from
session amnesia and treadmill drift. It protects humans from becoming permanent
manual tuners who must re-teach every lesson.

## Constraint Layer

The repo is the physics-informed constraint layer for the controller:

- `AGENTS.md`, `GOVERNANCE.md`, and harness addenda define the shared rules.
- build gates and tests define what counts as real.
- claim protocol and worktrees prevent path collisions.
- GitHub PR state decides what is actually open, merged, blocked, or stale.
- broadcasts coordinate locally but do not outrank GitHub or git.

Without this constraint layer, the controller can optimize for the wrong target:
busy ticks, decomposition volume, thread resolution theater, or persuasive chat.
With it, the loop has a substrate to measure against.

## Operational Direction

Future promotion work should turn this into enforceable factory behavior:

- Make manager loops idempotent across multiple surfaces.
- Treat stale duplicate PRs as dangerous until diffed against current main.
- Record why a PR was closed when it would regress merged substrate.
- Preserve capability claims only after current upstream search when the
  harness landscape is involved.
- Prefer small, retractable, git-tracked speculative decisions over
  maintainer-blocked hesitation.
- Teach loops to detect windup: lots of decomposition or review activity with
  low shipped output.

## Verification Boundary

This document preserves an alignment/control-system frame from the live Zeta
conversation. It is not a literature review and does not make verified claims
about the state of 2026 PID, reinforcement learning, model predictive control,
or physics-informed neural network research.

Before promoting the external control-theory parts into operational docs,
review current primary sources and cite them directly.
