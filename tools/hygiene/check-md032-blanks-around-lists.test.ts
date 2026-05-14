import { describe, expect, test } from "bun:test";
import { findMd032Violations, checkFiles } from "./check-md032-blanks-around-lists.ts";

describe("findMd032Violations", () => {
  test("clean shard (every list preceded by a blank line)", () => {
    const content = `# Title

Some prose.

- item one
- item two

More prose.

1. numbered
2. items
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("single bullet violation (label then bullet, no blank)", () => {
    // The 2228Z shard pattern from PR #3044.
    const content = `# Title

Two PRs in flight, both auto-merge armed:
- **#3043** B-0444 worktree-field
- **#3044** lost-row recovery
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
    expect(findings[0]?.context).toContain("**#3043**");
  });

  test("single numbered-list violation (label then 1., no blank)", () => {
    // The 0024Z shard pattern from PR #3065.
    const content = `## Why

The rate-limit-class failures are NOT my code. They're transient
infra issues that resolve when:
1. The installation-level rate-limit window resets
2. CI re-runs on the branch-updated tip
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(5);
  });

  test("multiple MD032 risks in one file are all flagged", () => {
    const content = `# Title

First label:
- item one
- item two

Second label:
1. numbered one
2. numbered two
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(2);
    expect(findings[0]?.line).toBe(4);
    expect(findings[1]?.line).toBe(8);
  });

  test("shard with no lists is clean", () => {
    const content = `# Title

Just some prose.

More prose with no lists at all.
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("list-without-preceding-label (list starts a section) is clean", () => {
    // No label sentence before the list — should NOT flag.
    const content = `# Title

- item one
- item two

More prose.
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("heading directly followed by list is clean (heading is list-friendly)", () => {
    // Markdown allows a list immediately after a heading without a blank
    // line — markdownlint by default permits this and we follow.
    const content = `## Heading

# Top-Level
- item one
- item two
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("nested list (list-item then deeper list) is clean", () => {
    const content = `# Title

- top item
  - nested item
  - another nested
- next top item
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("plus-space marker is detected (the 0100Z pattern)", () => {
    // PR #3065 hit this: "tick shards\n+ memory + ..." where the second
    // line started with `+ ` which markdown parses as a list marker.
    const content = `# Title

Total findings this session:
+ memory file mentions
+ backlog row mentions
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  test("asterisk-space marker is detected", () => {
    const content = `# Title

Items below:
* asterisk item
* another
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  test("multi-digit numbered list is detected", () => {
    const content = `# Title

Steps:
12. step twelve
13. step thirteen
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });
});

describe("checkFiles", () => {
  test("unreadable files are skipped without crashing", () => {
    const result = checkFiles(["/nonexistent/path/that/does/not/exist.md"], "/tmp");
    expect(result).toEqual([]);
  });
});
