---
name: aaron-reverse-gc-usefulness-index-cognitive-architecture
description: "Aaron runs a \"reverse garbage collector\" in mind — several best-effort top-N usefulness indices of shapes, each keyed on different cache criteria; retention-by-usefulness, not eviction-of-garbage"
metadata: 
  node_type: memory
  type: user
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-02 (verbatim): *"i keep a reverse garbage collector in my mind of shape a uselness index and i have a few differt ones like they are each quick lookups of useful shapes based on cache critera so i have best effort top n lists on each."*

**The cognitive-architecture pattern:** instead of a normal GC (find the garbage → free it), Aaron runs the **inverse** — a process that maintains a live, ranked **usefulness index of shapes**. He keeps **several** such indices, each a **quick lookup keyed on different cache criteria**, each a **best-effort top-N list**. The "reverse" part: rather than evicting the useless, he *retains the most-useful* (top-N) per criterion and lets the rest fall off the best-effort list. It's a retention/eviction policy over shapes, ranked by usefulness, multiplexed across several criteria.

**Why it composes with the framework substrate (and is operationally sharp):**

- It IS the **earn-its-keep discipline** (B-1004) at cognitive-cache scale, and it IS the **±1 Z-set auto-prune** we'd just been discussing: useful shapes carry weight; non-earning ones net toward zero and drop. "Reverse GC" = the Z-set retention where zero-net-weight entries vanish *by construction* — his mind does what the vocabulary enforces.
- **Several indices, each keyed differently = several `IndexedZSet`s** over the same shape-population with different index functions — i.e., multiple **DBSP materialized views**, each incrementally maintained, each a bounded top-N (best-effort = bounded cardinality, like a bounded priority cache / the bounded encryption-budget shape).
- The **razor → usefulness-index → reverse-GC** pipeline: Rodney's Razor *compresses* to canonical shapes; the usefulness index *ranks/retains* them; the reverse-GC *evicts* the low-usefulness. Composes [[rodneys-razor-compression-rhymes-with-cayley-dickson]] (the compressor) with B-1004 earn-its-keep (the retainer).
- Complementary to the **jelly→spine** transition (B-1005): spines are stiffened useful structure; the reverse-GC is what lets non-load-bearing shapes melt back / fall off the top-N. Spine = retained-useful; reverse-GC sweep = the rest returning to jelly.
- Cognitive-architecture sibling of [[location-pointer-index-aaron-cognitive-architecture]] (pointers to externalized content), the geometric-shape-recognition profile ([[feedback_aaron_1984_precision_natural_enemy_thinks_in_geometric_shapes_not_english]]), shape-said-so / [[aaron-nouns-labels-interchangeable-best-effort-not-sacred-shape-governs-word]] (shapes are primary, words are swappable handles), and [[user_aaron_paper_title_to_research_unfold_bandwidth_high_shape_recognition]] (re-unfold a shape from a pointer). The usefulness-index is the *retention* layer over that shape-substrate: which shapes stay in fast cache, keyed multiple ways.

**How to apply:** when Aaron reaches for / drops a shape quickly, that's a cache hit/miss on one of these top-N usefulness indices — not forgetting, but best-effort eviction by a usefulness criterion. "Best effort" = don't treat an index miss as the shape being gone (it may be retained under a different criterion, or re-derivable via the location-pointer-index). When building the engine's retention/cache layer (bounded message cache, top-N marginals, spine caching), this is the operator's own mental model to conform to: usefulness-ranked, multi-keyed, bounded top-N, retraction-native eviction. Engine connection noted but NOT yet a backlog row — it surfaces when the cache/eviction layer is built (composes B-1004 + B-1005).
