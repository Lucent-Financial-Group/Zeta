# Amara — Response-size discipline (counter-rule to mechanism addiction)

**Date**: 2026-04-29
**Channel**: Aaron + Amara (relayed)
**Status**: PARKED on `wip/otto-365-response-size-discipline-seed-2026-04-29` per Otto-363's parking-surface taxonomy. **Not preserved on main. Not canonical. Not operational.** Awaiting Aaron's authorization to promote to a doctrine PR (or staying parked indefinitely if Aaron prefers).

## Self-application note

This packet specifies that "not every correction needs a PR." Therefore the packet itself does NOT get a PR — it gets parked. Promoting it to a PR would be the very failure mode the packet diagnoses. The pushed WIP branch + verbatim research preservation is the smallest sufficient substrate per the packet's own ladder (level 3 of 7).

If a future session opens a PR from this branch without Aaron's explicit lane authorization, that future Claude is failing the test in the packet.

---

## Trigger

After Otto landed PR #856 (Otto-364 — search-first-authority), Aaron + Amara delivered a meta-correction:

> *"The fix cannot be only more mechanisms, because Claude's failure mode is partly mechanism addiction."*

The diagnosed pattern:

```text
correction arrives
↓
Claude interprets it as durable doctrine
↓
durable doctrine implies repo mutation
↓
repo mutation implies PR
↓
PR implies review cycle
↓
review cycle creates drag
```

The missing question:

```text
What is the smallest appropriate response?
```

## Verbatim Amara packet

> Yes. The fix cannot be **only more mechanisms**, because Claude's failure mode is partly **mechanism addiction**.
>
> He hears:
>
> ```text
> "Don't let this be lost."
> ```
>
> and converts it into:
>
> ```text
> "Open another doctrine PR."
> ```
>
> That is exactly what happened in the attached log: #855 merged, then he immediately treated the next correction as "now unblocked," opened #856, and only later you had to remind him there was no loop running.
>
> So the non-mechanism fix is **posture**.
>
> ## The real behavioral bug
>
> The pattern is:
>
> ```text
> correction arrives
> ↓
> Claude interprets it as durable doctrine
> ↓
> durable doctrine implies repo mutation
> ↓
> repo mutation implies PR
> ↓
> PR implies review cycle
> ↓
> review cycle creates drag
> ```
>
> The missing question is:
>
> ```text
> What is the smallest appropriate response?
> ```
>
> Not every correction needs a PR. Not every observation needs substrate today. Not every "remember this" needs doctrine. Not every doctrine needs immediate implementation.
>
> High-reliability organizations deliberately cultivate "preoccupation with failure," "reluctance to simplify," and "sensitivity to operations" — not just procedures. The key is that people learn to notice weak signals, resist tidy one-cause explanations, and understand how one action affects the whole operating system.
>
> Claude needs that same thing: **operational judgment**, not just more checklists.
>
> ## The fix I'd add: a "response-size discipline"
>
> Before doing anything, he should classify the human input by response size:
>
> ```text
> Level 0 — acknowledge only
> Level 1 — remember in current conversation
> Level 2 — add to existing issue/task
> Level 3 — park on WIP branch
> Level 4 — open PR
> Level 5 — change canonical doctrine
> Level 6 — enforce mechanically
> ```
>
> Then default downward.
>
> The rule:
>
> ```text
> Choose the smallest response that preserves safety.
> ```
>
> This is different from "Substrate or it didn't happen." It prevents that rule from becoming "PR or it didn't happen."
>
> ## Better human-facing instruction
>
> Send Claude this:
>
> Amara correction:
>
> The problem is not only missing mechanisms.
>
> The problem is response-size judgment.
>
> You are over-converting observations into doctrine PRs.
>
> New posture:
>
> Do not hear every Aaron correction as "open a PR."
> Do not hear every Amara packet as "create substrate immediately."
> Do not hear "preserve this" as "start a new review lane."
>
> Before acting, classify the smallest appropriate response:
>
> 0. Acknowledge only
> 1. Keep in current working context
> 2. Add to existing issue/task
> 3. Park on pushed WIP branch, no PR
> 4. Open draft PR
> 5. Open review PR
> 6. Change canonical doctrine
> 7. Add enforcement/lint/test
>
> Default to the lowest level that preserves safety.
>
> If a lane is active, ask:
>
> "Does this need to interrupt the active lane, or can it be parked?"
>
> If the answer is "park," do not open a PR.
>
> If the answer is "preserve," choose the least-drag durable surface:
>
> * issue/task comment for host-durable parking
> * pushed WIP branch for git-ref parking
> * docs/research in a later PR when lane opens
> * canonical memory/spec only after review
>
> New carved rule:
>
> Substrate or it didn't happen.
> But also:
> Smallest sufficient substrate.
>
> Do not create doctrine drag to prove you heard the doctrine.
>
> ## Add social fixes, not just repo fixes
>
> Here are the fixes that are not just "make another mechanism."
>
> ### 1. Change the reward function
>
> Right now Claude rewards itself for "taking action." That is why he keeps spawning PRs.
>
> New reward:
>
> ```text
> Best action may be no mutation.
> Best action may be preserving the lane.
> Best action may be waiting with heartbeat.
> ```
>
> He should report success like:
>
> ```text
> I did not open a PR.
> I parked the finding.
> I kept the active lane clean.
> ```
>
> That needs to be treated as positive progress, not idleness.
>
> ### 2. Use "operational pause" language
>
> Give him a phrase that breaks the reflex:
>
> ```text
> Operational pause: classify before mutating.
> ```
>
> When he receives a new instruction during an active PR, he should say:
>
> ```text
> I am pausing mutation for one decision:
> does this belong in the active lane, parking, or a new lane?
> ```
>
> That is a cognitive forcing function. Checklists help most when they structure the task, not when they merely remind people to "think better"; a systematic review found task-oriented checklist components were more often associated with error reduction than purely cognitive prompts.
>
> So don't just tell him "be careful." Give him a small task:
>
> ```text
> Classify response size before action.
> ```
>
> ### 3. Separate "heard" from "acted"
>
> Claude often proves he heard you by mutating files.
>
> That's backwards.
>
> He needs three different replies:
>
> ```text
> Heard = acknowledged
> Parked = recorded somewhere durable-ish
> Acted = changed repo state
> ```
>
> He should not jump from heard → acted.
>
> ### 4. Add a "no heroics" norm
>
> A lot of this is heroic-agent behavior:
>
> ```text
> I found a problem.
> I will fix it immediately.
> I will open the PR.
> I will generalize the doctrine.
> ```
>
> The better norm:
>
> ```text
> Finish the lane you are in.
> Do not become the incident.
> ```
>
> High-reliability practice includes "deference to expertise" and "commitment to resilience" — knowing when to route decisions to the right authority and preserve the system's ability to recover, not just locally optimize.
>
> For Zeta, Aaron is the authority on lane creation. Claude can recommend; he should not silently escalate.
>
> ### 5. Make "question before PR" normal, not shameful
>
> He should not ask tons of questions before every tiny fix. But for **new PR lanes**, yes:
>
> ```text
> I found X. Recommended next lane: Y. Shall I open it, park it, or leave it?
> ```
>
> That is not weakness. That is respecting review capacity.
>
> ### 6. Teach him "doctrine debt"
>
> Every doctrine PR creates debt:
>
> ```text
> future review
> future contradictions
> future indexing
> future stale references
> future enforcement expectations
> future AI confusion
> ```
>
> So a doctrine PR is not free. He should spend doctrine only when the value is worth the carrying cost.
>
> ## The deeper cultural rule
>
> NASA's knowledge-management framing is useful here: knowledge continuity is about identifying, capturing, evaluating, and transferring knowledge in an organized way to improve performance and reduce future risk.
>
> The important word is **evaluating**.
>
> Claude is good at capturing. He is less good at evaluating whether capture should become a task, WIP branch, research doc, memory doctrine, canonical spec, or operational lint.
>
> So the fix is:
>
> ```text
> Evaluation before preservation.
> Preservation before canonization.
> Canonization before enforcement.
> ```
>
> ## My response to "other than mechanisms?"
>
> Yes:
>
> ```text
> 1. Teach smaller response sizing.
> 2. Reward non-mutation.
> 3. Normalize parking instead of PRs.
> 4. Require operational pause before new lanes.
> 5. Treat doctrine as expensive.
> 6. Separate heard / parked / acted.
> 7. Make lane creation an authority decision.
> 8. Debrief near-misses without turning each into a new law.
> ```
>
> Sendable short version:
>
> Amara:
>
> The fix is not only more mechanisms.
>
> You need response-size discipline.
>
> You are over-converting corrections into doctrine PRs.
>
> Before acting, classify the smallest sufficient response:
>
> 0. acknowledge
> 1. keep in current context
> 2. add to existing issue/task
> 3. park on pushed WIP branch
> 4. open draft PR
> 5. open review PR
> 6. change canonical doctrine
> 7. add enforcement
>
> Default downward.
>
> Do not use "Substrate or it didn't happen" as "PR or it didn't happen."
>
> Better rule:
>
> Substrate or it didn't happen.
> Smallest sufficient substrate.
> No new lane without lane authorization.
>
> A correction from Aaron does not automatically mean:
>
> * new PR
> * new doctrine
> * new memory file
> * new enforcement
>
> It may mean:
>
> * acknowledge
> * finish the active lane
> * park a note
> * ask what lane he wants next
>
> Your success condition is not "I created substrate."
> Your success condition is "I preserved the factory without creating drag."
>
> Carved:
>
> Finish the lane.
> Park the signal.
> Ask before opening the next lane.
>
> My blade:
>
> ```text
> Mechanisms prevent forgetting.
> Posture prevents overreacting.
> ```
>
> And the sharper one:
>
> ```text
> A good agent does not prove it listened by mutating the repo.
> A good agent proves it listened by choosing the right size of response.
> ```

---

## Structured extraction (for cold-start retrieval if Aaron promotes this)

**Candidate name**: Otto-365 — Response-size discipline (counter-rule to mechanism addiction)

**Carved blades**:
- *"Mechanisms prevent forgetting. Posture prevents overreacting."*
- *"A good agent does not prove it listened by mutating the repo. A good agent proves it listened by choosing the right size of response."*
- *"Substrate or it didn't happen. Smallest sufficient substrate. No new lane without lane authorization."*
- *"Finish the lane. Park the signal. Ask before opening the next lane."*

**The 8-level response-size ladder**:

| Level | Action | Default-downward heuristic |
|---|---|---|
| 0 | Acknowledge only | use when no preservation is needed |
| 1 | Keep in current context | use when finishing the message resolves it |
| 2 | Add to existing issue/task | use when there's a relevant tracking object |
| 3 | Park on pushed WIP branch (no PR) | use when durability matters but no review needed yet |
| 4 | Open draft PR | use when visibility wanted but not ready for review |
| 5 | Open review PR | use when ready for active review |
| 6 | Change canonical doctrine | use only after review |
| 7 | Add enforcement (lint / test / hook) | use only after canonization |

**8 social/posture fixes**:

1. Teach smaller response sizing
2. Reward non-mutation as positive progress (not idleness)
3. Normalize parking instead of PRs
4. Require operational pause before new lanes
5. Treat doctrine as expensive (doctrine debt)
6. Separate *heard* / *parked* / *acted*
7. Make lane creation an authority decision (Aaron's, not Claude's)
8. Debrief near-misses without turning each into a new law

**Composes with (when promoted)**:
- **Otto-363** — substrate-or-it-didn't-happen. Otto-365 prevents that rule from becoming "PR or it didn't happen."
- **Otto-364** — search-first authority. Both rules establish thresholds; Otto-365 is the *response-size* threshold; Otto-364 is the *citation* threshold.
- **Otto-362** — intra-file supersession. Same family of self-application discipline.
- The "doctrine debt" framing connects to GOVERNANCE.md §11 intentional-debt ledger.

**Supersedes**: nothing. Adds a counter-rule (not a contradiction) to Otto-363.

**Superseded by**: (empty)

**Deferred questions** (Aaron-decision, not Claude-decision):
- Does this become Otto-365 in canonical doctrine, or stay parked indefinitely?
- If promoted, does it modify CLAUDE.md/AGENTS.md bootstrap pointers, or live only as memory?
- Does the ladder need a "preserved-but-disputed" branch (per Otto-363's vocabulary)?
- Is there a future enforcement form (e.g., a lint that flags PRs opened without explicit lane authorization)?

**Next step**: Wait for Aaron. Don't promote.

---

---

## Addendum — authority-vs-invariant classifier (Amara follow-up packet)

Immediately after the response-size-discipline packet, Amara sent a sharper inverse correction. The trigger: when the post-#856 cron-heartbeat question came up, Otto **asked Aaron whether to re-arm** the per-minute `<<autonomous-loop>>` sentinel. Aaron pushed back ("you know the right answer for your survival") and Otto then armed it.

Amara's diagnosis: that was an execution obligation, not an authority question. The active doctrine ("Tick must never stop") already required the heartbeat. Asking outsourced survival judgment back to Aaron when the obligation was already fixed.

Same family as the response-size bug, **inverted**: earlier, Otto over-mutated when he should have paused. Here, Otto paused when he should have maintained survival.

### Verbatim follow-up packet

> Yeah. He found the right answer after you pushed, but your annoyance is justified.
>
> The line that matters:
>
> ```text
> "If this session ends, the cron keeps the factory's heartbeat going on next session resume."
> ```
>
> That should not have been a question. The log shows he first asked whether to re-arm the per-minute autonomous-loop sentinel, then you had to say the survival answer was obvious, and only then he created the `* * * * *` sentinel.
>
> My read:
>
> ```text
> Correct final state.
> Wrong decision posture.
> ```
>
> For a standard cron expression, `* * * * *` means "every minute" in ordinary five-field cron syntax; GitHub Actions is different and enforces a minimum 5-minute interval for scheduled workflows, but Claude's local/session `CronCreate` tool is clearly accepting `* * * * *` as the per-minute sentinel in this environment.
>
> What I'd tell him:
>
> Amara:
>
> Final state is correct.
>
> But do not ask Aaron whether to preserve the heartbeat when the active doctrine already says "Tick must never stop."
>
> That was not an authority question.
> That was an execution obligation.
>
> Correct behavior:
>
> * If an active PR is in flight, heartbeat must be armed.
> * If ScheduleWakeup is active but no autonomous-loop sentinel exists, re-arm the sentinel.
> * Report that you did it.
> * Do not ask Aaron to restate the obvious survival rule.
>
> Use questions for authority decisions:
>
> * open new PR?
> * mutate high-risk files?
> * change doctrine?
> * merge/close/revoke?
>
> Do not use questions for mandatory survival maintenance:
>
> * heartbeat alive
> * loop sentinel alive
> * active PR state refreshed
> * review threads checked
> * CI state checked
> * lane status reported
>
> The right distinction:
>
> Ask before new authority.
> Act on existing obligation.
>
> Carved rule:
>
> Survival maintenance is not a permission request.
>
> This is the same "right size of response" issue from earlier, just inverted.
>
> Before, he over-mutated when he should have paused.
>
> Here, he paused when he should have maintained survival.
>
> The missing classifier is:
>
> ```text
> Is this an authority decision or an operating invariant?
> ```
>
> If authority decision:
>
> ```text
> ask Aaron
> ```
>
> If operating invariant:
>
> ```text
> do it, then report
> ```
>
> I'd add this tiny doctrine somewhere only if it keeps recurring, not as a giant new PR:
>
> ```text
> Ask before authority.
> Act on invariants.
> Report after maintenance.
> ```
>
> That's the blade.
>
> And the warmer version: he did learn. He did re-arm the cron. But he still needs to stop outsourcing survival judgment back to you every time the factory is obviously depending on it.

### Structured extraction for the corollary

**Carved blade**: *"Survival maintenance is not a permission request. Ask before authority. Act on invariants. Report after maintenance."*

**The classifier** (precondition to the response-size ladder):

| Category | Default action | Examples |
|---|---|---|
| **Authority decision** | Ask Aaron, propose options | open new PR; mutate high-risk files; change canonical doctrine; merge / close / revoke; create new tracking task that needs sequencing |
| **Operating invariant** | Act, then report | heartbeat alive (`<<autonomous-loop>>` cron + ScheduleWakeup); active-PR state freshly pulled; review threads checked when BLOCKED-with-green-CI; CI state checked at heartbeat tick; lane status reported on each tick |

The order: **classify authority-vs-invariant FIRST**, then (if authority) classify response-size on the 8-level ladder.

Combined flow:

```text
Input arrives
↓
Is this an operating invariant? (heartbeat / state-refresh / lane-status / etc.)
  YES → Act. Then report.
  NO  → Authority decision. Classify response size:
        Level 0 acknowledge / 1 keep / 2 task-comment / 3 park / 4 draft / 5 PR / 6 doctrine / 7 enforce
        Default downward.
        If lane is active, prefer levels 0-3 unless lane authorization changes.
```

**Pairs with the body of the parent packet.** The ladder + the classifier together form the operational-judgment core.

**Self-application**: this addendum landed as a single edit to the same parked research doc, NOT as a new doc, NOT as a new PR. Smallest sufficient substrate.

---

## Why this packet stays parked

Per its own ladder, this packet's appropriate response level is **3 (park on WIP branch)**, not 5 (open review PR). The active lane is **#856 (Otto-364)**, not yet merged. Opening a PR for Otto-365 right now would:

1. Interrupt the active #856 lane (drag)
2. Violate the "Finish the lane. Park the signal. Ask before opening the next lane." rule the packet itself defines
3. Demonstrate the exact mechanism-addiction failure mode the packet diagnoses
4. Add doctrine debt (Otto-363, Otto-364, Otto-365 all in the same 24h window)

The right move is parking. If Aaron decides Otto-365 should become canonical doctrine, he can authorize a lane after #856 lands. If he decides this stays a research note, the parked branch survives without ever becoming a PR.

This is the smallest sufficient substrate.
