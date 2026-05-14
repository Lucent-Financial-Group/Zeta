import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  findMd032Violations,
  checkFiles,
  globToRegex,
  loadMarkdownlintIgnores,
  stagedMarkdownFiles,
} from "./check-md032-blanks-around-lists.ts";

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

describe("findMd032Violations — round 12", () => {
  test("ATX heading between two lists terminates the first list (pre-CI review P1 on PR #3075 round 12)", () => {
    // CommonMark: a heading terminates the prior list. The second
    // bullet starts a new list and needs a blank line; MD032 fires
    // because the predecessor is the heading.
    const content = `# Title

- item a

## Heading
- item b
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(6);
  });

  test("heading immediately followed by list (no blank between blank-before-heading and the list line) fires MD032", () => {
    const content = `- item a
## Heading
- item b
`;
    const findings = findMd032Violations(content);
    // Two MD032 hits:
    // - line 2 `## Heading` after `- item a`: heading right after list, no blank — but MD032 is about LISTS not headings, so this isn't flagged HERE.
    // - line 3 `- item b` after the heading: a new list with non-blank predecessor.
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(3);
  });

  test("fenced code inside blockquote is recognised (pre-CI review P1 on PR #3075 round 12)", () => {
    // A `> \`\`\`` line opens a blockquoted fenced code block.
    // List-like content inside (`> Label:` / `> - item`) must NOT
    // fire MD032 because markdownlint treats it as code.
    const content = `# Title

> Sample:
>
> \`\`\`
> Label:
> - item
> \`\`\`
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("indented fence inside list-item-body still keeps list context (round-10 preservation)", () => {
    // The round-10 case must remain clean: an indented fence is a
    // child block of the list-item; the sibling bullet that follows
    // is part of the same list.
    const content = `# Title

- item one
  \`\`\`
  code inside item
  \`\`\`
- item two
`;
    expect(findMd032Violations(content)).toEqual([]);
  });
});

describe("findMd032Violations — round 10", () => {
  test("indented fence inside a list item does not split the list (pre-CI review P1 on PR #3075 round 10)", () => {
    // A fenced code block can be a child block inside a list item.
    // Markdownlint does not require a blank line before the sibling
    // bullet that follows the fence-close — the bullets are siblings
    // of the same list. The earlier algorithm reset `inList = false`
    // on fence transitions, which made the second bullet look like
    // a new list with non-blank fence-close predecessor.
    const content = `# Title

- item one
  \`\`\`
  code inside item
  \`\`\`
- item two
- item three
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("flush-left fence between bullets DOES split the list (pre-CI review P1 on PR #3075 round 12 — refines round 10)", () => {
    // CommonMark: a flush-left (non-indented) fenced block is a
    // top-level block that terminates the surrounding list. The
    // second bullet that follows the fence-close is the start of a
    // new list and requires a blank line — markdownlint MD032 fires.
    // The round-10 test that asserted clean was the false negative
    // (round-12 review caught it).
    const content = `# Title

- item one
\`\`\`
code at flush-left between bullets
\`\`\`
- item two
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    // Line 7 is "- item two" — the new-list-start after the fence-close.
    expect(findings[0]?.line).toBe(7);
  });
});

describe("findMd032Violations — round 9", () => {
  test("blockquoted list with label directly above IS flagged (pre-CI review P1 on PR #3075 round 9)", () => {
    // markdownlint MD032 enforces blanks around lists even inside
    // blockquotes. `> Label:` followed by `> - item` must fire.
    const content = `# Title

> Label:
> - item one
> - item two
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  test("blockquoted list preceded by blockquoted blank line is clean", () => {
    // A `>` (or `> `) line is the blockquote-equivalent of a blank
    // and properly separates the label from the list.
    const content = `# Title

> Label:
>
> - item one
> - item two
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("blockquoted ordered-list (`> 1.` / `> 1)`) is detected", () => {
    const content = `# Title

> Steps:
> 1) first
> 2) second
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  test("nested blockquote list is detected", () => {
    // Double-`>` prefix; same rule applies.
    const content = `# Title

> > Label:
> > - nested item
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  test("blockquoted list starting after blank line is clean (control)", () => {
    const content = `# Title

> - item one
> - item two

More prose.
`;
    expect(findMd032Violations(content)).toEqual([]);
  });
});

describe("findMd032Violations — round 8", () => {
  test("lazy (unindented) continuation does not split the list (pre-CI review P1 on PR #3075 round 8)", () => {
    // CommonMark allows a list-item paragraph to span multiple lines
    // including unindented continuations. The second bullet here is
    // part of the SAME list as the first, so no MD032 should fire.
    const content = `# Title

- first line
continued text wraps unindented
- next item
- third item
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("10+ digit numeric prefix is NOT an ordered-list marker (pre-CI review P1 on PR #3075 round 8)", () => {
    // CommonMark caps ordered-list markers at 1-9 digits. A label
    // followed by `1234567890. value` is plain prose, not a list, so
    // markdownlint does not flag it — neither should this helper.
    const content = `# Title

Some prose:
1234567890. value (not a list per CommonMark — 10 digits exceeds cap)
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("9-digit numeric prefix IS still detected (boundary)", () => {
    // The cap is inclusive at 9 digits; this MUST still fire.
    const content = `# Title

Steps:
123456789. nine-digit step
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  test("backtick fence with backtick in info string is NOT a valid opener (pre-CI review P1 on PR #3075 round 8)", () => {
    // CommonMark: a backtick fence's info string must not contain a
    // backtick. A line like ` ```ts`extra ` is NOT a fence opener;
    // treating it as one would suppress real MD032 findings in the
    // prose that follows. With the fix, the list-start that follows
    // the (invalid) fence line + prose still fires MD032.
    const content = `# Title

\`\`\`ts\`bad
- prose bullet, NOT inside a fence
- second bullet
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    // Line 4 is `- prose bullet` immediately after the invalid
    // "fence" line (which is plain prose under the new rule).
    expect(findings[0]?.line).toBe(4);
  });

  test("tilde fence WITH tilde in info string IS a valid opener (pre-CI review P1 on PR #3075 round 10 — refines round 8)", () => {
    // CommonMark: only BACKTICK fences forbid the fence char in the
    // info string. Tilde fences may contain tildes in their info
    // string. A `~~~text~bad` line opens a valid tilde-fenced block;
    // list-like content inside it must NOT fire MD032.
    const content = `# Title

~~~text~bad
- this is INSIDE a valid tilde-fenced block, not a list
- second pseudo-bullet
~~~
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("backtick fence with non-backtick info string IS still a valid opener (control)", () => {
    // A plain info string like `ts` (no backticks) is a valid fence
    // opener; list-like content inside MUST NOT fire MD032.
    const content = `# Title

\`\`\`ts
function foo() {}
- this is inside a code fence and must NOT be flagged
\`\`\`
`;
    expect(findMd032Violations(content)).toEqual([]);
  });
});

describe("findMd032Violations — round 7", () => {
  test("YAML front matter is skipped (pre-CI review P2 on PR #3075 round 7)", () => {
    // markdownlint treats the YAML block between leading `---` fences
    // as metadata, not as Markdown content. List-like front-matter keys
    // (e.g., `tags:` followed by `- item`) must not fire MD032.
    const content = `---
tick: 2026-05-14T01:30Z
tags:
- alpha
- beta
- gamma
---

# Real Title

Real prose with no lists.
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("front matter does NOT mask a real MD032 in body content", () => {
    // A `Label:` then `- bullet` AFTER the front matter is still
    // flagged — only the front-matter block itself is exempt.
    const content = `---
title: foo
---

Body label:
- bullet
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(6);
  });

  test("list immediately after closing front-matter `---` is treated as start-of-content (no false positive)", () => {
    // The line right after the YAML block is conceptually "start of
    // content"; a list there must NOT be flagged as missing-blank-line
    // against the closing `---`.
    const content = `---
title: foo
---
- first body item
- second body item
`;
    expect(findMd032Violations(content)).toEqual([]);
  });

  test("a leading `---` without a closing fence is NOT treated as front matter", () => {
    // Defensive: if the first line is `---` but no closing `---` exists
    // (the file is malformed or just happens to start with a thematic
    // break), the scanner falls back to whole-file scanning.
    const content = `---

Body label:
- bullet
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });
});

describe("findMd032Violations — round 6", () => {
  test("paren ordered-list marker (`1)`) is detected (pre-CI review P1 on PR #3075 round 6)", () => {
    // markdownlint + CommonMark treat both `1.` and `1)` as ordered-
    // list markers. The earlier regex `\d+\.` only matched the dot
    // form, so a `Label:` followed by `1) item` would fail MD032 in
    // CI but pass this pre-check.
    const content = `# Title

Steps:
1) first step
2) second step
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  test("multi-digit paren marker is also detected", () => {
    const content = `# Title

Steps:
12) step twelve
13) step thirteen
`;
    const findings = findMd032Violations(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });
});

describe("checkFiles", () => {
  test("unreadable files are skipped without crashing (default mode)", () => {
    const result = checkFiles(["/nonexistent/path/that/does/not/exist.md"]);
    expect(result).toEqual([]);
  });

  test("surfaceReadErrors=true throws on unreadable file (pre-CI review P2 on PR #3075 round 6)", () => {
    // The default silent-skip mode is for `--staged` (CI surfaces the
    // I/O error). When the caller explicitly opted in via the
    // `surfaceReadErrors` flag (used by `main()` for explicit CLI
    // file args), an unreadable file must throw so a typo doesn't
    // exit 0 with "no findings."
    expect(() =>
      checkFiles(["/nonexistent/path/that/does/not/exist.md"], true),
    ).toThrow(/Cannot read/);
  });
});

describe("globToRegex", () => {
  test("`**` matches any depth", () => {
    const re = globToRegex("memory/**");
    expect(re.test("memory/file.md")).toBe(true);
    expect(re.test("memory/persona/x/y/z.md")).toBe(true);
    expect(re.test("docs/memory/file.md")).toBe(false);
  });

  test("single `*` matches one path segment, not `/`", () => {
    const re = globToRegex("docs/research/2026-*-*.md");
    expect(re.test("docs/research/2026-05-13-foo.md")).toBe(true);
    expect(re.test("docs/research/2026foo.md")).toBe(false); // no `-` separators after `2026`
    expect(re.test("docs/research/sub/2026-05-13-foo.md")).toBe(false);
  });

  test("literal dots are escaped", () => {
    const re = globToRegex("file.md");
    expect(re.test("file.md")).toBe(true);
    expect(re.test("fileXmd")).toBe(false);
  });
});

describe("loadMarkdownlintIgnores + stagedMarkdownFiles", () => {
  test("loadMarkdownlintIgnores returns [] when config absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "md032-test-"));
    try {
      expect(loadMarkdownlintIgnores(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("loadMarkdownlintIgnores parses JSONC with line comments", () => {
    const dir = mkdtempSync(join(tmpdir(), "md032-test-"));
    try {
      writeFileSync(
        join(dir, ".markdownlint-cli2.jsonc"),
        `// header comment\n{\n  "ignores": [\n    // ignore agent logs\n    "memory/**",\n    "docs/pr-preservation/**"\n  ]\n}\n`,
      );
      expect(loadMarkdownlintIgnores(dir)).toEqual([
        "memory/**",
        "docs/pr-preservation/**",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("stagedMarkdownFiles throws on bad repo path (pre-CI review P2 on PR #3075 round 6)", () => {
    // A `git -C <nonexistent>` invocation fails with a non-zero
    // status; the helper must throw rather than silently treat the
    // gate as "no staged .md files" (the failure mode the round-2
    // fix originally addressed; this test prevents regression).
    expect(() =>
      stagedMarkdownFiles("/nonexistent/dir/that/is/not/a/repo"),
    ).toThrow(/git diff --cached failed/);
  });

  test("stagedMarkdownFiles applies ignore globs (pre-CI review P1 on PR #3075 round 6)", () => {
    // Build a temp git repo with two staged .md files: one in an
    // ignored subtree (`memory/`) and one in a scanned subtree
    // (`docs/`). The helper must return only the scanned one.
    const dir = mkdtempSync(join(tmpdir(), "md032-test-repo-"));
    try {
      // Initialize a minimal git repo + minimal config (module-scope
      // `spawnSync` import — the in-test `require()` call previously
      // here violated `@typescript-eslint/no-require-imports` per
      // pre-CI review P1 on PR #3075 round 11).
      spawnSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
      spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
      spawnSync("git", ["config", "user.name", "test"], { cwd: dir });

      writeFileSync(
        join(dir, ".markdownlint-cli2.jsonc"),
        `{ "ignores": ["memory/**"] }\n`,
      );

      mkdirSync(join(dir, "memory"), { recursive: true });
      mkdirSync(join(dir, "docs"), { recursive: true });
      writeFileSync(join(dir, "memory", "ignored.md"), "# Ignored\n");
      writeFileSync(join(dir, "docs", "scanned.md"), "# Scanned\n");

      spawnSync("git", ["add", "memory/ignored.md", "docs/scanned.md"], { cwd: dir });

      const result = stagedMarkdownFiles(dir);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(`${dir}/docs/scanned.md`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
