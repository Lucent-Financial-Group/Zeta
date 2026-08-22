// Falsifiers for the retraction commit message (`retraction-actuator.ts`).
//
// WHY THIS IS ON THE COMMIT AND NOT ONLY THE PR BODY. The repository's
// `squash_merge_commit_message` is COMMIT_MESSAGES, so what lands on `main` is built
// from the branch's commit messages, not from the PR body. `git revert` writes no
// trailers of its own, so before 2026-08-22 a retraction would have arrived unsigned.
//
// The actuator's push path cannot be exercised end-to-end here — `push_retraction` is
// only emitted after `main` has been red for several consecutive ticks with no fleet
// heal in flight — so what IS testable is tested, and the rest is named as untested in
// the change that introduced it rather than implied to be covered.

import { describe, expect, test } from "bun:test";

import { isFullCommitSha, retractionCommitMessage } from "./retraction-actuator.ts";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const msg = retractionCommitMessage(SHA, "ep-012345678", 3);

describe("retractionCommitMessage", () => {
  test("the signature block is the FINAL paragraph, contiguous", () => {
    // git's trailer parser reads only the last blank-line-delimited paragraph, so a
    // blank line inside the block silently drops everything above it (the Trailer
    // Contiguity Survival Failure). This is the assertion that catches that.
    const paragraphs = msg.split("\n\n");
    const last = paragraphs[paragraphs.length - 1] ?? "";
    expect(last.startsWith("Agency-Signature-Version: 1")).toBe(true);
    for (const line of last.split("\n")) {
      expect(line).toMatch(/^[A-Za-z-]+: /);
    }
  });

  test("carries all ten AgencySignature v1 keys plus Co-authored-by", () => {
    for (const key of [
      "Agency-Signature-Version",
      "Agent",
      "Agent-Runtime",
      "Agent-Model",
      "Credential-Identity",
      "Credential-Mode",
      "Human-Review",
      "Human-Review-Evidence",
      "Action-Mode",
      "Task",
      "Co-authored-by",
    ]) {
      expect(msg).toContain(`${key}: `);
    }
  });

  test("Credential-Mode is a member of the enum — `none` is not a value", () => {
    const mode = /^Credential-Mode: (.+)$/m.exec(msg)?.[1];
    // Assert presence separately: a MISSING key and an INVALID key are different
    // defects, and `String(undefined)` would otherwise report the wrong one.
    expect(mode).toBeDefined();
    expect(["shared", "dedicated-agent", "operator-delegated", "human-only", "unknown"]).toContain(String(mode));
  });

  test("Action-Mode is fail-CLOSED — the actuator stands down rather than proceeding", () => {
    // Not cosmetic: `push_result: pushed=false` is a real transition in the state
    // machine, so claiming fail-open here would misdescribe what the lane does.
    expect(msg).toContain("Action-Mode: autonomous-fail-closed");
  });

  test("names the reverted commit in full, so the retraction is traceable from `main`", () => {
    expect(msg).toContain(`This reverts commit ${SHA}.`);
  });

  test("carries NO CI-skip token — that would strand the PR forever", () => {
    // On the old direct-push route `[skip ci]` was harmless. On this route it would
    // suppress the `pull_request` run of `gate`, the required check would never report,
    // and the PR could never merge. `flush-via-staging.assertNoSkipCi` refuses such a
    // message; this pins that the actuator never produces one.
    expect(msg).not.toMatch(/\[(skip ci|ci skip|skip actions|actions skip)\]/i);
  });

  test("the subject line stays within a readable git subject budget", () => {
    expect((msg.split("\n")[0] ?? "").length).toBeLessThanOrEqual(100);
  });
});

describe("isFullCommitSha — the guard between the network and a shell command", () => {
  test("accepts a full 40-hex object name", () => {
    expect(isFullCommitSha(SHA)).toBe(true);
  });

  test("rejects an abbreviated sha — the value is interpolated, so partial is not enough", () => {
    expect(isFullCommitSha(SHA.slice(0, 9))).toBe(false);
  });

  test("rejects shell metacharacters", () => {
    // The value reaches `git revert --no-commit <sha>` as a shell string. This is the
    // assertion that makes that safe rather than merely lucky.
    expect(isFullCommitSha(`${SHA}; rm -rf /`)).toBe(false);
    expect(isFullCommitSha("$(whoami)")).toBe(false);
    expect(isFullCommitSha(`${SHA} --force`)).toBe(false);
  });

  test("rejects path traversal — it also becomes a file path", () => {
    expect(isFullCommitSha("../../etc/passwd")).toBe(false);
    expect(isFullCommitSha(`../${SHA.slice(3)}`)).toBe(false);
  });

  test("rejects uppercase hex and empty", () => {
    // Anchored and lowercase-only: git object names are lowercase, and accepting a
    // superset here would weaken the guard for no gain.
    expect(isFullCommitSha(SHA.toUpperCase())).toBe(false);
    expect(isFullCommitSha("")).toBe(false);
  });

  test("is anchored at BOTH ends", () => {
    expect(isFullCommitSha(`x${SHA}`)).toBe(false);
    expect(isFullCommitSha(`${SHA}x`)).toBe(false);
  });
});
