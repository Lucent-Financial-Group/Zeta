#!/usr/bin/env bun
// divergence-shard.ts — writer for substrate-divergence shard files.
//
// Implements the tooling glue for B-0164.1 (PR-review disagreement-
// preservation protocol, dual-loop AC #2). Given two loops' conclusions on
// the same substrate-class commitment (e.g. a PR-review thread), this module
// produces a divergence shard conforming to the schema landed in B-0164 AC #4
// (docs/hygiene-history/divergences/README.md, PR #2475) and writes it to the
// canonical path under the fail-closed-OR-idempotent rule.
//
// This is the UNBLOCKED slice of B-0164.1: building + filing a shard given two
// conclusions needs no concurrent-loop harness, so it is fully testable in
// isolation. The end-to-end protocol (detecting that two loops reviewed the
// same thread; morning reconciliation) remains the blocked impl child pending
// B-0160.
//
// Pure functions (no I/O): shortContentHash, divergenceShardRelPath,
//   buildDivergenceShard.
// I/O function: writeDivergenceShard (delegates the 3-way decision to
//   writeShardAtPath, exported for direct testing).
//
// Schema source of truth: docs/hygiene-history/divergences/README.md

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** A single loop's identity for attribution in the shard frontmatter. */
export interface LoopIdentity {
  /** Named agent identifier, e.g. "otto", "codex-loop", "vera". */
  readonly agent: string;
  /** Model ID string, e.g. "claude-opus-4-8", "gpt-5.5". */
  readonly model: string;
  /** Harness name, e.g. "claude-code", "codex". */
  readonly harness: string;
}

/** One loop's perspective: who said it + the full framing of the position. */
export interface LoopPerspective {
  readonly identity: LoopIdentity;
  /** Full framing of the position (the body of the perspective section). */
  readonly body: string;
}

/** Everything needed to build a divergence shard. */
export interface DivergenceInput {
  /** ISO 8601 UTC, seconds precision, e.g. "2026-05-10T11:48:00Z". */
  readonly tick: string;
  readonly loopA: LoopPerspective;
  readonly loopB: LoopPerspective;
  /** The substrate path or topic in conflict (e.g. "PR #4147 thread <id>"). */
  readonly topic: string;
  /** One-paragraph neutral summary for morning reconciliation. */
  readonly disagreementSummary: string;
  /** operative-authorization frontmatter value (verbatim quote). */
  readonly operativeAuthorization: string;
}

/** Outcome of a write attempt. */
export type WriteStatus =
  | "written" // new file created
  | "idempotent-noop" // identical content already at path; left as-is
  | "collision-resolved"; // differing content at path; wrote to unique suffix

export interface WriteResult {
  /** Repo-relative path the shard was (or would have been) written to. */
  readonly relPath: string;
  readonly status: WriteStatus;
}

const TICK_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;
const DIVERGENCE_ROOT = "docs/hygiene-history/divergences";

/**
 * 8 hex chars from sha256(loopABody + loopBBody) per the README naming rule.
 * Content-addressing: identical bodies → identical hash → identical path
 * (enables the idempotent re-write case).
 */
export function shortContentHash(loopABody: string, loopBBody: string): string {
  return createHash("sha256")
    .update(loopABody + loopBBody)
    .digest("hex")
    .slice(0, 8);
}

/**
 * Canonical repo-relative shard path:
 *   docs/hygiene-history/divergences/YYYY/MM/DD/HHMMSSZ-<short-content-hash>.md
 *
 * Parses `tick` by regex (TZ-free, DST-deterministic — the value is already
 * UTC). Throws on a tick that is not ISO 8601 UTC seconds precision.
 */
export function divergenceShardRelPath(
  tick: string,
  loopABody: string,
  loopBBody: string,
): string {
  const m = TICK_RE.exec(tick);
  if (!m) {
    throw new Error(
      `invalid tick "${tick}": expected ISO 8601 UTC seconds precision, e.g. 2026-05-10T11:48:00Z`,
    );
  }
  const [, yyyy, mm, dd, hh, min, ss] = m;
  const hash = shortContentHash(loopABody, loopBBody);
  return `${DIVERGENCE_ROOT}/${yyyy}/${mm}/${dd}/${hh}${min}${ss}Z-${hash}.md`;
}

/** YAML double-quoted scalar (JSON escaping is a valid YAML subset). */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Build the full shard markdown (frontmatter + 4 required body sections) per
 * docs/hygiene-history/divergences/README.md. Pure: no I/O, no clock, no hash
 * of anything other than the explicit inputs.
 */
export function buildDivergenceShard(input: DivergenceInput): string {
  if (!TICK_RE.test(input.tick)) {
    throw new Error(
      `invalid tick "${input.tick}": expected ISO 8601 UTC seconds precision`,
    );
  }
  const a = input.loopA;
  const b = input.loopB;
  const attrib = (p: LoopPerspective) =>
    `${p.identity.agent} (${p.identity.model}, ${p.identity.harness})`;

  return `---
tick: ${yamlString(input.tick)}
type: divergence
loop-a:
  agent: ${a.identity.agent}
  model: ${yamlString(a.identity.model)}
  harness: ${a.identity.harness}
loop-b:
  agent: ${b.identity.agent}
  model: ${yamlString(b.identity.model)}
  harness: ${b.identity.harness}
topic: ${yamlString(input.topic)}
operative-authorization: ${yamlString(input.operativeAuthorization)}
---

## Loop A perspective

${attrib(a)}: ${a.body}

## Loop B perspective

${attrib(b)}: ${b.body}

## Disagreement summary

${input.disagreementSummary}

## Reconciliation

<!-- Leave blank until morning reconciliation. The human maintainer fills this in. -->
<!-- Options: accept-loop-a | accept-loop-b | accept-both (explicit divergence) | escalate -->
`;
}

/**
 * Write `content` to `absPath` under the fail-closed-OR-idempotent rule:
 *   - path free            → write it ("written")
 *   - exists, identical    → leave as-is ("idempotent-noop")
 *   - exists, differs      → never overwrite; write to the next free
 *                            "-N" suffix path ("collision-resolved")
 *
 * Returns the absolute path actually written (or left) and the status.
 * Exported for direct testing of the 3-way decision without manufacturing a
 * hash collision.
 */
export function writeShardAtPath(
  absPath: string,
  content: string,
): { absPath: string; status: WriteStatus } {
  if (!existsSync(absPath)) {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content);
    return { absPath, status: "written" };
  }
  if (readFileSync(absPath, "utf8") === content) {
    return { absPath, status: "idempotent-noop" };
  }
  // Differing content at the target path: fail closed, never overwrite.
  // Choose the next free unique-suffix path.
  const dotMd = absPath.endsWith(".md") ? absPath.slice(0, -3) : absPath;
  for (let n = 2; ; n++) {
    const candidate = `${dotMd}-${n}.md`;
    if (!existsSync(candidate)) {
      mkdirSync(dirname(candidate), { recursive: true });
      writeFileSync(candidate, content);
      return { absPath: candidate, status: "collision-resolved" };
    }
    if (readFileSync(candidate, "utf8") === content) {
      return { absPath: candidate, status: "idempotent-noop" };
    }
  }
}

/**
 * Build + write a divergence shard under `repoRoot`. Enforces AC #2's intent:
 * a divergence shard records a CONFLICT, so byte-identical loop bodies (no
 * divergence to preserve) are rejected.
 */
export function writeDivergenceShard(
  repoRoot: string,
  input: DivergenceInput,
): WriteResult {
  if (input.loopA.body === input.loopB.body) {
    throw new Error(
      "refusing to file a divergence shard: loop bodies are byte-identical (no divergence to preserve)",
    );
  }
  const relPath = divergenceShardRelPath(
    input.tick,
    input.loopA.body,
    input.loopB.body,
  );
  const content = buildDivergenceShard(input);
  const result = writeShardAtPath(join(repoRoot, relPath), content);
  // Recompute the repo-relative path in case collision-resolution changed it.
  const finalRel = result.absPath.startsWith(join(repoRoot, ""))
    ? result.absPath.slice(join(repoRoot, "").length).replace(/^[/\\]/, "")
    : result.absPath;
  return { relPath: finalRel, status: result.status };
}
