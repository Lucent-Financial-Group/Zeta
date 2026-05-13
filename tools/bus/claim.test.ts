import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const CLAIM_SCRIPT = join(import.meta.dir, "claim.ts");
let TEST_DIR: string;

function run(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const r = spawnSync("bun", [CLAIM_SCRIPT, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ZETA_BUS_DIR: TEST_DIR },
  });
  return {
    stdout: (r.stdout ?? "").trim(),
    stderr: (r.stderr ?? "").trim(),
    exitCode: r.status ?? 1,
  };
}

function cleanTestDir(): void {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
}

describe("claim.ts — check", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-claim-test-")); });
  afterEach(cleanTestDir);

  test("check reports unclaimed when bus is empty", () => {
    const r = run("check", "--item", "B-0400");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("unclaimed");
  });

  test("check --json exits 0 with claimed:false when empty", () => {
    const r = run("check", "--item", "B-0400", "--json");
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.claimed).toBe(false);
    expect(out.itemId).toBe("B-0400");
    expect(out.claims).toHaveLength(0);
  });

  test("check exits 1 and reports claimant after acquire", () => {
    run("acquire", "--from", "otto", "--item", "B-0400");

    const r = run("check", "--item", "B-0400");
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toContain("claimed by otto");
  });

  test("check --json exits 1 with claimed:true after acquire", () => {
    run("acquire", "--from", "vera", "--item", "B-0400");

    const r = run("check", "--item", "B-0400", "--json");
    expect(r.exitCode).toBe(1);
    const out = JSON.parse(r.stdout);
    expect(out.claimed).toBe(true);
    expect(out.claims).toHaveLength(1);
    expect(out.claims[0].from).toBe("vera");
  });

  test("check includes branch info when present", () => {
    run("acquire", "--from", "otto", "--item", "B-0400", "--branch", "feat/my-branch");

    const r = run("check", "--item", "B-0400");
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toContain("feat/my-branch");
  });

  test("check exits 0 after acquire + release", () => {
    run("acquire", "--from", "otto", "--item", "B-0400");
    run("release", "--from", "otto", "--item", "B-0400");

    const r = run("check", "--item", "B-0400");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("unclaimed");
  });

  test("check --item required", () => {
    const r = run("check");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--item");
  });
});

describe("claim.ts — acquire", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-claim-test-")); });
  afterEach(cleanTestDir);

  test("acquire succeeds on unclaimed item", () => {
    const r = run("acquire", "--from", "otto", "--item", "B-0123");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("claimed by otto");
  });

  test("acquire --json returns acquired:true with messageId", () => {
    const r = run("acquire", "--from", "otto", "--item", "B-0123", "--json");
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.acquired).toBe(true);
    expect(typeof out.messageId).toBe("string");
  });

  test("acquire fails when another agent already holds claim", () => {
    run("acquire", "--from", "vera", "--item", "B-0123");

    const r = run("acquire", "--from", "otto", "--item", "B-0123");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("already claimed");
  });

  test("acquire --json exits 1 with acquired:false when blocked", () => {
    run("acquire", "--from", "vera", "--item", "B-0123");

    const r = run("acquire", "--from", "otto", "--item", "B-0123", "--json");
    expect(r.exitCode).toBe(1);
    const out = JSON.parse(r.stdout);
    expect(out.acquired).toBe(false);
    expect(out.claimedBy).toContain("vera");
  });

  test("acquire succeeds after other agent releases", () => {
    run("acquire", "--from", "vera", "--item", "B-0123");
    run("release", "--from", "vera", "--item", "B-0123");

    const r = run("acquire", "--from", "otto", "--item", "B-0123");
    expect(r.exitCode).toBe(0);
  });

  test("same agent can re-acquire its own claim (idempotent)", () => {
    run("acquire", "--from", "otto", "--item", "B-0123");
    const r = run("acquire", "--from", "otto", "--item", "B-0123");
    expect(r.exitCode).toBe(0);
  });

  test("acquire includes branch in output when provided", () => {
    const r = run("acquire", "--from", "riven", "--item", "B-0500", "--branch", "feat/b-0500");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("feat/b-0500");
  });

  test("acquire with invalid sender exits 1", () => {
    const r = run("acquire", "--from", "unknown-bot", "--item", "B-0001");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("unknown sender");
  });

  test("acquire missing --from exits 1", () => {
    const r = run("acquire", "--item", "B-0001");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("required");
  });

  test("acquire missing --item exits 1", () => {
    const r = run("acquire", "--from", "otto");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("required");
  });
});

describe("claim.ts — release", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-claim-test-")); });
  afterEach(cleanTestDir);

  test("release publishes successfully", () => {
    run("acquire", "--from", "otto", "--item", "B-0400");
    const r = run("release", "--from", "otto", "--item", "B-0400");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("released by otto");
  });

  test("release --json returns released:true with messageId", () => {
    const r = run("release", "--from", "otto", "--item", "B-0400", "--json");
    expect(r.exitCode).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.released).toBe(true);
    expect(typeof out.messageId).toBe("string");
  });

  test("release without prior acquire still publishes (idempotent best-effort)", () => {
    const r = run("release", "--from", "otto", "--item", "B-0999");
    expect(r.exitCode).toBe(0);
  });

  test("release with invalid sender exits 1", () => {
    const r = run("release", "--from", "bad-agent", "--item", "B-0001");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("unknown sender");
  });

  test("release missing --from exits 1", () => {
    const r = run("release", "--item", "B-0001");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("required");
  });
});

describe("claim.ts — multi-item isolation", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-claim-test-")); });
  afterEach(cleanTestDir);

  test("claims for different items do not interfere", () => {
    run("acquire", "--from", "otto", "--item", "B-0001");
    run("acquire", "--from", "vera", "--item", "B-0002");

    const r1 = run("check", "--item", "B-0001");
    expect(r1.exitCode).toBe(1);
    expect(r1.stdout).toContain("otto");

    const r2 = run("check", "--item", "B-0002");
    expect(r2.exitCode).toBe(1);
    expect(r2.stdout).toContain("vera");
  });

  test("check returns only claims for the queried item", () => {
    run("acquire", "--from", "otto", "--item", "B-0001");
    run("acquire", "--from", "vera", "--item", "B-0002");

    const r = run("check", "--item", "B-0001", "--json");
    const out = JSON.parse(r.stdout);
    expect(out.claims.every((c: { itemId: string }) => c.itemId === "B-0001")).toBe(true);
  });
});

describe("claim.ts — unknown command", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-claim-test-")); });
  afterEach(cleanTestDir);

  test("unknown command exits 1", () => {
    const r = run("frobulate");
    expect(r.exitCode).toBe(1);
  });
});

// ── P2: unknown action guard ──────────────────────────────────────────────────

describe("claim.ts — unknown action protection (P2)", () => {
  const BUS_SCRIPT = join(import.meta.dir, "bus.ts");

  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-claim-test-")); });
  afterEach(cleanTestDir);

  test("unknown action on claim topic does not clear an existing claim", () => {
    run("acquire", "--from", "otto", "--item", "B-0300");

    // Inject a message with an unknown action to simulate a buggy sender.
    spawnSync(
      "bun",
      [BUS_SCRIPT, "publish", "--from", "vera", "--to", "*", "--topic", "claim",
       "--payload", JSON.stringify({ action: "relinquish", itemId: "B-0300" })],
      { encoding: "utf-8", env: { ...process.env, ZETA_BUS_DIR: TEST_DIR } },
    );

    const r = run("check", "--item", "B-0300");
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toContain("claimed by otto");
  });
});

// ── P1: acquire lock cleanup ──────────────────────────────────────────────────

describe("claim.ts — acquire lock cleanup (P1)", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-claim-test-")); });
  afterEach(cleanTestDir);

  test("no lock files remain in bus dir after acquire", () => {
    run("acquire", "--from", "otto", "--item", "B-0555");
    const lockFiles = readdirSync(TEST_DIR).filter((f) => f.startsWith("acquire-"));
    expect(lockFiles).toHaveLength(0);
  });

  test("no lock files remain after failed acquire", () => {
    run("acquire", "--from", "vera", "--item", "B-0555");
    run("acquire", "--from", "otto", "--item", "B-0555"); // blocked
    const lockFiles = readdirSync(TEST_DIR).filter((f) => f.startsWith("acquire-"));
    expect(lockFiles).toHaveLength(0);
  });
});
