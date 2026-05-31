/**
 * Agent-bus Phase 1 (B-0954) — subscribe.
 *
 * `readEnvelopesSince` is PURE (read the folder; filter by an ISO ts cursor; sort).
 * The CLI (`import.meta.main`) is the cross-machine read: `git pull` first, then read
 * — so a peer's pushed envelopes (incl. a Windows peer) arrive. Tests import
 * `readEnvelopesSince` against a temp root and never touch git.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { AGENT_BUS_ROOT, type AgentBusEnvelope } from "./types";

/** Recursively collect every `*.json` file under `dir` (depth-first; missing dir -> []). */
function walkJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkJson(p));
    else if (entry.endsWith(".json")) out.push(p);
  }
  return out;
}

/**
 * Read all envelopes with `ts` strictly after `sinceTs` (ISO 8601 sorts
 * lexicographically), sorted by `(ts, zetaIdHex)` for a stable cross-machine order.
 * No cursor -> all. Malformed files are skipped with a warning (best-effort; a bad
 * envelope must not break the read for everyone — exceptions-as-signals).
 */
export function readEnvelopesSince(root: string = AGENT_BUS_ROOT, sinceTs?: string): AgentBusEnvelope[] {
  const envs: AgentBusEnvelope[] = [];
  for (const file of walkJson(root)) {
    let env: AgentBusEnvelope;
    try {
      env = JSON.parse(readFileSync(file, "utf-8")) as AgentBusEnvelope;
    } catch {
      console.warn(`agent-bus: skipping malformed envelope ${file}`);
      continue;
    }
    if (sinceTs === undefined || env.ts > sinceTs) envs.push(env);
  }
  envs.sort((a, b) => (a.ts === b.ts ? a.zetaIdHex.localeCompare(b.zetaIdHex) : a.ts.localeCompare(b.ts)));
  return envs;
}

/** The next cursor = the last (newest) envelope's ts, or the prior cursor if none. */
export function nextCursor(envs: readonly AgentBusEnvelope[], prior?: string): string | undefined {
  return envs.length > 0 ? envs[envs.length - 1]!.ts : prior;
}

if (import.meta.main) {
  // usage: bun tools/agent-bus/subscribe.ts [sinceTs] [--no-pull]
  if (!process.argv.includes("--no-pull")) {
    try {
      execFileSync("git", ["pull", "--ff-only"], { stdio: "inherit" });
    } catch {
      console.warn("agent-bus: git pull failed (offline?) — reading local state only");
    }
  }
  const sinceTs = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const envs = readEnvelopesSince(AGENT_BUS_ROOT, sinceTs);
  console.log(JSON.stringify({ count: envs.length, cursor: nextCursor(envs, sinceTs), envelopes: envs }, null, 2));
}
