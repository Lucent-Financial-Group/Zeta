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
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { AgentId, SenderAgentId, MessageEnvelope, Topic, BusMessage } from "./types.ts";
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
  const busDir = resolve(BUS_DIR);
  const p = resolve(busDir, `${id}.json`);
  if (!p.startsWith(busDir + "/")) throw new Error(`Invalid message ID`);
  return p;
}

// ── publish ───────────────────────────────────────────────────────────────────

export function publish(
  from: SenderAgentId,
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
      if (
        typeof env.id !== "string" || typeof env.topic !== "string" ||
        typeof env.timestamp !== "string" || typeof env.expiresAt !== "string" ||
        typeof env.from !== "string" || typeof env.to !== "string"
      ) continue;
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
  try {
    const p = envelopePath(id);
    if (!existsSync(p)) return null;
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
  bus.ts watch [--to <agent>] [--topic <topic>] [--interval <ms>] [--timeout <sec>] [--json]

Topics: heartbeat | claim | shadow-catch | review-request
Agents: otto | alexa | riven | vera | lior | * (broadcast)`);
}

const SENDER_IDS: readonly string[] = ["otto", "alexa", "riven", "vera", "lior"];
const AGENT_IDS: readonly string[] = [...SENDER_IDS, "*"];

function main(): void {
  const { command, flags, positional } = parseArgs(process.argv);
  const asJson = flags.json === "true";

  switch (command) {
    case "publish": {
      const from = flags.from as SenderAgentId | undefined;
      const to = (flags.to ?? "*") as AgentId;
      const topic = flags.topic as Topic | undefined;
      const payloadRaw = flags.payload;
      if (!from || !topic || !payloadRaw) {
        console.error("Error: --from, --topic, and --payload are required");
        process.exit(1);
      }
      if (!SENDER_IDS.includes(from)) {
        console.error(`Error: unknown sender '${from}'. Valid: ${SENDER_IDS.join(", ")}`);
        process.exit(1);
      }
      if (!AGENT_IDS.includes(to)) {
        console.error(`Error: unknown recipient '${to}'. Valid: ${AGENT_IDS.join(", ")}`);
        process.exit(1);
      }
      let payload: unknown;
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        console.error("Error: --payload must be valid JSON");
        process.exit(1);
      }
      if (!(topic in TTL_MS)) {
        console.error(`Error: unknown topic '${topic}'. Valid: ${Object.keys(TTL_MS).join(", ")}`);
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
        ...(flags.topic !== undefined ? { topic: flags.topic as Topic } : {}),
        ...(flags.to !== undefined ? { to: flags.to as AgentId } : {}),
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
        ...(flags.from !== undefined ? { from: flags.from as AgentId } : {}),
      });
      if (asJson) {
        console.log(JSON.stringify({ removed }));
      } else {
        console.log(`removed ${removed} message(s)`);
      }
      break;
    }

    case "watch": {
      const toFilter = flags.to as AgentId | undefined;
      const topicFilter = flags.topic as Topic | undefined;
      const intervalMs = parseInt(flags.interval ?? "2000", 10);
      if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        console.error("--interval must be a positive integer (milliseconds)");
        process.exit(1);
      }
      const timeoutSec = flags.timeout !== undefined ? parseInt(flags.timeout, 10) : -1;

      // cursor tracks the last-delivered timestamp + the IDs at that timestamp,
      // so bursts of same-millisecond messages are never silently dropped.
      let cursorTimestamp = new Date().toISOString();
      const deliveredAtCursor = new Set<string>();
      const deadline = timeoutSec >= 0 ? Date.now() + timeoutSec * 1_000 : Infinity;

      const poll = () => {
        const msgs = list({ topic: topicFilter, to: toFilter });
        const fresh = msgs.filter(
          (m) =>
            m.timestamp > cursorTimestamp ||
            (m.timestamp === cursorTimestamp && !deliveredAtCursor.has(m.id)),
        );
        for (const m of fresh) {
          if (asJson) {
            console.log(JSON.stringify(m));
          } else {
            const p = JSON.stringify(m.payload).slice(0, 80);
            console.log(`${m.id}  ${m.topic}  ${m.from}→${m.to}  ${m.timestamp}  ${p}`);
          }
        }
        if (fresh.length > 0) {
          const lastTs = fresh[fresh.length - 1]!.timestamp;
          if (lastTs !== cursorTimestamp) {
            cursorTimestamp = lastTs;
            deliveredAtCursor.clear();
          }
          for (const m of fresh) {
            if (m.timestamp === cursorTimestamp) deliveredAtCursor.add(m.id);
          }
        }
        if (Date.now() >= deadline) process.exit(0);
        setTimeout(poll, intervalMs);
      };

      poll();
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
