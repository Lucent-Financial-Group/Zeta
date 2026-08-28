---
name: project_capability_vector_not_tier_enum_hardware_matrix_picks_dependencies
description: Aaron wants dependency selection driven by a measured hardware matrix (cpu/mem/ssd/rotational), with tiers as composable optional features rather than a total order
metadata:
  type: project
---

Aaron 2026-08-25, on the `slim | standard | full` mise tier split:

> *"this is a hard one to design around until we install on more hardware but
> eventually we want tiers of optional features that can coexist/compose with each
> other in higher layers"*
> *"in a perfect world i imagine some matrix for cpus, memory, solid state, and
> rotational disk and picking the right dependence to install based on those
> results"*

**Why:** the current design is a **tier enum**, which is a total order — it cannot
express "rotational disk but 128GB RAM", and two tiers do not compose. What he is
describing is a **capability vector** with dependencies declaring *requirements
over it*. Tiers then become **derived** (a named region of the space), not
primitive — the repo's own `only-the-irreducible-is-primitive` rule applied to
host provisioning. Composition falls out for free: capability sets union; tiers
do not.

**How to apply:** the blocking input is real (too few hosts to fit a model), but
the cheap first step is not blocked — have the host-tier helper **emit the
measured vector** (cpu count, RAM, arch, rotational flag per block device) as a
recorded artifact while the enum still drives installs. Rotational is directly
measurable today: Linux `/sys/block/*/queue/rotational`, macOS `diskutil info`.
Then when hardware arrives the tier is a *checkable function* of measured
reality instead of a guess, per [[the-meter-buys-the-demarcation-not-the-claim]].

Anchor: `.mise.full.toml` header, workitem 081KTWQZY7F08QG0R0034KN17T; Aaron
2026-06-12 "addison and max and every cluster [node gets] full".
