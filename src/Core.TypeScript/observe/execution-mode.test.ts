/**
 * execution-mode.test.ts — falsifiers for the gate's grip on real dispatch.
 *
 * The decision is tested next door. What is tested here is that the decision CHANGES SOMETHING:
 * in shadow the real executor is never reached, and the outcome does not misreport where work ran.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandExecutor, RunOutcome, RunSpec } from "./do-item";
import { currentExecutionMode, executorForMode, readWindowSource, shadowExecutor } from "./execution-mode";
import type { PromotionWindow } from "../enforcement/promotion-gate";

const CLEAN: PromotionWindow = {
  shadowTicks: 100,
  shadowSoakHours: 24,
  illegalSelections: 0,
  divergenceRate: 0,
  primarySelectorRejections30m: 0,
  primaryControlBypassRejections30m: 0,
};

function recordingExecutor(): { executor: CommandExecutor; seen: string[] } {
  const seen: string[] = [];
  return {
    seen,
    executor: {
      tier: "just-bash",
      run: async (spec: RunSpec): Promise<RunOutcome> => {
        seen.push(spec.script);
        return { ok: true, stdout: "REAL", exitCode: 0 };
      },
    },
  };
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "zeta-promotion-"));
}

describe("shadowExecutor", () => {
  test("records what it would have run and dispatches nothing", async () => {
    const sh = shadowExecutor();
    const out = await sh.run({ script: "rm -rf /", cwd: "/repo" });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.stdout).toContain("[shadow]");
    expect(sh.runs).toEqual([{ script: "rm -rf /", cwd: "/repo" }]);
  });

  test("reports tier `fake` — nothing ran, and the audit must not be told otherwise", () => {
    expect(shadowExecutor().tier).toBe("fake");
  });

  test("a shadow tick is not an error", async () => {
    // If shadow returned a refusal, every shadow tick would read as a broken tick and would poison
    // the divergence rate the gate reads — no lane could ever soak its way out of shadow.
    const sh = shadowExecutor();
    const out = await sh.run({ script: "bun test" });
    expect(out.ok).toBe(true);
    expect(out.exitCode).toBe(0);
  });
});

describe("executorForMode", () => {
  test("primary hands back the real executor, unchanged", async () => {
    const { executor, seen } = recordingExecutor();
    const chosen = executorForMode("primary", executor);
    expect(chosen).toBe(executor);
    await chosen.run({ script: "echo hi" });
    expect(seen).toEqual(["echo hi"]);
  });

  test("shadow never reaches the real executor", async () => {
    const { executor, seen } = recordingExecutor();
    const chosen = executorForMode("shadow", executor);
    const out = await chosen.run({ script: "git push --force" });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.stdout).toContain("[shadow]");
    // THE point of the whole gate.
    expect(seen).toEqual([]);
    expect(chosen.tier).toBe("fake");
  });
});

describe("readWindowSource — missing is ABSENT, broken is UNREADABLE", () => {
  test("a path that does not exist is absent, not an error", () => {
    const dir = tempDir();
    try {
      expect(readWindowSource(join(dir, "nope.json"))).toEqual({ absent: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a garbage file is unreadable", () => {
    const dir = tempDir();
    try {
      const p = join(dir, "window.json");
      writeFileSync(p, "{ not json");
      const src = readWindowSource(p);
      expect("ok" in src && src.ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a directory where a file was expected is unreadable, never absent", () => {
    // The distinction matters: absent means "no soak yet", which is a normal state. Something we
    // could not read is a fault, and reporting it as absent would hide the fault.
    const dir = tempDir();
    try {
      const src = readWindowSource(dir);
      expect("ok" in src && src.ok).toBe(false);
      expect("absent" in src).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("currentExecutionMode — end to end, on disk", () => {
  test("a clean window on disk promotes", () => {
    const dir = tempDir();
    try {
      const p = join(dir, "window.json");
      writeFileSync(p, JSON.stringify(CLEAN));
      expect(currentExecutionMode(p).mode).toBe("primary");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a tripped window on disk demotes", () => {
    const dir = tempDir();
    try {
      const p = join(dir, "window.json");
      writeFileSync(p, JSON.stringify({ ...CLEAN, primaryControlBypassRejections30m: 1 }));
      const d = currentExecutionMode(p);
      expect(d.mode).toBe("shadow");
      expect(d.reason).toBe("demoted_control_bypass");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("no window file means shadow — the default is the safe side", () => {
    const dir = tempDir();
    try {
      expect(currentExecutionMode(join(dir, "absent.json")).mode).toBe("shadow");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a truncated window file means shadow, not a partially-trusted window", () => {
    const dir = tempDir();
    try {
      const p = join(dir, "window.json");
      writeFileSync(p, JSON.stringify({ shadowTicks: 10_000 }));
      const d = currentExecutionMode(p);
      expect(d.mode).toBe("shadow");
      expect(d.reason).toBe("window_unreadable");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
