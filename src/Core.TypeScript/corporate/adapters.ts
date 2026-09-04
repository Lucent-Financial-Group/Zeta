/**
 * corporate/adapters.ts — the concrete ends of the ports.
 *
 * ── TWO FAMILIES, AND THE LABEL IS THE WHOLE POINT ───────────────────────────
 * The `simulated*` adapters are what the register did all along: an inbound fixture, a work item
 * that completes by being marked complete, planned test outcomes, a change that merges because
 * nothing stopped it. Nothing about that behaviour changes here. What changes is that it now SAYS
 * it is a simulation, so a report can tell a run that shipped something from a run that decided it
 * had.
 *
 * The `real*` adapters actually reach: a directory of inbound events, a shell command whose exit
 * code decides the outcome, a git branch and merge. They are constructed explicitly and are never a
 * default — see `providers.ts` on why `resolve` refuses rather than falling back.
 *
 * ── THE COMMAND ADAPTER IS A REAL CAPABILITY ─────────────────────────────────
 * `commandWorkExecutor` runs a process. That is the point — it is how an organization builds
 * anything — and it is also the sharpest edge in this file, so:
 *
 *   - the command is supplied by the CALLER. There is no default command, no shell string
 *     interpolation of work titles, and no way for a work item's content to become the command.
 *   - arguments are passed as an ARRAY, never a shell line, so nothing in a work item can inject a
 *     second command.
 *   - the exit code decides success. Not stdout, not the absence of stderr — a build that prints
 *     "error" and exits 0 succeeded, and one that prints nothing and exits 1 did not.
 *   - stdout and stderr are captured as evidence, truncated, and the truncation is visible.
 *
 * ── EVERY ADAPTER RETURNS A RESULT ───────────────────────────────────────────
 * A provider that throws takes the organization down with it; one that swallows its error reports
 * success it did not have. Both are refusals here, with the reason carried out.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Fidelity, Port, type ChangeControlPort, type IntakeSource, type PortResult, type TestRunner, type WorkExecutor, type WorkOutcome } from "./providers";
import { RunOutcome, type TestCase } from "./qa";
import type { ExternalEvent } from "./intake";
import type { CascadeNode } from "./goal-cascade";

// ─── Simulated: what the register already did, now labelled ─────────────────

/** Inbound events handed over as a fixture. Exactly the previous behaviour, said out loud. */
export function simulatedIntake(events: readonly ExternalEvent[], name = "fixture"): IntakeSource {
  return {
    meta: {
      port: Port.Intake,
      name,
      fidelity: Fidelity.Simulated,
      describes: `${events.length} fixed inbound event(s)`,
    },
    poll: async () => ({ ok: true, value: events, evidence: [{ kind: "document", ref: `fixture:${String(events.length)}` }] }),
  };
}

/**
 * Work that completes by being marked complete.
 *
 * `succeeds` is REQUIRED rather than defaulted to true: a simulation whose default is success turns
 * "nobody decided what this should do" into a green, which is the same defect `createPlannedExecutor`
 * already refuses for tests.
 */
export function simulatedWorkExecutor(succeeds: boolean, name = "assumed"): WorkExecutor {
  return {
    meta: {
      port: Port.WorkExecution,
      name,
      fidelity: Fidelity.Simulated,
      describes: `assumes every work item ${succeeds ? "succeeds" : "fails"}; performs nothing`,
    },
    execute: async (node) => ({
      ok: true,
      value: {
        workId: node.workId,
        succeeded: succeeds,
        artifacts: [],
        summary: `assumed ${succeeds ? "complete" : "failed"} — no work was performed`,
      },
      evidence: [{ kind: "trace", ref: `assumed:${node.workId}:${succeeds ? "ok" : "failed"}` }],
    }),
  };
}

/** Planned test outcomes. The `TestExecutor` behaviour `qa.ts` already had, behind the port. */
export function simulatedTestRunner(
  plan: ReadonlyMap<string, RunOutcome>,
  fallback: RunOutcome,
  name = "planned",
): TestRunner {
  return {
    meta: {
      port: Port.TestExecution,
      name,
      fidelity: Fidelity.Simulated,
      describes: `${plan.size} planned outcome(s), falling back to '${fallback}'`,
    },
    run: async (testCase: TestCase) => {
      const outcome = plan.get(testCase.testCaseId) ?? fallback;
      return {
        ok: true,
        value: { outcome },
        evidence: [{ kind: "trace", ref: `planned:${testCase.testCaseId}:${outcome}` }],
      };
    },
  };
}

/** A change that opens and merges because nothing stopped it. */
export function simulatedChangeControl(name = "in-memory"): ChangeControlPort {
  return {
    meta: {
      port: Port.ChangeControl,
      name,
      fidelity: Fidelity.Simulated,
      describes: "opens and merges changes in memory; touches no repository",
    },
    open: async (node, ctx) => ({
      ok: true,
      value: { changeId: `change-${node.workId}`, branch: ctx.branch },
      evidence: [{ kind: "trace", ref: `opened:${node.workId}` }],
    }),
    merge: async (handle) => ({
      ok: true,
      value: handle,
      evidence: [{ kind: "trace", ref: `merged:${handle.changeId}` }],
    }),
  };
}

// ─── Real: adapters that actually reach ─────────────────────────────────────

/**
 * The inbox's reading order: `.json` files only, ordinal ascending.
 *
 * Extracted and exported rather than inlined at the `readdirSync` call because otherwise it is
 * UNFALSIFIABLE. Most filesystems already hand back entries in alphabetical order, so a test that
 * writes files and reads them through the adapter passes identically whether the sort is there or
 * not — a check that cannot fail. Here the ordering is a function over a list, and a list can be
 * handed over backwards.
 *
 * Ordinal, per `.claude/rules/culture-invariant-by-default.md`: JavaScript's default array sort
 * compares UTF-16 code units, and `localeCompare` would make the run's event order depend on the
 * machine's locale.
 */
export function inboxOrder(entries: readonly string[]): readonly string[] {
  // No defensive copy: `filter` already returns a new array, so the caller's listing is untouched.
  // Spreading first would be a copy that cannot be observed — the vacuity class, in one line.
  return entries.filter((e) => e.endsWith(".json")).sort();
}

/**
 * Inbound events read from a directory of JSON files.
 *
 * Real I/O, and the least dangerous kind: it reads. A file that is not valid JSON, or does not look
 * like an `ExternalEvent`, is REFUSED with its path — dropping it would make a malformed ticket
 * indistinguishable from no ticket, and the queue would be quietly short.
 *
 * A missing directory is an EMPTY poll rather than an error: an inbox nobody has written to is a
 * normal state.
 */
export function directoryIntake(dir: string, name = "directory"): IntakeSource {
  return {
    meta: {
      port: Port.Intake,
      name,
      fidelity: Fidelity.Real,
      describes: `reads inbound events from ${dir}`,
    },
    poll: async () => {
      if (!existsSync(dir)) return { ok: true, value: [], evidence: [{ kind: "document", ref: `empty:${dir}` }] };
      const events: ExternalEvent[] = [];
      const refs: string[] = [];
      for (const entry of inboxOrder(readdirSync(dir))) {
        const path = join(dir, entry);
        let parsed: unknown;
        try {
          parsed = JSON.parse(readFileSync(path, "utf-8"));
        } catch (err) {
          return { ok: false, reason: `${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}` };
        }
        const shaped = parsed as Partial<ExternalEvent>;
        // Shape-checked here rather than trusted: `intake.normalize` will refuse a malformed event
        // anyway, but its refusal would name a field, not the FILE, and a directory of tickets needs
        // to say which one is broken.
        if (typeof shaped.source !== "string" || typeof shaped.externalId !== "string" || typeof shaped.title !== "string") {
          return { ok: false, reason: `${path} is missing source, externalId or title` };
        }
        events.push(shaped as ExternalEvent);
        refs.push(path);
      }
      return { ok: true, value: events, evidence: refs.map((ref) => ({ kind: "document" as const, ref })) };
    },
  };
}

/** How much of a command's output is kept as evidence before it is truncated. */
export const MAX_CAPTURED_OUTPUT = 4_000;

function capture(label: string, text: string): string {
  if (text.length <= MAX_CAPTURED_OUTPUT) return `${label}:${text}`;
  // Truncation is VISIBLE. Silently clipping evidence makes a long failure look like a short one.
  return `${label}:${text.slice(0, MAX_CAPTURED_OUTPUT)}…[truncated ${String(text.length - MAX_CAPTURED_OUTPUT)} chars]`;
}

/**
 * Work performed by running a command.
 *
 * The command and its arguments come from the CALLER as an array — never a shell line, and never
 * built from a work item's own text. A work item is untrusted input to this process: it arrives
 * from intake, which may be a directory somebody else writes to, so letting its title reach a shell
 * would be a command-injection seam wearing an org chart.
 *
 * `argsFor` may use the node to choose ARGUMENTS (a path, an id). Those are passed as separate
 * argv entries, so a title containing `; rm -rf /` is one argument called `; rm -rf /` and not a
 * second command.
 */
export function commandWorkExecutor(input: {
  readonly command: string;
  readonly argsFor: (node: CascadeNode) => readonly string[];
  readonly cwd: string;
  readonly timeoutMs?: number;
  readonly name?: string;
}): WorkExecutor {
  return {
    meta: {
      port: Port.WorkExecution,
      name: input.name ?? "command",
      fidelity: Fidelity.Real,
      describes: `runs '${input.command}' in ${input.cwd}`,
    },
    execute: async (node): Promise<PortResult<WorkOutcome>> => {
      const args = [...input.argsFor(node)];
      const run = spawnSync(input.command, args, {
        cwd: input.cwd,
        encoding: "utf-8",
        timeout: input.timeoutMs ?? 120_000,
        // No shell. The whole safety argument above depends on this line.
        shell: false,
      });
      if (run.error !== undefined) {
        return { ok: false, reason: `'${input.command}' could not run: ${run.error.message}` };
      }
      // THE EXIT CODE DECIDES. Not stdout, not the presence of the word "error": a build that
      // prints warnings and exits 0 succeeded, and a silent one that exits 1 did not.
      const succeeded = run.status === 0;
      return {
        ok: true,
        value: {
          workId: node.workId,
          succeeded,
          artifacts: args,
          summary: `${input.command} exited ${String(run.status)}`,
        },
        evidence: [
          { kind: "trace", ref: `exit:${String(run.status)}` },
          { kind: "log", ref: capture("stdout", run.stdout ?? "") },
          { kind: "log", ref: capture("stderr", run.stderr ?? "") },
        ],
      };
    },
  };
}

/**
 * Tests run by a command, one invocation per case.
 *
 * Same rules as the work executor: no shell, arguments as an array, exit code decides. A non-zero
 * exit is `Failed` rather than an error — a failing test is a RESULT, and reporting it as a broken
 * runner would hide the thing the suite exists to find.
 */
export function commandTestRunner(input: {
  readonly command: string;
  readonly argsFor: (testCase: TestCase) => readonly string[];
  readonly cwd: string;
  readonly timeoutMs?: number;
  readonly name?: string;
}): TestRunner {
  return {
    meta: {
      port: Port.TestExecution,
      name: input.name ?? "command",
      fidelity: Fidelity.Real,
      describes: `runs '${input.command}' per test case in ${input.cwd}`,
    },
    run: async (testCase) => {
      const run = spawnSync(input.command, [...input.argsFor(testCase)], {
        cwd: input.cwd,
        encoding: "utf-8",
        timeout: input.timeoutMs ?? 120_000,
        shell: false,
      });
      if (run.error !== undefined) {
        // The RUNNER broke, which is not the same as the test failing. Reporting this as `Failed`
        // would blame the code for a missing binary.
        return { ok: false, reason: `'${input.command}' could not run: ${run.error.message}` };
      }
      return {
        ok: true,
        value: { outcome: run.status === 0 ? RunOutcome.Passed : RunOutcome.Failed },
        evidence: [
          { kind: "trace", ref: `exit:${String(run.status)}` },
          { kind: "log", ref: capture("stdout", run.stdout ?? "") },
        ],
      };
    },
  };
}

/**
 * Changes as real git branches.
 *
 * `open` creates a branch; `merge` merges it back. Both refuse on a non-zero exit rather than
 * reporting a merge that did not happen — the one thing change control cannot do is claim a merge.
 *
 * MERGE IS `--no-ff` ON PURPOSE: a fast-forward leaves no record that a change existed, and this
 * port's whole job is that the record and the repository agree.
 */
export function gitChangeControl(input: {
  readonly cwd: string;
  readonly baseBranch: string;
  readonly name?: string;
}): ChangeControlPort {
  const git = (args: readonly string[]) =>
    spawnSync("git", [...args], { cwd: input.cwd, encoding: "utf-8", shell: false });
  return {
    meta: {
      port: Port.ChangeControl,
      name: input.name ?? "git",
      fidelity: Fidelity.Real,
      describes: `branches from ${input.baseBranch} in ${input.cwd}`,
    },
    open: async (node, ctx) => {
      const made = git(["checkout", "-b", ctx.branch, input.baseBranch]);
      if (made.error !== undefined) return { ok: false, reason: `git could not run: ${made.error.message}` };
      if (made.status !== 0) return { ok: false, reason: `could not branch ${ctx.branch}: ${(made.stderr ?? "").trim()}` };
      return {
        ok: true,
        value: { changeId: `${ctx.branch}@${node.workId}`, branch: ctx.branch },
        evidence: [{ kind: "trace", ref: `branch:${ctx.branch}` }],
      };
    },
    merge: async (handle) => {
      const back = git(["checkout", input.baseBranch]);
      if (back.status !== 0) return { ok: false, reason: `could not return to ${input.baseBranch}: ${(back.stderr ?? "").trim()}` };
      const merged = git(["merge", "--no-ff", "-m", `merge ${handle.changeId}`, handle.branch]);
      if (merged.error !== undefined) return { ok: false, reason: `git could not run: ${merged.error.message}` };
      if (merged.status !== 0) {
        return { ok: false, reason: `merge of ${handle.branch} refused: ${(merged.stderr ?? "").trim()}` };
      }
      return { ok: true, value: handle, evidence: [{ kind: "trace", ref: `merged:${handle.branch}` }] };
    },
  };
}

/**
 * The set the register has always used, now nameable and labelled.
 *
 * Every port simulated, so a run built from these is replayable — which `fidelityOf` will say
 * rather than the caller having to remember.
 */
export function simulatedProviders(input: {
  readonly events: readonly ExternalEvent[];
  readonly workSucceeds: boolean;
  readonly testPlan?: ReadonlyMap<string, RunOutcome>;
  readonly testFallback: RunOutcome;
}) {
  return [
    simulatedIntake(input.events),
    simulatedWorkExecutor(input.workSucceeds),
    simulatedTestRunner(input.testPlan ?? new Map(), input.testFallback),
    simulatedChangeControl(),
  ] as const;
}
