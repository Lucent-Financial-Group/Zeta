import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CONFIG,
  parseArgs,
  parsePositiveMinutes,
  pollOnce,
  type Adapters,
} from "./standing-by-detector";
import type { AgentId, MessageEnvelope, SenderAgentId } from "../bus/types";

type FakeNudgeCall = {
  from: SenderAgentId;
  to: AgentId;
  idleMinutes: number;
  rationale: string;
};

function fakeAdapters(
  nowIso: string,
  lastCommitIso: string | null,
  capturedCalls: FakeNudgeCall[] = [],
): Adapters {
  return {
    now: () => new Date(nowIso),
    lastCommitIso: () => lastCommitIso,
    publishNudge: (from, to, idleMinutes, rationale): MessageEnvelope => {
      capturedCalls.push({ from, to, idleMinutes, rationale });
      return {
        id: "test-envelope-id",
        from,
        to,
        timestamp: nowIso,
        expiresAt: nowIso,
        topic: "infinite-backlog-nudge",
        payload: { idleMinutes, rationale },
      };
    },
  };
}

describe("standing-by-detector slice 4", () => {
  test("default config has sensible thresholds + bus defaults", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(5);
    expect(DEFAULT_CONFIG.idleThresholdMin).toBe(15);
    expect(DEFAULT_CONFIG.once).toBe(false);
    expect(DEFAULT_CONFIG.noPublish).toBe(false);
    expect(DEFAULT_CONFIG.fromAgent).toBe("otto");
    expect(DEFAULT_CONFIG.toAgent).toBe("*");
  });

  describe("pollOnce with injected adapters — detection", () => {
    test("flags idle when last commit is older than threshold", () => {
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15, noPublish: true },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:40:00Z"),
      );
      expect(result.idleDetected).toBe(true);
      expect(result.idleMinutes).toBe(20);
      expect(result.note).toContain("Standing-by candidate");
    });

    test("does NOT flag idle when last commit is recent", () => {
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15 },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:55:00Z"),
      );
      expect(result.idleDetected).toBe(false);
      expect(result.idleMinutes).toBe(5);
      expect(result.publishedEnvelopeId).toBeNull();
    });

    test("handles null lastCommit gracefully (no publish)", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", null),
      );
      expect(result.idleDetected).toBe(false);
      expect(result.publishedEnvelopeId).toBeNull();
      expect(result.note).toContain("no commit found");
    });
  });

  describe("pollOnce with injected adapters — bus publish", () => {
    test("publishes nudge envelope when idle detected", () => {
      const captured: FakeNudgeCall[] = [];
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15 },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:40:00Z", captured),
      );
      expect(result.publishedEnvelopeId).toBe("test-envelope-id");
      expect(result.note).toContain("nudge published");
      expect(captured).toHaveLength(1);
      expect(captured[0]!.from).toBe("otto");
      expect(captured[0]!.to).toBe("*");
      expect(captured[0]!.idleMinutes).toBe(20);
      expect(captured[0]!.rationale).toContain("Standing-by detected");
      expect(captured[0]!.rationale).toContain("infinite-backlog metabolism");
    });

    test("does NOT publish when noPublish is true", () => {
      const captured: FakeNudgeCall[] = [];
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15, noPublish: true },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:40:00Z", captured),
      );
      expect(result.idleDetected).toBe(true);
      expect(result.publishedEnvelopeId).toBeNull();
      expect(captured).toHaveLength(0);
      expect(result.note).toContain("publish skipped");
    });

    test("does NOT publish when not idle", () => {
      const captured: FakeNudgeCall[] = [];
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15 },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:55:00Z", captured),
      );
      expect(result.idleDetected).toBe(false);
      expect(captured).toHaveLength(0);
    });

    test("respects --agent and --to flags for publish identity", () => {
      const captured: FakeNudgeCall[] = [];
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15, fromAgent: "vera", toAgent: "lior" },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:40:00Z", captured),
      );
      expect(result.idleDetected).toBe(true);
      expect(captured[0]!.from).toBe("vera");
      expect(captured[0]!.to).toBe("lior");
    });
  });

  describe("parsePositiveMinutes", () => {
    test("accepts positive finite numbers", () => {
      expect(parsePositiveMinutes("5", "--poll-min")).toBe(5);
    });

    test("rejects invalid inputs", () => {
      expect(() => parsePositiveMinutes(undefined, "--poll-min")).toThrow(/requires a value/);
      expect(() => parsePositiveMinutes("0", "--poll-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("Infinity", "--poll-min")).toThrow(/positive finite/);
    });
  });

  describe("parseArgs", () => {
    test("default config when no args", () => {
      expect(parseArgs([])).toEqual(DEFAULT_CONFIG);
    });

    test("--once flag", () => {
      expect(parseArgs(["--once"]).once).toBe(true);
    });

    test("--no-publish flag", () => {
      expect(parseArgs(["--no-publish"]).noPublish).toBe(true);
    });

    test("--agent + --to flags", () => {
      const config = parseArgs(["--agent", "vera", "--to", "lior"]);
      expect(config.fromAgent).toBe("vera");
      expect(config.toAgent).toBe("lior");
    });

    test("rejects invalid --agent values", () => {
      expect(() => parseArgs(["--agent", "invalid"])).toThrow(/must be one of/);
      expect(() => parseArgs(["--agent", "*"])).toThrow(/must be one of/);
    });

    test("rejects invalid --to values", () => {
      expect(() => parseArgs(["--to", "invalid"])).toThrow(/must be one of/);
    });

    test("rejects unknown flags fail-fast", () => {
      expect(() => parseArgs(["--unknown"])).toThrow(/unknown flag/);
    });
  });
});
