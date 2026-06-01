/**
 * Agent-bus Phase 1 (B-0954) — publish.
 *
 * `writeEnvelope` is PURE (atomic file create; idempotent on identical content — the
 * G-Set CRDT property; collision-surfacing via an ATOMIC `wx` create, no TOCTOU). The
 * CLI (`import.meta.main`) is the no-PR runtime: write the file, then commit
 * `--no-verify` + push `origin HEAD:main` directly (no PR) — the B-0858 mechanism;
 * guarded by `import.meta.main` so tests never touch git.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { AGENT_BUS_ROOT, envelopePath, serializeEnvelope, makeEnvelope, type AgentBusEnvelope } from "./types";
import { SENDER_IDS, AGENT_IDS, type AgentId, type SenderAgentId, type BusMessage } from "../bus/types";

export { makeEnvelope };

export type WriteResult =
  | { readonly kind: "created"; readonly path: string }
  | { readonly kind: "exists-identical"; readonly path: string } // idempotent re-publish (G-Set CRDT)
  | { readonly kind: "collision"; readonly path: string }; // same id, DIFFERENT content — should never happen with crypto ids

/**
 * Write an envelope as its ZetaId-named file via an ATOMIC create (`flag: "wx"` —
 * fails if the file exists, no TOCTOU window). On `EEXIST`, compare the existing
 * content: identical -> idempotent no-op (the grow-only-set property); different ->
 * surfaced as `collision` (never silently overwritten — the spec's collision caveat).
 */
export function writeEnvelope(
  env: AgentBusEnvelope,
  root: string = AGENT_BUS_ROOT,
  at: Date = new Date(),
): WriteResult {
  const path = envelopePath(root, env.from, env.id, at);
  const content = serializeEnvelope(env);
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, content, { flag: "wx" }); // atomic: fail if exists
    return { kind: "created", path };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    return readFileSync(path, "utf-8") === content
      ? { kind: "exists-identical", path }
      : { kind: "collision", path };
  }
}

// ── no-PR runtime: write + commit --no-verify + push origin HEAD:main (B-0858) ──────
// Guarded behind import.meta.main so importing this module (tests) never runs git.

function gitPushEnvelope(path: string, from: SenderAgentId, topic: string): void {
  const opts = { stdio: "inherit" as const };
  // The bus folder lives on main; publishing from a feature branch would push that
  // branch's unrelated commits to main. Require a main checkout (or a bus worktree on main).
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf-8" }).trim();
  if (branch !== "main") {
    throw new Error(`agent-bus publish must run on a main checkout (on '${branch}'); use a bus worktree on main`);
  }
  // Refuse if local main is ahead of origin/main: `git push HEAD:main` would shove those
  // unrelated local commits straight to main alongside the envelope (Codex #6283 P1).
  // Fetch first so the comparison is against fresh origin/main, then require 0 ahead.
  execFileSync("git", ["fetch", "origin", "main"], opts);
  const ahead = execFileSync("git", ["rev-list", "--count", "origin/main..HEAD"], { encoding: "utf-8" }).trim();
  if (ahead !== "0") {
    throw new Error(
      `agent-bus publish: local main is ${ahead} commit(s) ahead of origin/main; reconcile before publishing (refusing to push unrelated commits to main)`,
    );
  }
  execFileSync("git", ["add", path], opts);
  // --no-verify: bus envelopes are DATA, not code — skip code hooks.
  // Pathspec `-- path` commits ONLY the envelope, never pre-staged work already in the
  // checkout (Codex #6283 P2 — a direct-to-main --no-verify commit must not sweep it in).
  execFileSync("git", ["commit", "--no-verify", "-q", "-m", `bus(${from}): ${topic} ${path}`, "--", path], opts);
  // Explicit target: a concurrent peer advancing main rejects this push non-fast-forward,
  // but disjoint ZetaId files (G-Set CRDT) never conflict -> pull --rebase + retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      execFileSync("git", ["push", "origin", "HEAD:main"], opts);
      return;
    } catch {
      execFileSync("git", ["pull", "--rebase", "origin", "main"], opts);
    }
  }
  execFileSync("git", ["push", "origin", "HEAD:main"], opts); // final attempt — throws if still failing
}

if (import.meta.main) {
  // usage: bun tools/agent-bus/publish.ts <from> <to> <topic> <json-payload> [--no-push]
  const [from, to, topic, payloadJson] = process.argv.slice(2);
  if (!from || !to || !topic || !payloadJson) {
    console.error("usage: publish.ts <from> <to> <topic> <json-payload> [--no-push]");
    process.exit(2);
  }
  // Validate against the canonical allowlists (also blocks path-injection via <from>).
  if (!SENDER_IDS.includes(from as SenderAgentId)) {
    console.error(`unknown sender '${from}'. Valid: ${SENDER_IDS.join(", ")}`);
    process.exit(2);
  }
  if (!AGENT_IDS.includes(to as AgentId)) {
    console.error(`unknown target '${to}'. Valid: ${AGENT_IDS.join(", ")} | *`);
    process.exit(2);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(payloadJson);
  } catch (e) {
    console.error(`invalid JSON payload: ${(e as Error).message}`);
    process.exit(2);
  }
  const message = { topic, payload } as BusMessage;
  const env = makeEnvelope(from as SenderAgentId, to as AgentId, message);
  const result = writeEnvelope(env);
  console.log(JSON.stringify({ result: result.kind, path: result.path, id: env.id }));
  if (result.kind === "collision") process.exit(1);
  if (result.kind === "created" && !process.argv.includes("--no-push")) {
    gitPushEnvelope(result.path, env.from, topic);
  }
}
