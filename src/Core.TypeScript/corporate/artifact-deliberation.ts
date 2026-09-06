/**
 * artifact-deliberation.ts — agents passing an artifact back and forth, and the version staying real.
 *
 * ── THE SHAPE THIS IMPLEMENTS ────────────────────────────────────────────────
 * The maintainer's description of how iteration actually happens:
 *
 *   > an agent blocks off time off another agent's free slot in calendar and then that results in a
 *   > meeting being set up, then in that meeting they pass an artifact back and forth, and the more
 *   > agents there are the more they deliberate — they can go over an artifact via CRDT so that it's
 *   > always a proper version
 *
 * Every piece of that except the artifact already existed: `firstCommonFreeSlot` finds the free
 * slot, `scheduleMeeting` books it atomically across attendees, `MeetingRequest` already carries an
 * optional `anchorId`, and `meeting_planned` is already a durable fact. What was missing is the
 * thing they pass back and forth.
 *
 * ── WHY A G-SET OF REVISIONS AND NOT A CONVERGING DOCUMENT ───────────────────
 * The obvious reading of "CRDT" here is a text CRDT that merges concurrent edits into one document.
 * That would be WRONG IN THIS REPOSITORY, and the rules say so directly.
 *
 * `anti-babel-preserve-reconcilability`: *"Reintegration is NOT reconvergence... Two paths around a
 * pole yield genuinely different results, and that difference is information, not error"* — and a
 * reintegration that produces one surviving value *"has performed the collapse, not the merge."*
 * `dv2-data-split-discipline-activated`: *"a single version of the FACTS, never a single version of
 * the TRUTH."*
 *
 * A sequence CRDT interleaving two agents' concurrent edits manufactures a document neither wrote
 * and nobody approved. In a deliberation that is the worst possible outcome: the artifact everyone
 * is reviewing is one no participant is accountable for.
 *
 * So the CRDT is a **grow-only set of immutable, content-addressed revisions, each recording its
 * parents** — git's model, in a git-native repository. It satisfies the three convergence laws
 * (union is idempotent, commutative, associative), so any two participants who exchange revisions
 * end up with the same history regardless of order or duplication. And it satisfies the rule above:
 * two concurrent edits are TWO HEADS, both retained, each with its path recorded.
 *
 * ── "ALWAYS A PROPER VERSION" IS THE STRONG READING ──────────────────────────
 * Every revision is content-addressed and immutable, so a participant can always name an exact
 * version and everyone else resolves the same bytes. What the design refuses to do is invent one:
 * when the history has two heads the artifact is DIVERGED and `headsOf` returns both. Nothing here
 * picks a winner. Convergence happens only when a hat writes a MERGE revision naming both parents —
 * an accountable act by someone, recorded with its path, rather than a silent resolution by a
 * library.
 */

import { Category } from "../zeta-id/types";
import { toHex } from "../zeta-id/encoding";
import { shardZetaId } from "../shard-store/shard-store";
import { union, type GSet } from "../g-set/g-set";

/**
 * One immutable version of an artifact.
 *
 * `revisionId` is DERIVED from the content, never supplied. That is what makes two participants
 * who wrote the same bytes converge on one revision rather than on two that differ only by who
 * typed them, and it is what makes a citation resolvable to exact bytes.
 */
export interface Revision {
  readonly revisionId: string;
  readonly artifactId: string;
  /** `[]` for the opening revision, one parent for an edit, two or more for a merge. */
  readonly parents: readonly string[];
  readonly byHatId: string;
  readonly atMs: number;
  readonly content: string;
  /** Why this revision exists. A version whose reason is unrecorded cannot be argued with. */
  readonly note: string;
}

/** An artifact's whole history — the grow-only set every participant converges on. */
export interface ArtifactHistory {
  readonly artifactId: string;
  readonly revisions: GSet<Revision>;
}

/** ORDINAL on the revision id. Never `localeCompare`: two machines must order one history alike. */
const byRevisionId = (a: Revision, b: Revision): number =>
  a.revisionId < b.revisionId ? -1 : a.revisionId > b.revisionId ? 1 : 0;

/**
 * The content address of a revision.
 *
 * Over content, parents, author and artifact — deliberately NOT over `atMs` or `note`. Two hats
 * proposing the same change from the same parent should land on one revision, and letting the clock
 * into the identity would give them two indistinguishable versions to reconcile. The timestamp is
 * still carried on the value; it is just not part of what the artifact IS.
 */
export function revisionIdOf(input: {
  readonly artifactId: string;
  readonly parents: readonly string[];
  readonly byHatId: string;
  readonly content: string;
}): string {
  return toHex(
    shardZetaId(
      {
        artifactId: input.artifactId,
        // SORTED, so a merge naming the same parents in either order is the same revision.
        parents: [...input.parents].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        byHatId: input.byHatId,
        content: input.content,
      },
      0,
      Category.Observation,
    ),
  );
}

export type ReviseResult =
  | { readonly ok: true; readonly history: ArtifactHistory; readonly revision: Revision }
  | { readonly ok: false; readonly reason: string };

/** Open an artifact with its first revision. */
export function openArtifact(input: {
  readonly artifactId: string;
  readonly byHatId: string;
  readonly atMs: number;
  readonly content: string;
  readonly note: string;
}): ReviseResult {
  if (input.artifactId.trim() === "") return { ok: false, reason: "an artifact needs an id" };
  if (input.note.trim() === "") {
    return { ok: false, reason: `revision of '${input.artifactId}' has no note; a version nobody explained cannot be argued with` };
  }
  const revision: Revision = {
    revisionId: revisionIdOf({ ...input, parents: [] }),
    artifactId: input.artifactId,
    parents: [],
    byHatId: input.byHatId,
    atMs: input.atMs,
    content: input.content,
    note: input.note,
  };
  return {
    ok: true,
    history: { artifactId: input.artifactId, revisions: [revision] },
    revision,
  };
}

/**
 * Add a revision on top of `parents`.
 *
 * REFUSES a parent the history does not hold. A revision hanging off an unknown parent is a version
 * whose lineage cannot be walked, so nobody can answer "what changed?" — and admitting it would let
 * a history contain a branch that reaches no root.
 */
export function revise(
  history: ArtifactHistory,
  input: {
    readonly parents: readonly string[];
    readonly byHatId: string;
    readonly atMs: number;
    readonly content: string;
    readonly note: string;
  },
): ReviseResult {
  if (input.parents.length === 0) {
    return { ok: false, reason: "a revision needs at least one parent; use `openArtifact` for the first" };
  }
  if (input.note.trim() === "") {
    return { ok: false, reason: `revision of '${history.artifactId}' has no note` };
  }
  const known = new Set(history.revisions.map((r) => r.revisionId));
  for (const p of input.parents) {
    if (!known.has(p)) {
      return { ok: false, reason: `parent '${p}' is not in this artifact's history` };
    }
  }
  const revision: Revision = {
    revisionId: revisionIdOf({ artifactId: history.artifactId, ...input }),
    artifactId: history.artifactId,
    parents: input.parents,
    byHatId: input.byHatId,
    atMs: input.atMs,
    content: input.content,
    note: input.note,
  };
  return { ok: true, history: { ...history, revisions: union(byRevisionId, history.revisions, [revision]) }, revision };
}

/**
 * Merge two histories of the same artifact — the CRDT join.
 *
 * A plain union, which is the whole point: idempotent, commutative and associative, so participants
 * who exchange revisions in any order and any number of times end up with identical histories, with
 * no coordinator. Merging two DIFFERENT artifacts refuses, because a union of unrelated documents
 * is not a version of either.
 */
export function mergeHistories(
  a: ArtifactHistory,
  b: ArtifactHistory,
): { readonly ok: true; readonly history: ArtifactHistory } | { readonly ok: false; readonly reason: string } {
  if (a.artifactId !== b.artifactId) {
    return { ok: false, reason: `cannot merge '${a.artifactId}' with '${b.artifactId}'` };
  }
  return { ok: true, history: { artifactId: a.artifactId, revisions: union(byRevisionId, a.revisions, b.revisions) } };
}

/**
 * The revisions nothing else builds on — the artifact's current version(s).
 *
 * MORE THAN ONE MEANS DIVERGED, and that is reported rather than resolved. Two hats revising the
 * same parent concurrently produce two heads, and both are real: picking one would discard a
 * colleague's work silently, and interleaving them would manufacture a document neither wrote.
 */
export function headsOf(history: ArtifactHistory): readonly Revision[] {
  const isParent = new Set(history.revisions.flatMap((r) => r.parents));
  return [...history.revisions].filter((r) => !isParent.has(r.revisionId)).sort(byRevisionId);
}

/** True when the artifact has more than one head — a disagreement somebody has to resolve. */
export function isDiverged(history: ArtifactHistory): boolean {
  return headsOf(history).length > 1;
}

/**
 * The one current version, or `undefined` when the artifact has diverged.
 *
 * `undefined` is the honest answer to "what does this artifact say right now?" when two heads
 * exist. Returning the newest, or the first, would be a library picking a winner in an argument
 * between two hats — which is exactly the collapse the anti-Babel rule forbids.
 */
export function soleHead(history: ArtifactHistory): Revision | undefined {
  const heads = headsOf(history);
  return heads.length === 1 ? heads[0] : undefined;
}

/**
 * Converge two heads into one, by an accountable act.
 *
 * The merging hat supplies the content, so the resulting version is one a PERSON stands behind and
 * both parents are recorded on it. This is the only way divergence ends here, and it is deliberate:
 * convergence is a decision, not a side effect of a data structure.
 */
export function mergeHeads(
  history: ArtifactHistory,
  input: {
    readonly byHatId: string;
    readonly atMs: number;
    readonly content: string;
    readonly note: string;
  },
): ReviseResult {
  const heads = headsOf(history);
  if (heads.length < 2) {
    // Refused rather than made a no-op: a "merge" of one head would put a revision in the history
    // claiming to reconcile a disagreement that never existed.
    return { ok: false, reason: `'${history.artifactId}' has ${String(heads.length)} head(s); there is nothing to merge` };
  }
  return revise(history, { ...input, parents: heads.map((h) => h.revisionId) });
}

/** Walk from a revision back to the root(s), newest first — "how did we get to this version?" */
export function lineageOf(history: ArtifactHistory, revisionId: string): readonly Revision[] {
  const byId = new Map(history.revisions.map((r) => [r.revisionId, r] as const));
  const seen = new Set<string>();
  const out: Revision[] = [];
  const queue = [revisionId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    const r = byId.get(id);
    if (r === undefined) continue;
    out.push(r);
    queue.push(...r.parents);
  }
  return out;
}

/** Who has revised this artifact — the "more agents, more deliberation" reading, counted. */
export function participantsIn(history: ArtifactHistory): readonly string[] {
  return [...new Set(history.revisions.map((r) => r.byHatId))].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
}
