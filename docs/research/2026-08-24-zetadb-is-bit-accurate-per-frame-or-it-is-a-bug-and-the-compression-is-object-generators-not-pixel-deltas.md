# ZetaDB is bit-accurate per frame or it is a bug — and the compression is object generators, not pixel deltas

**Date:** 2026-08-24
**Status:** the **invariant** is `unmetered` and cheaply promotable — §3 is the falsifier and it does not exist yet. The **compression design** is `toy`; Aaron: *"the efficient part is still to come."*
**Origin:** Aaron, 2026-08-24.

---

## 1. The stated invariant

> *"I designed the zetadb to be **bit accurate per frame for any emulator** — if it can't be, it's a bug. This was the point. In-memory emulator frames could be stored on disk and persisted in an efficient fashion."*

**"If it can't be, it's a bug" is an invariant, not an aspiration** — it names a class of defect rather than a hope. That makes it falsifiable, which makes it exactly the kind of claim this repo requires a test for.

**Measured on `origin/main` (2026-08-24):** `zetadb` appears in **118 files** and `deterministic.*frame` in **110** — but **`bit.accurate` appears in 1**, and `content.based compression` / `semantic compression` in **0**. *The design goal Aaron calls "the point" is essentially unwritten*, and nothing enforces it.

## 2. Why the invariant is load-bearing rather than a nicety

Bit-accuracy is what makes every downstream property available:

- **DST replay** needs the frame to be a function of the state, not of the run.
- **Content addressing** needs bit-identity — a frame that differs by one pixel between runs has an unrelated hash, so dedup collapses to nothing.
- **The compression in §4 is only possible if recomputation is exact.** Approximate recomputation is a lossy codec; exact recomputation is a *generator*. Those are different objects, and only the second can be byte-locked.

So bit-accuracy is not one property among several. **It is the precondition for the store being a store rather than a cache.**

## 3. The falsifier that should exist and does not

Cheap, obvious, and absent:

> Run an emulator N frames. Persist each frame through ZetaDB. Reload. **`cmp` byte-for-byte against the in-memory frame.** Any divergence is the bug the invariant names.

Strengthenings, in cost order: same seed across two processes; across two machines; across the four language oracles (which is where a float or a collation difference would surface, exactly as `081KT07NV0008QG0R001YDB73K` did for `ZSet.ofSeq`); and after a store round-trip through a *different* store version.

**This promotes the invariant from `unmetered` to `metered` for the cost of one test.** Until it exists, "bit-accurate" is an assertion — and this repo's standing position is that an unenforced guarantee looks exactly like an enforced one to everybody downstream.

## 4. The compression is not a codec — it stores generators

> *"The efficient part is still to come. It requires **merkle-root-like behaviour over video codecs for content-based compression over video**. Different than like MJPEG, cause this is not just the deltas — it's **the objects in the scenes** that are captured **and their generator functions**, so each frame can be **recomputed from object composition and physical rules**."*

The distinction from existing codecs is categorical, not incremental:

| approach | stores | space |
|---|---|---|
| **MJPEG** | each frame, independently compressed | pixel |
| **MPEG-style** | motion-compensated **deltas** between frames | pixel |
| **this** | **objects + their generator functions + physical rules** | **semantic** |

A delta codec answers *"how do these pixels differ from those pixels."* This answers *"what is in the scene, and what rule moves it"* — and then **recomputes the pixels**. The description is tiny relative to its output, which is where the compression comes from; the ratio is bounded by scene complexity rather than by frame rate or resolution.

**And crucially it is EXACT, which no lossy codec is.** Because the emulator is deterministic, recomputing from the generator reproduces *the bits*, not an approximation of them. That is only true if §1's invariant holds — which is the second reason §3's test is the prerequisite for this work, not a parallel task.

**"Merkle-root-like" is the dedup mechanism:** content-address the object composition, and two frames with identical object state hash identically and are stored once. Cyclic and idle scenes — an enormous fraction of emulator frames — collapse. This is the frame-level form of what `docs/research/2026-06-09-content-addressing-rooms-give-free-deduplication-of-the-chip8-memory-to-worldview-state-space.md` established for CHIP-8 memory.

## 5. This is one move, made three times

The frame store is the same operation as two others recorded the same day (`docs/research/2026-08-24-the-etymology-attack-*.md` §6, §7):

| domain | stored | derived |
|---|---|---|
| build / dependency state | the generator (Futamura, type providers, Roslyn, ShivaGC) | the graph, on demand, collectable |
| a moving heap object | a **path from a stable root** (GC trace ≡ pointer scan ≡ Merkle path) | the object's current location |
| **an emulator frame** | **objects + generator functions + rules** | **the pixels** |

**Store the generator, derive the artifact.** That is `only-the-irreducible-is-primitive-generate-the-rest` at three scales, and it is why these are one programme rather than three projects.

**And the CHIP-8 / ISR orbit reversal is how the objects are OBTAINED.** Decomposing a heap into *"non-DMA orbits based on characters and objects in the game"* produces exactly the object inventory whose generators §4 needs. The reverse-engineering is not adjacent to the compression — **it is its input stage.**

## 6. Honest limits

- **Object decomposition may not be possible for every title.** A game whose state is genuinely chaotic, or whose objects have unbounded orbits, has no compact generator. The claim is not that all frames compress; it is that emulator frames are *unusually* amenable because the machine is small and deterministic.
- **Generators can be larger than deltas.** For a scene changing in a way the object model does not capture, the description may exceed the pixels it produces. A real implementation needs a **fallback to raw**, and must measure rather than assume which wins per title.
- **"Physical rules" for an arbitrary emulator is not a small ask.** For CHIP-8 it is plausible; for an Atari with undocumented behaviour it is a research problem. Say which machines are in scope.
- **Nothing here is measured.** No bit-accuracy test exists, no object decomposition has been demonstrated end-to-end, no compression ratio has been observed. §3 is the cheapest step and the one that unblocks the rest.

## Pointers

- `docs/research/2026-08-24-the-etymology-attack-and-the-supply-chain-substitution-are-one-attack-*.md` §6–§7 — generator-as-storage and path-from-a-stable-root.
- `docs/research/2026-06-09-content-addressing-rooms-give-free-deduplication-of-the-chip8-memory-to-worldview-state-space.md` — the memory-level dedup this is the frame-level form of.
- `docs/research/2026-06-09-cheat-engine-injection-points-first-class-in-the-emulator-*.md` — the discovery method that yields the object inventory.
- `.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md` · `.claude/rules/toy-is-free-metered-must-be-earned.md`
- Beacon: Merkle (1979) · Futamura (1971) · Sutton & Barto for the object/rule decomposition framing in RL environments — and note MPEG's motion compensation is the *pixel-space* ancestor this deliberately departs from.
