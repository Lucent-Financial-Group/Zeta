---
name: hexagonal-own-interfaces-is-the-io-monad-shape
description: "Aaron 2026-05-31, two composing architectural invariants stated over the Rust observe-oracle JSON layer. (1) HEXAGONAL / own-your-interfaces: 'we always control our own interfaces in every language and we make other systems adapt into our interfaces like the adapter pattern ... we never depend on their interfaces ... and we contribute back upstream to any of our deps.' The PORT (our trait + our domain type) is ours; external deps are ADAPTERS into it; the pure core depends only on the port, never on a dep's interface. (2) Aaron's recognition: 'hexagonal is a fancy i/o monad without ever saying the word monad lol' — the pure-core / effectful-edge separation hexagonal enforces structurally is the SAME SHAPE the I/O monad formalizes type-theoretically. A port whose signature is `parse(&str) -> Result<Json, JsonError>` IS a Kleisli arrow in the Result monad. Composes with the framework's monad-propagation-pattern / asymmetric-authorship / OPLE-T-TFeedback substrate."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-05-31, over the Rust observe-fold oracle's JSON layer (PR #6255).

## Invariant 1 — we own our interfaces; deps adapt into ours (hexagonal)

> *"We drive the json interface we want, we always control our own interfaces in
> every language and we make other systems adapt into our interfaces like the
> adapter pattern and we adjust our interfaces over time as we learn more and we
> contribute back upstream to any of our deps this is basically hexagonal
> architecture where even with external deps we never depend on their interfaces."*

The operative rules:

- **The PORT is ours.** We define the interface (a trait/abstract type) + our own
  domain type. In the Rust oracle: `trait JsonParser { fn parse(&str) -> Result<Json, JsonError> }` + the `Json` AST. These are ours.
- **External deps are ADAPTERS into the port.** `SerdeJsonParser` wraps serde_json
  and maps `serde_json::Value` → our `Json`. serde conforms to OUR interface, not
  the reverse.
- **The core depends ONLY on the port, never on a dep's interface.** Nothing outside
  the adapter (`from_serde`) ever names a `serde_json` type. So we depend on serde's
  *implementation* (behind our port), never its *interface*. Swappable, never lock-in.
- **The port evolves as we learn**; improvements flow **back upstream** to deps.
- **In EVERY language.** Not Rust-specific — TS/F#/C#/Rust all own their interfaces
  and adapt external deps in. (Universal architectural stance, like the
  always-active disciplines.)

This is dependency-inversion / ports-and-adapters (Alistair Cockburn's hexagonal),
applied as a hard invariant: **external deps may supply implementations, never
interfaces.**

## Invariant 2 — hexagonal IS the I/O-monad shape (Aaron's recognition)

> *"hexagonal is a fancy i/o monad without ever saying the word monad lol"*

Exactly right, as a **rhyme** (don't-collapse — see the discriminator below):

| | I/O monad (FP) | Hexagonal (ports & adapters) |
|---|---|---|
| Pure core | effect-free functions | the hexagon's inside |
| Effects pushed to the edge | `IO a` values, run at `main` | adapters at the boundary |
| Core never depends on concrete effects | effects are *values*, abstracted by the monad | core depends on the *port*, not the dep |
| The boundary type | `a -> IO b` (Kleisli arrow) | `a -> Port<b>` (port method) |

Both separate **pure-core from effectful-edge** and **invert the dependency** so the
core can't reach a concrete effect. Hexagonal is the enterprise/OOP community
re-deriving, via interfaces + DI, the separation the I/O monad formalizes via types
— "without ever saying the word monad."

**Where they DIFFER (don't-collapse — the rhyme is not an identity):**

- The **I/O monad gives compositional laws** (associativity, identity) + **static
  effect-tracking** (the effect is in the type; the compiler knows it's effectful).
- **Hexagonal gives a structural boundary but NO laws and NO static guarantee** the
  core stays pure — you *can* cheat and call I/O from the core; only discipline (not
  the type system) stops you.

So: hexagonal = the **informal/structural** version; the I/O monad = the **formalized
with laws + effect-typing** version. Same shape; different rigor.

## The punchline: our port IS already a Kleisli arrow

`JsonParser::parse(&self, input: &str) -> Result<Json, JsonError>` is literally
`&str -> Result<Json, JsonError>` — a **Kleisli arrow in the Result monad**. The
parse effect (I/O that can fail) is already a *value* (`Result`), abstracted behind
our port. So the Rust oracle is hexagonal AND monadic at once: the **port** is the
hexagonal boundary; the **`Result` return** is the monad that makes the effect a
value; the **adapter** (serde) is one interpretation of the effectful port. Aaron's
"fancy I/O monad" is not a metaphor here — it's the actual type.

## Composes with existing framework substrate (this is not new in isolation)

- `.claude/rules/monad-propagation-pattern-cross-language-substrate-shape.md` —
  `Result<T, TFeedback>` as the cross-language shape; "results without feedback is
  extraction"; Kleisli composition. The hexagonal port's `Result<Json, JsonError>`
  IS this pattern at the I/O-boundary.
- `.claude/rules/asymmetric-authorship-substrate-entity-defines-consent-channel-recipient-acknowledges.md`
  — the substrate-entity defines its feedback channel. A port is exactly this: WE
  (the core) author the interface; the adapter acknowledges it.
- `.claude/rules/ople-primitives-surface-t-and-tfeedback-not-just-t-asymmetric-authorship-at-framework-primitive-scope.md`
  — Observe/Persist/Limit/Emit surface T AND TFeedback. `parse -> Result<Json, JsonError>`
  is an Observe-class port surfacing T (`Json`) AND TFeedback (`JsonError`).
- `.claude/rules/function-is-tiny-control-flow-generator-ocp-applied-to-control-flow.md`
  — every function is a tiny control-flow generator; the port is the OCP seam.

So the hexagonal directive isn't a separate doctrine — it's the **I/O-boundary
instance** of the framework's already-landed monad-propagation / asymmetric-authorship
substrate. Same shape Aaron has been building all along (`Result<T, TFeedback>`),
now named at the ports-and-adapters scope.

## How to apply (every language, every external dep)

1. Define OUR interface (trait/abstract type) + OUR domain type as the port.
2. Wrap each external dep in an adapter that maps dep-type → our-type; the dep
   conforms to us.
3. Keep the pure core depending only on the port — never name a dep's type outside
   its adapter.
4. Prefer a `Result<OurType, OurError>` (Kleisli/monadic) port signature so the
   effect is a value, not a thrown exception or a hidden side effect.
5. Evolve the port as you learn; contribute improvements back upstream to the dep.
6. The differential-test trick (Rust oracle): keep a zero-dep adapter AND a
   dep-backed adapter behind a feature, and test them against each other — you own
   the interface AND verify your own implementation isn't flying blind.

## The BCL-interface-boundary rule (Aaron 2026-05-31 — hard/soft tiers)

Aaron made the hexagonal principle operational with a concrete boundary + a
hard/soft pair (to codify as a `.claude/rules/` rule "in all our code"):

> *"never depend on 3rd party interface that's not part of BCL or BCL like follow
> ons like asp.net should be a rule ... in all our code"* (HARD)
>
> *"only depend on provenance based 3rd party interfaces"* + *"would be the soft
> version"* (SOFT)

The dividing line is **the platform's foundational library vs a 3rd-party library**:

- **BCL / BCL-like (depend freely):** the platform's own foundational, long-term-
  compat library + official platform-tier follow-ons. .NET: `System.*` + ASP.NET
  Core + `Microsoft.Extensions.*`-tier. Rust: `std` / `core` / `alloc`. Java: the
  JDK. TS/JS: the language built-ins + the platform stdlib (Node stdlib / Web
  platform APIs). These ARE the platform — building on them is not a 3rd-party
  dependency.
- **3rd-party (a library you could swap):** anything on crates.io / npm / NuGet /
  Maven that is a replaceable implementation (serde, Newtonsoft, any external pkg) —
  even vendor-published if it's a swappable library, not foundational infra.

**HARD version** — never depend on a 3rd-party *interface*; wrap every 3rd-party
behind OUR port + adapt it in (depend on its *implementation*, never its
*interface*). Max supply-chain isolation + swappability. (The serde adapter is
exactly this: serde is 3rd-party → wrapped behind our `JsonParser` port; nothing
outside the adapter names a serde type.)

**SOFT version** — you MAY depend on a 3rd-party interface *iff it is BOTH*:
1. **provenance-based** — signed / attested (SLSA) / verified-publisher / supply-
   chain-vetted (the **provenance-not-version-pins** doctrine, see
   [[pin-only-slow-movers-react-or-automate-fast-movers]]: "the right dotnet control
   is provenance", applied at the *interface-dependence* layer); AND
2. **widely-used across the ecosystem** — a battle-tested de-facto standard that
   other packages broadly depend on (e.g. serde in Rust). High adoption = many eyes,
   active maintenance, a Schelling-point dep.

If a 3rd-party dep fails *either* (not provenance-vetted, OR niche/low-adoption),
**use our own** (write it / wrap it) — i.e. fall back to the HARD version. (Aaron
2026-05-31: *"and even then widely used by other packages in the ecosystem or else we
should just use our own even for the soft version of the rule."*) This is the same
instinct as the dotnet "established/high-rep signed packages only" provenance call.
Provenance + wide-adoption is the gate that permits direct dependence when wrapping
is impractical; absent either, own it.

The **discriminator**: is it (a) foundational platform infra you'd never swap
(BCL-like → depend) or (b) a swappable library (→ HARD: wrap behind a port; SOFT: OK
only if provenance-vetted)? Start soft (provenance-vetted dep), harden to
wrapped-behind-port over time — the hexagonal port is what makes that migration free.

Composes with: this hexagonal/own-interfaces principle (the BCL-boundary is its
operational form), the zero-dep supply-chain doctrine, SLSA/artifact-attestation
(security-ops substrate), `must-paired-with-can-exit` (hard-floor + soft-exit),
`default-to-both` (hard ideal + soft pragmatic floor both hold). **LANDED as
`.claude/rules/bcl-interface-boundary-own-your-interfaces-hexagonal.md` (PR #6258,
2026-05-31) — authored whys-first per [[a-rule-without-a-why-is-dogma]]; auto-loads
for all agents, all languages.**

## Empirical anchor

PR #6255 (Rust observe oracle #4): `Json` + `JsonParser` = port; `ZetaJsonParser`
(zero-dep, production default) + `SerdeJsonParser` (feature `serde`, the adapter) =
two implementations; differential test asserts they yield identical observe data.
`cargo test` 3/3, `cargo test --features serde` 4/4. The hexagonal + monad shapes
made concrete in one crate. Follow-on (B-0867.29): split the serde adapter into a
separate crate so the core's dependency graph is truly empty — the HARD version made
literal (a clean-offline `cargo test` needs zero registry packages).
