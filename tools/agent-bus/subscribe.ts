/**
 * Agent-bus Phase 1 (B-0954) — subscribe.
 *
 * `readEnvelopesSince` is PURE (read a folder; filter by a COMPOUND `(timestamp, id)`
 * cursor; sort). The CLI (`import.meta.main`) does the cross-machine read **from
 * `origin/main`** (not the working tree): `git fetch origin main`, then read the bus
 * folder at the `origin/main` tree via `readEnvelopesFromGitRef` — so it works even
 * when the agent is checked out on a feature branch or a stale worktree (the
 * post-fetch-read-trap). Tests import the pure readers and never touch git.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { AGENT_BUS_ROOT, type AgentBusEnvelope } from "./types";

/**
 * Compound cursor `<timestamp>|<id>` — the read position. timestamp alone drops a
 * later envelope sharing the cursor's millisecond; the id tiebreak fixes that. ISO
 * timestamp sorts lexicographically; the id (32-hex) breaks ties deterministically.
 */
export function envelopeCursor(env: AgentBusEnvelope): string {
  return `${env.timestamp}|${env.id}`;
}

/** A parsed value is a usable envelope only if its ordering keys are present strings. */
function isReadableEnvelope(v: unknown): v is AgentBusEnvelope {
  const e = v as Partial<AgentBusEnvelope> | null;
  return !!e && typeof e === "object" && typeof e.timestamp === "string" && typeof e.id === "string";
}

/** Parse + schema-validate + compound-cursor-filter + stable-sort envelope JSON strings. */
function collect(files: Iterable<{ path: string; json: string }>, cursor?: string): AgentBusEnvelope[] {
  const envs: AgentBusEnvelope[] = [];
  for (const { path, json } of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      console.warn(`agent-bus: skipping malformed envelope ${path}`);
      continue;
    }
    if (!isReadableEnvelope(parsed)) {
      console.warn(`agent-bus: skipping schema-invalid envelope (missing timestamp/id) ${path}`);
      continue;
    }
    if (cursor === undefined || envelopeCursor(parsed) > cursor) envs.push(parsed);
  }
  envs.sort((a, b) => envelopeCursor(a).localeCompare(envelopeCursor(b)));
  return envs;
}

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
 * PURE filesystem read: all envelopes under `root` with a compound cursor strictly
 * after `cursor` (`<timestamp>|<id>`), sorted by that cursor. No cursor -> all.
 * Malformed + schema-invalid files skipped (best-effort; one bad envelope must not
 * break the read for everyone).
 */
export function readEnvelopesSince(root: string = AGENT_BUS_ROOT, cursor?: string): AgentBusEnvelope[] {
  return collect(
    walkJson(root).map((path) => ({ path, json: readFileSync(path, "utf-8") })),
    cursor,
  );
}

/**
 * Read the bus folder at a git REF (e.g. `origin/main`) rather than the working tree —
 * the cross-machine-correct read (the working tree may be on a feature branch / stale).
 * Uses `git ls-tree` + `git show`; same schema-validate + compound-cursor filter + sort.
 */
export function readEnvelopesFromGitRef(ref: string, root: string = AGENT_BUS_ROOT, cursor?: string): AgentBusEnvelope[] {
  let listing: string;
  try {
    listing = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "--", root], { encoding: "utf-8" });
  } catch {
    return []; // ref or path absent (e.g. no bus folder yet)
  }
  const paths = listing.split("\n").filter((p) => p.endsWith(".json"));
  return collect(
    paths.map((path) => ({ path, json: execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf-8" }) })),
    cursor,
  );
}

/** The next compound cursor = the last (newest) envelope's `<timestamp>|<id>`, else prior. */
export function nextCursor(envs: readonly AgentBusEnvelope[], prior?: string): string | undefined {
  return envs.length > 0 ? envelopeCursor(envs[envs.length - 1]!) : prior;
}

if (import.meta.main) {
  // usage: bun tools/agent-bus/subscribe.ts [cursor] [--no-fetch]
  // cursor = "<timestamp>|<id>" from a prior run (or a bare ISO timestamp as a lower bound).
  const ref = "origin/main";
  if (!process.argv.includes("--no-fetch")) {
    try {
      execFileSync("git", ["fetch", "origin", "main"], { stdio: "inherit" });
    } catch {
      console.warn("agent-bus: git fetch failed (offline?) — reading last-known origin/main");
    }
  }
  const cursor = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const envs = readEnvelopesFromGitRef(ref, AGENT_BUS_ROOT, cursor);
  console.log(JSON.stringify({ count: envs.length, cursor: nextCursor(envs, cursor), envelopes: envs }, null, 2));
}
