#!/usr/bin/env bun
// bus.ts — Inter-agent ephemeral communication bus (B-0400 slice 1)
//
// Transport: /tmp/zeta-bus/ JSON files. Override with ZETA_BUS_DIR env var.
// All subcommands accept --json for programmatic consumption.
//
// Usage:
//   bun tools/bus/bus.ts publish --from otto --to "*" --topic heartbeat --payload '{"status":"alive"}'
//   bun tools/bus/bus.ts list [--topic heartbeat] [--to otto] [--json]
//   bun tools/bus/bus.ts read <id> [--json]
//   bun tools/bus/bus.ts clean [--expired] [--from otto]

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AgentId, MessageEnvelope, Topic, BusMessage } from "./types.ts";
import { TTL_MS } from "./types.ts";

export const BUS_DIR = process.env.ZETA_BUS_DIR ?? join("/tmp", "zeta-bus");

export function ensureDir(): void {
  if (existsSync(BUS_DIR)) {
    if (!lstatSync(BUS_DIR).isDirectory()) throw new Error(`${BUS_DIR} is not a directory`);
    return;
  }
  mkdirSync(BUS_DIR, { recursive: true, mode: 0o700 });
}

function envelopePath(id: string): string {
  return join(BUS_DIR, `${id}.json`);
}

// ── publish ───────────────────────────────────────────────────────────────────

export function publish(
  from: AgentId,
  to: AgentId,
  message: BusMessage,
  ttlOverrideMs?: number,
): MessageEnvelope {
  ensureDir();
  const now = new Date();
  const ttl = ttlOverrideMs ?? TTL_MS[message.topic];
  const envelope: MessageEnvelope = {
    ...message,
    id: randomUUID(),
    from,
    to,
    timestamp: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttl).toISOString(),
  };
  writeFileSync(envelopePath(envelope.id), JSON.stringify(envelope, null, 2));
  return envelope;
}

// ── list ──────────────────────────────────────────────────────────────────────

export function list(opts: { topic?: Topic; to?: AgentId; includeExpired?: boolean }): MessageEnvelope[] {
  ensureDir();
  const now = new Date();
  const files = readdirSync(BUS_DIR).filter((f) => f.endsWith(".json"));
  const results: MessageEnvelope[] = [];
  for (const f of files) {
    try {
      const raw = readFileSync(join(BUS_DIR, f), "utf-8");
      const env = JSON.parse(raw) as MessageEnvelope;
      if (typeof env.id !== "string" || typeof env.topic !== "string") continue;
      if (!opts.includeExpired && new Date(env.expiresAt) < now) continue;
      if (opts.topic && env.topic !== opts.topic) continue;
      if (opts.to && env.to !== opts.to && env.to !== "*") continue;
      results.push(env);
    } catch {
      // corrupted entry — skip
    }
  }
  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ── read ──────────────────────────────────────────────────────────────────────

export function readMessage(id: string): MessageEnvelope | null {
  const p = envelopePath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as MessageEnvelope;
  } catch {
    return null;
  }
}

// ── clean ─────────────────────────────────────────────────────────────────────

export function clean(opts: { expiredOnly?: boolean; from?: AgentId }): number {
  ensureDir();
  const now = new Date();
  const files = readdirSync(BUS_DIR).filter((f) => f.endsWith(".json"));
  let removed = 0;
  for (const f of files) {
    const p = join(BUS_DIR, f);
    try {
      const env = JSON.parse(readFileSync(p, "utf-8")) as MessageEnvelope;
      if (opts.expiredOnly && new Date(env.expiresAt) >= now) continue;
      if (opts.from && env.from !== opts.from) continue;
      rmSync(p, { force: true });
      removed++;
    } catch {
      // best-effort
    }
  }
  return removed;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { command: string; flags: Record<string, string>; positional: string[] } {
  const args = argv.slice(2);
  const command = args[0] ?? "";
  const flags: Record<string, string> = {};
  const positional: string[] = [];
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
    } else {
      positional.push(a);
    }
  }
  return { command, flags, positional };
}

function usage(): void {
  console.log(`Usage:
  bus.ts publish --from <agent> --to <agent|*> --topic <topic> --payload <json>
  bus.ts list [--topic <topic>] [--to <agent>] [--include-expired] [--json]
  bus.ts read <id> [--json]
  bus.ts clean [--expired] [--from <agent>] [--json]

Topics: heartbeat | claim | shadow-catch | review-request
Agents: otto | alexa | riven | vera | lior | * (broadcast)`);
}

function main(): void {
  const { command, flags, positional } = parseArgs(process.argv);
  const asJson = flags.json === "true";

  switch (command) {
    case "publish": {
      const from = flags.from as AgentId | undefined;
      const to = (flags.to ?? "*") as AgentId;
      const topic = flags.topic as Topic | undefined;
      const payloadRaw = flags.payload;
      if (!from || !topic || !payloadRaw) {
        console.error("Error: --from, --topic, and --payload are required");
        process.exit(1);
      }
      let payload: unknown;
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        console.error("Error: --payload must be valid JSON");
        process.exit(1);
      }
      const msg = { topic, payload } as BusMessage;
      const env = publish(from, to, msg);
      if (asJson) {
        console.log(JSON.stringify(env, null, 2));
      } else {
        console.log(`published ${env.id} (${env.topic}, ${env.from}→${env.to}, expires ${env.expiresAt})`);
      }
      break;
    }

    case "list": {
      const envs = list({
        topic: flags.topic as Topic | undefined,
        to: flags.to as AgentId | undefined,
        includeExpired: flags["include-expired"] === "true",
      });
      if (asJson) {
        console.log(JSON.stringify(envs, null, 2));
      } else if (envs.length === 0) {
        console.log("no messages");
      } else {
        for (const e of envs) {
          const payload = JSON.stringify(e.payload).slice(0, 60);
          console.log(`${e.id}  ${e.topic}  ${e.from}→${e.to}  ${e.timestamp}  ${payload}`);
        }
      }
      break;
    }

    case "read": {
      const id = positional[0];
      if (!id) { console.error("Error: message id required"); process.exit(1); }
      const env = readMessage(id);
      if (!env) { console.error(`Error: message ${id} not found`); process.exit(1); }
      if (asJson) {
        console.log(JSON.stringify(env, null, 2));
      } else {
        console.log(`id:        ${env.id}`);
        console.log(`topic:     ${env.topic}`);
        console.log(`from→to:   ${env.from}→${env.to}`);
        console.log(`timestamp: ${env.timestamp}`);
        console.log(`expiresAt: ${env.expiresAt}`);
        console.log(`payload:   ${JSON.stringify(env.payload)}`);
      }
      break;
    }

    case "clean": {
      const removed = clean({
        expiredOnly: flags.expired === "true",
        from: flags.from as AgentId | undefined,
      });
      if (asJson) {
        console.log(JSON.stringify({ removed }));
      } else {
        console.log(`removed ${removed} message(s)`);
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
