# WSet Stable Operation-Surface Contract

## Scope

This contract defines the finite operation surface used by the WSet erasure-classification law pack. A **stable WSet operation** is a method declared directly on the compiled `Zeta.Core.WSet` module that is public, static, and not marked with the CLR `CompilerGeneratedAttribute`.

The current stable receipt contains exactly nine source-owned operations: `apply`, `bornProb`, `consolidate`, `copy`, `discard`, `mapKeys`, `negate`, `plus`, and `tensor`. Each must have a `WSetHeat` profile and a finite executable specialization in the law pack.

## Exclusion Boundary

The contract deliberately excludes compiler-generated helpers. On the current compiler output, the local lambda used by `bornProb` produces a public CLR helper named `<sumBy>__debug@69`; its metadata carries `CompilerGeneratedAttribute`. It is not a source-owned WSet operation, has no stable F# invocation surface, and is not an independent thermodynamic transformation to classify.

The exclusion is metadata-based, not name-based. It therefore does not conceal a newly declared source-owned public function merely because its name resembles an implementation detail.

## Drift Controls

The law pack keeps two separate checks. The coverage check compares the stable reflected surface with the `WSetHeat` profile inventory. The fixed nine-name receipt independently checks the reflected stable surface itself. Thus a newly added public, unmarked WSet operation fails even if a change tries to keep the profile inventory and reflection filter aligned.

## Non-Claims

This contract only stabilizes the finite API-discovery boundary for the existing exhaustive reference-domain classification. It does not assert a general physical heat cost, classify generated CLR helpers as callable operations, or turn the finite sweep into a universal theorem about arbitrary WSet specializations.
