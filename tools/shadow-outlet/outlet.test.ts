import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SHADOW_DIR = join("/tmp", "zeta-shadow");
const SCRIPT = join(import.meta.dir, "outlet.ts");

function run(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const r = spawnSync("bun", [SCRIPT, ...args], { encoding: "utf-8" });
  return {
    stdout: (r.stdout ?? "").trim(),
    stderr: (r.stderr ?? "").trim(),
    exitCode: r.status ?? 1,
  };
}

function cleanShadowDir(): void {
  if (existsSync(SHADOW_DIR)) {
    rmSync(SHADOW_DIR, { recursive: true });
  }
}

describe("shadow-outlet", () => {
  beforeEach(cleanShadowDir);
  afterEach(cleanShadowDir);

  test("write creates an entry and list returns it", () => {
    const w = run("write", "--agent", "otto", "--content", "exploring retraction paths");
    expect(w.exitCode).toBe(0);
    expect(w.stdout).toContain("agent=otto");

    const l = run("list", "--json");
    expect(l.exitCode).toBe(0);
    const entries = JSON.parse(l.stdout);
    expect(entries).toHaveLength(1);
    expect(entries[0].agent).toBe("otto");
    expect(entries[0].content).toBe("exploring retraction paths");
  });

  test("list --exclude hides the excluded agent (self-invisibility)", () => {
    run("write", "--agent", "otto", "--content", "my scratch");
    run("write", "--agent", "vera", "--content", "vera's scratch");

    const all = run("list", "--json");
    expect(JSON.parse(all.stdout)).toHaveLength(2);

    const consensus = run("list", "--exclude", "otto", "--json");
    const filtered = JSON.parse(consensus.stdout);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].agent).toBe("vera");
  });

  test("read retrieves a specific entry by id", () => {
    const w = run("write", "--agent", "otto", "--content", "test read", "--json");
    const entry = JSON.parse(w.stdout);

    const r = run("read", entry.id, "--json");
    expect(r.exitCode).toBe(0);
    const read = JSON.parse(r.stdout);
    expect(read.id).toBe(entry.id);
    expect(read.content).toBe("test read");
  });

  test("read --exclude hides own entries (self-invisibility)", () => {
    const w = run("write", "--agent", "otto", "--content", "shadow thought", "--json");
    const entry = JSON.parse(w.stdout);

    const blocked = run("read", entry.id, "--exclude", "otto");
    expect(blocked.exitCode).toBe(1);

    const allowed = run("read", entry.id, "--exclude", "vera", "--json");
    expect(allowed.exitCode).toBe(0);
    expect(JSON.parse(allowed.stdout).id).toBe(entry.id);
  });

  test("read returns error for missing id", () => {
    const r = run("read", "nonexistent");
    expect(r.exitCode).toBe(1);
  });

  test("clean removes all entries", () => {
    run("write", "--agent", "otto", "--content", "a");
    run("write", "--agent", "vera", "--content", "b");

    const c = run("clean", "--json");
    expect(c.exitCode).toBe(0);
    expect(JSON.parse(c.stdout).removed).toBe(2);

    const l = run("list", "--json");
    expect(JSON.parse(l.stdout)).toHaveLength(0);
  });

  test("clean --agent removes only that agent's entries", () => {
    run("write", "--agent", "otto", "--content", "a");
    run("write", "--agent", "vera", "--content", "b");

    const c = run("clean", "--agent", "otto", "--json");
    expect(JSON.parse(c.stdout).removed).toBe(1);

    const l = run("list", "--json");
    const remaining = JSON.parse(l.stdout);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].agent).toBe("vera");
  });

  test("write without --agent or --content fails", () => {
    const r = run("write", "--agent", "otto");
    expect(r.exitCode).toBe(1);
  });

  test("empty list produces empty array in json mode", () => {
    const l = run("list", "--json");
    expect(l.exitCode).toBe(0);
    expect(JSON.parse(l.stdout)).toHaveLength(0);
  });
});
