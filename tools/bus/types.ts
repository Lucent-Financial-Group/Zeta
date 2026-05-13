// types.ts — Inter-agent ephemeral bus protocol schema (B-0400 slice 1)
//
// Transport: /tmp/zeta-bus/ JSON files. No runtime dependencies.
// Each message is one JSON file; TTL expiry pruned by `clean --expired`.
//
// Topic taxonomy (agent-designed, 2026-05-13):
//   heartbeat     — liveness signal; agents advertise they are alive
//   claim         — work coordination; claim or release a backlog item
//   shadow-catch  — share an observation or insight between agents
//   review-request — ask another agent to review a specific artifact

export type AgentId =
  | "otto"
  | "alexa"
  | "riven"
  | "vera"
  | "lior"
  | "*"; // broadcast

/** Sender identity — excludes broadcast target "*" which is not a valid origin. */
export type SenderAgentId = Exclude<AgentId, "*">;

export type Topic = "heartbeat" | "claim" | "shadow-catch" | "review-request";

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

// ── discriminated union ───────────────────────────────────────────────────────

export type BusMessage =
  | { topic: "heartbeat"; payload: HeartbeatPayload }
  | { topic: "claim"; payload: ClaimPayload }
  | { topic: "shadow-catch"; payload: ShadowCatchPayload }
  | { topic: "review-request"; payload: ReviewRequestPayload };

// ── envelope (what lands on disk) ────────────────────────────────────────────

export type MessageEnvelope = BusMessage & {
  id: string;
  from: SenderAgentId; // a specific named agent, never "*"
  to: AgentId; // specific agent or "*" for broadcast
  timestamp: string; // ISO-8601
  expiresAt: string; // ISO-8601; pruned by clean --expired
};

// ── TTL defaults (milliseconds) ───────────────────────────────────────────────

export const TTL_MS: Record<Topic, number> = {
  heartbeat: 5 * 60 * 1_000,      // 5 min — liveness signal is short-lived
  claim: 24 * 60 * 60 * 1_000,    // 24 h  — claim survives a sleep cycle
  "shadow-catch": 60 * 60 * 1_000, // 1 h   — observation stays for a tick window
  "review-request": 4 * 60 * 60 * 1_000, // 4 h — review window
};
