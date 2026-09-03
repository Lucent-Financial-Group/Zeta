/**
 * qa-sandbox-executor.ts — the REAL `TestExecutor`, backed by the sandbox port.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `TestExecutor` in `qa.ts` documents itself as *"the execution port — the real runner is
 * computer-use / browser / API; tests use a fake."* Until now `createDeterministicExecutor` was its
 * **only** implementation anywhere in the tree, and `runWorkOsCycle` hardcoded it.
 *
 * So the org could staff a work item through the whole hierarchy — Executive Board → C-suite →
 * Directors → Management → ICs — advance it through every quality gate, catch "regressions",
 * escalate on churn, pull in more agents through the RMO, and release it, **without a single line of
 * work being done or a single assertion being checked**. Every QA verdict came from a fixture map.
 *
 * This executor runs each test case as a real, bounded subprocess through the existing
 * `SandboxToolPort` (env-stripped, timeout-killed, adapter at the composition root) and derives the
 * outcome from what the process actually did.
 *
 * ── WHAT MAKES THE VERDICT HONEST ────────────────────────────────────────────
 * The outcome is read from the process, never from the caller:
 *
 *   exit ok + stdout ends with PASS   → Passed
 *   exit ok + anything else           → Failed   (a run that did not say it passed did not pass)
 *   sandbox refused / timed out       → Failed, with the refusal carried in the evidence
 *
 * The default for an unrecognised result is **Failed**, deliberately. A QA executor whose unknown
 * case is "passed" would turn every sandbox outage into a green release — the exact shape of a check
 * that cannot fail.
 *
 * ── EVIDENCE IS CONTENT-ADDRESSED ────────────────────────────────────────────
 * The evidence ref is a sha256 over the process's own stdout, so it names *what actually happened*
 * rather than that something happened. Two runs that produced different output cannot share a ref,
 * which is what lets a reviewer tell a genuine re-verification from a replayed claim.
 */

import { createHash } from "node:crypto";
import { TestRunOutcome, type EvidenceRef, type TestCase } from "../../domain/src/index.ts";
import type { TestExecutor } from "./qa.ts";
import type { SandboxToolPort, SandboxToolRequest } from "./sandbox-tool.ts";

/** Prefix for evidence produced by a real sandboxed QA run. */
export const QaSandboxEvidencePrefix = "qa-sandbox:sha256:";

/**
 * Builds the invocation that verifies ONE test case.
 *
 * Injected rather than fixed: what "verify this case" means is the caller's domain (a browser
 * driver, an API probe, a repo-local assertion), and this module's job is to run it honestly and
 * read the result — not to decide what verification is.
 */
export type QaToolRequestBuilder = (input: {
  testCase: TestCase;
  initiativeBranch: string;
}) => SandboxToolRequest;

/** The token a verification tool prints to claim success. Anything else is a failure. */
export const QaPassToken = "PASS";

function evidenceFor(stdout: string): EvidenceRef {
  const digest = createHash("sha256").update(stdout).digest("hex");
  return { kind: "trace", ref: `${QaSandboxEvidencePrefix}${digest}` };
}

/**
 * A `TestExecutor` that runs each case as a real subprocess.
 *
 * Note what is NOT here: any way for the caller to say what the outcome should be. That is the
 * whole difference from `createDeterministicExecutor`, which takes the answer as an argument.
 */
export function createSandboxTestExecutor(
  sandbox: SandboxToolPort,
  buildRequest: QaToolRequestBuilder,
): TestExecutor {
  return {
    async execute(testCase, ctx) {
      const result = await sandbox.run(buildRequest({ testCase, initiativeBranch: ctx.initiativeBranch }));

      if (!result.ok) {
        // The sandbox refused or the process died. That is NOT a passing test, and the reason is
        // carried so a reader can tell "the check failed" from "the check never ran" — two facts
        // that a bare `Failed` would collapse.
        return {
          outcome: TestRunOutcome.Failed,
          evidence: [{ kind: "trace", ref: `${QaSandboxEvidencePrefix}unavailable:${result.reason}` }],
        };
      }

      const passed = result.stdout.trim().endsWith(QaPassToken);
      return {
        outcome: passed ? TestRunOutcome.Passed : TestRunOutcome.Failed,
        evidence: [evidenceFor(result.stdout)],
      };
    },
  };
}
