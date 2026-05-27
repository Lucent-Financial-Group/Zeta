#!/usr/bin/env bun
// tools/agent-heartbeats/write-heartbeat.ts — B-0858.3 heartbeat writer.
//
// Composes existing substrate:
//   - src/Core.TypeScript/zeta-id/zeta-id.ts (B-0666 ZetaID v1; pack/unpack)
//   - registry/categories.yaml (Category=3=Heartbeat)
//   - registry/personas.yaml (role-ref slots)
//   - tools/hygiene/audit-agencysignature-main-tip.ts (AgencySignature audit)
//   - CLAUDE.md "Heartbeat-via-commit = externalized idle counter" bullet (PR #5451)
//
// Per operator 2026-05-27: heartbeats use ZetaID category=3; bit-field
// grep indexing extracts subsets by persona/authority/momentum/etc.
//
// Per operator 2026-05-27 follow-up: heartbeats can go in a folder OR
// branch that skips CI + branch protection. This writer targets the
// FOLDER convention (docs/agent-heartbeats/<persona>/YYYY/MM/DD/<zetaid>.md).
// Operator-side branch-protection path-exclusion is required to allow
// direct-to-main push without PR gating; see README at folder root for
// the alternative branch-based pattern.
//
// Usage:
//   bun tools/agent-heartbeats/write-heartbeat.ts \
//     --persona-slot 2 --persona-name otto \
//     [--authority TrustedAgent] [--momentum Normal] \
//     [--chromosome 0] [--location 1] \
//     --named-dep "PR #5450 build-iso completion (~5min ETA)" \
//     --disposition bounded-wait \
//     [--parent-pr 5450]
//
// Exit codes:
//   0 success (heartbeat written; path printed to stdout)
//   2 arg-parse error
//   3 write failure

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { pack, DEFAULT_ENV } from "../../src/Core.TypeScript/zeta-id/zeta-id";
import type { ZetaObservation, Authority, Momentum } from "../../src/Core.TypeScript/zeta-id/types";

interface Args {
  readonly personaSlot: number;
  readonly personaName: string;
  readonly authority: Authority["type"];
  readonly momentum: Momentum["type"];
  readonly chromosome: number;
  readonly location: number;
  readonly namedDep: string | null;
  readonly disposition: string;
  readonly parentPr: number | null;
  readonly repoRoot: string;
  readonly dryRun: boolean;
  readonly push: boolean;
  readonly repo: string;     // "owner/name" for REST push (default Lucent-Financial-Group/Zeta)
  readonly branch: string;   // target branch (default "main")
}

export function parseArgs(argv: readonly string[]): Args | { readonly error: string } {
  let personaSlot: number | null = null;
  let personaName: string | null = null;
  let authority: Authority["type"] = "TrustedAgent";
  let momentum: Momentum["type"] = "Normal";
  let chromosome = 0;
  let location = 1;
  let namedDep: string | null = null;
  let disposition = "bounded-wait";
  let parentPr: number | null = null;
  let repoRoot = process.cwd();
  let dryRun = false;
  let push = false;
  let repo = "Lucent-Financial-Group/Zeta";
  let branch = "main";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      if (i + 1 >= argv.length) throw new Error(`${arg} requires a value`);
      return argv[++i]!;
    };
    try {
      if (arg === "--persona-slot") personaSlot = parseInt(next(), 10);
      else if (arg === "--persona-name") personaName = next();
      else if (arg === "--authority") authority = next() as Authority["type"];
      else if (arg === "--momentum") momentum = next() as Momentum["type"];
      else if (arg === "--chromosome") chromosome = parseInt(next(), 10);
      else if (arg === "--location") location = parseInt(next(), 10);
      else if (arg === "--named-dep") namedDep = next();
      else if (arg === "--disposition") disposition = next();
      else if (arg === "--parent-pr") parentPr = parseInt(next(), 10);
      else if (arg === "--repo-root") repoRoot = next();
      else if (arg === "--dry-run") dryRun = true;
      else if (arg === "--push") push = true;
      else if (arg === "--repo") repo = next();
      else if (arg === "--branch") branch = next();
      else return { error: `unknown flag: ${arg}` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
  if (personaSlot === null) return { error: "--persona-slot required" };
  if (personaName === null) return { error: "--persona-name required" };
  if (personaSlot < 0 || personaSlot > 255) return { error: "--persona-slot must be 0..255" };
  if (!/^[a-z][a-z0-9-]*$/.test(personaName)) return { error: "--persona-name must match /^[a-z][a-z0-9-]*$/" };
  if (chromosome < 0 || chromosome > 31) return { error: "--chromosome must be 0..31" };
  if (location < 0 || location > 255) return { error: "--location must be 0..255" };
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return { error: "--repo must match owner/name" };
  return { personaSlot, personaName, authority, momentum, chromosome, location, namedDep, disposition, parentPr, repoRoot, dryRun, push, repo, branch };
}

/**
 * Push a single heartbeat file direct-to-main via GitHub REST git-data API.
 * Bypasses local git entirely — no staged/unstaged files touched, no working-tree
 * mutation. ZetaID-unique filenames guarantee no concurrent-agent collision; the
 * REST PATCH ref step retries on non-fast-forward (peer agent pushed between
 * blob+tree+commit creation and ref update).
 *
 * Per .claude/rules/refresh-world-model-poll-pr-gate.md REST git-data API
 * bypass discipline (B-0615 pattern).
 */
export function pushHeartbeatViaRest(
  repo: string,
  branch: string,
  filePath: string,  // repo-relative path (e.g., "docs/agent-heartbeats/otto/2026/05/27/abc.md")
  fileContent: string,
  commitMessage: string,
  maxRetries = 5,
): { readonly ok: { readonly commitSha: string; readonly url: string } } | { readonly error: string } {
  function gh(args: string[], input?: string): { status: number; stdout: string; stderr: string } {
    const result = spawnSync("gh", args, {
      input,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
  }

  // Step 1: create blob from file content
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const blobReq = gh(
    ["api", "-X", "POST", `repos/${repo}/git/blobs`, "--input", "-"],
    JSON.stringify({ content: fileContent, encoding: "utf-8" }),
  );
  if (blobReq.status !== 0) return { error: `blob create failed: ${blobReq.stderr || blobReq.stdout}` };
  let blobSha: string;
  try {
    blobSha = JSON.parse(blobReq.stdout).sha;
  } catch (err) {
    return { error: `blob response parse failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Step 2: get parent ref + commit + tree
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const refReq = gh(["api", `repos/${repo}/git/ref/heads/${branch}`]);
    if (refReq.status !== 0) return { error: `ref read failed: ${refReq.stderr || refReq.stdout}` };
    let parentCommitSha: string;
    try {
      parentCommitSha = JSON.parse(refReq.stdout).object.sha;
    } catch (err) {
      return { error: `ref response parse failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const commitReq = gh(["api", `repos/${repo}/git/commits/${parentCommitSha}`]);
    if (commitReq.status !== 0) return { error: `commit read failed: ${commitReq.stderr || commitReq.stdout}` };
    let parentTreeSha: string;
    try {
      parentTreeSha = JSON.parse(commitReq.stdout).tree.sha;
    } catch (err) {
      return { error: `commit response parse failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    // Step 3: create tree (base=parent_tree; one new entry)
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const treeReq = gh(
      ["api", "-X", "POST", `repos/${repo}/git/trees`, "--input", "-"],
      JSON.stringify({
        base_tree: parentTreeSha,
        tree: [{ path: filePath, mode: "100644", type: "blob", sha: blobSha }],
      }),
    );
    if (treeReq.status !== 0) return { error: `tree create failed: ${treeReq.stderr || treeReq.stdout}` };
    let newTreeSha: string;
    try {
      newTreeSha = JSON.parse(treeReq.stdout).sha;
    } catch (err) {
      return { error: `tree response parse failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    // Step 4: create commit
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const newCommitReq = gh(
      ["api", "-X", "POST", `repos/${repo}/git/commits`, "--input", "-"],
      JSON.stringify({
        message: commitMessage,
        tree: newTreeSha,
        parents: [parentCommitSha],
      }),
    );
    if (newCommitReq.status !== 0) return { error: `commit create failed: ${newCommitReq.stderr || newCommitReq.stdout}` };
    let newCommitSha: string;
    let commitUrl: string;
    try {
      const parsed = JSON.parse(newCommitReq.stdout);
      newCommitSha = parsed.sha;
      commitUrl = parsed.html_url;
    } catch (err) {
      return { error: `commit-create response parse failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    // Step 5: fast-forward ref (PATCH refs/heads/<branch>)
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const refUpdateReq = gh(
      ["api", "-X", "PATCH", `repos/${repo}/git/refs/heads/${branch}`, "--input", "-"],
      JSON.stringify({ sha: newCommitSha, force: false }),
    );
    if (refUpdateReq.status === 0) {
      return { ok: { commitSha: newCommitSha, url: commitUrl } };
    }
    // Non-fast-forward → peer agent pushed; retry steps 2-5 with fresh parent
    if (attempt < maxRetries) continue;
    return { error: `ref update failed after ${maxRetries} attempts: ${refUpdateReq.stderr || refUpdateReq.stdout}` };
  }
  return { error: `ref update exhausted ${maxRetries} retries` };
}

/** Build the ZetaObservation for a heartbeat (category=Heartbeat=3, firefly=NoDirective=1, version=1). */
export function buildHeartbeatObservation(args: Args, timestampMs: number): ZetaObservation {
  return {
    version: 1,
    timestamp: timestampMs as ZetaObservation["timestamp"],
    chromosome: args.chromosome,
    category: 3,  // Heartbeat per registry/categories.yaml
    firefly: 1,   // NoDirective per registry/firefly-cases.yaml V1 case-of-one
    authority: { type: args.authority },
    persona: args.personaSlot,
    momentum: { type: args.momentum },
    location: args.location,
  } as unknown as ZetaObservation;
}

/** Format ZetaId bigint as 32-char zero-padded hex (collision-friendly filename). */
export function zetaIdToHex(id: bigint): string {
  return id.toString(16).padStart(32, "0");
}

/** Compose heartbeat file path: docs/agent-heartbeats/<persona>/YYYY/MM/DD/<zetaid-hex>.md */
export function heartbeatPath(repoRoot: string, personaName: string, timestampMs: number, idHex: string): string {
  const d = new Date(timestampMs);
  const yyyy = d.getUTCFullYear().toString();
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return join(repoRoot, "docs", "agent-heartbeats", personaName, yyyy, mm, dd, `${idHex}.md`);
}

/** Render the heartbeat markdown body. */
export function renderHeartbeat(args: Args, idHex: string, timestampMs: number): string {
  const ts = new Date(timestampMs).toISOString();
  const lines = [
    `---`,
    `zetaid: ${idHex}`,
    `category: 3  # Heartbeat per registry/categories.yaml`,
    `agent: ${args.personaName}`,
    `persona-slot: ${args.personaSlot}`,
    `timestamp: ${ts}`,
    `authority: ${args.authority}`,
    `momentum: ${args.momentum}`,
    `chromosome: ${args.chromosome}`,
    `location: ${args.location}`,
    `firefly: NoDirective`,
    `disposition: ${args.disposition}`,
  ];
  if (args.namedDep) lines.push(`named-dep: ${JSON.stringify(args.namedDep)}`);
  if (args.parentPr !== null) lines.push(`parent-pr: ${args.parentPr}`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`Heartbeat ${idHex} from agent ${args.personaName} at ${ts}.`);
  return lines.join("\n") + "\n";
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  if ("error" in parsed) {
    console.error(`write-heartbeat: ${parsed.error}`);
    return 2;
  }
  const timestampMs = Date.now();
  const obs = buildHeartbeatObservation(parsed, timestampMs);
  const id = pack(obs, DEFAULT_ENV);
  const idHex = zetaIdToHex(id);
  const path = heartbeatPath(parsed.repoRoot, parsed.personaName, timestampMs, idHex);
  const body = renderHeartbeat(parsed, idHex, timestampMs);
  if (parsed.dryRun) {
    console.log(`DRY RUN — would write:\n  ${path}\n${"-".repeat(40)}\n${body}`);
    if (parsed.push) console.log(`DRY RUN — would push to ${parsed.repo} branch ${parsed.branch}`);
    return 0;
  }
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`write-heartbeat: local write failed: ${msg}`);
    return 3;
  }
  console.log(path);
  if (parsed.push) {
    // Direct-to-main push via REST git-data API: bypasses local git index +
    // working tree entirely (no staged/unstaged files disturbed). ZetaID
    // filename uniqueness prevents concurrent-agent collision; non-FF retry
    // handles race window between parent-ref read + ref update.
    const repoRelPath = `docs/agent-heartbeats/${parsed.personaName}/${path.split("/").slice(-4).join("/")}`;
    const commitMsg = `heartbeat(${parsed.personaName}): ${idHex} (${parsed.disposition}${parsed.parentPr !== null ? `; PR #${parsed.parentPr}` : ""})`;
    const result = pushHeartbeatViaRest(parsed.repo, parsed.branch, repoRelPath, body, commitMsg);
    if ("error" in result) {
      console.error(`write-heartbeat: REST push failed: ${result.error}`);
      return 4;
    }
    console.log(`pushed: ${result.ok.url}`);
  }
  return 0;
}

if (import.meta.main) {
  main().then((code) => process.exit(code));
}
