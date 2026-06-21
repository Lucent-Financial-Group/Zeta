/**
 * Proximity scoring + de-duplication.
 *
 * Faithful port of `src/Core.TypeScript/workflow-engine/proximity.ts`
 * (Merge1 §05): canonical-form clustering, Jaccard similarity clustering,
 * and the de-dup convenience. Plus `roomProximity` (§05 §3.5) — room
 * adjacency in the "harmonious division" wave-field, scored from shared
 * hats / work items / relation edges (aperiodic, NOT a total order).
 *
 * Pure + deterministic (MP-1); all errors surface as `ProximityResult`
 * Results (MP-7).
 */

/** Proximity feedback per asymmetric-authorship + monad-propagation rules. */
export type ProximityFeedback = { kind: "EmptyCorpus" } | { kind: "InvalidThreshold"; threshold: number };

/** Result-shape per monad-propagation rule. */
export type ProximityResult<T> =
  | { ok: true; clusters: ReadonlyArray<Cluster<T>>; uniqueCount: number }
  | { ok: false; feedback: ProximityFeedback };

/**
 * Cluster of near-duplicate substrate items. `canonicalForm` is the
 * cluster-identity key; its content depends on the producer
 * (`clusterByCanonical` → the real canonical form; `clusterBySimilarity`
 * → a synthesized `[similarity:<threshold>]:<sorted-tokens>` label).
 */
export interface Cluster<T> {
  readonly representative: T;
  readonly members: ReadonlyArray<T>;
  readonly canonicalForm: string;
}

/**
 * Canonical-form normalization function — caller supplies how to map an
 * item to its canonical string form. Items with the same canonical form
 * are clustered together.
 */
export type CanonicalFn<T> = (item: T) => string;

/**
 * Cluster items by canonical-form normalization. The first item in each
 * cluster (by input order) is the representative; pre-sort input to
 * control representative selection. Pure function.
 */
export function clusterByCanonical<T>(corpus: ReadonlyArray<T>, canonicalFn: CanonicalFn<T>): ProximityResult<T> {
  if (corpus.length === 0) {
    return { ok: false, feedback: { kind: "EmptyCorpus" } };
  }

  const byCanonical = new Map<string, T[]>();
  const repByCanonical = new Map<string, T>();

  for (const item of corpus) {
    const canonical = canonicalFn(item);
    const existing = byCanonical.get(canonical);
    if (existing) {
      existing.push(item);
    } else {
      byCanonical.set(canonical, [item]);
      repByCanonical.set(canonical, item); // first-seen is representative
    }
  }

  const clusters: Cluster<T>[] = [];
  for (const [canonical, members] of byCanonical.entries()) {
    clusters.push({
      representative: repByCanonical.get(canonical)!,
      members,
      canonicalForm: canonical,
    });
  }

  return { ok: true, clusters, uniqueCount: clusters.length };
}

/**
 * Token-based similarity: Jaccard coefficient on shared tokens. Returns a
 * value in [0, 1] (1.0 = identical token sets; 0.0 = no shared tokens).
 */
export function jaccardSimilarity(tokensA: ReadonlySet<string>, tokensB: ReadonlySet<string>): number {
  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;
  const intersection = new Set<string>();
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection.add(t);
  }
  const unionSize = tokensA.size + tokensB.size - intersection.size;
  return intersection.size / unionSize;
}

/**
 * Token extraction: word-splitting + lowercase + stop-word filter. Caller
 * can supply a custom tokenizer for domain-specific tokenization.
 */
export function defaultTokenize(text: string): Set<string> {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "of", "in", "on", "at", "to", "for", "with", "by", "as",
    "and", "or", "but", "if", "then", "this", "that", "these", "those", "it", "its", "be",
    "been", "was", "were",
  ]);
  const tokens = new Set<string>();
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const w of words) {
    if (!stopWords.has(w) && w.length >= 2) {
      tokens.add(w);
    }
  }
  return tokens;
}

/**
 * Cluster items by Jaccard similarity threshold. Greedy clustering: each
 * item joins the existing cluster with highest similarity to its
 * representative if >= threshold, else starts a new cluster. O(N·K).
 */
export interface SimilarityClusterContext<T> {
  readonly corpus: ReadonlyArray<T>;
  readonly extractTokens: (item: T) => Set<string>;
  readonly threshold: number; // Jaccard threshold in (0, 1]
}

export function clusterBySimilarity<T>(context: SimilarityClusterContext<T>): ProximityResult<T> {
  if (context.corpus.length === 0) {
    return { ok: false, feedback: { kind: "EmptyCorpus" } };
  }
  if (context.threshold <= 0 || context.threshold > 1 || !Number.isFinite(context.threshold)) {
    return { ok: false, feedback: { kind: "InvalidThreshold", threshold: context.threshold } };
  }

  const clusterData: Array<{ rep: T; repTokens: Set<string>; members: T[] }> = [];

  for (const item of context.corpus) {
    const itemTokens = context.extractTokens(item);
    let bestClusterIdx = -1;
    let bestSimilarity = 0;
    for (let i = 0; i < clusterData.length; i++) {
      const sim = jaccardSimilarity(itemTokens, clusterData[i]!.repTokens);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestClusterIdx = i;
      }
    }
    if (bestClusterIdx >= 0 && bestSimilarity >= context.threshold) {
      clusterData[bestClusterIdx]!.members.push(item);
    } else {
      clusterData.push({ rep: item, repTokens: itemTokens, members: [item] });
    }
  }

  const clusters: Cluster<T>[] = clusterData.map((c) => ({
    representative: c.rep,
    members: c.members,
    canonicalForm: `[similarity:${context.threshold}]:${[...c.repTokens].sort().join(",")}`,
  }));

  return { ok: true, clusters, uniqueCount: clusters.length };
}

/** Convenience: extract representatives only (drop duplicates). */
export function uniqueRepresentatives<T>(result: ProximityResult<T>): ReadonlyArray<T> {
  if (!result.ok) return [];
  return result.clusters.map((c) => c.representative);
}

// --- Room adjacency (§05 §3.5) ---------------------------------------------

/**
 * Structural projection of a room for proximity scoring — the fields the
 * wave-field cares about. Kept structural (not the full `Room`) so
 * proximity stays a pure leaf with no room-construction coupling.
 */
export interface RoomProximityInput {
  readonly roomId: string;
  readonly hatIds: ReadonlyArray<string>;
  readonly workItemIds?: ReadonlyArray<string>;
  /** Room ids this room shares a relation edge with. */
  readonly relationEdges?: ReadonlyArray<string>;
}

function jaccardOfArrays(a: ReadonlyArray<string>, b: ReadonlyArray<string>): number {
  return jaccardSimilarity(new Set(a), new Set(b));
}

/**
 * Proximity score between two rooms in [0, 1] — how close they are in the
 * harmonious division. Aperiodic, NOT a total order: a room is maximally
 * proximate to itself (1.0); otherwise proximity is the mean of shared-hat
 * overlap, shared-work overlap, and a relation-edge bonus (1 if either room
 * names the other as a relation edge, else 0). Symmetric in its arguments.
 */
export function roomProximity(roomA: RoomProximityInput, roomB: RoomProximityInput): number {
  if (roomA.roomId === roomB.roomId) return 1.0;

  const hatOverlap = jaccardOfArrays(roomA.hatIds, roomB.hatIds);
  const workOverlap = jaccardOfArrays(roomA.workItemIds ?? [], roomB.workItemIds ?? []);
  const linked =
    (roomA.relationEdges ?? []).includes(roomB.roomId) || (roomB.relationEdges ?? []).includes(roomA.roomId);
  const edgeBonus = linked ? 1 : 0;

  return (hatOverlap + workOverlap + edgeBonus) / 3;
}
