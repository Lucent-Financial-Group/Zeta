---
id: 081M1HZCZXX087G0R000A4AFN4
type: bug
state: backlog
priority: P2
slug: the-provisioning-secret-field-refusal-guarded-nothing-advanc
title: "The provisioning secret-field refusal guarded nothing: advance never called it, and the generic form refuses the ceremony's own udsCommitment"
created: 2026-09-02T21:50:00.000Z
depends_on: []
composes_with: []
---

# The provisioning secret-field refusal guarded nothing

## What was wrong

`src/Core.TypeScript/algebra/self-vendored-provisioning.ts` documents `refuseSecretShapedFields` as
guarding *"the one path into this substrate"*, and closes with *"the refusal is a test rather than a
comment."*

It was a test **and only a test**. Every reference in the repository was its own definition and its
own test file. `advance` — the module's single transition, and the path the doc is describing —
never called it. A record smuggling key material through `advance` was accepted.

The module is explicit that *"the refusals are the entire value of the module"*, so a refusal that
runs nowhere is not a small omission here; it is the value being absent while reading as present.

TypeScript does not close this either. Excess-property checking fires only on an object literal
assigned straight to the annotated type — a widened value, a spread, a parsed JSON body or an
`as AdvanceRequest` all pass, and at runtime the types are gone entirely.

## Why it was never wired — the part that makes this more than a missing call

Wiring the generic refusal directly would have **broken the ceremony**. `KEY_MATERIAL_NAME_FRAGMENTS`
contains `"uds"`, and the `uds-injected` step's own required input is named **`udsCommitment`**:

```text
refuseSecretShapedFields({ step, approver, udsCommitment: "c" })
  -> { refused: "field-name-looks-like-key-material", field: "udsCommitment" }
```

So the refusal was **unwireable as written** at the boundary it claimed to guard. That is very
likely why it was never called at all.

A commitment is not the secret it commits to — that is the entire point of a commitment — but a
name-shaped heuristic cannot tell them apart. The discrimination has to come from somewhere else,
and the declared schema is the right somewhere: **declared fields are reviewed when the interface
changes; an undeclared one is not.** That asymmetry is what makes excess fields the thing worth
scanning, and the smuggling case is precisely an excess field.

## Fix

`refuseSmuggledSecretFields(request)` skips the declared `AdvanceRequest` fields and applies the
existing name heuristic to everything else. `advance` calls it first and refuses with the existing
`field-name-looks-like-key-material` reason. No new refusal kind, no change to the generic function.

## Mutation results

| mutant | result |
|---|---|
| the guard removed from `advance` (i.e. the original defect restored) | 36 pass, **1 fail** |
| naive wiring — the generic refusal applied directly to the request | 26 pass, **11 fail** |
| the declared-field allowance dropped | 25 pass, **12 fail** |

The middle row is the evidence for the diagnosis above: naive wiring does not merely fail a test,
it breaks eleven, because it rejects every legitimate UDS burn.

## Honest ceiling, unchanged

This is still a check on **names**. A secret in a field called `notes` passes, and a UDS printed to
a log by a provisioning script never comes near this function. The module's stated residual gap —
no end-to-end proof that key material stayed off disk — remains open and is asserted as open by a
test, so nobody mistakes this guard for more than it is.

## How it was found

A sweep for exported controls with no production caller — the same class as `RoomBudget.maxSteps`
(declared, enforced nowhere) and `hatFilter` (built, tested, wired to nothing). The sweep's raw
output is a lead list, not a verdict: most hits are CLI modules invoked from their own
`import.meta.main`, or contract assertions whose intended caller genuinely is a test. This one was
verified by hand before being called a defect.
