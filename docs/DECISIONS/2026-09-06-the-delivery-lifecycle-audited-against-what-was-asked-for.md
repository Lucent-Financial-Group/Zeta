# The delivery lifecycle, audited against what was asked for

Date: 2026-09-06
Status: recorded. Every "present" row below was measured by running the thing, and the command or
test that produced the measurement is named. The gaps at the end say exactly how far each was closed.

## What was asked for

> 1. a set of work assigned to some person, managed and handled by this corporate organization
> 2. agents groom the business context from a data source, then peer reviews, architecture doc
>    design, doc reviews, adversarial reviews across all that, then implement, reviews, QA UAT,
>    strong testing, business review, architect review, delivery as an MR
> 3. a deterministic workflow agents cannot violate; C-suite ↔ manager ↔ TPM interaction thought
>    out; `observe` populated per hierarchy; work in scope for the organization and the goal rather
>    than unrelated; escalation paths when agents hit unknowns; the time schedule hooked up

## 1. Work assigned to a person, managed by the organization — PRESENT

`intake.ts` normalizes an inbound event; `goal-cascade.ts` decomposes it goal → initiative →
project → leaf; `assignment-engine.ts` picks an agent per hat under bindings, cooldowns, caps and
the reporting line; `hat-binding.ts` holds the binding lifecycle with warmup, TTL, cooldown and
succession. `run-org.ts` drives it end to end.

Verified: a run delivers two leaf tasks, each with a named assignee hat and a change that merged.

## 2. The pipeline — PRESENT, extended from 7 gates to 13

`ORDERED_GATES` in `quality-gate.ts` is the single source of sequencing; `nextLegalGate` derives the
prior-gate requirement from array position, so the order and the dependency table cannot disagree.

| asked for | gate |
|---|---|
| groom the business context from a data source | `business_context_grooming` |
| — | `customer_rfp_review`, `brd_approval` |
| peer reviews | `peer_review` |
| architecture doc design | `architecture_design` |
| doc reviews | `architecture_approval` |
| **adversarial reviews across all that** | `adversarial_review` |
| implement | the `WorkExecution` port, not a gate |
| reviews | `implementation_review` |
| QA UAT | `qa_uat` |
| strong testing | `runtime_validation` (decided by QA, not by opinion) |
| business review | `final_business_validation` |
| architect review | `final_architecture_review` |
| delivery as an MR | `release_readiness` + the `ChangeControl` port |

`adversarial_review` sits **after** the design and **before** the build, because the interesting
failures are between the documents and changing them is still cheap there. It is owned by three
departments — architecture, engineering and QA — so the pass can come from outside the line that
produced the plan.

`final_architecture_review` exists because `architecture_approval` judged a *drawing* six gates
earlier. Approving the drawing is not approving the building.

## 3a. Deterministic and unviolatable — PRESENT, with falsifiers

`lifecycle.test.ts`, 24 tests / 564 assertions, drives the chain adversarially. Three properties,
each asserted in **both** directions so none is satisfied by a chain that simply never works:

- **ORDERED** — every gate but the first is refused from an empty history, tested for *all* of them
  by a hat that genuinely owns each, so ordering is the only thing that can refuse. A full history
  minus any one gate is never complete and points back at exactly the missing gate.
- **OWNED** — `mayEvaluate` and `gateOwners` are cross-checked for every (hat, gate) pair: two
  answers to one question from different code, so neither can decide authority invisibly to the
  other. A gate nobody owns BLOCKS rather than passing.
- **UNFORGEABLE** — no gate lets a hat approve work it did itself, checked for all thirteen; the
  same call with a different author is accepted.

A rejection is never a dead end: every gate has a recovery path, a rejected gate does not enter the
passed set, and `nextLegalGate` still points at it.

## 3b. C-suite ↔ manager ↔ TPM — PRESENT

Measured on the seeded chart:

```
chain from an IC: backend_implementer -> tech_lead -> engineering_manager
                  -> engineering_director -> cto -> ceo -> executive_board_member
first hat that MAY decide an escalation: engineering_manager
```

Escalation is a management act: a lead or an IC may *raise* one, only manager-and-above may
*decide* it (`hasEscalationAuthority`). TPMs hold `release_readiness`; product holds the context and
business gates; architecture holds the design and both architecture reviews; QA holds UAT and
runtime validation. `rmo.ts` runs hat-supply voting with the supervisor chain recorded.

## 3c. `observe` populated per hierarchy — PRESENT

`observeForHat` returns a readout whose SCOPE differs by level. Measured:

```
ceo                    c_suite                 scope=organization
engineering_director   director                scope=department
engineering_manager    manager                 scope=team
tech_lead              lead                    scope=own_batch
backend_implementer    individual_contributor  scope=own_items
```

Each higher scope rolls up the metrics of the scopes beneath it, so prioritization genuinely
aggregates rather than each level inventing its own view.

## 3d. Scope coherence — PRESENT, and honest about absence

`portfolio.ts` ties goals to a product; the cascade gives every node exactly one parent, so work
rolls up to a goal by construction. Measured:

```
goal-1 belongs to:  Checkout
an orphan goal:     (nothing — reported, not invented)
```

An unassociated goal reports as belonging to nothing rather than being silently attached to
whatever is nearby.

## 3e. Escalation on unknowns — PRESENT (added for this)

`EscalationTrigger.UnknownEncountered` is the trigger the other four could not express. Every
existing one is a symptom the organization observes from OUTSIDE — a gate rejected twice, an SLA
passed, a queue too long. This one is raised by the worker itself, and it is the only honest thing
to do with a genuine unknown: the alternative is an agent choosing plausibly and the organization
finding out at the gate, where the cost is a rejected review instead of a question.

Its legal actions deliberately **exclude** `AcceptRisk` — accepting a risk you cannot describe is
not a decision, it is the guess the trigger exists to prevent.

## 3f. The time schedule — PRESENT (wired for this)

`work-schedule.ts` holds calendars, blocks and meetings; `schedule-pressure.ts` measures LOAD;
`mission-trajectory.ts` measures PACE. They are different questions — an organization can be
unloaded and badly behind, or slammed and exactly on time, and one that reports only load discovers
its schedule at the deadline.

Measured end to end through `run-org.ts`:

```
no window                     no window declared — pace UNMEASURED
delivering run, elapsed       ON_TRACK: 100% of window elapsed, 100% delivered; delivered 2/2
--qa-fails, elapsed           OFF_TRACK: 100% of window elapsed, 0% delivered; delivered 0/2
                              ! mission is off track (…) — mission_off_track is warranted
```

The pace count comes from the cascade's own leaves, so it cannot disagree with the work it
describes. The model is deliberately crude — expected progress is the fraction of the window
elapsed — and the header says so: a back-loaded project reads `at_risk` for most of its life, and
the supported remedy is the caller's `tolerance`, which has a test proving it moves the verdict.

## THE GAPS — one closed in part, two open

### 1. A gate approval was an ASSERTION and is now a RECORD — narrowed, not closed

`GateEvaluation` recorded who decided, which gate, when, the outcome and a reason, and **no
evidence**. The `Review` port received evidence so a reviewer could judge from it; none of it
survived into the record. So `business_context_grooming` could be approved with no trace that a
data source was read, and `adversarial_review` with no trace that anyone tried to break anything.

**What was done.** `GateEvaluation.evidenceRefs` now carries what the decider consulted, threaded
from the `Review` port through `runGateChain`. Runtime validation's references come from the test
runs rather than from a reviewer's note — the one gate whose consultation is a machine's.
`unattestedApprovals` derives, from the record, which approvals asserted an act and referenced
nothing. Measured on a full run: 26 of 26 evaluations carry references.

**What was NOT done, and the reversal is the point.** The first version REFUSED an evidence-free
approval on the three gates whose name is a claim about an act. That looked like enforcement and
was not: any string satisfies a presence check. `autoApproveReview` — whose own description is
*"reads no evidence and consults nobody"* — returns `auto-approved:<gate>:<workId>`, which would
have passed the check while consulting nothing. A control the null adapter satisfies is the vacuity
class, and shipping it as "agents cannot approve without evidence" would have claimed more than the
mechanism supports.

So the claim is the narrower true one: **an attested approval is now distinguishable from a bare
one, and the null reviewer names itself in the record.** Before this, both looked identical. What
remains impossible is making a fabricated reference impossible.

### 2. "Adversarial" is a name, not a behaviour — narrowed by the same change

Nothing forces the adversarial gate to be adversarial, and nothing can. Its value is structural: it
is owned by three departments, it sits where breaking the plan is still cheap, and its record now
says what the reviewer consulted — so a rubber stamp is visible after the fact as
`auto-approved:adversarial_review:…` rather than indistinguishable from a real attack.

### 3. The lifecycle is not yet driven by a model end to end

`run-agent.ts` can drive the organization with a model choosing real work, and `run-org.ts` can
reach real repositories; both share one flag parser since PR #16713. What has not been run is a
model going through all thirteen gates against a real tracker and a real repository in one
invocation. The parts are wired; the end-to-end demonstration at this chain length is not recorded.

## Pointers

- `src/Core.TypeScript/corporate/quality-gate.ts` — the chain, the ordering, the authority check
- `src/Core.TypeScript/corporate/lifecycle.test.ts` — the ordered/owned/unforgeable falsifiers
- `src/Core.TypeScript/corporate/mission-trajectory.ts` — pace, and why it is not schedule pressure
- `src/Core.TypeScript/corporate/escalation.ts` — triggers, legal actions, who may decide
- `workitems/081M1M2J0P3087G0R0037K8JJK-*.md` — the pass-by-pass record
