import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findFindings,
  checkFile,
} from "./check-semantic-equivalence.ts";

// ── findFindings — patterns ───────────────────────────────────────────────────

describe("findFindings — equivalence patterns", () => {
  test("explicit 'is equivalent to' between two shell commands", () => {
    const findings = findFindings(
      "t.md",
      "Note: `find . -iname foo` is equivalent to `ls | grep foo`.",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("warning");
    expect(findings[0]!.left).toBe("find . -iname foo");
    expect(findings[0]!.right).toBe("ls | grep foo");
    expect(findings[0]!.line).toBe(1);
  });

  test("'does the same as' phrasing", () => {
    const findings = findFindings(
      "t.md",
      "We claim `grep -ilrE pat docs/` does the same as `ls docs/ | grep pat`.",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.hint).toBe("same-as claim");
  });

  test("'replaced X with Y — equivalent' (instance #12 shape)", () => {
    // Instance #12 catalogued in the verify-then-claim memo
    const findings = findFindings(
      "t.md",
      "replaced `ls | grep foo` with `find -iname foo` — claimed equivalent",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.hint).toMatch(/replacement/);
    expect(findings[0]!.left).toBe("ls | grep foo");
    expect(findings[0]!.right).toBe("find -iname foo");
  });

  test("'replaced X with Y' instance #13 shape (grep -ilrE substitution)", () => {
    const findings = findFindings(
      "t.md",
      "replacing `ls docs/DECISIONS/ | grep pat` with `grep -ilrE pat docs/DECISIONS/` is identical",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.right).toBe("grep -ilrE pat docs/DECISIONS/");
  });

  test("parenthetical 'same as' phrasing", () => {
    const findings = findFindings(
      "t.md",
      "We use `find . -name foo` (same as `ls | grep foo`) here.",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.hint).toBe("parenthetical equivalence");
  });

  test("parenthetical 'equivalent to' phrasing", () => {
    const findings = findFindings(
      "t.md",
      "We use `find . -name foo` (equivalent to `ls | grep foo`).",
    );
    expect(findings).toHaveLength(1);
  });

  test("triple-bar ≡ operator", () => {
    const findings = findFindings(
      "t.md",
      "Note `find -iname foo` ≡ `ls | grep foo` in our usage.",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.hint).toBe("triple-bar equivalence");
  });
});

// ── findFindings — negative cases ─────────────────────────────────────────────

describe("findFindings — should not match", () => {
  test("prose metaphor without shell tokens", () => {
    // Neither `alpha` nor `beta` look like shell commands
    const findings = findFindings(
      "t.md",
      "From here `alpha` is equivalent to `beta` in our notation.",
    );
    expect(findings).toHaveLength(0);
  });

  test("equivalence claim inside fenced code block is skipped", () => {
    const content = [
      "```",
      "`find -iname foo` is equivalent to `ls | grep foo`",
      "```",
    ].join("\n");
    const findings = findFindings("t.md", content);
    expect(findings).toHaveLength(0);
  });

  test("backticked tokens without an equivalence phrase between them", () => {
    const findings = findFindings(
      "t.md",
      "We support `find -iname foo` and also `ls | grep foo` separately.",
    );
    expect(findings).toHaveLength(0);
  });

  test("only one backticked token", () => {
    const findings = findFindings(
      "t.md",
      "Use `find -iname foo` whenever you need filename search.",
    );
    expect(findings).toHaveLength(0);
  });

  test("equivalence phrase across line break is not joined", () => {
    // v0 deliberately stays single-line (regex has \n exclusion).
    const findings = findFindings(
      "t.md",
      "`find -iname foo` is equivalent\nto `ls | grep foo`",
    );
    expect(findings).toHaveLength(0);
  });
});

// ── findFindings — multiple findings ──────────────────────────────────────────

describe("findFindings — aggregation", () => {
  test("two equivalence claims on different lines", () => {
    const content = [
      "`find -iname foo` is equivalent to `ls | grep foo`.",
      "And `awk '/x/ {print}'` does the same as `grep x`.",
    ].join("\n");
    const findings = findFindings("t.md", content);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.line).toBe(1);
    expect(findings[1]!.line).toBe(2);
  });

  test("fence-close after open re-enables detection", () => {
    const content = [
      "```",
      "`find -iname foo` is equivalent to `ls | grep foo`",
      "```",
      "Now outside: `find . -iname foo` is equivalent to `ls | grep foo`.",
    ].join("\n");
    const findings = findFindings("t.md", content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.line).toBe(4);
  });
});

// ── checkFile — helper ────────────────────────────────────────────────────────

function withTmpFile(content: string, cb: (path: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "check-semantic-equiv-"));
  const path = join(dir, "test.md");
  try {
    writeFileSync(path, content);
    cb(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── checkFile — integration ───────────────────────────────────────────────────

describe("checkFile — file I/O", () => {
  test("clean file produces no findings, ok: true", () => {
    withTmpFile("No equivalence claims here.\n", (path) => {
      const { findings, ok } = checkFile(path);
      expect(ok).toBe(true);
      expect(findings).toHaveLength(0);
    });
  });

  test("file with one equivalence claim flagged as warning", () => {
    withTmpFile(
      "`find -iname foo` is equivalent to `ls | grep foo`.\n",
      (path) => {
        const { findings, ok } = checkFile(path);
        expect(ok).toBe(true);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.severity).toBe("warning");
      },
    );
  });

  test("missing file returns ok: false", () => {
    const { ok } = checkFile("/tmp/definitely-does-not-exist-xyzabc.md");
    expect(ok).toBe(false);
  });
});
