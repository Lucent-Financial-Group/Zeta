# Ace CLI slice 5.2 — semver ranges + version solver (design)

> Spec for slice 5.2 of the Ace DLC package manager (B-0288). Builds directly on
> slice 5.1 (registry data layer + exact-version resolution, merged PR #6369).
> Brainstormed + decided with the operator 2026-06-01.

## Goal

A registry dependency can name a package by **name + semver range** (e.g. `^1.2.0`)
instead of an exact version. `ace install` **solves** the range constraints across the
whole transitive graph to a single concrete version per package, then feeds the solved
graph into slice 5.1's **unchanged** verify + atomic-install engine.

## Decomposition of slice 5 (recap)

- **5.1** (done, #6369): registry data layer + exact-version lookup.
- **5.2** (this spec): semver ranges + solver → concrete versions → 5.1 engine.
- **5.3** (next): lockfile (persist the solved graph; the solver's output is the seam).

## Decisions (this spec locks them; operator 2026-06-01)

1. **Semver scope = pragmatic subset.** `^`, `~`, `>=`, `<=`, `>`, `<`, `=`, exact
   `x.y.z`, `*` / `x` wildcards, and space-separated AND-ranges (`>=1.2.0 <2.0.0`).
   **Deferred** (→ B-0970): `||` unions, hyphen ranges (`1.2 - 1.5`), pre-release
   precedence (`1.0.0-rc.1`), build metadata.
2. **Own solver, dependency-free on the hot path.** A deterministic newest-first
   backtracking solver we write; no solver library on the install path.
3. **Two-phase clean split.** Solve produces a `name → concrete version` map; 5.1's
   `resolve()` consumes the map (one minimal param) and runs its existing verify +
   atomic install. The solver fetches to read transitive deps; `resolve()` re-fetches
   to verify — accepted (registry reads are local/content-addressed). A single-fetch
   cache is **deferred** (→ B-0972, lands naturally with the 5.3 lockfile).
4. **Z3 tests our TS.** Differential tests cross-check our TS solver against **Z3**
   (end-to-end multi-constraint assignment) and **node-semver** (the `satisfies` /
   `compare` primitive). Both are **test-only devDependencies** (npm `z3-solver` WASM
   + `semver`), pinned to WebSearch-current versions at build time per
   `dep-pin-search-first-authority`. Using `z3-solver` (WASM, always present in CI)
   not a system `z3` binary, so the Z3 cross-check **asserts** rather than skipping —
   no false-green hole (per `automated-tests-are-the-shield`).

## Manifest dep shape (`tools/ace/store.ts`)

The `AceDependency` DU is unchanged in shape; the **interpretation** of a registry
edge's `version` field widens from "exact" to "semver range":

```ts
export type AceDependency =
  | { readonly kind: "inline";   readonly name: string; readonly version: string; readonly url: string; readonly package_hash: string }
  | { readonly kind: "registry"; readonly name: string; readonly version: string }; // version: now a semver RANGE
```

Inline edges stay exact-pinned + self-contained (url + package_hash). Registry edges'
`version` is parsed as a range and solved against the versions the registry holds for
that name. An exact `x.y.z` is a valid range (the degenerate case → 5.1 behavior).

## Semver module (`tools/ace/semver.ts`, new — pure, our own)

Pure functions, no I/O, deterministic:

- `parseVersion(s): {major, minor, patch} | null` — strict `x.y.z` (no pre-release/
  build in this subset).
- `compareVersions(a, b): -1 | 0 | 1` — numeric major→minor→patch ordering.
- `parseRange(s): Range | { error }` — the subset grammar (`^ ~ >= <= > < =`, exact,
  `* / x` wildcard, space-AND). A `Range` is a conjunction of comparators (lower/upper
  bounds). Malformed → `{ error }` (surfaces as `bad-range`).
- `satisfies(version, range): boolean` — version ∈ range.
- `maxSatisfying(versions, range): string | null` — newest version satisfying the range
  (the solver's per-package candidate pick).

`^` / `~` desugar to comparator pairs: `^1.2.3` → `>=1.2.3 <2.0.0`; `^0.2.3` →
`>=0.2.3 <0.3.0`; `^0.0.3` → `>=0.0.3 <0.0.4`; `~1.2.3` → `>=1.2.3 <1.3.0`. Documented
in the module so the desugaring is the testable spec node-semver is checked against.

## Solver (`tools/ace/solver.ts`, new — our own, hot-path dependency-free)

```ts
export type SolveResult =
  | { ok: true; versions: Map<string, string> }              // name → concrete version
  | { ok: false; reason: "unsatisfiable" | "bad-range" | "registry-miss" | "fetch-failed" | "invalid-package"; detail: string; path: string[] };

export async function solve(
  root: AcePackage,
  fetchPackage: FetchPackage,
  registry: Registry,
): Promise<SolveResult>;
```

Algorithm — **deterministic newest-first backtracking** (pubgrub-shape, scoped to the
subset):

1. Accumulate constraints per package name. The root's edges seed them; inline edges
   contribute a fixed exact constraint (`=x.y.z`); registry edges contribute their range.
2. For an unassigned package, intersect all its accumulated ranges and take
   `maxSatisfying(registry versions for that name, intersected range)`. No candidate →
   **backtrack** to the most-recent decision that narrowed this package and try its next
   lower version; exhausted → `unsatisfiable` with the conflicting constraint path.
3. Fetch the chosen version (to read its transitive deps), add its edges as new
   constraints, recurse. Cache fetched manifests within a single `solve` run so a
   package version is fetched at most once during solving.
4. Determinism: candidates always tried newest-first; package visitation order is
   stable (sorted by name) so a given (root, registry) always yields the same solution
   — DST-compatible.

The solver never installs and never verifies signatures/hashes — that stays 5.1's job.
It only reads manifests to discover the dependency graph + picks versions.

## Resolver integration (`tools/ace/resolve.ts` — minimal touch)

`resolve()` gains one param, `solved: Map<string, string>`, and changes **only** how a
registry edge's concrete version is derived; every verify step (content-hash, full
package-hash pin, declared-identity, signature, atomic install, cycle, tamper) is
unchanged:

```ts
// registry edge: version field is a RANGE; the concrete version comes from the solver
if (edge.kind === "registry") {
  const concrete = solved.get(edge.name);
  if (concrete === undefined) return { ok:false, reason:"unsatisfiable", detail:`${edge.name}: no solved version`, path: here };
  const entry = registry.get(edge.name)?.get(concrete);
  if (entry === undefined) return { ok:false, reason:"registry-miss", detail:`${edge.name}@${concrete} not in registry`, path: here };
  url = entry.url; package_hash = entry.package_hash;
  // byName / version-skew / tamper checks use `concrete`, not the range string
}
```

Because the solver guarantees one concrete version per name across the whole graph, the
existing `version-skew` check becomes a safety net (it can only fire if the solver and
resolver disagree — a bug). Inline edges are untouched (exact + self-pinned).

**New `ResolveReason`s:** `unsatisfiable`, `bad-range`. (Exact inline edges keep
`version-skew`; ranged edges can't skew once solved.)

## CLI (`tools/ace/ace.ts`)

- `ace install <pkg>` transparently runs `solve` → `resolve` (no new flag required).
- `ace install --print-resolution <pkg>` (optional, small): print the solved
  `name@version` map before installing — useful for debugging + a preview of the 5.3
  lockfile. (MVP-optional; include only if cheap.)
- `ace registry add` / `ace registry list` unchanged from 5.1.

## Differential testing (test-only; never on the install path)

- **node-semver oracle** (`semver` npm, devDep): for a generated corpus of
  (version, range) pairs, assert `our satisfies === semver.satisfies` and
  `our maxSatisfying === semver.maxSatisfying`. This is the load-bearing oracle for the
  range primitive and is always present in CI → it **asserts** (no skip).
- **Z3 cross-check** (`z3-solver` WASM npm, devDep): encode a generated dependency-graph
  + range-constraint problem as SMT (versions as bounded ints, ranges as constraints,
  maximize-newest objective) and assert our solver's assignment matches a Z3 model
  (or both agree it is unsatisfiable). This tests our TS solver end-to-end. `z3-solver`
  is a WASM devDep so it is always present in CI → **asserts**, no graceful-skip hole.
- Own unit tests: `^`/`~` desugaring table, AND-range intersection, wildcard, backtrack
  cases (version-dependent transitive deps that force a lower pick), `unsatisfiable`,
  `bad-range`, mixed inline+registry, determinism (same input → same solution).
- e2e via `main(["install", …])`: install a root with ranged registry deps resolving
  across a multi-package registry; an unsatisfiable graph → exit 1, store empty (atomic).

## Sliced-off enhancements (filed as backlog; operator "slice off everything we skipped")

- **B-0970** — advanced semver: `||` unions, hyphen ranges, pre-release precedence,
  build metadata.
- **B-0971** — remote registry: HTTP-fetched registry index (today the registry is
  local bundled∪user JSON).
- **B-0972** — solver↔installer single-fetch cache: thread the solver's fetched+verified
  packages to install so each is fetched once (composes with the 5.3 lockfile).

## Out of scope (explicit)

- `||` / hyphen / pre-release / build-metadata semver (→ B-0970).
- Remote registry (→ B-0971).
- Single-fetch cache (→ B-0972).
- Lockfile (→ slice 5.3, its own brainstorm).
- Solver as a runtime library; Z3/node-semver on the install path (test-only here).

## Files

| File | Change |
|---|---|
| `tools/ace/semver.ts` | new — pure subset range parser + `satisfies` / `compare` / `maxSatisfying` |
| `tools/ace/solver.ts` | new — newest-first backtracking `solve()` → `Map<name,version>` |
| `tools/ace/resolve.ts` | minimal — `solved` map param; registry edge concrete-from-map; `unsatisfiable` / `bad-range` reasons |
| `tools/ace/ace.ts` | install runs solve→resolve; optional `--print-resolution` |
| `tools/ace/semver.test.ts` | new — unit + node-semver differential |
| `tools/ace/solver.test.ts` | new — unit + Z3 differential |
| `tools/ace/resolve.test.ts`, `ace.test.ts` | range/unsatisfiable/e2e cases |
| `package.json` | test-only devDeps `semver` + `z3-solver` (WebSearch-pinned at build) |
| `.claude/skills/ace/SKILL.md` | range deps + solver docs |
