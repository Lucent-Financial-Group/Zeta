/**
 * control-plane.test.ts — the falsifiers for the halt.
 *
 * The load-bearing tests are the ones about NOT being able to tell. An e-stop is only worth having
 * if the ambiguous cases resolve to "stop", and those are the cases a friendlier implementation
 * silently resolves to "go".
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FLAG_SEVERITY,
  haltDecision,
  haltDecisionFromSource,
  loadFlags,
  parseFlags,
  type ActingContext,
  type ControlPlaneFlag,
} from "./control-plane";

const otto: ActingContext = { agent: "otto", hats: ["author", "reviewer"], provider: "anthropic" };

const flag = (over: Partial<ControlPlaneFlag> = {}): ControlPlaneFlag => ({
  kind: "estop",
  scope: { kind: "organization" },
  reason: "incident 42",
  setBy: "aaron",
  ...over,
});

describe("scoped halts", () => {
  test("an organization estop halts everyone", () => {
    const d = haltDecision([flag()], otto);
    expect(d.halted).toBe(true);
    if (d.halted) expect(d.reason).toBe("incident 42");
  });

  test("an agent-scoped halt stops only that agent", () => {
    const flags = [flag({ scope: { kind: "agent", id: "vera" } })];
    expect(haltDecision(flags, otto).halted).toBe(false);
    expect(haltDecision(flags, { agent: "vera" }).halted).toBe(true);
  });

  test("a hat-scoped halt matches ANY worn hat, not just one", () => {
    // A persona wears a subset (`Persona.Worn`). Halting "the reviewer hat" has to hold however many
    // other hats that persona is also wearing, or the halt is escapable by wearing one more.
    expect(haltDecision([flag({ scope: { kind: "hat", id: "reviewer" } })], otto).halted).toBe(true);
    expect(haltDecision([flag({ scope: { kind: "hat", id: "release" } })], otto).halted).toBe(false);
  });

  test("a provider halt matches the provider, and an actor with no provider is unaffected", () => {
    const flags = [flag({ scope: { kind: "provider", id: "anthropic" } })];
    expect(haltDecision(flags, otto).halted).toBe(true);
    expect(haltDecision(flags, { agent: "otto" }).halted).toBe(false);
  });

  test("no flags means no halt", () => {
    expect(haltDecision([], otto).halted).toBe(false);
  });

  test("the most SEVERE matching flag is reported, not the first one listed", () => {
    // A freeze reported in place of an in-force estop would understate the situation to whoever
    // reads the refusal.
    const flags = [flag({ kind: "freeze", reason: "cost" }), flag({ kind: "estop", reason: "incident" })];
    const d = haltDecision(flags, otto);
    expect(d.halted).toBe(true);
    if (d.halted) {
      expect(d.flag).toBe("estop");
      expect(d.reason).toBe("incident");
    }
  });

  test("severity order is estop first", () => {
    expect(FLAG_SEVERITY[0]).toBe("estop");
  });
});

describe("could-not-tell is never permission", () => {
  test("an ABSENT document proceeds — otherwise the fleet could never start", () => {
    expect(haltDecisionFromSource({ absent: true }, otto).halted).toBe(false);
  });

  test("an UNREADABLE document halts", () => {
    const d = haltDecisionFromSource({ ok: false, why: "disk on fire" }, otto);
    expect(d.halted).toBe(true);
    if (d.halted) expect(d.reason).toContain("not permission");
  });

  test("malformed JSON is unreadable, not empty", () => {
    const source = parseFlags("{not json");
    expect(source.ok).toBe(false);
    expect(haltDecisionFromSource(source, otto).halted).toBe(true);
  });

  test("ONE unparseable entry makes the WHOLE document unreadable", () => {
    // The tempting behaviour is to skip the bad entry and use the rest. The entry nobody could parse
    // is exactly the one that might have been the estop, so dropping it turns a corrupt halt into a
    // silent go.
    const raw = JSON.stringify([
      { kind: "estop", scope: { kind: "organization" }, reason: "r", setBy: "a" },
      { kind: "not-a-real-kind", scope: { kind: "organization" }, reason: "r", setBy: "a" },
    ]);
    expect(parseFlags(raw).ok).toBe(false);
  });

  test("a flag with no reason or no setBy is refused — an unexplained halt looks like a fault", () => {
    const noReason = JSON.stringify([{ kind: "estop", scope: { kind: "organization" }, reason: "", setBy: "a" }]);
    const noSetBy = JSON.stringify([{ kind: "estop", scope: { kind: "organization" }, reason: "r", setBy: "" }]);
    expect(parseFlags(noReason).ok).toBe(false);
    expect(parseFlags(noSetBy).ok).toBe(false);
  });

  test("a scoped flag with no id is refused rather than silently treated as organization-wide", () => {
    const raw = JSON.stringify([{ kind: "estop", scope: { kind: "agent" }, reason: "r", setBy: "a" }]);
    expect(parseFlags(raw).ok).toBe(false);
  });

  test("a valid document round-trips", () => {
    const raw = JSON.stringify([{ kind: "freeze", scope: { kind: "hat", id: "release" }, reason: "audit", setBy: "aaron" }]);
    const source = parseFlags(raw);
    expect(source.ok).toBe(true);
    if (source.ok) expect(source.flags).toHaveLength(1);
  });
});

describe("loadFlags on a real filesystem", () => {
  test("missing file is absent; corrupt file halts; valid file is read", () => {
    const dir = mkdtempSync(join(tmpdir(), "zeta-control-plane-"));
    try {
      const missing = join(dir, "nope.json");
      expect("absent" in loadFlags(missing)).toBe(true);

      const corrupt = join(dir, "corrupt.json");
      writeFileSync(corrupt, "{{{", "utf8");
      const c = loadFlags(corrupt);
      expect("absent" in c).toBe(false);
      expect(haltDecisionFromSource(c, otto).halted).toBe(true);

      const good = join(dir, "good.json");
      writeFileSync(good, JSON.stringify([{ kind: "estop", scope: { kind: "organization" }, reason: "r", setBy: "a" }]), "utf8");
      expect(haltDecisionFromSource(loadFlags(good), otto).halted).toBe(true);

      // A DIRECTORY where the file should be is unreadable, not absent — EISDIR, not ENOENT.
      const asDir = join(dir, "adir.json");
      mkdirSync(asDir);
      expect("absent" in loadFlags(asDir)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
