# Monad-propagation pattern — cross-language substrate shape; enables spec-to-code generation + composability where usually missing (Aaron 2026-05-27)

Carved sentence:

> The monad-propagation pattern (existing-primitive elevated to
> discriminator-carrier + lazy-propagation via composition primitive
> + consumer must handle exhaustively or propagate) gives the
> framework cross-language code-shape similarity. Build new substrate
> around this pattern: spec-to-code generation becomes easier when
> patterns are uniform; cross-language substrate becomes more similar
> at code-shape level; composability emerges where it's usually
> missing (e.g., recursive CTE composability).

## Operational content

Per operator 2026-05-27, after the substrate-engineering thread
producing PRs #5505 (force-push-policy with Result<T, TFeedback>
discipline) + #5507 (Layer 4 sum-type exhaustive-match):

> *"we should save that modan propatation pattern we can generate code
> from specs easlier in the future if we build around these patterns
> our code becomes more similar shapped across languages. and we have
> some amount of composiblity in what's ususaly not composable like
> recursive CTE composiblity."*

The pattern operationalizes the operator's broader inversion-of-monad
discipline (per same-day conversation thread + Itron smart-meter
substrate referenced in `memory/persona/ani/conversations/2026-05-23-aaron-ani-grok-cult-followers-die-sovereign-ai-elizabeth-ryan-naming-honor-partial-extraction.md`).

## The pattern

Three-component substrate-engineering primitive:

1. **Discriminator-carrier** — existing language/substrate primitive
   that can hold a sum-type-equivalent discriminator (NULL in SQL;
   sum-type variant in F#/Rust/TypeScript; tagged union in C++;
   sentinel value in C; enum-with-value in Go)
2. **Lazy-propagation via composition primitive** — the substrate's
   existing composition mechanism that lets the discriminator flow
   through composition without forcing collapse at each layer
   (recursive CTE UNION ALL in SQL; Result.bind / computation
   expressions in F#; ? operator in Rust; Promise.then in JS;
   monadic do-notation in Haskell)
3. **Consumer must handle exhaustively or propagate** — the discipline
   that the receiving site either pattern-matches every discriminator
   value OR explicitly propagates the unhandled variant up the call
   chain (F# match warning on non-exhaustive; SQL CHECK constraint
   OR lint discipline; Rust match exhaustiveness; explicit early-
   return in imperative languages)

When all three compose, the substrate gets monadic-propagation
semantics without needing monad-as-language-feature.

## Cross-language instantiations

| Language | Discriminator-carrier | Lazy-propagation | Exhaustive-handling |
|---|---|---|---|
| F# | Discriminated union | `Result.bind` / `computation expression` | `match` (compiler warns on non-exhaustive) |
| Rust | `enum` with variants | `?` operator | `match` (compiler errors on non-exhaustive) |
| TypeScript | Discriminated union via `kind` tag | `Result.map` / `.then` chains | `switch` with exhaustive-check via `never` |
| T-SQL | `NULL` + variant-name column | Recursive CTE UNION ALL | `CASE WHEN` exhaustion + lint/CHECK-constraint |
| Postgres | `NULL` + ENUM type | Recursive CTE UNION ALL | `CASE WHEN` over ENUM domain (more enforceable than T-SQL) |
| C# | Discriminated union via sealed-record-hierarchy | LINQ chains / `?.` propagation | Pattern-match on type (limited exhaustiveness) |
| Java | Sealed interface + records (Java 17+) | Stream chains / Optional | switch with sealed-type exhaustive |
| C++ | `std::variant` | Composition via `std::visit` | `std::visit` lambda over variants (compile-time check via `if constexpr`) |
| Go | enum-with-error pattern | Early-return on err | Explicit if-err checks |
| Python | `enum` + Result wrapper | Generator chains / `match` (Python 3.10+) | `match` statement (no exhaustiveness check) |

## Why this earns its keep — three operational benefits

### Benefit 1: Spec-to-code generation becomes easier

When the substrate-engineering spec describes a function as:

```
fn process(input: T) -> T' with feedback variants {
    NotFound, PermissionDenied, DiskFull
}
```

The spec-to-code generator can emit the SAME SHAPE in any target
language by mapping the discriminator-carrier + lazy-propagation +
exhaustive-handling triple to that language's instantiation:

- F# emit: `type ProcessFeedback = NotFound | PermissionDenied | DiskFull` plus `let process input : Result<T', ProcessFeedback> = ...`
- T-SQL emit: recursive CTE with `feedback_type` column + variant
  values + CHECK constraint
- Rust emit: `enum ProcessFeedback { NotFound, PermissionDenied,
  DiskFull }` + `fn process(input: T) -> Result<T', ProcessFeedback>`

The spec is language-independent; the generator handles the
language-specific instantiation; the shape stays the same across
generated code.

### Benefit 2: Cross-language substrate becomes more similar at code-shape level

Framework substrate spans F# (core types) + TypeScript (factory tools)
+ T-SQL (data substrate) + C++ (perf-critical paths) + Python
(scripts). Without a uniform pattern, each language has its own
error-handling idiom + the substrate-engineer needs to switch mental
models when crossing language boundaries.

With the monad-propagation pattern applied uniformly:

- Substrate-engineer reads SQL recursive CTE with feedback_type +
  recognizes the same shape as F# Result<T, TFeedback>
- Code review across language boundaries becomes easier (same
  pattern to verify)
- Migration of logic between languages preserves the substrate
  shape (F# implementation can be ported to TypeScript without
  re-deriving the error-handling discipline)

### Benefit 3: Composability emerges where usually missing

Recursive CTEs are notoriously hard to compose — you can't easily
chain multiple recursive CTEs through standard SQL composition
operators. But with the monad-propagation pattern + feedback_type
discriminator:

```sql
WITH cte_a AS (... feedback_type ...),
     cte_b AS (
        SELECT ... 
               cte_a.feedback_type AS cte_b_feedback_type  -- propagate
        FROM cte_a JOIN ... 
        WHERE cte_a.feedback_type IS NULL                  -- only Ok-path
     ),
     cte_c AS (
        SELECT ... 
               COALESCE(cte_b.cte_b_feedback_type, ...) AS final_feedback
        FROM cte_b ...
     )
SELECT * FROM cte_c
```

The feedback_type column flows through CTE chains the same way Result
flows through F# bind chains. Composability emerges through the
shared discriminator-carrier convention even though SQL's composition
primitives aren't natively monadic.

## Composes with substrate

- **Force-push-with-lease authorization policy** (`.claude/rules/force-push-with-lease-authorization-policy.md`, PR #5505 + #5507) — Layer 4 (TFeedback-as-sum-type-with-exhaustive-match-enforcement) IS the F# canonical instance of this pattern
- **F# Result-over-exception convention** (per CLAUDE.md `Result<_, DbspError>` convention) — F# substrate-side already uses this pattern; the rule lifts it to cross-language scope
- **Inversion-of-monad pattern** (conversational substrate 2026-05-27) — broader principle of using existing-primitive to emulate monad-discipline; this rule names the SPECIFIC THREE-COMPONENT INSTANTIATION
- **Itron smart-meter recursive-CTE substrate** (`memory/persona/ani/conversations/2026-05-23-aaron-ani-grok-cult-followers-die-sovereign-ai-elizabeth-ryan-naming-honor-partial-extraction.md`) — NULL-as-quantum-state pattern is the empirical proof-point that the discriminator-carrier + lazy-propagation discipline works at billions-of-meters scale in production SQL
- **B-0428 (F# fork for AI safety)** — language-extension substrate that could mechanize the spec-to-code generator
- **B-0860 (Nemerle dotnet support)** — language-extension substrate that would enable native syntax-extension for the pattern at compile time
- **B-0829 (cluster-fork-as-trust-boundary)** — relationship-type-inference substrate composes; trust-boundary-types ARE one application of the pattern

## Composes with rules

- `.claude/rules/grep-substrate-anchors-before-razor-as-metaphysical.md` — substrate-verification discipline applied to substrate-engineering patterns before razor-flagging
- `.claude/rules/verify-existing-substrate-before-authoring.md` — search before mint; substrate-engineering target identified through grep
- `.claude/rules/razor-discipline.md` — operational claims only; the three-component-pattern is operationally checkable + cross-language verifiable
- `.claude/rules/bandwidth-served-falsifier.md` — pattern earns its keep via three operational benefits (spec-to-code + cross-language similarity + composability-where-missing); bandwidth-served = substrate-engineering work bandwidth saved by uniform pattern
- `.claude/rules/default-to-both.md` — pattern composes with existing language-specific idioms rather than replacing them; both-default holds (use the language's native error-handling AND apply the monad-propagation shape)
- `.claude/rules/edge-defining-work-not-speculation.md` — naming the cross-language pattern IS edge-defining substrate-engineering work
- `.claude/rules/wake-time-substrate.md` — why this rule auto-loads
- `.claude/rules/honor-those-that-came-before.md` — the pattern was operating in operator's Itron work + Java checked-exceptions discipline + Haskell monad-do-notation; this rule honors prior substrate-engineering precedents

## Operational discipline for substrate-engineering work

When authoring new framework substrate that involves potentially-
drifting state OR cross-language consistency:

1. **Identify the discriminator-carrier** the target substrate
   supports (sum-type variants / NULL / sentinel / enum)
2. **Identify the lazy-propagation primitive** (Result.bind /
   recursive CTE UNION ALL / ? operator / Promise.then)
3. **Identify the exhaustive-handling enforcement** mechanism
   (compiler-warning / lint-discipline / CHECK-constraint /
   sealed-type / explicit-early-return convention)
4. **Apply the three-component pattern** with the target's
   instantiation
5. **If working across multiple languages**, apply the same pattern
   in each; substrate-engineer reading code in any language
   recognizes the same shape
6. **If generating code from specs**, structure the spec around
   the three-component pattern; the generator emits language-
   specific instantiations from one cross-language spec

When reviewing existing framework substrate:

1. Check whether error-handling/feedback uses the monad-propagation
   pattern OR an ad-hoc-per-language idiom
2. If ad-hoc, evaluate whether converting to monad-propagation
   would earn its keep (spec-to-code surface? cross-language code
   review burden? composability gap?)
3. Don't force-convert all existing substrate; apply opportunistically
   when new substrate is authored OR when ad-hoc substrate is being
   substantively refactored

## Why this rule auto-loads

Per `.claude/rules/wake-time-substrate.md`: load-bearing substrate-
engineering patterns need wake-time landing. Without this rule auto-
loaded:

- Future-Otto authoring new substrate-engineering substrate in any
  language defaults to language-specific idiom; doesn't apply the
  cross-language pattern
- Spec-to-code generation work has no canonical pattern to target;
  each generator re-derives the shape
- Cross-language composability gaps stay ad-hoc; the recursive-CTE-
  composability win (and similar) doesn't get applied uniformly

With the rule auto-loaded: future-Otto recognizes the pattern at write-
time + applies the three-component instantiation in whichever target
language is in scope + benefits from the spec-to-code / cross-language /
composability properties.

## Substrate-honest framing

This rule does NOT:

- Mandate the pattern in every piece of framework code (use
  opportunistically; ad-hoc per-language idioms remain valid for
  language-internal substrate)
- Replace the language's native error-handling features (the pattern
  composes with native features; it's an additional shape, not a
  substitute)
- Solve all cross-language composability problems (the pattern
  addresses error-propagation-shape; doesn't address type-system-
  interop, serialization, calling conventions, etc.)
- Make spec-to-code generation trivial (the pattern is a structural
  prerequisite; the generator still needs to handle language-specific
  binding, idiom-matching, naming conventions)

This rule DOES:

- Name the THREE-COMPONENT pattern operator identified as load-bearing
- Provide the cross-language instantiation table for canonical
  reference
- Establish the operational discipline for applying the pattern in
  new substrate
- Compose the pattern with existing framework substrate (PR #5505 +
  #5507 + Itron substrate + F# Result-over-exception convention)
- Enable future spec-to-code generation work to target a uniform
  shape

## Full reasoning

Operator 2026-05-27 thread:

- Prior: PR #5507 landed Layer 4 (TFeedback-as-sum-type with
  exhaustive-match enforcement)
- Operator: "this is the same inversion of monad pattern as using
  null in recursive cte as the maybe extension point" — named the
  generalization
- Otto-CLI: mapped the inversion-of-monad pattern across SQL/NULL
  and F#/sum-type with empirical anchor in Itron substrate
- Operator: "i'm pretty sure you can use the feekback control flow
  monad like thing in recursive ctes too" — extended to feedback-
  variant scope at SQL
- Otto-CLI: sketched recursive-CTE-with-feedback_type-column code
- Operator: "we should save that modan propatation pattern we can
  generate code from specs easlier in the future if we build around
  these patterns our code becomes more similar shapped across
  languages. and we have some amount of composiblity in what's
  ususaly not composable like recursive CTE composiblity." —
  substrate-landing directive

This rule operationalizes the substrate-landing directive with the
three-component pattern + cross-language instantiation table + three
operational benefits + composition with existing framework substrate.

Future-Otto cold-booting from this rule inherits the cross-language
substrate-engineering pattern at session start; substrate-engineering
work across F# + T-SQL + TypeScript + Rust + other languages applies
the pattern by default instead of re-deriving per-language.
