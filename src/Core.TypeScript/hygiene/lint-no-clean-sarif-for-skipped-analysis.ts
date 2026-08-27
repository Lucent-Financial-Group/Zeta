// src/Core.TypeScript/hygiene/lint-no-clean-sarif-for-skipped-analysis.ts
//
// AN ANALYSIS THAT DID NOT RUN MUST NOT BE REPORTED AS AN ANALYSIS THAT FOUND
// NOTHING.
//
// This is exit-2-means-never-ran versus exit-1-means-failed, pointed at the
// security surface. It is worse there than elsewhere, because the vacuous
// result is not merely absent -- it is a POSITIVE signal of safety. A missing
// check leaves an alert open. A check that reports "clean" without running
// CLOSES the alert, and the closed alert is then indistinguishable from a
// fixed defect.
//
// THE MEASURED INSTANCE THIS FILE EXISTS FOR (2026-08-27).
// `.github/workflows/codeql.yml` synthesised a minimal SARIF with
// `"results": []` and uploaded it under the REAL analysis categories
// (`/language:javascript-typescript` and four siblings) on every event,
// including `push`. GitHub recorded it as a successful analysis finding
// nothing:
//
//     analysis 1679102987 - 2026-08-27T02:56:34Z
//       analysis_key .github/workflows/codeql.yml:path-gate
//       category     /language:javascript-typescript
//       results_count 0    error ""    tool.version 0.0.0
//
// and marked 102 open alerts across 14 rules `fixed` at that same instant,
// none dismissed. The commit it attributed the fix to changed two lines of one
// JSON data file. `js/http-to-file-access` #267
// (`src/Core.TypeScript/peer-call/summon.ts:369`) and #772
// (`src/Core.TypeScript/observe/tick-reasoning.ts:59`) were closed with their
// dataflows still present in the source.
//
// WHY THE UPLOAD WAS NOT ITSELF THE MISTAKE, WHICH IS WHY THIS LINT ALLOWS
// SEVERAL REMEDIES RATHER THAN ONE. The synthetic SARIF solved a real problem: a
// docs-only change should not have to run a full analysis, and a required
// check must report SOMETHING. Deleting it trades a silent-closure defect for
// a blocked queue. What was wrong was not that a placeholder was uploaded --
// it was that the placeholder claimed to be clean.
//
// GITHUB ALREADY DRAWS THE DISTINCTION, and the same run proves it. The
// cancelled `Analyze (javascript-typescript)` leg ALSO uploaded a zero-result
// SARIF for the same category seconds later (analysis 1679104588) and it
// changed no alert, because codeql-action marks a run that did not complete
// `executionSuccessful: false` and GitHub recorded it as
// `error: "unsuccessful execution, exit code: 0"`. So the format has a way to
// say "did not run"; the synthetic SARIF simply did not use it.
//
// THE RULE THIS ENFORCES, stated as the property rather than as the instance:
//
//     A JOB THAT NEVER RUNS AN ANALYSER MAY NOT UPLOAD A RESULT THAT LOOKS
//     LIKE A COMPLETED ANALYSIS.
//
// So a step that uploads a SARIF the workflow itself synthesised with an empty
// `results` array must satisfy at least one of:
//
//   1. the synthesised SARIF marks `"executionSuccessful": false`, so GitHub
//      records a run that did not complete rather than a clean scan; or
//   2. the upload is gated off `push` AND `schedule` -- the events whose
//      analyses write the default branch, where alerts are the durable
//      security record rather than per-PR scratch; or
//   3. the job actually runs the analyser (`codeql-action/init` or
//      `codeql-action/analyze` appears among its steps), so the empty result
//      is that job's own considered verdict about its own category; or
//   4. the workflow is not triggered by `push` or `schedule` at all, so no
//      durable ref is reachable from it.
//
// Anything else is a clean-looking analysis that can reach a durable ref
// without having analysed anything.
//
// WHY (3) IS A REMEDY AND NOT A HOLE, and what it deliberately does not cover.
// `codeql.yml`'s `analyze` job also emits an empty SARIF -- its "no-source
// baseline", for a matrix language with no first-party files at this commit.
// That claim is substantively different from the path-gate one: it is made by
// the job that OWNS that category's analysis, about its own language, and it
// is gated on a measurement (a `git ls-files` count) that can come out either
// way. If a language genuinely has no source then zero alerts is the correct
// state and closing them is right. This lint therefore clears it -- and states
// the residual rather than papering it over: it does NOT check that the
// measurement is correct. A `has_source` detector that regresses, through a
// rename or a moved directory, would close that language's alerts, and only a
// test of the detector catches that. A rule strict enough to forbid it would
// also forbid the honest case, so the gap is named instead of closed here.
//
// NON-VACUITY. This lint is itself an enumerating check, which is the shape
// that goes blind: rename the emit step, reformat the heredoc, switch upload
// actions, and it would report "0 violations" over a corpus of zero. So it
// carries a floor on its own recognizers -- if it finds no synthesised-empty
// SARIF and no SARIF upload anywhere in `.github/workflows/`, it exits 4
// NAMING the recognizer that went dark instead of passing.
//
// DST: pure function of the tracked workflow files. No clock, no network, no
// randomness. Output is ordinal-sorted throughout.
//
// Usage:
//   bun src/Core.TypeScript/hygiene/lint-no-clean-sarif-for-skipped-analysis.ts
//   bun src/Core.TypeScript/hygiene/lint-no-clean-sarif-for-skipped-analysis.ts --json
//
// Exit codes:
//   0  no synthesised-clean SARIF can reach a durable ref
//   1  usage error
//   3  violation -- a synthesised empty SARIF is uploadable on push/schedule
//   4  recognizer dark -- the corpus is empty, so a pass would be vacuous

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/** One step that synthesises a SARIF whose `results` array is empty. */
export interface EmitSite {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
  /** Heredoc targets written by the step, `${...}` collapsed to `*`. */
  readonly writes: readonly string[];
  /** Whether the synthesised SARIF says the run did not complete. */
  readonly declaresUnsuccessful: boolean;
  /** Whether the emitting job runs an analyser at all (remedy 3). */
  readonly jobRunsAnalyser: boolean;
  /** Effective `if:` for the step (job condition && step condition). */
  readonly condition: string;
}

/** One step that uploads a SARIF file to code scanning. */
export interface UploadSite {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
  readonly sarifFile: string;
  readonly condition: string;
}

/** A synthesised-clean SARIF that a durable-ref event can still upload. */
export interface Finding {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
  readonly sarifFile: string;
  readonly emittedBy: string;
  readonly why: string;
}

export interface Report {
  readonly workflowsScanned: number;
  readonly emitSites: readonly EmitSite[];
  readonly uploadSites: readonly UploadSite[];
  readonly findings: readonly Finding[];
  /** Recognizers that matched nothing at all; a pass would be vacuous. */
  readonly darkRecognizers: readonly string[];
}

/**
 * A SARIF run with an empty `results` array, in the formatting a shell
 * heredoc produces. Deliberately tolerant of whitespace and of the array
 * being written on one line or several.
 */
const EMPTY_RESULTS = /"results"\s*:\s*\[\s*\]/;

/** The documented "this run did not complete" marker (SARIF invocations). */
const DECLARES_UNSUCCESSFUL = /"executionSuccessful"\s*:\s*false/;

/**
 * `cat > "path" <<X` / `cat >"path"` / `cat > path <<X` heredoc targets.
 *
 * Applied to the script AFTER `normalizePath`, never before. A raw script
 * contains `${{ matrix.language }}` -- which has SPACES -- so matching this
 * against the raw text truncates the target at the first space and yields
 * `sarif/no-source-${{`. That is not a cosmetic bug: the truncated path
 * matches no upload's `sarif_file`, the pair goes unlinked, and the lint
 * reports zero violations over a site it simply failed to see. Measured on
 * this file's first run, which is why the order is pinned by a test.
 */
const HEREDOC_TARGET = /\bcat\s+>\s*"?([^"\s<>]+)"?/g;

/** Any pinned or floating reference to a SARIF-uploading action. */
const UPLOAD_SARIF_ACTION = "codeql-action/upload-sarif";

/** A step that actually runs the analyser, making the job an analysis owner. */
const ANALYSER_ACTION = /codeql-action\/(init|analyze)/;

/**
 * The two events whose code-scanning analyses are written against the
 * repository's own branches, where alerts are the durable security record.
 * A `pull_request` analysis lands on `refs/pull/N/merge` and a `merge_group`
 * one on `refs/heads/gh-readonly-queue/*`; both are discarded with the ref.
 */
export const DURABLE_REF_EVENTS = ["push", "schedule"] as const;

/** Collapse `${VAR}` and `${{ expr }}` to `*` so a written path is matchable. */
export function normalizePath(p: string): string {
  return p.replace(/\$\{\{[^}]*\}\}/g, "*").replace(/\$\{[^}]*\}/g, "*");
}

/** Does a written-path pattern (with `*` holes) cover a concrete path? */
export function pathMatches(pattern: string, concrete: string): boolean {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^/]*");
  return new RegExp(`^${escaped}$`).test(normalizePath(concrete));
}

/**
 * Does a GitHub Actions condition exclude an event outright?
 *
 * Only the explicit inequality counts. A condition that merely fails to
 * mention the event does not exclude it, and neither does a positive
 * `== 'pull_request'` test buried in an `||` -- so this recognizer is
 * deliberately narrow and says so by failing closed.
 */
export function excludesEvent(condition: string, event: string): boolean {
  const pattern = new RegExp(String.raw`github\.event_name\s*!=\s*['"]${event}['"]`);
  return pattern.test(condition);
}

/** Join a job-level and step-level `if:` into one effective condition. */
function effectiveCondition(jobIf: unknown, stepIf: unknown): string {
  return [jobIf, stepIf].filter((c): c is string => typeof c === "string" && c.length > 0).join(" && ");
}

/**
 * Narrowing helpers. A workflow file is arbitrary YAML, so every read below
 * goes through one of these rather than through a cast: an `as` on parsed YAML
 * asserts a shape nobody checked, and this file's whole subject is a claim
 * asserted without a check.
 */
function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asArray(v: unknown): readonly unknown[] {
  return Array.isArray(v) ? (v as readonly unknown[]) : [];
}

/** Every `${{ }}`-normalised heredoc target a synthesising script writes. */
function heredocTargets(script: string): string[] {
  // Normalize BEFORE matching: `${{ matrix.language }}` has spaces.
  const writes: string[] = [];
  for (const m of normalizePath(script).matchAll(HEREDOC_TARGET)) {
    const target = m[1];
    if (target !== undefined) writes.push(target);
  }
  return writes.toSorted();
}

/** Which events can this workflow's uploads reach a durable ref through? */
function reachesDurableRef(doc: Record<string, unknown>): boolean {
  // YAML 1.2 keeps `on` a string key; YAML 1.1 folds it to boolean true.
  const raw = doc.on ?? doc[String(true)];
  const names = Array.isArray(raw) ? asArray(raw).map((t) => asString(t) ?? "") : Object.keys(asRecord(raw) ?? {});
  return DURABLE_REF_EVENTS.some((e) => names.includes(e));
}

/** Collect the emit and upload sites of one job. */
function collectJobSites(
  workflow: string,
  jobName: string,
  job: Record<string, unknown>,
): { emitSites: EmitSite[]; uploadSites: UploadSite[] } {
  const emitSites: EmitSite[] = [];
  const uploadSites: UploadSite[] = [];

  const steps = asArray(job.steps)
    .map(asRecord)
    .filter((s): s is Record<string, unknown> => s !== undefined);

  // Does this job own an analysis at all? A job with no analyser step can
  // never have anything to report, so a clean result from it is vacuous by
  // construction -- remedy (3) in the header.
  const jobRunsAnalyser = steps.some((s) => {
    const uses = asString(s.uses);
    return uses !== undefined && ANALYSER_ACTION.test(uses);
  });

  for (const step of steps) {
    const stepName = asString(step.name) ?? "(unnamed)";
    const condition = effectiveCondition(job.if, step.if);

    const script = asString(step.run);
    if (script !== undefined && EMPTY_RESULTS.test(script)) {
      emitSites.push({
        workflow,
        job: jobName,
        step: stepName,
        writes: heredocTargets(script),
        declaresUnsuccessful: DECLARES_UNSUCCESSFUL.test(script),
        jobRunsAnalyser,
        condition,
      });
    }

    const uses = asString(step.uses);
    if (uses?.includes(UPLOAD_SARIF_ACTION) === true) {
      uploadSites.push({
        workflow,
        job: jobName,
        step: stepName,
        sarifFile: asString(asRecord(step.with)?.sarif_file) ?? "",
        condition,
      });
    }
  }

  return { emitSites, uploadSites };
}

/**
 * Link each upload to the emit step that produced its file, and report the
 * pairs no remedy clears. Separate from `auditWorkflow` so the linking rule
 * can be read on its own -- it is where the whole verdict is decided.
 */
function pairSites(workflow: string, emitSites: readonly EmitSite[], uploadSites: readonly UploadSite[]): Finding[] {
  const findings: Finding[] = [];
  for (const upload of uploadSites) {
    if (upload.sarifFile === "") continue;
    for (const emit of emitSites) {
      if (!emit.writes.some((w) => pathMatches(w, upload.sarifFile))) continue;
      if (emit.declaresUnsuccessful) continue;
      if (emit.jobRunsAnalyser) continue;

      // BOTH events, and BOTH steps. A gate on the upload that the emit does
      // not share still leaves a file on disk nothing uploads -- harmless --
      // but a gate on the emit alone would leave the upload reading a stale
      // or absent file, so the pair is judged together.
      const gated = DURABLE_REF_EVENTS.every(
        (e) => excludesEvent(upload.condition, e) && excludesEvent(emit.condition, e),
      );
      if (gated) continue;

      findings.push({
        workflow,
        job: upload.job,
        step: upload.step,
        sarifFile: upload.sarifFile,
        emittedBy: `${emit.job} / ${emit.step}`,
        why:
          "synthesised SARIF has an empty `results` array, does not declare " +
          "`executionSuccessful: false`, comes from a job that runs no " +
          "analyser, and is not gated off push/schedule -- so GitHub records " +
          "it as a clean analysis and marks every open alert in its category " +
          "fixed",
      });
    }
  }
  return findings;
}

/** Audit one workflow's text. Pure: no disk, no clock. */
export function auditWorkflow(
  text: string,
  workflow: string,
): {
  emitSites: EmitSite[];
  uploadSites: UploadSite[];
  findings: Finding[];
} {
  const emitSites: EmitSite[] = [];
  const uploadSites: UploadSite[] = [];
  const findings: Finding[] = [];

  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch {
    // A workflow we cannot parse is not a workflow we can clear. It
    // contributes nothing to the corpus, so the recognizer floor -- not a
    // silent pass -- is what notices if parsing stops working everywhere.
    return { emitSites, uploadSites, findings };
  }
  const doc = asRecord(parsed);
  if (doc === undefined) return { emitSites, uploadSites, findings };

  const jobs = asRecord(doc.jobs) ?? {};
  for (const jobName of Object.keys(jobs).toSorted()) {
    const job = asRecord(jobs[jobName]);
    if (job === undefined) continue;
    const sites = collectJobSites(workflow, jobName, job);
    emitSites.push(...sites.emitSites);
    uploadSites.push(...sites.uploadSites);
  }

  if (!reachesDurableRef(doc)) {
    // Nothing this workflow uploads can reach a branch whose alerts persist.
    return { emitSites, uploadSites, findings };
  }

  findings.push(...pairSites(workflow, emitSites, uploadSites));
  return { emitSites, uploadSites, findings };
}

/** Read `.github/workflows/*.yml` under `root` and audit every file. */
export function runAudit(root: string): Report {
  const dir = join(root, ".github", "workflows");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .toSorted();

  const emitSites: EmitSite[] = [];
  const uploadSites: UploadSite[] = [];
  const findings: Finding[] = [];

  for (const file of files) {
    const out = auditWorkflow(readFileSync(join(dir, file), "utf8"), file);
    emitSites.push(...out.emitSites);
    uploadSites.push(...out.uploadSites);
    findings.push(...out.findings);
  }

  const darkRecognizers: string[] = [];
  if (emitSites.length === 0) darkRecognizers.push("synthesised-empty-sarif");
  if (uploadSites.length === 0) darkRecognizers.push("upload-sarif-step");

  return {
    workflowsScanned: files.length,
    emitSites,
    uploadSites,
    // Ordinal ordering, not locale collation: the report is compared across
    // machines and must not depend on the runner's locale.
    findings: findings.toSorted((a, b) => {
      const ka = `${a.workflow} ${a.job} ${a.step}`;
      const kb = `${b.workflow} ${b.job} ${b.step}`;
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return 0;
    }),
    darkRecognizers: darkRecognizers.toSorted(),
  };
}

export function renderReport(report: Report): string {
  const lines = [
    `workflows scanned:        ${String(report.workflowsScanned)}`,
    `synthesised-empty SARIFs: ${String(report.emitSites.length)}`,
    `SARIF upload steps:       ${String(report.uploadSites.length)}`,
    `findings:                 ${String(report.findings.length)}`,
  ];
  for (const f of report.findings) {
    lines.push(
      "",
      `  ${f.workflow} :: ${f.job} :: ${f.step}`,
      `    uploads ${f.sarifFile}`,
      `    emitted by ${f.emittedBy}`,
      `    ${f.why}`,
    );
  }
  return lines.join("\n");
}

export function main(argv: readonly string[]): number {
  const json = argv.includes("--json");
  const unknown = argv.filter((a) => a !== "--json");
  if (unknown.length > 0) {
    process.stderr.write(
      `usage: lint-no-clean-sarif-for-skipped-analysis.ts [--json]\n` +
        `unexpected argument(s): ${unknown.join(", ")}\n`,
    );
    return 1;
  }

  const root = resolve(import.meta.dir, "..", "..", "..");
  const report = runAudit(root);

  process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : `${renderReport(report)}\n`);

  if (report.darkRecognizers.length > 0) {
    process.stderr.write(
      `\nRECOGNIZER DARK: ${report.darkRecognizers.join(", ")} matched nothing.\n` +
        "A pass over an empty corpus is the failure this lint exists to catch,\n" +
        "so it is reported as one. Fix the recognizer, never the floor.\n",
    );
    return 4;
  }

  if (report.findings.length > 0) {
    process.stderr.write(
      "\nA SKIPPED ANALYSIS IS BEING REPORTED AS A CLEAN ANALYSIS.\n" +
        "GitHub reads a zero-result SARIF as 'this category was analysed and is\n" +
        "clean', and marks every open alert in that category fixed -- with the\n" +
        "defect still in the source. Either declare `executionSuccessful: false`\n" +
        "in the synthesised SARIF, or gate the upload off push and schedule so it\n" +
        "cannot reach a ref whose alerts persist.\n",
    );
    return 3;
  }

  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
