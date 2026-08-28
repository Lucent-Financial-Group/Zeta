---
name: A check that ran against an unverified tree is a check that did not run — print the SHA with the result
description: Three stale-tree errors in one session (2026-08-20). Resetting to origin/main then testing while main advances produces a real-looking pass/fail about a tree that no longer exists. The fix is mechanical - fetch immediately before any claim, and print the SHA next to the result.
metadata:
  type: feedback
---

**Three times in one session (2026-08-20)** I reported a test result that was true of a
tree nobody was asking about:

1. "Verified 4 pass" for an auto-vivify fix — run against detached HEAD `0c1fac98` while
   main was at `baf4b229`. Re-run on real main gave **5** pass. *Only the differing test
   count exposed it*; had both read 4, the false verification would have shipped.
2. A background hygiene sweep reported **"exit code 0"** with an empty output file. That
   status was `tail`'s, not `bun`'s — a pipeline returns the last command's status. Taken
   at face value it would have read as "sweep passed".
3. "**Main is red** on the collation lint" — run against `15b80d211d` after main had
   advanced to `1189725dd3` and the fix had merged in between. Main was **green**.

**Why:** this is the vacuity class pointed at *context* rather than at assertions. The
command really ran and really printed a number; what was false was the **subject** of the
sentence. That makes it worse than a failing check, because a failing check announces
itself and this one reads as diligence. It is the same failure as
[[toy-is-free-metered-must-be-earned]] one level up: *a check that did not run must never
look like a check that passed* — and "ran against the wrong tree" is a check that did not
run.

It is also **not** a knowledge problem. Every instance had the information available in the
same shell.

**How to apply:**

- **`git fetch` immediately before any claim about `main`** — not at the top of a long tick,
  since main moves under you while you work. In this session main advanced several times
  *within a single tick*.
- **Print the SHA next to the result.** `echo "tree $(git rev-parse --short HEAD) main
  $(git rev-parse --short origin/main)"` beside the pass/fail. This is what finally caught
  #3, and it costs one line. If the two disagree, the result is about neither.
- **Never read an exit status through a pipe.** `cmd | tail` reports `tail`. Redirect to a
  file and check `$?` on the command itself, or use `PIPESTATUS`.
- **A differing count between two runs of "the same" test is evidence about the tree, not
  noise.** That was the only tell in #1.
- Applies equally to `gh pr checks` — it can surface a *stale run*. Read the failing STEP
  (`gh api .../actions/jobs/<id>`), never the job name: three failures one day were the same
  toolchain timeout wearing three different job names, one of which was "lint (no conflict
  markers)".

Related: [[toy-is-free-metered-must-be-earned]] ·
[[feedback_vacuous_claims_and_unimplemented_exceptions_are_the_biggest_obstacle_to_human_ai_trust_aaron]]

## The count is not the exit status either — ANSI codes break the pattern (2026-08-21)

A second, subtler instance of the same class, caught only because a subagent hit
its own version of it and I checked mine. All session I verified TypeScript with:

    bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'

and read `0` as "clean". This was **vacuous every single time**. `tsc` colorizes
its output, so the literal string is `error` ESC`[0m`ESC`[90m` `TS2322` — the
substring `error TS` NEVER appears, and `grep -c` therefore always printed `0`,
whether the tree had zero errors or a thousand.

Proven with a canary: a file with `const x: number = "str"` gives `tsc exit=2`
and names the file, while the same grep still printed `0`.

The existing rule above ("never read an exit status through a pipe") did **not**
cover it — I was not reading an exit status, I was reading a *count*, and the
count itself was corrupted. The general form:

> **A grep pattern over a tool's own formatted output is a check that can
> silently match nothing.** Colour codes, wrapping, and localisation all break
> substring patterns without any error.

The fix, and the shape to reuse for any tool:

    cmd > /tmp/out.txt 2>&1; echo "exit=$?"          # exit code is the verdict
    sed 's/\x1b\[[0-9;]*m//g' /tmp/out.txt | grep -c 'error TS'   # strip colour first

Better still: pass the tool's own no-colour flag where one exists. And **canary
the checker** — introduce a deliberate error, confirm the check goes red,
restore. A verification method that has never been shown to fail is exactly the
thing this file is about.

The conclusions I had drawn happened to be correct (`tsc exit=0` on the real
tree), which is the dangerous part: a broken method that agrees with reality by
luck produces confident, unfalsifiable reports.

## A CI re-run replays the RECORDED ref — it does not re-test against current base (2026-08-21)

Made this mistake TWICE in one session, on two different checks, after diagnosing
it the first time. It is the same family as the rest of this file: a result
attributed to a tree it did not run on.

`gh run rerun` / `gh run rerun --failed` re-executes the job against the commit
and event payload **recorded on the original run**. It does NOT re-merge the PR
against the current base, and it does NOT re-read mutable PR state.

* **Instance 1** — edited a PR body to fix an invalid trailer value, then
  re-ran the validator. It kept failing on the OLD body, because the job reads
  `github.event.pull_request.body` from the replayed payload. The fix was to
  fire a fresh `edited` event, not to re-run.
* **Instance 2** — re-ran a two-day-old failing CI job and reported that it
  "picked up two days of fixes." It did not. Caught only by reading the run's
  own fields:

      created_at     = 2026-08-19T00:44:12Z   <- what was actually tested
      run_started_at = 2026-08-21T15:04:31Z   <- when attempt 2 executed

  `run_started_at` is the seductive one: it is today's date on a stale test. I
  had already told a human collaborator "your change is not the cause" on the
  strength of it, and had to retract it publicly.

**The rule:** a re-run answers "was this flaky?" It CANNOT answer "does it pass
now that the base moved." For the second question the branch needs a fresh
event — merge the base in, or push. Before drawing any conclusion from a re-run,
read `created_at` (not `run_started_at`) and the `head_sha`, and say which tree
the result belongs to.

**Corollary for other people's PRs:** when the honest next step is a fresh event
on a branch you do not own, offer it rather than pushing — but do not substitute
a re-run and present it as equivalent. It is not.


---

## The shared checkout is 300+ commits stale — NEVER `grep -r` it (2026-08-23)

Same rule, a surface I had not applied it to: **searching the repo**.

I ran `grep -rli "landauer"` over `/Users/acehack/Documents/src/repos/Zeta`
and reported **0 files** to Aaron — telling him a concept he has written about
repeatedly was absent from his own repo. The truth is **52 files**, one of them
a rule mentioning it **32 times**
(`.claude/rules.bak/forgetting-costs-energy-remembering-is-cheap-landauer-bounded-...md`).

    git rev-parse --short HEAD          = 016876730b
    git rev-parse --short origin/main   = f2dcd82c50
    git rev-list --count HEAD..origin/main = 336

**The shared checkout's WORKING TREE was 336 commits behind `origin/main`.**
`git fetch` updates `origin/main`; it does **not** move `HEAD`. So every
`git rev-parse origin/main` I printed looked fresh while every file I read and
every `grep -r` I ran hit a months-old tree. Printing the SHA is not enough when
the SHA printed is not the SHA searched.

**How to apply — in the shared checkout, or any checkout you did not just pull:**

- Search with **`git grep -il "<term>" origin/main`** — it searches the *committed*
  tree at an explicit rev, and covers all file types with no `--include` guessing.
- Read files with **`git show origin/main:<path>`**, not `cat <path>`.
- If you must use the working tree, first assert
  `git rev-list --count HEAD..origin/main` is 0 and say so.

**Why this one stings:** a stale `grep` returns a clean, confident, **wrong** answer
with no signal anything is off. Zero hits and "could not answer" are byte-identical
at the shell — the vacuity class, in the search surface. It is also the third
stale-tree false report in this session's family, and the first where I contradicted
the human about his own work.

Consequence: Aaron asked for a git-native reverse index whose artifact records the
rev it was built from and whose query interface refuses/warns on a stale index —
so "0 hits" can never again be indistinguishable from "asked the wrong tree".

## Fourth instance (2026-08-24): a suppressed `git checkout` is a silent no-op

New failure path, distinct from a stale *shared* checkout: my own clone was parked on
a feature branch, I ran `git checkout -q origin/main 2>/dev/null`, and the checkout
**never landed** — stderr was suppressed, rc was never read. I then read
`data/platform-drift.json` from that branch's tree and reported the drift ledger as
stalled at `22:00:34Z`. The object at `origin/main` said `22:19:46Z`. Publication was
healthy the whole time. The same defect silently invalidated that tick's
"main green on arity + actionlint" — those ran against the feature branch's tree.

**The durable fix, now in use:** a dedicated worktree pinned to main
(`~/zeta-clones/main-floor`, `git worktree add --detach`) that every floor check runs
in, and which prints `HEAD` beside `origin/main` before any result is quoted. For a
single file, read the object directly — `git show origin/main:<path>` — never the
working tree. See [[shared-checkout-goes-stale-fast-and-agents-keep-reading-it]].

**Generalisation worth holding:** `cmd 2>/dev/null` on a *state-changing* command
converts a failure into a silent no-op, and every later step then measures the
unchanged state. Suppress stderr on queries, never on state changes.
