---
name: aaron-avoid-if-branchless
description: "Aaron avoids `if`/branches — treats a branch as a composition-killer like goto; write branchless, soft, composable code"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron (2026-06-06): *"i don't use ifs in my code cause of branchless computing, i
treat it like a composition killer and make sure it's not going to break smoothness
everywhere — it's like goto ugliness to me."*

**Why:** Three payoffs collapse into one discipline (see vision doc §4e "soft not
sharp"): (1) **shader/GPGPU portability** — sharp `if` chains cause SIMT branch
divergence, so they can't run on the ultimate massively-parallel hosts (FPGA/CUDA/
shaders); (2) **smoothness/differentiability** — branches break continuity; (3)
**composition** — an `if` fragments a smooth composable pipeline the way `goto`
fragments control flow. Soft (uncollapsed, branchless) ≡ wonder-preserving ≡
shader-portable.

**The positive form (Aaron 2026-06-06):** *"we fragment our control flow into
composable soft discriminated unions / algebraic data types."* Don't just delete
branches — **reify control flow as composable soft DUs/ADTs**: control flow becomes
*data* (an ADT you compose and `fold`/interpret), not imperative branches. "Soft" =
the DU carries uncertainty (`SoftValue`/`TriBoolean`). This is the DurableSaga
DU-state-machine generalized + the interpreter / free-monad pattern (control-as-data).

**How to apply:** Default to branch-free, composable code when writing/reviewing
Zeta (F#/C#/Rust/TS). Reify decisions as DUs/ADTs and `fold`/`match` (total) over
them; prefer `map`/`fold`/`select`/`min`/`max`/masking, lookup/predication,
arithmetic over conditionals, `TriBoolean.cooperate` (don't collapse). Treat a
branch as a smell to design out. Total `match` on a DU encoding valid states is the
sanctioned form (composition, not branching); collapse/`measure` only at the edge.
Relates to [[soft-not-sharp]], wonder-compression, host-progression-to-shaders.
