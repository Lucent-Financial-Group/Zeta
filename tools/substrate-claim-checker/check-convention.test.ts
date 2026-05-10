import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkFile, findSupersessionClaims } from "./check-convention.ts";

function setupRepo(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "check-convention-"));
  mkdirSync(join(root, ".git"), { recursive: true });
  mkdirSync(join(root, "docs", "DECISIONS"), { recursive: true });
  return {
    root,
    cleanup: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // Best-effort temp cleanup.
      }
    },
  };
}

describe("findSupersessionClaims", () => {
  test("finds backtick ADR supersession targets", () => {
    const claims = findSupersessionClaims([
      "**Status:** Accepted. Supersedes ADR `docs/DECISIONS/old.md`.",
    ]);
    expect(claims).toHaveLength(1);
    expect(claims.at(0)?.target).toBe("docs/DECISIONS/old.md");
  });

  test("finds markdown link ADR supersession targets", () => {
    const claims = findSupersessionClaims([
      "Supersedes ADR [v1](old.md) after review.",
    ]);
    expect(claims).toHaveLength(1);
    expect(claims.at(0)?.target).toBe("old.md");
  });

  test("finds hard-wrapped markdown link ADR supersession targets", () => {
    const claims = findSupersessionClaims([
      "**Status:** Accepted. Supersedes ADR",
      "[v1](old.md) after review.",
    ]);
    expect(claims).toHaveLength(1);
    expect(claims.at(0)?.line).toBe(1);
    expect(claims.at(0)?.target).toBe("old.md");
  });

  test("reports hard-wrapped claims at the physical claim line", () => {
    const claims = findSupersessionClaims([
      "**Date:** 2026-05-10",
      "**Status:** Accepted. Supersedes ADR",
      "[v1](old.md) after review.",
    ]);
    expect(claims).toHaveLength(1);
    expect(claims.at(0)?.line).toBe(2);
    expect(claims.at(0)?.target).toBe("old.md");
  });

  test("finds hard-wrapped backtick ADR supersession targets", () => {
    const claims = findSupersessionClaims([
      "**Status:** Accepted. Supersedes ADR",
      "`docs/DECISIONS/old.md` after review.",
    ]);
    expect(claims).toHaveLength(1);
    expect(claims.at(0)?.line).toBe(1);
    expect(claims.at(0)?.target).toBe("docs/DECISIONS/old.md");
  });

  test("strips markdown link titles from supersession targets", () => {
    const claims = findSupersessionClaims([
      'Supersedes ADR [v1](old.md "historical record").',
    ]);
    expect(claims).toHaveLength(1);
    expect(claims.at(0)?.target).toBe("old.md");
  });

  test("ignores non-repo-local supersession targets", () => {
    const claims = findSupersessionClaims([
      "Supersedes ADR `https://example.test/docs/DECISIONS/old.md`.",
      "Supersedes ADR `file:///tmp/old.md`.",
      "Supersedes ADR `/tmp/old.md`.",
      "Supersedes ADR `C:\\zeta\\old.md`.",
      "Supersedes ADR `\\\\server\\share\\old.md`.",
    ]);
    expect(claims).toEqual([]);
  });

  test("ignores supersession text inside fenced code", () => {
    const claims = findSupersessionClaims([
      "```md",
      "Supersedes ADR `docs/DECISIONS/old.md`",
      "```",
    ]);
    expect(claims).toEqual([]);
  });
});

describe("checkFile", () => {
  test("flags missing reciprocal superseded-by marker", () => {
    const fx = setupRepo();
    try {
      const oldAdr = join(fx.root, "docs", "DECISIONS", "old.md");
      const newAdr = join(fx.root, "docs", "DECISIONS", "new.md");
      writeFileSync(oldAdr, "# ADR old\n\n**Status:** Accepted.\n");
      writeFileSync(
        newAdr,
        [
          "# ADR new",
          "",
          "**Status:** Accepted. Supersedes ADR `docs/DECISIONS/old.md`.",
          "",
        ].join("\n"),
      );

      const result = checkFile(newAdr);
      expect(result.ok).toBe(true);
      expect(result.findings).toHaveLength(1);
      expect(result.findings.at(0)?.target).toBe("docs/DECISIONS/old.md");
    } finally {
      fx.cleanup();
    }
  });

  test("accepts reciprocal top-of-file marker naming superseding ADR", () => {
    const fx = setupRepo();
    try {
      const oldAdr = join(fx.root, "docs", "DECISIONS", "old.md");
      const newAdr = join(fx.root, "docs", "DECISIONS", "new.md");
      writeFileSync(
        oldAdr,
        [
          "# ADR old",
          "",
          "> **Superseded by** [`docs/DECISIONS/new.md`](new.md).",
          "",
        ].join("\n"),
      );
      writeFileSync(
        newAdr,
        [
          "# ADR new",
          "",
          "**Status:** Accepted. Supersedes ADR `docs/DECISIONS/old.md`.",
          "",
        ].join("\n"),
      );

      const result = checkFile(newAdr);
      expect(result.ok).toBe(true);
      expect(result.findings).toEqual([]);
    } finally {
      fx.cleanup();
    }
  });

  test("accepts hard-wrapped reciprocal top-of-file marker", () => {
    const fx = setupRepo();
    try {
      const oldAdr = join(fx.root, "docs", "DECISIONS", "old.md");
      const newAdr = join(fx.root, "docs", "DECISIONS", "new.md");
      writeFileSync(
        oldAdr,
        [
          "# ADR old",
          "",
          "> **Superseded by**",
          "> [`docs/DECISIONS/new.md`](new.md).",
          "",
        ].join("\n"),
      );
      writeFileSync(
        newAdr,
        [
          "# ADR new",
          "",
          "**Status:** Accepted. Supersedes ADR `docs/DECISIONS/old.md`.",
          "",
        ].join("\n"),
      );

      const result = checkFile(newAdr);
      expect(result.ok).toBe(true);
      expect(result.findings).toEqual([]);
    } finally {
      fx.cleanup();
    }
  });

  test("flags reciprocal marker that names the wrong ADR", () => {
    const fx = setupRepo();
    try {
      const oldAdr = join(fx.root, "docs", "DECISIONS", "old.md");
      const newAdr = join(fx.root, "docs", "DECISIONS", "new.md");
      writeFileSync(
        oldAdr,
        "> **Superseded by** [`other.md`](other.md).\n",
      );
      writeFileSync(newAdr, "Supersedes ADR [v1](old.md).\n");

      const result = checkFile(newAdr);
      expect(result.ok).toBe(true);
      expect(result.findings).toHaveLength(1);
      expect(result.findings.at(0)?.reason).toContain("does not name new.md");
    } finally {
      fx.cleanup();
    }
  });

  test("flags reciprocal marker that only contains the ADR basename as a substring", () => {
    const fx = setupRepo();
    try {
      const oldAdr = join(fx.root, "docs", "DECISIONS", "old.md");
      const newAdr = join(fx.root, "docs", "DECISIONS", "new.md");
      writeFileSync(
        oldAdr,
        "> **Superseded by** [`renew.md`](renew.md) and `new.md.bak`.\n",
      );
      writeFileSync(newAdr, "Supersedes ADR [v1](old.md).\n");

      const result = checkFile(newAdr);
      expect(result.ok).toBe(true);
      expect(result.findings).toHaveLength(1);
      expect(result.findings.at(0)?.reason).toContain("does not name new.md");
    } finally {
      fx.cleanup();
    }
  });

  test("skips unresolved targets for existence checker", () => {
    const fx = setupRepo();
    try {
      const newAdr = join(fx.root, "docs", "DECISIONS", "new.md");
      writeFileSync(newAdr, "Supersedes ADR `docs/DECISIONS/missing.md`.\n");
      const result = checkFile(newAdr);
      expect(result.ok).toBe(true);
      expect(result.findings).toEqual([]);
    } finally {
      fx.cleanup();
    }
  });

  test("does not read absolute supersession targets outside the repo", () => {
    const fx = setupRepo();
    const outside = join(dirname(fx.root), "check-convention-outside-old.md");
    try {
      const newAdr = join(fx.root, "docs", "DECISIONS", "new.md");
      writeFileSync(outside, "# outside ADR\n");
      writeFileSync(newAdr, `Supersedes ADR \`${outside}\`.\n`);

      const result = checkFile(newAdr);
      expect(result.ok).toBe(true);
      expect(result.findings).toEqual([]);
    } finally {
      try {
        rmSync(outside, { force: true });
      } catch {
        // Best-effort temp cleanup.
      }
      fx.cleanup();
    }
  });

  test("returns ok=false for missing input file", () => {
    const result = checkFile("/no/such/path/check-convention-test.md");
    expect(result.ok).toBe(false);
    expect(result.findings).toEqual([]);
  });
});
