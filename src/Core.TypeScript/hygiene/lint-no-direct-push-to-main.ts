#!/usr/bin/env bun
// lint-no-direct-push-to-main.ts — PM001: an automated lane that pushes straight at `main`.
//
// THE RULE
// --------
// No workflow, and no code a workflow invokes, may push to `main`. Not with a rebase
// first, not with a retry loop, not with `[skip ci]`. The push is FATAL by
// configuration, so every such line is dead code that will surface as a failure at the
// worst possible moment.
//
// WHY IT IS FATAL — this is a fact about the forge, not a preference
// -----------------------------------------------------------------
// Ruleset "CI Gate" (16134995) makes `gate (required)` a required status check on
// `main`. A required status check is evaluated at PUSH time against the pushed tip, so
// a commit that has never been through a check run is rejected before any check could
// start:
//
//     remote: error: GH013: Repository rule violations found for refs/heads/main.
//     remote: - Required status check "gate (required)" is expected.
//
// Dropping `[skip ci]` does not help: the check is MISSING, not failing. Rebasing does
// not help: the tip is still unchecked. There is no shape of direct push that lands.
//
// WHY A LINT AND NOT A COMMENT
// ----------------------------
// Because the failure is INVISIBLE until it matters. Three telemetry cadences carried
// this defect and were red for days before anyone noticed (#13808). Two more —
// `lockfile-healer` and `zetadb-scheduled-node` — carried it while staying GREEN,
// because both no-op before reaching the push: the healer only pushes on real lockfile
// drift, the zetadb lane only when the fold produces a new checkpoint. A lane that is
// green because it never does its work is the vacuity class in its purest form, and it
// is strictly worse than a red one: the failure looks new when the defect is months
// old, and it arrives exactly when the lane was finally needed.
//
// THE HOLE THIS CLOSES IN `audit-push-without-rebase.ts` (AH001)
// -------------------------------------------------------------
// AH001 already parses these same workflows and already recognises `git push HEAD:main`.
// It cannot catch this class, for two independent reasons, and both are worth stating
// because each is a lesson about what a check actually constrains:
//
//   1. IT ASKS A DIFFERENT QUESTION. AH001 asks "does this lane rebase before pushing?"
//      — it flags a push WITHOUT a re-expression and passes one WITH it. Every lane in
//      this class rebases diligently. They pass AH001 while being unable to push at all.
//      A correct answer to the wrong question is not coverage.
//   2. IT ONLY READS YAML. `.github/workflows/**` is the whole of its input, so a push
//      hidden one `bun some-script.ts` away is invisible to it. That is not theoretical:
//      `retraction-actuator.ts` — run by `drift-sweep.yml` on every sweep — pushed
//      `HEAD:main` from TypeScript, and was found only by following the indirection by
//      hand. This check follows it mechanically.
//
// AH001 is not replaced and is still right about its own question; the two are
// complementary.
//
// WHAT TO DO INSTEAD
// ------------------
// `src/Core.TypeScript/forge-host/github/flush-via-staging.ts` — park on
// `heartbeat/<lane>`, open a PR, arm squash auto-merge. `gate` runs on the PR and
// GitHub merges it. Proven by `tick-metrics`, `society`, `red-state` and the three
// cadences of #13808.
//
// NO EXEMPTIONS FOR NEW SITES. An exemption could only ever be a promise that a push
// works when the forge says it does not — the unimplemented-exception class this repo
// treats as the primary obstacle to trust. The only way to satisfy this check for new
// code is to stop pushing at `main`.
//
// WHAT `KNOWN_SITES` IS, AND WHY IT IS NOT THAT
// --------------------------------------------
// Writing this check surfaced four pre-existing sites that no grep of
// `.github/workflows/**` could have found, in three agent-side modules. They are
// recorded in `KNOWN_SITES` rather than fixed here, because each needs a design
// decision this change is not in a position to make or to verify, and an unverified
// fix reported as a fix is worse than a named debt.
//
// The roster is a RATCHET, not an allowlist, and the difference is mechanical:
//   - a rostered file that gains a site FAILS (`grew`) — the class cannot spread;
//   - a rostered file that loses one also FAILS (`stale`) — the roster must be edited
//     down, so it can never silently over-permit, and it cannot describe a repo that
//     no longer exists;
//   - a file not on the roster with any site FAILS outright.
// So the count may only travel toward zero, and every step is a deliberate edit.
//
// Rule 0: TypeScript (no .sh) per `.claude/rules/rule-0-no-sh-files.md`.
//
// Usage:
//   bun src/Core.TypeScript/hygiene/lint-no-direct-push-to-main.ts
//   bun src/Core.TypeScript/hygiene/lint-no-direct-push-to-main.ts --json
//
// Exit codes:
//   0   no automated lane pushes at `main`
//   1   at least one does
//   2   configuration error (workflow dir missing)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const DRIFT_CLASS = "PM001";
const WORKFLOW_DIR = ".github/workflows";

function repoRoot(): string {
  return resolve(process.env["REPO_ROOT"] ?? process.cwd());
}

/**
 * A destination that resolves to the default branch. `HEAD:main` and `origin main` are
 * the two shapes seen in the wild; the `refs/heads/main` spellings are the same push
 * written longhand and must not be a way around the check.
 *
 * Deliberately NOT matched: `HEAD:refs/heads/heartbeat/...` and any other ref. This
 * check is about the ONE ref whose ruleset makes the push impossible.
 */
const MAIN_DESTINATION = /(?:HEAD|[\w./-]*)?:(?:refs\/heads\/)?main\b|origin["'\s,]+["']?main["']?(?:\s|,|\)|\]|$)/;

/**
 * `push` as a git verb: the shell spelling, or the argv-array spelling that
 * `execFileSync`/`spawnSync` callers use. Matching bare `push` would hit every
 * `array.push(x)` in the repo.
 */
const PUSH_VERB = /git\s+push\b|["']push["']\s*,/g;

/** How far after the verb the destination may appear (covers a wrapped argv array). */
const WINDOW = 160;

/**
 * A test file. NOT scanned — and this is a scope boundary, stated out loud, not an
 * exemption that happens to be convenient.
 *
 * The check's subject is AUTOMATION: a lane with a schedule, whose push at `main` is
 * dead code that stays green until the day the lane finally has something to land. A
 * test file is not a lane. It has no cadence, it cannot be green-because-it-no-op'd in
 * the way this check exists to catch, and a test that really pushed at `main` would
 * fail loudly on its first run rather than silently on some future one.
 *
 * It is also forced. This check's own falsifiers must QUOTE the forbidden command to
 * assert that it is caught — `expect(at("git push origin HEAD:main")).toHaveLength(1)`
 * — and a push inside a string literal is indistinguishable from `sh("git push origin
 * HEAD:main")`, which is exactly the real defect found in `retraction-actuator.ts`. So
 * there is no filter that keeps the fixtures and catches the real thing; the honest move
 * is to declare the boundary. (Discovered by this check flagging its own test file the
 * moment `gate.yml` named it.)
 *
 * THE LIMIT, NAMED: a production push hidden in a file named `*.test.ts` and invoked by
 * a workflow as a lane would not be caught. Nothing in the repo does that today, and
 * closing it would mean distinguishing "run as a test" from "run as a lane", which the
 * workflow text does not reliably say.
 */
export function isTestFile(relPath: string): boolean {
  return /\.(test|spec)\.[mc]?[jt]sx?$/.test(relPath);
}

/** A line that documents a push rather than performing one. */
function isProse(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith("#") || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly snippet: string;
  readonly via: string;
}

/**
 * Scan one file's text. `via` records HOW this file is reachable from automation, so a
 * finding in a script names the workflow that runs it — otherwise the report is a path
 * with no explanation of why it is in scope.
 */
export function scanText(relPath: string, src: string, via: string): Finding[] {
  const findings: Finding[] = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isProse(line)) continue;
    // `echo`ed / `console.log`ged text names a push, it does not run one.
    if (/\becho\b|console\.(log|error|warn)|process\.std(out|err)\.write/.test(line)) continue;
    PUSH_VERB.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PUSH_VERB.exec(line)) !== null) {
      // The destination can be on the same line or wrap onto the next few — join a
      // bounded window so a hand-wrapped argv array cannot hide the ref.
      const rest = [line.slice(m.index), ...lines.slice(i + 1, i + 4)].join(" ").slice(0, WINDOW);
      if (MAIN_DESTINATION.test(rest)) {
        findings.push({ file: relPath, line: i + 1, snippet: line.trim().slice(0, 160), via });
        break;
      }
    }
  }
  return findings;
}

/** Repo-relative script paths named inside a workflow's `run:` commands. */
export function scriptsInvokedBy(src: string): string[] {
  const out = new Set<string>();
  const re = /(?<![\w./-])((?:src|clis|tools|scripts|bus|gen|bench)\/[\w./-]+\.(?:ts|mts|cts|mjs|cjs|js))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.add(m[1]!);
  return [...out].sort();
}

/** Relative-import specifiers in a TS/JS source, resolved to repo-relative paths. */
export function importsOf(root: string, relPath: string, src: string): string[] {
  const out = new Set<string>();
  const re = /(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const spec = m[1]!;
    const base = resolve(root, dirname(relPath), spec);
    for (const cand of [base, `${base}.ts`, `${base}.mts`, `${base}.js`, `${base}.mjs`, join(base, "index.ts")]) {
      // ONE syscall, not exists-then-stat: `throwIfNoEntry: false` returns undefined for
      // a missing path, so "does it exist" and "what is it" are answered by the same
      // observation and there is no window for the entry to change in between.
      if (statSync(cand, { throwIfNoEntry: false })?.isFile() === true) {
        out.add(relative(root, cand));
        break;
      }
    }
  }
  return [...out];
}

/**
 * Pre-existing sites, measured 2026-08-22 at `25da1aea78`. See the header for why this
 * is a shrink-only ratchet and not an allowlist. Every entry is a real defect: none of
 * these pushes can land while ruleset "CI Gate" stands.
 */
export const KNOWN_SITES: Readonly<Record<string, { readonly sites: number; readonly reason: string }>> = {
  "src/Core.TypeScript/observe/event-sink-folder.ts": {
    sites: 1,
    reason:
      "gitCommitToMain is the DEFAULT commit for the folder event sink (injectable, faked in tests). " +
      "Import-reachable from agent-heartbeat.yml via run-loop-real.ts. Rerouting the event sink " +
      "changes the no-PR event-publishing contract (081KSXN940008QG0R00171YAZW) and needs its own decision.",
  },
  "src/Core.TypeScript/observe/codegen-executor.ts": {
    sites: 1,
    reason:
      "mergeViaGit is the fallback merge path used only when the gh CLI is unavailable; it merges a PR " +
      "locally and pushes main. The fallback's whole premise (no gh CLI, therefore no PR route) is what " +
      "the ruleset now forecloses, so the fix is to delete the fallback, not to reroute it.",
  },
  "src/Core.TypeScript/work-items/git-push.ts": {
    sites: 2,
    reason:
      "gitPushEventFile publishes work-item events direct-to-main by design (no-PR, 081KSXN940008QG0R002FWR9B2). " +
      "It guards on being a main checkout, so it cannot fire inside CI, but it is broken for every local agent. " +
      "Both sites are the same retry loop.",
  },
};

export interface AuditResult {
  readonly workflowsScanned: number;
  readonly reachableFilesScanned: number;
  /** Sites that fail the check: new files, or rostered files whose count moved. */
  readonly findings: readonly Finding[];
  /** Sites matching the roster exactly — reported, not failed. */
  readonly rostered: readonly Finding[];
  /** Roster bookkeeping errors: a count that grew, shrank, or a vanished file. */
  readonly rosterErrors: readonly string[];
}

/**
 * Partition raw sites against the roster. Split out from `runAudit` so the ratchet is
 * testable without a filesystem: this function IS the rule, and the scan is just input.
 */
export function applyRoster(
  all: readonly Finding[],
  roster: Readonly<Record<string, { readonly sites: number; readonly reason: string }>> = KNOWN_SITES,
): { readonly findings: Finding[]; readonly rostered: Finding[]; readonly rosterErrors: string[] } {
  const byFile = new Map<string, Finding[]>();
  for (const f of all) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);

  const findings: Finding[] = [];
  const rostered: Finding[] = [];
  const rosterErrors: string[] = [];

  for (const [file, hits] of byFile) {
    const known = roster[file];
    if (known === undefined) {
      findings.push(...hits);
      continue;
    }
    if (hits.length > known.sites) {
      rosterErrors.push(
        `${file}: ${String(hits.length)} push-to-main site(s), roster allows ${String(known.sites)}. ` +
          "The roster may only shrink — a rostered file is a debt being paid down, not a licence.",
      );
      findings.push(...hits);
      continue;
    }
    if (hits.length < known.sites) {
      rosterErrors.push(
        `${file}: STALE roster entry — ${String(hits.length)} site(s) remain but the roster still claims ` +
          `${String(known.sites)}. Lower it (or delete the entry) so the roster cannot over-permit.`,
      );
      continue;
    }
    rostered.push(...hits);
  }

  for (const file of Object.keys(roster)) {
    if (!byFile.has(file)) {
      rosterErrors.push(`${file}: STALE roster entry — no push-to-main site remains. Delete the entry.`);
    }
  }
  return { findings, rostered, rosterErrors };
}

export function runAudit(root: string = repoRoot()): AuditResult {
  const dir = resolve(root, WORKFLOW_DIR);
  const workflows = readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort();

  const findings: Finding[] = [];
  // path -> the workflow it is reachable from (first one wins; the report only needs
  // one witness that this file is automation).
  const reachable = new Map<string, string>();

  for (const f of workflows) {
    const rel = `${WORKFLOW_DIR}/${f}`;
    let src: string;
    try {
      src = readFileSync(join(dir, f), "utf8");
    } catch {
      continue;
    }
    findings.push(...scanText(rel, src, "workflow"));
    for (const s of scriptsInvokedBy(src)) if (!reachable.has(s)) reachable.set(s, rel);
    // (workflow YAML itself is never a test file, so no filter is needed here)
  }

  // Transitive closure over relative imports: a push three modules deep is still a push
  // that automation performs. Closure is over IMPORTS only, which is exactly the set of
  // code that runs when the entry point runs.
  const queue = [...reachable.keys()];
  while (queue.length > 0) {
    const rel = queue.shift()!;
    const abs = resolve(root, rel);
    // No stat at all: the only question is "can this be read as text", and `readFileSync`
    // answers it in one syscall. A stat here would be a check-then-use race against the
    // read that follows, and it would tell us nothing the read does not.
    let src: string;
    try {
      src = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const via = reachable.get(rel) ?? "workflow";
    if (!isTestFile(rel)) findings.push(...scanText(rel, src, via));
    for (const dep of importsOf(root, rel, src)) {
      if (!reachable.has(dep)) {
        reachable.set(dep, via);
        queue.push(dep);
      }
    }
  }

  const partitioned = applyRoster(findings);
  return {
    workflowsScanned: workflows.length,
    reachableFilesScanned: reachable.size,
    findings: partitioned.findings,
    rostered: partitioned.rostered,
    rosterErrors: partitioned.rosterErrors,
  };
}

export function renderHuman(r: AuditResult): string {
  const head = `${String(r.workflowsScanned)} workflow(s) + ${String(r.reachableFilesScanned)} file(s) they invoke`;
  const debt =
    r.rostered.length === 0
      ? ""
      : `\n\nKnown, rostered debt (${String(r.rostered.length)} site(s)) — shrink-only, see KNOWN_SITES:\n` +
        r.rostered.map((f) => `  ${f.file}:${String(f.line)}  [via ${f.via}]`).join("\n");
  if (r.findings.length === 0 && r.rosterErrors.length === 0) {
    return `no-direct-push-to-main: OK — ${head}; no unrostered lane pushes at \`main\`.${debt}`;
  }
  if (r.findings.length === 0) {
    return [
      `no-direct-push-to-main: ${DRIFT_CLASS} — roster is out of date. (${head})`,
      "",
      ...r.rosterErrors.map((e) => `  ${e}`),
      debt,
    ].join("\n");
  }
  return [
    `no-direct-push-to-main: ${DRIFT_CLASS} — ${String(r.findings.length)} automated push(es) at \`main\`. (${head})`,
    "",
    'Ruleset "CI Gate" makes `gate (required)` a required check on `main`, evaluated at PUSH',
    "time, so a commit that has never been checked is rejected before any check can start.",
    "These lines cannot succeed. Route through",
    "src/Core.TypeScript/forge-host/github/flush-via-staging.ts (park on heartbeat/<lane>,",
    "flush via PR) instead.",
    "",
    ...r.findings.map((f) => `  ${f.file}:${String(f.line)}  [via ${f.via}]\n    ${f.snippet}`),
    ...(r.rosterErrors.length > 0 ? ["", ...r.rosterErrors.map((e) => `  ${e}`)] : []),
    debt,
  ].join("\n");
}

export function main(argv: readonly string[]): number {
  const root = repoRoot();
  try {
    if (!statSync(resolve(root, WORKFLOW_DIR)).isDirectory()) throw new Error("not a dir");
  } catch {
    process.stderr.write(`error: ${WORKFLOW_DIR} not found under ROOT=${root}\n`);
    return 2;
  }
  const r = runAudit(root);
  process.stdout.write((argv.includes("--json") ? JSON.stringify(r, null, 2) : renderHuman(r)) + "\n");
  return r.findings.length > 0 || r.rosterErrors.length > 0 ? 1 : 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
