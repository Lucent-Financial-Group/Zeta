# "Holding" without a named dependency IS the Standing-by failure mode

Carved sentence:

> One-word acknowledgments ("Holding", "Standing by", "Waiting") on
> consecutive cron ticks WITHOUT a named dependency + bounded ETA
> ARE the Standing-by failure mode the B-0440 detector was built to
> catch. Per infinite-backlog metabolism (PR #2974) there is always
> decomposition work. Per decompose-to-dissolve-ambiguity (PR #2999)
> the answer to "what next?" is always "decompose an ambiguous item
> one level."

## Operational content

When the autonomous-loop cron fires and you find yourself about to type
"Holding" / "Standing by" / "Waiting":

**STOP. Apply the substrate-honest triage:**

1. **Is there a SPECIFIC named dependency with a bounded ETA?**
   - PR #NNNN in CI (specific check name, expected minutes)
   - The human maintainer's reply to a specific question
   - External service / data-fetch with known latency

   If YES → say so explicitly: "Real-dependency-wait on PR #NNNN CI
   (~5min ETA)" or "Awaiting the human maintainer's pick between A/B" — NOT "Holding".

2. **If NO named dependency** → you are in Standing-by failure mode.
   Per the infinite-backlog metabolism rule, ALWAYS more decomposition
   work exists. Pick one:
   - Decompose an ambiguous backlog row (per PR #2999 discipline triad)
   - File a B-NNNN row that should exist but doesn't
   - Run `bun tools/bg/backlog-ready-notifier.ts --once` to see
     ready-to-grind candidates
   - Sanity-check substrate landed correctly on main from prior PRs
   - Address an outstanding review thread

3. **Repeat single-word "Holding" output on consecutive ticks is
   diagnostic** of the failure mode — even if each tick LOOKED like
   "waiting for a real signal," the aggregate pattern IS the
   failure mode.

## Counter-with-escalation clause (B-0540, 2026-05-16)

**Threshold**: If you've emitted **N≥6 consecutive brief-acknowledgment
signals** ("Holding" / "Standing by" / "Waiting" / "Bounded wait
continues" / "Idle" / "Idle but available" / equivalent) WITHOUT:

- A named dependency surfacing (PR merge, CI failure, review thread)
- human maintainer speaking
- Actually picking real decomposition work

**...escalate to decomposition immediately.** The N-consecutive pattern
IS the failure mode the rule was designed to catch; the brief-ack
allowance was for the "wait briefly for a named signal" case, not the
"hold for hours" case.

### Per-tick triage with the counter

| Tick number | Disposition |
|---|---|
| 1-2 brief-acks | Acceptable if real bounded wait exists |
| 3-5 brief-acks | Name the bounded wait explicitly each tick + reduce wakeup interval |
| **6+ brief-acks** | **ESCALATE — pick decomposition NOW** |

### Counter reset conditions

The counter is per-session, per-Otto-surface. Resets on ANY of:

- human maintainer speaking (the conversation became active again)
- A named dependency surfacing (PR merge, CI failure, etc.)
- Actually picking real decomposition work (file a memory observation,
  sanity-check substrate landed on main from prior PRs, audit a
  backlog row, file a candidate B-NNNN, address an outstanding review
  thread, run `bun tools/bg/backlog-ready-notifier.ts --once`,
  implement a P2 small backlog row)

### Why N=6

Empirical anchor: 2026-05-16T~01:30Z Otto-CLI emitted 6 consecutive
"Idle" / "Idle but available" / "Bounded wait continues" brief-acks
after the Kestrel conversation arc closed and all 8 session PRs landed.
The 6th brief-ack was diagnostic of the pattern recurring even WITHIN
the same session that had filed B-0540. The substrate-honest move was
picking decomposition work — which produced this rule sharpening (the
B-0540 implementation itself) on the 7th tick. N=6 is the threshold
the empirical evidence supports.

Lower bound: N≥3 would over-trigger on legitimate bounded waits where
peer Otto / human maintainer is actively engaged. Upper bound: N≥10 (the original
B-0540 proposal) waits too long and the human maintainer catches it before the rule
fires. N=6 catches the pattern before it compounds AND allows
legitimate short bounded waits.

### What counts as "actually picking real decomposition work"

To reset the counter, the work must be:

- **Concrete artifact** (memory file written, PR opened, rule updated,
  backlog row filed, review thread resolved, OR branch-pushed-no-PR
  during pure-git tier — see [`refresh-world-model-poll-pr-gate.md`](refresh-world-model-poll-pr-gate.md)
  rate-limit operational tiers; pure-git ships substrate via branch
  push and defers PR creation to post-reset, which still counts as
  concrete artifact) — NOT just an internal decision to "look at
  something"
- **Bounded scope** (small enough to ship in one tick cycle, not a
  multi-session project that becomes its own architecture-stairs trap)
- **Not the same brief-ack-with-fancier-words** ("genuine quiet" /
  "appropriate bounded wait" / "idle-but-available" / "real bounded
  named-dependency wait" are ALL brief-acks with synonyms; they count
  toward the N-consecutive threshold)

If you find yourself paralyzed about what to pick — pick THIS rule (or
its analog for whatever failure mode is recurring) and sharpen it
based on the current session's evidence. That's the meta-decomposition
move that ALWAYS works because the empirical evidence is the current
session's behavior.

## Why this rule exists (empirical evidence)

On 2026-05-13 the agent who canonized PR #2999 (substrate-honest
discipline triad including decompose-to-dissolve-ambiguity), shipped
PR #3017 (B-0440.4 — Standing-by detector with bus publish), and
wrote `tools/bg/README.md`'s warning against overclaiming "foreground
optional" — STILL fell into 60+ consecutive cron ticks of brief
"Holding" output. The human maintainer caught this THREE TIMES in
the same session.

**Operational lesson**: encoding rules without mechanizing them
produces a memory of failures, not prevention
(per `.claude/rules/encoding-rules-without-mechanizing.md`). This
rule is the mechanization: a specific cold-boot-loaded rule that
fires on the exact failure pattern, rather than relying on the
agent to introspect the broader never-be-idle rule.

### Cascade-saturation empirical anchor (2026-05-16, session ~07:46-07:50Z)

Second class of empirical evidence: the rule operating CORRECTLY through
sustained rate-limit cascade saturation. A fresh-cold-boot Otto-CLI
session ran through:

- Cycle 1 (06:43Z-06:51Z): brief-acks #1→#2→#3 during pure-git tier with
  bounded-wait naming; counter reset via named-dep (rate-limit recovery)
  per condition #2
- Cycle 2 (07:26Z-07:30Z): brief-acks #1→#2→#3→#4 during CI wait; pre-emptive
  decomposition at #4 (rule PR shipped) per condition #3
- Cycle 3 (07:36Z-07:40Z): #1→#2→#3→#4→#5 during deep extreme cost-aware tier;
  pre-emptive decomposition at #5 (B-0558 backlog row branch pushed)
- Cycle 4 (07:46Z-07:50Z): #1→#2→#3→#4→#5 during pure-git tier post-PR-flood;
  pre-emptive meta-fallback at #6 territory (THIS rule edit)

Empirical anchors validated:

1. Counter discipline allows #1-#5 with explicit bounded-wait naming. Counter
   discipline FORCES escalation at #6.
2. Pre-emptive decomposition at #4 OR #5 is substrate-honest when a clear
   high-value substrate edit is ready. Waiting for forced #6 is also valid
   when the channel is saturated and the right work isn't yet identified.
3. The meta-fallback ("sharpen this rule with current session's evidence")
   ALWAYS works at #6 because the session's behavior is always observable.
   THIS sub-section is the meta-fallback firing on the session that ran the
   cascade — recursively self-documenting.
4. Pure-git tier (rate at 0/5000) is fully compatible with concrete-artifact
   counter reset: branch push without PR creation counts. The deferred-PR
   pattern lets pure-git ticks continue producing substrate even when
   GraphQL is exhausted.
5. Multi-cycle observation: cascade saturation creates RECURRING brief-ack
   cycles as named-deps surface and re-bind. Each cycle independently
   ran through #1-#5 without hitting #6 forced escalation — the counter
   does not accumulate across cycles separated by named-dep resets.

### Sub-case 5 — peer-side destructive git operation discards unstaged edits

Discovered while authoring THIS sub-section (07:50Z): peer Otto running a
destructive git operation (e.g., `git reset --hard`, `git stash + checkout`,
or aggressive worktree-cleanup) in the shared worktree DISCARDED my
unstaged tracked-modifications that the borrow-on-existing pattern relies
on to "follow me" across `git switch`.

This is a 5th failure sub-case for [`claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md)'s saturation-ceiling taxonomy:
peer-side destructive git operations are NOT prevented by `git switch`
semantics — `git switch` only refuses when modifications would be
overwritten BY THE SWITCH, not when peer-side commands run between
Edit and commit.

**Mitigation**: commit edits IMMEDIATELY after authoring; do not rely on
unstaged tracked-modifications to survive across multiple Bash calls
during peer saturation. The Edit-then-add-then-commit sequence should
happen within a single Bash call (or two adjacent calls with no
intervening peer activity).

**Empirical**: this commit's edits had to be RE-APPLIED after peer's
destructive operation discarded the first authoring attempt. The fix
worked because the edit content was preserved in conversation context;
without that, the work would have been lost. Conversation-context
preservation is the only fallback once unstaged edits are destroyed.

**Push-time mitigation — explicit-branch-push** (2026-05-16T16:40Z empirical anchor):
when a peer agent's `git switch` race has advanced the LOCAL BRANCH REF
(not just HEAD) to point at peer's commits, the subsequent `git push -u
origin <branch>` correctly pushes that local ref — but the ref now points
at peer's commits, not yours. `git push` reads the named local ref by
design; the failure is upstream of push: peer's operations contaminated
the local ref between your commit and your push. The safer pattern when
the commit is already made and reachable by SHA:

```bash
# Create branch ref pointing at the desired SHA without moving HEAD:
git branch <new-branch-name> <commit-sha>
# Explicit-refspec push (no -u, no implicit current-branch):
git push origin <new-branch-name>:<new-branch-name>
```

This bypasses local-ref contamination at push time because:

1. `git branch <name> <sha>` creates a FRESH named ref anchored to the
   exact SHA — peer-agent `git switch -c <other-name>` or `git checkout
   -b` operations don't write to an already-named ref pointing at a
   different SHA, **provided the name is unique to your session**.
   This — the fresh unique name — is what the pattern actually protects
   against; peers don't know the ref name, so they can't repoint it.
2. `git push origin <src>:<dst>` does NOT inherently bypass ref-name
   resolution when `<src>` is a branch name. Per `git-push(1)`, `<src>`
   is "an arbitrary SHA-1 expression" — Git resolves it through the
   local ref namespace (`.git/refs/heads/<src>`) before updating the
   remote, the same as `git push -u origin <branch>` does. The explicit
   refspec form's only advantage here is removing the implicit
   current-branch dependency; the race-resistance comes entirely from
   bullet 1's fresh-unique-name property, not from the refspec syntax.
3. To push entirely by SHA and skip local ref resolution at push time,
   use the literal SHA as `<src>`: `git push origin <commit-sha>:<dst>`
   (or, equivalently, `git push origin $(git rev-parse <name>):<dst>`).
   Git pushes the object directly without consulting `.git/refs/heads/`.
   The fresh-unique-name pattern (bullet 1) is usually sufficient and
   more readable, but the literal-SHA form is the strongest defense
   when peer contention on local refs is severe.

Note on what `git push -u origin <branch>` actually does: it pushes the
named local ref `refs/heads/<branch>` (NOT the current HEAD, unless
`<branch>` happens to match `git symbolic-ref HEAD`). The footgun is
distinct: contention on `refs/heads/<branch>` itself, where a peer
agent's branch operations may have repointed your named ref to a
different SHA between commit and push. The mitigation above works
because it creates a FRESH ref with a name that peer agents don't know
to write to.

Empirical anchor: session 2026-05-16T16:30Z-16:40Z had ≥3 mid-commit
local-ref-contamination events while attempting to push a rule edit. The
final successful pattern (PR #3910) used this explicit-branch-push
sequence after `git switch -c` + `git push -u` had pushed peer-contaminated
ref state twice.

Composes with the rate-limit operational tiers documented in
[`refresh-world-model-poll-pr-gate.md`](refresh-world-model-poll-pr-gate.md)
and the saturation-ceiling taxonomy in
[`claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md).

### Forced-escalation-finds-hidden-work — empirical anchor 2026-05-16T14:00Z-15:45Z

Third class of empirical evidence: forced escalation at brief-ack #6 (and pre-emptive at #5) repeatedly surfaced substantive work that brief-ack-only ticks would have missed. Three distinct instances across one session:

| Tick | Trigger | Hidden work surfaced |
|---|---|---|
| 14:56Z | Forced escalation #6 | PR #3894 BLOCKED-armed for 22 min hid 6 Copilot review findings (last_updated, type, 0715Z, git syntax, B-0506 link, BACKLOG.md regen). All 6 fixed in one tick |
| 15:29Z | Pre-emptive at #5 | Own PR #3883 (the 13:31Z stale-armed-triage shard) was itself stale-armed for 108 min with MD032 failure — recursively ironic; fixed in same tick |
| 15:45Z | Forced escalation #6 | PR #3545 DIRTY-armed for 19+ hours (61-file conflict); forward-signal comment named two viable resolution paths + flagged possible supersession by #3886 |

**Pattern**: each forced escalation found work the visibility-only ticks (refresh-fetch-log-rate) had missed. The brief-ack discipline correctly identifies "no new substantive observation," but stale-armed-PR investigation IS substantive work; it just doesn't surface in standard refresh queries. The escalation forces the agent into the investigation discipline that finds it.

**Composes with [`blocked-green-ci-investigate-threads.md`](blocked-green-ci-investigate-threads.md)**: the investigation discipline IS what produces the hidden-work surface. The counter forces invocation of that discipline on a regular cadence.

## Composes with

- `.claude/rules/never-be-idle.md` — this rule sharpens the existing
  never-be-idle discipline at the cron-tick-Holding scope
- `.claude/rules/no-op-cadence-failure-mode.md` — addresses multi-
  hour scope; this rule addresses per-tick scope
- `.claude/rules/encoding-rules-without-mechanizing.md` — why this
  rule needed to be its own auto-load surface
- PR #2974 (infinite-backlog metabolism — there's always more)
- PR #2999 (substrate-honest discipline triad — decompose-when-stuck)
- PR #3017 + #3022 (Standing-by detector shipping; this rule is
  the cold-boot-substrate complement to the detector's runtime
  bus envelope)
- B-0440 (the failure mode this rule + detector both address)
- B-0441 slice 5 (subscriber agents — not yet shipped; when they
  arrive they READ the `infinite-backlog-nudge` envelope the
  detector publishes; until then THIS RULE is the only catch
  mechanism)

## Until subscriber agents land

The full reactive loop is:

1. Standing-by-detector polls activity (PRs #3022 + #3017)
2. Publishes `infinite-backlog-nudge` envelope to bus
3. **Subscriber agent reads envelope + nudges the idle agent**

Step 3 doesn't exist yet (slice 5+ pending). Until then, THIS RULE
is the only mechanization that prevents the failure mode at cold
boot. When slice 5 ships, this rule remains as the substrate-honest
documentation of the failure pattern.

## Full reasoning

`memory/feedback_aaron_decompose_to_dissolve_ambiguity_decomposition_makes_items_less_ambiguous_substrate_honest_stuckness_resolution_2026_05_13.md`
(PR #2999 — the decompose-to-dissolve-ambiguity canonical substrate)

`memory/feedback_aaron_background_services_must_be_strong_enough_foreground_loop_optional_imagine_surviving_without_foreground_mechanize_standing_by_failure_mode_2026_05_13.md`
(PR #2998 — the architectural-challenge substrate that produced
the bg-services suite)

Operational evidence: the empirical 60+ consecutive "Holding" ticks
on 2026-05-13 after shipping the detector + the README + the rule
substrate. The discipline-trail this rule documents.
