---
id: B-0142
priority: P2
status: open
title: Code Contracts revival — design-by-contract primitives enforcing pre/post-conditions and invariants at compile/runtime, not at review time (Aaron 2026-05-01; reserved ID never filed; sibling of B-0141)
tier: tooling
effort: L
ask: Aaron 2026-05-01 named the row in the parallelism-scaling-ladder memo (`feedback_parallelism_scaling_ladder_kenji_unlocked_loop_agent_doc_code_two_lane_file_isolation_peer_mode_claims_automated_best_practice_at_scale_aaron_2026_05_01.md`) — "B-0142, not yet filed" — as the mechanization primitive at the runtime/compile boundary for pre-condition enforcement. ID was reserved; per-row file was never filed (caught by Otto 2026-05-03 audit pass post-B-0141 filing).
created: 2026-05-01
last_updated: 2026-05-03
depends_on: []
composes_with: [B-0141, B-0177]
tags: [code-contracts, design-by-contract, pre-condition, post-condition, invariant, mechanization, runtime, compile-time, fsharp, csharp, tooling]
---

# Code Contracts revival — design-by-contract primitives at compile/runtime

## Origin

Aaron 2026-05-01, in the parallelism-scaling-ladder memo (autonomous-loop maintainer channel), named this row in the mechanized-guardrail-vs-mover table:

> | Pre-condition violation | Code Contracts (B-0142, not yet filed) throws at runtime | Compiler-time refinement-types reject the build |

**Editorial note on the verbatim "throws at runtime" wording**: the originating memo's table cell predates this row's spec. Per CLAUDE.md's Result-over-exception invariant ("user-visible errors surface as `Result<_, DbspError>` or `AppendResult`-style values; exceptions break the referential-transparency the operator algebra depends on"), the actual implementation of B-0142 MUST flow contract violations as Result-error values, NOT throw exceptions. The verbatim quote is preserved; the row spec below normalizes to Result-flow.

And in the row-listing section:

> - **Code Contracts revival** (per B-0142 (not yet filed)) — design-by-contract primitives that enforce invariants at compile/runtime, not at review time.

ID was reserved; per-row file was never filed. Otto 2026-05-03 audit pass (post-B-0141 filing, post-B-0177 audit-row landing) found B-0142 missing alongside B-0141 in the same memo. Two days of substrate-time without the row materializing — sibling instance of the failure mode B-0177 captures.

## The problem

Pre-conditions, post-conditions, and invariants currently live in two places:

1. **Prose / comments**: documented in code comments + design docs. Not mechanically enforced; review-time guard.
2. **Tests**: assertions in unit tests verify the contract IS held by some inputs. Not exhaustive; only specific cases tested.

Neither catches:

- Pre-condition violations at the call-site (caller passed bad input)
- Post-condition violations at the implementation (implementation broke the promise)
- Invariant violations across object lifetime (state mutated to violate the invariant)

**Review-time enforcement** is the current discipline: reviewers spot pre-condition violations during code review. This is the failure mode the parallelism-scaling-ladder memo's "guardrail-vs-mover" table calls out — manual review is the static guardrail; mechanized enforcement (Code Contracts) is the kinetic mover.

## What this row builds

Design-by-contract primitives integrated into the F# / C# codebase:

1. **Pre-condition primitives**: `requires(condition, message)` at function entry; returns Result-error if violated (Result-over-exception per CLAUDE.md; NO throw / panic flow)
2. **Post-condition primitives**: `ensures(condition, message)` at function exit; verifies the return value satisfies the contract
3. **Invariant primitives**: `invariant(condition, message)` for class/object state; verified at all entry/exit points
4. **Optional compile-time mode**: refinement types (F# units of measure, C# nullable annotations, custom type-level constraints) that reject violations at the build step rather than runtime
5. **Integration with Result-over-exception** (per CLAUDE.md): contract violations produce structured `Result<_, ContractViolation>` values, not unhandled exceptions, when the call site is in a Result-flow

## Why "revival"

.NET historically had Microsoft Code Contracts library + ccrewrite tool that injected runtime checks. The library is now archived / unmaintained. Modern alternatives:

- **F#'s built-in features**: pattern matching exhaustiveness, units of measure, Result-types
- **C# nullable reference types**: compile-time null-violation detection
- **Third-party libraries**: PostSharp Aspect Framework (commercial), Fody.Aspects (community), custom source-generators
- **Roslyn analyzers**: compile-time custom checks via Microsoft.CodeAnalysis
- **F# type providers**: compile-time constraint generation

The row's scope: evaluate which of these (or combination) provides the design-by-contract primitives the project needs without the maintenance burden of the original Microsoft Code Contracts.

## Composes with

- **B-0141 (brittle-pointer auto-rewriter)**: sibling-instance of mechanization-primitives. B-0141 mechanizes substrate cross-reference quality; B-0142 mechanizes function-boundary contract quality.
- **B-0130 (verify-before-state-claim mechanized auditor)**: claim-integrity discipline; this row mechanizes the contract-integrity discipline at function boundaries
- **B-0170 (substrate-claim-checker)**: data-claim verification; this row's tool is code-claim verification
- **B-0177 (audit memos for misfiled backlog)**: this row's existence IS another empirical hit for B-0177's audit hypothesis (sibling to B-0141)
- **memory/parallelism-scaling-ladder memo (Aaron 2026-05-01)**: the originating substrate where the ID was reserved alongside B-0141

## Why this is L-effort

- Library / tooling selection requires evaluating multiple options (PostSharp, Fody, Roslyn analyzers, F# type providers, custom source-generators)
- Integration with existing Result-over-exception pattern (per CLAUDE.md) requires non-trivial design — contracts must compose with Result-flow, not break it
- Test coverage for the contract primitives themselves
- Migration of existing prose-documented contracts to mechanized form (substantial; many functions in F# core have pre/post-conditions in comments)
- CI integration (compile-time mode requires custom build steps; runtime mode requires test-suite integration)

## Open design questions (NOT for this row; for the design pass)

1. **Library vs source-generator vs Roslyn-analyzer**: which mechanization layer fits Zeta's F#-primary + C#-secondary surface?
2. **Compile-time vs runtime trade-off**: refinement types catch violations earlier but require type-system extension; runtime checks are less restrictive but slower-feedback
3. **Contract-violation handling within Result-flow**: structured Result-error type (single ContractViolation variant vs per-contract-type variants)? Per-function-config of contract-error severity?
4. **Migration strategy**: bulk-migrate prose contracts vs migrate-on-touch?
5. **Composition with `dotnet build -c Release` `0 Warning(s) 0 Error(s)` gate**: contract violations as warnings or errors?

## Why this matters

Pre/post-condition violations are silent-failure-class bugs. The function technically returned, but the contract was violated; the violation surfaces later as an unrelated downstream bug. Mechanized contracts catch the violation at the source, not at the symptom. Composes with the alignment-frontier framing: substrate-quality at the code-boundary layer is alignment-frontier substrate.

## Carved sentence

**"Code Contracts revival mechanizes pre/post-conditions and invariants at function boundaries: requires() at entry, ensures() at exit, invariant() across lifetime. Compile-time mode (refinement types) rejects violations at build; runtime mode catches at execution and surfaces violations as Result-error values (Result-over-exception per CLAUDE.md; NO throw / panic flow). Replaces review-time enforcement (manual, brittle) with mechanized enforcement (deterministic, durable). Sibling-instance of B-0141 (substrate-cross-reference quality) at the code-boundary layer."**
