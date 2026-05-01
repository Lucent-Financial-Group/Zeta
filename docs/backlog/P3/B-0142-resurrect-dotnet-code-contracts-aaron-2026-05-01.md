---
id: B-0142
priority: P3
status: open
title: Resurrect .NET Code Contracts in Zeta — design-by-contract for F# / dotnet 10 (Aaron 2026-05-01)
created: 2026-05-01
last_updated: 2026-05-01
---

# B-0142 — Resurrect .NET Code Contracts in Zeta

**Priority:** P3 (research-grade exploration; not blocking;
substantial effort; long-horizon)

**Filed:** 2026-05-01

**Filed by:** Otto under the backlog-prioritization authority
delegated 2026-05-01. Aaron's verbatim "me to you:" framing
2026-05-01 (during the SRE / design-by-contract prior-art
discussion that arose from filing B-0141):

> Design-by-contract used to be supported in dotnet first class Code Contracts. it died.

> maybe we could resurect

> they could not fgured out how to make to preformant

> but the primitives are in the dotnet frameowr but noops

**Effort:** L (3+ weeks; new-paradigm work — runtime rewriter
or static verifier or both, on F# + modern dotnet, perf-aware
design)

## What

Revisit the design-by-contract pattern on F# / dotnet 10 by
**resurrecting (or re-implementing modern equivalents of)**
the Microsoft Research Code Contracts library that died ~2017.

The primitives (`Contract.Requires`, `Contract.Ensures`,
`Contract.Invariant`, etc.) **still exist** in the
`System.Diagnostics.Contracts` namespace as no-op API stubs
in modern .NET (Aaron's note: *"the primitives are in the
dotnet frameowr but noops"*). The toolchain that gave them
runtime / static teeth (the rewriter `ccrewrite.exe` + static
verifier `cccheck.exe`) is what was deprecated.

Per WebSearch verification 2026-05-01: *"There is no Code
Contract 'tooling' available in Visual Studio 2013 or in the
latest versions of the .NET Framework. However, the Code
Contract library has been released as an open source
framework available on GitHub. ... You may see the Contract
class in .NET 4.5 and above, but the class does not function
until you manually install the Code Contract library."*
([Microsoft Learn — Microsoft Code Contracts](https://learn.microsoft.com/en-us/archive/technet-wiki/6502.microsoft-code-contracts))

The historical reason for death (per Aaron + general industry
consensus): *"they could not figured out how to make
[it] performant"*. The contract-rewriter inserted runtime
checks with non-trivial perf overhead; the static verifier
had soundness / incompleteness / scaling issues.

## Why P3

- **Long-horizon research-grade.** The pre/post pattern
  (B-0141 + Hoare logic + Eiffel + SRE) is the prior-art
  Beacon-anchor; resurrecting Code Contracts for F# / dotnet 10
  is the operational instantiation. Real engineering project.
- **Speculative payoff.** If the perf-issue can be solved
  (modern compiler tech: Roslyn-source-generators for
  compile-time injection, F# computation expressions for
  declarative contract syntax, JIT-tier compilation with
  `[Conditional("CONTRACTS_FULL")]` for zero-cost in release,
  RyuJIT inlining of contract checks), the resurrection could
  produce something the original Code Contracts couldn't.
- **Composes with Zeta's thesis.** Zeta ships F# spec + .NET
  + retraction-native + DST-everywhere; design-by-contract
  fits naturally as the layer between informal-spec and
  formal-verification (TLA+ / Lean / FsCheck).

## Why not P0/P1/P2

- **Pre-v1 + greenfield**: explicit contract-on-everything
  isn't blocking; existing `Result<_, DbspError>` discipline
  + F# type system already covers most of the pre-condition
  surface.
- **Speculative**: the perf-issue is a real obstacle that
  killed the original. Modern Roslyn / F#-source-generators /
  JIT-tier-compilation may or may not solve it; we'd be
  betting on a partial solution at minimum.
- **Substantial effort**: rewriter + verifier toolchain +
  IDE integration + documentation — multi-week minimum.

## Acceptance criteria

1. **Survey + prior-art audit** (1-3 days): inventory of
   existing modern DbC libraries / approaches in F# / dotnet:
   - Microsoft Research Code Contracts (the deprecated
     original; GitHub repo state)
   - Eiffel + EiffelStudio (canonical reference; Bertrand
     Meyer's original)
   - F# active patterns + computation expressions as
     declarative contract syntax candidates
   - Roslyn analyzers + source generators as compile-time
     injection candidates
   - Spec# (Microsoft Research, also dead; predecessor /
     parallel to Code Contracts)
   - Dafny (active Microsoft Research project; verifier-
     centric; F#-adjacent)
   - LiquidF# (the project's already-evaluated refinement-
     types library; per `feedback_pirate_not_priest_*` the
     Day-0 Hold rejected it because upstream dormant — same
     constraint as Code Contracts)
   - Zen / FsCheck-style property-as-contract approaches

2. **Design proposal** (3-5 days): select the toolchain shape:
   - Source-generator-based compile-time injection (modern;
     zero runtime overhead in release); OR
   - Runtime-rewriter approach (closest to original Code
     Contracts; runtime overhead but more flexible); OR
   - Hybrid (compile-time for invariants; runtime for
     dynamically-checked pre/post)

3. **Perf budget** (the load-bearing constraint): explicit
   target: contracts in release-mode = `<5%` overhead vs
   non-contracted hot path; contracts in debug-mode = full
   verification. The original Code Contracts couldn't hit
   this; resurrection must demonstrate it can or accept
   the same fate.

4. **F# specifically**: target syntax must compose with F#
   computation expressions, async, retraction-native types,
   discriminated-unions. Don't just port C# Code Contracts
   1:1 — design F#-idiomatic.

5. **Verification integration**: contracts feed Soraya's
   formal-verification routing portfolio (TLA+ / Lean / Z3 /
   FsCheck). Static-analyzable contracts compose with the
   verifier portfolio rather than competing with it.

6. **Composes with B-0141**: if anchor-link discipline lands
   first (B-0141), Code Contracts library doc cites
   prior-art via deep-link / anchor-ref rather than `§NN`
   citations.

## Out of scope

- Full re-implementation of static verifier (cccheck) — that
  was the most ambitious part of original Code Contracts and
  the part most likely to fail again. Defer to verifier-
  portfolio (Soraya) instead.
- IDE integration (intellisense for contracts) — separable
  follow-up if the core toolchain works.
- Cross-language contract propagation — F# only at first;
  C#-interop is a follow-up.

## Composes with

- **B-0141** (brittle-pointer + pre/post pattern): the
  pre/post pattern is the abstract architectural class;
  Code Contracts resurrection is the concrete F#/dotnet
  instantiation. SRE / design-by-contract / Hoare-logic
  prior-art (cited in B-0141) applies.
- **Soraya's formal-verification routing portfolio**: TLA+ /
  Lean / Z3 / FsCheck. Static-analyzable contracts feed the
  portfolio's input layer.
- **LiquidF# Day-0 Hold** (referenced in earlier substrate):
  the same upstream-dormant-constraint that rejected
  LiquidF# applies to Microsoft Code Contracts; modern
  resurrection must avoid the dormant-upstream trap.
- **Result-over-exception discipline** (CLAUDE.md §
  Claude-Code-harness): contracts complement Result<_,_> by
  expressing pre-conditions on inputs that Result handles
  on outputs. Same shape, different scope.

## Status

**Filed.** Implementation deferred to a future round. P3
priority means this lands when prior-art-audit + design-
proposal cycles fit in the round's budget; not before.
Aaron's *"maybe we could resurect"* framing makes this
explicitly speculative-research-class, not committed-build-
work.

## Sources

- [Microsoft Code Contracts (Microsoft Learn archive)](https://learn.microsoft.com/en-us/archive/technet-wiki/6502.microsoft-code-contracts)
- [System.Diagnostics.Contracts Namespace (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.contracts?view=net-10.0)
- [Code Contracts — .NET Framework (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/framework/debug-trace-profile/code-contracts)
- [System.Diagnostics.Contracts NuGet 4.3.0 (last updated 2016)](https://www.nuget.org/packages/System.Diagnostics.Contracts/)
- [Is Code Contracts still the recommended way to go nowadays? (dotnet/docs#17640)](https://github.com/dotnet/docs/issues/17640)
- [13a Code Contracts — Joseph Albahari, C# Nutshell extract](https://www.albahari.com/nutshell/CodeContracts.pdf)
