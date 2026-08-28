---
name: diffing-against-a-moving-tip-measures-drift-not-content
description: Comparing work against origin/main's tip measures how far main moved, not what the work contains — use merge-base, patch-id (git cherry), or object-DB presence.
metadata:
  type: feedback
---

**Never answer "does this work already exist in main?" by diffing against main's
tip.** Main moves, and in this repo it also **squash-merges**, so both obvious
tests are wrong in the same direction — they report drift as if it were content:

| test | why it lies |
|---|---|
| `git diff origin/main <ref>` | shows every file main changed since the branch point. An old ref differs in thousands of files while contributing nothing. |
| `git rev-list <ref> --not origin/main` | squash-merge rewrites commits, so a **fully merged** branch still shows all its commits as "not in main". Never 0. |
| blob-hash vs `origin/main:<path>` | lockfiles, `data/*.jsonl` telemetry, `BACKLOG.md`/`ROADMAP.md` differ merely because main advanced. |

**What actually answers it:**
- `git cherry origin/main <ref> <merge-base>` — compares by **patch-id**, which
  survives squash and rebase. `-` = already in main, `+` = genuinely absent.
- `git diff <merge-base> <ref>` — the ref's OWN change, not main's drift.
- For loose files: hash them and ask whether the blob exists in the object
  database at all (`git cat-file --batch-check`), which is a content question
  rather than a comparison question.

**Why:** made this error THREE times on 2026-08-28 in one session — stale
remote-tracking refs made 92 clean dirs look unpushed; blob-vs-main made
regenerated lockfiles look like unique work; and `diff main..tag` made all 366
archive tags look divergent (with counts like 6691 commits "ahead"). Each time the
tell was the same: an implausibly large or uniform result. **A number that says
"everything is unique" is measuring the comparison, not the subject.**

**How to apply:** when a difference count comes back suspiciously large or
suspiciously uniform, suspect the baseline before believing the result. Pair with
[[verify-the-tree-not-just-the-command]] and
[[shared-checkout-goes-stale-fast-and-agents-keep-reading-it]].
