import { describe, expect, test } from "bun:test";
import { createGatedReviewPullRequest, type HandoffFetch } from "./proposal-gated-commit-runner";

describe("proposal gated-commit runner handoff", () => {
  test("PGCR-1: branch-to-PR handoff sends the bounded branch and never a repository credential in its body", async () => {
    let captured: RequestInit | undefined;
    const fakeFetch: HandoffFetch = async (_input, init) => {
      captured = init;
      return new Response(null, { status: 201 });
    };
    await createGatedReviewPullRequest({
      token: "pr-only-secret",
      repository: "Lucent-Financial-Group/Zeta",
      branch: "proposal/example",
      proposalId: "example",
      issueNumber: 42,
    }, fakeFetch);
    expect(captured?.method).toBe("POST");
    expect(String(captured?.body)).toContain('"head":"proposal/example"');
    expect(String(captured?.body)).not.toContain("pr-only-secret");
    expect(new Headers(captured?.headers).get("authorization")).toBe("Bearer pr-only-secret");
  });

  test("PGCR-2 FAULT INJECTION: empty PR token yields a credential teaching error before a network request", async () => {
    let called = false;
    const fakeFetch: HandoffFetch = async () => {
      called = true;
      return new Response(null, { status: 201 });
    };
    await expect(createGatedReviewPullRequest({
      token: "",
      repository: "Lucent-Financial-Group/Zeta",
      branch: "proposal/example",
      proposalId: "example",
      issueNumber: 42,
    }, fakeFetch)).rejects.toThrow("Pull requests: write");
    expect(called).toBeFalse();
  });

  test("PGCR-3 FAULT INJECTION: GitHub refusal returns a repairable permission teaching error", async () => {
    const denied: HandoffFetch = async () => new Response(null, { status: 403 });
    await expect(createGatedReviewPullRequest({
      token: "pr-only-secret",
      repository: "Lucent-Financial-Group/Zeta",
      branch: "proposal/example",
      proposalId: "example",
      issueNumber: 42,
    }, denied)).rejects.toThrow("Pull requests: write");
  });
});
