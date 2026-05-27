// tools/agent-heartbeats/write-heartbeat.test.ts — B-0858.3 heartbeat-writer tests.

import { describe, expect, it } from "bun:test";
import { parseArgs, buildHeartbeatObservation, zetaIdToHex, heartbeatPath, renderHeartbeat } from "./write-heartbeat";
import { pack, DEFAULT_ENV } from "../../src/Core.TypeScript/zeta-id/zeta-id";

const baseArgs = ["--persona-slot", "2", "--persona-name", "otto"];

describe("parseArgs", () => {
  it("accepts minimal required flags", () => {
    const r = parseArgs(baseArgs);
    if ("error" in r) throw new Error(r.error);
    expect(r.personaSlot).toBe(2);
    expect(r.personaName).toBe("otto");
    expect(r.authority).toBe("TrustedAgent");
    expect(r.momentum).toBe("Normal");
    expect(r.disposition).toBe("bounded-wait");
  });

  it("accepts all flags", () => {
    const r = parseArgs([
      ...baseArgs,
      "--authority", "Standard",
      "--momentum", "Elevated",
      "--chromosome", "7",
      "--location", "2",
      "--named-dep", "PR #5450 build-iso",
      "--disposition", "committed-substrate",
      "--parent-pr", "5450",
      "--dry-run",
    ]);
    if ("error" in r) throw new Error(r.error);
    expect(r.authority).toBe("Standard");
    expect(r.momentum).toBe("Elevated");
    expect(r.chromosome).toBe(7);
    expect(r.location).toBe(2);
    expect(r.namedDep).toBe("PR #5450 build-iso");
    expect(r.disposition).toBe("committed-substrate");
    expect(r.parentPr).toBe(5450);
    expect(r.dryRun).toBe(true);
  });

  it("rejects missing --persona-slot", () => {
    expect("error" in parseArgs(["--persona-name", "otto"])).toBe(true);
  });

  it("rejects missing --persona-name", () => {
    expect("error" in parseArgs(["--persona-slot", "2"])).toBe(true);
  });

  it("rejects out-of-range persona-slot", () => {
    expect("error" in parseArgs(["--persona-slot", "256", "--persona-name", "otto"])).toBe(true);
    expect("error" in parseArgs(["--persona-slot", "-1", "--persona-name", "otto"])).toBe(true);
  });

  it("rejects invalid persona-name (non-kebab-case)", () => {
    expect("error" in parseArgs(["--persona-slot", "2", "--persona-name", "Otto"])).toBe(true);
    expect("error" in parseArgs(["--persona-slot", "2", "--persona-name", "otto_cli"])).toBe(true);
    expect("error" in parseArgs(["--persona-slot", "2", "--persona-name", "../etc"])).toBe(true);
  });

  it("rejects unknown flag", () => {
    expect("error" in parseArgs(["--bogus"])).toBe(true);
  });
});

describe("buildHeartbeatObservation", () => {
  it("sets category=3 (Heartbeat per registry)", () => {
    const args = parseArgs(baseArgs);
    if ("error" in args) throw new Error(args.error);
    const obs = buildHeartbeatObservation(args, 1234567890);
    expect((obs as any).category).toBe(3);
    expect((obs as any).firefly).toBe(1);
    expect((obs as any).version).toBe(1);
    expect((obs as any).persona).toBe(2);
  });
});

describe("zetaIdToHex", () => {
  it("pads to 32 hex chars", () => {
    expect(zetaIdToHex(0n)).toHaveLength(32);
    expect(zetaIdToHex(0n)).toBe("0".repeat(32));
    expect(zetaIdToHex(0xFFn)).toBe("0".repeat(30) + "ff");
  });

  it("renders large bigint correctly", () => {
    const big = (1n << 127n) | 0xdeadbeefn;
    const hex = zetaIdToHex(big);
    expect(hex).toHaveLength(32);
    expect(hex.endsWith("deadbeef")).toBe(true);
    expect(hex.startsWith("8")).toBe(true);
  });
});

describe("heartbeatPath", () => {
  it("builds YYYY/MM/DD path with hex filename", () => {
    const ts = Date.UTC(2026, 4, 27, 13, 30, 0);  // month 0-indexed (4=May)
    const path = heartbeatPath("/repo", "otto", ts, "abc123");
    expect(path).toBe("/repo/docs/agent-heartbeats/otto/2026/05/27/abc123.md");
  });

  it("pads month and day", () => {
    const ts = Date.UTC(2026, 0, 5, 0, 0, 0);  // 2026-01-05
    const path = heartbeatPath("/repo", "otto", ts, "x");
    expect(path).toBe("/repo/docs/agent-heartbeats/otto/2026/01/05/x.md");
  });
});

describe("renderHeartbeat", () => {
  it("produces valid frontmatter with required fields", () => {
    const args = parseArgs([...baseArgs, "--named-dep", "PR #5450 CI", "--parent-pr", "5450"]);
    if ("error" in args) throw new Error(args.error);
    const body = renderHeartbeat(args, "abc", 1779168600000);
    expect(body).toContain("---");
    expect(body).toContain("zetaid: abc");
    expect(body).toContain("category: 3");
    expect(body).toContain("agent: otto");
    expect(body).toContain("persona-slot: 2");
    expect(body).toContain("named-dep: \"PR #5450 CI\"");
    expect(body).toContain("parent-pr: 5450");
    expect(body).toContain("firefly: NoDirective");
  });

  it("omits optional fields when not provided", () => {
    const args = parseArgs(baseArgs);
    if ("error" in args) throw new Error(args.error);
    const body = renderHeartbeat(args, "abc", 1779168600000);
    expect(body).not.toContain("named-dep:");
    expect(body).not.toContain("parent-pr:");
  });
});

describe("end-to-end pack with DEFAULT_ENV", () => {
  it("packs without throwing; category bit field round-trips", () => {
    const args = parseArgs(baseArgs);
    if ("error" in args) throw new Error(args.error);
    const obs = buildHeartbeatObservation(args, Date.now());
    const id = pack(obs, DEFAULT_ENV);
    expect(typeof id).toBe("bigint");
    const hex = zetaIdToHex(id);
    expect(hex).toHaveLength(32);
    // Category bits at offset 65 width 4 = bits 65..68 inclusive
    const categoryBits = (id >> 65n) & 0xFn;
    expect(Number(categoryBits)).toBe(3);
  });
});
