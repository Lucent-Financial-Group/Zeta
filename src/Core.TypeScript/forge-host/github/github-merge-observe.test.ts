import { describe, expect, test } from "bun:test";
import { ok } from "../result";
import type { GithubRest } from "./github-pr-rest.ts";
import {
  MERGE_OBSERVE_QUERY,
  mapMergeObserve,
  mapOpenPullRequests,
  mergeObserveRequest,
  observeMerge,
  observeOpenPullRequests,
} from "./github-merge-observe.ts";

function envelope(over: Record<string, unknown>): string {
  return JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          number: 42,
          state: "OPEN",
          mergeStateStatus: "CLEAN",
          autoMergeRequest: null,
          mergeCommit: null,
          reviewThreads: { nodes: [] },
          commits: { nodes: [{ commit: { statusCheckRollup: { contexts: { nodes: [] } } } }] },
          ...over,
        },
      },
    },
  });
}

describe("mergeObserveRequest", () => {
  test("is one POST graphql with owner/name/number — never a second required-checks call", () => {
    const call = mergeObserveRequest("Lucent-Financial-Group/Zeta", 15694);
    expect(call.ok).toBe(true);
    if (!call.ok) return;
    expect(call.value).toEqual({
      method: "POST",
      path: "graphql",
      query: MERGE_OBSERVE_QUERY,
      variables: { owner: "Lucent-Financial-Group", name: "Zeta", number: 15694 },
    });
    expect(call.value.query.includes("statusCheckRollup")).toBe(true);
    expect(call.value.query.includes("reviewThreads")).toBe(true);
  });

  test("rejects a bad nwo without touching the network", () => {
    expect(mergeObserveRequest("nope", 1).ok).toBe(false);
  });
});

describe("mapMergeObserve", () => {
  test("CLEAN + no threads + no pending checks → gate clean, next none", () => {
    const got = mapMergeObserve(envelope({}));
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.value.gate).toBe("clean");
    expect(got.value.nextAction).toBe("none");
    expect(got.value.unresolvedThreads).toBe(0);
    expect(got.value.autoMerge).toBe("none");
  });

  test("failed CheckRun → fix-failed-checks, one observation not two polls", () => {
    const got = mapMergeObserve(
      envelope({
        mergeStateStatus: "BLOCKED",
        commits: {
          nodes: [
            {
              commit: {
                statusCheckRollup: {
                  // The REAL shape GitHub returns: `contexts` is a connection, so the union nodes
                  // live under `nodes`. The old double said `contexts: [...]` — the same wrong shape
                  // the query had — so this test agreed with the bug instead of catching it.
                  contexts: {
                    nodes: [{ __typename: "CheckRun", name: "lint (TS)", status: "COMPLETED", conclusion: "FAILURE" }],
                  },
                },
              },
            },
          ],
        },
      }),
    );
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.value.checks.failed).toBe(1);
    expect(got.value.nextAction).toBe("fix-failed-checks");
    expect(got.value.gate).toBe("blocked");
  });

  test("unresolved review thread → resolve-threads", () => {
    const got = mapMergeObserve(
      envelope({
        mergeStateStatus: "BLOCKED",
        reviewThreads: { nodes: [{ isResolved: false }, { isResolved: true }] },
      }),
    );
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.value.unresolvedThreads).toBe(1);
    expect(got.value.nextAction).toBe("resolve-threads");
  });

  test("BEHIND → rebase", () => {
    const got = mapMergeObserve(envelope({ mergeStateStatus: "BEHIND" }));
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.value.gate).toBe("dirty");
    expect(got.value.nextAction).toBe("rebase");
  });
});

describe("mapOpenPullRequests", () => {
  test("one GraphQL list carries mergeStateStatus so World.forgeState.cleanPrCount can be non-zero", () => {
    const got = mapOpenPullRequests(
      JSON.stringify({
        data: {
          repository: {
            pullRequests: {
              nodes: [
                {
                  number: 1,
                  title: "clean",
                  mergeStateStatus: "CLEAN",
                  url: "u",
                  updatedAt: "t",
                  isDraft: false,
                  headRefName: "a",
                  baseRefName: "main",
                  author: { login: "ace" },
                  reviewDecision: "APPROVED",
                },
                {
                  number: 2,
                  title: "blocked",
                  mergeStateStatus: "BLOCKED",
                  url: "u2",
                  updatedAt: "t",
                  isDraft: false,
                  headRefName: "b",
                  baseRefName: "main",
                  author: { login: "ace" },
                  reviewDecision: null,
                },
              ],
            },
          },
        },
      }),
    );
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.value).toHaveLength(2);
    expect(got.value[0]?.mergeStateStatus).toBe("clean");
    expect(got.value[0]?.reviewDecision).toBe("approved");
    expect(got.value[1]?.mergeStateStatus).toBe("blocked");
  });
});

describe("observeOpenPullRequests", () => {
  test("issues exactly one graphql POST", async () => {
    const calls: { method: string; path: string }[] = [];
    const rest: GithubRest = {
      request: (method, path) => {
        calls.push({ method, path });
        return Promise.resolve(ok(JSON.stringify({ data: { repository: { pullRequests: { nodes: [] } } } })));
      },
    };
    const got = await observeOpenPullRequests(rest, "o/r", 20);
    expect(got.ok).toBe(true);
    expect(calls).toEqual([{ method: "POST", path: "graphql" }]);
  });
});

describe("observeMerge", () => {
  test("issues exactly one graphql POST — the cost bound", async () => {
    const calls: { method: string; path: string }[] = [];
    const rest: GithubRest = {
      request: (method, path) => {
        calls.push({ method, path });
        return Promise.resolve(ok(envelope({})));
      },
    };
    const got = await observeMerge(rest, "o/r", 1);
    expect(got.ok).toBe(true);
    expect(calls).toEqual([{ method: "POST", path: "graphql" }]);
  });
});

describe("MERGE_OBSERVE_QUERY — the shape GitHub will actually accept", () => {
  test("a union type condition is applied to the NODE, never to the connection", () => {
    // The defect: `contexts { ... on CheckRun { ... } }`. `contexts` is a
    // StatusCheckRollupContextConnection, so GitHub refuses the WHOLE query with
    // "Fragment on CheckRun cannot be spread inside StatusCheckRollupContextConnection" — every
    // call, for every PR. No unit double could catch it: a double written from the implementation
    // reproduces the implementation own idea of the shape, which is exactly what happened here.
    // This asserts on the QUERY TEXT instead, which is the part the server judges.
    const at = MERGE_OBSERVE_QUERY.indexOf("contexts");
    expect(at).toBeGreaterThan(-1);
    const rest = MERGE_OBSERVE_QUERY.slice(at);
    const nodesAt = rest.indexOf("nodes {");
    const spreadAt = rest.indexOf("... on CheckRun");
    expect(nodesAt).toBeGreaterThan(-1);
    expect(spreadAt).toBeGreaterThan(-1);
    // The type condition must come AFTER the node traversal, never directly inside the connection.
    expect(spreadAt).toBeGreaterThan(nodesAt);
  });

  test("the connection is paginated rather than unbounded", () => {
    expect(MERGE_OBSERVE_QUERY).toContain("contexts(first:");
  });

  test("__typename is requested, so a union node stays distinguishable after parsing", () => {
    expect(MERGE_OBSERVE_QUERY).toContain("__typename");
  });
});
