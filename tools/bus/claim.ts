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

import { openSync, closeSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { publish, list, BUS_DIR, ensureDir } from "./bus.ts";
import { SENDER_IDS } from "./types.ts";
import type { AgentId, SenderAgentId, MessageEnvelope } from "./types.ts";

// Per-item advisory file lock — guards acquire's check+publish against concurrent processes.
function lockFilePath(itemId: string): string {
  const safe = itemId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(BUS_DIR, `acquire-${safe}.lock`);
}

function withAcquireLock<T>(itemId: string, fn: () => T): T {
  ensureDir();
  const lp = lockFilePath(itemId);
  let fd: number | undefined;
  // O_CREAT|O_EXCL ("wx"): atomic exclusive create — exactly one winner per race.
  for (let i = 0; i < 3; i++) {
    try { fd = openSync(lp, "wx"); break; } catch { /* retry */ }
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
  timestamp: string;
  expiresAt: string;
};

/**
 * Returns all active (non-expired) claim messages for a given backlog item.
 * A "claim" means action === "claim"; "release" messages with the same itemId
 * cancel the claim — so we filter to the latest action per sender.
 */
export function activeClaims(itemId: string): ClaimRecord[] {
  const msgs = list({ topic: "claim" });

  // Latest action wins per (from, itemId) pair — only known actions participate
  // so a malformed sender cannot silently clear a valid claim.
  const byKey = new Map<string, MessageEnvelope>();
  for (const m of msgs) {
    // Guard against null/non-object payloads written by buggy senders.
    if (!m.payload || typeof m.payload !== "object" || Array.isArray(m.payload)) continue;
    const p = m.payload as { action: string; itemId: string; branch?: string };
    if (p.itemId !== itemId) continue;
    if (p.action !== "claim" && p.action !== "release") continue;
    const key = `${m.from}:${p.itemId}`;
    const existing = byKey.get(key);
    // Tiebreak equal timestamps by id (UUID lexicographic) for determinism.
    const newer = !existing ||
      m.timestamp > existing.timestamp ||
      (m.timestamp === existing.timestamp && m.id > existing.id);
    if (newer) byKey.set(key, m);
  }

  const records: ClaimRecord[] = [];
  for (const m of byKey.values()) {
    const p = m.payload as { action: string; itemId: string; branch?: string };
    if (p.action !== "claim") continue; // release means no active claim
    records.push({
      id: m.id,
      from: m.from,
      itemId: p.itemId,
      branch: p.branch,
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
  claim.ts acquire --from <agent> --item <id> [--branch <branch>] [--json]
  claim.ts release --from <agent> --item <id> [--json]

Agents: ${SENDER_IDS.join(" | ")}`);
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
          console.log(`${itemId}: claimed by ${c.from}${c.branch ? ` (${c.branch})` : ""} since ${c.timestamp}`);
        }
      }
      process.exit(claims.length > 0 ? 1 : 0);
    }

    case "acquire": {
      const from = flags.from as SenderAgentId | undefined;
      const itemId = flags.item;
      const branch = flags.branch;
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
            payload: { action: "claim", itemId, ...(branch ? { branch } : {}) },
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
        console.log(JSON.stringify({ itemId, acquired: true, messageId }));
      } else {
        console.log(`${itemId}: claimed by ${sender}${branch ? ` (${branch})` : ""} — ${messageId}`);
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
