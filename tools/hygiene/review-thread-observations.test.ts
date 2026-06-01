import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_OBSERVATION_STORE_REL_PATH,
  loadObservationStore,
  parseArgs,
  recordReviewThreadObservation,
} from "./review-thread-observations.ts";
import type { ReviewThreadObservation } from "./divergence-shard.ts";

const TICK = "2026-06-01T11:09:00Z";
const AUTH = 'aaron 2026-05-14: "- **Devil-pole** (edge-runner drive): keep pushing"';

function withTempRoot(fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "review-observation-test-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function observation(
  agent: string,
  conclusion: string,
  overrides: Partial<ReviewThreadObservation> = {},
): ReviewThreadObservation {
  return {
    identity: {
      agent,
      model: agent === "otto" ? "claude-opus-4-8" : "gpt-5.5",
      harness: agent === "otto" ? "claude-code" : "codex",
    },
    prNumber: 4147,
    threadId: "PRRT_kwExample",
    conclusion,
    body: `${agent} evidence for ${conclusion}.`,
    ...overrides,
  };
}

describe("recordReviewThreadObservation", () => {
  test("records the first observation without filing a divergence shard", () => {
    withTempRoot((root) => {
      const result = recordReviewThreadObservation({
        repoRoot: root,
        observedAt: TICK,
        tick: TICK,
        operativeAuthorization: AUTH,
        observation: observation("otto", "resolve"),
      });

      expect(result.compared).toBe(0);
      expect(result.filed).toEqual([]);
      expect(result.noDisagreements).toEqual([]);
      const store = loadObservationStore(root);
      expect(store.observations).toHaveLength(1);
      expect(existsSync(join(root, "docs/hygiene-history/divergences"))).toBe(false);
    });
  });

  test("files a divergence when another loop disagrees on the same review thread", () => {
    withTempRoot((root) => {
      recordReviewThreadObservation({
        repoRoot: root,
        observedAt: TICK,
        tick: TICK,
        operativeAuthorization: AUTH,
        observation: observation("otto", "resolve"),
      });

      const result = recordReviewThreadObservation({
        repoRoot: root,
        observedAt: "2026-06-01T11:10:00Z",
        tick: "2026-06-01T11:10:00Z",
        operativeAuthorization: AUTH,
        observation: observation("codex-loop", "needs-fix"),
      });

      expect(result.compared).toBe(1);
      expect(result.filed).toHaveLength(1);
      const filed = result.filed[0]!;
      expect(filed.prior.observation.identity.agent).toBe("otto");
      expect(filed.outcome.write.status).toBe("written");
      const shard = readFileSync(join(root, filed.outcome.write.relPath), "utf8");
      expect(shard).toContain("Conclusion: resolve");
      expect(shard).toContain("Conclusion: needs-fix");
      expect(loadObservationStore(root).observations).toHaveLength(2);
    });
  });

  test("records a same-conclusion second loop without filing", () => {
    withTempRoot((root) => {
      recordReviewThreadObservation({
        repoRoot: root,
        observedAt: TICK,
        tick: TICK,
        operativeAuthorization: AUTH,
        observation: observation("otto", "resolve"),
      });

      const result = recordReviewThreadObservation({
        repoRoot: root,
        observedAt: "2026-06-01T11:10:00Z",
        tick: "2026-06-01T11:10:00Z",
        operativeAuthorization: AUTH,
        observation: observation("codex-loop", " Resolve "),
      });

      expect(result.compared).toBe(1);
      expect(result.filed).toEqual([]);
      expect(result.noDisagreements).toEqual([
        {
          prior: result.noDisagreements[0]!.prior,
          reason: "same-conclusion",
        },
      ]);
      expect(existsSync(join(root, "docs/hygiene-history/divergences"))).toBe(false);
    });
  });

  test("does not compare observations from different review threads", () => {
    withTempRoot((root) => {
      recordReviewThreadObservation({
        repoRoot: root,
        observedAt: TICK,
        tick: TICK,
        operativeAuthorization: AUTH,
        observation: observation("otto", "resolve"),
      });

      const result = recordReviewThreadObservation({
        repoRoot: root,
        observedAt: "2026-06-01T11:10:00Z",
        tick: "2026-06-01T11:10:00Z",
        operativeAuthorization: AUTH,
        observation: observation("codex-loop", "needs-fix", { threadId: "PRRT_other" }),
      });

      expect(result.compared).toBe(0);
      expect(result.filed).toEqual([]);
      expect(loadObservationStore(root).observations).toHaveLength(2);
    });
  });

  test("uses a caller-provided store path", () => {
    withTempRoot((root) => {
      const storeRelPath = "tmp/review-observations.json";
      recordReviewThreadObservation({
        repoRoot: root,
        storeRelPath,
        observedAt: TICK,
        tick: TICK,
        operativeAuthorization: AUTH,
        observation: observation("otto", "resolve"),
      });

      expect(existsSync(join(root, DEFAULT_OBSERVATION_STORE_REL_PATH))).toBe(false);
      expect(loadObservationStore(root, storeRelPath).observations).toHaveLength(1);
    });
  });

  test("rejects malformed observations before writing the store", () => {
    withTempRoot((root) => {
      expect(() =>
        recordReviewThreadObservation({
          repoRoot: root,
          observedAt: TICK,
          tick: TICK,
          operativeAuthorization: AUTH,
          observation: observation("otto", "resolve", { body: " " }),
        }),
      ).toThrow(/body/);
      expect(existsSync(join(root, DEFAULT_OBSERVATION_STORE_REL_PATH))).toBe(false);
    });
  });
});

describe("parseArgs", () => {
  test("parses the CLI-shaped observation payload", () => {
    const parsed = parseArgs([
      "--repo-root",
      "/repo",
      "--tick",
      TICK,
      "--operative-authorization",
      AUTH,
      "--agent",
      "codex-loop",
      "--model",
      "gpt-5.5",
      "--harness",
      "codex",
      "--pr-number",
      "4147",
      "--thread-id",
      "PRRT_kwExample",
      "--conclusion",
      "needs-fix",
      "--body",
      "lint reproduces locally",
    ]);

    expect(parsed.kind).toBe("args");
    if (parsed.kind === "args") {
      expect(parsed.input.repoRoot).toBe("/repo");
      expect(parsed.input.observation.prNumber).toBe(4147);
      expect(parsed.input.observation.identity.agent).toBe("codex-loop");
      expect(parsed.input.observedAt).toBe(TICK);
    }
  });

  test("rejects a non-numeric PR number", () => {
    const parsed = parseArgs([
      "--tick",
      TICK,
      "--operative-authorization",
      AUTH,
      "--agent",
      "codex-loop",
      "--model",
      "gpt-5.5",
      "--harness",
      "codex",
      "--pr-number",
      "nope",
      "--thread-id",
      "PRRT_kwExample",
      "--conclusion",
      "needs-fix",
      "--body",
      "lint reproduces locally",
    ]);
    expect(parsed.kind).toBe("error");
    if (parsed.kind === "error") {
      expect(parsed.message).toContain("--pr-number must be a positive integer");
    }
  });
});
