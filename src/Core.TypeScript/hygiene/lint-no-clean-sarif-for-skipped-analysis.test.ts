import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  auditWorkflow,
  excludesEvent,
  normalizePath,
  pathMatches,
  runAudit,
  main,
} from "./lint-no-clean-sarif-for-skipped-analysis.ts";

const REPO = resolve(import.meta.dir, "..", "..", "..");

/**
 * The pre-fix shape, reduced to the parts that matter: a job with no analyser
 * step synthesises an empty SARIF and uploads it under a real analysis
 * category, on a workflow that runs on `push`.
 */
const PRE_FIX = `
name: CodeQL
on:
  push:
    branches: [main]
  pull_request:
jobs:
  path-gate:
    runs-on: ubuntu-24.04
    steps:
      - name: Emit no-findings SARIF
        if: steps.decide.outputs.is_fork_pr != 'true'
        run: |
          for lang in actions javascript-typescript; do
            cat > "sarif/empty-\${lang}.sarif" <<SARIF
          { "version": "2.1.0", "runs": [ { "results": [] } ] }
          SARIF
          done
      - name: Upload no-findings SARIF (javascript-typescript)
        if: steps.decide.outputs.is_fork_pr != 'true'
        uses: github/codeql-action/upload-sarif@db488dd
        with:
          sarif_file: sarif/empty-javascript-typescript.sarif
          category: "/language:javascript-typescript"
`;

const gated = PRE_FIX.replaceAll(
  "if: steps.decide.outputs.is_fork_pr != 'true'",
  "if: >-\n          steps.decide.outputs.is_fork_pr != 'true'\n          && github.event_name != 'push'\n          && github.event_name != 'schedule'",
);

const unsuccessful = PRE_FIX.replace(
  '"runs": [ { "results": [] } ]',
  '"runs": [ { "results": [], "invocations": [ { "executionSuccessful": false } ] } ]',
);

const analyserOwned = PRE_FIX.replace(
  "      - name: Emit no-findings SARIF",
  "      - name: Initialize CodeQL\n        uses: github/codeql-action/init@db488dd\n      - name: Emit no-findings SARIF",
);

const noDurableTrigger = PRE_FIX.replace("on:\n  push:\n    branches: [main]\n  pull_request:", "on:\n  pull_request:");

describe("the defect this lint was written for", () => {
  // THE FALSIFIER. If this test can pass with the guard removed, the lint is a
  // check that cannot fail -- the exact class it exists to catch. It is pinned
  // to a COUNT, not to `> 0`, so a recognizer that silently stops linking emit
  // sites to upload sites fails here instead of reporting a clean workflow.
  test("a clean synthesised SARIF uploadable on push is a finding", () => {
    const out = auditWorkflow(PRE_FIX, "codeql.yml");
    expect(out.emitSites).toHaveLength(1);
    expect(out.uploadSites).toHaveLength(1);
    expect(out.findings).toHaveLength(1);
    expect(out.findings.at(0)?.sarifFile).toBe("sarif/empty-javascript-typescript.sarif");
  });

  // The same shape as it stood on `main` on 2026-08-27, read from git rather
  // than transcribed -- so this test measures the real historical artifact and
  // cannot drift away from it.
  test("the workflow as it stood on origin/main yields five findings", () => {
    const text = execFileSync("git", ["-C", REPO, "show", "origin/main:.github/workflows/codeql.yml"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const out = auditWorkflow(text, "codeql.yml@origin/main");
    // Five categories were uploaded clean from a job that never analyses:
    // actions, csharp, python, javascript-typescript, java-kotlin.
    expect(out.findings).toHaveLength(5);
    expect(out.findings.map((f) => f.sarifFile).sort()).toEqual([
      "sarif/empty-actions.sarif",
      "sarif/empty-csharp.sarif",
      "sarif/empty-java-kotlin.sarif",
      "sarif/empty-javascript-typescript.sarif",
      "sarif/empty-python.sarif",
    ]);
  });
});

describe("each remedy clears the finding, and only its own case", () => {
  test("gating off push and schedule clears it", () => {
    expect(auditWorkflow(gated, "w.yml").findings).toHaveLength(0);
  });

  test("declaring executionSuccessful:false clears it", () => {
    const out = auditWorkflow(unsuccessful, "w.yml");
    expect(out.emitSites.at(0)?.declaresUnsuccessful).toBe(true);
    expect(out.findings).toHaveLength(0);
  });

  test("a job that runs the analyser clears it", () => {
    const out = auditWorkflow(analyserOwned, "w.yml");
    expect(out.emitSites.at(0)?.jobRunsAnalyser).toBe(true);
    expect(out.findings).toHaveLength(0);
  });

  test("a workflow with no push/schedule trigger clears it", () => {
    expect(auditWorkflow(noDurableTrigger, "w.yml").findings).toHaveLength(0);
  });

  // Gating off only ONE of the two durable-ref events is not a remedy. Without
  // this, `&&` could be swapped for `||` in the gate check and every test above
  // would still pass.
  test("gating off push alone is NOT a remedy", () => {
    const half = PRE_FIX.replaceAll("if: steps.decide.outputs.is_fork_pr != 'true'", "if: github.event_name != 'push'");
    expect(auditWorkflow(half, "w.yml").findings).toHaveLength(1);
  });
});

describe("the recognizers, pinned because each one can go dark silently", () => {
  // THE MEASURED RECOGNIZER BUG. `${{ matrix.language }}` contains spaces, so
  // matching the heredoc target against the RAW script truncates the path at
  // the first space and yields `sarif/no-source-${{`. The truncated path links
  // to no upload, the pair goes unseen, and the lint reports a clean workflow
  // over a site it never looked at. Caught on this file's first run.
  test("a heredoc target holding a ${{ }} expression is not truncated", () => {
    const wf = `
on:
  push:
jobs:
  emit-only:
    steps:
      - name: Emit
        run: |
          cat > "sarif/no-source-\${{ matrix.language }}.sarif" <<SARIF
          { "runs": [ { "results": [] } ] }
          SARIF
      - name: Upload
        uses: github/codeql-action/upload-sarif@db488dd
        with:
          sarif_file: sarif/no-source-\${{ matrix.language }}.sarif
`;
    const out = auditWorkflow(wf, "w.yml");
    expect(out.emitSites.at(0)?.writes).toEqual(["sarif/no-source-*.sarif"]);
    expect(out.findings).toHaveLength(1);
  });

  test("normalizePath collapses both expression syntaxes", () => {
    expect(normalizePath("sarif/empty-${lang}.sarif")).toBe("sarif/empty-*.sarif");
    expect(normalizePath("sarif/x-${{ matrix.language }}.sarif")).toBe("sarif/x-*.sarif");
  });

  test("pathMatches does not let a hole cross a path separator", () => {
    expect(pathMatches("sarif/empty-*.sarif", "sarif/empty-python.sarif")).toBe(true);
    expect(pathMatches("sarif/empty-*.sarif", "sarif/sub/empty-a.sarif")).toBe(false);
  });

  // `excludesEvent` must require the explicit inequality. Merely not mentioning
  // an event is not excluding it -- that reading would clear every unguarded
  // upload in the repo and make the lint vacuous.
  test("excludesEvent requires the explicit inequality", () => {
    expect(excludesEvent("github.event_name != 'push'", "push")).toBe(true);
    expect(excludesEvent('github.event_name != "push"', "push")).toBe(true);
    expect(excludesEvent("github.event_name == 'pull_request'", "push")).toBe(false);
    expect(excludesEvent("always()", "push")).toBe(false);
    expect(excludesEvent("", "push")).toBe(false);
  });

  test("an unparseable workflow is not silently cleared as a pass", () => {
    const out = auditWorkflow("\t: [unbalanced\n  - {", "broken.yml");
    expect(out.emitSites).toHaveLength(0);
    expect(out.uploadSites).toHaveLength(0);
    expect(out.findings).toHaveLength(0);
  });
});

describe("the live tree", () => {
  test("codeql.yml on this branch has no clean-SARIF-on-push path", () => {
    const text = readFileSync(join(REPO, ".github", "workflows", "codeql.yml"), "utf8");
    expect(auditWorkflow(text, "codeql.yml").findings).toEqual([]);
  });

  // NON-VACUITY. A pass over an empty corpus is the failure this lint exists to
  // catch, so the corpus is asserted non-empty independently of the verdict.
  test("both recognizers still match something in the repo", () => {
    const report = runAudit(REPO);
    expect(report.workflowsScanned).toBeGreaterThan(10);
    expect(report.emitSites.length).toBeGreaterThan(0);
    expect(report.uploadSites.length).toBeGreaterThan(0);
    expect(report.darkRecognizers).toEqual([]);
  });

  test("the audit exits 0 on this branch", () => {
    expect(main([])).toBe(0);
  });

  test("an unknown argument is a usage error, not a pass", () => {
    expect(main(["--nope"])).toBe(1);
  });
});
