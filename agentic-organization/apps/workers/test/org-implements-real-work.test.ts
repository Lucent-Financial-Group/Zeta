/**
 * org-implements-real-work.test.ts — the whole hierarchy implementing WORK, end to end.
 *
 * ── WHAT THIS PROVES THAT THE OTHER ORG TESTS DO NOT ─────────────────────────
 * `work-os-runtime.test.ts` and `org-runtime.test.ts` prove the org STRUCTURE: a work item is
 * prioritized by the Executive Board and C-suite, the RMO computes hat demand and supervisors vote
 * to expand supply, hats are ranked by reputation and bound to agents, the item crosses seven
 * quality gates, QA catches "regressions", churn triggers escalation, and it reaches released — every
 * transition attributed to a hat at a named level.
 *
 * All of that ran on fixtures. `TestExecutor` — the port whose own docstring says *"the real runner
 * is computer-use / browser / API"* — had exactly one implementation in the whole tree,
 * `createDeterministicExecutor`, which takes the outcome as an ARGUMENT. And `runWorkOsCycle`
 * hardcoded it. So the organization could staff, gate, escalate and release a work item **without a
 * line of work being done or a single assertion being checked**.
 *
 * This wires the real ports at the composition root — where this codebase says real adapters belong
 * — and asserts on the ARTIFACT rather than on the org's account of itself:
 *
 *   the dev hat runs a real sandboxed subprocess that writes a real file
 *   QA runs a DIFFERENT real subprocess that reads that file and judges it
 *   the first attempt is genuinely wrong, so QA genuinely fails
 *   churn escalates, the RMO adds agents, an architect is brought in
 *   the rework is genuinely correct, so QA genuinely passes
 *   and the file on disk holds what the org set out to produce
 *
 * Nothing here tells QA what to conclude; the verdict is read from what the process printed.
 *
 * ── WHY EVERY FILE TOUCH GOES THROUGH THE SANDBOX ────────────────────────────
 * `packages/test-node.d.ts` deliberately exposes only `mkdtempSync`/`rmSync` from `node:fs`, so a
 * test cannot quietly read or write the filesystem. Rather than widen that, all work AND the final
 * read run through the same `SandboxToolPort` the org uses — which is the more faithful proof:
 * the assertion travels the same channel the organization does.
 */

import { equal, ok } from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";

import {
  buildHatDefinitions,
  createSandboxTestExecutor,
  QaPassToken,
  runWorkOsCycle,
  type SandboxToolPort,
  type WorkImplementer,
} from "../../../packages/application/src/index.ts";
import { WorkItemState } from "../../../packages/domain/src/index.ts";
import { createSubprocessSandbox } from "../src/adapters/subprocess-sandbox.ts";

/** The sandbox requires an absolute command path; the composition root reads it the same way. */
const NODE = process.argv[0] ?? "node";

/**
 * The work the organization is trying to get done: a file whose contents must equal the approved
 * value. Trivial on purpose — the point is that it is REAL and independently checkable, not hard.
 */
const APPROVED_CONTENT = "coupon-applies-discount";
const WRONG_CONTENT = "coupon-ignored";

const WRITE_SCRIPT = "require('node:fs').writeFileSync(process.argv[1], process.argv[2]);process.stdout.write('WROTE');";
const READ_SCRIPT =
  "const fs=require('node:fs');let a='';" +
  "try{a=fs.readFileSync(process.argv[1],'utf8')}catch(e){a='<missing>'}" +
  "process.stdout.write(a);";
const VERIFY_SCRIPT =
  "const fs=require('node:fs');let a='';" +
  "try{a=fs.readFileSync(process.argv[1],'utf8')}catch(e){a='<missing>'}" +
  "process.stdout.write(a===process.argv[2]?'PASS':'FAIL:'+a);";

function joinPath(dir: string, name: string): string {
  return `${dir}${dir.includes("\\") ? "\\" : "/"}${name}`;
}

/**
 * The dev hat's actual work, as a real sandboxed subprocess.
 *
 * Attempt 1 writes the WRONG content — a genuine defect, not a flag saying "pretend this failed".
 * QA is told nothing about the attempt number; it finds out by reading the file.
 */
function createFileWritingImplementer(sandbox: SandboxToolPort, artifactPath: string): WorkImplementer {
  return {
    implement: async ({ attempt }) => {
      const content = attempt === 1 ? WRONG_CONTENT : APPROVED_CONTENT;
      const result = await sandbox.run({
        command: NODE,
        args: ["-e", WRITE_SCRIPT, artifactPath, content],
        timeoutMs: 10_000,
      });
      return {
        ok: result.ok && attempt > 1,
        detail: `attempt ${String(attempt)}: ${result.ok ? "artifact written" : `write failed (${result.reason})`}`,
      };
    },
  };
}

/** QA's verification: a separate process that reads the artifact and prints PASS or FAIL. */
function buildQaRequest(artifactPath: string) {
  return () => ({
    command: NODE,
    args: ["-e", VERIFY_SCRIPT, artifactPath, APPROVED_CONTENT],
    timeoutMs: 10_000,
  });
}

/** Read the artifact back through the same sandbox, so the assertion uses the org's own channel. */
async function readArtifact(sandbox: SandboxToolPort, artifactPath: string): Promise<string> {
  const result = await sandbox.run({ command: NODE, args: ["-e", READ_SCRIPT, artifactPath], timeoutMs: 10_000 });
  return result.ok ? result.stdout : `<unreadable:${result.reason}>`;
}

test("the org hierarchy implements REAL work: dev writes an artifact, QA verifies it, churn escalates, release is earned", async () => {
  const workspace = mkdtempSync(joinPath(tmpdir(), "org-real-work-"));
  const artifactPath = joinPath(workspace, "coupon.txt");
  const sandbox = createSubprocessSandbox();

  try {
    const events: { kind: string; actorHatId?: string | undefined; decision?: string | undefined }[] = [];
    let n = 0;

    const report = await runWorkOsCycle({
      organizationId: "org-real",
      projectId: "proj-real",
      initiativeId: "init-real",
      initiativeBranch: "initiative/coupon",
      hats: buildHatDefinitions(),
      baseTimeMs: Date.UTC(2026, 8, 3, 12, 0, 0),
      createId: (prefix) => `${prefix}-${String(++n).padStart(4, "0")}`,
      appendEvent: async (e) => {
        const r = e as unknown as Record<string, unknown>;
        events.push({
          kind: String(r["kind"]),
          actorHatId: r["actorHatId"] as string | undefined,
          decision: r["decision"] as string | undefined,
        });
      },
      // THE TWO REAL PORTS. Neither can be told what to conclude.
      implementer: createFileWritingImplementer(sandbox, artifactPath),
      qaExecutor: createSandboxTestExecutor(sandbox, buildQaRequest(artifactPath)),
    });

    // ── THE ARTIFACT ─────────────────────────────────────────────────────────
    // The assertion that separates this from every other org test: a file exists holding what the
    // organization set out to produce. Read from disk, not from the report — the report is the org's
    // account of itself, and an account is what the fixtures were already good at.
    equal(await readArtifact(sandbox, artifactPath), APPROVED_CONTENT);

    // ── THE WORK HAPPENED, MORE THAN ONCE ────────────────────────────────────
    ok(report.implementationAttempts > 1, `expected rework, got ${String(report.implementationAttempts)} attempt(s)`);
    equal(report.implementationSucceeded, true);

    // ── QA'S VERDICT CAME FROM THE PROCESS ───────────────────────────────────
    // Attempt 1 wrote the wrong content, so a real subprocess really did fail. Under the fixture
    // executor this assertion held by construction; here it holds because the file was wrong.
    ok(report.regressionsCaught > 0, "QA caught no regression, so it never judged the real artifact");

    // ── THE ESCALATION PATH RAN ON THAT REAL FAILURE ─────────────────────────
    equal(report.churnDetected, true);
    ok(report.agentsAddedViaRmo > 0, "churn did not pull additional agents through the RMO");
    equal(report.architectBroughtIn, true);

    // ── AND IT REACHED RELEASE ───────────────────────────────────────────────
    // `Done` is this loop's terminal state — the "released to main" transition the release manager
    // emits lands there. Asserting `Released` compiled to nothing here; tsc caught the guess.
    equal(report.finalState, WorkItemState.Done);

    // ── THE HIERARCHY IS STILL IN THE TRACE ──────────────────────────────────
    // Real execution must not have quietly bypassed the org.
    const actors = new Set(events.map((e) => e.actorHatId).filter((a): a is string => a !== undefined));
    ok(actors.has("backend_implementer"), "no event attributed to the implementing hat");
    ok(actors.has("qa_verifier"), "no event attributed to the QA hat");

    // Each implementation attempt is named in the trace, so a reader can see the rework.
    const attemptDecisions = events.filter((e) => (e.decision ?? "").startsWith("attempt "));
    equal(attemptDecisions.length, report.implementationAttempts);
    ok((attemptDecisions[0]?.decision ?? "").includes("attempt 1"), "the first attempt is not in the trace");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("QA fails honestly when the artifact was never produced — an absent file is not a pass", async () => {
  // The falsifier for the executor itself. If `createSandboxTestExecutor` defaulted an unreadable
  // result to Passed, an organization that implemented NOTHING would sail through QA to release —
  // precisely the failure this change exists to remove.
  const workspace = mkdtempSync(joinPath(tmpdir(), "org-no-work-"));
  const artifactPath = joinPath(workspace, "never-written.txt");

  try {
    const executor = createSandboxTestExecutor(createSubprocessSandbox(), buildQaRequest(artifactPath));
    const result = await executor.execute({ testCaseId: "tc-1" } as never, { initiativeBranch: "initiative/coupon" });

    equal(result.outcome, "failed");
    // …and the evidence names what the process actually said, so the failure is diagnosable.
    ok(result.evidence.length > 0, "a failing run produced no evidence");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("a sandbox that could not RUN the check is a failure, not a pass", async () => {
  // The branch the "absent file" test does NOT reach, and I only found that by mutating.
  //
  // Reading a missing file still RUNS: the process starts, prints "FAIL:<missing>", and exits 0 — so
  // it travels the `result.ok` path. Flipping the `!result.ok` default to Passed therefore killed
  // nothing, and the executor could have shipped treating every sandbox outage as a green test.
  //
  // "The check failed" and "the check never ran" are different facts. Both must be non-passing, and
  // only this test pins the second.
  //
  // The refusal is produced by the REAL adapter, not a stub: it rejects a non-absolute command path
  // because a relative one would resolve through PATH and could execute an unexpected binary.
  const executor = createSandboxTestExecutor(createSubprocessSandbox(), () => ({
    command: "node",
    args: ["-e", "process.stdout.write('PASS')"],
    timeoutMs: 10_000,
  }));

  const result = await executor.execute({ testCaseId: "tc-unrunnable" } as never, {
    initiativeBranch: "initiative/coupon",
  });

  equal(result.outcome, "failed");
  // The evidence must say the run was UNAVAILABLE rather than content-address a stdout that never
  // existed — otherwise an outage would be indistinguishable from a judged failure.
  ok(
    (result.evidence[0]?.ref ?? "").includes("unavailable:"),
    `expected an unavailable-marked evidence ref, got ${result.evidence[0]?.ref ?? "<none>"}`,
  );
});

test("the pass token is what the process prints, not what the caller wants", () => {
  // Guards the single line that decides every QA verdict.
  equal(QaPassToken, "PASS");
});
