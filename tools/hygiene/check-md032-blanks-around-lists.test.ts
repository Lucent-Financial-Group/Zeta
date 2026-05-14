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

  test("heading directly followed by list produces a finding (MD032 requires blank before list)", () => {
    // markdownlint's blanks-around-lists check requires a blank line
    // before a list even when the preceding line is a heading — treating
    // headings as exempt produces false negatives in CI (pre-CI review
    // P1 on PR #3075 round 2).
    const content = `## Heading

# Top-Level
- item one
- item two
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4); // "- item one" immediately after "# Top-Level"
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

  test("list-like lines inside fenced code blocks are NOT flagged (pre-CI review P2 on PR #3075 round 1)", () => {
    // A documentation example showing the bad pattern inside a code
    // sample should not trip the helper.
    const content = `# Title

Example of the BAD pattern (this is just a code sample):

\`\`\`
Label:
- item one
- item two
\`\`\`

More prose.
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("tilde-fenced code blocks are also respected", () => {
    const content = `# Title

Example:

~~~
Label:
- item one
~~~
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("indent-as-code (4+ spaces) is NOT a list marker per CommonMark (pre-CI review P1 on PR #3075 round 1)", () => {
    // A 4-space-indented line is code, not a list.
    const content = `# Title

Some prose:
    - option (this is a code block, not a list)
    - another option
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("inner fence with different delimiter does NOT close the outer block (pre-CI review P2 on PR #3075 round 2)", () => {
    // A backtick-fenced block holding a literal tilde-fence example
    // must keep the outer block open. The boolean toggle approach
    // would flip out on the inner ~~~ and falsely flag the list-like
    // lines that follow inside the outer block.
    const content = `# Title

\`\`\`
showing a tilde fence inside:
~~~
Label:
- item
~~~
end of example
\`\`\`

Real prose:

- real item
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("inner fence shorter than outer does NOT close it (pre-CI review P2 on PR #3075 round 2)", () => {
    // A four-backtick fence holding an inner three-backtick example
    // must keep the outer block open — the closer needs at least the
    // opener's length.
    const content = `# Title

\`\`\`\`
\`\`\`
Label:
- item
\`\`\`
\`\`\`\`
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("inner same-delimiter fence with info string does NOT close the outer block (pre-CI review P1 on PR #3075 round 4)", () => {
    // Per CommonMark, a closing fence may only be followed by spaces;
    // an info-string suffix (` \`\`\`ts `) is a fence line that the
    // outer block treats as content. Treating any same-delim fence as
    // a closer lets the inner code-sample opener terminate the outer
    // block prematurely and falsely flag the list-like lines that
    // follow inside the outer block.
    const content = `# Title

\`\`\`
showing a nested code-sample with info string:
\`\`\`ts
Label:
- item
\`\`\`
end of example
\`\`\`

Real prose:

- real item
`;
    expect(findMd032Violations(content)).toEqual([]);
  });
});

describe("checkFiles", () => {
  test("unreadable files are skipped without crashing", () => {
    const result = checkFiles(["/nonexistent/path/that/does/not/exist.md"]);
    expect(result).toEqual([]);
  });
});
