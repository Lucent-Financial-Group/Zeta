# Lessons belong in the harness, not in rules — and the ladder that says where

**Ferried** 2026-08-13 from Aaron, responding to a lesson written as prose (*"do not parse or count
structured text through `echo` in a shell pipeline"*):

> these lesseson all need to make it into our harness and cli, casue eventually there will just be our
> own clis and we will use 0 external dependencies and evenbefore that they will be behind our cli and
> hexagonal interfaces, so we can just make the right decision everytime and easiy code in flow fixes
> that don't need to be llm rules they can just be extgernlaized discrimanted union / workflow / cli /
> mux/duplex rules

He is right, and the pattern is already running at scale here — it just is not named, so new lessons
keep landing on the weakest rung by default.

## The pattern already exists (CHECKED)

`src/Core.TypeScript/hygiene/` holds **138 checkers**. Each one is a lesson that stopped being prose.
Two from today make the ladder visible:

- **`lean-orphan-modules.ts`** — the lesson *"a proof that nothing checks is not a proof"* became an
  executable walk of `defaultTargets` with a mandatory-reason allow-list. A module can still be
  excluded; it cannot be excluded *silently*. Written after the same defect occurred **three times**.
- **`no-agent-gate-bypass.test.ts`** — deliberately shipped as a **test**, not a rule, and the reason
  is recorded in the file: *a guard that fires on prose gets disabled, and a disabled guard is worse
  than none.* The first draft matched bare `bypass_actors` and fired on three explanatory comments.

## The ladder

Lessons are not equal, and where a lesson lands determines whether it holds. Ordered strongest first:

| rung | mechanism | enforced by | failure mode |
|---|---|---|---|
| **1. Unrepresentable** | type / DU / interface — the wrong state cannot be constructed | the compiler | requires modelling the domain properly |
| **2. Only ergonomic path** | CLI verb / port — the right call is the easy one | friction | bypassable by dropping to the raw tool |
| **3. Caught** | checker / test / drift gate | CI | fires after the mistake; needs the check to actually run |
| **4. Remembered** | prose rule, `CLAUDE.md`, a lesson in a work-item | attention | fails silently, costs cold-start tokens on every wake |

Rung 4 is where lessons land *by default*, and it is the only rung that also charges rent — every
context-startup byte is paid by every agent on every wake
([`rules-are-small-carved-sentences-pointing-to-docs.md`](../../.claude/rules/rules-are-small-carved-sentences-pointing-to-docs.md)).

**The promotion question for any new lesson is: what is the highest rung this can reach?** That is a
concrete, answerable question, and asking it is cheap.

## The honest limit — and it is the interesting part

The `echo` lesson that triggered this is a **rung-2-or-nothing** case, and seeing why sharpens what
"behind our cli" actually buys.

The bug did not occur in a committed script. It occurred in an **ad-hoc bash command issued inside an
agent session**. A repository lint would not have caught it, because there was no repository artefact to
lint. `rule-0-no-sh-files` (archived) points the right direction — TS-first, no shell scripts — but it
governs *files*, and this was a *call*.

So: **the harness can only enforce what flows through it.** Raw `bash` is the un-instrumented channel.
Every ad-hoc shell invocation is a door the harness does not own, and no amount of rule-writing closes
it — the rule is on rung 4 by construction because there is no rung-1/2/3 surface to attach to.

That is **§13 noninterference stated for tooling**: influence enters only through declared, metered
channels. The soft scheduler's injected `Source` and the room's injected `IEffects` are the doors for
*entropy*; a CLI verb is the door for *operations*. An ungoverned `bash` call is an ambient channel in
exactly the sense the discipline forbids, and it is invisible for the same reason ambient entropy is.

**This reframes Aaron's point.** Routing through our own CLI and hexagonal ports is usually argued for
on dependency grounds — fewer externals, less supply chain. The larger win is that **a channel you own
is a channel you can instrument**, and a lesson can only be externalized as far as the channel it
concerns. Zero external dependencies is the long arc; owning the *call surface* captures most of the
value immediately, and is what the hexagonal-ports ADR already set up
(`docs/DECISIONS/2026-06-21-hexagonal-pki-and-secret-vault-ports-swappable-adapters.md`).

## Today's lessons, placed on the ladder

Each of these was learned the hard way in one session. None of them should be a rule.

| lesson | highest reachable rung | shape |
|---|---|---|
| Never parse structured text through `echo` | **2** — a read/parse verb, so no shell builtin sits between bytes and parser | binds only if agents read through it; otherwise unreachable |
| `git commit -F <file>`, never inline `-m` (**executed shell 3× this session**) | **2** — a commit verb taking a message file; the inline path simply is not offered | strongest candidate: high frequency, unambiguous, already caused real damage |
| A bound must carry its derivation (the unjustified `1.2`) | **1** — a DU pairing `Bound` with a required `Derivation`, so *a bound without one is unrepresentable* | the most interesting: it turns a review habit into a type |
| A check that did not run must not look like one that passed | **3** — derive the executed set, fail on drift (work-item `081KZYPHESJ087G0R002EZ7A2H`) | exactly `lean-orphan-modules.ts` again |
| Verify content on `origin/main` after every squash merge (stranded twice) | **2** — a merge verb that verifies, so the check is not a thing you remember to do | |
| Branch from `origin/main`, never a prior local branch | **2** — a branch verb | |

The third row is worth dwelling on. `1.2` survived because "is this constant justified?" is a question a
reviewer must *think to ask*. Make `Bound` a DU carrying `Derivation | Measurement | Assumption(reason)`
and the question is asked by the compiler, every time, for free — and `Assumption("fudge factor")` is
still permitted, just no longer *silent*. That is the same move as the orphan allow-list: exclusion stays
possible, invisibility does not.

## What this is not

It is not an argument to delete the rules. Rung 4 is correct for things that are genuinely about
*judgement* — `no-directives`, the Mirror/Beacon registers, default moral regard. Those cannot be typed,
and trying would be worse than leaving them prose. The claim is narrower: **a lesson about a mechanical
operation that stays on rung 4 has been mis-filed**, and the `echo` lesson was mis-filed by me this
morning.

## Open

1. **Which of the six rows above actually has a call surface today?** `clis/Verbs.fs` is 142 lines;
   `ace-cli.ts` exists. Whether agent-side operations route through either is unverified and is the
   thing that decides whether rung 2 is reachable at all.
2. **The `Bound`/`Derivation` DU** is the highest-value single item here and the only rung-1 candidate
   in the list. It generalises past the orbital budget to every threshold, timeout, and margin in the
   substrate.
3. Whether a **promotion pass** over the existing rules is worth it — reading `.claude/rules/` and asking
   each one "what rung could this reach?" Some will be rung 4 correctly; the ones that are not are cheap
   cold-start rent being paid forever.

## Pointers

- `src/Core.TypeScript/hygiene/` (138 checkers) — the pattern, already at scale
- `hygiene/lean-orphan-modules.ts`, `hygiene/no-agent-gate-bypass.test.ts` — the two exemplars
- [`interfaces-free-classes-earned-under-rules.md`](../../.claude/rules/interfaces-free-classes-earned-under-rules.md) — rung 1 is the free-interface discipline applied to operational knowledge
- [`dv2-data-split-discipline-activated.md`](../../.claude/rules/dv2-data-split-discipline-activated.md) §13 — noninterference; ad-hoc `bash` is an ambient channel
- `docs/DECISIONS/2026-06-21-hexagonal-pki-and-secret-vault-ports-swappable-adapters.md` — the ports this hangs off
- `.claude/rules.bak/rule-0-no-sh-files.md` — TS-first; governs files, not calls, which is the gap
