---
id: 081M1JD6PYJ087G0R003EMMY9M
type: task
state: backlog
priority: P2
slug: change-control-kernel-the-clamp-four-authorities-one-legal-s
title: "Change-control kernel — the clamp, four authorities, one legal set"
created: 2026-09-03T01:12:00.000Z
depends_on: []
composes_with: []
---

# Change-control kernel — the clamp, four authorities, one legal set

Ports the KERNEL of `agentic-organization/docs/ORG_NATIVE_CHANGE_CONTROL_DESIGN.md` — its §1.5
*clamp discipline* and §3 *a review stage is an observe → decide cycle*. The Cockroach tables (§5),
the GitHub/GitLab/Jira ports (§4) and the storage layer are deliberately out of scope: the pure
decision is the value, and it is also the only part falsifiable without an external account.

## Why this is the on-target piece

The harness this repo is being built into wants *deterministic guardrail gates the agent itself
cannot override, forcing a fixed sequence before moving forward*. That is exactly a `ReviewPipeline`:
stages as DATA, each with a gate that must be satisfied and an authority that owns it.
`plan → execute → review → UAT → push` is a pipeline **literal**, not orchestration code — and there
is a test that runs precisely that sequence through the kernel.

## The four authorities, one kernel

`hat` / `quorum` / `human` / `external` differ ONLY in where the choice comes from. The legal set,
the clamp and the emitted event are identical. *"Wait for a human to approve the GitHub PR"* is not
bespoke orchestration; it is a stage with `authority = external(github)`.

## One deliberate divergence from the source

The design describes the clamp as `Math.max(0, Math.min(len-1, idx))` — an **index** clamp. That is
right for choosing a menu slot and wrong here: clamping an index silently converts an illegal
`approve` into whatever sits at that position, so a stage that tried to approve an unsatisfied gate
gets a `request_changes` recorded as though it had chosen one. **The attempt disappears.**

`clampToLegal` refuses instead of substituting: same safe outcome, plus a `clamped` flag naming what
was attempted. Nothing illegal executes either way — the difference is that the attempt becomes
evidence, and it feeds the promotion gate directly:

| in change control | in `enforcement/promotion-gate.ts` |
|---|---|
| an out-of-legal-set choice | a **selector rejection** |
| an unowned or fabricated authority | a **control bypass** |

Those are the two counters the promotion gate demotes a lane on. A lane that keeps trying to approve
gates it does not own loses its dispatch privileges automatically — the two ports compose without
either knowing about the other's internals.

## The properties

- An **unsatisfied gate removes `approve`** from the legal set. One line, and it is what makes "the
  agent cannot advance past an unsatisfied gate" a property of the set rather than a rule to
  remember.
- An **advisory stage may not reject**. A stage that cannot block should not be able to kill —
  otherwise "advisory" is the stronger authority in the direction that matters.
- The clamp's fallback is the **conservative bounce**, never `reject`. A gate that punishes harder
  than it was asked to is its own hazard.
- An **unauthorized actor's choice is never evaluated**, not evaluated-then-rejected — a fabricated
  approval must not exist even briefly in a system that emits events.
- **Quorum reuses `authorization/separation-of-duties.ts`**: distinct personas, proposer's own
  approval discounted, plus an on-roster check. The rule lives in one place.
- **`resubmit` restarts at stage 0.** Resuming where it bounced would carry approvals of a change
  that no longer exists.

## Falsifiers

```
bun test src/Core.TypeScript/enforcement/change-control.test.ts        # 34 pass
bun test src/Core.TypeScript/enforcement/ src/Core.TypeScript/authorization/   # 100 pass
bun src/Core.TypeScript/lint/lint-typescript.ts                        # exit 0
```

Mutation matrix: **15/15 killed** — including the clamp removed outright, the clamp substituting
silently, the fallback made harder, a hat fabricating an external approval, quorum ignoring its
roster and counting self-approvals, an unauthorized choice being applied, the final-stage off-by-one,
and `resubmit` resuming instead of restarting.
