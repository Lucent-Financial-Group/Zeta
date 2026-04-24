# PR #203 drain log — third Craft module operator-composition

PR: <https://github.com/Lucent-Financial-Group/Zeta/pull/203>
Branch: `craft/third-module-operator-composition`
Drain session: 2026-04-24 (drain subagent per Otto-228
three-axis drain + Otto-250 PR-preservation directive)
Thread count at drain start: 20 unresolved (Copilot + zero-empathy
reviewer roster)
Axes drained: review threads (20 unresolved). DIRTY-axis cleared
by rebase onto `origin/main`; CI was already SUCCESS at drain
start so no CI-axis work needed.

Rebase: clean two-commit replay onto `origin/main`. No append-only
collisions, no skipped commits.

Fix commit: `facebb09c25e3addcbd1df092cf99a5577fe2785`

The 20 threads collapsed into seven content fixes plus a structural
delete. Many threads were duplicates of the same underlying defect
flagged by overlapping reviewers (P0/P1/P2 graded). The fix commit
addresses each defect at its source so multiple thread IDs share
the same outcome reference where the fix was structural rather
than line-local.

---

## Thread 1 — `docs/craft/subjects/zeta/operator-composition/module.md:94` — F# pipeline example does not type-check

- Thread ID: `PRRT_kwDOSF9kNM59O7eP`
- Severity: P2

### Outcome

FIX in `facebb0`. The conceptual `|> filter ... |> count |> I`
snippet was rewritten to use the real
`[<RequireQualifiedAccess>]` `Pipeline` API
(`Zeta.Core.Pipeline.filter c`,
`Zeta.Core.Pipeline.integrate c`,
`Zeta.Core.Pipeline.count c`). The new ordering puts
`Pipeline.integrate` before `Pipeline.count` so the Z-set
operators run on `Stream<ZSet<_>>` and the scalar collapse to
`Stream<int64>` happens last.

---

## Thread 2 — `docs/craft/subjects/zeta/operator-composition/module.md:93` — pipeline example needs Circuit + qualified names

- Thread ID: `PRRT_kwDOSF9kNM59O-p2`
- Severity: P1 (suggestion-comment)

### Outcome

FIX in `facebb0` (same fix as Thread 1). The reviewer's
suggested `Zeta.Core.Pipeline.filter c (...) |>
Zeta.Core.Pipeline.count c` shape is the shape the new
example uses, with the additional integrate step inserted to
satisfy Thread 3's correctness requirement.

---

## Thread 3 — `docs/craft/subjects/zeta/operator-composition/module.md:105` — count then integrate is type-incorrect

- Thread ID: `PRRT_kwDOSF9kNM59O-qH`
- Severity: P1 (correctness)

### Outcome

FIX in `facebb0`. The original example wrote `... |> count |> I`
which composes `Stream<int64>` into an integral that requires
`Stream<ZSet<_>>`. The fix integrates the Z-set first
(`Pipeline.integrate c`), then collapses to scalar with
`Pipeline.count c`. The surrounding prose now explicitly
explains why the ordering matters and that scalar-emitting
operators terminate the Z-set composition chain.

---

## Thread 4 — `docs/craft/subjects/zeta/operator-composition/module.md:293` — Attribution section names contributors

- Thread ID: `PRRT_kwDOSF9kNM59O-qg`
- Severity: P1

### Outcome

FIX in `facebb0`. The Attribution section was deleted entirely
per `docs/AGENT-BEST-PRACTICES.md` BP "No name attribution in
code, docs, or skills". Authorship and review-plan notes
belong in commit messages, PR descriptions, persona memory,
or `docs/BACKLOG.md` rather than in the module body.

---

## Thread 5 — `docs/craft/subjects/zeta/operator-composition/module.md:10` — missing prerequisite zset-basics

- Thread ID: `PRRT_kwDOSF9kNM59PWiA`
- Severity: P2

### Outcome

NARROW+BACKLOG in `facebb0`. The prerequisite line was
softened to "(forthcoming - Z-sets are what most operators
consume and produce; until that module lands, see
`docs/ARCHITECTURE.md` and
`openspec/specs/operator-algebra/spec.md` for the Z-set
definition)". Authoring the actual zset-basics module is a
separate larger Craft work-item beyond this PR's scope; this
narrow fix removes the broken-curriculum signal while pointing
readers at the canonical Z-set sources today.

---

## Thread 6 — `docs/craft/subjects/zeta/operator-composition/module.md:150` — map-after-count self-check is impossible

- Thread ID: `PRRT_kwDOSF9kNM59PWiB`
- Severity: P2

### Outcome

FIX in `facebb0`. The self-check was rewritten to ask the
learner to *explain* why a `map` after `count` cannot
type-check given `Pipeline.count: Stream<ZSet<_>> ->
Stream<int64>` and `Pipeline.map: Stream<ZSet<_>> ->
Stream<ZSet<_>>`. The pedagogical intent (is the learner
reading types?) is preserved without asking them to produce
an unrepresentable pipeline.

---

## Thread 7 — `docs/craft/subjects/zeta/operator-composition/module.md:74` — operator table starts with `||`

- Thread ID: `PRRT_kwDOSF9kNM59PX8U`
- Severity: P2

### Outcome

BACKLOG+RESOLVE. The current file at `HEAD` of this PR uses
single-pipe table syntax (`| Operator | ... |`) on every row
of both tables; `grep -n '^||'` returns no matches. The
double-pipe artifact the reviewer flagged appears to be from
an earlier draft rendering. No edit needed against the current
content. Resolving as a no-op outcome; the H-row content was
separately fixed by Threads 10/11/12.

---

## Thread 8 — `docs/craft/subjects/zeta/operator-composition/module.md:113` — alternatives table starts with `||`

- Thread ID: `PRRT_kwDOSF9kNM59PX8g`
- Severity: P2

### Outcome

BACKLOG+RESOLVE. Same as Thread 7 - the alternatives table at
`HEAD` uses single-pipe syntax. No edit needed.

---

## Thread 9 — `docs/craft/subjects/zeta/operator-composition/module.md:197` — `D o (Q1 o Q2) = (D o Q1) o Q2` is associativity, not delta-distribution

- Thread ID: `PRRT_kwDOSF9kNM59PX8p`
- Severity: P2 (mathematical-correctness)

### Outcome

FIX in `facebb0`. Replaced the bullet with two correct laws:
`Q^Delta = D o Q o I` (the incrementalisation chain rule the
optimiser actually uses, citing `src/Core/Incremental.fs`)
and `D o Q = Q o D` for time-invariant linear `Q` (the
non-trivial commutation). Bare associativity of composition
is no longer dressed up as a distribution law.

---

## Thread 10 — `docs/craft/subjects/zeta/operator-composition/module.md:75` — `H` defined as hierarchy conflicts with operator-algebra spec

- Thread ID: `PRRT_kwDOSF9kNM59P5Rk`
- Severity: P0

### Outcome

FIX in `facebb0`. The operator-table row for `H` now reads
"`H` (`distinct^Delta`) - Incremental-distinct
boundary-crossing operator (per
`openspec/specs/operator-algebra/spec.md`)" with input
ΔZ-set(t) and output ΔZ-set(t) (multiplicities clamped to
{0,1}). A note immediately below the table redirects nested /
recursive composition to `NestedCircuit.Nest` and the
`circuit-recursion` / `retraction-safe-recursion` specs.

---

## Thread 11 — `docs/craft/subjects/zeta/operator-composition/module.md:230` — Hierarchical composition (`H`) section conflicts with H = distinct^Δ

- Thread ID: `PRRT_kwDOSF9kNM59P5R3`
- Severity: P0

### Outcome

FIX in `facebb0`. The "Hierarchical composition (`H`)"
heading was renamed to "Nested / recursive circuits", and the
section body now explicitly reserves `H` for `distinct^Delta`
per the operator-algebra spec while pointing nested-circuit
readers at `NestedCircuit.Nest` and the recursion specs.

---

## Thread 12 — `docs/craft/subjects/zeta/operator-composition/module.md:75` — operator-table H definition will mis-teach contributors

- Thread ID: `PRRT_kwDOSF9kNM59P5Zj`
- Severity: P1

### Outcome

FIX in `facebb0`. Same fix as Thread 10 - the table row was
rewritten to reflect the spec's `H = distinct^Delta`
definition; the nested-composition story was relocated and
relabelled per Thread 11.

---

## Thread 13 — `docs/craft/subjects/zeta/operator-composition/module.md:32` — every operator is Z-set to Z-set is overgeneralised

- Thread ID: `PRRT_kwDOSF9kNM59P5Zk`
- Severity: P2

### Outcome

FIX in `facebb0`. The LEGO-anchor paragraph was rewritten to
say "Many core operators transform `Stream<ZSet<_>>` to
`Stream<ZSet<_>>`, but composition is more general: one
operator can snap downstream of another whenever the upstream
operator's output type matches the downstream operator's
input type. Some operators (for example `count`, `sum`) emit
scalar streams (`Stream<int64>`) rather than Z-set streams;
these compose with operators that accept scalars."

---

## Thread 14 — `docs/craft/subjects/zeta/operator-composition/module.md:196` — tautological delta-composition law (duplicate of Thread 9)

- Thread ID: `PRRT_kwDOSF9kNM59P_xc`
- Severity: P2

### Outcome

FIX in `facebb0` (same fix as Thread 9). Replaced with the
chain rule and time-invariant-linear commutation law.

---

## Thread 15 — `docs/craft/subjects/zeta/operator-composition/module.md:293` — Attribution section duplicate of Thread 4

- Thread ID: `PRRT_kwDOSF9kNM59QFcO`
- Severity: P1

### Outcome

FIX in `facebb0` (same fix as Thread 4). Section deleted in
full per BP "No name attribution in code, docs, or skills".

---

## Thread 16 — `docs/craft/subjects/zeta/operator-composition/module.md:95` — F# example does not match Pipeline API (duplicate of Thread 1/2/3)

- Thread ID: `PRRT_kwDOSF9kNM59QFcn`
- Severity: P1

### Outcome

FIX in `facebb0` (same fix as Thread 1/2/3). Example uses
`Zeta.Core.Pipeline.*` with explicit `Circuit` argument and
the corrected integrate-before-count ordering.

---

## Thread 17 — `docs/craft/subjects/zeta/operator-composition/module.md:130` — retract-safe marker does not exist

- Thread ID: `PRRT_kwDOSF9kNM59Qik_`
- Severity: P2

### Outcome

FIX in `facebb0`. The self-check was rewritten to point at
the `retraction-intuition` module and
`openspec/specs/operator-algebra/spec.md` instead of a
nonexistent `"retract-safe"` marker. The retraction-safety
question is now actionable against documented sources.

---

## Thread 18 — `docs/craft/subjects/zeta/operator-composition/module.md:94` — Pipeline calls do not exist as written (duplicate of Thread 1/2/3/16)

- Thread ID: `PRRT_kwDOSF9kNM59Q-Nm`
- Severity: P2

### Outcome

FIX in `facebb0` (same fix as Thread 1/2/3/16). Example now
uses qualified `Zeta.Core.Pipeline.filter c` etc.

---

## Thread 19 — `docs/craft/subjects/zeta/operator-composition/module.md:33` — every operator consumes / emits Z-sets is internally inconsistent (duplicate of Thread 13)

- Thread ID: `PRRT_kwDOSF9kNM59Q-OO`
- Severity: P1

### Outcome

FIX in `facebb0` (same fix as Thread 13). Paragraph was
rewritten to qualify the claim and acknowledge scalar-emitting
operators.

---

## Thread 20 — `docs/craft/subjects/zeta/operator-composition/module.md:203` — tautological identity, replace with chain rule (duplicate of Thread 9/14)

- Thread ID: `PRRT_kwDOSF9kNM59Q-OY`
- Severity: P1

### Outcome

FIX in `facebb0` (same fix as Thread 9/14). Replaced with the
chain rule `Q^Delta = D o Q o I` and the time-invariant-linear
commutation `D o Q = Q o D`.

---

## End-of-drain state

- Unresolved threads: 0 (target)
- mergeStateStatus: target MERGEABLE
- Auto-merge: armed at drain start; preserved through push.
