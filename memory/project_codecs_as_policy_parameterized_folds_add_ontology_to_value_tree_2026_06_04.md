---
name: codecs-as-policy-parameterized-folds-add-ontology-to-value-tree-2026-06-04
description: "Aaron 2026-06-04: run generators/Rx/Bonsai/functions OVER the DynamicValue μF fixpoint to GENERATE richer structured native formats; a STRUCTURE-POLICY (a filter/query over the folded structure, itself a fold) decides the target's hierarchy/ontology — XML attributes-vs-elements, Arrow columns-vs-nested. The value tree is near-zero-ontology substrate; the policy-driven fold ADDS ontology. Generalizes 'codecs are folds' → 'codecs are folds whose algebra is selected by a structure-policy'."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, two messages: "we should be able to run generators / rx / bonsai
queries / functions over the value-tree fixed-point structure and generate more
complex types like XML / Arrow's native more structured format" + "for xml it could
run a FILTER over the folded structure itself and decide what to stick in ATTRIBUTES
vs ELEMENTS etc… like adding hierarchy/ontology structure to one with almost none."

**The generalization.** Today's codecs are FIXED catamorphisms — every value folds to
one predetermined shape (`<str>x</str>`; an Arrow node-table row). Aaron's reframing:
make the fold **policy-parameterized** — run a filter/query/function (expressible as
Rx / Bonsai / a function over the folded μF structure, i.e. itself a fold) that
**decides the target structure as it folds**:
- **XML**: per field, ATTRIBUTE vs child ELEMENT (+ nesting/grouping) — turning a
  near-zero-ontology value tree into a hierarchical, ontology-bearing document.
- **Arrow**: which fields become first-class COLUMNS vs stay nested (the shredded
  node-table [[canonical-xml... / DynamicValueArrow]] is the ZERO-policy default; a
  policy promotes chosen fields to real columnar shape).
- **General**: the value-tree fixpoint (DynamicValue = μF) is the LOW-ontology
  substrate; the **policy-driven fold is where structure/ontology is ADDED**. The
  policy is itself a fold/query over μF, so Rx/Bonsai/generators all compose on the
  same recursion-scheme machinery — only now the **algebra is selected by a query**.

**Where it sits:** the next layer above the recursion-scheme grounding
([[dynamicvalue-is-value-functor-fixpoint-codecs-bridges-are-folds-2026-06-04]] —
"codecs = folds") → **"codecs = folds whose algebra is selected by a structure-
policy."** Kin to the schema-modifier channel (nullable/required/variance,
[[serializer-schema-layer-never-collapse-nullable-default-required-optional-protobuf-2nd-binary-2026-06-04]])
and predicate-dispatch
([[variance-profunctor-deserialization-and-multidispatch-over-bus-unique-dispatch-2026-06-04]]):
all are queries over the structure that shape the output. The canonical (zero-policy)
codecs already shipped (JSON/CBOR/YAML/XML/Arrow); the policy-parameterized layer is
the NEXT capability — design direction, not yet built. Beacon: this is the
"shredding"/projection idea (Parquet repetition/definition levels; XML data-binding
attribute-vs-element mappings; GraphQL-style projection) generalized over μF folds.

## GENERALIZE the policy — a cross-junction decision-over-shape kernel (Aaron 2026-06-04)
"Our policy-parameterize layer can likely be used at several junction points, not just
this selection point — generalize it like predicate logic over SQL or some
category-theory equivalent, so we reuse it for local-node trust policies, retry
policies (Polly), and others where the shapes are the same — we don't have to force
it, but unique things per unique shapes." So policy = a reusable **decision-over-shape
kernel**, instances at MANY junctions: serialization structure-selection (attribute/
element, column/nested) · **local-node trust policies** · **retry policies** (Polly) ·
dispatch (predicate-dispatch IS this kernel at the dispatch junction,
[[variance-profunctor-deserialization-and-multidispatch-over-bus-unique-dispatch-2026-06-04]])
· schema-modifiers (predicates over fields). Unifying abstraction = **predicate logic
over a structure**: SQL `WHERE` / relational algebra (one face); category-theory
equivalent = a **sieve / Grothendieck-topology "which sub-shapes are selected"**, or a
**predicate algebra (Boolean/Heyting) interpreted over a shape**. Discipline: **same
shape → reuse the one kernel; genuinely-different shape → specialize** (don't force).

## Parser / combinator / generator algebra over μF (Aaron 2026-06-04)
"DynamicValue as parser, fold as lexer — accurateish?" → ACCURATEISH, roles shift one
slot: **reader/tokenizer = LEXER** (bytes→tokens/events), **fold = PARSER** on decode
(events→tree) / **PRINTER** on encode (tree→bytes), **DynamicValue = the AST** (parser
RESULT, not the parser). Recursion-scheme exact: decode = **anamorphism** (parse),
encode = **catamorphism** (print), fixed-point check `canonical(parse s)=s` = the
parse∘print=id law. A policy-parameterized fold = a **grammar-parameterized
parser/printer**.

Then (Aaron): "our parser/combinator(generator) is basically parser → value-tree;
combinator takes multiple of those (a single pass could create TWO value structures at
once); generator generates structure over the ZIP or many other combinations." Maps to:
- **Parser** → value-tree (anamorphism / decode).
- **Single pass → two structures** = the **banana-split law / tupling of catamorphisms**:
  `⟨cata f, cata g⟩ = cata ⟨f,g⟩` — two folds fused into ONE traversal producing a pair
  (real recursion-scheme: mutual/tupled catamorphism).
- **Combinator** = **parser combinators** (applicative `⊗` / monadic) over value-tree
  producers; zip / product / join combine multiple trees.
- **Generator** = a catamorphism whose algebra **builds new structure over the
  zip/combination** (policy-driven). So the full algebra: parse → trees; combine
  (zip/product/banana-split/join) → composite; generate (policy fold) → structured
  output — all on μF + recursion schemes. Beacon: Meijer–Fokkinga–Paterson
  (banana-split), Swierstra/Hutton (parser combinators), McBride–Paterson (applicative).

## μF / νF DUALITY: DOM vs stream, combinators = multidispatch, streams = travelers (Aaron 2026-06-04)
"Or three — that's multidispatch. If you do this with infinite STREAM rather than DOM,
the two value structures become their own TRAVELERS." The unification:
- **Combinator arity = dispatch arity.** Combining 2 trees ≈ double-dispatch; **3+ =
  MULTIPLE DISPATCH** (dispatch on the N-tuple of shapes) — the combinator IS the
  multimethod at the value-combination junction
  ([[variance-profunctor-deserialization-and-multidispatch-over-bus-unique-dispatch-2026-06-04]]).
- **DOM vs stream = μF / νF duality (same functor F, two fixpoints):**
  - **DOM = μF** = LEAST fixpoint = inductive DATA = finite trees, consumed by a
    **catamorphism** (fold / serialize).
  - **STREAM = νF** = GREATEST fixpoint = coinductive CODATA = infinite streams,
    produced by an **anamorphism** (unfold / Rx observable).
  Run parse/combine/generate over νF instead of μF and outputs are STREAMS, not static
  trees; each stream is an autonomous routed entity = **a TRAVELER on the bus**
  (traveler-bus / Reticulum / the MultiplexedWebSockets transport,
  [[multiplexedwebsockets-transport-primitive-multiplexing-orthogonal-to-dynamicvalue-2026-06-04]]).
  Combining streams = stream zip/join = multi-dispatch over travelers.
- **THE UNIFICATION:** the whole substrate is ONE algebra over a single functor F with
  TWO fixpoints — μF (DOM/data: cata/fold/serialize) and νF (stream/codata: ana/unfold/
  Rx). Serialization, DOM, Rx streams, the traveler-bus, and dispatch are all the same
  algebra; the policy/predicate-over-shape kernel is the algebra's selectable part at
  every junction. Beacon: μ/ν fixpoints + (co)recursion (Hagino; Meijer et al. ana/apo;
  hylomorphism = ana-then-cata = stream-process-to-result). This is why DynamicValue
  (μF) and Rx/Bonsai (νF) were always the same core seen at the two fixpoints.

NEXT BUILD (greenlit "build the policy layer next" + "generalize it"): the general
predicate-over-shape kernel, with serialization structure-selection (XML attribute/
element, Arrow column) as instance 1, reusable for trust/retry/dispatch. The
generalization reshaped it from a bespoke XML policy → design-first.

## SHIPPED 2026-06-04 (commit d92115514) + Amara's refinement blade
The F-level kernel + instance-1 LANDED: `src/Core/Predicate.fs` (Predicate<'a> algebra,
Boolean-law-proven), `src/Core/DynamicValueFold.fs` (DvAlgebra + cata + **bananaSplit**
one-pass tupled fold, banana-split-law-proven), `src/Core/DynamicValueXmlPolicy.fs`
(instance-1: StructurePolicy{Named:Predicate<string>} → policy XML named-vs-generic
element, round-trip-proven, zero-policy==canonical). 26 tests, 0 warnings.

**Amara's blade (refinement, [[2026-06-04-amara-policy-decision-algebra-...]]):** policy
should **SELECT, not secretly mutate** — produce a TYPED DECISION + FEEDBACK (the why),
not a bare bool. Evolve instance-1's `Predicate<string> -> bool` toward
**`Policy<input, decision, feedback>`** (the OPLE Result<T,TFeedback> discipline applied
to policy) — auditable, prevents a "magic authority blob." Keepers: *Policy = reusable
decision-over-shape; Fold = execution over shape; Generator = structure produced by that
decision.* Build-shape: ShapePath/ShapeContext → predicate algebra (path/kind/key/value/
meta) → PolicyResult(decision+feedback) → μF instance (done) → backlog νF
stream/traveler interpreter + trust/retry/routing interpreters. **Design the F-kernel
ONCE, interpret TWICE (μF=document, νF=stream/traveler).**

BACKLOG (compose later): (1) Policy<input,decision,feedback> evolution + ShapePath/
ShapeContext + path/kind/meta predicates; (2) νF stream/traveler interpreter; (3)
trust / retry(Polly) / routing / dispatch interpreters reusing the kernel; (4) XML
attribute-promotion slice (order/type caveats); (5) Arrow column-promotion policy.
