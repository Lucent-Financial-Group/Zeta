/**
 * corporate/discussion-anchor.ts — agents talking through ARTIFACTS, not through a chat box.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `grep -r DiscussionAnchor src/Core.TypeScript` returned zero, and so did `DecisionRecord`. The
 * canonical package had an agent bus (`agent-bus/`, a G-Set of messages) and an event log, but no
 * notion of a *deliberation that owes an output*. Messages were addressed and delivered; nothing
 * recorded what a conversation was FOR or whether it produced it.
 *
 * The corporate register never has agents chat. Every exchange hangs off an anchor with:
 *
 *   - a TYPE (what kind of thing is being discussed — `DiscussionAnchorType`),
 *   - a PURPOSE (why it was opened),
 *   - an EXPECTED OUTPUT (`DiscussionExpectedOutput` — what it owes),
 *   - and the work it is anchored to.
 *
 * ── THE LOAD-BEARING RULE: AN ANCHOR MUST PRODUCE WHAT IT PROMISED ───────────
 * An anchor whose expected output is `decision` cannot be resolved until a `DecisionRecord` exists
 * on it. That single refusal is the difference between artifact-communication and a thread:
 *
 *   - Without it, "we discussed it" closes the anchor, and the org's record of a decision is a
 *     conversation someone would have to re-read and re-interpret.
 *   - With it, closing the anchor REQUIRES the artifact, so the decision is a value the next hat
 *     can read, cite, and act on without reconstructing anyone's reasoning.
 *
 * This is the same discipline the repo applies to evidence elsewhere: a claim is not established by
 * having been made. A discussion is not concluded by having happened.
 */

/** What kind of thing is under discussion. Ids match the reference catalog. */
export const AnchorType = {
  CapabilityRequest: "capability_request",
  Gate: "gate",
  Incident: "incident",
  Initiative: "initiative",
  MemoryReview: "memory_review",
  Project: "project",
  Release: "release",
  SupervisorSignal: "supervisor_signal",
  WorkItem: "work_item",
} as const;

export type AnchorType = (typeof AnchorType)[keyof typeof AnchorType];

/** What the anchor OWES. Resolving without producing it is refused. */
export const ExpectedOutput = {
  Decision: "decision",
  Document: "document",
  FollowUp: "follow_up",
  GateResult: "gate_result",
  Memory: "memory",
  Status: "status",
} as const;

export type ExpectedOutput = (typeof ExpectedOutput)[keyof typeof ExpectedOutput];

export const AnchorState = {
  Open: "open",
  Resolved: "resolved",
  Abandoned: "abandoned",
} as const;

export type AnchorState = (typeof AnchorState)[keyof typeof AnchorState];

/** A pointer to something that can be checked, not a claim that something was checked. */
export interface EvidenceRef {
  readonly kind: "trace" | "diff" | "test" | "log" | "document" | "measurement";
  readonly ref: string;
}

export interface DiscussionAnchor {
  readonly anchorId: string;
  readonly anchorType: AnchorType;
  readonly title: string;
  readonly purpose: string;
  readonly expectedOutput: ExpectedOutput;
  /** Only these hats may post. An anchor anyone can write to is a chat box. */
  readonly participantHatIds: readonly string[];
  readonly openedByHatId: string;
  readonly openedAtMs: number;
  readonly state: AnchorState;
  readonly workItemId?: string;
}

export interface AnchorPost {
  readonly postId: string;
  readonly anchorId: string;
  readonly byHatId: string;
  readonly atMs: number;
  readonly body: string;
  readonly evidence: readonly EvidenceRef[];
}

/**
 * The artifact a `decision` anchor owes.
 *
 * `rationale` is required and non-empty on purpose. A decision without a recorded reason is a fact
 * the organization cannot revisit: when circumstances change, nobody can tell whether the reason
 * still holds, so the choice becomes permanent by accident.
 */
export interface DecisionRecord {
  readonly decisionId: string;
  readonly anchorId: string;
  readonly byHatId: string;
  readonly atMs: number;
  readonly decision: string;
  readonly rationale: string;
  readonly evidence: readonly EvidenceRef[];
}

/** The whole deliberation substrate as one value — foldable, replayable, diffable. */
export interface AnchorBoard {
  readonly anchors: readonly DiscussionAnchor[];
  readonly posts: readonly AnchorPost[];
  readonly decisions: readonly DecisionRecord[];
}

export const EMPTY_BOARD: AnchorBoard = { anchors: [], posts: [], decisions: [] };

export type BoardResult =
  | { readonly ok: true; readonly board: AnchorBoard }
  | { readonly ok: false; readonly reason: string };

export function anchorById(board: AnchorBoard, anchorId: string): DiscussionAnchor | undefined {
  return board.anchors.find((a) => a.anchorId === anchorId);
}

export function postsOn(board: AnchorBoard, anchorId: string): readonly AnchorPost[] {
  return board.posts.filter((p) => p.anchorId === anchorId);
}

export function decisionsOn(board: AnchorBoard, anchorId: string): readonly DecisionRecord[] {
  return board.decisions.filter((d) => d.anchorId === anchorId);
}

/** Open an anchor. Refuses a duplicate id, an empty purpose, or a thread with nobody in it. */
export function openAnchor(board: AnchorBoard, anchor: DiscussionAnchor): BoardResult {
  if (anchorById(board, anchor.anchorId) !== undefined) {
    return { ok: false, reason: `duplicate anchor id '${anchor.anchorId}'` };
  }
  if (anchor.purpose.trim() === "") {
    // An anchor with no stated purpose cannot be judged complete, because nothing says what it was
    // for. It would be resolvable on any grounds at all.
    return { ok: false, reason: `anchor '${anchor.anchorId}' has no purpose` };
  }
  if (anchor.participantHatIds.length === 0) {
    return { ok: false, reason: `anchor '${anchor.anchorId}' has no participants` };
  }
  if (!anchor.participantHatIds.includes(anchor.openedByHatId)) {
    // The opener is party to its own anchor. Otherwise a hat could open a discussion it may not
    // then contribute to, and the first post would be refused.
    return { ok: false, reason: `anchor '${anchor.anchorId}' does not include its opener '${anchor.openedByHatId}'` };
  }
  return { ok: true, board: { ...board, anchors: [...board.anchors, anchor] } };
}

/**
 * Post to an anchor.
 *
 * Refuses a non-participant and refuses a closed anchor. The second matters more than it looks: an
 * anchor that accepts posts after resolution means the recorded conclusion is no longer the last
 * word, so a reader who stops at the decision has read something incomplete without knowing it.
 */
export function postToAnchor(board: AnchorBoard, post: AnchorPost): BoardResult {
  const anchor = anchorById(board, post.anchorId);
  if (anchor === undefined) return { ok: false, reason: `no anchor '${post.anchorId}'` };
  if (anchor.state !== AnchorState.Open) {
    return { ok: false, reason: `anchor '${post.anchorId}' is ${anchor.state}` };
  }
  if (!anchor.participantHatIds.includes(post.byHatId)) {
    return { ok: false, reason: `'${post.byHatId}' is not a participant on anchor '${post.anchorId}'` };
  }
  if (board.posts.some((p) => p.postId === post.postId)) {
    return { ok: false, reason: `duplicate post id '${post.postId}'` };
  }
  return { ok: true, board: { ...board, posts: [...board.posts, post] } };
}

/**
 * Record a decision on an anchor.
 *
 * The decider must be a participant — a decision handed down by a hat that never joined the
 * discussion is exactly the outcome anchors exist to prevent, since the reasoning it was supposed
 * to be anchored to is not there.
 */
export function recordDecision(board: AnchorBoard, decision: DecisionRecord): BoardResult {
  const anchor = anchorById(board, decision.anchorId);
  if (anchor === undefined) return { ok: false, reason: `no anchor '${decision.anchorId}'` };
  if (anchor.state !== AnchorState.Open) {
    return { ok: false, reason: `anchor '${decision.anchorId}' is ${anchor.state}` };
  }
  if (!anchor.participantHatIds.includes(decision.byHatId)) {
    return { ok: false, reason: `'${decision.byHatId}' is not a participant on anchor '${decision.anchorId}'` };
  }
  if (decision.decision.trim() === "") {
    return { ok: false, reason: `decision '${decision.decisionId}' is empty` };
  }
  if (decision.rationale.trim() === "") {
    // Without a reason the organization cannot revisit the choice when circumstances change, so it
    // becomes permanent by accident rather than by intent.
    return { ok: false, reason: `decision '${decision.decisionId}' has no rationale` };
  }
  if (board.decisions.some((d) => d.decisionId === decision.decisionId)) {
    return { ok: false, reason: `duplicate decision id '${decision.decisionId}'` };
  }
  return { ok: true, board: { ...board, decisions: [...board.decisions, decision] } };
}

/**
 * Has the anchor produced what it owes?
 *
 * `decision` demands a `DecisionRecord`. The other outputs are satisfied by an evidenced post —
 * a document, a gate result, a status, a memory and a follow-up are all things you can point at,
 * and a post with no evidence points at nothing.
 *
 * Note what is NOT accepted for any output: a bare post. Requiring evidence is what stops
 * "discussed, therefore done" from closing an anchor.
 */
export function producedItsOutput(board: AnchorBoard, anchorId: string): boolean {
  const anchor = anchorById(board, anchorId);
  if (anchor === undefined) return false;
  if (anchor.expectedOutput === ExpectedOutput.Decision) {
    return decisionsOn(board, anchorId).length > 0;
  }
  return postsOn(board, anchorId).some((p) => p.evidence.length > 0);
}

/**
 * Resolve an anchor — REFUSED unless it produced its expected output.
 *
 * This is the rule the whole module exists for. Without it, artifact-communication degrades into
 * threads: a discussion closes because it stopped, and the organization's record of why anything
 * happened is a transcript nobody will re-read.
 */
export function resolveAnchor(board: AnchorBoard, anchorId: string): BoardResult {
  const anchor = anchorById(board, anchorId);
  if (anchor === undefined) return { ok: false, reason: `no anchor '${anchorId}'` };
  if (anchor.state !== AnchorState.Open) return { ok: false, reason: `anchor '${anchorId}' is ${anchor.state}` };
  if (!producedItsOutput(board, anchorId)) {
    return {
      ok: false,
      reason: `anchor '${anchorId}' owes a '${anchor.expectedOutput}' and has not produced one — a discussion that stopped is not a discussion that concluded`,
    };
  }
  return {
    ok: true,
    board: {
      ...board,
      anchors: board.anchors.map((a) => (a.anchorId === anchorId ? { ...a, state: AnchorState.Resolved } : a)),
    },
  };
}

/**
 * Abandon an anchor — permitted WITHOUT the output, and deliberately distinct from resolving.
 *
 * Sometimes a discussion genuinely should stop without producing what it promised: the initiative
 * was cancelled, the incident turned out not to be one. Forcing that through `resolve` would mean
 * manufacturing a decision nobody made, which is worse than recording that it was dropped. The two
 * states stay separate so a reader can tell "we decided" from "we stopped".
 */
export function abandonAnchor(board: AnchorBoard, anchorId: string): BoardResult {
  const anchor = anchorById(board, anchorId);
  if (anchor === undefined) return { ok: false, reason: `no anchor '${anchorId}'` };
  if (anchor.state !== AnchorState.Open) return { ok: false, reason: `anchor '${anchorId}' is ${anchor.state}` };
  return {
    ok: true,
    board: {
      ...board,
      anchors: board.anchors.map((a) => (a.anchorId === anchorId ? { ...a, state: AnchorState.Abandoned } : a)),
    },
  };
}

/** Open anchors this hat is party to — the hat's deliberation inbox. */
export function openAnchorsFor(board: AnchorBoard, hatId: string): readonly DiscussionAnchor[] {
  return board.anchors.filter((a) => a.state === AnchorState.Open && a.participantHatIds.includes(hatId));
}
