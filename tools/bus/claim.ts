#!/usr/bin/env bun
// claim.ts — Claim-coordination helper for the inter-agent bus (B-0400 slice 3)
//
// Wraps the `claim` topic into three typed commands so agents can coordinate
// ownership of backlog items without writing ad-hoc publish calls.
//
// Usage:
//   bun tools/bus/claim.ts check   --item B-0400 [--json]
//   bun tools/bus/claim.ts acquire --from otto --item B-0400 [--branch feat/x] [--json]
//   bun tools/bus/claim.ts release --from otto --item B-0400 [--json]
//
// Exit codes:
//   check:   0 = unclaimed, 1 = claimed (by any agent — check has no --from)
//   acquire: 0 = claim published, 1 = already claimed (no publish)
//   release: 0 = release published, 1 = error

import { openSync, closeSync, unlinkSync, statSync, writeSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { publish, list, BUS_DIR, ensureDir } from "./bus.ts";
import { SENDER_IDS } from "./types.ts";
import type { AgentId, SenderAgentId, MessageEnvelope } from "./types.ts";

// Stale lock threshold — age floor before a lock is a candidate for reclamation.
// Used together with a PID liveness check: only reclaim if the holder process is
// dead, preventing false-positive reclamation of a slow-but-live holder.
const LOCK_STALE_MS = 5_000;

// Returns true if a process with the given PID is running (signal 0 = liveness probe).
// EPERM means the process exists but we lack permission — still alive.
// ESRCH means the process does not exist — dead.
function isProcessRunning(pid: number): boolean {
  if (isNaN(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; }
}

// Per-item advisory file lock — guards acquire's check+publish against concurrent processes.
// encodeURIComponent produces a collision-free mapping: distinct item IDs always produce
// distinct lock paths (e.g. "A/B" → "A%2FB", "A_B" → "A_B").
function lockFilePath(itemId: string): string {
  return join(BUS_DIR, `acquire-${encodeURIComponent(itemId)}.lock`);
}

function withAcquireLock<T>(itemId: string, fn: () => T): T {
  ensureDir();
  const lp = lockFilePath(itemId);
  let fd: number | undefined;
  // O_CREAT|O_EXCL ("wx"): atomic exclusive create — exactly one winner per race.
  // Write our PID so stale-lock detection can verify the holder is still alive before
  // reclaiming: age threshold guards against reading a newly-created empty file.
  for (let i = 0; i < 3; i++) {
    try {
      fd = openSync(lp, "wx");
      writeSync(fd, String(process.pid));
      break;
    } catch (e) {
      // Only do stale-lock recovery on EEXIST; other errors (permissions, I/O) bubble up.
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        const content = readFileSync(lp, "utf8").trim();
        const holderPid = parseInt(content, 10);
        const st = statSync(lp);
        // Reclaim only if the lock is old enough AND its holder process is dead.
        if (Date.now() - st.mtimeMs > LOCK_STALE_MS && !isProcessRunning(holderPid)) {
          unlinkSync(lp); // reclaim stale lock left by a crashed process
        }
      } catch { /* lock disappeared between reads — harmless */ }
    }
  }
  if (fd === undefined) throw new Error(`${itemId}: acquire lock busy — retry`);
  try {
    return fn();
  } finally {
    closeSync(fd);
    try { unlinkSync(lp); } catch { /* best-effort */ }
  }
}

export type ClaimRecord = {
  id: string;
  from: SenderAgentId;
  itemId: string;
  branch?: string;
  /** Absolute path of the worktree this claim originated from (B-0444). */
  worktree?: string;
  timestamp: string;
  expiresAt: string;
};

// Sub-ms tiebreaker: file mtime reflects actual write order more reliably than
// UUID lexicographic order for messages with the same ISO timestamp string.
function messageMtimeMs(id: string): number {
  try { return statSync(join(BUS_DIR, `${id}.json`)).mtimeMs; }
  catch { return 0; } // message may have expired and been cleaned
}

/**
 * Returns all active (non-expired) claim messages for a given backlog item.
 * A "claim" means action === "claim"; "release" messages with the same itemId
 * cancel the claim — so we filter to the latest action per sender.
 */
export function activeClaims(itemId: string): ClaimRecord[] {
  const msgs = list({ topic: "claim" });

  // Latest action wins per (from, itemId) pair — only known actions participate
  // so a malformed sender cannot silently clear a valid claim.
  type Entry = { envelope: MessageEnvelope; mtime: number; idx: number };
  const byKey = new Map<string, Entry>();

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]!;
    // Guard against null/non-object payloads written by buggy senders.
    if (!m.payload || typeof m.payload !== "object" || Array.isArray(m.payload)) continue;
    const p = m.payload as { action: string; itemId: string; branch?: string; worktree?: string };
    if (p.itemId !== itemId) continue;
    if (p.action !== "claim" && p.action !== "release") continue;
    const key = `${m.from}:${p.itemId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { envelope: m, mtime: messageMtimeMs(m.id), idx: i });
      continue;
    }
    if (m.timestamp > existing.envelope.timestamp) {
      byKey.set(key, { envelope: m, mtime: messageMtimeMs(m.id), idx: i });
    } else if (m.timestamp === existing.envelope.timestamp) {
      // Same ISO timestamp: use file mtime (sub-ms precision) then list index.
      const mm = messageMtimeMs(m.id);
      if (mm > existing.mtime || (mm === existing.mtime && i > existing.idx)) {
        byKey.set(key, { envelope: m, mtime: mm, idx: i });
      }
    }
  }

  const records: ClaimRecord[] = [];
  for (const { envelope: m } of byKey.values()) {
    const p = m.payload as { action: string; itemId: string; branch?: string; worktree?: string };
    if (p.action !== "claim") continue; // release means no active claim
    records.push({
      id: m.id,
      from: m.from,
      itemId: p.itemId,
      ...(p.branch !== undefined && { branch: p.branch }),
      ...(p.worktree !== undefined && { worktree: p.worktree }),
      timestamp: m.timestamp,
      expiresAt: m.expiresAt,
    });
  }
  return records;
}

/**
 * Returns all active bus claims across every backlog item.
 * Single pass over claim-topic messages — latest action per (from, itemId) wins.
 */
export function allActiveClaims(): ClaimRecord[] {
  const msgs = list({ topic: "claim" });

  type Entry = { envelope: MessageEnvelope; mtime: number; idx: number };
  const byKey = new Map<string, Entry>();

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]!;
    if (!m.payload || typeof m.payload !== "object" || Array.isArray(m.payload)) continue;
    const p = m.payload as { action: string; itemId?: unknown; branch?: string; worktree?: string };
    if (typeof p.itemId !== "string") continue;
    if (p.action !== "claim" && p.action !== "release") continue;
    const key = `${m.from}:${p.itemId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { envelope: m, mtime: messageMtimeMs(m.id), idx: i });
      continue;
    }
    if (m.timestamp > existing.envelope.timestamp) {
      byKey.set(key, { envelope: m, mtime: messageMtimeMs(m.id), idx: i });
    } else if (m.timestamp === existing.envelope.timestamp) {
      const mm = messageMtimeMs(m.id);
      if (mm > existing.mtime || (mm === existing.mtime && i > existing.idx)) {
        byKey.set(key, { envelope: m, mtime: mm, idx: i });
      }
    }
  }

  const records: ClaimRecord[] = [];
  for (const { envelope: m } of byKey.values()) {
    const p = m.payload as { action: string; itemId: string; branch?: string; worktree?: string };
    if (p.action !== "claim") continue;
    records.push({
      id: m.id,
      from: m.from,
      itemId: p.itemId,
      ...(p.branch !== undefined && { branch: p.branch }),
      ...(p.worktree !== undefined && { worktree: p.worktree }),
      timestamp: m.timestamp,
      expiresAt: m.expiresAt,
    });
  }
  return records;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { command: string; flags: Record<string, string> } {
  const args = argv.slice(2);
  const command = args[0] ?? "";
  const flags: Record<string, string> = {};
  for (let i = 1; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return { command, flags };
}

function usage(): void {
  console.log(`Usage:
  claim.ts check   --item <id> [--json]
  claim.ts acquire --from <agent> --item <id> [--branch <branch>] [--worktree <path>] [--json]
  claim.ts release --from <agent> --item <id> [--json]

Agents: ${SENDER_IDS.join(" | ")}

--worktree defaults to process.cwd() when not specified (B-0444).`);
}

function main(): void {
  const { command, flags } = parseArgs(process.argv);
  const asJson = flags.json === "true";

  switch (command) {
    case "check": {
      const itemId = flags.item;
      if (!itemId) { console.error("Error: --item is required"); process.exit(1); }

      const claims = activeClaims(itemId);
      if (asJson) {
        console.log(JSON.stringify({ itemId, claims, claimed: claims.length > 0 }));
      } else if (claims.length === 0) {
        console.log(`${itemId}: unclaimed`);
      } else {
        for (const c of claims) {
          const branchStr = c.branch ? ` (${c.branch})` : "";
          const worktreeStr = c.worktree ? ` [worktree: ${c.worktree}]` : "";
          console.log(`${itemId}: claimed by ${c.from}${branchStr}${worktreeStr} since ${c.timestamp}`);
        }
      }
      process.exit(claims.length > 0 ? 1 : 0);
    }

    case "acquire": {
      const from = flags.from as SenderAgentId | undefined;
      const itemId = flags.item;
      const branch = flags.branch;
      // B-0444: --worktree captures the per-process operational coordinate.
      // Defaults to process.cwd() so callers that omit it still publish a useful
      // observability signal — the worktree the claim was acquired from.
      //
      // parseArgs encodes a bare `--worktree` (no value) as the literal string
      // "true"; accepting that would record "true" as the worktree path and
      // make claim provenance misleading. Reject fast so the user notices.
      // (Codex P2 review on PR #3043.)
      if (flags.worktree === "true") {
        console.error("Error: --worktree requires a path argument");
        process.exit(1);
      }
      const worktree = flags.worktree ?? process.cwd();
      if (!from || !itemId) {
        console.error("Error: --from and --item are required");
        process.exit(1);
      }
      if (!SENDER_IDS.includes(from)) {
        console.error(`Error: unknown sender '${from}'. Valid: ${SENDER_IDS.join(", ")}`);
        process.exit(1);
      }

      const sender = from; // capture narrowed type for use inside closure
      let acquired = false;
      let claimedByOthers: string[] = [];
      let messageId: string | undefined;

      try {
        ({ acquired, claimedByOthers, messageId } = withAcquireLock(itemId, () => {
          const existing = activeClaims(itemId).filter((c) => c.from !== sender);
          if (existing.length > 0) {
            return { acquired: false, claimedByOthers: existing.map((c) => c.from as string), messageId: undefined };
          }
          const env = publish(sender, "*" as AgentId, {
            topic: "claim",
            payload: {
              action: "claim",
              itemId,
              ...(branch ? { branch } : {}),
              ...(worktree ? { worktree } : {}),
            },
          });
          return { acquired: true, claimedByOthers: [] as string[], messageId: env.id };
        }));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }

      if (!acquired) {
        if (asJson) {
          console.log(JSON.stringify({ itemId, acquired: false, claimedBy: claimedByOthers }));
        } else {
          console.error(`${itemId}: already claimed by ${claimedByOthers.join(", ")} — not acquiring`);
        }
        process.exit(1);
      }

      if (asJson) {
        console.log(JSON.stringify({ itemId, acquired: true, messageId, worktree }));
      } else {
        const branchStr = branch ? ` (${branch})` : "";
        const worktreeStr = worktree ? ` [worktree: ${worktree}]` : "";
        console.log(`${itemId}: claimed by ${sender}${branchStr}${worktreeStr} — ${messageId}`);
      }
      break;
    }

    case "release": {
      const from = flags.from as SenderAgentId | undefined;
      const itemId = flags.item;
      if (!from || !itemId) {
        console.error("Error: --from and --item are required");
        process.exit(1);
      }
      if (!SENDER_IDS.includes(from)) {
        console.error(`Error: unknown sender '${from}'. Valid: ${SENDER_IDS.join(", ")}`);
        process.exit(1);
      }

      const env = publish(from, "*" as AgentId, {
        topic: "claim",
        payload: { action: "release", itemId },
      });
      if (asJson) {
        console.log(JSON.stringify({ itemId, released: true, messageId: env.id }));
      } else {
        console.log(`${itemId}: released by ${from} — ${env.id}`);
      }
      break;
    }

    default:
      usage();
      process.exit(command ? 1 : 0);
  }
}

if (import.meta.main) {
  main();
}
