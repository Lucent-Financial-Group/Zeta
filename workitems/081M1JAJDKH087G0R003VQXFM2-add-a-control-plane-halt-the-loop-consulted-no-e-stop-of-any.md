---
id: 081M1JAJDKH087G0R003VQXFM2
type: task
state: backlog
priority: P1
slug: add-a-control-plane-halt-the-loop-consulted-no-e-stop-of-any
title: "Add a control-plane halt: the loop consulted no e-stop of any kind"
created: 2026-09-03T00:05:00.000Z
depends_on: []
composes_with: []
---

# Add a control-plane halt: the loop consulted no e-stop of any kind

## The gap

Measured before writing anything: `src/Core.TypeScript/observe/run-loop-real.ts` consulted **no halt
flag of any kind**, and neither did `tickRooms`. Searching for one turned up two false positives —
`oldestOpenAgeTicks` contains the substring "estOp".

That matters because of what the loop is: **cron-driven**, with an event sink that pushes **direct
to `origin/main`**. The only ways to stop it were deleting the cron or revoking the credential, both
of which also destroy the ability to observe what is going wrong.

`agentic-organization/packages/application/src/control-plane-guard.ts` is the only e-stop anywhere in
the repository. This brings the capability across.

## The design question this turns on

An e-stop that fails open is not an e-stop. A halt that fires whenever a file is missing means the
fleet can never start. Those resolve on one distinction, made precisely:

| flag document | meaning | decision |
|---|---|---|
| **absent** | nothing has been declared | **proceed** |
| **present but unreadable/malformed** | we cannot tell whether a halt is set | **halt** |

Absence is a definite statement. Corruption is not a statement at all — and *"I could not tell"*
must never be read as permission. That is the same swallowed-error shape as a guard returning
`allow` from its catch block.

The parser is strict for the same reason: **one unparseable entry makes the whole document
unreadable** rather than being skipped. The entry nobody could parse is exactly the one that might
have been the estop, so a parser that drops what it does not understand turns a corrupt halt into a
silent go.

## Scopes

`organization` halts everything; `agent`, `hat` and `provider` halt a slice, so one bad provider does
not require stopping the fleet. A **hat** flag matches if the actor is wearing that hat anywhere in
its worn set — a persona wears a subset (`Persona.Worn`), and a halt escapable by wearing one more
hat is not a halt.

Flags are severity-ordered, `estop` first, so a `freeze` never reports in place of an estop that is
also in force and understates the situation to whoever reads the refusal.

## Loop semantics

A halt blocks **acting**, not observing. `--dry-run` still reports what it would have done: during an
incident the ability to look is the thing you least want to lose, and a dry run has no side effects
to stop.

A deliberate halt exits **0**. A halt is the system working, and a cron lane exiting non-zero on
every tick of a declared incident pages people about a decision they made themselves; the log line
carries the signal.

## Verified live

```text
[control-plane] HALTED (estop) by maximdolphin: … — dry run continues, observation is not gated
[control-plane] HALTED (estop) by control-plane: control-plane flags could not be read
                (… not valid JSON …) — halting, because "could not tell" is not permission
```

With no flags document present the loop runs exactly as before.

## Mutation results

| mutant | result |
|---|---|
| **fail open — an unreadable source proceeds** | 12 pass, **3 fail** |
| absent halts (would wedge the fleet) | 14 pass, **1 fail** |
| parser skips bad entries instead of failing | 14 pass, **1 fail** |
| severity ignored, first listed flag wins | 14 pass, **1 fail** |
| hat scope checks only the first worn hat | 14 pass, **1 fail** |

## Honest ceiling

This stops agents that **consult it**. It is not a kernel-level kill: a process that never calls
`haltDecision` is unaffected, and nothing here stops code already executing. That is why the loop
consults it before acting rather than treating it as an ambient property.

Flags live in git — `DEFAULT_FLAGS_PATH` names the default location under the db control-plane folder, and the path is a parameter. No document is shipped, because absence is the correct default. Setting a
halt is therefore a commit — attributable, reviewable, revertible, and it reaches every clone through
the path they already pull.
