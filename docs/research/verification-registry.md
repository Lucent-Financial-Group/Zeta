# Verification Registry

The ground-truth map for the `verification-drift-auditor`
skill (`.claude/skills/verification-drift-auditor/SKILL.md`).
One row per verification artifact in the repo that claims
fidelity to an external source (paper, textbook, RFC,
canonical algorithm by author-year).

**Ordering.** Newest entry at the top (newest-first MEMORY
convention).

**Row shape.** See the skill file §"Registry — the auditor's
map" for the canonical format. Each row is append-only;
"Last audit" blocks update in place.

**Who edits.** The `verification-drift-auditor` (under
Soraya) edits the audit block when an audit completes. The
owning expert of each artifact (lean4-expert, tla-expert,
formal-verification-expert) edits the row when the artifact
itself changes. Architect (Kenji) integrates on round-close.

**Retired rows.** Rows are not silently deleted. A retired
artifact gets an explicit terminator line:
`- **Retired round N.** Replaced by <row-name> / removed
because <one-line>.`

---

## `Dbsp.ChainRule.chain_rule_proposition_3_2`

- **Artifact.** `tools/lean4/Lean4/DbspChainRule.lean:~695`
  (Lean 4 theorem, within `section Proposition32`).
- **Paper.** Budiu, Chajed, McSherry, Ryzhyk, Tannen —
  *DBSP: Automatic Incremental View Maintenance for Rich
  Query Languages* — PVLDB Vol 16(7), 2023; preprint
  `arXiv:2203.16684v1` (2022-03-30).
- **Paper statement.** Proposition 3.2 (chain clause):

  > `(Q1 ∘ Q2)^Δ = Q1^Δ ∘ Q2^Δ`

  where `Q^Δ := D ∘ Q ∘ I` is Definition 3.1 and there is
  **no linearity or time-invariance precondition** on `Q1`
  or `Q2`. The paper's proof uses Theorem 2.22
  (`I ∘ D = id`) and composition associativity.
- **Our statement.**

  ```lean
  theorem chain_rule_proposition_3_2
      (Q1 : Stream H → Stream K) (Q2 : Stream G → Stream H)
      (s : Stream G) :
      Qdelta (Q1 ∘ Q2) s = Qdelta Q1 (Qdelta Q2 s)
  ```

  with `def Qdelta (Q) := fun s => D (Q (I s))` (=
  `D ∘ Q ∘ I`, Budiu Definition 3.1).
- **Preconditions diff.** None on either side. Matches.
- **Definition map.**
  - Our `D : Stream G → Stream G`, `D s n = s n - zInv s n`
    ↔ paper's `D` (Definition 2.17).
  - Our `I : Stream G → Stream G`, `I s n = Σ_{i≤n} s i` ↔
    paper's `I` (Definition 2.19). Equivalent by
    Proposition 2.20.
  - Our `Qdelta` ↔ paper's `Q^Δ` (Definition 3.1).
  - Our `zInv : Stream G → Stream G` ↔ paper's `z⁻¹`
    (unnamed in §2 but defined by `z⁻¹(s)[t] = s[t-1]`).
- **Last audit.** 2026-04-19, verification-drift-auditor
  (Soraya), round 35. **No drift.** Statement, definitions,
  and preconditions all match the paper verbatim after the
  round-35 `chain_rule → chain_rule_proposition_3_2` rename
  and the addition of `Qdelta`.

## `Dbsp.ChainRule.Dop_LTI_commute` *(formerly `chain_rule`)*

- **Artifact.** `tools/lean4/Lean4/DbspChainRule.lean:~595`
  (Lean 4 theorem, within `section ChainRule`).
- **Paper.** Budiu et al. 2023 (same as above);
  `arXiv:2203.16684v1`.
- **Paper statement.** *None — this theorem does NOT
  correspond to a named proposition in the paper.* It is a
  corollary of **Theorem 3.3 (Linear)**:

  > For an LTI operator `Q` we have `Q^Δ = Q`.

  Equivalently, `D ∘ Q ∘ I = Q`, i.e. `D ∘ Q = Q ∘ D` (post-
  compose both sides by D, use `I ∘ D = id`).
- **Our statement.**

  ```lean
  theorem Dop_LTI_commute
      (f g : Stream G → Stream G)
      (hf : IsLinear f) (hti_f : IsTimeInvariant f)
      (hg : IsLinear g) (hti_g : IsTimeInvariant g)
      (s : Stream G) :
      Dop (f ∘ g) s = f (Dop g s)
  ```

  with `def Dop f := fun s => f s - f (zInv s)`. For linear
  `f`, `Dop f = D ∘ f` (this is sub-lemma B3,
  `linear_commute_D`), so the statement unfolds under the
  LTI preconditions to `D (f (g s)) = f (D (g s))` —
  Theorem-3.3 commutation.
- **Preconditions diff.** We require LTI on both `f` and
  `g`. The underlying Theorem 3.3 requires LTI on the single
  operator it is applied to; the composition form here only
  *uses* `hf` (for map_add / map_sub) and `hti_g` (for
  `g ∘ zInv = zInv ∘ g`). `hti_f` and `hg` are carried for
  interface symmetry with future `chain_rule_poly` (tracked
  as a "surplus preconditions" P2 finding; non-blocking).
- **Definition map.**
  - Our `Dop f := f - f ∘ zInv` has **no direct
    counterpart** in the paper. Not `Q^Δ`. Coincides with
    `D ∘ f` only for linear `f`. This is a local helper,
    not a paper term.
- **Last audit.** 2026-04-19, verification-drift-auditor
  (Soraya), round 35. **P0 drift caught and fixed.** The
  theorem formerly named `chain_rule` was misrepresenting
  itself as Proposition 3.2; it actually proves a Theorem-
  3.3 corollary. Rename landed same round; a
  `@[deprecated]` alias keeps pre-round-35 call sites
  compiling. The actual Proposition 3.2 shipped alongside
  as `chain_rule_proposition_3_2` (row above).
- **P2 residual.** `hti_f` and `hg` are unused in the proof
  body — carried as "interface symmetry" witnesses. Clean
  up when `chain_rule_poly` lands.

---

## How to add a new row

1. New verification artifact with an external citation lands.
2. Author (or the auditor, if unclaimed) drops a row here in
   the same round.
3. Fill all seven fields (Artifact, Paper, Paper statement,
   Our statement, Preconditions diff, Definition map, Last
   audit).
4. `verification-drift-auditor` re-audits on the next
   scheduled cadence.

Any verification artifact that lands **without** a row here
is a Class 0 drift (unregistered citation) and shows up in
the next audit report.
