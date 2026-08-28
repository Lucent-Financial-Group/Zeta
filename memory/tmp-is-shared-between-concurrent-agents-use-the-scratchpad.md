---
name: tmp-is-shared-between-concurrent-agents-use-the-scratchpad
description: "/tmp is shared across every concurrent agent on this machine; two agents writing /tmp/prbody.md clobbered each other and one pushed the wrong PR body"
metadata:
  type: feedback
---

2026-08-26: an agent reported that "another process overwrote `/tmp/prbody.md`
mid-task and I briefly pushed an unrelated document as PR #15525's body." It caught
and restored it within a minute.

**That other process was very likely me.** I had been writing PR bodies to
`/tmp/prbody.md` and `/tmp/pr-*.md` all session while five to six background agents
ran concurrently on the same machine. The filenames are the obvious ones, which is
exactly why they collide.

**The rule:** write scratch files to the session scratchpad directory named in the
system prompt, never to `/tmp`, whenever any other agent could be running. The
scratchpad is session-scoped; `/tmp` is machine-scoped and every agent reaches for
the same handful of names (`prbody.md`, `out.txt`, `body.md`).

**Why it is worse than it looks.** The failure is SILENT and the artifact still
looks well-formed: a PR gets a body, it is just the wrong body. Nothing errors,
nothing goes red, and the only way it is caught is a human or agent re-reading what
it published. Same shape as the rest of this repo's failure catalogue — a step that
appears to have succeeded while carrying someone else's content.

**Related shared-state hazard, same session:** the shared clone
`/Users/acehack/zeta-wt-actions` was `git reset --hard`ed out from under two
different agents by a third. Nothing was lost either time because the work had been
pushed. **Push immediately; never hold state in a shared worktree.** Prefer a
private worktree (`git worktree add ~/zeta-wt-<task> -B <branch> origin/main`).

Related: [[verify-the-tree-not-just-the-command]] ·
[[running-a-ci-tool-locally-without-ci-env-fakes-a-finding]]
