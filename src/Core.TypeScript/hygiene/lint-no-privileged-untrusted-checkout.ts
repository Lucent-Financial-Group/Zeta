#!/usr/bin/env bun
// lint-no-privileged-untrusted-checkout.ts — the premise under CodeQL alert #798, enforced.
//
// A DISMISSAL WHOSE PREMISE NOTHING CHECKS IS THE VACUITY CLASS. Alert #798
// ("Checkout of untrusted code in a non-privileged context", .github/workflows/gate.yml)
// is dismissed because gate.yml checks out `base.sha` rather than the PR head, and because
// no workflow in this tree runs on a privileged trigger at all. Both halves are one edit
// away from being false and neither would announce it. That is what this file is for.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE SEVERE CASE IS THE PAIR, NOT EITHER HALF
//
// Checking out a PR head is NORMAL and safe under `pull_request`: a forked PR gets a
// read-only token and no secrets, so running the author's code grants the author nothing
// they did not already have. `resume-diff.yml` does exactly this, deliberately.
//
// The vulnerability is the PAIR. Under a PRIVILEGED trigger — `pull_request_target`,
// `workflow_run`, `issue_comment` — the job runs with the BASE repository's secrets and a
// write token, while the code being checked out is still the PR author's. Anyone who can
// open a PR then executes code inside a privileged context. That is the class this file
// refuses, and refusing the pair is what lets the safe single halves keep working.
//
// MEASURED 2026-09-13 by parsing every workflow's `on:` block as YAML (not by grepping —
// the repo's own `pull_request_target` mentions are all PROSE saying "never
// pull_request_target", and a grep for the identifier matches the comment that forbids it):
//
//   workflows with a privileged trigger ................ 1  (rerun-cancelled-gate.yml,
//     `workflow_run` — its bare checkout resolves to the DEFAULT BRANCH, which is trusted;
//     see `isUntrusted` for why the default ref's trust depends on the event)
//   gate.yml checkout ref ............................. github.event.pull_request.base.sha
//
// WHAT MAKES THIS CHECKER GO RED:
//   - any workflow adds `pull_request_target` / `workflow_run` / `issue_comment` AND
//     checks out an author-controlled ref (the critical pair), or
//   - gate.yml's PR checkout stops pinning a base-side ref (the #798 premise itself).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const WORKFLOW_DIR = ".github/workflows";
const GATE = "gate.yml";

/** Triggers that run with the BASE repo's secrets and write token while the PR author
 *  still controls the code. The pair of one of these with an untrusted ref is the defect. */
export const PRIVILEGED_TRIGGERS: readonly string[] = [
  "pull_request_target",
  "workflow_run",
  "issue_comment",
];

/** Refs whose content the PR author controls. `head_ref`/`head.sha`/`head.ref` are the
 *  author's branch; `refs/pull/N/merge` includes the author's commits. */
const UNTRUSTED_REF = /pull_request\.head\.|github\.head_ref|workflow_run\.head_|refs\/pull\//u;

/** A ref is base-side when it names the target branch's commit — trusted, already reviewed. */
const BASE_REF = /pull_request\.base\.sha|github\.event\.before|\bbase_ref\b/u;

export interface Finding {
  readonly workflow: string;
  readonly detail: string;
}

/** The `on:` keys of a parsed workflow. YAML 1.1 parses a bare `on` as boolean true, so
 *  both spellings are read — missing that is how a privileged trigger hides from a checker. */
export function triggersOf(doc: unknown): readonly string[] {
  if (doc === null || typeof doc !== "object") return [];
  const d = doc as Record<string, unknown>;
  const on = d["on"] ?? d["true"] ?? (d as Record<string, unknown>)[String(true)];
  if (typeof on === "string") return [on];
  if (Array.isArray(on)) return on.filter((k): k is string => typeof k === "string");
  if (on !== null && typeof on === "object") return Object.keys(on as Record<string, unknown>);
  return [];
}

/** Every `ref:` given to an actions/checkout step, in document order. */
export function checkoutRefs(doc: unknown): readonly string[] {
  const refs: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { for (const n of node) walk(n); return; }
    if (node === null || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const uses = o["uses"];
    if (typeof uses === "string" && uses.startsWith("actions/checkout")) {
      const w = o["with"];
      const ref = w !== null && typeof w === "object"
        ? (w as Record<string, unknown>)["ref"]
        : undefined;
      // A checkout with NO ref defaults to the merge ref under pull_request* — which is
      // author-controlled. Absence is recorded as such, never as trusted.
      refs.push(typeof ref === "string" ? ref : "<default>");
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(doc);
  return refs;
}

/** Whether a checkout ref is author-controlled, GIVEN the workflow's triggers.
 *
 *  The default ref is NOT universally untrusted, and treating it so was this checker's
 *  first bug — it fired on `rerun-cancelled-gate.yml`, whose bare checkout is its
 *  documented safety guard. What `actions/checkout` resolves to with no `ref:` depends
 *  entirely on the event:
 *
 *    pull_request / pull_request_target -> refs/pull/N/merge, which CONTAINS the author's
 *                                          commits. Untrusted.
 *    workflow_run / issue_comment / push / schedule -> the DEFAULT BRANCH at its tip.
 *                                          Trusted, already reviewed and merged.
 *
 *  A checker that flags the safest available pattern is worse than no checker: it trains
 *  readers to dismiss it, and the real finding then arrives pre-ignored. */
export function isUntrusted(ref: string, triggers: readonly string[]): boolean {
  if (UNTRUSTED_REF.test(ref)) return true;
  if (ref !== "<default>") return false;
  return triggers.some((t) => t === "pull_request" || t === "pull_request_target");
}

/** The critical pair: a privileged trigger AND a checkout the PR author controls. */
export function findPrivilegedUntrustedCheckout(name: string, doc: unknown): Finding | null {
  const all = triggersOf(doc);
  const trig = all.filter((t) => PRIVILEGED_TRIGGERS.includes(t));
  if (trig.length === 0) return null;
  const bad = checkoutRefs(doc).filter((r) => isUntrusted(r, all));
  if (bad.length === 0) return null;
  return {
    workflow: name,
    detail: `privileged trigger [${trig.join(", ")}] checks out author-controlled ref(s) [${bad.join(", ")}]`,
  };
}

/** #798's own premise: gate.yml's PR-event checkout stays pinned to a base-side ref. */
export function gatePinsBaseRef(doc: unknown): boolean {
  const refs = checkoutRefs(doc);
  if (refs.length === 0) return false; // no checkout to inspect ⇒ cannot confirm ⇒ not a pass
  return refs.some((r) => BASE_REF.test(r));
}

function main(): number {
  const files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  const findings: Finding[] = [];
  const unreadable: string[] = [];
  let gateSeen = false;
  let gateOk = false;

  for (const f of files) {
    let doc: unknown;
    try {
      doc = parse(readFileSync(join(WORKFLOW_DIR, f), "utf8"));
    } catch (e) {
      // A workflow this cannot parse is UNKNOWN, never assumed safe.
      unreadable.push(`${f}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const finding = findPrivilegedUntrustedCheckout(f, doc);
    if (finding !== null) findings.push(finding);
    if (f === GATE) { gateSeen = true; gateOk = gatePinsBaseRef(doc); }
  }

  console.log(`scanned ${String(files.length)} workflow file(s) in ${WORKFLOW_DIR}`);
  for (const u of unreadable) console.log(`  UNKNOWN  ${u}`);
  if (!gateSeen) {
    console.log(`  FAIL     ${GATE} not found — #798's premise cannot be confirmed`);
  } else if (gateOk) {
    console.log(`  ok       ${GATE} pins a base-side checkout ref (#798 premise holds)`);
  } else {
    console.log(`  FAIL     ${GATE} no longer pins a base-side checkout ref — #798's premise is GONE`);
  }
  if (findings.length === 0) {
    console.log(`  ok       no workflow pairs a privileged trigger with an author-controlled checkout`);
  }
  for (const f of findings) console.log(`  FAIL     ${f.workflow}: ${f.detail}`);

  const failed = findings.length > 0 || unreadable.length > 0 || !gateSeen || !gateOk;
  console.log(failed ? "\nprivileged-untrusted-checkout premise FAILS." : "\nprivileged-untrusted-checkout premise holds.");
  return failed ? 1 : 0;
}

if (import.meta.main) process.exit(main());
