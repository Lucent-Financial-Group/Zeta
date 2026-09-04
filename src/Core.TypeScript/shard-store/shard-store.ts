/**
 * shard-store.ts — one file per write, ZetaId-named, under a date shard.
 *
 * ── WHY THIS IS ITS OWN MODULE ───────────────────────────────────────────────
 * The shape had been written three times: `observe/tick-shards.ts`,
 * `workflow-engine/agent-loop/state-store.ts`, and — about to be — a third for the organization's
 * event log. Each copy re-derives the same four decisions (canonical JSON, a content-derived id, a
 * date-sharded path, a set-union read), and three implementations of one convention is two
 * opportunities for them to disagree about where a record lives.
 *
 * ── THE SHAPE, AND WHY IT IS THIS SHAPE ──────────────────────────────────────
 * `tick-shards.ts` states the argument and it is worth keeping next to the code: a single mutable
 * file that every writer appends to *"forces coordination — two writers touching one path is a
 * merge conflict by construction, and it grows without bound."* One file per write makes the merge
 * SET UNION — commutative and idempotent, disciplines #2 (lock-free) and #6 (idempotency) — and
 * conflicts stop being unlikely and become structurally impossible.
 *
 * ── ZERO AMBIENT ENTROPY ─────────────────────────────────────────────────────
 * The id is a pure function of the record: the record's own instant supplies the ZetaId timestamp,
 * and the sha256 of its canonical JSON supplies the randomness field. No clock is read and no
 * randomness drawn (§13 noninterference), so the same record always lands at the same path and the
 * whole store replays byte-identically under DST. Time enters through the CALLER.
 *
 * ── KEYS SORT ORDINALLY ──────────────────────────────────────────────────────
 * The digest decides the filename, so the key sort decides the address. `localeCompare` is
 * culture-sensitive (`.claude/rules/culture-invariant-by-default.md`), which would make the same
 * record land at different addresses on machines with different ICU data — a content address that
 * is not a function of the content. Sorting is by code unit, recursively, because sorting only the
 * top level leaves nested objects in insertion order and two writers building the same record by
 * different code paths would then produce different bytes.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { pack, type SimulationEnvironment } from "../zeta-id/zeta-id";
import { toHex } from "../zeta-id/encoding";
import {
  Chromosome,
  IdVersion,
  type Category,
  type Milliseconds,
  type ZetaId,
  type ZetaObservation,
} from "../zeta-id/types";

/** A canonical shard filename stem: a 32-char lowercase-hex ZetaId. */
export const SHARD_ID_RE = /^[0-9a-f]{32}$/;

/** Key-sorted JSON, ordinally and recursively, so the bytes are a pure function of the content. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value), null, 2) + "\n";
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value === null || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  // Ordinal: `<` on strings compares by UTF-16 code unit. `localeCompare` would not.
  const keys = Object.keys(source).sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = sortDeep(source[k]);
  return out;
}

/** The record's content digest, as the 32 bits that fill the ZetaId `randomness` field. */
function digest32(value: unknown): bigint {
  return BigInt("0x" + createHash("sha256").update(canonicalJson(value)).digest("hex").slice(0, 8));
}

/**
 * Mint a record's ZetaId. PURE — a total function of the record and its instant.
 *
 * `atMs` is the record's OWN time, never a mint clock, so a backfilled record gets the id it would
 * have had when it happened and no id ever implies a mint time that did not occur.
 */
export function shardZetaId(value: unknown, atMs: number, category: Category): ZetaId {
  if (!Number.isFinite(atMs)) throw new Error(`shard record has unparseable timestamp: ${String(atMs)}`);
  const contentEnv: SimulationEnvironment = { nextInt64: () => digest32(value) };
  const obs: ZetaObservation = {
    version: IdVersion.V1,
    timestamp: atMs as Milliseconds,
    chromosome: Chromosome.MetaCoherence,
    category,
    authority: { type: "Standard" },
    persona: 0 as ZetaObservation["persona"],
    momentum: { type: "Normal" },
    location: 0 as ZetaObservation["location"],
  };
  return pack(obs, contentEnv);
}

/**
 * UTC `YYYY`, `MM`, `DD` for an instant — the directory segments that bound fan-out.
 *
 * Read off `toISOString`, which is UTC BY DEFINITION, rather than assembled from date getters.
 * The getters come in local and UTC pairs that differ by one character (`getFullYear` /
 * `getUTCFullYear`), and picking the wrong one puts the same record in different directories on
 * writers in different timezones — a content address that depends on where the writer sits.
 *
 * Testing for that mistake is unreliable: `bun test` pins `TZ=UTC`, so a local-time read behaves
 * identically under the suite and only misbehaves on a contributor's machine. Removing the getters
 * removes the mistake — there is no local variant of `toISOString` to reach for.
 */
export function dateSegments(atMs: number): readonly string[] {
  if (!Number.isFinite(atMs)) throw new Error(`shard record has unparseable timestamp: ${String(atMs)}`);
  const [yyyy, mm, dd] = new Date(atMs).toISOString().slice(0, 10).split("-");
  if (yyyy === undefined || mm === undefined || dd === undefined) {
    throw new Error(`shard record has unparseable timestamp: ${String(atMs)}`);
  }
  return [yyyy, mm, dd];
}

export interface ShardSpec {
  /** The record itself. Its canonical JSON is both the content and the digest input. */
  readonly value: unknown;
  /** The record's own instant, in milliseconds. */
  readonly atMs: number;
  readonly category: Category;
  /** Directory segments ABOVE the date — a persona, an agent, a stream. May be empty. */
  readonly prefix?: readonly string[];
}

/** `<root>/<prefix...>/YYYY/MM/DD/<zetaid>.json`. */
export function shardPath(spec: ShardSpec, root: string): string {
  const id = toHex(shardZetaId(spec.value, spec.atMs, spec.category));
  return join(root, ...(spec.prefix ?? []), ...dateSegments(spec.atMs), `${id}.json`);
}

/** Write one record as its own shard. Idempotent: same record ⇒ same path ⇒ same bytes. */
export function writeShard(spec: ShardSpec, root: string): string {
  const path = shardPath(spec, root);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, canonicalJson(spec.value));
  return path;
}

/**
 * Every SHARD under a directory — not every `.json`.
 *
 * The filename stem must be a canonical ZetaId. Reading any `.json` meant a stray file in the tree
 * — a config, a README's example, an editor's scratch, a hand-written note — was parsed as a record
 * and returned as one, with whatever fields it happened to have. A store that silently adopts
 * anything left in its directory is not a store; the name is what says "this is ours".
 */
function walkShards(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkShards(full, out);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    if (!SHARD_ID_RE.test(entry.name.slice(0, -".json".length))) continue;
    out.push(full);
  }
}

/**
 * Every shard under a root, de-duplicated by identity.
 *
 * `identify` re-mints each record's id from its CONTENT rather than reading the filename, so the
 * same record arriving at two paths — a hand-merge, a mis-sharded writer, a branch merged twice —
 * counts once. That is what makes the merge a set union rather than a concatenation.
 *
 * A missing root is an EMPTY read, not an error: a store nobody has written to yet is a normal
 * state, and throwing would make "nothing has happened" indistinguishable from "something broke".
 */
export function readShards<T>(root: string, identify: (record: T) => string): readonly T[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  walkShards(root, files);
  const seen = new Set<string>();
  const out: T[] = [];
  for (const file of files) {
    const record = JSON.parse(readFileSync(file, "utf-8")) as T;
    const id = identify(record);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(record);
  }
  return out;
}
