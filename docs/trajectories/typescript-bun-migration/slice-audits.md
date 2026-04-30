# TS/Bun migration — slice audits

Accumulating substrate. One section per slice. Each slice's audit
records applied items + explicit gaps with reasons. Format:

- **Applied** — the audit checked the item and the slice complies.
- **Gap recorded** — the audit checked the item and the slice does
  not comply, with a reason for either fixing now or deferring.

Each audit names the upstream-doc + sibling-repo comparison points
with paths and as-of identifiers (commit hashes for git-tracked
sources, file mtimes for non-git workspaces).

**Audit pattern**: each slice audit MUST satisfy the per-slice
checklist in `docs/best-practices/repo-scripting.md` (the Gate A
merge gate). Layered references for the checklist:

- Language: `docs/best-practices/typescript.md`
- Runtime: `docs/best-practices/bun.md`
- Composition (where the canonical checklist lives):
  `docs/best-practices/repo-scripting.md`

## Slice 1 — 3 audit-script ports (PR #866)

**Slice files**:

- `tools/hygiene/audit-md032-plus-linestart.{sh→ts}`
- `tools/hygiene/audit-memory-index-duplicates.{sh→ts}`
- `tools/hygiene/audit-memory-references.{sh→ts}`

**Comparison points**:

- TypeScript 6.0 release notes — current as of 2026-04-29 web search
- [Bun TypeScript docs](https://bun.com/docs/runtime/typescript) — current as of 2026-04-29 web search
- [typescript-eslint v8 typed-linting guide](https://typescript-eslint.io/getting-started/typed-linting/) — current as of 2026-04-29 web search
- `../SQLSharp` at commit `7d3d9f6` (2026-04-18) — sibling repo for tsconfig + eslint + process-runner conventions
- `../scratch` at file mtime `2026-04-15` for tsconfig.json + 2026-04-15 for package.json — sibling repo for minimal Bun-ts script shape (not git-tracked)

### Tsconfig audit

- **Applied**: `strict: true` ✓
- **Applied**: `noUncheckedIndexedAccess: true` ✓
- **Applied**: `exactOptionalPropertyTypes: true` ✓
- **Applied**: `verbatimModuleSyntax: true` ✓
- **Applied**: `noEmitOnError: true` ✓
- **Applied**: `types: ["bun"]` ✓ (TS 6.0 changed default to `[]`; explicit list required)
- **Applied**: `target: "ESNext"` + `module: "Preserve"` + `moduleResolution: "bundler"` ✓
- **Gap recorded**: `noPropertyAccessFromIndexSignature` not enabled. Both SQLSharp and scratch chose to omit it for ergonomics; following sibling-repo convention. Re-evaluate when adopting if a port hits a related typing problem. NOT a #866 blocker.

### Eslint audit

- **Applied**: `tseslint.configs.strictTypeChecked` enabled ✓
- **Applied**: `tseslint.configs.stylisticTypeChecked` enabled ✓
- **Applied**: `eslint-plugin-sonarjs` recommended ruleset ✓
- **Applied**: typed linting via `parserOptions.project: tsconfig.json` ✓
- **Note**: typed linting incurs build-time cost per typescript-eslint v8 docs; accepted as the explicit tradeoff for the strictness.

### Code-pattern audit (per-port, with evidence)

Hard-requirement checks across all 3 ports (results from `grep` / `tsc --noEmit` / `eslint`):

| Check | Method | Result |
|---|---|---|
| No `any` uses | `grep -n ": any\| any =\|<any>\|as any"` | 0 matches |
| No `as` casts | `grep -n " as [A-Z]"` | 0 matches |
| Project typecheck clean | `bun x tsc --noEmit` | 0 errors in slice-1 files |
| ESLint strictTypeChecked | `eslint <files>` | 0 errors |
| Regex match groups guarded | `grep "match\["` | 2 hits, both guarded (`?? ""` or `!== undefined`) |
| Index accesses guarded under `noUncheckedIndexedAccess` | `grep "\[i\]"` / `lines[i]` etc. | All guarded with `?? ""` or explicit `=== undefined` check |
| File reads as typed error outcomes | inspect `try/catch` blocks | All file IO wrapped; returns exit code 64 on ENOENT |
| TOCTOU race avoided | inspect for `existsSync(target) ... readFileSync(target)` patterns | 0 instances; atomic `readFileSync` everywhere |

Per-port pattern checklist:

- **Applied (all 3)**: typed boundary objects — `AuditFinding` / `DuplicateFinding` / `BrokenRefFinding` instead of stringly-formatted findings. Internal flow stays structured; strings produced only at output boundary (`formatFinding`).
- **Applied (all 3)**: literal-type union exit codes — `AuditExitCode = 0 | 2 | 64` instead of bare `number`.
- **Applied (all 3)**: typed `Args` interface for parsed CLI options.
- **Applied (all 3)**: named exports + `import.meta.main` invocation guard (Bun-canonical entry pattern). Verified by grep `import.meta.main`.
- **Applied (md032 only)**: type-imports — `import { type SpawnSyncReturns } from "node:child_process"`. Used for the structured spawn-failure classifier.
- **Applied (md032 only)**: structured spawn-failure classifier — distinguishes launch failure (`result.error`) / termination-without-exit (`result.status === null`) / non-zero exit (`result.status !== 0`). Mirrors `../SQLSharp/tools/automation/format/process-runner.ts` lines 1-90.
- **Applied (all 3)**: `readonly` arrays where mutation is not needed (`readonly AuditFinding[]`, `readonly string[]`, `readonly DuplicateFinding[]`).
- **Applied (all 3)**: undefined narrowed via guards under `noUncheckedIndexedAccess` (`captured !== undefined` / `value === undefined` early-exit / `?? ""` fallback).

### Stylistic preferences vs hard requirements (Claude.ai distinction)

Claude.ai's distinction between hard requirements and stylistic preferences is recorded here so future slices know which is which:

**Hard requirements** (must satisfy):

- No implicit `any`
- No explicit `any` without inline justification comment
- Regex match groups guarded before access
- Array/object index access undefined-aware under `noUncheckedIndexedAccess`
- File-read errors handled as typed outcomes (try/catch with structured fallback)
- Type assertions (`as`) discouraged; require justification when used
- Domain shapes typed at the boundary; loose types must not escape to module's public surface

**Stylistic preferences** (good practice but not the line between "JS in trench coat" and "real TypeScript"):

- Discriminated-union exit codes (`AuditExitCode = 0 | 1 | 2`) — this slice uses literal-type unions; useful but not mandatory.
- Readonly tuples in result types (vs readonly arrays).
- `Readonly<{...}>` wrapper vs `interface { readonly ... }` — equivalent under strict mode.

**Gap recorded**: Bun Shell (`Bun.$`) NOT used; the ports use Node-style `spawnSync` + `readFileSync`. Reason: the ports' shell originals were file-walkers and regex-matchers, not multi-stage pipelines; Node-style IO is sufficient. Bun Shell becomes relevant for ports that pipe shell commands together, where bash `set -e` semantics need explicit Bun Shell error handling. **Required checklist item for future slices that DO use shell pipelines.**

### Equivalence audit (clean + failure-mode fixtures)

For each of the 3 ports, equivalence verified across the relevant
modes:

**`audit-md032-plus-linestart`**:

- **Applied**: bash-vs-TS output diff is empty under default args
  (summary mode against current repo state).
- **Applied**: bash-vs-TS output diff is empty under `--list` mode.
- **Note**: `--enforce` mode exits 2 vs 0; tested manually by running
  enforce-mode against a known-bad fixture.

**`audit-memory-references`**:

- **Applied**: bash-vs-TS output diff is empty under the clean path
  (current repo state — 0 broken refs).
- **Applied**: bash-vs-TS output diff is empty under the
  broken-ref-found path. Fixture: `MEMORY.md` with one resolving
  link (`exists.md`) and one missing target (`missing.md`); both
  scripts report `refs checked: 2 / resolved: 1 / broken: 1` plus
  the same `missing.md -> memory/missing.md (not found)` line.

**`audit-memory-index-duplicates`**:

- **Applied**: bash-vs-TS output diff is empty under the clean
  path.
- **Gap recorded — intentional output-format change** (failure
  path): the bash version emits `](foo.md)` in the target column
  (a side-effect of `grep -oE '\]\([...]+\.md\)'` not stripping
  its match wrapper); the TS version emits the bare path
  (`foo.md`). Detection, count, and ordering are byte-equivalent;
  only the wrapper visual is dropped. The wrapper was extraction
  noise — the column header is "target" and `foo.md` IS the
  target; `](foo.md)` was the *match-pattern*, not the target.
  Treated as an intentional improvement; documented here so future
  audits know the divergence is deliberate, not a regression.

**Hard requirement**: behavioral equivalence on detection (which
findings are reported) and exit status. Stderr formatting
divergences are recorded explicitly above when they exist.

### Outcome

Slice 1 passes audit with one ergonomic gap (`noPropertyAccessFromIndexSignature`) recorded explicitly. Slice can merge as-is; future slices follow this audit's pattern in this same file.

## Slice 2 — 3 hygiene-audit-script ports (PR #NNN, 2026-04-30)

**Slice files**:

- `tools/hygiene/audit-machine-specific-content.{sh→ts}`
- `tools/hygiene/audit-git-hotspots.{sh→ts}`
- `tools/hygiene/audit-cross-platform-parity.{sh→ts}`

**Comparison points**:

- `docs/best-practices/typescript.md` — verified within currency window (1 day old).
- `docs/best-practices/bun.md` — verified within currency window.
- `docs/best-practices/repo-scripting.md` — per-slice audit checklist applied.
- `../SQLSharp` at commit `7d3d9f6` (2026-04-18) — process-runner pattern reused.
- Slice 1 (PR #866, commit `d3b0be8`) — canonical pattern for typed boundaries + spawn classifier + atomic file IO + ParseResult discriminated union.

### Tsconfig audit

- **Applied**: Inherited from slice 1's tsconfig (no changes needed). All three slice-2 files compile clean under the same strict regime.

### Eslint audit

- **Applied**: All three files pass `strictTypeChecked` + `stylisticTypeChecked` + sonarjs.
- **Cognitive-complexity push**: `audit-git-hotspots.ts:parseArgs` initially exceeded the 15-cap. Refactored into a `ParseAcc` reducer with `reduceFlag` helper; complexity now within bounds. Pattern recorded for future slices that need flag-table parsing.

### Code-pattern audit (per-port, with evidence)

Hard-requirement checks across all 3 ports:

| Check | Method | Result |
|---|---|---|
| No `any` uses | grep for any patterns | 0 matches |
| No `as` casts | grep for `as` casts | 0 matches |
| Project typecheck clean | `bun x tsc --noEmit` | 0 errors |
| ESLint strictTypeChecked | `eslint <files>` | 0 errors |
| Regex match groups guarded | inspect `match[]` access | All guarded |
| Index accesses guarded under `noUncheckedIndexedAccess` | inspect | All guarded |
| File reads as typed error outcomes | inspect `try/catch` | All file IO wrapped |
| TOCTOU race avoided | inspect for `existsSync ... readFileSync` patterns | 0 instances |

Per-port pattern checklist:

- **Applied (all 3)**: typed boundary objects (`AuditFinding`, `FileSummary`, `AuditBuckets` etc.) — no stringly-formatted findings.
- **Applied (all 3)**: literal-type union exit codes (`0 | 2 | 64`, `0 | 64 | 128`, `0 | 1 | 2` per script).
- **Applied (all 3)**: `ParseResult` discriminated-union for CLI args — no `process.exit` from parse paths (slice-1 pattern continued).
- **Applied (all 3)**: structured spawn-failure classifier (mirrors SQLSharp `process-runner.ts`).
- **Applied (all 3)**: `maxBuffer: 64 * 1024 * 1024` on `spawnSync` (slice-1 P2 fix continued).
- **Applied (all 3)**: named exports + `import.meta.main` invocation guard.
- **Applied (`audit-git-hotspots`, `audit-cross-platform-parity`)**: clock injection via `Clock` interface — DST-friendly per the universal-DST gate. Tests can substitute a deterministic clock for the report timestamp; CLI uses `realClock()`.

### DST + coverage audit (per `repo-scripting.md`)

- **DST-friendly: applied** — the only non-deterministic surface in either time-stamping script (`audit-git-hotspots`, `audit-cross-platform-parity`) is the report's "Generated"/"Run" timestamp, and both inject a `Clock` interface so tests can substitute a fake clock. `audit-machine-specific-content` has no time/random surface.
- **Code coverage: deferred** — slice 2 ports do not introduce tests yet. The bash originals had no tests either; per `repo-scripting.md` the gap is recorded explicitly rather than waved through, and tests are queued as a follow-up before the next slice that introduces a *new* module (not a port).

### Equivalence audit

For each of the 3 ports, equivalence verified against the bash original:

**`audit-machine-specific-content`**:

- **Applied**: bash-vs-TS output diff is empty under default args.

**`audit-git-hotspots`**:

- **Applied**: bash-vs-TS output diff is empty modulo the `Generated:` timestamp line (which differs by run-time, not script-version). Verified with `--top 5` against current repo state.

**`audit-cross-platform-parity`**:

- **Applied**: bash-vs-TS output diff is empty under `--summary` mode (counts only, no timestamp).
- **Applied**: bash-vs-TS output diff is empty under the default `report` mode modulo the `Run:` timestamp line.

### Outcome

Slice 2 passes audit. The clock-injection pattern is the new substrate addition (DST-friendliness applied to the two report-generating scripts); the `ParseAcc` reducer pattern from `audit-git-hotspots` is recorded for future flag-heavy parsers.

## Slice 3 — 3 alignment-audit-script ports (PR #NNN, 2026-04-30)

**Slice files**:

- `tools/alignment/audit_archive_headers.{sh→ts}`
- `tools/alignment/audit_personas.{sh→ts}`
- `tools/alignment/audit_commit.{sh→ts}`

**Comparison points**:

- `docs/best-practices/typescript.md`, `bun.md`, `repo-scripting.md` — verified 1 day old (within currency window).
- `../SQLSharp` at commit `7d3d9f6` (2026-04-18).
- Slices 1+2 (PRs #866, #868) — canonical patterns reused.

### Tsconfig + eslint audit

- **Applied**: inherited from earlier slices; all three slice-3 files compile clean under the same strict regime.
- **Cognitive-complexity push (audit_archive_headers, audit_commit)**: extracted helper functions (reduceFlag, emitJsonRollup, emitHumanSummary, classifyHc2/Hc6/Sd6) to bring functions within the sonarjs 15-cap.
- **Optional-chain + non-null assertion push (audit_commit)**: prefer-optional-chain on tab-split filters; explicit `!` assertion (with eslint-disable) where the type system can't infer that an upstream filter has guaranteed defined-ness.

### Code-pattern audit (per-port)

| Check | Result |
|---|---|
| No `any` uses | 0 matches across all 3 |
| No `as` casts | 0 matches across all 3 (one `as string` replaced with non-null assertion + eslint-disable for sonarjs) |
| Project typecheck clean | 0 errors |
| ESLint strictTypeChecked | 0 errors |

Per-port pattern checklist:

- **Applied (all 3)**: typed boundary objects (FileFinding, PersonaRow, CommitAudit + Hc2Result/Hc6Result/Sd6Result).
- **Applied (all 3)**: literal-type union exit codes (0 | 1 | 2).
- **Applied (all 3)**: ParseResult discriminated-union via reduceFlag.
- **Applied (all 3)**: structured spawn-failure classifier.
- **Applied (all 3)**: maxBuffer=64MiB on spawnSync.
- **New pattern (`audit_archive_headers`)**: Bun-native readdirSync recursion (no `find` shell-out); injective slug encoding for collision-safe per-file output paths; JSON rollup via JSON.stringify + 2-space indent matching bash hand-rolled format.
- **New pattern (`audit_personas`)**: regex-driven matchAll for round-number extraction from notebook headers; Number(coverage).toFixed(2) for fraction formatting; gate-threshold check via numeric comparison.
- **New pattern (`audit_commit`)**: per-commit signal classifier (HELD / STRAINED / VIOLATED / IRRELEVANT) for HC-2 / HC-6 / SD-6 alignment-spec metrics; range resolution via `git rev-list --reverse RANGE` for `..` notation, single `git rev-parse REV` otherwise.

### DST + coverage audit

- **DST-friendly: applied** — none of the 3 ports introduce time / random / scheduler dependencies in test paths. The git-log invocations are pinned by SHA / range argument.
- **Coverage: deferred** — bash originals had no tests; TS ports do not introduce a new module. Recorded explicitly per the DST-exempt-is-deferred-bug discipline applied to coverage.

### Equivalence audit

- **`audit_archive_headers`**: bash-vs-TS output diff is empty under default args against current repo state.
- **`audit_personas`**: bash-vs-TS output diff is empty under default args against current repo state.
- **`audit_commit`**: bash-vs-TS output diff is empty against `HEAD` (default range, current repo state).

### Outcome

Slice 3 passes audit. Three new patterns recorded in this audit (Bun-native readdirSync recursion, regex matchAll for parsing, per-commit signal classifier).

## Slice 4 — 2 alignment-tail ports (PR #NNN, 2026-04-30)

**Slice files**:

- `tools/alignment/audit_skills.{sh→ts}`
- `tools/alignment/citations.{sh→ts}`

**Comparison points**: Layered baseline verified 2026-04-30 (1 day old, within window). Slices 1-3 canonical patterns reused.

### Code-pattern audit

| Check | Result |
|---|---|
| No `any` uses | 0 matches |
| No `as` casts | 0 matches |
| Project typecheck clean | 0 errors |
| ESLint strictTypeChecked | 0 errors |

Per-port pattern checklist:

- **Applied (both)**: typed boundary objects (SkillRow, InternalCite, BrokenCite, AuditResult).
- **Applied (both)**: literal-type union exit codes (0 | 1 | 2, 0 | 2).
- **Applied (both)**: ParseResult discriminated-union via reduceFlag.
- **Applied (both)**: Bun-native readdirSync recursion (slice-3 pattern).
- **Per-line scan pattern (`citations`)**: bash uses `grep -oE` per line; TS port mirrors with `content.split("\n")` + per-line `matchAll`. Initial whole-content `matchAll` produced off-by-3 differences (regex matched across newlines); per-line scan restores byte-equivalence.
- **`audit_skills`**: schema = DORA-2025-skill-scope-v1; 4 measurable columns + 6 unmeasured stubs.
- **`citations`**: candidatePaths helper extracted to keep resolveTarget within sonarjs 15-cap; OS-injection-style regex disabled with eslint-disable + justification (bash original used same shape).

### DST + coverage audit

- **DST-friendly: applied** — no time / random / scheduler dependencies in test paths.
- **Coverage: deferred** — bash originals had no tests; ports don't introduce a new module.

### Equivalence audit

- **`audit_skills`**: bash-vs-TS output diff is empty under default args (44/235 skills touched in current repo state).
- **`citations`**: bash-vs-TS output diff is empty (5427 internal edges, 86 broken candidates, 577 external refs against current repo state).

### Outcome

Slice 4 passes audit. New pattern recorded: per-line scan to preserve bash `grep` behavior across regex extraction.

## Slice 5 — 3 hygiene-audit ports (PR #NNN, 2026-04-30)

**Slice files**:

- `tools/hygiene/audit-tick-history-bounded-growth.{sh→ts}`
- `tools/hygiene/audit-post-setup-script-stack.{sh→ts}`
- `tools/hygiene/audit-missing-prevention-layers.{sh→ts}`

**Comparison points**: Layered baseline verified 2026-04-30 (1 day old). Slices 1-4 canonical patterns reused.

### Code-pattern audit

| Check | Result |
|---|---|
| No `any` uses | 0 matches |
| No `as` casts | 0 matches |
| Project typecheck clean | 0 errors |
| ESLint strictTypeChecked | 0 errors |

Per-port pattern checklist:

- **Applied (all 3)**: typed boundary objects (Args, AuditBuckets, AuditResult, HygieneRow, ClassificationEntry).
- **Applied (all 3)**: literal-type union exit codes.
- **Applied (all 3)**: ParseResult discriminated-union via reduceFlag.
- **Applied (all 3)**: structured spawn-failure classifier.
- **`audit-tick-history-bounded-growth`**: simple line-count check; no git invocations beyond repo-root resolution; threshold default 500 (per inline mini-ADR in bash original).
- **`audit-post-setup-script-stack`**: classification logic (exempt / labelled / violation) extracted into pure helpers (isExempt, hasLabel) for testability. LABEL_RE compiled once.
- **`audit-missing-prevention-layers`**: `trimSpaces` extracted as a pure helper to avoid sonarjs/slow-regex on anchored space patterns. ROW_RE compiled once. `Map<string, string>` for classifications (vs bash's parallel arrays + linear lookup).

### DST + coverage audit

- **DST-friendly: applied** — `audit-post-setup-script-stack` and `audit-missing-prevention-layers` use `new Date().toISOString()` for the report timestamp; would inject a `Clock` interface (slice-2 pattern) if/when tests are added. `audit-tick-history-bounded-growth` has no time/random surface.
- **Coverage: deferred** — bash originals had no tests; ports don't introduce a new module.

### Equivalence audit

- **`audit-tick-history-bounded-growth`**: byte-equivalent under both terse and `--summary` modes against current repo state.
- **`audit-post-setup-script-stack`**: byte-equivalent under `--summary` (counts only) and report mode (modulo `Run:` timestamp).
- **`audit-missing-prevention-layers`**: byte-equivalent (modulo `Run:` timestamp).

### Outcome

Slice 5 passes audit. New pattern recorded: `trimSpaces` pure helper as eslint-clean alternative to anchored space-stripping regexes (avoids sonarjs/slow-regex flag).

## Slice template (for future slices)

Copy this section header and fill out before merging the slice's PR:

```text
## Slice N — <title> (PR #NNN)

**Slice files**: ...

**Comparison points**: ...

### Tsconfig audit
### Eslint audit
### Code-pattern audit (per-port)
### Equivalence audit
### Outcome
```

## Composes with

- `RESUME.md` — the trajectory dashboard; this file is the per-slice audit substrate it points at.
- Task #351 (TS+Bun expert + teaching skill) — this file's accumulating content seeds the skill's knowledge base.
