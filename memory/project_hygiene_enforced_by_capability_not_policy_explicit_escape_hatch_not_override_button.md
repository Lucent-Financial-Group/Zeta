---
name: project-hygiene-enforced-by-capability-not-policy-explicit-escape-hatch-not-override-button
description: Aaron's direction — check-in hygiene moves INTO the CLIs/zetafs/db/ace so only safe commands exist at execution time; escape hatches must be explicit and named, never a blanket override button.
metadata:
  type: project
---

Aaron 2026-08-26: *"over time we want the hygiene to be built into our CLIs and
zetafs/db, ace, etc... that way the only commands available at the time of
execution are the ones that are safe, with an escape hatch of course but an
explicit escape hatch not an emergency override button lol."*

Prompted by observing that models outside the OpenAI/Anthropic families struggle
with commit hygiene — but the conclusion is architectural, not about model
quality.

**Why:** a rule that must be *remembered* is a rule that will be forgotten at the
context boundary. An agent near its budget produces incomplete-but-plausible work
(the empty-method-under-a-signature failure). Substrate that enforces holds under
exhaustion; documentation does not. So don't ask the model to hold the discipline
— remove the unsafe capability.

**The distinction to preserve:**

| | override button | explicit escape hatch |
|---|---|---|
| argument | none — disables everything | must NAME what is being escaped |
| scope | blanket | narrow, one thing |
| record | nothing typed | the name IS an artifact |
| cost | cheaper than compliance | more expensive than compliance |

That last row is the load-bearing one. An override cheaper than doing it right
gets used every time.

**Canonical instance:** `gh pr merge --admin`. Used 2026-08-26 08:32 on #15536,
bypassing three checks (`gate (required)`, `lint (TS)`, `agencysignature`).
Nothing records which three or why — reconstructable only from the check-runs API
after the fact. The `lint (TS)` red then blocked every open PR for 27 minutes.

**The escape hatch is "write the missing CLI" — and that is the elegant part.**
Aaron 2026-08-26, correcting an earlier framing of mine: *"we don't want bash
access at all or random os commands. ace is trying to close over all operating
systems so you only go through our hexagonal port interfaces and if we are
missing one we don't call bash, we write the missing cli."*

So the hatch is not a named bypass — it is construction. It is more expensive
than compliance, narrow (one port), leaves an artifact (a tested CLI), AND every
use makes the system MORE complete. Contrast `--admin`: every use degrades the
guarantee and leaves nothing behind. An escape hatch that improves the substrate
is strictly stronger than one that merely records itself.

I had framed the "real problem" as *a restricted CLI does not restrict the
shell*. That assumed bash is ambient and needs a fence. **It is not granted at
all** — there is no fence to design, the capability is simply absent from the
set. The harness has the start of this; Aaron labels the tool-calling half a
**toy** today, which is the honest register.

**Still open (asked, unanswered):** does "no bash" mean no `exec` anywhere, or no
*model-authored* `exec` at runtime? A git adapter must reach git somehow. If the
adapter execs internally, the surface is still closed — the exec is committed,
reviewed, tested code rather than a model-composed string. Same line as
no-ad-hoc-sudo. The two readings imply very different amounts of work.

**Do not let `clone-at-tag-stays-sufficient` be cited against this.** Different
axes: clone-at-tag governs what a CONSUMER needs to build (ace must never be the
only path); this governs what capability an AGENT holds. Restricting an agent to
ace does not make ace mandatory for building.

**How to apply:** when proposing a guard, ask where it is *enforced*, not where it
is *stated*. Prefer removing the capability over documenting the rule. If a bypass
is needed, make it name its target and leave an artifact.

**Anchors (Beacon):** object capabilities — Dennis & Van Horn (1966); Mark Miller
on ocap; POLA (principle of least authority). The transferable core is
unbundling *designation* from *authority*: naming a command and being permitted
to run it are two separate things. Also the repo's own closed-command-set rule in
[[.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md]] — "the far side
may name a command but can never define one" — this is that discipline turned
inward, and [[feedback_no_adhoc_sudo_privileged_ops_are_committed_tested_reviewable_code_2026_08_24]].
