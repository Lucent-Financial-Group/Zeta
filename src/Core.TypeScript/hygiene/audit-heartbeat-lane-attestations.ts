#!/usr/bin/env bun
/**
 * audit-heartbeat-lane-attestations.ts — the falsifier for the PR-free heartbeat lane.
 *
 * Design: docs/research/2026-08-25-pr-free-heartbeat-lane-attestation-instead-of-gate.md
 * Registry (the blast radius, as data): registry/heartbeat-lane-allowlist.json
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS BEFORE THE THING IT AUDITS
 * ---------------------------------------------------------------------------
 * The lane's proposal is that a bypass actor pushes heartbeat telemetry straight to `main`,
 * skipping `gate (required)`, and that the lane "verifies itself". A bypass actor is a
 * permanent hole: whatever authenticates as it can push unchecked. So the self-verification
 * has to be a CHECKABLE FACT rather than a claim, or it is exactly the vacuity this
 * repository exists to refuse — a check that did not run, wearing the clothes of one that
 * passed.
 *
 * This auditor is the checking half. It reads commits that landed on `main` and asks, of
 * every commit the lane produced:
 *
 *   1. Does it carry a Verification-Attestation block at all?
 *   2. Is that attestation bound to THIS commit's content — `Verification-Subject` must be
 *      the commit's own tree sha — or was it copied from a commit that really was verified?
 *   3. Does it name the checks the registry REQUIRES, using only vocabulary the registry
 *      KNOWS? (A lane cannot pass by naming fewer checks, or by inventing a weaker name.)
 *   4. Does every path it touches sit inside the allowlist, in a permitted change mode?
 *      `append-only` is verified as PREFIX PRESERVATION on the actual blobs, not as
 *      "the diff removed no lines" — a unified diff with zero deletions still permits a
 *      rewrite interleaved among surviving lines.
 *   5. Is it inside the size budget?
 *
 * ---------------------------------------------------------------------------
 * THE HONEST LIMITS, STATED HERE RATHER THAN DISCOVERED LATER
 * ---------------------------------------------------------------------------
 * (a) `agencysignature-block.ts` records that a parser cannot distinguish a COPIED
 *     attestation from an EARNED one, because a copy is byte-identical to the original.
 *     `Verification-Subject` fixes exactly half of that and no more: it binds the
 *     attestation to the commit's own tree, so an attestation lifted from a genuinely
 *     verified commit fails on a different tree. It does NOT stop an actor that already
 *     holds the push credential from computing the right tree sha and writing a fresh
 *     lie. Nothing parseable can. The defence against a FORGED (as opposed to copied)
 *     attestation is that the verifier is a different actor from the writer — design doc
 *     section 5 — and this auditor cannot verify that separation from the commit object.
 *
 * (b) Offline, "is this a lane commit" is decided by the author/committer email, which is
 *     attacker-chosen. `--online` cross-checks the forge's own rule-suites ledger, which
 *     records the actor of every ruleset bypass and is not written by the pusher. That
 *     ledger only exists if `bypass_mode` is `always`; GitHub documents `exempt` as
 *     creating no audit entry, which is why the design forbids `exempt`.
 *
 * (c) A green run here means "no lane commit on `main` in the window violated the
 *     registry". It does not mean the lane's own pre-push checks ran. That is the
 *     actuator-verification gap named in
 *     docs/research/2026-08-18-forge-agnostic-drift-checks-*.md section 5b, and it is not
 *     closed here.
 *
 * Usage:
 *   bun src/Core.TypeScript/hygiene/audit-heartbeat-lane-attestations.ts
 *   bun ... --since 2026-08-01            # window (default: 14 days)
 *   bun ... --max 300                     # last N commits instead of a date window
 *   bun ... --commit <SHA>                # one commit
 *   bun ... --branch main                 # default: origin/main if present, else HEAD
 *   bun ... --cutover 2026-08-01T00:00:00Z  # override registry cutoverIso
 *   bun ... --online                      # also read the forge bypass ledger
 *   bun ... --registry <path>
 *
 * Exit codes:
 *   0 — no violations (OK / NOT-LANE / PRE-CUTOVER-LEGACY only)
 *   1 — at least one violation
 *   2 — tooling / input error
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";

// ---------------------------------------------------------------------------
// The attestation format
// ---------------------------------------------------------------------------

/**
 * Verification-Attestation v1. A SECOND trailer block, deliberately not an extension of
 * the AgencySignature block: AgencySignature answers *who acted and under what authority*,
 * this answers *what was checked and against which bytes*. They have different lifetimes,
 * different authors, and different failure modes — DV2.0 change-rate partitioning applied
 * to the trailer surface. Both may appear in one message.
 */
export const ATTESTATION_KEYS: readonly string[] = [
  "Verification-Version",
  "Verification-Lane",
  "Verification-Subject",
  "Verification-Checks",
  "Verification-Verdict",
  "Verification-Runner",
];

export const ATTESTATION_SHAPE =
  "Six contiguous `Verification-*` lines (no blank line inside the block). " +
  "`Verification-Subject` is the 40-hex tree sha OF THE COMMIT THAT CARRIES IT — that binding " +
  "is what makes a copied attestation detectable. `Verification-Checks` is a comma-separated " +
  "list drawn from the registry's knownChecks and covering all of its requiredChecks. " +
  "`Verification-Verdict` is `pass`; a lane that did not pass must not push.";

export type Status =
  | "OK"
  | "NOT-LANE"
  | "PRE-CUTOVER-LEGACY"
  | "MISSING-ATTESTATION"
  | "MALFORMED-ATTESTATION"
  | "SUBJECT-MISMATCH"
  | "VERDICT-NOT-PASS"
  | "UNKNOWN-CHECK"
  | "MISSING-REQUIRED-CHECK"
  | "PATH-ESCAPE"
  | "MODE-VIOLATION"
  | "BUDGET-EXCEEDED";

/** Statuses that make the audit go LOUD. Everything else is a clean pass-through. */
export const VIOLATION_STATUSES: ReadonlySet<Status> = new Set<Status>([
  "MISSING-ATTESTATION",
  "MALFORMED-ATTESTATION",
  "SUBJECT-MISMATCH",
  "VERDICT-NOT-PASS",
  "UNKNOWN-CHECK",
  "MISSING-REQUIRED-CHECK",
  "PATH-ESCAPE",
  "MODE-VIOLATION",
  "BUDGET-EXCEEDED",
]);

export function isViolation(status: Status): boolean {
  return VIOLATION_STATUSES.has(status);
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export type PathMode = "add-only" | "append-only" | "mutable";

export interface AllowEntry {
  readonly pattern: string;
  readonly mode: PathMode;
}

export interface Registry {
  readonly cutoverTs: number;
  readonly cutoverIso: string;
  readonly laneEmails: ReadonlySet<string>;
  readonly forgeActors: ReadonlySet<string>;
  readonly requiredChecks: readonly string[];
  readonly knownChecks: ReadonlySet<string>;
  readonly allow: readonly AllowEntry[];
  readonly deny: readonly string[];
  readonly maxFilesPerCommit: number;
  readonly maxBytesPerCommit: number;
  readonly maxBytesPerFile: number;
}

const VALID_MODES: ReadonlySet<string> = new Set(["add-only", "append-only", "mutable"]);

function requireArray(value: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`registry: ${where} must be an array`);
  return value;
}

function requireStrings(value: unknown, where: string): readonly string[] {
  return requireArray(value, where).map((v, i) => {
    if (typeof v !== "string") throw new Error(`registry: ${where}[${String(i)}] must be a string`);
    return v;
  });
}

function requireNumber(value: unknown, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`registry: ${where} must be a positive finite number`);
  }
  return value;
}

/** Parse + validate. Throws on any shape defect — a registry that half-parses is worse than none. */
export function parseRegistry(raw: unknown): Registry {
  if (raw === null || typeof raw !== "object") throw new Error("registry: root must be an object");
  const r = raw as Record<string, unknown>;

  const cutoverIso = r["cutoverIso"];
  if (typeof cutoverIso !== "string") throw new Error("registry: cutoverIso must be a string");
  const cutoverTs = Date.parse(cutoverIso);
  if (Number.isNaN(cutoverTs)) throw new Error(`registry: cutoverIso is unparseable: ${cutoverIso}`);

  const ident = (r["laneIdentities"] ?? {}) as Record<string, unknown>;
  const laneEmails = new Set(
    requireStrings(ident["emails"], "laneIdentities.emails").map((e) => e.trim().toLowerCase()),
  );
  if (laneEmails.size === 0) {
    throw new Error("registry: laneIdentities.emails is empty — the audit would match nothing and pass vacuously");
  }
  const forgeActors = new Set(
    (ident["forgeActors"] === undefined
      ? []
      : requireStrings(ident["forgeActors"], "laneIdentities.forgeActors")
    ).map((a) => a.trim().toLowerCase()),
  );

  const required = requireStrings(
    ((r["requiredChecks"] ?? {}) as Record<string, unknown>)["names"],
    "requiredChecks.names",
  );
  if (required.length === 0) {
    throw new Error("registry: requiredChecks.names is empty — an attestation could then name no checks and pass");
  }
  const known = new Set(
    requireStrings(((r["knownChecks"] ?? {}) as Record<string, unknown>)["names"], "knownChecks.names"),
  );
  for (const name of required) {
    if (!known.has(name)) throw new Error(`registry: requiredChecks names '${name}' which is not in knownChecks`);
  }

  const paths = (r["paths"] ?? {}) as Record<string, unknown>;
  const allow = requireArray(paths["allow"], "paths.allow").map((entry, i) => {
    if (entry === null || typeof entry !== "object") {
      throw new Error(`registry: paths.allow[${String(i)}] must be an object`);
    }
    const e = entry as Record<string, unknown>;
    const pattern = e["pattern"];
    const mode = e["mode"];
    if (typeof pattern !== "string" || pattern.length === 0) {
      throw new Error(`registry: paths.allow[${String(i)}].pattern must be a non-empty string`);
    }
    if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
      throw new Error(`registry: paths.allow[${String(i)}].mode must be one of ${[...VALID_MODES].join("|")}`);
    }
    return { pattern, mode: mode as PathMode };
  });
  if (allow.length === 0) throw new Error("registry: paths.allow is empty — the lane could write nothing");
  const deny = requireStrings(paths["deny"], "paths.deny");

  const budget = (r["budget"] ?? {}) as Record<string, unknown>;

  return {
    cutoverTs,
    cutoverIso,
    laneEmails,
    forgeActors,
    requiredChecks: required,
    knownChecks: known,
    allow,
    deny,
    maxFilesPerCommit: requireNumber(budget["maxFilesPerCommit"], "budget.maxFilesPerCommit"),
    maxBytesPerCommit: requireNumber(budget["maxBytesPerCommit"], "budget.maxBytesPerCommit"),
    maxBytesPerFile: requireNumber(budget["maxBytesPerFile"], "budget.maxBytesPerFile"),
  };
}

export const REGISTRY_FILENAME = "registry/heartbeat-lane-allowlist.json";

export function loadRegistry(path: string): Registry {
  return parseRegistry(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

// ---------------------------------------------------------------------------
// Glob matching — deliberately tiny and total
// ---------------------------------------------------------------------------

/**
 * `**` crosses `/`; `*` does not; everything else is literal. No brace expansion, no
 * negation, no `?`. A path-security predicate whose own language needs a parser is a
 * place for bugs to live.
 */
export function globToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i] ?? "";
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        out += ".*";
        i += 1;
      } else {
        out += "[^/]*";
      }
      continue;
    }
    out += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

export function matchesAny(path: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => globToRegExp(p).test(path));
}

/** The allow entry governing `path`, or null when no pattern covers it. First match wins. */
export function allowEntryFor(path: string, registry: Registry): AllowEntry | null {
  for (const entry of registry.allow) {
    if (globToRegExp(entry.pattern).test(path)) return entry;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Attestation parsing
// ---------------------------------------------------------------------------

export interface Attestation {
  readonly version: string;
  readonly lane: string;
  readonly subject: string;
  readonly checks: readonly string[];
  readonly verdict: string;
  readonly runner: string;
}

const TREE_SHA = /^[0-9a-f]{40}$/;

/**
 * Find the LAST contiguous run of `Verification-*` lines carrying all six keys. Last-wins
 * matches `findAllSignatureBlocks`'s rule for the same reason: a squash preimage may carry
 * several, and the one nearest the tip is the one that describes the landed commit.
 *
 * Returns null when no complete block exists, and the offending key when one is malformed —
 * the two are different findings and must not be collapsed.
 */
export function parseAttestation(
  message: string,
): { readonly ok: Attestation } | { readonly malformed: string } | null {
  const lines = message.replace(/\r\n/g, "\n").split("\n");
  let best: Map<string, string> | null = null;
  let current = new Map<string, string>();
  const flush = (): void => {
    if (ATTESTATION_KEYS.every((k) => current.has(k))) best = current;
    current = new Map<string, string>();
  };
  for (const line of lines) {
    const m = /^(Verification-[A-Za-z-]+):[ \t]*(.*)$/.exec(line.trim());
    if (m === null) {
      flush();
      continue;
    }
    current.set(m[1] ?? "", (m[2] ?? "").trim());
  }
  flush();
  if (best === null) return null;

  const block: Map<string, string> = best;
  const get = (k: string): string => block.get(k) ?? "";
  const version = get("Verification-Version");
  if (version !== "1") return { malformed: `Verification-Version must be '1', got '${version}'` };
  const subject = get("Verification-Subject").toLowerCase();
  if (!TREE_SHA.test(subject)) {
    return { malformed: `Verification-Subject must be a 40-hex tree sha, got '${subject}'` };
  }
  const lane = get("Verification-Lane");
  if (lane.length === 0) return { malformed: "Verification-Lane is empty" };
  const runner = get("Verification-Runner");
  if (runner.length === 0) return { malformed: "Verification-Runner is empty" };
  const checks = get("Verification-Checks")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (checks.length === 0) return { malformed: "Verification-Checks is empty" };

  return { ok: { version, lane, subject, checks, verdict: get("Verification-Verdict"), runner } };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export type ChangeKind = "A" | "M" | "D" | "R" | "C" | "T" | "OTHER";

export interface Change {
  readonly kind: ChangeKind;
  readonly path: string;
  /** For `M` on an `append-only` path: did the pre-image survive as a byte PREFIX? */
  readonly prefixPreserved?: boolean;
  readonly bytes?: number;
}

export interface CommitRecord {
  readonly sha: string;
  readonly treeSha: string;
  readonly subject: string;
  readonly message: string;
  readonly authorEmail: string;
  readonly committerEmail: string;
  readonly timestamp: number;
  readonly isoDate: string;
  readonly changes: readonly Change[];
}

export interface Classification {
  readonly status: Status;
  readonly reason: string;
}

export function isLaneCommit(record: CommitRecord, registry: Registry): boolean {
  const a = record.authorEmail.trim().toLowerCase();
  const c = record.committerEmail.trim().toLowerCase();
  return registry.laneEmails.has(a) || registry.laneEmails.has(c);
}

/** Pure. Everything git-shaped is already resolved into `record`. */
export function classifyCommit(
  record: CommitRecord,
  registry: Registry,
  cutoverTs: number,
): Classification {
  if (!isLaneCommit(record, registry)) {
    return { status: "NOT-LANE", reason: `author ${record.authorEmail} / committer ${record.committerEmail} is not a lane identity` };
  }
  if (record.timestamp < cutoverTs) {
    return { status: "PRE-CUTOVER-LEGACY", reason: `${record.isoDate} predates the lane cutover` };
  }

  const parsed = parseAttestation(record.message);
  if (parsed === null) {
    return { status: "MISSING-ATTESTATION", reason: `no complete Verification-Attestation block. ${ATTESTATION_SHAPE}` };
  }
  if ("malformed" in parsed) {
    return { status: "MALFORMED-ATTESTATION", reason: parsed.malformed };
  }
  const att = parsed.ok;

  if (att.subject !== record.treeSha.toLowerCase()) {
    return {
      status: "SUBJECT-MISMATCH",
      reason: `attestation binds tree ${att.subject} but this commit's tree is ${record.treeSha} — the attestation was not earned by these bytes`,
    };
  }
  if (att.verdict !== "pass") {
    return { status: "VERDICT-NOT-PASS", reason: `Verification-Verdict is '${att.verdict}' — a lane that did not pass must not push` };
  }
  const unknown = att.checks.filter((c) => !registry.knownChecks.has(c));
  if (unknown.length > 0) {
    return { status: "UNKNOWN-CHECK", reason: `attestation names check(s) the registry cannot evaluate: ${unknown.join(", ")}` };
  }
  const missing = registry.requiredChecks.filter((c) => !att.checks.includes(c));
  if (missing.length > 0) {
    return { status: "MISSING-REQUIRED-CHECK", reason: `attestation omits required check(s): ${missing.join(", ")}` };
  }

  if (record.changes.length > registry.maxFilesPerCommit) {
    return {
      status: "BUDGET-EXCEEDED",
      reason: `${String(record.changes.length)} files > budget.maxFilesPerCommit ${String(registry.maxFilesPerCommit)}`,
    };
  }
  let total = 0;
  for (const change of record.changes) {
    if (matchesAny(change.path, registry.deny)) {
      return { status: "PATH-ESCAPE", reason: `${change.path} matches the deny list` };
    }
    const entry = allowEntryFor(change.path, registry);
    if (entry === null) {
      return { status: "PATH-ESCAPE", reason: `${change.path} is outside every allowed pattern` };
    }
    if (change.kind === "D" || change.kind === "R" || change.kind === "C" || change.kind === "T") {
      return { status: "MODE-VIOLATION", reason: `${change.path}: change kind '${change.kind}' is never permitted for the lane (delete/rename/copy/typechange)` };
    }
    if (change.kind === "M" && entry.mode === "add-only") {
      return { status: "MODE-VIOLATION", reason: `${change.path} is add-only but was modified` };
    }
    if (change.kind === "M" && entry.mode === "append-only" && change.prefixPreserved !== true) {
      return { status: "MODE-VIOLATION", reason: `${change.path} is append-only but the pre-image is not a byte prefix of the post-image` };
    }
    const bytes = change.bytes ?? 0;
    if (bytes > registry.maxBytesPerFile) {
      return { status: "BUDGET-EXCEEDED", reason: `${change.path} is ${String(bytes)} bytes > budget.maxBytesPerFile ${String(registry.maxBytesPerFile)}` };
    }
    total += bytes;
  }
  if (total > registry.maxBytesPerCommit) {
    return { status: "BUDGET-EXCEEDED", reason: `${String(total)} bytes > budget.maxBytesPerCommit ${String(registry.maxBytesPerCommit)}` };
  }

  return { status: "OK", reason: `attested by ${att.lane} via ${att.runner}; ${String(record.changes.length)} file(s) inside the allowlist` };
}

// ---------------------------------------------------------------------------
// git collection
// ---------------------------------------------------------------------------

function git(args: readonly string[], cwd: string): { readonly ok: string } | { readonly err: string } {
  const res = spawnSync("git", [...args], { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (res.error !== undefined) return { err: String(res.error) };
  if (res.status !== 0) return { err: (res.stderr ?? "").trim() || `git ${args.join(" ")} exited ${String(res.status)}` };
  return { ok: res.stdout ?? "" };
}

const RECORD_SEP = " ZETA-REC ";
const FIELD_SEP = " ZETA-FLD ";

function kindOf(raw: string): ChangeKind {
  const c = (raw[0] ?? "").toUpperCase();
  return c === "A" || c === "M" || c === "D" || c === "R" || c === "C" || c === "T" ? c : "OTHER";
}

/**
 * Resolve one commit into a pure record. `append-only` prefix verification reads both
 * blobs, so it is done ONLY for modified paths the registry marks append-only — a lane
 * commit is a few hundred small files and this stays well under a second.
 */
export function collectCommit(sha: string, cwd: string, registry: Registry): CommitRecord | string {
  const meta = git(["show", "-s", `--format=%H${FIELD_SEP}%T${FIELD_SEP}%ae${FIELD_SEP}%ce${FIELD_SEP}%ct${FIELD_SEP}%cI${FIELD_SEP}%s${FIELD_SEP}%B`, sha], cwd);
  if ("err" in meta) return meta.err;
  const parts = meta.ok.split(FIELD_SEP);
  if (parts.length < 8) return `could not parse metadata for ${sha}`;

  const nameStatus = git(["show", "--no-renames", "--name-status", "--format=", sha], cwd);
  if ("err" in nameStatus) return nameStatus.err;
  const changes: Change[] = [];
  for (const line of nameStatus.ok.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const cols = trimmed.split("\t");
    const kind = kindOf(cols[0] ?? "");
    const path = cols[cols.length - 1] ?? "";
    if (path.length === 0) continue;

    let bytes = 0;
    const size = git(["cat-file", "-s", `${sha}:${path}`], cwd);
    if ("ok" in size) bytes = Number.parseInt(size.ok.trim(), 10) || 0;

    let prefixPreserved: boolean | undefined;
    const entry = allowEntryFor(path, registry);
    if (kind === "M" && entry !== null && entry.mode === "append-only") {
      const before = git(["show", `${sha}^:${path}`], cwd);
      const after = git(["show", `${sha}:${path}`], cwd);
      prefixPreserved = "ok" in before && "ok" in after ? after.ok.startsWith(before.ok) : false;
    }
    changes.push({ kind, path, bytes, ...(prefixPreserved === undefined ? {} : { prefixPreserved }) });
  }

  return {
    sha: (parts[0] ?? "").trim(),
    treeSha: (parts[1] ?? "").trim(),
    authorEmail: parts[2] ?? "",
    committerEmail: parts[3] ?? "",
    timestamp: Number.parseInt(parts[4] ?? "0", 10) * 1000,
    isoDate: parts[5] ?? "",
    subject: parts[6] ?? "",
    message: parts.slice(7).join(FIELD_SEP),
    changes,
  };
}

export function listCommits(
  cwd: string,
  branch: string,
  opts: { readonly since?: string; readonly max?: number; readonly commit?: string },
): readonly string[] | string {
  if (opts.commit !== undefined) return [opts.commit];
  const args = ["log", "--format=%H", branch];
  if (opts.since !== undefined) args.push(`--since=${opts.since}`);
  if (opts.max !== undefined) args.push(`--max-count=${String(opts.max)}`);
  const res = git(args, cwd);
  if ("err" in res) return res.err;
  return res.ok.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export interface Args {
  readonly branch?: string;
  readonly since?: string;
  readonly max?: number;
  readonly commit?: string;
  readonly cutover?: string;
  readonly registry?: string;
  readonly online: boolean;
  readonly cwd: string;
}

export function parseArgs(argv: readonly string[]): { readonly ok: Args } | { readonly err: string } {
  const out: {
    branch?: string; since?: string; max?: number; commit?: string;
    cutover?: string; registry?: string; online: boolean; cwd: string;
  } = { online: false, cwd: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i] ?? "";
    const next = (): string | null => argv[i + 1] ?? null;
    switch (flag) {
      case "--online": out.online = true; break;
      case "--branch": { const v = next(); if (v === null) return { err: "--branch needs a value" }; out.branch = v; i += 1; break; }
      case "--since": { const v = next(); if (v === null) return { err: "--since needs a value" }; out.since = v; i += 1; break; }
      case "--commit": { const v = next(); if (v === null) return { err: "--commit needs a value" }; out.commit = v; i += 1; break; }
      case "--cutover": { const v = next(); if (v === null) return { err: "--cutover needs a value" }; out.cutover = v; i += 1; break; }
      case "--registry": { const v = next(); if (v === null) return { err: "--registry needs a value" }; out.registry = v; i += 1; break; }
      case "--cwd": { const v = next(); if (v === null) return { err: "--cwd needs a value" }; out.cwd = v; i += 1; break; }
      case "--max": {
        const v = next();
        if (v === null) return { err: "--max needs a value" };
        const n = Number.parseInt(v, 10);
        if (!Number.isFinite(n) || n <= 0) return { err: `--max must be a positive integer, got '${v}'` };
        out.max = n; i += 1; break;
      }
      default: return { err: `unknown flag '${flag}'` };
    }
  }
  return { ok: out };
}

function resolveBranch(cwd: string, requested: string | undefined): string {
  if (requested !== undefined) return requested;
  const probe = git(["rev-parse", "--verify", "--quiet", "origin/main"], cwd);
  return "ok" in probe && probe.ok.trim().length > 0 ? "origin/main" : "HEAD";
}

export function main(argv: readonly string[]): 0 | 1 | 2 {
  const parsed = parseArgs(argv);
  if ("err" in parsed) {
    process.stderr.write(`audit-heartbeat-lane-attestations: ${parsed.err}\n`);
    return 2;
  }
  const args = parsed.ok;

  let registry: Registry;
  const registryPath = args.registry ?? joinPath(args.cwd, REGISTRY_FILENAME);
  try {
    registry = loadRegistry(registryPath);
  } catch (e) {
    process.stderr.write(`audit-heartbeat-lane-attestations: cannot load ${registryPath}: ${String(e)}\n`);
    return 2;
  }

  let cutoverTs = registry.cutoverTs;
  let cutoverIso = registry.cutoverIso;
  if (args.cutover !== undefined) {
    const t = Date.parse(args.cutover);
    if (Number.isNaN(t)) {
      process.stderr.write(`audit-heartbeat-lane-attestations: --cutover is unparseable: ${args.cutover}\n`);
      return 2;
    }
    cutoverTs = t;
    cutoverIso = args.cutover;
  }

  const branch = resolveBranch(args.cwd, args.branch);
  const window = args.commit !== undefined || args.max !== undefined || args.since !== undefined
    ? { since: args.since, max: args.max, commit: args.commit }
    : { since: "14 days ago" };
  const shas = listCommits(args.cwd, branch, window);
  if (typeof shas === "string") {
    process.stderr.write(`audit-heartbeat-lane-attestations: ${shas}\n`);
    return 2;
  }

  process.stdout.write("audit-heartbeat-lane-attestations\n");
  process.stdout.write(`  registry:  ${registryPath}\n`);
  process.stdout.write(`  branch:    ${branch} (${String(shas.length)} commit(s) in window)\n`);
  process.stdout.write(`  cutover:   ${cutoverIso}\n`);
  process.stdout.write(`  lane ids:  ${[...registry.laneEmails].join(", ")}\n\n`);

  const counts = new Map<Status, number>();
  const violations: string[] = [];
  for (const sha of shas) {
    const record = collectCommit(sha, args.cwd, registry);
    if (typeof record === "string") {
      process.stderr.write(`audit-heartbeat-lane-attestations: ${record}\n`);
      return 2;
    }
    const verdict = classifyCommit(record, registry, cutoverTs);
    counts.set(verdict.status, (counts.get(verdict.status) ?? 0) + 1);
    if (isViolation(verdict.status)) {
      violations.push(`  ${verdict.status}  ${record.sha.slice(0, 9)}  ${record.subject.slice(0, 70)}\n      ${verdict.reason}`);
    }
  }

  for (const [status, n] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "en"))) {
    process.stdout.write(`  ${status.padEnd(24, " ")} ${String(n)}\n`);
  }

  if (args.online) {
    process.stdout.write("\n  forge bypass ledger (rule-suites):\n");
    const suites = spawnSync(
      "gh",
      ["api", `repos/Lucent-Financial-Group/Zeta/rulesets/rule-suites?ref=refs/heads/main&per_page=100`],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (suites.status !== 0) {
      process.stdout.write("    UNAVAILABLE — gh api failed; the offline verdict above stands alone\n");
    } else {
      try {
        const rows = JSON.parse(suites.stdout) as readonly { result?: string; actor_name?: string; after_sha?: string }[];
        const bypasses = rows.filter((r) => (r.result ?? "") === "bypass");
        process.stdout.write(`    ${String(rows.length)} suite(s), ${String(bypasses.length)} bypass(es)\n`);
        for (const b of bypasses) {
          const actor = (b.actor_name ?? "?").toLowerCase();
          if (registry.forgeActors.size > 0 && !registry.forgeActors.has(actor)) {
            violations.push(`  UNAUTHORIZED-BYPASS-ACTOR  ${(b.after_sha ?? "?").slice(0, 9)}\n      '${b.actor_name ?? "?"}' bypassed a ruleset on main and is not a registered lane actor`);
          }
        }
      } catch {
        process.stdout.write("    UNPARSEABLE — the offline verdict above stands alone\n");
      }
    }
  }

  if (violations.length > 0) {
    process.stdout.write(`\nVIOLATIONS (${String(violations.length)}):\n${violations.join("\n")}\n`);
    return 1;
  }
  process.stdout.write("\nclean — every lane commit in the window is attested and inside its allowlist\n");
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
