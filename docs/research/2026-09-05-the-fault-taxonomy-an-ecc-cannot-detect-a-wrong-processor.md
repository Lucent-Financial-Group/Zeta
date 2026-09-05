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
3. **Cross-machine, not just cross-language.** Four implementations on one host do not test CPU
   independence at all. The lanes already run on `ubuntu-24.04`, `ubuntu-24.04-arm` and `macos-26`
   — **that is three independent processors already in the matrix**, and whether the byte-lock is
   actually compared *across* them, rather than within each, is a question worth answering before
   claiming the property.

**Register: `toy`.** The taxonomy is Aaron's and is sound; the mechanism table above is argued from
what each fault corrupts; the claim that the byte-lock catches CPU faults is **structural, not
measured** — no bit has been flipped and no disagreement has been induced. Point 3 is the cheapest
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
