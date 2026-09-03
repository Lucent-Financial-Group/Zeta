---
id: 081M1K2XW6V087G0R000QR7XFK
type: task
state: backlog
priority: P2
slug: the-default-event-transport-had-one-assertion-that-could-not
title: "The default event transport had one assertion that could not fail"
created: 2026-09-03T08:20:00.000Z
depends_on: []
composes_with: []
---

# The default event transport had one assertion that could not fail

## The gap

`gitCommitToMain` is the **sovereign transport for every event the loop emits** — it commits the
event file and pushes it to `origin/main`. Its entire test coverage was one assertion, under a
`describe` block named _"real default; not run here"_:

```ts
expect(typeof gitCommitToMain).toBe("function");
```

That cannot fail while the import resolves. The stated reasoning was that the real git path _"is
exercised by the runtime, not unit tests"_ — which describes **where the failures would land**
(production, against `origin/main`), not a test.

## What is exercised now

A real bare repository standing in for `origin`, a working clone, and a second clone acting as a
peer. Real `add` / `commit` / `push` / `pull --rebase`. Nothing mocked, nothing able to reach a
network or the Zeta remote — every path is a temp directory.

- the event reaches **origin**, not merely a local commit
- the envelope is stamped into the commit message, and the transport names itself
- a re-append of an already-landed event is an **idempotent ok** and grows history by nothing
- running off a main checkout is **refused**, and pushes nothing
- a peer that advanced `origin/main` first does not cost the event — the rebase-retry lands it and
  **both** events survive
- a push that cannot land **undoes the local commit**, leaving no residue
- the index is clean afterwards, so the next tick's rebase is not blocked by a staged phantom

## The claim that most needed checking

The undo path carries a strong comment: a `reset --hard` _"would wipe an agent's concurrent
uncommitted work in other files"_, so the code does a targeted `reset --soft` + `restore --staged`
and promises **"every other file exactly as it was"**.

Nothing checked it. A failure there surfaces as another agent's work vanishing, hours later, blamed
on anything but the sink.

## Mutation matrix — 3/3 killed

| mutant                                 | killed by                                               |
| -------------------------------------- | ------------------------------------------------------- |
| the undo becomes `reset --hard HEAD~1` | _the undo does not touch a concurrent uncommitted edit_ |
| the undo does nothing                  | _undoes its local commit … leaving no residue_          |
| the main-checkout guard removed        | _REFUSES to run off a main checkout_                    |

The first is the point: it is **exactly the mutation the source comment warns about**, and until now
nothing would have caught it.

## Three tests that passed for the wrong reason, and how

The first version injected failure by pointing `origin` at a path that does not exist. That made
`fetch` throw at the **top** of `gitCommitToMain`, before `git add` — so the sink never created a
commit, the undo path was never entered, and _"HEAD is unchanged"_ was trivially true.

**All three passed while testing nothing.** Caught by reading the git stderr the run emitted —
`pathspec 'events/doomed.json' did not match any file(s) known to git` — which only makes sense if
`git add` never ran.

The honest injection is a `pre-receive` hook on the bare repo: the remote stays a real repository,
fetch and `pull --rebase` succeed, and **only the push is refused**. The sink then commits, retries
three times, and reaches the undo it promises.

## An observation about the sink, recorded rather than hidden

The undo path reaches `pull --rebase --autostash`, which round-trips a dirty tracked file through
the stash. On a host with `core.autocrlf=true` — the Windows default — git **rewrites that file's
line endings** on the way back.

The agent's work is not lost; the content survives. But the bytes change. So the sink's promise is
_"your concurrent edit survives"_, not _"your file is untouched byte for byte"_, and the difference
belongs to the platform rather than to the sink. The test pins `core.autocrlf=false` so it measures
the sink instead of the host's newline policy, and says why in the fixture.

## Falsifiers

```
bun test src/Core.TypeScript/observe/event-sink-folder.git.test.ts   # 8 pass
bun test src/Core.TypeScript/observe/event-sink-folder.test.ts       # 20 pass
```
