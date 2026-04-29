---
name: Bare `main` is ambiguous in this repo's multi-remote setup — automation must use explicit refs (Amara 2026-04-29)
description: This repo has multiple `main` refs (`refs/remotes/origin/main` and `refs/remotes/acehack/main`) per the LFG ↔ AceHack zero-divergence-fork double-hop workflow. The local working copy may also have `refs/heads/main`. Bare `git checkout main` / `git switch main` in automation hits `fatal: 'main' matched multiple (2) remote tracking branches` and exits non-zero — and many automation scripts continue past the failure as if it succeeded. Rule: in scripts, never use bare `main`; always disambiguate. Safety-belt config (`git config checkout.defaultRemote origin`) helps in interactive sessions but is NOT a substitute for explicit refs in automation. Caught by Amara 2026-04-29 after the autonomous-loop scripts hit the fatal repeatedly. Composes with the LFG-AceHack zero-divergence-fork workflow + autonomous-loop tick discipline.
type: feedback
---

# Bare `main` is ambiguous — automation uses explicit refs

## Source

Amara 2026-04-29 forwarded by Aaron through the maintainer
channel:

> *"You don't need to be scared of 'multiple `main`' by
> itself. You **should** be worried that the automation is
> still using ambiguous Git commands like `git checkout
> main` in a repo with multiple remotes (`origin/main` and
> `acehack/main`). The exact failure appears in the latest
> log: `fatal: 'main' matched multiple (2) remote tracking
> branches` and then the loop keeps going."*

> *"The issue is not 'multiple remotes have main = bad'.
> The issue is 'scripts assume main is unambiguous = bad'."*

> *"Bare `main` is for humans. Automation uses explicit
> refs."*

> *"Multiple mains are fine. Ambiguous main in automation
> is not."*

## Why this repo has multiple `main` refs

Per the LFG ↔ AceHack **zero-divergence-fork** double-hop
workflow (defined in `CLAUDE.md`):

- `origin/main` = LFG project-trunk fork main
- `acehack/main` = AceHack dev-mirror fork main

At the close of a paired-sync round, both should converge
(0 commits ahead AND 0 commits behind). During in-flight
feature work (the normal state) the two refs diverge until
the next forward-sync. The 2026-04-29 verification:

```text
acehack/main  6755081   ← in-flight AceHack work
origin/main   d76c24d   ← LFG trunk
```

Different SHAs → expected divergence state. Both refs
are valid in their respective namespaces. The `main`
ambiguity is structural to the workflow, not a bug to fix
by removing one of them.

## The rule (load-bearing for automation, generic)

```text
Never use bare `main` in automation.
Always use an explicit ref.
```

This rule generalizes to **any repo with more than one
remote that has `main`**, not just Zeta's LFG ↔ AceHack
setup. Future-Claude dropped into recovery on a different
repo with multiple remotes (e.g., upstream-fork pairs,
mirror-pairs, multi-remote development setups) hits the
same `fatal: 'main' matched multiple remote tracking
branches` failure mode. The fix is identical:

```text
Generic:
  - Use `refs/remotes/<remote>/<branch>` to specify the
    exact remote-tracking ref.
  - Use `refs/heads/<branch>` for local branch operations.
  - Avoid bare branch names in scripts.

Zeta specifically:
  - `refs/remotes/origin/main` for LFG-trunk-based work
  - `refs/remotes/acehack/main` for dev-mirror-based work
  - `refs/heads/main` for local-branch operations only
```

### Safety-belt config (helps but is NOT the fix)

Set per-repo:

```bash
git config checkout.defaultRemote origin
```

This tells Git that when `main` is ambiguous and falls
through to remote-tracking-branch creation, prefer
`origin/main`. It helps interactive use. It does NOT
make existing scripts safe — those still need explicit
refs because the `defaultRemote` only applies in the
specific fall-through path (`git checkout <branch>` when
`<branch>` doesn't exist locally and matches multiple
remote-tracking branches). Other paths still error out
or produce wrong results.

### Preferred patterns

**Branch off LFG main for new work**:

```bash
git fetch origin main --quiet
git switch --detach refs/remotes/origin/main
git switch -c <new-branch-name>
```

**Or, with a local main branch tracking origin**:

```bash
git fetch origin main --quiet
git branch --track main origin/main 2>/dev/null || true
git switch main
git reset --hard origin/main
```

**Branch off AceHack main**:

```bash
git fetch acehack main --quiet
git switch --detach refs/remotes/acehack/main
git switch -c <new-branch-name>
```

### Preflight check (before any main-based operation)

```bash
echo "=== matching main refs ==="
git for-each-ref --format='%(refname:short) %(objectname:short)' \
  'refs/heads/main' 'refs/remotes/origin/main' 'refs/remotes/acehack/main'

echo "=== checkout.defaultRemote ==="
git config --get checkout.defaultRemote || echo "(unset)"
```

If any script sees `fatal: 'main' matched multiple remote
tracking branches`, it MUST stop and fix the base-ref
command. It must NOT continue past the fatal as if
nothing happened — that's how downstream operations end
up on the wrong starting state.

## Worked example: 2026-04-29 trace

The autonomous-loop scripts repeatedly hit:

```text
$ git checkout main
fatal: 'main' matched multiple (2) remote tracking branches
$ git reset --hard origin/main
HEAD is now at <sha> ...
```

The `git checkout main` failed but the next command
(`git reset --hard origin/main`) ran on the previous
branch, producing wrong working-tree state. Multiple
ticks worth of branch operations were silently incorrect.

Amara caught this by reading the trace; it had been
hidden by the exit-code-zero of the followups even
though the checkout failed.

## What this rule does NOT mean

- Doesn't mean the repo should not have multiple remotes
  with `main`. The dual-remote setup is structural to the
  zero-divergence-fork workflow — both `origin` (LFG) and
  `acehack` (dev mirror) are required.
- Doesn't mean every `git` invocation needs to wrap the
  ref. Interactive human use of `git checkout main` is
  fine — the human disambiguates by intent.
- Doesn't mean removing `acehack` as a remote. That remote
  is the mirror-fork pointer and is required.

## Composes with

- `memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_aaron_2026_04_27.md`
  — the LFG ↔ AceHack workflow that produces the dual-
  remote setup.
- `memory/feedback_zero_diff_is_start_line_until_then_hobbling_aaron_2026_04_27.md`
  — the zero-divergence invariant.
- `CLAUDE.md` — wake-time governance ground rules.

## Distilled keepers

```text
Bare `main` is for humans.
Automation uses explicit refs.
```

```text
Multiple mains are fine.
Ambiguous `main` in automation is not.
```

```text
A failed checkout that the script ignores produces wrong
downstream state. Stop on fatal; never continue past it.
```

```text
Safety-belt config (checkout.defaultRemote=origin) helps
interactive use; it does NOT make scripts safe.
The fix is explicit refs in automation.
```
