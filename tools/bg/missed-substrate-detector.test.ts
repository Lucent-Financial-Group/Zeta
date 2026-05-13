import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CONFIG,
  parseArgs,
  parsePositiveMinutes,
  pollOnce,
  type Adapters,
  type CascadeFinding,
  type FetchResult,
  type MergedPR,
} from "./missed-substrate-detector";
import type { AgentId, MessageEnvelope, SenderAgentId } from "../bus/types";

type FakeCascadeCall = {
  from: SenderAgentId;
  to: AgentId;
  finding: CascadeFinding;
};

function adapters(opts: {
  nowIso: string;
  fetch: FetchResult;
  detectCascade?: (pr: MergedPR) => CascadeFinding | null;
  capturedPublishes?: FakeCascadeCall[];
  publishImpl?: (from: SenderAgentId, to: AgentId, finding: CascadeFinding) => MessageEnvelope;
}): Adapters {
  const captured = opts.capturedPublishes ?? [];
  return {
    now: () => new Date(opts.nowIso),
    fetchRecentMergedPRs: () => opts.fetch,
    detectCascade: opts.detectCascade ?? (() => null),
    publishCascade: opts.publishImpl ?? ((from, to, finding): MessageEnvelope => {
      captured.push({ from, to, finding });
      return {
        id: `env-${captured.length}`,
        from,
        to,
        timestamp: opts.nowIso,
        expiresAt: opts.nowIso,
        topic: "missed-substrate-cascade",
        payload: {
          prNumber: finding.prNumber,
          branchName: finding.branchName,
          missingCommits: finding.missingCommits,
          recommendedAction: "open-recovery-PR",
          urgency: finding.urgency,
        },
      };
    }),
  };
}

describe("missed-substrate-detector slice 4 (bus publish wiring; slice-3 detect is stub)", () => {
  test("default config", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(5);
    expect(DEFAULT_CONFIG.lookbackMin).toBe(30);
    expect(DEFAULT_CONFIG.fetchLimit).toBe(100);
    expect(DEFAULT_CONFIG.noPublish).toBe(false);
    expect(DEFAULT_CONFIG.fromAgent).toBe("otto");
    expect(DEFAULT_CONFIG.toAgent).toBe("*");
  });

  describe("pollOnce — fetch path", () => {
    test("0 candidates when no merged PRs", () => {
      const result = pollOnce(DEFAULT_CONFIG, adapters({
        nowIso: "2026-05-13T18:00:00Z",
        fetch: { status: "ok", prs: [], truncated: false },
      }));
      expect(result.candidatesScanned).toBe(0);
      expect(result.cascadesDetected).toBe(0);
      expect(result.publishedEnvelopeIds).toHaveLength(0);
      expect(result.note).toContain("no merged PRs");
    });

    test("scans merged PRs but stub detector finds no cascades", () => {
      const merged: MergedPR[] = [
        { number: 2997, headRefName: "feat/x", mergedAt: "2026-05-13T17:50:00Z" },
        { number: 2998, headRefName: "feat/y", mergedAt: "2026-05-13T17:55:00Z" },
      ];
      const result = pollOnce(DEFAULT_CONFIG, adapters({
        nowIso: "2026-05-13T18:00:00Z",
        fetch: { status: "ok", prs: merged, truncated: false },
      }));
      expect(result.candidatesScanned).toBe(2);
      expect(result.cascadesDetected).toBe(0);
      expect(result.note).toContain("no cascades detected");
      expect(result.note).toContain("slice 3 plugs in real compare logic");
    });

    test("gh-error surfaces explicitly (does NOT silently treat as zero)", () => {
      const result = pollOnce(DEFAULT_CONFIG, adapters({
        nowIso: "2026-05-13T18:00:00Z",
        fetch: { status: "gh-error", reason: "HTTP 503" },
      }));
      expect(result.fetchStatus).toBe("gh-error");
      expect(result.note).toContain("gh fetch failed");
    });

    test("flags truncation warning when results hit fetchLimit", () => {
      const merged: MergedPR[] = Array.from({ length: 100 }, (_, i) => ({
        number: 1000 + i,
        headRefName: `feat/${i}`,
        mergedAt: "2026-05-13T17:50:00Z",
      }));
      const result = pollOnce(DEFAULT_CONFIG, adapters({
        nowIso: "2026-05-13T18:00:00Z",
        fetch: { status: "ok", prs: merged, truncated: true },
      }));
      expect(result.fetchTruncated).toBe(true);
      expect(result.note).toContain("WARNING: results truncated");
    });
  });

  describe("pollOnce — cascade detection + bus publish (slice 4)", () => {
    test("publishes envelope when injected detector finds a cascade", () => {
      const captured: FakeCascadeCall[] = [];
      const cascade: CascadeFinding = {
        prNumber: 2980,
        branchName: "feat/launch-thread",
        missingCommits: ["abc123", "def456"],
        urgency: "medium",
      };
      const result = pollOnce(DEFAULT_CONFIG, adapters({
        nowIso: "2026-05-13T18:00:00Z",
        fetch: { status: "ok", prs: [{ number: 2980, headRefName: "feat/launch-thread", mergedAt: "2026-05-13T17:55:00Z" }], truncated: false },
        detectCascade: () => cascade,
        capturedPublishes: captured,
      }));
      expect(result.cascadesDetected).toBe(1);
      expect(result.publishedEnvelopeIds).toHaveLength(1);
      expect(captured).toHaveLength(1);
      expect(captured[0]!.finding.prNumber).toBe(2980);
      expect(captured[0]!.finding.missingCommits).toEqual(["abc123", "def456"]);
      expect(captured[0]!.finding.urgency).toBe("medium");
      expect(result.note).toContain("cascade(s) detected");
    });

    test("does NOT publish when noPublish=true", () => {
      const captured: FakeCascadeCall[] = [];
      const cascade: CascadeFinding = {
        prNumber: 2980,
        branchName: "feat/x",
        missingCommits: ["sha1"],
        urgency: "high",
      };
      const result = pollOnce(
        { ...DEFAULT_CONFIG, noPublish: true },
        adapters({
          nowIso: "2026-05-13T18:00:00Z",
          fetch: { status: "ok", prs: [{ number: 2980, headRefName: "feat/x", mergedAt: "2026-05-13T17:55:00Z" }], truncated: false },
          detectCascade: () => cascade,
          capturedPublishes: captured,
        }),
      );
      expect(result.cascadesDetected).toBe(1);
      expect(result.publishedEnvelopeIds).toHaveLength(0);
      expect(captured).toHaveLength(0);
      expect(result.note).toContain("publish skipped");
    });

    test("publish failure surfaces in note + does NOT crash poll loop", () => {
      const cascade: CascadeFinding = {
        prNumber: 2980,
        branchName: "feat/x",
        missingCommits: ["sha1"],
        urgency: "low",
      };
      const result = pollOnce(DEFAULT_CONFIG, adapters({
        nowIso: "2026-05-13T18:00:00Z",
        fetch: { status: "ok", prs: [{ number: 2980, headRefName: "feat/x", mergedAt: "2026-05-13T17:55:00Z" }], truncated: false },
        detectCascade: () => cascade,
        publishImpl: () => { throw new Error("bus IO failure"); },
      }));
      expect(result.cascadesDetected).toBe(1);
      expect(result.publishedEnvelopeIds).toHaveLength(0);
      expect(result.note).toContain("publish failed");
    });
  });

  describe("parsePositiveMinutes", () => {
    test("accepts + rejects", () => {
      expect(parsePositiveMinutes("30", "--lookback-min")).toBe(30);
      expect(() => parsePositiveMinutes("0", "--lookback-min")).toThrow(/positive finite/);
    });
  });

  describe("parseArgs", () => {
    test("defaults + flags", () => {
      expect(parseArgs([])).toEqual(DEFAULT_CONFIG);
      const c = parseArgs(["--once", "--no-publish", "--agent", "vera", "--to", "lior", "--fetch-limit", "50"]);
      expect(c.once).toBe(true);
      expect(c.noPublish).toBe(true);
      expect(c.fromAgent).toBe("vera");
      expect(c.toAgent).toBe("lior");
      expect(c.fetchLimit).toBe(50);
    });

    test("rejects unknown flags + invalid agent", () => {
      expect(() => parseArgs(["--unknown"])).toThrow(/unknown flag/);
      expect(() => parseArgs(["--agent", "*"])).toThrow(/must be one of/);
    });
  });
});
