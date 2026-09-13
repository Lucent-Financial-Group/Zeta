#!/usr/bin/env bun
// lint-nuget-force-evaluate-is-confined.ts — the premise under Scorecard alerts #963/#964.
//
// A DISMISSAL WHOSE PREMISE NOTHING CHECKS IS THE VACUITY CLASS. Scorecard reports
// "nugetCommand not pinned by hash" against `lock-cross-os-stability.yml`, and it is RIGHT
// about the shape: those two `dotnet restore` calls pass `--force-evaluate`, which
// deliberately re-resolves instead of honouring `packages.lock.json`.
//
// It is dismissed because that workflow's SUBJECT is the re-resolution. Its job is to
// discover whether a lock resolves identically across operating systems, and that question
// cannot be asked under `--locked-mode` — pinning it would delete the experiment, not
// secure it. Same shape as the binary-under-test exception in
// `.claude/rules/no-binary-in-proof-lineage.md`: the artifact being MEASURED is not the
// artifact being TRUSTED.
//
// AN EXCEPTION WITH NO SCOPE IS A LICENCE, so this file is its scope. The dismissal is
// only honest while `--force-evaluate` stays CONFINED to that one experiment. The day a
// production build path picks it up, the alerts' premise is gone and nothing else would say so.
//
// MEASURED 2026-09-13: `--force-evaluate` appears in 1 workflow (lock-cross-os-stability.yml,
// 2 sites); `low-memory.yml` restores under `--locked-mode`; Directory.Build.props sets
// RestorePackagesWithLockFile=true.
//
// WHAT MAKES THIS CHECKER GO RED:
//   - any workflow other than the named experiment invokes restore with `--force-evaluate`
//   - the experiment stops using it (then the alerts are stale, not dismissed-with-premise)

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_DIR = ".github/workflows";
/** The one workflow whose subject IS the unpinned re-resolution. */
export const EXPERIMENT = "lock-cross-os-stability.yml";
const FORCE_EVALUATE = /--force-evaluate\b/u;

/** Strip `#` comments so a line merely DISCUSSING the flag is not counted as using it.
 *  The repo's own prose says "--force-evaluate" while explaining it; a checker that greps
 *  the identifier instead of the invocation reports its own documentation. */
export function strippedLines(yaml: string): readonly string[] {
  return yaml
    .split("\n")
    .map((l) => l.replace(/#.*$/u, ""))
    .filter((l) => l.trim().length > 0);
}

export function usesForceEvaluate(yaml: string): number {
  return strippedLines(yaml).filter((l) => FORCE_EVALUATE.test(l)).length;
}

export interface Report {
  readonly experimentSites: number;
  readonly strays: readonly string[];
}

export function scan(files: ReadonlyArray<{ name: string; text: string }>): Report {
  let experimentSites = 0;
  const strays: string[] = [];
  for (const f of files) {
    const n = usesForceEvaluate(f.text);
    if (n === 0) continue;
    if (f.name === EXPERIMENT) experimentSites = n;
    else strays.push(`${f.name} (${String(n)} site(s))`);
  }
  return { experimentSites, strays };
}

function main(): number {
  const names = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  const files = names.map((name) => ({ name, text: readFileSync(join(WORKFLOW_DIR, name), "utf8") }));
  const { experimentSites, strays } = scan(files);

  console.log(`scanned ${String(files.length)} workflow file(s)`);
  if (experimentSites > 0) {
    console.log(`  ok       --force-evaluate confined to ${EXPERIMENT} (${String(experimentSites)} site(s))`);
  } else {
    console.log(`  FAIL     ${EXPERIMENT} no longer uses --force-evaluate — #963/#964's premise is GONE`);
  }
  for (const s of strays) console.log(`  FAIL     --force-evaluate outside the experiment: ${s}`);

  const failed = experimentSites === 0 || strays.length > 0;
  console.log(failed ? "\nnuget force-evaluate confinement FAILS." : "\nnuget force-evaluate confinement holds.");
  return failed ? 1 : 0;
}

if (import.meta.main) process.exit(main());
