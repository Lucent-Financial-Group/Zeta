# The fault taxonomy — and the one member an ECC cannot detect

**Source:** Aaron, 2026-09-05, after a power outage interrupted a working session.

> *"I think this is FoundationDB-base chaos design — power outage vs memory corruption vs disk
> corruption vs CPU corruption over time based on degenerate behaviour. This is Microsoft's ReFS
> (Resilient File System). All these failures can add up, and our ECC should be able to detect all
> of these."*

## 1. The taxonomy is real, and the members have different SIGNATURES

They are not four intensities of one thing. Each corrupts a different part of the machine, and the
difference decides what can possibly catch it:

| fault | what breaks | signature | detectable by a code over the data? |
|---|---|---|---|
| **power loss** | nothing — execution *stops* | **clean truncation**: everything before a point intact, everything after absent | **not needed.** Fail-stop, and the honest one |
| **disk corruption** | data **at rest** | bits change between write and read | **yes** — this is exactly what checksums are for |
| **memory corruption** | data **in flight** | a correct read produces a wrong write; the error is *durably recorded* | **yes, if the code is computed after the corruption** — and no if before |
| **CPU corruption** | the **computation** | the function is wrong; inputs and outputs are both "valid" | **NO. See §3.** |

**Power loss is the benign member and this session is the evidence.** The outage cost nothing: the
work was pushed after every commit, git is content-addressed, and `local == remote` on return.
Fail-stop faults are survivable by *frequency of durable checkpoints*, which is a policy, not a
detection problem. The other three are silent, and silence is the whole difficulty.

**Aaron's "add up" is the load-bearing clause.** Each of these is individually rare and a
single-fault model handles each in isolation. They compose — a memory error writes a wrong value,
the wrong value is checksummed *correctly*, the disk stores it faithfully, and every layer reports
success. **A stack of individually-correct layers can carry a corruption end to end**, which is
precisely why ReFS pairs checksums with a *second copy* (integrity streams over mirrored storage)
rather than trusting the checksum alone: a code tells you something is wrong, and only redundancy
tells you what was right.

## 2. What the tree actually has, measured

`src/Core/ChaosEnv.fs` is FoundationDB-style and honest about being deterministic — *"same (seed,
policy, schedule) produces identical traces"*, with FsCheck shrinking the seed to the minimal
trigger. But its fault menu is narrower than the taxonomy above:

```fsharp
type ChaosPolicy =
    | DelayJitter    // Delay() may stretch
    | ClockSkew      // UtcNow may jitter
    | RngStall       // NextInt64() may repeat
    | TimeReversal   // clock may move backwards
```

plus crash-mid-write, which lives separately (`InMemoryFileSystem.ArmCrashMidWrite`).

**So the shipped policies are TIME and SCHEDULING faults, plus one fail-stop fault.** Mapping them
onto the taxonomy:

| taxonomy member | in `ChaosPolicy`? |
|---|---|
| power loss | **yes** — crash-mid-write (separate type, not a policy flag) |
| disk corruption | **no** |
| memory corruption | **no** |
| CPU corruption | **no** |

That is a **nameable gap, not a criticism**: the timing faults are the ones that surface the race
conditions and ordering assumptions the module was built for, and they do that well. What is absent
is the **data-corruption axis entirely** — nothing in the chaos environment flips a bit.

## 3. THE CORRECTION: an ECC cannot detect a wrong processor

> **Our ECC should be able to detect all of these** — true for three of the four, and the fourth
> needs a different mechanism, which this repo already has.

A code over data detects **corruption of the data**. It cannot detect **corruption of the
computation**, and the reason is structural rather than a matter of code strength:

> **If the processor computes wrong, it computes the CHECK wrong too — consistently, and in
> agreement with itself.** Recompute the checksum on the same faulty CPU and it matches. Use a
> longer code and it matches. The check and the thing checked share the fault.

This is not hypothetical: it is the *degenerate behaviour over time* Aaron names — CPUs develop
input-dependent miscomputation with age and thermal stress, and the industry term for the modern
form is **silent data corruption** from "mercurial cores" (Hochschild et al., *Cores That Don't
Count*, HotOS 2021; Dixit et al., Facebook, 2021 — both report CPUs that compute wrong answers on
specific inputs while passing every self-test).

**The only mechanism that catches it is REDUNDANT COMPUTATION on independent implementations** —
and that is precisely what the four-oracle byte-lock is. F#/C#/TS/Rust computing the same golden
vectors is N-version programming; a mercurial core, a compiler bug, or an implementation error
shows up as *disagreement*, which no single-machine code can produce. So:

| fault | the mechanism that catches it |
|---|---|
| power loss | frequent durable checkpoints (git, content-addressed) |
| disk corruption | checksums / content addressing — `git` already gives this by construction |
| memory corruption | the same, **provided the code is computed after the corruption point** |
| **CPU corruption** | **the four-oracle byte-lock. Not the ECC.** |

**And this reframes the generator-as-ECC claim rather than weakening it.** The rule says
*regenerating from the irreducible generator IS the correction*. Regeneration on **one** machine
catches drift in the artifact; regeneration on **four independent implementations** catches drift
in the *machinery*. The four oracles were adopted for cross-language conformance — they turn out to
be the CPU-fault detector as well, which is a stronger justification than the one they were
introduced under.

**Honest limit, and it is the standing one:** Knight & Leveson (1986) measured that independently
developed versions fail in *correlated* ways, so N-version redundancy reduces but does not
eliminate the risk. Four implementations sharing a specification can share a specification bug, and
four processes on one host share that host's memory.

## 4. What would make this measurable rather than argued

None of this is currently tested, and the gap is specific enough to close:

1. **Add a data-corruption axis to `ChaosPolicy`** — a `BitFlip` policy on the simulated filesystem
   and on in-memory buffers. Deterministic by seed like the rest, so a failure shrinks to a minimal
   trigger.
2. **The falsifier is the interesting part:** flip a bit and show the byte-lock goes red. A
   corruption the four oracles do *not* catch is a more useful result than one they do — it maps
   the boundary of what the mechanism covers.
3. **Cross-machine, not just cross-language — MEASURED 2026-09-05, and the answer is NO.**

   `.github/workflows/bytelock.yml` declares one job, `bytelock`, with `runs-on: ubuntu-24.04`
   and **no `strategy:`/`matrix:` at all**. So the four-oracle byte-lock is *four languages on one
   processor*. It is genuine N-version programming across implementations and it is **single-machine**,
   which means the CPU-independence property §3 leans on **is not exercised anywhere in CI today.**

   And the ingredients for it already exist, unconnected:

   | | what it has | what it lacks |
   |---|---|---|
   | `bytelock.yml` | four independent implementations compared against golden vectors | **one runner** |
   | `build-and-test` | **five machines** — `ubuntu-24.04`, `ubuntu-24.04-arm`, `macos-26`, `windows-2025`, `windows-11-arm` | each leg verifies independently; `upload-artifact` appears **0 times** in `gate.yml`, so no leg's output is ever compared against another's |

   **Two mechanisms, each half of the answer, never combined.** Nothing compares a result computed
   on one processor against the same result computed on another — which is precisely the comparison
   that catches a mercurial core, and the only one that does.

   Correction to an earlier draft of this section: I wrote that "three independent processors" are
   in the matrix. **Five are** — Windows Server 2025 and Windows 11 ARM are already there
   (Aaron 2026-09-05: *"and windows 11 and server"*). The nuance is *when*: the pre-merge
   (`pull_request`) matrix is the three-OS set, and the five-OS set runs on push and
   `workflow_dispatch`. So the hardware diversity is broader than I said and is exercised less often
   than the headline suggests.

   **The cheap experiment is now concrete:** give `bytelock` the same matrix, have each leg emit its
   computed vectors, and compare across legs. A disagreement between two processors running the same
   implementation is a CPU fault by construction — there is no other explanation left once the
   language, the source and the input are held fixed. That is the one measurement that would move
   §3 from `toy` to `metered`, and it needs no new hardware.

## 5. FIRST RESULT (run 33991852357, 2026-09-05) — three machines, 36 pairs, zero disagreements

The matrix landed and was dispatched on its own branch. All three legs and the comparator went
green, and this is the measurement rather than the headline:

| leg | executed | absent |
|---|---|---|
| `ubuntu-24.04` | **9** | -- |
| `ubuntu-24.04-arm` | **9** | -- |
| `macos-26` | **8**, then **9** | `Lua 5.4`, then supplied -- see below |

**Cross-processor comparison: 36 shared (substrate, seed) pairs, 0 disagreements, across 3
machines and 2 instruction-set architectures.** That is the first time this substrate has been
compared across processors at all.

**What it does and does not establish.** It does not prove the CPUs are sound — a clean run is one
observation, and mercurial-core faults are input-specific and intermittent by nature; that is
exactly why they evade self-tests. What it establishes is that **the instrument now exists and
reports a number**: 36 is a count of comparisons actually made, and the comparator refuses rather
than passing when that count would be zero. The claim moves from *"we have no way to see this fault
class"* to *"we look, and here is how many places we looked."*

**Two things the run surfaced that were not the point of it:**

1. **`Go` executed on all three legs and was not in the required-substrate list.** The old list
   carried eight names with the note *"Go is DECLARED ABSENT ... Add it to this list in the same
   change that builds it."* The build step landed; the list never followed. The aggregate floor
   would have caught Go going dark; the per-route list would not have NAMED it, which is the reason
   that list exists.
2. **macOS is 8 because `lua5.4` is not on the runner** — Homebrew's `lua` formula installs 5.5 as
   `lua`, and the substrate shells out to `lua5.4` by name. Named rather than absorbed into a
   smaller number, and the brew step now attempts `lua@5.4` specifically.

The floors were raised to 9/9/8 from this measurement, keeping the promise the placeholder made --
and then **macOS reached 9 on the very next run** (33992105626) once the brew step installed
`lua@5.4` specifically, so that floor rose to 9 too, in the same session, because the comment
setting it to 8 had promised exactly that. **All three legs now execute the same nine substrates**,
which is what makes the comparison maximally wide: 36 shared pairs rather than a subset limited by
the weakest toolchain.

The sequence is worth keeping as a worked example of the discipline: set the floor to what was
OBSERVED (8), state the condition under which it must rise, supply the missing toolchain, measure
again (9), raise it. At no point was a number written down that had not been read off a run.

**Register: `toy`, and now with a measured reason rather than a hedge.** The taxonomy is Aaron's and
is sound; the mechanism table above is argued from what each fault corrupts; the claim that the
byte-lock catches CPU faults is **structural, and MEASURABLY not realised** — the byte-lock runs on
a single `ubuntu-24.04` runner, no bit has been flipped, and no cross-processor comparison exists to
induce a disagreement in. Point 3 is the cheapest
real experiment and the one that would move this to `metered`.

## Anchors

- **FoundationDB** — Zhou et al., SIGMOD 2021; Will Wilson, *Testing Distributed Systems with
  Deterministic Simulation* (Strange Loop 2014). The design `ChaosEnv.fs` follows.
- **ReFS** — checksums on metadata (and optionally data, via integrity streams), with automatic
  repair from a mirrored copy. The pairing of *detection* with *a second copy* is the part this
  document leans on.
- **Hochschild et al., *Cores That Don't Count*** (HotOS 2021) and **Dixit et al.** (2021) —
  mercurial cores; silent data corruption from CPUs that pass their own tests.
- **Knight & Leveson (1986)** — correlated failure in N-version programming; the standing limit on
  the mechanism §3 relies on.
