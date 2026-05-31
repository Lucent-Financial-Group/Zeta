/**
 * Agent-bus Phase 1 (B-0954) — publish.
 *
 * `writeEnvelope` is PURE (file write only; idempotent on identical content — the
 * G-Set CRDT property). The CLI (`import.meta.main`) is the no-PR runtime: write the
 * file, then `git add/commit/push` directly to main (no PR) — the B-0858 mechanism.
 * Tests import `writeEnvelope` against a temp root and never touch git.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { AGENT_BUS_ROOT, envelopePath, serializeEnvelope, mintBusZetaIdHex, type AgentBusEnvelope } from "./types";
import type { AgentId, SenderAgentId, BusMessage } from "../bus/types";

export type WriteResult =
  | { readonly kind: "created"; readonly path: string }
  | { readonly kind: "exists-identical"; readonly path: string } // idempotent re-publish (G-Set CRDT)
  | { readonly kind: "collision"; readonly path: string }; // same zetaId, DIFFERENT content — should never happen with crypto ids

/**
 * Write an envelope as its ZetaId-named file. Idempotent on identical content (re-
 * publishing the same envelope is a safe no-op — the grow-only-set property). A
 * same-id/different-content collision is surfaced as feedback (`kind: "collision"`),
 * never silently overwritten — the writer decides (per the spec's collision caveat).
 */
export function writeEnvelope(
  env: AgentBusEnvelope,
  root: string = AGENT_BUS_ROOT,
  at: Date = new Date(),
): WriteResult {
  const path = envelopePath(root, env.from, env.zetaIdHex, at);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8") === serializeEnvelope(env)
      ? { kind: "exists-identical", path }
      : { kind: "collision", path };
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, serializeEnvelope(env));
  return { kind: "created", path };
}

/** Build an envelope: mint a fresh Bus ZetaId + stamp the ISO ts. */
export function makeEnvelope(from: SenderAgentId, to: AgentId, message: BusMessage, atMs: number = Date.now()): AgentBusEnvelope {
  return { zetaIdHex: mintBusZetaIdHex(undefined, atMs), from, to, ts: new Date(atMs).toISOString(), message };
}

// ── no-PR runtime: write + git add/commit/push directly to main (B-0858) ──────────
// Guarded behind import.meta.main so importing this module (tests) never runs git.

function gitPushEnvelope(path: string, from: SenderAgentId, topic: string): void {
  const opts = { stdio: "inherit" as const };
  execFileSync("git", ["add", path], opts);
  execFileSync("git", ["commit", "-q", "-m", `bus(${from}): ${topic} ${path}`], opts);
  // Direct-to-main, no PR (the B-0858 carve-out). A concurrent peer publishing its OWN
  // disjoint envelope advances main, so this push can be rejected non-fast-forward — but
  // the envelopes are disjoint ZetaId files (the G-Set CRDT), so `pull --rebase` NEVER
  // conflicts; integrate the peer's commit + retry. (Codex #6283.)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      execFileSync("git", ["push"], opts);
      return;
    } catch {
      execFileSync("git", ["pull", "--rebase"], opts);
    }
  }
  execFileSync("git", ["push"], opts); // final attempt — throws if still failing (surfaced, not swallowed)
}

if (import.meta.main) {
  // usage: bun tools/agent-bus/publish.ts <from> <to> <topic> <json-payload> [--no-push]
  const [from, to, topic, payloadJson] = process.argv.slice(2);
  if (!from || !to || !topic || !payloadJson) {
    console.error("usage: publish.ts <from> <to> <topic> <json-payload> [--no-push]");
    process.exit(2);
  }
  const message = { topic, payload: JSON.parse(payloadJson) } as BusMessage;
  const env = makeEnvelope(from as SenderAgentId, to as AgentId, message);
  const result = writeEnvelope(env);
  console.log(JSON.stringify({ result: result.kind, path: result.path, zetaIdHex: env.zetaIdHex }));
  if (result.kind === "collision") process.exit(1);
  if (result.kind === "created" && !process.argv.includes("--no-push")) {
    gitPushEnvelope(result.path, env.from, topic);
  }
}
