---
name: feedback-errors-should-teach-the-user-when-they-fail
description: "Aaron's named design vibe — a failure message must TEACH the user, not just report; the error is a pedagogy surface"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-09T18:46:47.058Z
---

Aaron 2026-08-09, on the unprovisioned-environment guard in `lint-typescript.ts`:

> *"this is perfect cause it teaches the user when it fails, that's the vibe i'm
> going for precisely."*

**The principle:** a failure is the moment the user is most attentive and most
stuck — so the error message is a **pedagogy surface**, not a status report. When
something fails, the output should leave the user *knowing more than they did
before it failed*.

**Why:** this is [[user-aaron-the-only-sin-is-because-i-said-so]] applied to machine
output. "Exit code 2" is the software equivalent of "because I said so" — it
asserts failure and withholds the reason. It is also the Stump-Dad pedagogy
(`user_aaron_stump_dad_game_origin_of_craft_pedagogy_why_until_i_dont_know_2026_06_10.md`
— that file carries an empty `name:`, so it is cited by path, not wikilink)
pointed at the tool surface: keep answering WHY until there is nothing
left to ask, or say honestly that you don't know.

**How to apply** — the four things a teaching failure carries:

1. **WHAT is wrong**, named concretely (the specific module, file, marker — not a category).
2. **WHY it happened**, including the distinction the tool itself can't make
   (e.g. "declared but not installed" vs "genuinely undeclared").
3. **HOW to fix it**, as a runnable command, not a description of a fix.
4. **WHAT WON'T reproduce it**, when the failure is environment-specific — the
   most expensive failures are the ones that look like findings but aren't.

The worked example (PR #10203): a phantom `TS2307: Cannot find module 'playwright'`
had convinced **two independent reviewers** that CI was red when it was green.
The fix wasn't only to prevent the state — it was to make the failure *explain
itself* so no reviewer burns a cycle on it again. Related: the same instinct
produced "grace in the artifact, strict in the test" (081KZETP6AT) — auto-heal
absorbs transients, but the assertion must SHOUT with a legible reason on genuine
exhaustion.

**Corollary:** never soften a failure into silence to make output look clean. The
choice is not loud-vs-quiet, it is *teaching-vs-mute*. A silent failure and an
unexplained failure are the same defect wearing different clothes.

Candidate for a `.claude/rules/` carved sentence after a cooling period —
deliberately NOT added unilaterally (rules are razored; cold-start tokens are paid
by every agent on every wake).
