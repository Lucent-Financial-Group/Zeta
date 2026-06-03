# Ace — untrusted-input `packageHash` hardening (design)

> Trust-core hardening follow-up for the Ace package manager (B-0288), surfaced by the
> 8.1/8.2 final reviews and confirmed against current `origin/main` 2026-06-03. The
> `packageHash` primitive (8.2) throws (via `canonicalBytes` → `toTagged`) on a malformed
> field — a non-safe-integer (e.g. a float) or a lone UTF-16 surrogate. `resolve.ts`'s
> **dependency** site already maps that throw to a styled `invalid-package` refusal; the
> sibling untrusted-input sites do **not**, so the same malformed input surfaces as the
> generic `ace: fatal: <internal message>` catch-all (the entry-point `.catch`) — an
> internal-error channel, not a domain refusal. This slice closes that gap uniformly. No
> behaviour change for well-formed packages; bugfix-class hardening, not a new feature.

## Goal

A malformed **untrusted** package (float / lone-surrogate field) must refuse with a
clean, styled domain message — `invalid-package` (resolve) / `ace: … refused: …` /
`ace: registry add: …` (CLI) and a deterministic exit code — never escape as
`ace: fatal:`, which is reserved for genuinely-unexpected internal faults. The trust
core already has the correct pattern at one site (`resolve.ts:141-145`); this slice
applies it at every untrusted-input `packageHash` site via one shared throw-safe helper.

## The gap (confirmed against `origin/main` 2026-06-03)

`packageHash(pkg)` throws on a malformed field. Reachable unguarded sites:

| Site | Path | Reachability | Current surface |
|---|---|---|---|
| `resolve.ts:43` `packageHash(root)` | default graph install / update | **primary** — malformed root | throw escapes `resolve()` → `main()` → `ace: fatal:` |
| `ace.ts` registry-add `packageHash(pkg)` | `ace registry add` (no `--hash`) | shape-guarded object-ness **only** | throw escapes → `ace: fatal:` |
| `ace.ts` frozen-root `packageHash(pkg)` | `install --frozen` w/ deps | needs a matching lock | throw escapes → `ace: fatal:` |
| `ace.ts` frozen-node `packageHash(np)` (×2) | `install --frozen` w/ deps | shape-guarded object-ness **only** | throw escapes → `ace: fatal:` |
| `preflightGraph` `packageHash(node)` | install + update | defense-in-depth (root/dep already caught upstream by `resolve`) | throw escapes → `ace: fatal:` |

Already-correct (the pattern to mirror): `resolve.ts:141-145` — dep `packageHash(dep)`
wrapped in `try/catch` → an `invalid-package` result.

Clean (no change): the **leaf** (no-deps) install path computes only `content_hash`
(`JSON.stringify` of files — never throws on floats/surrogates), not `packageHash`.

Two **overconfident comments** to correct: the frozen-node shape-guard and the
registry-add shape-guard both claim their object-ness check prevents a `packageHash`
throw ("…instead of throwing in packageHash/contentHash" / "would otherwise … throw").
It does not — object-ness says nothing about field *values*; a float/lone-surrogate
field still throws past them. The comments must say what is actually true: the
object-ness guard covers shape; `safePackageHash` covers the field-value throw.

## Decisions (this spec locks them)

1. **Centralize the throw→reason mapping** in `tools/ace/package-hash.ts` as
   `safePackageHash(pkg): { ok: true; hash } | { ok: false; reason }` — one `try/catch`
   that maps the `toTagged` throw to a reason string. One mapping site, uniform
   behaviour, easy to unit-test. `packageHash` itself is unchanged (trusted callers keep
   it). This is the asymmetric-authorship / `Result<T, TFeedback>` shape at primitive
   scope: the malformed-field outcome becomes a *value* the caller must handle, not an
   exception that escapes.

2. **Apply `safePackageHash` at every untrusted-input site** in the table above, mapping
   the not-ok case to the call site's existing refusal channel + exit code:
   - `resolve.ts:43` (root) → an `invalid-package` result at path `["root"]`.
   - `resolve.ts:141-145` (dep) → refactor to `safePackageHash` for uniformity (identical
     behaviour; deletes the duplicated inline `try/catch`).
   - registry-add → prints `ace: registry add: invalid package — <reason>` and returns
     exit **65** (matches the path's existing 65 for malformed input).
   - frozen-root / frozen-node → print an `ace: install refused: invalid-package — …`
     message and return exit **1** (matches the path's 1). Frozen-node computes the hash
     **once** via `safePackageHash` and reuses it for both the pin check and the
     store-key collision check (removes the existing double `packageHash(np)` call).
   - `preflightGraph` → returns its `string | null` error string (`invalid-package in
     <name>: <reason>`).

3. **Correct the two overconfident shape-guard comments** to state the real division of
   labour (object-ness guard = shape; `safePackageHash` = field-value throw).

4. **No `packageHash` value changes, no signature/identity-semantics changes.** Only the
   *failure path* for malformed untrusted input changes (generic `fatal:` → styled
   refusal). Every existing well-formed assertion stays green.

## Testing (assert-don't-skip)

- **Unit — `package-hash.test.ts`:** `safePackageHash` returns an ok result whose hash
  matches `packageHash` for a well-formed package; returns a not-ok result (reason
  mentions "safe integer" / "lone surrogate") for a float field and for a lone-surrogate
  field. (Mirrors the existing `packageHash` "throws" test, inverted to the safe wrapper.)
- **Behavioural — `resolve.test.ts`:** a root carrying a float manifest field →
  `await resolve(badRoot, …)` returns an `invalid-package` result (today it *throws* at
  line 43 → the `await` rejects → falsifying). Same for a lone-surrogate root.
- **Behavioural — `ace.test.ts`:** `ace registry add <name> <ver> <malformed-path>` →
  `await main([...])` returns `65` (today `main()` *throws* → the `await` rejects →
  falsifying). The package matches the CLI name/version (passes identity) but carries a
  float field (throws in `packageHash`).
- **Coverage honesty:** the frozen-root / frozen-node / `preflightGraph` sites are
  guarded uniformly by the same helper and covered by the `safePackageHash` unit test +
  code review. They are defense-in-depth: in the default + update flows `resolve` already
  catches a malformed root/dep upstream, so a throwing package cannot reach
  `preflightGraph`; the frozen sites need a matching lock fixture. The guard is applied
  (no hole in the shield) and the reachable surface (resolve root, registry-add) is
  asserted end-to-end; this is stated rather than silently skipped.
- **Gates:** `bun test tools/ace/` green; `bun --bun tsc --noEmit -p tsconfig.json`
  exit 0; pure-LF; markdownlint on this doc.

## Scope / YAGNI

In scope: the `safePackageHash` helper + unit tests; uniform application at all five
untrusted-input sites; the two comment corrections; behavioural tests for the two
reachable sites. Out of scope: changing `packageHash` semantics or the signature /
content-hash mechanisms (unchanged); a separate frozen-lock malformed fixture harness
(defense-in-depth sites are guarded + unit-covered); wiring `bun test tools/ace/` +
cross-verify into CI (the still-standing separate follow-up); slice 8.4 index-verify
(the next feature slice, separately gated).

## Files touched

- `tools/ace/package-hash.ts` — add `safePackageHash` + `SafePackageHash` (no change to `packageHash`).
- `tools/ace/package-hash.test.ts` — `safePackageHash` unit tests.
- `tools/ace/resolve.ts` — root site → `safePackageHash`; dep site refactored to `safePackageHash`.
- `tools/ace/resolve.test.ts` — malformed-root behavioural tests.
- `tools/ace/ace.ts` — registry-add / frozen-root / frozen-node / `preflightGraph` → `safePackageHash`; two comment corrections.
- `tools/ace/ace.test.ts` — registry-add malformed behavioural test.

## Decomposition

- **T1 — helper + unit tests (TDD).** `safePackageHash` + `SafePackageHash` in
  `package-hash.ts`; unit tests in `package-hash.test.ts` (well-formed parity; float +
  lone-surrogate → not-ok).
- **T2 — resolve sites + tests (TDD).** Root site → `safePackageHash` (→ `invalid-package`,
  path `["root"]`); dep site refactored to `safePackageHash`; falsifying-then-passing
  malformed-root tests in `resolve.test.ts`. Re-green the resolve suite.
- **T3 — ace.ts sites + registry test + comment fixes (TDD).** registry-add / frozen-root /
  frozen-node (compute once, reuse) / `preflightGraph` → `safePackageHash`; correct the two
  shape-guard comments; registry-add malformed behavioural test in `ace.test.ts`. Re-green
  the full Ace suite + `tsc`.
