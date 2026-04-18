# Algebra Owner — Notebook

Running notes for Tariq. ASCII only (BP-09). 3000-word cap
(BP-07). Newest entries first (AGENTS.md §18 convention).

Frontmatter at `.claude/skills/algebra-owner/SKILL.md`
is canon (BP-08). This notebook supplements, never overrides.

---

## 2026-04-18 — B2 IsLinear strengthening: recommendation

**Context.** `tools/lean4/Lean4/DbspChainRule.lean` sub-lemma
`linear_commute_zInv` (B2) cannot close with the current
`IsLinear` predicate — it bundles only `map_zero` + `map_add`
at the stream level, which is the `AddMonoidHom` slice. DBSP
linearity (Budiu et al. §3.1) is additive **and** causal **and**
time-invariant. B2 needs the shift-commutation shape; B3 then
falls out of B2 + abelian-group negation; B1 needs causal +
additive to push `f` inside `Finset.range` sums; `chain_rule`
depends on B1/B2/B3.

**DEBT.md entry.** "Lean `IsLinear` predicate too weak for B2
(`linear_commute_zInv`)" — lists the three candidates:
  (a) causality (`f s n` depends only on `s 0 .. s n`);
  (b) explicit shift-commutation axiom;
  (c) pointwise per-tick `AddMonoidHom` family.

### Recommendation: **(c) pointwise action** — roll our own
`IsDbspLinear` with a bundled per-tick `AddMonoidHom` family.

**Why not (a) causality-only.** Causality by itself still fails
B2 at `n = 0`: knowing `f s 0` depends only on `s 0` does not
force `f (zInv s) 0 = 0` unless we *also* know `f` sends the
zero-at-tick-0 sub-stream to zero at tick 0. Closing that gap
means inventing a second axiom on top of (a) — at which point
(c) is the cleaner statement of what we actually want.

**Why not (b) shift-commutation axiom.** It is textbook cheating:
the axiom *is* the statement of B2. B3 and `chain_rule` would
reduce to appeals to the axiom, removing the proof's
evidentiary content. Rune (maintainability) would reject it on
honest-docstring grounds and the paper-peer-reviewer (Yusuf)
would flag it in any write-up.

**Why (c) is right for Zeta.** Every DBSP primitive we ship —
`Map`, `IndexedJoin` (on one side fixed), `Plus`, `z-inv`, `D`,
`I` — is *already* pointwise-at-each-tick in the F# code
(`src/Zeta.Core/Operators.fs`). Retraction-native semantics
*require* per-tick determinism. So (c) models exactly what our
operators satisfy; (a) and (b) model strictly larger function
classes we will never instantiate. Stronger predicate, easier
proofs, and it matches the Bagchi-et-al. "relational algebra
as pointwise functor on tick-indexed families" framing.

### Concrete definition (Lean pseudo-code)

```lean
/-- A stream operator is DBSP-linear iff it acts via a family
of per-tick additive homomorphisms indexed by tick + prefix. -/
structure IsDbspLinear (f : Stream G -> Stream H) : Prop where
  phi       : forall n : Nat, (Fin (n+1) -> G) ->+ H
  -- (uses Mathlib `->+` = `AddMonoidHom`)
  pointwise : forall (s : Stream G) (n : Nat),
                f s n = phi n (fun i => s i.val)
```

F# mirror for the operator-algebra side (non-proof, for
`Operators.fs` docstrings and the FsCheck law suite):

```fsharp
/// A stream operator f is DBSP-linear iff there exists a
/// family phi_n of AddMonoidHom (prefix Fin(n+1) -> G, output H)
/// such that (f s) n = phi_n (fun i -> s i) for all n.
/// Checked via FsCheck on the first K ticks with random s, t.
```

### Downstream proof impact

| Sub-lemma            | Status      | Depends on (c) how                                                                 |
|----------------------|-------------|------------------------------------------------------------------------------------|
| T3 `I_zInv_eq`       | closed      | independent of linearity                                                           |
| T4 `D_I_eq`          | closed      | independent                                                                        |
| T5 `I_D_eq`          | open `sorry`| independent — pure telescoping                                                     |
| **B1** `linear_commute_I`  | open  | rewritten: `phi_n` pulls through `Finset.range` by `AddMonoidHom.map_sum`         |
| **B2** `linear_commute_zInv` | open | direct: at `n=0` `phi_0` on zero prefix = 0; at `n=k+1` `phi_{k+1}` coincides with `phi_k` on the shifted prefix |
| **B3** `linear_commute_D`    | open | corollary of B2 plus `AddMonoidHom.map_sub`                                      |
| `chain_rule`               | open | uses B1/B2/B3 by their existing high-level plan; no new obligations               |

B3 actually shortens — it becomes a one-line corollary instead
of needing its own tactic script.

### Effort estimate (for Kenji)

- Predicate refactor + re-state B1/B2/B3 headers: **1 hour**.
- Close B2 with the new predicate: **2-3 hours** (the `phi_0`
  zero-prefix and `phi_{k+1}` shift cases are both direct from
  the `pointwise` witness).
- Close B3 as corollary: **30 minutes**.
- Close B1 via `AddMonoidHom.map_sum`: **2-3 hours** (Mathlib
  has `map_sum` for additive homs; some plumbing to index over
  `Finset.range`).
- Close `chain_rule` once B1/B2/B3 land: **4-6 hours**
  (unchanged by the predicate choice — it was always gated on
  B1/B2/B3).

**Total to close B2 with the predicate landing: ~half a day.**
**Total to close the full chain-rule theorem: ~2 days.**

### Flagged downstream proofs in same file

Predicate choice affects every proof that currently carries an
`IsLinear` hypothesis:

- B1 `linear_commute_I` — benefits; `map_sum` makes this
  almost mechanical.
- B2 `linear_commute_zInv` — blocked today; (c) unblocks.
- B3 `linear_commute_D` — benefits; reduces to a corollary.
- `chain_rule` — hypothesis type changes from
  `IsLinear f, IsLinear g` to
  `IsDbspLinear f, IsDbspLinear g`. All call sites are in this
  one file, so the ripple is contained.

`chain_rule_id_corollary` aliases `D_I_eq` directly and is
unaffected.

### Handoff to Kenji (summary, under 150 words)

**Recommendation:** Option (c). Add `IsDbspLinear` as a
structure bundling a per-tick `AddMonoidHom` family plus a
`pointwise` witness that `f s n = phi n (prefix)`. Replace the
two uses of `IsLinear` in B1/B2/B3/`chain_rule`.

**One-line rationale:** (c) models exactly what Zeta's F#
operators already satisfy (pointwise-at-each-tick, retraction-
native), makes B2 a direct witness application, turns B3 into
a corollary, and unblocks B1 via `AddMonoidHom.map_sum` — (a)
needs a second axiom to close `n=0`, (b) assumes the answer.

**Downstream impact:** B1, B2, B3, and `chain_rule` all carry
the predicate; T3/T4/T5 and `chain_rule_id_corollary` are
independent. Estimated ~half a day to close B2 with the
predicate, ~2 days for the full chain-rule theorem. Landable
this round if Kenji has the Lean budget; otherwise clean
candidate for a dedicated algebra-design spike.

