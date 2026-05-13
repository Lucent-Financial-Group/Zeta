import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CONFIG,
  parseArgs,
  parseRow,
  parsePositiveMinutes,
  pollOnce,
  runOnce,
  type Adapters,
  type BacklogRow,
} from "./backlog-ready-notifier";
import type { AgentId, MessageEnvelope, SenderAgentId } from "../bus/types";

type FakeAssignmentCall = {
  from: SenderAgentId;
  to: AgentId;
  rowId: string;
  priority: "P0" | "P1" | "P2" | "P3";
  rationale: string;
};

function fakeAdapters(
  nowIso: string,
  rows: BacklogRow[],
  capturedCalls: FakeAssignmentCall[] = [],
  gitLogStr: string = "",
  ghPrListStr: string = "",
): Adapters {
  return {
    now: () => new Date(nowIso),
    scanBacklog: () => rows,
    publishAssignment: (from, to, rowId, priority, rationale): MessageEnvelope => {
      capturedCalls.push({ from, to, rowId, priority, rationale });
      return {
        id: `env-${capturedCalls.length}`,
        from,
        to,
        timestamp: nowIso,
        expiresAt: nowIso,
        topic: "work-assignment",
        payload: { rowId, priority, rationale },
      };
    },
    agentPatterns: {
      "testagent": ["testagent"],
    },
    execGitLog: () => gitLogStr,
    execGhPrList: () => ghPrListStr,
  };
}

const ROW_OPEN_NO_DEPS: BacklogRow = {
  id: "B-9001",
  priority: "P1",
  status: "open",
  dependsOn: [],
  filename: "B-9001-test-no-deps.md",
};

const ROW_OPEN_DEPS_SATISFIED: BacklogRow = {
  id: "B-9002",
  priority: "P1",
  status: "open",
  dependsOn: ["B-9000"],
  filename: "B-9002-test-deps-ok.md",
};

const ROW_OPEN_DEPS_UNSATISFIED: BacklogRow = {
  id: "B-9003",
  priority: "P2",
  status: "open",
  dependsOn: ["B-9999"],
  filename: "B-9003-test-deps-pending.md",
};

const ROW_CLOSED: BacklogRow = {
  id: "B-9000",
  priority: "P1",
  status: "closed",
  dependsOn: [],
  filename: "B-9000-test-closed.md",
};

const ROW_OPEN_DEPS_PENDING: BacklogRow = {
  id: "B-9999",
  priority: "P3",
  status: "open",
  dependsOn: [],
  filename: "B-9999-test-pending.md",
};

describe("backlog-ready-notifier slice 2", () => {
  test("default config has sensible poll interval and backlog dir", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(10);
    expect(DEFAULT_CONFIG.once).toBe(false);
    expect(DEFAULT_CONFIG.backlogDir).toBe("docs/backlog");
  });

  describe("parseRow", () => {
    test("extracts id + priority + status + depends_on from frontmatter", () => {
      const content = `---
id: B-0440
priority: P1
status: open
title: "Test row"
depends_on: [B-0400, B-0402]
---

body content`;
      const row = parseRow(content, "B-0440-test.md");
      expect(row).not.toBeNull();
      expect(row?.id).toBe("B-0440");
      expect(row?.priority).toBe("P1");
      expect(row?.status).toBe("open");
      expect(row?.dependsOn).toEqual(["B-0400", "B-0402"]);
    });

    test("handles empty depends_on array", () => {
      const content = `---
id: B-9001
priority: P2
status: open
depends_on: []
---`;
      const row = parseRow(content, "B-9001.md");
      expect(row?.dependsOn).toEqual([]);
    });

    test("handles missing depends_on field (treats as empty)", () => {
      const content = `---
id: B-9002
priority: P3
status: closed
---`;
      const row = parseRow(content, "B-9002.md");
      expect(row?.dependsOn).toEqual([]);
    });

    test("parses block-style depends_on YAML list", () => {
      const content = `---
id: B-9010
priority: P1
status: open
depends_on:
  - B-9000
  - B-9001
  - B-9002
---`;
      const row = parseRow(content, "B-9010.md");
      expect(row?.dependsOn).toEqual(["B-9000", "B-9001", "B-9002"]);
    });

    test("returns null when frontmatter missing", () => {
      expect(parseRow("no frontmatter here", "x.md")).toBeNull();
    });

    test("returns null when required fields missing", () => {
      const content = `---
title: only a title
---`;
      expect(parseRow(content, "x.md")).toBeNull();
    });
  });

  describe("isAgentQueueEmpty", () => {
    const { isAgentQueueEmpty } = require("./backlog-ready-notifier");

    test("returns true when agent is unknown", () => {
      const adapters = fakeAdapters("2026-05-13T18:00:00Z", [], [], "some git log", "some prs");
      expect(isAgentQueueEmpty("UnknownAgent", adapters)).toBe(true);
    });

    test("returns true when known agent has no commits and no PRs", () => {
      const adapters = fakeAdapters("2026-05-13T18:00:00Z", [], [], "other stuff", "[]");
      expect(isAgentQueueEmpty("TestAgent", adapters)).toBe(true);
    });

    test("returns false when known agent has recent commits", () => {
      const adapters = fakeAdapters("2026-05-13T18:00:00Z", [], [], "commit by testagent", "[]");
      expect(isAgentQueueEmpty("TestAgent", adapters)).toBe(false);
    });

    test("returns false when known agent has open PRs", () => {
      const prData = JSON.stringify([{ title: "test", body: "fixed by TestAgent", author: { login: "other" } }]);
      const adapters = fakeAdapters("2026-05-13T18:00:00Z", [], [], "", prData);
      expect(isAgentQueueEmpty("TestAgent", adapters)).toBe(false);
    });
  });

  describe("pollOnce with injected adapters", () => {
    test("flags rows with no dependencies as ready", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", [ROW_OPEN_NO_DEPS]),
      );
      expect(result.totalOpenRows).toBe(1);
      expect(result.readyRowsFound).toBe(1);
      expect(result.candidateIds).toEqual(["B-9001"]);
    });

    test("flags rows with all deps closed as ready", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", [
          ROW_CLOSED,
          ROW_OPEN_DEPS_SATISFIED,
        ]),
      );
      expect(result.totalOpenRows).toBe(1);
      expect(result.readyRowsFound).toBe(1);
      expect(result.candidateIds).toEqual(["B-9002"]);
    });

    test("does NOT flag a row whose dep is still open", () => {
      // ROW_OPEN_DEPS_UNSATISFIED depends on ROW_OPEN_DEPS_PENDING (id=B-9999, status=open)
      // So B-9003 should NOT be ready. B-9999 has no deps so IT is ready.
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", [
          ROW_OPEN_DEPS_UNSATISFIED,
          ROW_OPEN_DEPS_PENDING,
        ]),
      );
      expect(result.totalOpenRows).toBe(2);
      expect(result.readyRowsFound).toBe(1);
      expect(result.candidateIds).toEqual(["B-9999"]);
    });

    test("limits candidateIds to first 10 rows", () => {
      const rows: BacklogRow[] = Array.from({ length: 15 }, (_, i) => ({
        id: `B-${String(8000 + i).padStart(4, "0")}`,
        priority: "P2",
        status: "open",
        dependsOn: [],
        filename: `B-${String(8000 + i).padStart(4, "0")}.md`,
      }));
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", rows),
      );
      expect(result.readyRowsFound).toBe(15);
      expect(result.candidateIds).toHaveLength(10);
    });

    test("returns 0 when no open rows exist", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", [ROW_CLOSED]),
      );
      expect(result.totalOpenRows).toBe(0);
      expect(result.readyRowsFound).toBe(0);
      expect(result.candidateIds).toEqual([]);
    });

    test("treats superseded-by-* deps as satisfied (matches generate-index)", () => {
      const supersededRow: BacklogRow = {
        id: "B-8000",
        priority: "P1",
        status: "superseded-by-B-9999",
        dependsOn: [],
        filename: "B-8000.md",
      };
      const openWithSupersededDep: BacklogRow = {
        id: "B-8001",
        priority: "P1",
        status: "open",
        dependsOn: ["B-8000"],
        filename: "B-8001.md",
      };
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", [supersededRow, openWithSupersededDep]),
      );
      expect(result.readyRowsFound).toBe(1);
      expect(result.candidateIds).toEqual(["B-8001"]);
    });

    test("flags dangling dep references in note", () => {
      const openWithDanglingDep: BacklogRow = {
        id: "B-8002",
        priority: "P2",
        status: "open",
        dependsOn: ["B-NONEXISTENT"],
        filename: "B-8002.md",
      };
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", [openWithDanglingDep]),
      );
      expect(result.readyRowsFound).toBe(0);
      expect(result.note).toContain("dangling dep ref");
      expect(result.note).toContain("B-NONEXISTENT");
    });
  });

  test("runOnce returns a single result without daemon mode", () => {
    const result = runOnce({ ...DEFAULT_CONFIG, backlogDir: "/nonexistent" });
    expect(result.pollAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // /nonexistent has no P*/ dirs so should report 0 rows
    expect(result.totalOpenRows).toBe(0);
  });

  describe("parsePositiveMinutes", () => {
    test("accepts positive finite numbers", () => {
      expect(parsePositiveMinutes("10", "--poll-min")).toBe(10);
    });

    test("rejects invalid inputs", () => {
      expect(() => parsePositiveMinutes(undefined, "--poll-min")).toThrow(/requires/);
      expect(() => parsePositiveMinutes("0", "--poll-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("abc", "--poll-min")).toThrow(/positive finite/);
    });
  });

  describe("bus publish (slice 4)", () => {
    test("publishes work-assignment envelope for each ready row up to maxAssignments", () => {
      const captured: FakeAssignmentCall[] = [];
      const result = pollOnce(
        { ...DEFAULT_CONFIG, maxAssignments: 2 },
        fakeAdapters(
          "2026-05-13T18:00:00Z",
          [ROW_OPEN_NO_DEPS, ROW_CLOSED, ROW_OPEN_DEPS_SATISFIED],
          captured,
        ),
      );
      expect(result.readyRowsFound).toBe(2);
      expect(result.publishedEnvelopeIds).toHaveLength(2);
      expect(captured).toHaveLength(2);
      expect(captured[0]!.from).toBe("otto");
      expect(captured[0]!.to).toBe("*");
      expect(captured[0]!.rowId).toBe("B-9001");
      expect(captured[0]!.priority).toBe("P1");
      expect(captured[0]!.rationale).toContain("Ready-to-grind");
    });

    test("does NOT publish when noPublish: true (dry-run)", () => {
      const captured: FakeAssignmentCall[] = [];
      const result = pollOnce(
        { ...DEFAULT_CONFIG, noPublish: true },
        fakeAdapters("2026-05-13T18:00:00Z", [ROW_OPEN_NO_DEPS], captured),
      );
      expect(result.readyRowsFound).toBe(1);
      expect(result.publishedEnvelopeIds).toHaveLength(0);
      expect(captured).toHaveLength(0);
      expect(result.note).toContain("publish skipped");
    });

    test("does NOT publish when ALL open rows have unsatisfied deps (no readies)", () => {
      // Only ROW_OPEN_DEPS_UNSATISFIED is in this set — its dep (B-9999)
      // isn't in the scan, so it's dangling/unsatisfied → not ready.
      const captured: FakeAssignmentCall[] = [];
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", [ROW_OPEN_DEPS_UNSATISFIED], captured),
      );
      expect(result.readyRowsFound).toBe(0);
      expect(result.publishedEnvelopeIds).toHaveLength(0);
      expect(captured).toHaveLength(0);
    });

    test("caps published envelopes at maxAssignments even with many ready rows", () => {
      const captured: FakeAssignmentCall[] = [];
      const manyRows: BacklogRow[] = Array.from({ length: 10 }, (_, i) => ({
        id: `B-${String(8000 + i).padStart(4, "0")}`,
        priority: "P2",
        status: "open",
        dependsOn: [],
        filename: `B-${String(8000 + i).padStart(4, "0")}.md`,
      }));
      const result = pollOnce(
        { ...DEFAULT_CONFIG, maxAssignments: 3 },
        fakeAdapters("2026-05-13T18:00:00Z", manyRows, captured),
      );
      expect(result.readyRowsFound).toBe(10);
      expect(result.publishedEnvelopeIds).toHaveLength(3);
      expect(captured).toHaveLength(3);
    });
  });

  describe("parseArgs", () => {
    test("default config when no args", () => {
      expect(parseArgs([])).toEqual(DEFAULT_CONFIG);
    });

    test("--once flag", () => {
      expect(parseArgs(["--once"]).once).toBe(true);
    });

    test("--poll-min + --backlog-dir set values", () => {
      const config = parseArgs(["--poll-min", "20", "--backlog-dir", "/custom"]);
      expect(config.pollIntervalMin).toBe(20);
      expect(config.backlogDir).toBe("/custom");
    });

    test("--no-publish + --agent + --to + --max-assignments", () => {
      const config = parseArgs([
        "--no-publish",
        "--agent", "vera",
        "--to", "lior",
        "--max-assignments", "5",
      ]);
      expect(config.noPublish).toBe(true);
      expect(config.fromAgent).toBe("vera");
      expect(config.toAgent).toBe("lior");
      expect(config.maxAssignments).toBe(5);
    });

    test("rejects unknown flags", () => {
      expect(() => parseArgs(["--unknown"])).toThrow(/unknown flag/);
    });

    test("rejects --backlog-dir without value", () => {
      expect(() => parseArgs(["--backlog-dir"])).toThrow(/requires a value/);
    });
  });
});
