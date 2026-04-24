# PR #329 drain log — Graph cohesion primitives review-thread drain

PR: <https://github.com/Lucent-Financial-Group/Zeta/pull/329>
Branch: `feat/graph-cohesion-exclusivity-conductance`
Drain session: 2026-04-24 (loop-agent, review-drain subagent)
Thread count at drain start: 7 unresolved (1 P0 → escalated to
3 P0 after re-read, 4 P1, 1 P2; all from
`copilot-pull-request-reviewer`)
Rebase context: branch was already rebased onto `origin/main`
in the prior recovery pass (`docs/pr-preservation/329-recovery-log.md`);
this drain pass started clean — `git rebase origin/main` reported
"Successfully rebased and updated" with no conflicts to resolve.

Per the PR-preservation discipline (Otto-250: PR review comments
+ responses + resolutions are high-quality training signals):
full per-thread record with verbatim reviewer text, outcome,
verbatim reply, and resolution commit SHA.

Resolution commit: `0dbaddd39b6ea3c685937ec840361780a035032c`
("core: drain Graph cohesion-primitives review threads (#329)").

---

## Thread 1 — `src/Core/Graph.fs:612` — name attribution in docstring

- Reviewer: `copilot-pull-request-reviewer`
- Thread ID: `PRRT_kwDOSF9kNM59VSla`
- Severity: P1

### Original comment (verbatim)

> P1: Repo convention: avoid contributor/agent name attribution
> in code comments; prefer role references or stable doc links.
> This new comment adds named attribution ("Amara …") inside a
> public API docstring; please rephrase to remove names (e.g.,
> reference the correction/doc directly without naming
> individuals/agents).

### Outcome

FIX — dropped the `Provenance: Amara 17th-ferry Part 2
correction #3 …` block from the `internalDensity` docstring
entirely. The code-comments-explain-code-not-history discipline
forbids in-code factory-process lineage (provenance, ferry
names, persona names, "Nth correction" tags); rationale belongs
in the commit message and PR description, both of which carry
the lineage. The docstring was simultaneously rewritten to
explain the math the function actually implements (see Threads
4 + 5).

### Reply (verbatim)

> Fixed in `0dbaddd`. Dropped the in-code `Provenance: Amara
> …` block per the code-comments-explain-code-not-history
> discipline; the docstring now explains the math the function
> implements. The provenance lineage lives in the commit
> message and PR description (which both reference the
> upstream correction).

### Resolution commit

`0dbaddd39b6ea3c685937ec840361780a035032c`

---

## Thread 2 — `tests/Tests.FSharp/Algebra/Graph.Tests.fs:527` — wrong volume in test comment

- Reviewer: `copilot-pull-request-reviewer`
- Thread ID: `PRRT_kwDOSF9kNM59VSl_`
- Severity: P2

### Original comment (verbatim)

> P2: The test comment says volume is "(~60)", but
> `Graph.conductance` as implemented counts incident weight
> per endpoint on directed edges, so the volume for the K3
> side is ~122 in this setup (120 internal + 2 boundary).
> Updating the comment to match the implemented definition
> would prevent confusion when debugging failures.

### Outcome

FIX — comment rewritten to cite the ~122 figure under the
implemented directed-edge incident-weight semantics, with the
arithmetic spelled out inline (6 directed weight-10 edges =
120 internal contribution + 2 from the boundary edges
`(3, 4)` and `(4, 3)` weight-1 each). A future debugger of
this test no longer has to re-derive the correct number from
first principles.

### Reply (verbatim)

> Fixed in `0dbaddd`. Comment now cites ~122 under the
> implemented directed-edge incident-weight definition, with
> the 120 internal + 2 boundary breakdown spelled out so the
> next debugger doesn't re-derive it.

### Resolution commit

`0dbaddd39b6ea3c685937ec840361780a035032c`

---

## Thread 3 — `src/Core/Graph.fs:683` — conductance docstring vs implementation drift

- Reviewer: `copilot-pull-request-reviewer`
- Thread ID: `PRRT_kwDOSF9kNM59VSmQ`
- Severity: P1

### Original comment (verbatim)

> P1: `conductance` docstring says the boundary cut is "summed
> in one direction; symmetrized", but the implementation sums
> every directed edge crossing the boundary (`sIn <> tIn`), so
> if both directions are present the cut doubles, and there's
> no symmetrization step. Please align the doc (and/or
> implementation) with the intended directed vs symmetrized-
> undirected semantics.

### Outcome

FIX (docstring) — chose to align the documentation with the
existing implementation rather than change the implementation,
because `Graph` is a directed-by-default substrate and
introducing a symmetrization step would have broader semantic
consequences across `internalDensity` + `exclusivity` +
`conductance`. The docstring now explicitly says the cut sums
every directed edge crossing the boundary, with the "if both
directions are present each is counted once" clarifier.

### Reply (verbatim)

> Fixed in `0dbaddd` by aligning the docstring with the
> implementation: `cut(S, V\\S)` now described as "sum over
> every directed edge `(s, t)` whose endpoints lie on opposite
> sides of the partition (no symmetrization step; if both
> `(s, t)` and `(t, s)` cross the boundary, each is counted
> once)". `Graph` is directed-by-default, so the directed-as-
> stored semantics is the correct one to document; a future
> symmetrized variant would compose by materializing
> `(w_ij + w_ji) / 2` before the call.

### Resolution commit

`0dbaddd39b6ea3c685937ec840361780a035032c`

---

## Thread 4 — `src/Core/Graph.fs:622` — internalDensity self-loop counted in numerator only

- Reviewer: `copilot-pull-request-reviewer`
- Thread ID: `PRRT_kwDOSF9kNM59VSmk`
- Severity: P0

### Original comment (verbatim)

> P0: `internalDensity` currently counts self-loops in the
> numerator (when `s = t`) but the denominator uses
> `|S| * (|S|-1)` which excludes `i=j` ordered pairs. Either
> exclude self-loops from `acc` or adjust the
> denominator/doc so the formula matches the implementation;
> otherwise self-loop weights inflate density unexpectedly.

### Outcome

FIX (code) — added `s <> t` guard to the numerator
accumulator so self-loops are excluded from `acc`, matching
the `|S| * (|S| - 1)` denominator (which already excludes
the `i = j` ordered pairs). Docstring updated in the same
commit to call out the self-loop exclusion explicitly:
`sum_{(i, j) in E, i in S, j in S, i <> j} w_ij`.

### Reply (verbatim)

> Fixed in `0dbaddd`. Added `s <> t` guard to the numerator
> accumulator so self-loops are excluded — they were
> inflating `acc` while the `|S| * (|S| - 1)` denominator
> already excluded the diagonal. Docstring formula now
> explicitly shows the `i <> j` constraint
> (`sum_{(i, j) in E, i in S, j in S, i <> j} w_ij`) so the
> next reader doesn't need to cross-check.

### Resolution commit

`0dbaddd39b6ea3c685937ec840361780a035032c`

---

## Thread 5 — `src/Core/Graph.fs:604` — internalDensity "symmetrized" claim is wrong

- Reviewer: `copilot-pull-request-reviewer`
- Thread ID: `PRRT_kwDOSF9kNM59VSm-`
- Severity: P1

### Original comment (verbatim)

> P1: The `internalDensity` docstring says the internal weight
> is "symmetrized", but the implementation sums weights
> exactly as stored in `g.Edges` (no `(w_ij + w_ji)/2` step).
> Please either implement the stated symmetrization or adjust
> the wording/formula to describe the directed-as-stored
> behavior to avoid misleading API consumers.

### Outcome

FIX (docstring) — same rationale as Thread 3 (align doc with
existing impl rather than change `Graph`'s directed default).
Removed the "(symmetrized)" claim and added an explicit
sentence: "Edge weights are summed as stored in the directed
edge set; no `(w_ij + w_ji) / 2` symmetrization step is
applied — callers that want a symmetrized variant should
materialize it before calling."

### Reply (verbatim)

> Fixed in `0dbaddd`. Removed the misleading "(symmetrized)"
> claim and added an explicit sentence: edges are summed as
> stored in the directed edge set; callers that want a
> symmetrized variant should materialize
> `(w_ij + w_ji) / 2` before calling. `Graph` is directed-by-
> default; a symmetrize-on-call helper is a natural follow-up
> if multiple primitives end up needing it.

### Resolution commit

`0dbaddd39b6ea3c685937ec840361780a035032c`

---

## Thread 6 — `src/Core/Graph.fs:659` — exclusivity bounded-ratio claim breaks under signed weights

- Reviewer: `copilot-pull-request-reviewer`
- Thread ID: `PRRT_kwDOSF9kNM59VSnY`
- Severity: P0

### Original comment (verbatim)

> P0: `exclusivity` assumes a non-negative "outgoing weight"
> denominator and claims the result is in `[0,1]`, but `Graph`
> edge weights are signed (retractions/anti-edges). With
> negative weights this can return values outside `[0,1]` or
> flip sign. Consider clamping negative weights to 0 (similar
> to `labelPropagation`), using absolute weights, or
> documenting/enforcing that inputs must be materialized to
> non-negative weights before calling.

### Outcome

FIX (docstring) — chose the documentation route rather than
clamping or absolute-value wrapping in code, because
`exclusivity` is a community-detection primitive and the
"correct" handling of signed weights is application-specific
(retractions might mean "this edge was undone" → drop;
anti-edges might mean "negative association" → use absolute
value; an analyst doing cartel detection might want
`max 0L` per-edge). Forcing one of these in the primitive
would surprise the others. The docstring now explicitly
states the input contract: result is in `[0, 1]` only when
outgoing weights are non-negative; callers materialize a
non-negative view before calling. Behaviour on signed
weights is documented (ratio can fall outside `[0, 1]` or
flip sign), not silently corrupted.

### Reply (verbatim)

> Fixed in `0dbaddd` by tightening the input contract in the
> docstring rather than clamping in code. The
> `[0, 1]`-bounded guarantee now explicitly requires
> non-negative outgoing weights; callers that hold signed
> weights (retractions / anti-edges) materialize a
> non-negative view (`max 0L` per-edge, `abs`, or filter)
> before calling. The reason this is a doc fix not a code
> fix: the right handling of signed weights is application-
> specific (drop retractions vs use absolute value vs clamp),
> so building one of those into the primitive would surprise
> the other use sites. If a consistent project-wide policy
> emerges (e.g. "all community-detection primitives clamp at
> the boundary"), that becomes a follow-up that touches
> `internalDensity` + `conductance` + `exclusivity` together.

### Resolution commit

`0dbaddd39b6ea3c685937ec840361780a035032c`

---

## Thread 7 — `src/Core/Graph.fs:688` — conductance full-set check uses Count not equality

- Reviewer: `copilot-pull-request-reviewer`
- Thread ID: `PRRT_kwDOSF9kNM59VSnu`
- Severity: P0

### Original comment (verbatim)

> P0: `conductance` treats "S is the full node set" as
> `subset.Count = allNodes.Count`. This is incorrect when
> `subset` includes nodes not present in the graph (or misses
> some but matches the count), causing a false `None`. Use
> set equality (`subset = allNodes`) or explicitly check
> `subset.IsSupersetOf allNodes && subset.IsSubsetOf
> allNodes`.

### Outcome

FIX (code) — replaced `subset.Count = allNodes.Count` with
`subset = allNodes`. F#'s structural equality on `Set<'N>`
gives full-set equality (membership-based, not just
cardinality-based) at the same `O(|S|)` cost, so the fix is
strictly tighter without a complexity penalty. Now
`subset = {1, 2, 3}` against a graph whose `nodes` is
`{1, 2, 4}` correctly returns a real conductance value
(rather than a misleading `None` when the cardinalities
happened to match).

### Reply (verbatim)

> Fixed in `0dbaddd`. Replaced `subset.Count =
> allNodes.Count` with `subset = allNodes`. F#'s structural
> equality on `Set<'N>` is membership-based (not just
> cardinality-based) and runs at the same complexity, so the
> guard is strictly tighter — a subset that matches the
> graph's node count without matching its membership now
> returns a real conductance value rather than a false
> `None`.

### Resolution commit

`0dbaddd39b6ea3c685937ec840361780a035032c`

---

## Build verification

`dotnet build src/Core/Core.fsproj -c Release` — `0 Warning(s),
0 Error(s)` on the fixed Core project. Full-solution test run
deferred to CI (the local `dotnet test` invocation hits the
.NET 10 Server-GC SIGSEGV on Apple Silicon known-issue tracked
as Otto-248; CI runs on Ubuntu and is the authoritative
all-tests-pass gate).

## Discipline check

- Append-only audit trail: this drain log is a NEW file under
  `docs/pr-preservation/`; the existing
  `329-recovery-log.md` was not edited.
- Three-outcome model: every thread closed FIX (no
  NARROW+BACKLOG, no BACKLOG+RESOLVE; every reply
  paired with `resolveReviewThread`).
- Code-comments-explain-code: in-code provenance / ferry /
  persona attribution removed from `internalDensity`
  docstring (Thread 1 fix); rationale moved to commit message.
- F# / C# preservation: no `#`-suffix renames touched.
