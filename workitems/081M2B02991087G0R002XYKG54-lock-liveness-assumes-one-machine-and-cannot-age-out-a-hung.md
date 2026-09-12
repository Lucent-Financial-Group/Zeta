---
id: 081M2B02991087G0R002XYKG54
type: task
state: backlog
priority: P2
slug: lock-liveness-assumes-one-machine-and-cannot-age-out-a-hung
title: "lock liveness assumes one machine and cannot age out a hung holder"
created: 2026-09-12T14:24:12.577Z
depends_on: []
composes_with: []
---

# lock liveness assumes one machine and cannot age out a hung holder

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M2B02991087G0R002XYKG54-*.md` glob. -->

## Origin

Aaron, 2026-09-12, on the `exclusive-lock` protocol landing in #17335:

> *"can this make you get stuck forever if the agent never releases the lock? should they
> have timeouts or something?"*
> *"also kill pid is assuming the agents are on the same machine, our will often not be"*

Both are true, and they are **one** defect rather than two.

## What #17335 fixed, and what it did not

#17335 removed the FILESYSTEM race: a holder is `<generation>.lock`, a stale generation is
superseded by `generation+1` rather than deleted, and no process unlinks an object it did
not create. That is sound and is not what this row is about.

It left the **failure detector** untouched. `exclusive-lock.ts` says so itself:

> *"this is advisory and cooperative, and staleness is decided by the caller's predicate —
> typically `kill(pid, 0)` liveness … it does not turn pid liveness into a perfect failure
> detector, and nothing can."*

## Two failure modes the predicate cannot see

**1. A HUNG holder never ages out.** A process alive but wedged — a stalled network read,
`SIGSTOP`, a pathological retry — answers `kill(pid,0)` as alive, so the lock is obeyed
indefinitely. A crash is handled; a hang is not, and there is no deadline anywhere in the
protocol.

**2. A REMOTE holder is judged by the local kernel.** `LockOwner` is `{ pid, startedAt }`
with **no machine identity**, so the predicate cannot tell it is being asked about a foreign
process. Measured 2026-09-12:

| surface | lock path | cross-machine today? |
|---|---|---|
| `bus/claim.ts` | `BUS_DIR = /tmp/zeta-bus` | no — local by construction, so the pid check is consistent with its transport |
| `corporate/store-lock.ts` | `storeDir`, caller-supplied | **yes, already possible** — nothing stops two machines pointing at one store over a network mount or synced directory |

So `claim` is latent and `store-lock` is exposed **now**, silently.

**And it fails in the dangerous direction.** A remote holder's pid is almost certainly not
running on the observing machine, so `kill(pid,0)` reads DEAD, the lock is taken, and two
live writers proceed — the same two-holders state #17335 just removed, reached by a
different route. The opposite error (a recycled local pid belonging to an unrelated program
reads ALIVE) merely wedges, which at least errs toward not running.

## Why a bare timeout is NOT the fix

Adding "after N minutes, take it" converts *stuck forever* into *silent double-write*: the
deadline cannot guarantee the old holder stopped, only that it has not been seen recently. A
holder in a long GC pause or a slow syscall wakes mid-write and interleaves. A lease without
a fence is the defect in a hat.

**Anchor:** Kleppmann, *How to do distributed locking* (2016) — the fencing-token argument
against lease-only distributed locks; the failure is drawn as exactly this interleaving.

## The shape that works

The two questions have one answer, because both need liveness that does not depend on the
observer's kernel:

1. **Liveness the holder ASSERTS, not one the observer INFERS.** A lease the holder renews.
   Works across machines because it needs nothing about the holder's OS, and it ages out a
   hung holder, which `kill(pid,0)` can never do.
2. **The generation IS a fencing token — make the resource check it.** It is already
   monotonic and already recorded. The protected resource (the org store's writer, the bus's
   publish) refuses any write carrying a generation below the highest it has seen, so a stale
   holder that wakes up is rejected rather than interleaved. **This is the piece that does
   not exist**: nothing downstream inspects the generation it is writing under.
3. **Make the predicate three-valued.** A foreign pid is `unknown`, never `dead`, and
   unknown must not authorize a takeover. That needs a machine identity on `LockOwner`
   (host + boot id, so a reboot is distinguishable) — which is also what lets a caller
   recognise that it is being asked a question it cannot answer.

## Cheap partial win, available without any of the above

`store-lock`'s owner record already carries `startedAt`. A caller can report *"held for 3h
by pid N since T"* instead of blocking silently. That turns an invisible wedge into a
visible one and changes no correctness property — worth doing first and separately.

## Falsifier

Two branches of it, and both must be written before either fix is believed:

- **Hang:** a holder that is alive and never releases; a waiter must eventually proceed
  AND the hung holder's later write must be REFUSED. A test where the waiter proceeds and
  the old holder's write still lands is the double-write this row exists to prevent.
- **Cross-machine:** an owner record naming a pid on another host; the predicate must
  return `unknown` and the takeover must NOT happen. Today this case returns `dead` and
  takes the lock, so the test fails against current code — which is what makes it a
  falsifier rather than a description.

## Related

- `.claude/rules/local-time-never-enters-the-shared-fold.md` — a deadline here is legitimate:
  local wall-clock steering a LOCAL decision (wait, retry, give up) is explicitly permitted.
  What the fence must never become is local time deciding what enters a shared conclusion.
- `.claude/rules/dual-use-detection-is-neutral-oracle-decides.md` — "meters never judge". The
  liveness predicate is a meter and should report `alive` / `dead` / `unknown`; whether an
  unknown authorizes a takeover is policy, and today the two are fused into one boolean.
