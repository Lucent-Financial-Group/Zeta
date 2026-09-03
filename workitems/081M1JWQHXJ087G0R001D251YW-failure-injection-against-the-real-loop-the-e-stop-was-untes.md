---
id: 081M1JWQHXJ087G0R001D251YW
type: task
state: backlog
priority: P1
slug: failure-injection-against-the-real-loop-the-e-stop-was-untes
title: "Failure injection against the real loop — the e-stop was untestable without touching the repo"
created: 2026-09-03T08:40:00.000Z
depends_on: []
composes_with: []
---

# Failure injection against the real loop — the e-stop was untestable without touching the repo

Every guard the loop consults has unit tests, and `run-loop-gate-wiring.test.ts` pins that `main()`
still routes through them. **Neither answers the question an operator actually has:**

> *when this thing breaks, what does the loop DO?*

A unit test drives one function with a hand-made failure. `loop-resilience-probe.ts` drives the
**real** `run-loop-real.ts`, as a subprocess, with the failure injected the way it would really
arrive — a flag file on disk, a corrupt window, a dead daemon, a bad token — and asserts on what the
loop printed and the exit code it returned. That is the difference between *"the halt function
halts"* and *"the loop halted"*.

## Two gaps the probe found before it could run at all

- **`ZETA_CONTROL_PLANE_FLAGS` did not exist.** The flags path was hardcoded to
  `<repoRoot>/db/control-plane/flags.json`, so **the e-stop was the one control nobody could
  rehearse** without writing a halt flag into a live checkout — the guard you most want to test was
  the one it was least safe to test. Now overridable, matching `ZETA_PROMOTION_WINDOW`.
- **`ZETA_OLLAMA_HOST` did not exist.** `localLlmParticipant` hardcoded `127.0.0.1:11434` and
  `resolveParticipant` never passed a host, so *"the daemon is down"* could not be exercised without
  stopping the real daemon. Now env-overridable, still loopback-guarded by `ollamaBackend` — this
  widens the port, not the host.

## The ten scenarios

| scenario | expected behaviour |
|---|---|
| baseline | completes a dry tick and reports its gate |
| e-stop raised | halts **acting**; a dry run still reports, because observing is not gated |
| flags corrupt | **halts** — *"could not tell" is not permission* |
| window corrupt | shadow, never primary |
| window with a NaN counter | shadow — every comparison against `NaN` is false, so an unvalidated gate reads it as clean |
| window clean | **promotes** — the gate is satisfiable, not merely safe |
| token invalid | diagnosed by kind, never `[object Object]`, continues **without** PR state |
| no forge at all | a forge outage is not a loop outage |
| ollama down | degrades to the deterministic oracle, tick still completes |
| unknown participant | falls back with a warning, not a crash |

## What it refuses to do

Every scenario runs `--dry-run`. A resilience probe that could push, merge, or write to the event log
would be a chaos harness with side effects, and the one thing it must never do is **become the
incident it is testing for**.

## Results

**10/10 with the oracle**, and **10/10 again with a real small model** — `ollama` + `qwen2.5:0.5b`
choosing the action on every tick.

## A scenario that passed for the wrong reason

*"unknown participant spec"* set `ZETA_PARTICIPANT`, and the probe's own `--participant` flag
**overrode it** — so the loop reached the oracle by the ordinary route and the fallback path was
never exercised. It reported **PASS**. Fixed with a per-scenario `participantOverride`, and recorded
because a green scenario that tests nothing is exactly the failure this probe exists to catch,
appearing inside the probe itself.

## Falsifiers

```
bun src/Core.TypeScript/observe/loop-resilience-probe.ts                              # 10/10
bun src/Core.TypeScript/observe/loop-resilience-probe.ts --participant local-llm:qwen2.5:0.5b  # 10/10
bun src/Core.TypeScript/lint/lint-typescript.ts                                       # exit 0
```
