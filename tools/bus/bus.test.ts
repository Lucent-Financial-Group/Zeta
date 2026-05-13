import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const SCRIPT = join(import.meta.dir, "bus.ts");
let TEST_DIR: string;

function run(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const r = spawnSync("bun", [SCRIPT, ...args], {
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

describe("bus — publish + list", () => {
  beforeEach(() => {
    TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-bus-test-"));
  });
  afterEach(cleanTestDir);

  test("publish creates a message and list returns it", () => {
    const p = run("publish", "--from", "otto", "--to", "*", "--topic", "heartbeat", "--payload", '{"status":"alive"}');
    expect(p.exitCode).toBe(0);
    expect(p.stdout).toContain("heartbeat");

    const l = run("list", "--json");
    expect(l.exitCode).toBe(0);
    const msgs = JSON.parse(l.stdout);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].topic).toBe("heartbeat");
    expect(msgs[0].from).toBe("otto");
    expect(msgs[0].to).toBe("*");
    expect(msgs[0].payload.status).toBe("alive");
  });

  test("list --topic filters by topic", () => {
    run("publish", "--from", "otto", "--to", "*", "--topic", "heartbeat", "--payload", '{"status":"alive"}');
    run("publish", "--from", "vera", "--to", "otto", "--topic", "claim", "--payload", '{"action":"claim","itemId":"B-0400"}');

    const heartbeats = JSON.parse(run("list", "--topic", "heartbeat", "--json").stdout);
    expect(heartbeats).toHaveLength(1);
    expect(heartbeats[0].topic).toBe("heartbeat");

    const claims = JSON.parse(run("list", "--topic", "claim", "--json").stdout);
    expect(claims).toHaveLength(1);
    expect(claims[0].payload.itemId).toBe("B-0400");
  });

  test("list --to filters by recipient (includes broadcast)", () => {
    run("publish", "--from", "otto", "--to", "vera", "--topic", "review-request", "--payload", '{"artifact":"tools/bus/bus.ts"}');
    run("publish", "--from", "otto", "--to", "*", "--topic", "heartbeat", "--payload", '{"status":"working"}');
    run("publish", "--from", "otto", "--to", "alexa", "--topic", "shadow-catch", "--payload", '{"content":"pattern spotted"}');

    // vera receives: direct + broadcast
    const forVera = JSON.parse(run("list", "--to", "vera", "--json").stdout);
    expect(forVera).toHaveLength(2);
    const topics = forVera.map((m: { topic: string }) => m.topic).sort();
    expect(topics).toEqual(["heartbeat", "review-request"]);

    // alexa receives: direct + broadcast
    const forAlexa = JSON.parse(run("list", "--to", "alexa", "--json").stdout);
    expect(forAlexa).toHaveLength(2);
  });
});

describe("bus — read", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-bus-test-")); });
  afterEach(cleanTestDir);

  test("read returns a specific message by id", () => {
    const p = run("publish", "--from", "vera", "--to", "otto", "--topic", "claim", "--payload", '{"action":"claim","itemId":"B-0001"}', "--json");
    const env = JSON.parse(p.stdout);

    const r = run("read", env.id, "--json");
    expect(r.exitCode).toBe(0);
    const msg = JSON.parse(r.stdout);
    expect(msg.id).toBe(env.id);
    expect(msg.payload.itemId).toBe("B-0001");
  });

  test("read unknown id exits 1", () => {
    const r = run("read", "00000000-0000-0000-0000-000000000000");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("not found");
  });
});

describe("bus — clean", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-bus-test-")); });
  afterEach(cleanTestDir);

  test("clean removes all messages", () => {
    run("publish", "--from", "otto", "--to", "*", "--topic", "heartbeat", "--payload", '{"status":"idle"}');
    run("publish", "--from", "vera", "--to", "*", "--topic", "heartbeat", "--payload", '{"status":"working"}');

    const c = run("clean", "--json");
    expect(c.exitCode).toBe(0);
    expect(JSON.parse(c.stdout).removed).toBe(2);

    const l = JSON.parse(run("list", "--json").stdout);
    expect(l).toHaveLength(0);
  });

  test("clean --from removes only that agent's messages", () => {
    run("publish", "--from", "otto", "--to", "*", "--topic", "heartbeat", "--payload", '{"status":"idle"}');
    run("publish", "--from", "vera", "--to", "*", "--topic", "heartbeat", "--payload", '{"status":"working"}');

    const c = run("clean", "--from", "otto", "--json");
    expect(JSON.parse(c.stdout).removed).toBe(1);

    const remaining = JSON.parse(run("list", "--json").stdout);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].from).toBe("vera");
  });
});

describe("bus — TTL expiry", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-bus-test-")); });
  afterEach(cleanTestDir);

  test("expired messages are excluded from list by default", () => {
    // publish a message then manually expire it via env override + tiny TTL
    // We use the programmatic API directly (import) to set a 0ms TTL
    const r = spawnSync("bun", ["-e", `
      process.env.ZETA_BUS_DIR = ${JSON.stringify(TEST_DIR)};
      const { publish } = await import(${JSON.stringify(SCRIPT)});
      const env = publish("otto", "*", { topic: "heartbeat", payload: { status: "idle" } }, 0);
      console.log(JSON.stringify(env));
    `], { encoding: "utf-8" });
    expect(r.status).toBe(0);
    const env = JSON.parse(r.stdout.trim());
    expect(env.id).toBeTruthy();

    // list without --include-expired should omit it (0ms TTL = already expired)
    const l = JSON.parse(run("list", "--json").stdout);
    expect(l).toHaveLength(0);

    // list with --include-expired should include it
    const lAll = JSON.parse(run("list", "--include-expired", "--json").stdout);
    expect(lAll).toHaveLength(1);
  });
});

describe("bus — watch", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-bus-test-")); });
  afterEach(cleanTestDir);

  test("watch --timeout 0 exits 0 with no messages", () => {
    const r = run("watch", "--to", "otto", "--timeout", "0");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe("");
  });

  test("watch --timeout 0 does not surface pre-existing messages (cursor starts at call time)", () => {
    // publish before watch starts — should NOT appear (cursor is set at watch start)
    run("publish", "--from", "vera", "--to", "otto", "--topic", "heartbeat", "--payload", '{"status":"alive"}');

    const r = run("watch", "--to", "otto", "--timeout", "0", "--json");
    expect(r.exitCode).toBe(0);
    // no output because the message was published before watch started
    expect(r.stdout).toBe("");
  });

  test("watch --timeout 0 with --json exits cleanly", () => {
    const r = run("watch", "--timeout", "0", "--json");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe("");
  });

  test("watch emits messages published after cursor start (ZETA_WATCH_INITIAL_CURSOR)", () => {
    // Publish a message first (timestamp will be ~now)
    run("publish", "--from", "otto", "--to", "*", "--topic", "heartbeat", "--payload", '{"check":"live"}');

    // Set cursor to 10s in the past so the published message is "fresh"
    const pastCursor = new Date(Date.now() - 10_000).toISOString();
    const r = spawnSync("bun", [SCRIPT, "watch", "--timeout", "0", "--json"], {
      encoding: "utf-8",
      env: { ...process.env, ZETA_BUS_DIR: TEST_DIR, ZETA_WATCH_INITIAL_CURSOR: pastCursor },
    });

    expect(r.status).toBe(0);
    const msgs = (r.stdout ?? "").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[0].topic).toBe("heartbeat");
    expect((msgs[0].payload as { check: string }).check).toBe("live");
  });

  test("watch --interval invalid value exits 1", () => {
    const r = run("watch", "--interval", "abc", "--timeout", "0");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--interval");
  });

  test("watch --timeout invalid value exits 1", () => {
    const r = run("watch", "--timeout", "notanumber");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--timeout");
  });
});

describe("bus — error handling", () => {
  beforeEach(() => { TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-bus-test-")); });
  afterEach(cleanTestDir);

  test("publish without required flags exits 1", () => {
    const r = run("publish", "--from", "otto");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("required");
  });

  test("publish with invalid JSON payload exits 1", () => {
    const r = run("publish", "--from", "otto", "--to", "*", "--topic", "heartbeat", "--payload", "not-json");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("JSON");
  });

  test("unknown command exits 1", () => {
    const r = run("frobulate");
    expect(r.exitCode).toBe(1);
  });
});
