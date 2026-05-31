/**
 * Agent-bus Phase 1 (B-0954) tests — pure write/read/mint against a temp root.
 * No git, no real docs/agent-bus/ (per the module's pure/CLI split).
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { DETERMINISTIC_ENV, DEFAULT_ENV, unpack } from "../../src/Core.TypeScript/zeta-id/zeta-id";
import { Category } from "../../src/Core.TypeScript/zeta-id/types";
import { envelopePath, mintBusZetaIdHex, serializeEnvelope, type AgentBusEnvelope } from "./types";
import { writeEnvelope, makeEnvelope } from "./publish";
import { readEnvelopesSince, nextCursor } from "./subscribe";

let ROOT: string;
beforeEach(() => {
  ROOT = mkdtempSync(join(tmpdir(), "agent-bus-test-"));
});
afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

const env = (over: Partial<AgentBusEnvelope> = {}): AgentBusEnvelope => ({
  zetaIdHex: "00000000000000000000000000000001",
  from: "otto-cli",
  to: "*",
  ts: "2026-05-31T12:00:00.000Z",
  message: { topic: "shadow-catch", payload: { content: "hi" } },
  ...over,
});

describe("mintBusZetaIdHex", () => {
  it("is 32 hex chars in the Bus category", () => {
    const hex = mintBusZetaIdHex(DETERMINISTIC_ENV, 1_700_000_000_000);
    expect(hex).toMatch(/^[0-9a-f]{32}$/);
    const obs = unpack(BigInt(`0x${hex}`) as never);
    expect(obs.category).toBe(Category.Bus);
  });

  it("is reproducible under DETERMINISTIC_ENV (same fields -> same id; the G-Set collision caveat)", () => {
    const a = mintBusZetaIdHex(DETERMINISTIC_ENV, 1_700_000_000_000);
    const b = mintBusZetaIdHex(DETERMINISTIC_ENV, 1_700_000_000_000);
    expect(a).toBe(b);
  });

  it("is unique under DEFAULT_ENV even at the same ms (crypto randomness)", () => {
    const a = mintBusZetaIdHex(DEFAULT_ENV, 1_700_000_000_000);
    const b = mintBusZetaIdHex(DEFAULT_ENV, 1_700_000_000_000);
    expect(a).not.toBe(b);
  });
});

describe("envelopePath", () => {
  it("lays out <root>/<persona>/<YYYY>/<MM>/<DD>/<hex>.json (UTC)", () => {
    const p = envelopePath(ROOT, "otto-cli", "deadbeef", new Date("2026-05-31T23:59:00Z"));
    expect(p).toBe(join(ROOT, "otto-cli", "2026", "05", "31", "deadbeef.json"));
  });
});

describe("writeEnvelope — G-Set CRDT semantics", () => {
  it("creates the file under the persona/date path", () => {
    const r = writeEnvelope(env(), ROOT, new Date("2026-05-31T12:00:00Z"));
    expect(r.kind).toBe("created");
    expect(existsSync(r.path)).toBe(true);
    expect(r.path).toBe(join(ROOT, "otto-cli", "2026", "05", "31", `${env().zetaIdHex}.json`));
  });

  it("is idempotent on identical content (re-publish = safe no-op)", () => {
    const at = new Date("2026-05-31T12:00:00Z");
    expect(writeEnvelope(env(), ROOT, at).kind).toBe("created");
    expect(writeEnvelope(env(), ROOT, at).kind).toBe("exists-identical");
  });

  it("surfaces a same-id/different-content collision (never silently overwrites)", () => {
    const at = new Date("2026-05-31T12:00:00Z");
    writeEnvelope(env(), ROOT, at);
    const r = writeEnvelope(env({ message: { topic: "shadow-catch", payload: { content: "DIFFERENT" } } }), ROOT, at);
    expect(r.kind).toBe("collision");
  });

  it("disjoint zetaIds -> disjoint files (grow-only set, conflict-free)", () => {
    const at = new Date("2026-05-31T12:00:00Z");
    writeEnvelope(env({ zetaIdHex: "00000000000000000000000000000001" }), ROOT, at);
    writeEnvelope(env({ zetaIdHex: "00000000000000000000000000000002" }), ROOT, at);
    expect(readEnvelopesSince(ROOT)).toHaveLength(2);
  });
});

describe("readEnvelopesSince", () => {
  const at = new Date("2026-05-31T12:00:00Z");
  const seed = () => {
    writeEnvelope(env({ zetaIdHex: "01".padStart(32, "0"), ts: "2026-05-31T10:00:00.000Z" }), ROOT, at);
    writeEnvelope(env({ zetaIdHex: "02".padStart(32, "0"), ts: "2026-05-31T11:00:00.000Z" }), ROOT, at);
    writeEnvelope(env({ zetaIdHex: "03".padStart(32, "0"), ts: "2026-05-31T12:00:00.000Z" }), ROOT, at);
  };

  it("returns all envelopes sorted by ts when no cursor", () => {
    seed();
    expect(readEnvelopesSince(ROOT).map((e) => e.ts)).toEqual([
      "2026-05-31T10:00:00.000Z",
      "2026-05-31T11:00:00.000Z",
      "2026-05-31T12:00:00.000Z",
    ]);
  });

  it("returns only envelopes strictly after the cursor", () => {
    seed();
    const after = readEnvelopesSince(ROOT, "2026-05-31T10:30:00.000Z");
    expect(after.map((e) => e.ts)).toEqual(["2026-05-31T11:00:00.000Z", "2026-05-31T12:00:00.000Z"]);
  });

  it("nextCursor is the newest ts (advances the read position)", () => {
    seed();
    expect(nextCursor(readEnvelopesSince(ROOT))).toBe("2026-05-31T12:00:00.000Z");
  });

  it("skips malformed envelopes (best-effort) without throwing", () => {
    writeEnvelope(env(), ROOT, at);
    const bad = join(ROOT, "otto-cli", "2026", "05", "31", "ffffffffffffffffffffffffffffffff.json");
    mkdirSync(dirname(bad), { recursive: true });
    writeFileSync(bad, "{ not json");
    expect(readEnvelopesSince(ROOT)).toHaveLength(1); // the one good envelope; bad skipped
  });
});

describe("serializeEnvelope", () => {
  it("is stable (pretty + trailing newline) so re-publish content-matches", () => {
    const s = serializeEnvelope(env());
    expect(s.endsWith("}\n")).toBe(true);
    expect(JSON.parse(s).zetaIdHex).toBe(env().zetaIdHex);
  });
});

describe("makeEnvelope", () => {
  it("mints a Bus zetaId + ISO ts for a given message", () => {
    const e = makeEnvelope("otto-cli", "*", { topic: "heartbeat", payload: { status: "alive" } }, 1_700_000_000_000);
    expect(e.zetaIdHex).toMatch(/^[0-9a-f]{32}$/);
    expect(e.ts).toBe(new Date(1_700_000_000_000).toISOString());
    expect(e.from).toBe("otto-cli");
  });
});
