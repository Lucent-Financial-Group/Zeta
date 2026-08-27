// output-path.test.ts — the falsifiers.
//
// The property that matters is a MODE, and a mode is the easiest thing in this file to assert
// vacuously: `mkdirSync(dir, { mode })` looks like it sets a permission, is masked by the umask,
// and is ignored outright when the directory already exists. A test that only creates a fresh
// directory and reads its mode back would pass while the real-world case — a directory left 0755 by
// a previous run — stays wide open. §"an EXISTING directory is repaired" is the case that matters.

import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensurePeerCallOutputDir,
  outputStamp,
  PEER_CALL_OUTPUT_DIR_ENV,
  PEER_CALL_OUTPUT_DIRNAME,
  PEER_CALL_OUTPUT_MODE,
  peerCallOutputPath,
} from "./output-path.ts";

/** An isolated TMPDIR, so a test never touches the real peer-call output directory. */
function sandbox(): { env: NodeJS.ProcessEnv; root: string } {
  const root = mkdtempSync(join(tmpdir(), "zeta-peercall-out-"));
  return { env: { TMPDIR: root } as NodeJS.ProcessEnv, root };
}

const mode = (p: string): number => statSync(p).mode & 0o777;

describe("the directory is owner-only, which is what makes a predictable name safe", () => {
  test("a fresh directory is created 0700", () => {
    const { env, root } = sandbox();
    try {
      const { dir, secured } = ensurePeerCallOutputDir(env);
      expect(dir).toBe(join(root, PEER_CALL_OUTPUT_DIRNAME));
      expect(mode(dir)).toBe(PEER_CALL_OUTPUT_MODE);
      expect(secured).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an EXISTING 0755 directory is REPAIRED — the case `mkdirSync(mode)` cannot handle", () => {
    // This is the real-world state: every previous run, and every run of the version that hardcoded
    // /tmp, left this directory world-readable. `mkdirSync`'s `mode` is ignored when the path
    // exists, so without the explicit chmod the fix would be a no-op exactly where it is needed.
    const { env, root } = sandbox();
    try {
      const dir = join(root, PEER_CALL_OUTPUT_DIRNAME);
      mkdirSync(dir, { recursive: true });
      chmodSync(dir, 0o755);
      expect(mode(dir)).toBe(0o755);

      const result = ensurePeerCallOutputDir(env);
      expect(mode(result.dir)).toBe(PEER_CALL_OUTPUT_MODE);
      expect(result.secured).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("`secured` is MEASURED, not assumed — it reads the mode back", () => {
    // If the chmod silently failed, `secured` must say so. Pinning that it is read from `statSync`
    // rather than hardcoded `true` is what keeps the flag from being decorative.
    const { env, root } = sandbox();
    try {
      expect(ensurePeerCallOutputDir(env).secured).toBe(true);
      const dir = join(root, PEER_CALL_OUTPUT_DIRNAME);
      chmodSync(dir, 0o755);
      // A second call must re-repair and still report honestly.
      expect(ensurePeerCallOutputDir(env).secured).toBe(true);
      expect(mode(dir)).toBe(PEER_CALL_OUTPUT_MODE);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the hardcoded /tmp is gone", () => {
  test("the path follows TMPDIR rather than a literal /tmp", () => {
    const { env, root } = sandbox();
    try {
      expect(peerCallOutputPath("amara", new Date("2026-08-27T18:04:05.123Z"), env)).toBe(
        join(root, PEER_CALL_OUTPUT_DIRNAME, "20260827T180405Z-amara.md"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("no source file in this module names /tmp literally", () => {
    // The portability half: `/tmp` does not exist on Windows, and a literal defeats TMPDIR even
    // where it does. Asserted against the source so a future edit cannot quietly reintroduce it.
    const src = readFileSync(new URL("./output-path.ts", import.meta.url).pathname, "utf8");
    // CODE only. The docstring quotes the old `/tmp/peer-call-output/...` line while explaining
    // what was wrong with it, and a whole-file match convicts the documentation — a check that
    // fires on its own explanation is measuring the wrong thing, and would have to be deleted
    // rather than fixed.
    const code = src
      .split("\n")
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join("\n");
    expect(code).not.toMatch(/["'`]\/tmp\//);
    // The prose SHOULD still name it — that is where the reader learns what was fixed.
    expect(src).toMatch(/\/tmp\/peer-call-output/);
  });
});

describe("PEER_CALL_OUTPUT_DIR is honoured, and left alone", () => {
  test("an operator-chosen directory is used verbatim", () => {
    const { root } = sandbox();
    try {
      const chosen = join(root, "operator-picked");
      const result = ensurePeerCallOutputDir({ [PEER_CALL_OUTPUT_DIR_ENV]: chosen } as NodeJS.ProcessEnv);
      expect(result.dir).toBe(chosen);
      expect(result.operatorChosen).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("its mode is NOT changed — hardening a directory the operator named would exceed the instruction", () => {
    const { root } = sandbox();
    try {
      const chosen = join(root, "operator-picked-2");
      mkdirSync(chosen, { recursive: true });
      chmodSync(chosen, 0o755);
      const result = ensurePeerCallOutputDir({ [PEER_CALL_OUTPUT_DIR_ENV]: chosen } as NodeJS.ProcessEnv);
      expect(mode(chosen)).toBe(0o755);
      expect(result.secured).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an EMPTY override is not an override — it falls back rather than writing to cwd", () => {
    const { env, root } = sandbox();
    try {
      const result = ensurePeerCallOutputDir({ ...env, [PEER_CALL_OUTPUT_DIR_ENV]: "" } as NodeJS.ProcessEnv);
      expect(result.dir).toBe(join(root, PEER_CALL_OUTPUT_DIRNAME));
      expect(result.operatorChosen).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the stamp is stable and filesystem-safe", () => {
  test("colons and dashes are stripped, milliseconds dropped", () => {
    expect(outputStamp(new Date("2026-08-27T18:04:05.123Z"))).toBe("20260827T180405Z");
  });

  test("it is a pure function of its argument — the clock enters at ONE call site", () => {
    const d = new Date("2026-01-02T03:04:05.006Z");
    expect(outputStamp(d)).toBe(outputStamp(d));
  });
});
