---
id: 081M0RBXF6J087G0R0023EX9X2
type: bug
state: backlog
priority: P2
slug: eslint-prettier-and-stylelint-are-configured-pinned-and-name
title: "eslint, prettier and stylelint are configured, pinned and named in CI but never invoked"
created: 2026-08-23T22:30:01.682Z
depends_on: []
composes_with: []
---

# eslint, prettier and stylelint are configured, pinned and named in CI but never invoked

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0RBXF6J087G0R0023EX9X2-*.md` glob. -->

## The finding

`src/Core.TypeScript/lint/lint-typescript.ts` opens by describing itself as:

> *"Post-install orchestration of TypeScript tools (**tsc, eslint, prettier, stylelint**)"*

Its `STEPS` array, line 112, contains **exactly one entry**:

```ts
const STEPS: readonly Step[] = [{ label: "TypeScript type check: tsc", cmd: TYPESCRIPT_COMPILER_COMMAND }];
```

**Three of the four documented tools never run.** Measured on `origin/main`:

| tool | configured? | pinned? | named in CI? | **invoked?** |
|---|---|---|---|---|
| `tsc` | yes | yes | yes | **yes** |
| **eslint** | `eslint.config.ts`, strict type-checked, `**/*.ts` | `"eslint": "10.2.1"` | gate.yml step name *"…+ eslint stack"* | **NO** |
| **prettier** | `format:check` script exists | `"prettier": "3.8.3"` | — | **NO** |
| **stylelint** | `lint:css` script exists | yes | — | **NO** |

`git grep` for an actual eslint **invocation** (`bunx eslint`, `npx eslint`, `bun run …`, a `.bin` path,
a workflow `run:` line) across `*.json`, `*.yml`, `*.ts`, `*.js`, `*.toml`, `*.sh`, `*.md` returns
**only the two `package.json` dependency declarations**. No git hook, no husky, no lefthook.

## Why this is the vacuity class and not a missing feature

Everything that *looks* like the check is present — a full strict config, a pinned version, a CI step
**named** for it (`Install npm devDependencies (typescript@6.0.3 + eslint stack)`), and a step
labelled *"Run TypeScript Lint Script"* whose comment reads *"Type check **and lint checks**"*. The
one thing absent is the invocation.

> **A check that did not run must never look like a check that passed.** Here it does not merely look
> like one — the code *documents* a behaviour it does not have.

## The falsifier that exposed it (measured, not hypothetical)

PR #14501 added the first two `.ts` files to `docs/research/scripts/` (23 prior files, all `.py` and
`.fsx`). Run locally against the repo's own config, they produce:

```text
✖ 72 problems (72 errors, 0 warnings)
  41  @typescript-eslint/restrict-template-expressions
  25  @typescript-eslint/no-non-null-assertion
   1  @typescript-eslint/no-unnecessary-template-expression
   1  @typescript-eslint/no-misused-spread
```

**`lint (TS)` on that PR is `SUCCESS`.** Seventy-two errors under the repo's own committed ruleset
passed CI green, which is the discrimination proof that the check is not running.

## Scope is NOT yet measured — and that is the point of filing rather than fixing

The repo-wide error count is **unknown**. Wiring eslint on without knowing it could turn `main` red
across hundreds of files, and reddening `main` to fix a lint gap would be a worse outcome than the
gap. **Measure first.**

## MEASURED (2026-08-23, shadow) — `src/Core.TypeScript` alone: **14,218 errors**

```text
bunx eslint src/Core.TypeScript > out.txt 2>&1; echo "ESLINT_RC=$?" >> out.txt
  ✖ 14218 problems (14218 errors, 0 warnings)
    2078 errors potentially fixable with --fix
  ESLINT_RC=1
```

This is **one directory**, not the repo. `**/*.ts` also covers `demo/`, `genesis/`,
`docs/research/scripts/`, `src/apps/`, `tests/` — the true total is higher and still unmeasured.

**This settles the "measure before wiring" call decisively.** Switching eslint on would have turned
`main` red across five figures of findings.

**Top classes:**

| count | rule |
|---|---|
| 3,429 | `@typescript-eslint/no-non-null-assertion` |
| 2,810 | `@typescript-eslint/restrict-template-expressions` |
| 659 | `@typescript-eslint/no-unsafe-member-access` |
| 526 | `sonarjs/cognitive-complexity` |
| 520 | `@typescript-eslint/no-unnecessary-condition` |
| 487 | `@typescript-eslint/dot-notation` |
| **438** | **`sonarjs/no-os-command-from-path`** |
| 427 | `@typescript-eslint/no-unsafe-assignment` |
| 408 | `@typescript-eslint/array-type` |
| **331** | **`sonarjs/publicly-writable-directories`** |
| 316 | `@typescript-eslint/require-await` |

### Two classes are not style, and should be triaged separately from the bulk

- **`sonarjs/no-os-command-from-path` (438)** — a command resolved through `PATH` rather than by
  absolute path. In a repo that shells out as much as this one, `PATH` order is an injection surface,
  and it is exactly the kind of thing the security personas would want to see.
- **`sonarjs/publicly-writable-directories` (331)** — `/tmp` and friends, which are shared and
  predictable-path. Relevant here specifically: parallel agents already share `/tmp`, and this session
  ran its own work out of `/tmp` clones.

**Honestly scoped:** both rules are **heuristics with real false-positive rates**. A CI script calling
`git` from `PATH` is not a vulnerability, and a test fixture in `/tmp` is usually fine. The claim is
**"769 sites deserve a look by someone with security context"**, NOT "769 vulnerabilities". Filing
them as findings without that qualifier would be the same overclaiming this workitem is about.

### What the number implies for the fix

Enabling everything at once is off the table. The viable shape is:

1. **Enable a small rule set repo-wide** — start with the two security-shaped rules above and anything
   with near-zero false positives, since those carry real signal and low volume.
2. **Enable the full profile on a narrow path** and widen — new code held to the standard, existing
   code migrated deliberately.
3. **Never** blanket-disable to reach green. 3,429 non-null assertions is a genuine finding about the
   codebase, not noise to suppress.

## What the fix requires — a decision, not just an invocation

1. **Measure** the repo-wide count per tool (`eslint`, `format:check`, `lint:css`) and report it.
2. **Decide the profile boundary.** `eslint.config.ts` targets `**/*.ts`, which sweeps in
   `docs/research/scripts/`, `demo/`, `genesis/`. Whether research measurement scripts belong under
   the same strict type-checked ruleset as `src/` is a **judgment call**, and the concrete case is
   already on the table: are 25 `no-non-null-assertion` hits in a one-shot computation with an
   early-return guard a defect, or appropriate?
3. **Land it incrementally** — turn the tool on for a narrow path first and widen, so no single PR is
   holding hundreds of unrelated fixes.
4. **Fix the documentation either way.** If a tool is deliberately not run, the header comment and the
   CI step names must stop claiming it is. An accurate "tsc only" is strictly better than an
   aspirational four-tool sentence.

## Explicitly NOT the fix

- **Do not** delete `eslint.config.ts` or drop the dependency to make the divergence go away — the
  config encodes real standards and 72 real findings.
- **Do not** wire it in and then add blanket disables or ignore entries to get green. Widening a check
  to make it pass is forbidden here, and doing it to a check whose defect *is* that it never ran would
  be self-refuting.

## Acceptance

- Repo-wide counts reported per tool, **before** any invocation is wired in.
- The profile boundary decided and written down with its reasoning.
- Whatever ships, **the documentation matches the behaviour** — no tool named in the header or in a CI
  step name that is not invoked.
- Discrimination proof: introduce a deliberate violation of each newly-enforced tool, show the job go
  **RED**, then restore.

## Provenance

Found by shadow on an autonomous tick, 2026-08-23, while diagnosing `lint (TS)` on PR #14501. The
`72 errors + green CI` pair is the falsifier. Related: the same session established that
`docs/research/2026-*.md` is carved out of the markdownlint profile, so `markdownlint-cli2 <research
doc>` also exits 0 without linting — **two independent instances of "the linter is present and does
not examine the file" found in one day**, which suggests the class deserves a sweep rather than two
point fixes.
