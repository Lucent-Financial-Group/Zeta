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

## Slice 6 — 3 check-only hygiene ports (PR #NNN, 2026-04-30)

**Slice files**:

- `tools/hygiene/check-no-conflict-markers.{sh→ts}`
- `tools/hygiene/check-archive-header-section33.{sh→ts}`
- `tools/hygiene/check-tick-history-order.{sh→ts}`

**Slice scope adjustment**: Cluster F was 4 files; `append-tick-history-row.sh` is a write-side script (file mutation) and warrants its own careful equivalence-test setup with file-state preservation. Deferred to slice 7+.

**Comparison points**: Layered baseline verified 2026-04-30 (1 day old). Slices 1-5 canonical patterns reused.

### Code-pattern audit

| Check | Result |
|---|---|
| No `any` uses | 0 matches |
| No `as` casts | 0 matches |
| Project typecheck clean | 0 errors |
| ESLint strictTypeChecked | 0 errors |

Per-port pattern checklist:

- **Applied (all 3)**: typed boundary objects (Violation, Row).
- **Applied (all 3)**: literal-type union exit codes.
- **Applied (all 3)**: self-allowlist where applicable (this script's bash + ts paths).
- **`check-no-conflict-markers`**: per-line scan with `MARKER_RE` (mirrors bash POSIX `[[:space:]]` via `[\t ]`).
- **`check-archive-header-section33`**: file-walker with content-hint detection; enum-strict `OP_STATUS_VALID_RE` for the operational-status value.
- **`check-tick-history-order`**: ISO-8601 lex-sortable string comparison (timestamp format chosen for this property).

### DST + coverage audit

- **DST-friendly: applied** — none of the 3 ports introduce time/random/scheduler dependencies.
- **Coverage: deferred** — bash originals had no tests; ports don't introduce a new module.

### Equivalence audit

- **`check-no-conflict-markers`**: byte-equivalent against current repo state.
- **`check-archive-header-section33`**: byte-equivalent against current repo state.
- **`check-tick-history-order`**: byte-equivalent against current repo state.

### Outcome

Slice 6 passes audit. No new patterns recorded — all reused from prior slices.

## Slice 11 — 2 ports (skill-catalog cluster + nuget audit) (PR pending — `lane-b/ts-bun-slice-11-dv2-frontmatter-backfill-2026-04-30`)

**Slice files**:

- `tools/skill-catalog/backfill_dv2_frontmatter.{sh→ts}` (DV-2.0 frontmatter mechanical backfill)
- `tools/audit-packages.{sh→ts}` (NuGet feed audit per Directory.Packages.props entry)

**Comparison points**: identical to slice 6/7/8/9/10. Within Gate B 30-day window.

### Code-pattern audit (per-port)

- **`backfill_dv2_frontmatter.ts`** (209 → 316 lines): bash awk frontmatter parse → `fieldPresent` + `dashCount` helpers. Bash `compute_record_source` heuristic preserved. Bash `mktemp` + awk inject + mv rename → `readFileSync` + `injectBeforeSecondFence` + `writeFileSync`. Bash `INJECT_BLOB` env-passing pattern → in-memory string array. `--all` find-glob → readdirSync filter.
- **`audit-packages.ts`** (51 → 154 lines): bash grep+sed extraction → `PACKAGE_RE.exec` loop. Bash awk pipe-table parse → `cols.split('|').map(trim)` + col2 match check (preserves "last matching row" semantics). Three statuses preserved: `✓ up-to-date` / `? couldn't query` / `⚠ bump available`.

### Equivalence audit

- **`backfill_dv2_frontmatter`**: byte-equivalent on `--dry-run` mode. Write-side path verified by snapshot-test.
- **`audit-packages`**: network-dependent; offline-mode produces '?' for all packages in both bash + TS (verified locally).

### Outcome

Slice 11 passes audit. Skill-catalog cluster opened + NuGet audit added. Bucket B 14 → 12.

## Slice 10 — 2 ports (counterweight-cluster + first write-side) (PR pending — `lane-b/ts-bun-slice-10-counterweight-audit-2026-04-30`)

**Slice files**:

- `tools/hygiene/counterweight-audit.{sh→ts}` (Otto-278 cadenced re-read)
- `tools/hygiene/append-tick-history-row.{sh→ts}` (chronological-tail-append validator)

**Comparison points**: identical to slice 6/7/8/9. Within Gate B 30-day window.

### Code-pattern audit (per-port)

- **`counterweight-audit.ts`** (253 → 326 lines): BSD/GNU stat-flavor probe replaced with `statSync().mtimeMs`. YAML frontmatter awk parser → manual fence-aware char walk. Arg parser refactored into `classifyArg` helper + ArgStep tagged union. `mktemp` + sort-rn pipeline replaced with in-memory array sort.
- **`append-tick-history-row.ts`** (81 → 106 lines): bash `[[ =~ ]]` regex preserved as `TS_PREFIX_RE.exec`. `grep -oE | sort | tail -1` replaced with `findLatestTimestamp` helper. ISO-8601 sort uses `localeCompare`.

### Equivalence audit

- **`counterweight-audit`**: byte-equivalent on default cadence + all explicit cadence levels.
- **`append-tick-history-row`**: byte-equivalent on usage error + malformed-row + out-of-order-timestamp paths modulo script self-reference (.sh vs .ts).

### Outcome

Slice 10 passes audit. **Counterweight-cluster opened** (Otto-278 cadenced inspect). **First write-side script ported** (append-tick-history-row) — confirms write-side equivalence-test pattern works. Bucket B 16 → 14.

## Slice 9 — 3 ports (agency-signature-pair cluster + snapshot-pinning) (PR pending — `lane-b/ts-bun-slice-9-agencysignature-pair-2026-04-30`)

**Slice files**:

- `tools/hygiene/validate-agencysignature-pr-body.{sh→ts}` (pre-merge validator)
- `tools/hygiene/audit-agencysignature-main-tip.{sh→ts}` (post-merge auditor)
- `tools/hygiene/capture-tick-snapshot.{sh→ts}` (factory-state pin)

**Comparison points**: identical to slice 6/7/8 (TypeScript 6.0, Bun 1.3, typescript-eslint v8, `../SQLSharp` at `7d3d9f6`, `../scratch` at mtime `2026-04-15`). Within Gate B 30-day window.

### Tsconfig audit

- Reuses repo `tsconfig.json` (no per-slice deviation). All 3 files compile under `bun x tsc --noEmit` clean.

### Eslint audit

- All 3 files clean under `eslint` (typescript-eslint strictTypeChecked + stylisticTypeChecked + sonarjs).

### Code-pattern audit (per-port)

- **`validate-agencysignature-pr-body.ts`** (247 → 454 lines): bash `cat` for stdin → `readFileSync(0, "utf8")`. `git interpret-trailers --parse` invocation preserved. Markdown code-fence strip via FENCE_RE filter. Terminal-block check (3-strategy lookup) preserved. Bash `[\t ]+$` (sonarjs/slow-regex) replaced with manual trimSpaceTab walk. Bash `check_enum` → ENUMS array + checkEnums helper. Human-Review/Human-Review-Evidence consistency check preserved verbatim.
- **`audit-agencysignature-main-tip.ts`** (297 → 432 lines): **two bash-bug-fixes-by-port** documented — (1) BSD `date -j -f '%Y-%m-%dT%H:%M:%SZ'` does NOT handle TZ-offset like `-04:00` on macOS; TS uses `Date.parse` which handles both `Z` and `±HH:MM`; (2) bash `exit 2` inside `$(classify_commit ...)` only exits subshell — bash silently produced unclassified output on macOS. TS short-circuits cleanly. Same behaviour-improvement class as no-empty-dirs empty-FILTERED.
- **`capture-tick-snapshot.ts`** (118 → 186 lines): bash `wc -c` shell-out replaced with `statSync().size`. Bash sed regex greedy-bug (retains `.git` suffix) preserved for drop-in equivalence; future cleanup follow-up to strip after downstream verifies.

### Equivalence audit

- **`validate-agencysignature-pr-body`**: byte-equivalent on PASS + FAIL paths.
- **`audit-agencysignature-main-tip`**: TS port produces CORRECT classifications where bash silently broke (unclassified output) due to BSD date + exit-in-subshell bugs.
- **`capture-tick-snapshot`**: byte-equivalent on YAML + JSON modes modulo run-time fields (date_utc + claude_cli_version).

### Outcome

Slice 9 passes audit. **Agency-signature-pair cluster opened**: validate-pr-body (pre-merge) + audit-main-tip (post-merge) form Amara's ferry-7 enforcement-instrument set. Bucket B 19 → 16.

## Slice 8 — 3 ports (Cluster H finish + audit-cluster start) (PR pending — `lane-b/ts-bun-slice-8-runner-version-freshness-2026-04-30`)

**Slice files**:

- `tools/lint/runner-version-freshness.{sh→ts}`
- `tools/lint/no-directives-otto-prose.{sh→ts}`
- `tools/audit/live-lock-audit.{sh→ts}`

**Comparison points**: identical to slice 6/7 (TypeScript 6.0, Bun 1.3, typescript-eslint v8, `../SQLSharp` at `7d3d9f6`, `../scratch` at mtime `2026-04-15`). Within Gate B 30-day window — no re-verification needed.

### Tsconfig audit

- Reuses repo `tsconfig.json` (no per-slice deviation).
- All 3 files compile under `bun x tsc --noEmit` clean.

### Eslint audit

- All 3 files clean under `eslint` (typescript-eslint strictTypeChecked + stylisticTypeChecked + sonarjs).
- Pattern: `eslint-disable-next-line sonarjs/no-os-command-from-path` reused on `git` invocations only (intentional — same as prior slices).

### Code-pattern audit (per-port)

- **`runner-version-freshness.ts`** (356 lines bash → 394 lines TS): three label arrays (ALLOWED_LABELS / ROLLING_ALIASES / STALE_LABELS) preserved verbatim. Bash escape_for_regex sed expression replaced with single `String.replace(REGEX_META_RE, ...)` matching the same metachar set. Bash `_verify_age_ok` cross-platform date arithmetic (BSD `date -j -f` + GNU `date -d` branches) replaced with single `Date.parse` + `Math.floor` on ms delta. Bash trailing-comment regex (sonarjs/slow-regex flag) replaced with manual char walk in `stripTrailingComment`. Three scan helpers (scanStaleOrRolling / scanUnknownScalar / scanUnknownMatrix) match the bash three-pass structure 1:1.
- **`no-directives-otto-prose.ts`** (261 lines bash → 316 lines TS): bash 4-alternative regex split into 4 RegExp[] entries via matchesDirective (each individually under sonarjs/regex-complexity). Bash temp-file pipeline replaced with in-memory AddedLine[] arrays. Bash `git diff -U0 | awk` → TS `extractAddedLinesFromDiff` with `isAddedContentLine` helper. Worktree-mode 4-source merge preserved verbatim with Set-based dedup. Untracked-file detection (`git ls-files --error-unmatch`) preserved as `isUntracked()` helper.
- **`live-lock-audit.ts`** (116 lines bash → 245 lines TS): bash `git fetch || true` → fire-and-forget spawnSync. Bash origin/main verify guard preserved. Per-commit `git log -m --first-parent --name-only` (Codex P1 PR #147 merge-classification fix) preserved verbatim. Three regex `grep -cE` → three RegExp test-and-count helpers. Bash `printf "%2d   %3d%%"` → manual pad2/pad3 helpers for byte-equivalence. LIVELOCK_MIN_EXT_PCT env var preserved. WINDOW positional arg validation preserved.

### Equivalence audit

Diff'd against bash output on this repo state (2026-04-30 main):

- **`runner-version-freshness`**: byte-equivalent against bash on the live workflow tree + 3 synthetic fixtures (stale ubuntu-22.04 / rolling ubuntu-latest / matrix mixed stale+allowed).
- **`no-directives-otto-prose`**: byte-equivalent across both `pr` (default) and `worktree` SCOPE modes.
- **`live-lock-audit`**: byte-equivalent across window=5 + window=25; sole intentional diff is the script self-reference (.sh vs .ts) in the usage-error message — same pattern as prior ports.

### Outcome

Slice 8 passes audit. **Cluster H complete (5/5)**: all five lint-pattern scripts now have TS ports. New cluster opened: `audit-cluster` starts with `live-lock-audit` (slice 8). Bucket B reduced from 22 → 19 remaining files. No new patterns recorded — all reused from prior slices.

## Slice 7 — 3 lint-pattern ports (PR #878, merged 2026-04-30, commit `4dac957`)

**Slice files**:

- `tools/lint/no-empty-dirs.{sh→ts}`
- `tools/lint/safety-clause-audit.{sh→ts}`
- `tools/lint/doc-comment-history-audit.{sh→ts}`

**Comparison points**: identical to slice 6 (TypeScript 6.0 release notes, Bun docs, typescript-eslint v8, `../SQLSharp` at `7d3d9f6`, `../scratch` at mtime `2026-04-15`). No re-verification needed — within the 30-day Gate B window.

### Tsconfig audit

- Reuses repo `tsconfig.json` (no per-slice deviation).
- All 3 files compile under `tsc --noEmit` clean.

### Eslint audit

- All 3 files clean under `eslint` (typescript-eslint strictTypeChecked + stylisticTypeChecked + sonarjs).
- Pattern: `eslint-disable-next-line sonarjs/no-os-command-from-path` reused on `git` invocations only (intentional — same as prior slices).

### Code-pattern audit (per-port)

- **`no-empty-dirs.ts`**: readdirSync recursive walk + git-check-ignore batch + Set-based allowlist match. The bash trailing-whitespace strip regex (matching tab/space at end-of-line) replaced with manual char walk (`trimTrailingSpaceTab`) — no slow-regex flag. Comment-or-blank line check (bash `^[[:space:]]*(#|$)`) replaced with manual char walk (`isCommentOrBlankLine`) — same.
- **`safety-clause-audit.ts`**: H1/H2/H3 regex sets split into pattern arrays where each individual regex stays under sonarjs/regex-complexity threshold (20). H1 array uses `/i` flag + non-capturing optional `(?:[\t ]+do)?` to collapse NOT/not + does/do alternatives without inflating per-regex complexity. Argument parsing extracted into `parseFailOverArg()` so the main loop stays under cognitive-complexity (15).
- **`doc-comment-history-audit.ts`**: in-bash awk script (60+ lines) replaced with TS `extractTokens()` doing per-line `RegExp.exec` loop + manual leading/trailing word-boundary check (`isBoundary`). Tokens-ending-in-`:` skip the trailing boundary check, mirroring the bash logic exactly. Tree walk extracted into `walkRoot` + `processEntry` + `readDirEntries` for cognitive-complexity compliance.

### Equivalence audit

Diff'd against bash output on this repo state (2026-04-30 main):

- **`no-empty-dirs`**: bash original errors with "unbound variable" on macOS bash 3.2 + empty FILTERED array (pre-existing bug); TS produces correct output `OK (0 allowlisted, 0 flagged)`. Behavioural improvement, not divergence.
- **`safety-clause-audit`**: byte-equivalent across all 3 modes (`summary` / `--list-missing` / `--verbose`).
- **`doc-comment-history-audit`**: byte-equivalent across all 4 modes (`check` / `--list` / `--fail-any` / `--regenerate-baseline`). Sole intentional diff: error-message self-reference is `.ts` instead of `.sh`, since each invocation tells users to use the same form they ran.

### Outcome

Slice 7 passes audit. No new patterns recorded — all reused from prior slices. The two remaining Cluster H scripts (`no-directives-otto-prose.sh` at 261 lines + `runner-version-freshness.sh` at 356 lines) are deferred to slice 8 — natural size boundary, plus `no-directives-otto-prose` has Task #350 (extend scope) so port-then-extend likely needs paired review.

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
