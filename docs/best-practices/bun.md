# Bun — Zeta adopted patterns

**Status**: Active. Runtime-level baseline (orthogonal to language —
see `typescript.md` for TypeScript language conventions).

**Trigger**: Required to exist and be current before the *first
mutating action* on any Bun-runtime port slice (TS/Bun migration
trajectory's Gate B prerequisite). Read-only scoping may happen
first; mutation waits for this artifact + `typescript.md` (when
the source is TypeScript).

**Currency rule**: Each upstream source below carries a
last-verified date. A slice's freshness pass MUST re-verify any
source whose verification window has elapsed (default: 30 days)
before that slice mutates files.

## Upstream sources (verified)

| Source | URL | Last verified |
|---|---|---|
| Bun TypeScript runtime | https://bun.com/docs/runtime/typescript | 2026-04-29 |
| Bun Shell ($) | https://bun.com/docs/runtime/shell | 2026-04-29 |

If any date is >30 days old when the next slice opens, re-run the
WebSearch and update the date before mutating files. Per Otto-364
(search-first authority): training-data knowledge of Bun idioms is
stale within weeks (Bun ships fast).

## tsconfig — Bun-runtime additions

When Bun is the runtime, layer these on top of the language-level
shape in `typescript.md`:

```jsonc
{
  "compilerOptions": {
    // Bun runs .ts directly; no transpile step needed
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",

    // TS 6.0 changed default to []; Bun globals require explicit listing
    "types": ["bun"]
  }
}
```

## Entrypoint pattern

Bun-canonical entry guard:

```ts
if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
```

Pair with named exports of `main` and pure helpers so the module
is importable for tests.

## Shell pipelines — Bun Shell vs Node-style spawn

**Decision rule**:

- **File-walkers / single-command invocations / regex-matchers** →
  Node-style `spawnSync` from `node:child_process`. Slice 1 ports
  use this pattern. Examples: `git ls-files`, `git rev-parse`.
- **Multi-stage shell pipelines** (`a | b | c` with explicit error
  semantics, set -e equivalence) → Bun Shell (`Bun.$`) so error
  propagation from intermediate stages is explicit instead of
  silently swallowed.

**Mandatory checklist item** for any slice that uses shell
pipelines: confirm Bun Shell error semantics (a failing
intermediate stage propagates) match the bash `set -e` semantics
of the original.

## Process spawn — structured failure classifier

When using `spawnSync`, mirror SQLSharp's
`tools/automation/format/process-runner.ts` pattern:

```ts
function classifyGitFailure(
  args: readonly string[],
  result: SpawnSyncReturns<string>,
): string | null {
  if (result.error) {
    return `Failed to start 'git ${args.join(" ")}': ${result.error.message}`;
  }
  if (result.status === null) {
    if (result.signal !== null) {
      return `'git ${args.join(" ")}' terminated by signal ${result.signal}`;
    }
    return `'git ${args.join(" ")}' terminated before reporting an exit code`;
  }
  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    return stderr !== ""
      ? stderr
      : `'git ${args.join(" ")}' exited ${String(result.status)}`;
  }
  return null;
}
```

Three branches: launch failure (`result.error`), termination-
without-exit (`result.status === null` — covers signal kills and
abnormal termination), non-zero exit (`result.status !== 0`).
Collapsing any of these branches into a single "process failed"
loses information that the bash original carried.

**`maxBuffer` for git ls-files**: when piping through `spawnSync`,
the default stdout buffer can be exceeded by repos with many
matched files. Set `maxBuffer` explicitly when the command's
output is unbounded:

```ts
spawnSync("git", ["ls-files", "-z", "*.md"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,  // 64 MiB; bash original streams, no fixed buffer
});
```

## File IO — atomic reads, no TOCTOU races

Don't pre-check existence then read:

```ts
// WRONG — TOCTOU race (CodeQL js/file-system-race)
if (existsSync(target)) {
  content = readFileSync(target, "utf8");
}
```

Read atomically; let `readFileSync` throw on ENOENT/EISDIR/EACCES
and handle in catch:

```ts
let content: string;
try {
  content = readFileSync(target, "utf8");
} catch {
  process.stderr.write(`error: target file not found: ${target}\n`);
  return 64;
}
```

When the failure mode matters (permission vs missing vs
directory), capture the error code:

```ts
} catch (error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;
  // surface code in error message
}
```

For audit scripts where the only useful action is "fail loud,"
the simple form suffices.

## DST (Deterministic Simulation Testing) — Bun runtime

DST is a universal Zeta best practice. The language-layer
obligation lives in `typescript.md`; this section names the
Bun-runtime tooling.

- **Pinned seeds**: `Math.random()` is non-deterministic; tests
  that need randomness inject a seeded RNG (e.g., `seedrandom` or
  a small in-repo seed-PRNG helper). The slice's `bunfig.toml`
  test config can document the seed.
- **Fake clocks**: `bun:test` supports `setSystemTime()` for
  controlling `Date.now()`. Avoid real timers in test paths;
  inject a clock or use Bun's fake-time API.
- **Deterministic test order**: avoid relying on filesystem
  enumeration order or async-resolution race ordering. When order
  matters, sort explicitly.
- **No retries in CI** — test retries are a DST-violation smell.
  If a test flakes, investigate root cause; do NOT paper over
  with `retry: N`.

Re-verify Bun's current DST tooling before any slice that
introduces tests (the API surface evolves; per the currency rule).

## Code coverage — Bun runtime

Built-in via Bun's test runner. Pattern adopted from `../SQLSharp`:

```toml
# bunfig.toml
[test]
timeout = 20000
coverageSkipTestFiles = true
coveragePathIgnorePatterns = [
  "**/node_modules/**",
  "**/bin/**",
  "**/obj/**",
  "**/artifacts/**",
  "**/TestResults/**",
]
```

Run with `bun test --coverage`. CI surfaces coverage; reductions
fail the gate. Helper scripts (mirroring SQLSharp's pattern) live
under `tools/automation/coverage/` once Zeta has them.

Per Otto-364: re-verify Bun's current coverage flags before
introducing the workflow (SQLSharp's `bunfig.toml` shape was
verified 2026-04-30 at commit `7d3d9f6`).

## What this artifact is NOT

- **Not the full Bun expert skill** — task #351 remains open; this
  is the minimum substrate.
- **Not a doctrine lane** — lives inside whatever trajectory
  invokes it as Gate B.
- **Not a machine-runnable audit** — that's a follow-up.
- **Not language-coupled** — TypeScript conventions are in
  `typescript.md`. This file is the runtime layer.
- **Not project-specific composition** — Zeta-specific scripting
  conventions (CLI flags, exit codes, output channel discipline,
  per-slice audit checklist) are in `repo-scripting.md`.

## Composes with

- `docs/best-practices/typescript.md` — TS language conventions.
- `docs/best-practices/repo-scripting.md` — Zeta composition layer
  (where the per-slice audit checklist lives).
- Otto-364 (search-first authority) — drives the currency rule.
- Otto-363 (substrate-or-it-didn't-happen) — this file IS that
  landing for the runtime axis.
- Task #351 (TS+Bun expert + teaching skill) — eventual full
  skill; this is the scoped precursor.
