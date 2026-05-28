import { describe, expect, test } from "bun:test";

import {
  DEFAULT_LOCAL_BROADCAST_TTL_MS,
  detectLocalBroadcastScopeConflicts,
  isLocalBroadcastStale,
  localBroadcastExpiresAt,
  makeLocalBroadcastReceipt,
  validateLocalBroadcastEnvelope,
  type LocalBroadcastEnvelope,
} from "./schema";

const writtenAt = "2026-05-26T22:50:00Z";

function validEnvelope(): LocalBroadcastEnvelope {
  return {
    schemaVersion: 1,
    id: "vera-20260526T225000Z",
    from: "vera",
    writtenAt,
    expiresAt: localBroadcastExpiresAt(writtenAt),
    priority: "P1",
    status: "working",
    summary: "Claimed B-0213 broadcast schema slice.",
    scope: [{ kind: "claim", value: "claim/codex-b0213-broadcast-bus-schema-ttl-receipts-20260526" }],
  };
}

describe("local broadcast schema", () => {
  test("computes a deterministic default TTL expiry", () => {
    expect(DEFAULT_LOCAL_BROADCAST_TTL_MS).toBe(30 * 60 * 1000);
    expect(localBroadcastExpiresAt(writtenAt)).toBe("2026-05-26T23:20:00.000Z");
  });

  test("marks broadcasts stale at or after expiresAt", () => {
    const envelope = validEnvelope();

    expect(isLocalBroadcastStale(envelope, new Date("2026-05-26T23:19:59Z"))).toBe(false);
    expect(isLocalBroadcastStale(envelope, new Date("2026-05-26T23:20:00Z"))).toBe(true);
  });

  test("builds read receipts that point to the observed broadcast", () => {
    const envelope = validEnvelope();

    expect(
      makeLocalBroadcastReceipt({
        from: "riven",
        readAt: "2026-05-26T22:51:00Z",
        envelope,
        sourcePath: "/Users/acehack/.local/share/zeta-broadcasts/vera.md",
      }),
    ).toEqual({
      kind: "read",
      from: "riven",
      readAt: "2026-05-26T22:51:00Z",
      broadcastId: "vera-20260526T225000Z",
      broadcastFrom: "vera",
      observedWrittenAt: writtenAt,
      sourcePath: "/Users/acehack/.local/share/zeta-broadcasts/vera.md",
    });
  });

  test("detects active overlapping scopes across agents", () => {
    const vera = {
      ...validEnvelope(),
      id: "vera-20260526T225000Z",
      from: "vera" as const,
      summary: "Working on B-0213 conflict detection.",
      scope: [{ kind: "path" as const, value: "tools/broadcast-local/" }],
    };
    const otto = {
      ...validEnvelope(),
      id: "otto-20260526T225100Z",
      from: "otto" as const,
      summary: "Also touching local broadcast tooling.",
      scope: [{ kind: "path" as const, value: "tools/broadcast-local/" }],
    };
    const riven = {
      ...validEnvelope(),
      id: "riven-20260526T225200Z",
      from: "riven" as const,
      status: "idle" as const,
      summary: "Idle receipt only.",
      scope: [{ kind: "path" as const, value: "tools/broadcast-local/" }],
    };

    expect(detectLocalBroadcastScopeConflicts([vera, otto, riven], new Date("2026-05-26T22:55:00Z"))).toEqual([
      {
        scope: { kind: "path", value: "tools/broadcast-local/" },
        broadcastIds: ["vera-20260526T225000Z", "otto-20260526T225100Z"],
        agents: ["vera", "otto"],
        summaries: ["Working on B-0213 conflict detection.", "Also touching local broadcast tooling."],
      },
    ]);
  });

  test("ignores stale overlapping scopes", () => {
    const vera = validEnvelope();
    const otto = {
      ...validEnvelope(),
      id: "otto-20260526T225100Z",
      from: "otto" as const,
    };

    expect(detectLocalBroadcastScopeConflicts([vera, otto], new Date("2026-05-26T23:30:00Z"))).toEqual([]);
  });

  test("validates the required envelope fields", () => {
    expect(validateLocalBroadcastEnvelope(validEnvelope()).ok).toBe(true);

    const invalid = { ...validEnvelope(), schemaVersion: 2, priority: "P9", summary: "" };
    const result = validateLocalBroadcastEnvelope(invalid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("schemaVersion must be 1");
      expect(result.errors).toContain("priority must be P0, P1, P2, or P3");
      expect(result.errors).toContain("summary must be a non-empty string");
    }
  });
});
