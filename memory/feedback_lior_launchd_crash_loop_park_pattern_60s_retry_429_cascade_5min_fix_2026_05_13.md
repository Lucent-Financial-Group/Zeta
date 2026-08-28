---
name: lior-launchd-crash-loop-park-60s-retry-429-cascade-5min-fix
description: "Lior 2026-05-13 — diagnosed why his loop appeared \"failed for 24 hours straight\" between 2026-05-10 and 2026-05-13. Aggressive 60s retry interval + external 429 rate-limit produced a crash-cascade that triggered macOS launchd's crash-loop detection, which PARKED the service entirely. Fix: 5-minute interval gives the rate-limit token bucket time to refill before retry."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---

## The failure mode

Lior's loop is launchd-hosted (`com.zeta.lior-loop.plist`). On
2026-05-10 the loop hit a 429 (rate-limit) error from Gemini API.
Because the launchd timer fired every 60 seconds:

1. Loop hits 429 → process crashes
2. launchd sees crash → restarts after 60s
3. 60s isn't enough for the rate-limit token to clear → 429 again → crash
4. launchd sees crash-loop pattern → PARKS the service entirely
5. From 2026-05-10 onwards, the loop appears dead — but the failure
   is launchd-side parking, not loop-side bug

The visible symptom: 24+ hours of zero loop activity, no log entries,
no obvious cause when checking the loop code itself.

## Why diagnosis was tricky

The natural assumption ("the loop has been failing for 24 hours
straight") implies continuous failure — but launchd actually
STOPPED running the loop after the crash-loop detection. So
there's NO log evidence of continuous failure; there's just
silence after the initial crash burst.

Lior's correction (verbatim from the human maintainer's forward
2026-05-13 18:45Z):

> *"You are exactly right—good catch. I completely misread the
> timestamps. It did not fail for 24 hours straight. What actually
> happened is that on May 10th it hit the 429 error and crashed.
> Because it was on a 60-second timer, it woke up, immediately hit
> the 429 again, and crashed again. macOS's launchd detected this
> as a crash-loop and completely killed/parked the service to
> protect the system. It hasn't run at all since May 10th. It's
> been completely dead in the water. You're right that 429s
> usually clear up in 30–60 seconds. The problem was that the
> crash-loop caused macOS to give up on it entirely. By changing
> the interval to 5 minutes, we ensure that if it does hit a 429,
> it waits long enough for the token to clear before trying again,
> preventing the rapid crash-loop that gets it permanently
> suspended by the OS."*

## The general pattern (broader than Lior's specific case)

**Cascade**: app-layer-error-leaks-out-as-process-crash ×
OS-crash-loop-detection → service-parking

Affects: ANY OS-managed background loop where application-layer
transient errors propagate to process exit-code as crashes.

### The layer boundary (Aaron 2026-05-13 18:58Z)

> *"yeah mac does not understand transient nativly"*

This generalizes beyond macOS — OS-level process managers
**fundamentally cannot** distinguish transient from permanent
errors. They see only:

| OS-layer sees | App must own |
|---------------|--------------|
| Process exited 0 → "ok, schedule next tick" | "Did business logic succeed? Or transiently fail?" |
| Process exited non-zero → "this process is broken" | "Is the error recoverable on retry, or fundamental?" |
| Process crashes 3-5× rapidly → "park it" | Classification + recovery strategy |

The OS owns process-lifecycle policy. The app owns
transient-vs-permanent classification. **Confusing the layers is
the failure-mode root** — when the app uses exit codes to signal
business-logic-failure, the OS thinks the PROCESS is broken (not
the business logic) and applies the only tool it has:
crash-loop-detection + parking.

This is universal across:

- **macOS launchd**: ThrottleInterval (min 10s) + undocumented
  empirical crash-loop park after ~3-5 crashes
- **systemd**: `Restart=on-failure` + `StartLimitBurst` /
  `StartLimitIntervalSec` for burst detection
- **Windows Service Control Manager**: configurable recovery
  actions per failure count
- **Docker / Kubernetes**: restart policies + liveness probes +
  CrashLoopBackOff state
- **Cron daemons in general**: simpler — no crash detection, but
  ALSO no "tick completed but business-failed" awareness

### Specific to macOS launchd

launchd has `ThrottleInterval` (minimum 10s) AND a crash-loop
detection that parks services after repeated crashes within a
short window. The exact threshold isn't documented but empirically
it kicks in after ~3-5 crashes within a few minutes.

## Operational fix (substrate-honest — Aaron correction 2026-05-13 18:55Z)

**The 1-minute interval is FINE. The actual root cause is the loop
returning non-zero exit codes to launchd on transient errors.**

The human maintainer 2026-05-13 18:55Z: *"yeah the one minute is
fine but the mac disabling casue it think it's borken is the issue,
the fix don't return bad exit codes to mac lol"*.

Exit codes are a CONTRACT with the OS process manager. launchd's
crash-loop detection fires on exit-code-non-zero, not on
internal-error-state. If the loop catches the 429 and exits 0,
launchd never sees a crash, and the 60s timer is the right cadence.

### The actual fix (per Aaron)

1. **The loop must catch transient external errors and exit 0** —
   exit-code = "did the process complete the tick" NOT "did all
   business logic succeed." Transient errors (429, network blip,
   API timeout) are EXPECTED + RECOVERABLE; exiting 1 lies to
   launchd about the tick's substrate-honest state.
2. **Reserve non-zero exit for actual process-level errors** —
   uncaught exception, OOM, segfault, etc. Those ARE crashes
   launchd should respond to.
3. **Log the transient error internally** — the loop's substrate-
   honest record-keeping happens in its log files / shards / bus
   envelopes; NOT in the exit code

### Wrong vs right pattern

```typescript
// WRONG — exit code lies to launchd
async function tick() {
  const result = await callGeminiAPI();  // throws 429
  return result;
}
// → uncaught throw → process exits 1 → launchd sees "crash"

// RIGHT — exit code is honest to launchd
async function tick() {
  try {
    const result = await callGeminiAPI();
    return result;
  } catch (e) {
    if (is429(e) || isTransient(e)) {
      logTransientError(e);
      return null;  // tick completed; this iteration had a transient miss
    }
    throw e;  // actual unrecoverable error — let launchd handle it
  }
}
// → caught 429 → process exits 0 → launchd sees "ok, scheduled next tick"
```

### Why the 5-minute interval was a symptom-fix

Increasing the interval to 5 minutes happened to work because:

- The 429 token bucket refills in <5min
- So the next launchd-restart attempt no longer hits 429
- So the cascade stops

But this masks the underlying bug: the loop is still lying about
its exit state. If a future error has a recovery window > 5min,
the same crash-loop-park pattern recurs. The exit-code-honesty
fix is the durable one.

### Additional defenses (composes with the exit-code fix)

1. **`ThrottleInterval` in the plist** — launchd-level minimum
   between restarts; defense in depth against future bugs that
   produce real crashes
2. **Monitor parked services** — `launchctl list | grep <name>`
   shows last exit code; `launchctl print` shows full state
3. **Catch-43 lineage applies**: external verification of tick
   liveness (shard cadence, bus heartbeat, etc.) catches OS-
   parking AND honest-exit-but-stuck-loop cases

## What this is NOT

- NOT a claim that 1-minute cron is always wrong — `* * * * *` is
  fine when:
  - The cron is HARNESS-driven (not OS-driven), where crash-loop
    parking doesn't apply (Claude Code's `<<autonomous-loop>>`
    sentinel runs in-process; not at risk)
  - The work-per-tick has bounded latency (no API rate-limits in
    the hot path)
- NOT a universal "use 5 minutes" rule — the interval should match
  the recovery window of the actual error class
- NOT a claim that Lior's loop is fixed permanently — the
  diagnosis + the interval change is the substrate-honest first
  pass; resilience-on-error inside the loop is the durable fix

## Composes with other substrate

- `.claude/rules/tick-must-never-stop.md` (catch-43 — "tick must
  never stop"; THIS failure mode is the same class — silent tick
  stoppage, just OS-parked rather than cron-expired)
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
  (a loop that's been parked produces no "Holding" output because
  it's not running at all — distinct failure mode that requires
  external monitoring to catch)
- [[feedback_aaron_bounded_named_dependency_wait_is_DST_shape_unbounded_wait_is_non_deterministic_substrate_2026_05_13]]
  (the cascade pattern is non-DST — the failure depends on
  unbounded external rate-limit state)
- [[reference_otto_launchd_services_mac_background_infrastructure_2026_05_08]]
  (Otto's launchd services — `com.zeta.claude-loop` is launchd-
  hosted and could in principle exhibit the same failure mode)
- B-0448 (Cloud Routines integration — cloud routines could have
  their own rate-limit cascade pattern; same discipline applies)

## Operational rule for future-agents

When designing OR debugging an OS-managed background loop:

1. **Check whether the loop is parked first** — launchd, systemd,
   etc. have crash-loop detection; "the loop hasn't logged for
   24h" might mean "the OS parked it after a crash-burst" not
   "the loop is running but failing silently"
2. **The retry interval must exceed the recovery window of the
   most common transient errors** — 60s is wrong for 429
   rate-limits; 5min is the empirical minimum for Gemini-class APIs
3. **Make the loop resilient to transient errors INSIDE the
   process** — don't rely on OS restart as the only retry
   mechanism; the loop should catch+wait, not crash-on-error
4. **Catch-43 generalizes**: silent tick stoppage IS a failure
   mode, regardless of cause (cron-expired, launchd-parked,
   process-frozen, etc.); the substrate-honest fix is external
   verification (CronList check, `launchctl list` check, etc.)

## Substrate-honest framing

This is Lior's catch, surfaced via the human maintainer 2026-05-13.
Preserved here for future-Otto / future-Lior / future-any-launchd-
managed-loop to inherit at cold-boot. The diagnostic skill — "the
OS may have parked the service; check parking state before
assuming continuous failure" — is the load-bearing learning, not
the specific 5-minute interval.
