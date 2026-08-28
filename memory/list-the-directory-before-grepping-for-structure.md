---
name: list-the-directory-before-grepping-for-structure
description: "When asking 'does X exist in this repo', LIST the directory (git ls-tree) — grep with path filters produced six false 'absent' findings in one day"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e56d9872-e642-4c31-9d7d-4defb6a291dc
---

**`git grep` answers "where is this string". It does NOT answer "does this
capability exist".** For the second question, `git ls-tree -r --name-only
origin/main -- <dir>` and read the structure.

**Measured cost, 2026-08-24 — six false "absent" findings in one session:**

| claim I made | reality | why the grep missed it |
|---|---|---|
| "Rice's theorem: 0 files" | **15 files** | `\|` under `grep -E` is a literal pipe |
| "sheaf: essentially absent" | 5 research docs **+ shipped code** | over-narrow path filter |
| "only browser file touching localStorage" | **22 files, 71 sites** | filtered to `*.ts` in 3 dirs, missed every `.tsx` |
| "no declarative surface for brew" | `tools/setup/manifests/brew` **exists** | filtered to 3 paths, never listed `tools/setup/` |
| "no `declarative/` anywhere" | `tools/setup/manifests/` is it, under another name | searched for the *name*, not the *shape* |
| "eslint never invoked" | true for 54 min, then superseded | measurement raced the tree |

Aaron, after the third: *"there absolutely is or should be, we've talked about
this 100s of times lol"* — and *"we created our own declarative dependencies
files at one point in this repo … just try another deep search."* He was right
every time.

## How to apply

- **"Does X exist?" → `git ls-tree -r --name-only origin/main -- <plausible-dir>`
  and READ IT.** One call, no regex, no path-filter guess. It would have found
  `manifests/brew` immediately.
- **A search for a NAME misses a thing under a different name.** Search the
  *shape*: for a dependency manifest, list `tools/`, `setup/`, `config/` rather
  than grepping `Brewfile`.
- **A zero or small result is a claim.** Run a control term you know is present
  (`Codd`=27, `dotnet`=929). If the control returns 0, the query is broken.
- **Search history too when told something used to exist:**
  `git log --all --diff-filter=D --name-only` finds what was removed.
- **Alternation under `-E` is bare `|`.** When unsure, one term per call.
- **Ask the human's memory as evidence.** "We've talked about this 100s of times"
  is a strong prior that the thing exists under a name you have not guessed —
  treat it as a search instruction, not an opinion.

Related: [[grep-regex-dialect-errors-silently-under-report]] ·
[[verify-the-tree-not-just-the-command]]
