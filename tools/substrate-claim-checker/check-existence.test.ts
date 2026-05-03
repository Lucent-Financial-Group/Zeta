import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findPathClaims, looksLikePath, isFutureStateContext, checkFile } from "./check-existence.ts";

describe("looksLikePath", () => {
  test("recognizes relative paths", () => {
    expect(looksLikePath("docs/research/foo.md")).toBe(true);
    expect(looksLikePath("./tools/setup")).toBe(true);
    expect(looksLikePath("../foo.md")).toBe(true);
  });

  test("rejects URLs and anchors", () => {
    expect(looksLikePath("https://example.com")).toBe(false);
    expect(looksLikePath("#section")).toBe(false);
    expect(looksLikePath("mailto:x@y")).toBe(false);
  });

  test("rejects placeholders", () => {
    expect(looksLikePath("path/<placeholder>/foo")).toBe(false);
    expect(looksLikePath("foo/{name}/bar")).toBe(false);
    expect(looksLikePath("XXX")).toBe(false); // bare placeholder
    expect(looksLikePath("TBD")).toBe(false); // bare placeholder
  });

  test("accepts legitimate filenames containing placeholder words", () => {
    // path/XXX or docs/TODO.md should NOT be rejected by the placeholder
    // filter; only WHOLE-STRING placeholders are rejected. Reviewer-flagged
    // false-positive class on PR #1298.
    expect(looksLikePath("docs/TODO.md")).toBe(true);
    expect(looksLikePath("notes/tbd-changes.md")).toBe(true);
  });

  test("rejects strings with spaces", () => {
    expect(looksLikePath("foo bar")).toBe(false);
  });

  test("rejects absolute paths", () => {
    expect(looksLikePath("/etc/hosts")).toBe(false);
  });

  test("rejects too-short", () => {
    expect(looksLikePath("ab")).toBe(false);
  });

  test("recognizes file-with-extension only", () => {
    expect(looksLikePath("foo.md")).toBe(true);
    expect(looksLikePath("config.json")).toBe(true);
  });
});

describe("isFutureStateContext", () => {
  test("detects (proposed) marker", () => {
    expect(isFutureStateContext("foo `bar.md` *(proposed)*", "", "")).toBe(true);
  });

  test("detects 'would be'", () => {
    expect(isFutureStateContext("the file would be at `bar.md`", "", "")).toBe(true);
  });

  test("detects 'not yet exists'", () => {
    expect(isFutureStateContext("`bar.md` not yet exists", "", "")).toBe(true);
  });

  test("rejects current-state claim", () => {
    expect(isFutureStateContext("the file `bar.md` contains X", "", "")).toBe(false);
  });

  test("checks neighboring lines", () => {
    expect(isFutureStateContext("`bar.md`", "(proposed)", "")).toBe(true);
  });
});

describe("findPathClaims", () => {
  test("finds backtick-quoted paths", () => {
    const lines = ["See `docs/research/foo.md` for details."];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.path).toBe("docs/research/foo.md");
    expect(claims[0]?.line).toBe(1);
  });

  test("finds markdown link targets", () => {
    const lines = ["See [the doc](docs/research/foo.md) for details."];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.path).toBe("docs/research/foo.md");
  });

  test("skips fenced code blocks", () => {
    const lines = [
      "Real path: `docs/foo.md`",
      "```bash",
      "ls `path/inside/fence.md`",
      "```",
      "After: `docs/bar.md`",
    ];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(2);
    expect(claims.map((c) => c.path).sort()).toEqual(["docs/bar.md", "docs/foo.md"]);
  });

  test("skips URLs in markdown links", () => {
    const lines = ["[link](https://example.com/foo)"];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(0);
  });

  test("strips anchor from link target", () => {
    const lines = ["[link](docs/foo.md#section)"];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.path).toBe("docs/foo.md");
  });
});

describe("checkFile", () => {
  test("reports drift for a missing path claim", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-existence-"));
    const tmpFile = join(dir, "test.md");
    try {
      writeFileSync(
        tmpFile,
        `# Test\n\nSee \`docs/this/path/does/not/exist/${Date.now()}.md\` for details.\n`,
      );
      const result = checkFile(tmpFile);
      expect(result.ok).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0]?.pathClaim).toContain("does/not/exist");
    } finally {
      try { unlinkSync(tmpFile); } catch {}
      try { rmdirSync(dir); } catch {}
    }
  });

  test("returns ok=false for missing input file", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-existence-"));
    try {
      const result = checkFile(join(dir, "nonexistent.md"));
      expect(result.ok).toBe(false);
      expect(result.findings).toEqual([]);
    } finally {
      try { rmdirSync(dir); } catch {}
    }
  });

  test("returns ok=false for input that is a directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-existence-"));
    try {
      const result = checkFile(dir);
      expect(result.ok).toBe(false);
      expect(result.findings).toEqual([]);
    } finally {
      try { rmdirSync(dir); } catch {}
    }
  });

  test("clean file produces no findings", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-existence-"));
    const tmpFile = join(dir, "clean.md");
    try {
      writeFileSync(tmpFile, "# Test\n\nA simple memo with no path claims at all.\n");
      const result = checkFile(tmpFile);
      expect(result.ok).toBe(true);
      expect(result.findings).toEqual([]);
    } finally {
      try { unlinkSync(tmpFile); } catch {}
      try { rmdirSync(dir); } catch {}
    }
  });

  test("future-state context exempts the claim", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-existence-"));
    const tmpFile = join(dir, "future.md");
    try {
      writeFileSync(
        tmpFile,
        `# Test\n\nThe \`docs/proposed-path-${Date.now()}.md\` file would be created when this lands.\n`,
      );
      const result = checkFile(tmpFile);
      expect(result.ok).toBe(true);
      expect(result.findings).toEqual([]);
    } finally {
      try { unlinkSync(tmpFile); } catch {}
      try { rmdirSync(dir); } catch {}
    }
  });
});

describe("looksLikePath - version-number rejection", () => {
  test("rejects version numbers", () => {
    expect(looksLikePath("v0.69.4")).toBe(false);
    expect(looksLikePath("10.0.203")).toBe(false);
    expect(looksLikePath("1.2.3")).toBe(false);
    expect(looksLikePath("1.2.3-rc1")).toBe(false);
  });

  test("accepts known-extension paths even without slash", () => {
    expect(looksLikePath("config.toml")).toBe(true);
    expect(looksLikePath("README.md")).toBe(true);
    expect(looksLikePath("script.sh")).toBe(true);
  });

  test("rejects unknown-extension single-component", () => {
    expect(looksLikePath("foo.zzzz")).toBe(false);
    expect(looksLikePath("file.unknownext")).toBe(false);
  });
});

describe("looksLikePath - cross-platform absolute paths", () => {
  test("rejects POSIX absolute", () => {
    expect(looksLikePath("/etc/hosts")).toBe(false);
    expect(looksLikePath("/usr/local/bin/foo")).toBe(false);
  });

  test("rejects Windows drive paths even on POSIX", () => {
    // path.isAbsolute returns false for these on POSIX, so we need
    // explicit regex checks.
    expect(looksLikePath("C:\\Windows\\System32\\foo.dll")).toBe(false);
    expect(looksLikePath("D:/Users/foo/bar.txt")).toBe(false);
    expect(looksLikePath("c:/lower/case/drive.md")).toBe(false);
  });

  test("rejects Windows UNC paths", () => {
    expect(looksLikePath("\\\\server\\share\\foo.md")).toBe(false);
  });
});

describe("findPathClaims - angle-bracket link targets", () => {
  test("strips angle-brackets from link target", () => {
    const lines = ["See [spec](<docs/foo.md>) for details."];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.path).toBe("docs/foo.md");
  });

  test("handles angle-brackets with anchors", () => {
    const lines = ["See [spec](<docs/foo.md#section>)"];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.path).toBe("docs/foo.md");
  });

  test("regular links still work alongside angle-bracket variant", () => {
    const lines = [
      "[a](docs/normal.md) and [b](<docs/angled.md>)",
    ];
    const claims = findPathClaims(lines);
    expect(claims).toHaveLength(2);
    expect(claims.map((c) => c.path).sort()).toEqual(["docs/angled.md", "docs/normal.md"]);
  });
});
