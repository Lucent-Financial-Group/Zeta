---
name: Code meme selection — evolutionary pressure on code, not just backlog
description: Aaron + Otto 2026-05-09 — the backlog has natural selection (build gate, review, trajectory fitness) but individual code doesn't. Research direction: a tool that proposes simplifications and checks if tests still pass. The surviving simplification IS the fitter meme.
type: project
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
The backlog refinement IS meme selection. But the CODE itself
doesn't have the same evolutionary pressure. Bad code survives
if it compiles. Mediocre code persists because nobody retracts it.

**Research direction:** Can a simpler version pass the same tests?
If yes, the complex version loses. Rodney's Razor applied
automatically — essential vs accidental complexity decided by
the compiler, not by opinion.

**Code fitness function:**
```
fitness(code) = f(
  usage_frequency,        — how often called?
  change_frequency,       — how often changed? (instability)
  bug_correlation,        — does touching it cause bugs?
  composition_count,      — how many depend on it?
  retraction_cost,        — how hard to remove?
  alternative_fitness     — does a simpler version pass tests?
)
```

**Existing tools that partially do this:**
- Mutation testing (Stryker) — weak test detection
- Hotspot analysis — high-churn + bugs
- Dead code detection — zero-fitness retraction

**What's missing:** A tool that proposes simplifications and
checks if tests still pass. `+1` simpler, `-1` complex. The
Z-set of the codebase trends toward minimal.

**Composes with:** Rodney's Razor, Stryker mutation testing,
the linguistic seed prelude (same selection pressure on
language), the Superfluid reactor refinement (friction as
fuel for simplification).
