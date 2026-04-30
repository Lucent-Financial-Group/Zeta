# TypeScript — language / type-system standard

**Status**: Active. Language-layer baseline. Pure type-system content
— NOT typed-linting (`typescript-eslint.md`), NOT runtime
(`bun.md` / future `node.md` / `deno.md`), NOT Zeta-specific
composition (`repo-scripting.md`).

**Currency rule**: Each upstream source carries a last-verified
date. Re-verify any source whose verification window has elapsed
(default: 30 days) before relying on this artifact for a mutating
action.

## Upstream sources (verified)

| Source | URL | Last verified |
|---|---|---|
| TypeScript 6.0 release notes | https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html | 2026-04-29 |
| typescript-eslint v8 typed-linting | https://typescript-eslint.io/getting-started/typed-linting/ | 2026-04-29 |
| typescript-eslint v8 announcement | https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/ | 2026-04-29 |

Per Otto-364 (search-first authority): training-data knowledge of
TypeScript idioms is stale within weeks. Re-search before treating
this as ground truth.

> **Anti-bloat note**: typescript-eslint is included as a section
> below rather than its own file. If the typed-linting content
> grows beyond a section, split it into `typescript-eslint.md`
> at that point — not preemptively.

## tsconfig — language-level strictness shape

```jsonc
{
  "compilerOptions": {
    // strictness — recommended by TS 6.0
    "strict": true,                          // default in TS 6.0
    "noUncheckedIndexedAccess": true,        // index access yields T | undefined
    "exactOptionalPropertyTypes": true,      // distinguish missing vs undefined
    "verbatimModuleSyntax": true,            // explicit type-only imports

    // emit discipline — runtime decides whether emit happens at all
    "noEmitOnError": true
  }
}
```

`target` / `module` / `moduleResolution` / `types` are
runtime-specific — see the runtime layer (`bun.md` etc.) for those.

**Recorded gap**: `noPropertyAccessFromIndexSignature` — recommended
by TS 6.0 but commonly omitted for ergonomics. Project composition
files decide whether to enable it.

## Hard requirements (the line between TypeScript and "JS with type stickers")

- **Typed external boundaries** — CLI args, file paths, exit codes
  have named types, not `string | number`.
- **Typed domain records** — findings, results, config objects are
  structured `{ field: T }` shapes, not stringly-formatted text.
- **Checked unknown / regex / index / file IO** — regex match groups
  guarded before access; array/object index access undefined-aware
  under `noUncheckedIndexedAccess`; file-read errors handled as
  typed outcomes.
- **No unreviewed `any`** — every explicit `any` carries an inline
  justification comment naming why the type system can't express
  the constraint.
- **No broad unsafe casts** — `as` casts require justification when
  used; bare `<T>` casts forbidden.
- **DST-friendly code paths** — Deterministic Simulation Testing is
  a universal best practice across every Zeta language. The
  language-layer obligation:
  - No reliance on real `Date.now()` / `Math.random()` /
    `setTimeout`-timing for test-observable behavior. Inject a
    clock / RNG / scheduler so tests can substitute deterministic
    fakes.
  - Pin seeds where randomness is unavoidable.
  - Test retries are a DST-violation smell — investigate root
    cause; never paper over.
  Runtime-specific DST tooling lives in the runtime layer
  (`bun.md` for Bun; future `node.md` / `deno.md` for those).
- **Code-coverage gate** — every language adopts code coverage:
  - Tests cover the public API surface of every module by default.
    A new module without coverage is incomplete.
  - Coverage is reported (not hidden) — CI surfaces it; reductions
    fail the gate.
  - Branch + line coverage both tracked. Line-only is necessary
    but not sufficient.
  Runtime-specific coverage tooling lives in the runtime layer
  (Bun's built-in coverage in `bun.md`).

## Preferred patterns (style — not the merge gate, but adopt where natural)

- **Discriminated result unions** for multi-branch outcomes.
- **Literal-type union exit codes** (`AuditExitCode = 0 | 2 | 64`).
- **`readonly` arrays / objects** where mutation is not needed.
- **Reusable helper types** when patterns recur — don't pre-extract.

## typed-linting (typescript-eslint)

Adopted shape:

```text
tseslint.configs.strictTypeChecked       // enabled
tseslint.configs.stylisticTypeChecked    // enabled
eslint-plugin-sonarjs (recommended)      // enabled
parserOptions.projectService: true       // typed linting active
                                          // (or parserOptions.project for older setups)
```

**Build-time cost**: typed linting (where the linter reads the
TypeScript program to reason over types) is more expensive than
syntax-only linting. Accepted as the explicit tradeoff for the
strictness level — `strictTypeChecked` catches whole classes of
bugs that syntax-only rules cannot.

**What `strictTypeChecked` adds beyond `recommended`**:

- `no-floating-promises` — unhandled promises are bugs.
- `no-misused-promises` — `await` discipline.
- `no-unsafe-*` — flags `any` leaking through API boundaries.
- `restrict-template-expressions` — only stringifiable values
  in template literals.
- `unbound-method` — methods torn off their receivers.
- `await-thenable` — `await` on non-promises is dead code.

These are the rules that distinguish "I have types in my files"
from "the linter actually checks the types."

**What `stylisticTypeChecked` adds**: type-aware style rules
(`prefer-nullish-coalescing`, `prefer-optional-chain`,
`non-nullable-type-assertion-style`, etc.) — readability, no
semantic change.

If a project hits ergonomic friction, the escape hatch is
disabling `projectService` for narrow file globs (e.g.,
generated code) rather than dropping `strictTypeChecked`
wholesale.

## What this artifact is NOT

- **Not runtime conventions** — see `bun.md` (and future
  `node.md` / `deno.md`) for entry guards, `types` shape, process
  spawn, file IO atomicity, shell pipelines.
- **Not project-specific composition** — see `repo-scripting.md`
  for how Zeta composes TS + Bun + linting + sibling-repo patterns
  for automation scripts.
- **Not the full TypeScript expert skill** — task #351 remains open.

## Composes with

- `docs/best-practices/bun.md` — Bun runtime layer.
- `docs/best-practices/repo-scripting.md` — Zeta composition layer.
- Otto-364 (search-first authority) — drives the currency rule.
- Otto-363 (substrate-or-it-didn't-happen) — this file IS that
  landing for the language layer.
