---
id: B-0949
priority: P3
status: open
title: Tri-boolean float FromValue mode-search hangs for wide decoders — bound the scan analytically (or cap widths) CONSISTENTLY across TS/F#/C#/Rust
tier: core-primitive
ask: Codex P2 review on PR #6186 (2026-05-30)
created: 2026-05-30
last_updated: 2026-05-30
decomposition: leaf
composes_with:
  - docs/backlog/P1/B-0944-tri-boolean-core-primitives-digital-qubit-floating-point-multi-language-build-compiler-parity-non-byzantine-bft-aaron-2026-05-30.md
  - docs/DECISIONS/2026-05-31-observe-act-16-direction-universal-action-grammar-local-no-cloud-llm.md
  - .claude/rules/monad-propagation-pattern-cross-language-substrate-shape.md
tags: [core-primitive, tri-boolean, floating-point, fromvalue, performance, dos-hardening, cross-language-parity, biased-exponent, v0-hardening]
type: bug
---

# B-0949 — Tri-boolean float `FromValue` mode-search hangs for wide decoders

## The finding (Codex P2 on PR #6186, 2026-05-30)

`FromValue` (the biased-exponent canonical encoder) scans the decoder mode linearly from `0` to
`2^decoderWidth - 1`, computing `V = value / 2^(mode - bias)` at each step until `V` is a
non-negative integer fitting the value field. For the default 4/3/4 shape this is 8 iterations —
trivial. But `FloatShape` is **public** and `FromTrits` accepts **arbitrary** decoder widths, and:

- `bias = 2^(decoderWidth - 1)`, so for `decoderWidth >= ~20` the bias is ~10^6+; the first mode
  whose `V` drops below `2^valueBits` is around `bias`, while the loop starts at `0`.
- Result: a call like `FromValue(1.0, FloatShape(4, 32, 4))` scans ~2.1 **billion** iterations
  before finding an ordinary value — an **effective hang** instead of returning feedback.

## Consistent across oracles — NOT a parity divergence

The same linear `0..maxMode` scan is present in **all** the impls: F# (`int64`), C# (`long`),
Rust (`u64`) `FromValue` (TS's `fromValue` is radix-point but the same loop shape). The 2026-05-30
int64/long widening (PRs #6183 F# / #6186 C#) made the integer widths **consistent**; it did not
create this hang — the hang is a pre-existing v0 limitation now uniform across the four. So the fix
**must be applied identically across all four impls** (a C#-only point-fix would *introduce*
divergence — backwards for a BFT-parity primitive).

## Fix options (operator/design decision on policy)

1. **Analytic mode window** (preferred — pure improvement, parity-preserving): derive the smallest
   mode where `V < 2^valueBits` from `log2(value)` (`mode_lo ≈ bias - valueBits + log2(value)`,
   clamped to `[0, maxMode]`), then scan only the ~`valueBits`-wide window, breaking once `V < 1`
   (V decreases monotonically as mode rises). Same results for every currently-terminating shape;
   no hang. Risk: the `log2`/floor/ceil edge cases must be computed **identically** across f64 in
   all four languages, or a new conformance divergence appears — verify with a shared vector.
2. **Cap widths** (Codex's alternative — simpler, changes the contract): reject f64-non-meaningful
   shapes up front with `NotRepresentable` feedback (e.g. `valueBits > 52` or `decoderWidth` whose
   `bias` exceeds f64's exponent range), before the loop. Easy + uniform, but narrows the API.

Either way: land the SAME choice in TS/F#/C#/Rust + add a conformance vector (the slice-6 ballot)
that exercises a wide-decoder shape and asserts bounded-time feedback rather than a hang.

## Acceptance

1. `FromValue` returns in bounded time (no multi-billion-iteration scan) for any public shape,
   in all four impls.
2. The chosen policy (analytic-window vs width-cap) is identical across TS/F#/C#/Rust.
3. A conformance vector covers a wide-decoder shape; 4-of-4 parity on it.
4. Existing default-shape behavior unchanged (the 13/14 per-language vectors still pass).

## Why P3

Latent — only pathological public shapes (decoderWidth ≥ ~20) hit it; no realistic usage
(default decoderWidth = 3) is affected, and v0 is an explicitly PROPOSED design-starter. Raise to
P2 if/when a consumer needs wide-decoder shapes. The Copilot P1 test-gap on the same PR (untested
past 31 bits of *value* width) was fixed in #6186 directly; this row tracks the *decoder*-width
mode-search hang separately.

## Pre-start checklist (per backlog-item-start-gate)

- **Prior-art search (2026-05-30):** the mode-search lives in B-0944 slice 5 pt2 (`FromValue` in
  each `Core.*.TriBoolean` float). No existing row covers the wide-decoder hang. Composes with the
  slice-6 conformance harness (the BFT ballot) where the wide-shape vector belongs.
- **Dependency check:** depends on B-0944 slice 5 pt2 (the float impls — F#/C#/Rust merged via
  #6183/#6184+#6186/#6185). Slice 6 (conformance harness) is the natural home for the wide-shape
  parity vector.
- **Empirical anchor:** Codex P2 thread on [PR #6186](https://github.com/Lucent-Financial-Group/Zeta/pull/6186).
