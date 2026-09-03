---
id: 081M1JMXREK087G0R003AW2465
type: bug
state: backlog
priority: P2
slug: the-loop-threw-away-every-forge-diagnosis-it-was-handed
title: "The loop threw away every forge diagnosis it was handed"
created: 2026-09-03T03:30:00.000Z
depends_on: []
composes_with: []
---

# The loop threw away every forge diagnosis it was handed

Found by running the loop end to end against a local Ollama model
(`bun src/Core.TypeScript/observe/run-loop-real.ts --dry-run --participant local-llm:qwen2.5:0.5b`).
It printed:

```
[forge] PR state read FAILED: [object Object] — continuing WITHOUT PR state (NOT treating as zero PRs)
```

## What was actually in hand

`ForgeError` is a rich value — `{ kind, message, retryable, raw }` — carrying the three facts an
operator needs. The real error was:

```
auth-failure: no GitHub token in ~/.config/zeta/auth/github.json or GH_TOKEN/GITHUB_TOKEN
              — run `harny login github` (gh CLI is not a fallback)
```

Two steps destroyed all of it:

1. `readPRStateAsync` declared its failure `error: unknown`, **widening away a type it held**.
2. The loop then did `String(error)`, which on a plain object is `"[object Object]"`.

## Why it matters beyond the log line

`src/Core.TypeScript/forge-host/result.ts` already classifies every kind — `rate-limited` / `network` retryable;
`auth-failure` / `permission-denied` / `not-supported` / `not-found` / `parse-failure` / `internal`
not — and every adapter sets `retryable`. **Nothing in `observe/` ever read it.** A field that exists
to be acted on and is read by nobody is the dead-control shape this repo keeps finding.

So an expired token and a transient network blip produced identical output (none), and the loop
retried the expired token on every tick forever while the operator was never told to fix anything.

## The fix

- `src/Core.TypeScript/observe/forge-diagnosis.ts` — `describeForgeError` (kind + message + whether waiting helps) and
  `forgeFailureDisposition` (`retry-next-tick` | `operator-must-act`). It does **not** re-classify:
  it reads `retryable`, because a second classifier here would be a competing opinion that diverges
  from `src/Core.TypeScript/forge-host/result.ts` the first time either is edited. A test pins that.
- `src/Core.TypeScript/observe/world-infra.ts` — the failure is typed `ForgeError`, not `unknown`.
- `src/Core.TypeScript/observe/run-loop-real.ts` — prints the real diagnosis, and says separately and loudly when a
  failure **will not clear on its own**.
- `describeError(unknown)` — the repo-wide `e instanceof Error ? e.message : String(e)` idiom is
  right for an `Error` and a string and loses everything for a plain object. This keeps the good
  cases and serialises the third. Used at the remaining genuinely-unknown sites in the loop path.
  **Scope stated honestly: 48 sites use that idiom; this changes the four in the loop's own path,
  not all of them.**

## Two more defects fixed in the same run

- **The participant log misnamed the participant.** `name` already carries its own prefix
  (`oracle`, `local-llm:qwen2.5:0.5b`, `persona:amara`), so `${kind}:${name}` printed
  `local-llm:local-llm:qwen2.5:0.5b` and `oracle:oracle`.
- **A dry run never reported the promotion gate.** The gate is evaluated after the dry-run exit, so
  `--dry-run` answered "what would you pick" while staying silent on "would it actually reach the
  world" — the more consequential half of the same question.

## The test that caught my own vacuity

The first version of "no kind can ever render as `[object Object]`" built its fixture message as
`` `something went wrong (${kind})` ``, so `expect(described).toContain(kind)` passed **on the
message alone**. A mutant that dropped `error.kind` from the output SURVIVED. Fixed by using a
message that does not contain the kind.

## Falsifiers

```
bun test src/Core.TypeScript/observe/forge-diagnosis.test.ts   # 11 pass
bun test src/Core.TypeScript/observe/                          # 1513 pass
bun src/Core.TypeScript/lint/lint-typescript.ts                # exit 0
```

Mutation matrix: **10/10 killed**. The 7 failures in the `observe/` suite are the pre-existing
Windows-only ones (POSIX path assertions, `core.symlinks=false`) — identical file set to the
baseline measured with the change stashed.
