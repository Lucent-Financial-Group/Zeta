---
name: reference-pumpable-synccontext-must-own-and-restore-thread-context-or-caller-deadlocks
description: "A pumpable SynchronizationContext must install itself as current for the pump's DURATION and restore after; setting-without-restoring leaks it onto the caller thread and deadlocks the caller's own awaits"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

The deterministic-SynchronizationContext deadlock, caught building FerryThrottler
Option-A 4b (#8111), `src/Core/DeterministicSyncContext.fs`.

**The rule:** a single-threaded *pumpable* `SynchronizationContext` must, in its
pump method, install itself as the thread's current context for the **whole pump**
and **restore the previous one in a `finally`** — the standard message-pump
contract. Two reasons:
1. A continuation resumed during the pump must see the context as current so its
   *next* `await` re-captures it and stays on the deterministic thread (the replay
   chain holds).
2. Restoring on exit means the *caller's* own later `await`s are NOT trapped in the
   (now-idle) context.

**The bug (what NOT to do):** setting the context inside the work-launch callback
(`SetSynchronizationContext sc` with no restore) leaks `sc` onto the caller/pump
thread. The caller's subsequent `do!`/`let!` then capture the idle `sc` and post
their continuations into a context that is never pumped again → **silent
deadlock** (tests hang with zero output). The launcher should touch NO thread's
context — a context is current on its own thread *while it runs its callbacks*, by
contract, so the launcher just `Post`s onto it.

**Detection:** a hung async test produces no output and looks identical to "still
building." Use `dotnet test --blame-hang-timeout 45s` — it collects a hang dump +
Sequence file naming the in-flight test. (Don't conflate slow-build with hang:
check `ps` for `vstest.console`/`testhost` actually running.)

Related: [[project-option-a-async-context-threading-roadmap-ferrythrottler]].
Lock-free detail: the pump queue is `ConcurrentQueue` + `Interlocked` (no `lock`),
anchored to the maintainer's Itron `AsyncCollection.cs` (lock-free async
rendezvous) — and the hand-rolled CAS predates mature BCL `ConcurrentQueue` /
.NET 9 `System.Threading.Lock`, so use the modern primitive, don't port verbatim.
