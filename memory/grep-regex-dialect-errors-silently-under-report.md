---
name: grep-regex-dialect-errors-silently-under-report
description: "`\\|` under `grep -E` matches a literal pipe — every alternated term silently returns 0 hits; three false 'not in the repo' reports in one session"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 21d1a9c2-bd74-472a-abbe-cbd7e052b883
---

`grep -E 'a\|b'` searches for the **literal string** `a|b`. In ERE, alternation is
bare `|`; `\|` is an escaped literal. So every multi-term search written with BRE
syntax under `-E` returns **zero hits and exit 0** — indistinguishable from "the
repo does not contain this."

**Measured cost, 2026-08-23:** reported "zero files cover langsec, weird machines,
ROP, Rice's theorem, Shacham, Dullien" to Aaron and **shipped it in a commit
message**. Re-measured: **Rice's theorem was in 15 files**, langsec 3, Bratus 3,
Sassaman 5. A subagent separately found `sheaf` in 5 research docs *and shipped
code* (`cover-acyclicity/witness.ts`) and `holonomy` in 11, after I had reported
both as near-absent.

**Three distinct grep failures in one session** — stale shared checkout, `\|`
under `-E`, and a loop that mis-split its input and printed one prefixed line then
dumped the rest raw. Aaron 2026-08-23 on the first: *"not sure why your greps are
missing the information — this is why we need our own tools to close over the OS.
The built-in ones are unreliable."* Three for three; he was right, and this is the
standing argument for the git-native reverse index.

**How to apply:**
- Alternation under `-E` is bare `|`. When unsure, run **one term per call** —
  cheaper than a false negative that reaches a commit.
- Always `git grep <term> origin/main`, never `grep -r` (the shared checkout goes
  stale; it was 336 commits behind once this session).
- **A zero result is a claim, and it needs the same scrutiny as a positive one.**
  Before reporting "absent", run one term you *know* is present as a control — if
  the control returns 0, the query is broken, not the repo.
- In shell loops, `while IFS= read -r f` over a file, never `for f in $VAR` on
  newline-separated data.

Related: [[verify-the-tree-not-just-the-command]] · [[markdownlint-research-carve-out-makes-rc0-vacuous]]
