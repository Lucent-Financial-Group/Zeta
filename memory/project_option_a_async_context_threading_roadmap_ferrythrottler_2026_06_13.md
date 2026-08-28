---
name: project-option-a-async-context-threading-roadmap-ferrythrottler
description: "Roadmap + state for the FerryThrottler DST + async-context-threading (Option A) work — so it's not forgotten mid-flight"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Context-save (Aaron 2026-06-13: "save the context so we don't forget later while
we are working on the next thing"). The FerryThrottler (heart of the code) DST +
async-context arc.

## STATUS: COMPLETE (2026-06-13) — increments 1-4 all landed.
4a = #8102 (the `?syncContext` seam, single arity). 4b = #8111 (seeded N-ferry
replay at DoP=2/3 + lock-free `DeterministicSyncContext` in Core + `?syncContext`
on result arity + both contextual wrappers + one `FerryLaunch` seam). Anchor
fixup = #8112. The whole Option-A roadmap is done; nothing pending here.

## Shape decision (locked)
Thread context the **explicit Kleisli-Arrow way** — context is a parameter/data
threaded through — **NOT** the AsyncLocal hidden side channel. Aaron: *"that's why
we have Arrow from category theory"* + *"in my itron version I do captures of
thread context so I can pass it through."* `Tracing.fs` documents the same fork
(AsyncLocal = "grubby hidden side channel" vs the Kleisli Arrow). Zeta already has
the Arrow: `ISR<'A,'B> = IntrCtx -> 'A -> Task<Result<'B,_>>` (`IntrCtx.fs`) +
`Traced.withCtx`.

## Landed (FerryThrottler arc)
- **#8084** — Option-B DST seam: `?manual` ctor arg + `PumpToIdleAsync` on the
  single-arity `FerryThrottler<'TItem>`. manual=true ⇒ no background ferry; caller
  pumps synchronously (DoP=1, deterministic, no wall-clock). Shared `fillBoat` =
  single source of boat-building truth (DST path == prod).
- **#8089** — whole FerryThrottler test suite → async-all-the-way (Task sigs, do!/
  let!, NO .Wait/.Result) + manual-pump where DoP=1; result-arity uses
  `let! Task.WhenAll`, Task.Delay-2000 timeout-races removed.
- **#8094** — `ContextualFerryThrottler<'TItem,'Ctx>` (increment 1): caller passes
  ctx at enqueue; threaded as `struct('TItem*'Ctx)` to the boat (composes core
  throttler; byte sizer measures payload not the pair).
- **#8097** — increment 2 (capture-at-the-boundary): `?capture: unit -> 'Ctx` +
  `EnqueueCapturedAsync(item)` — snapshots the ambient at the door, threads as data.
- **#8098** — increment 3 (result-arity context): `ContextualResultFerryThrottler<'TItem,'Ctx,'TResult>`
  — explicit ctx + capture on the request/response arity (background ferries).

## Roadmap — remaining increments ("not all in one go")
1. ~~Capture-at-the-boundary~~ — **DONE (#8097)** (`?capture` + `EnqueueCapturedAsync`).
2. ~~Result-arity context~~ — **DONE (#8098)** (`ContextualResultFerryThrottler`).
3. **Background-ferry replay** — split into 4a (landed) + 4b (remaining):
   - 4a ~~the seam~~ — **DONE (#8102)**: optional `?syncContext: SynchronizationContext`
     on the single-arity `FerryThrottler`. None=prod threadpool path (byte-identical);
     Some sc=the WHOLE ferry is launched onto sc via `Post` → pump-gated, race-free,
     replayable; every await re-posts to sc. Factored ferry loop body into one
     context-capturing `task` (prod vs injected differ only in launch). Proof test:
     deterministic pumpable `SynchronizationContext` (test scaffolding) — ferry
     processes nothing until pumped (asserted before pump = race-free), drains in
     order, termination pump-driven. Design doc:
     `docs/research/2026-06-13-ferrythrottler-background-ferry-replay-injected-synchronizationcontext-increment-4.md`.
   - 4b **remaining**: (a) full N-ferry deterministic-interleaving SEEDED replay
     (assert boat composition byte-identical across replays at DoP≥2); (b) promote
     the deterministic `SynchronizationContext` into Core as an EARNED sim primitive
     (class=state=weight, earned under rules/ via DST+injected-Source boundary);
     (c) wire `?syncContext` through `ContextualFerryThrottler` /
     `ContextualResultFerryThrottler` (mechanical — wrappers already forward optional
     args) + the result arity's ferry loop. Why SyncContext not TaskScheduler: the
     nondeterminism is in the await CONTINUATIONS (WaitToReadAsync/processBatch),
     routed by the ambient SynchronizationContext, not the initial sync segment.

Prior art / anchors: Itron `Platform.Capability/.../Util/AsyncState.cs` (the
`Lazy<AsyncLocal<T>>` carrier); `Tracing.fs` (Arrow-vs-AsyncLocal); `IntrCtx.fs`
ISR Arrow. Rodney's Razor verdict: **keep the two throttler arities** (essential
fire-and-forget vs request/response contract).

## Other open threads (so they're not lost)
- **Handoff landed:** `docs/handoffs/unified-loop-service-machinery.md` (Kiro/Riven)
  — collapse per-agent×per-OS loop/service scripts → one `loop-tick.ts --persona X`
  + `IServiceManager` port (launchd/Task-Scheduler/systemd adapters). [[feedback-post-install-is-source-shell-only-preruntime-or-dev-os]]
- **Riven:** dev-cluster→.ts migration (separate handoff, written in-thread).
- **bash-retirement brittleness:** broke 3× this session on shell add/remove;
  root-fix = derive allowlist from disk. DEFERRED — the go/python rollout is mid-
  restructuring the lints (would collide).
- **Gate-red (2026-06-13):** the active 6-language/Go-Python rollout (#8087 tsc in
  zeta-id-generator.ts + `no-python-files` now due to retire + new combined
  `lint (F#,C#,Go,Python,Rust)`). Rollout team's to stabilize, not Otto's.
- **Scheduled:** cooling-tag GC routine fires 2026-06-20 (archive/2026-06-13* tags).
- Mirror-to-fork automated (#8049, token + ruleset cleared); fork = exact mirror.
