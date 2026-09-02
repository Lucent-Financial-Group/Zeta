---
id: 081M1HNCGN8087G0R000ZK7ZGX
type: task
state: backlog
priority: P1
slug: zetafsfreeze-log-through-ferrythrottler-zd2-d4-auto-batch
title: "ZetaFsFreeze log through FerryThrottler (ZD2 / D4 auto-batch)"
created: 2026-09-02T18:16:32.680Z
depends_on: []
composes_with: ["081M1HGD1QA087G0R001GRHPFW", "081M1C59ZG4087G0R000VM8DZN"]
---

# ZetaFsFreeze log through FerryThrottler (ZD2 / D4 auto-batch)

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HNCGN8087G0R000ZK7ZGX-*.md` glob. -->

Journaled/Durable freeze records go through `FerryThrottler` (DoP=1), same auto-batch as `GroupCommitDiskDeltaLog`. Falsifier: `createManual` + 16 Journaled `freezeAsync` + `pumpLog` ⇒ one boat of 16.

`freezeAsync` takes `CancellationToken` (DST / host `ApplicationStopping`). Nested Submit/Enqueue/WaitAsync pass it through. Cancel before admit ⇒ no boat.

Tests are `task { let! ... ConfigureAwait(false) }` — no `GetAwaiter().GetResult()` / `.Wait()` / `.Result` on incomplete work. FerryThrottler’s GetResult is only on `write.IsCompleted` (already done).

Researched `CancellationToken.None` in this slice:
- **Freeze (fixed):** was hardcoded None into SubmitAsync — no DST door.
- **GroupCommit AppendAsync:** None *after* admit is a named shield (`shields admitted append from caller cancellation`). Token is still the door before mint. Left as policy, commented.
- **GroupCommit ReplayAsync:** now observes `ct` at entry.
- **FerryThrottler `defaultArg None`:** OK — optional at the ferry entry.
- **Circuit.StepAsync() / Handles.SendAsync():** 1-arg overloads default None; 2-arg exists. Not this PR.
- Library has no ambient ASP.NET `ApplicationStopping`; callers pass it in.

Crash-mid-boat remains `toy` until first-product PR12. Windows Durable still refused.
