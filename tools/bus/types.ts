// types.ts — Inter-agent ephemeral bus protocol schema (B-0400 slice 1)
//
// Transport: /tmp/zeta-bus/ JSON files. No runtime dependencies.
// Each message is one JSON file; TTL expiry pruned by `clean --expired`.
//
// Topic taxonomy (agent-designed, 2026-05-13):
//   heartbeat                 — liveness signal; agents advertise they are alive
//   claim                     — work coordination; claim or release a backlog item
//   shadow-catch              — share an observation or insight between agents
//   review-request            — ask another agent to review a specific artifact
//   infinite-backlog-nudge    — B-0440: nudge agent toward decomposition when Standing-by detected
//   work-assignment           — B-0441: proactive assignment of a ready-to-grind backlog row
//   missed-substrate-cascade  — B-0442: branch-vs-merged-PR drift detected; recovery needed

export type AgentId =
  | "otto"
  | "alexa"
  | "riven"
  | "vera"
  | "lior"
  | "*"; // broadcast

/** Sender identity — excludes broadcast target "*" which is not a valid origin. */
export type SenderAgentId = Exclude<AgentId, "*">;

export type Topic =
  | "heartbeat"
  | "claim"
  | "shadow-catch"
  | "review-request"
  | "infinite-backlog-nudge"
  | "work-assignment"
  | "missed-substrate-cascade";

// ── per-topic payloads ────────────────────────────────────────────────────────

export type HeartbeatPayload = {
  status: "alive" | "idle" | "working";
  /** optional free-form context */
  note?: string;
};

export type ClaimPayload = {
  action: "claim" | "release";
  itemId: string; // e.g. "B-0400"
  branch?: string;
};

export type ShadowCatchPayload = {
  content: string;
};

export type ReviewRequestPayload = {
  artifact: string; // file path, PR URL, or free-form reference
  question?: string;
};

/** B-0440: Standing-by detector nudges an agent toward decomposition work. */
export type InfiniteBacklogNudgePayload = {
  idleMinutes: number;
  /** Reason for the nudge — human-readable. */
  rationale: string;
  /** Optional suggested backlog row to pick up. */
  suggestedRowId?: string;
};

/** B-0441: backlog-ready notifier proactively assigns a ready-to-grind row. */
export type WorkAssignmentPayload = {
  rowId: string; // e.g. "B-0440.3"
  priority: "P0" | "P1" | "P2" | "P3";
  /** Why this row was picked — short rationale. */
  rationale: string;
  /** Optional decomposition hint for the implementer. */
  decompositionHint?: string;
};

/** B-0442: missed-substrate detector reports branch-vs-merged-PR drift. */
export type MissedSubstrateCascadePayload = {
  prNumber: number;
  branchName: string;
  /** Commit SHAs present on the branch but missing from main after squash. */
  missingCommits: string[];
  /** Suggested next action (e.g. "open-recovery-PR"). */
  recommendedAction: string;
  /** Severity hint — high if branch is about to be deleted. */
  urgency: "low" | "medium" | "high";
};

// ── discriminated union ───────────────────────────────────────────────────────

export type BusMessage =
  | { topic: "heartbeat"; payload: HeartbeatPayload }
  | { topic: "claim"; payload: ClaimPayload }
  | { topic: "shadow-catch"; payload: ShadowCatchPayload }
  | { topic: "review-request"; payload: ReviewRequestPayload }
  | { topic: "infinite-backlog-nudge"; payload: InfiniteBacklogNudgePayload }
  | { topic: "work-assignment"; payload: WorkAssignmentPayload }
  | { topic: "missed-substrate-cascade"; payload: MissedSubstrateCascadePayload };

// ── envelope (what lands on disk) ────────────────────────────────────────────

export type MessageEnvelope = BusMessage & {
  id: string;
  from: SenderAgentId; // a specific named agent, never "*"
  to: AgentId; // specific agent or "*" for broadcast
  timestamp: string; // ISO-8601
  expiresAt: string; // ISO-8601; pruned by clean --expired
};

// ── canonical agent lists (single source of truth for both CLIs) ─────────────

export const SENDER_IDS: readonly SenderAgentId[] = ["otto", "alexa", "riven", "vera", "lior"];
export const AGENT_IDS: readonly AgentId[] = [...SENDER_IDS, "*"];

// ── TTL defaults (milliseconds) ───────────────────────────────────────────────

export const TTL_MS: Record<Topic, number> = {
  heartbeat: 5 * 60 * 1_000,                        // 5 min — liveness signal is short-lived
  claim: 24 * 60 * 60 * 1_000,                       // 24 h  — claim survives a sleep cycle
  "shadow-catch": 60 * 60 * 1_000,                   // 1 h   — observation stays for a tick window
  "review-request": 4 * 60 * 60 * 1_000,             // 4 h   — review window
  "infinite-backlog-nudge": 30 * 60 * 1_000,         // 30 min — nudge stale fast (agent likely acted or moved on)
  "work-assignment": 2 * 60 * 60 * 1_000,            // 2 h   — assignment relevant for next claim cycle
  "missed-substrate-cascade": 24 * 60 * 60 * 1_000,  // 24 h  — cascade survives until recovery PR lands
};
