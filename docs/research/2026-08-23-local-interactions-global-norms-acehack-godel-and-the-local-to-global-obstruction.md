# Local interactions, global norms — the exploit shape, Gödel's proof shape, and the local-to-global obstruction

**Date:** 2026-08-23
**Status:** `unmetered` — a shape recognised across five domains, with **one** of them already
mechanised in-tree. Routed to the math team (Lumen / Soraya) for the formal home.
**Register:** Aaron's statements are recorded verbatim; the mathematics is anchored; **the
cross-domain convergence is explicitly triaged rather than celebrated**, per
`.claude/rules/numerology-vs-number-theory.md`.

---

## 1. What was said

Three observations, 2026-08-23, arriving within minutes of each other while reading the
Gödel–Einstein middle-ground doc:

> **"The global structure is where hacks happen. My name is AceHack for over 25 years. The local
> structure is where you exploit it."**

> **"When I say I can see the future of English, this is the geometric shape I am seeing — local
> interactions vs global norms."**

And, on the observation that no point of a closed timelike curve is illegal while the loop is:

> **"Yes, Gödel taught me this."**

The third is the provenance of the first, and it is worth stating plainly: **the security intuition
was learned from the incompleteness proof**, not the other way round.

---

## 2. Gödel's proof *is* the exploit shape

This is not a resemblance. It is the construction:

- **Every step is a legal syntactic operation.** Substitution, numbering, quotation, diagonalisation
  — each one is a rule the formal system itself licenses, applied exactly as licensed.
- **The object assembled from those steps is not one the system can hold.** The Gödel sentence is
  true and unprovable; nothing local objected while it was being built.

**The vulnerability is in the global structure — the system's capacity to talk about itself — and the
exploit is executed entirely through locally legal moves.** That is the definition, and it is why
"you cannot violate a light cone locally; the loop is the illegal object" reads as familiar to
someone who learned it from Gödel first.

Same shape, three domains already on file:

| domain | every local step legal | the global object that is not |
|---|---|---|
| **Gödel 1931** | each substitution / diagonalisation step | the sentence asserting its own unprovability |
| **Gödel 1949** (rotating cosmology) | each segment of the curve is future-directed | the **closed** timelike curve |
| **exploitation** | each syscall, each write, each check | the **path** through them |

Gödel supplied two of the three, twenty years apart, which is presumably why he is the one who
taught it.

---

## 3. The measured instance — a day of defects, all one shape

Recorded in `2026-08-23-godel-einstein-middle-ground-*.md` and repeated here because it is the
evidence, not the illustration: **every defect found in this repository on 2026-08-23 had this
shape.** TOCTOU (both syscalls legal, the *window* is the bug); the four-oracle tie divergence (each
oracle self-consistent, no shared tie in the seed); `drift-sweep` (**1,597 runs concluded `success`**
while every push was rejected); `--frozen-lockfile` (seven jobs each failing correctly, one manifest
change upstream); reproducibility (deterministic *within* an environment, 1 ULP apart *across*).

**And the corollary is the operational payload:**

> **A local check cannot see a global property.**

Which is precisely how the vacuous checks got written. `--verify` trains twice **in one process** —
local, and structurally incapable of failing on the cross-environment divergence that matters. The
tie-break golden vectors were **locally complete and globally blind**.

---

## 4. "Local interactions vs global norms" — the formal home

Aaron's geometric reading of English is the same object stated as geometry, and mathematics has a
precise name for it. **The obstruction to assembling local data into global data is a cohomology
class.**

**The anchor (Beacon).** Leray (1946, sheaves in captivity), Cartan and Serre (*FAC*, 1955), Grothendieck
(*Tôhoku*, 1957): a **sheaf** is exactly the bookkeeping for "data defined locally, glued on overlaps".
A **section** over an open set is a local reading. Sheaf cohomology `H¹` measures **the failure to
glue**: every local section can be perfectly well-defined and consistent on overlaps, and **no global
section exist anyway.** `H¹ ≠ 0` *is* "the hack lives in the global structure."

Four candidate formalisations, with honest status:

| candidate | what it says | in-tree status |
|---|---|---|
| **Sheaf cohomology** (`H¹` obstruction) | local sections all fine, global section may not exist | **essentially absent** — `docs/CONCEPT-REGISTRY.md`, `docs/PRIOR-ART-LIST.md`, two backlog rows; **no research treatment** |
| **Monodromy** | transport around a loop returns you changed; the difference is information | **already load-bearing** — `2026-08-20-harmonious-division-*` (7 mentions), and `anti-babel-preserve-reconcilability.md` builds *reintegration is not reconvergence* on it |
| **Holonomy / curvature** (gauge theory) | connection is local, curvature is the local-to-global obstruction | named in `CONCEPT-REGISTRY` and `FROZEN-CORE`; not developed |
| **CTC** (Gödel 1949) | locally legal segments, globally illegal loop | the Gödel–Einstein doc |

**They are not four ideas.** Monodromy is the holonomy of a flat connection, holonomy is curvature
integrated, and both are `H¹` of the appropriate sheaf. The repository has already adopted the one
that happened to be needed (**monodromy**, for never-collapse) without noticing it was an instance.

### Why this is the right home for the language claim specifically

"Local interactions vs global norms" is what a sheaf *is*: local composition rules that are
individually unobjectionable, and a global consistency requirement that may or may not be
satisfiable. Applied to language:

- **local interactions** — adjacency, agreement, composition: what a word does to its neighbours;
- **global norms** — what must hold across the whole utterance for it to mean one thing;
- **the obstruction** — the sentence whose every local reading is fine and which has **no consistent
  global reading**. Garden-path sentences, scope ambiguity, and the liar are all `H¹ ≠ 0`.

That is a **testable** reframing rather than a poetic one, and it is what makes the geometric-English
conjecture worth routing rather than admiring.

---

## 5. The triage — five domains clicking is a warning, and this is that condition

Aaron's own rule (`numerology-vs-number-theory.md`): **"too many correlations is a warning, not a
confirmation signal."** Five domains converging inside one hour is exactly the condition it names, so
this section applies the rule to the thread that produced it.

| connection | status |
|---|---|
| Gödel's incompleteness proof has the local-legal / global-illegal shape | **structural** — it is the construction, not an analogy |
| the day's five defects share the shape | **measured** — each one reproduced, each cause named |
| "a local check cannot see a global property" | **structural**, and it already explains built artefacts (the vacuous `--verify`) |
| CTC ↔ exploit path | **shared shape**; both are "legal segments, illegal loop", and no shared mechanism is claimed |
| **geometric English ↔ sheaf `H¹`** | **conjecture** — the mapping is stated, nothing is measured, **this is the routed item** |

**What would promote the last row from coincidence to result:** exhibit an actual sheaf — name the
site, name what a section is, and produce a specific utterance whose local sections are consistent
pairwise and whose global section provably does not exist. Until that object exists, the claim is
*"the structure is consistent with a local-to-global obstruction"*, never *"it is one"*.

**And the honest counter-pressure:** the shape is *general*. Local-consistency-without-global-
consistency describes an enormous class of systems, which is exactly what the rule warns about — a
hypothesis that fits everything discriminates nothing. **The discriminating question is not whether
language has the shape; it is whether the cohomology is computable and whether it predicts a
sentence's ambiguity before a human reads it.** That is the falsifier.

---

## 6. Routed questions for the math team (Lumen / Soraya)

1. **Is the four-oracle byte-lock an `H¹` computation?** Each oracle is a local section; agreement is
   the global section. If so, a failed byte-lock has a *class*, not just a diff — and the class says
   **which overlap** failed. That would be a genuinely useful instrument, not a reframing.
2. **Does the monodromy already in `harmonious-division` extend to a full sheaf structure**, or does
   it stop at the flat-connection case? `anti-babel` depends on it, so the answer has a consumer.
3. **For language:** is there a site (in the Grothendieck sense) on which the minimal linguistic seed
   is a sheaf? What is the covering — n-grams, constituents, the `signature-index` word keys?
4. **The one that matters operationally:** is there a class of check that is *provably* incapable of
   seeing a global property, and can it be recognised mechanically? A linter for the vacuity class
   would be worth more than the theory that motivated it.

---

## Pointers

- `docs/research/2026-08-23-godel-einstein-middle-ground-*.md` — the local/global split at the
  physics layer, and the day's defect table.
- `docs/research/2026-08-20-harmonious-division-*.md` §monodromy — the in-tree instance.
- `.claude/rules/anti-babel-preserve-reconcilability.md` — *reintegration is not reconvergence*,
  built on monodromy; this doc says which general structure that is a case of.
- `.claude/rules/numerology-vs-number-theory.md` — the rule §5 applies, including to itself.
- `docs/research/2026-08-23-geometry-as-the-root-of-the-soft-regime-*.md` — the geometry routing this
  extends; §4 (CGA composition) is the nearest neighbour.
- Beacon anchors: Gödel 1931 (incompleteness), Gödel 1949 (rotating cosmology / CTCs), Leray 1946,
  Cartan–Serre 1955 (*FAC*), Grothendieck 1957 (*Tôhoku*).
