// smt2-solvers.ts — the shared solver harness every `tools/Z3Verify/*.smt2` runner uses.
//
// WHY THIS EXISTS
// ---------------
// Work-item 081KZYYKHX1087G0R0036E9RH9: every pre-existing `.smt2` runner in this repo
// asserted that ALL queries return `unsat`. An `unsat` expectation is satisfied by a
// TAUTOLOGY — if a lemma's premises secretly contain its conclusion, negating that
// conclusion is trivially unsatisfiable and the runner goes green, reporting a *proof*
// where there is only a *restatement*. So no runner could catch a vacuous lemma, which
// is the one failure this lane exists to prevent. (Live instance: the landauer floor
// lemma, fixed in #10494 — its second-law premise WAS its conclusion.)
//
// The fix pattern, from `landauer-floor-lemma.test.ts` (the reference implementation):
// assert the VERDICT SEQUENCE, not a uniform verdict, and require that the sequence
// contain at least one `sat` produced by a NON-VACUITY PROBE — a query that is
// satisfiable iff the lemma is not a tautology. Cross-check with z3 AND cvc5 (BP-16).
//
// This module carries only the mechanism. Each lemma's expected sequence, its probe,
// and its falsifier live in that lemma's own `*.test.ts` next to it.
//
// SOLVER TIMEOUTS. Every query carries an explicit solver-side limit and a process-side
// limit, both below bun's 20s per-test cap (bunfig.toml). A solver that grinds must
// report `unknown`/`timeout` — which fails the sequence assertion loudly — rather than
// hanging the CI job. cvc5 genuinely does grind on one file here (see
// `light-time-endpoint-speed-envelope.test.ts`); that is recorded, not hidden.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** A single `(check-sat)` outcome, as the solver prints it. */
export type Verdict = "sat" | "unsat" | "unknown";

const SOLVER_SECONDS = 10;
const PROCESS_TIMEOUT_MS = 15_000;

function probeBinary(bin: string): boolean {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- fixed literal, no user input
  const probe = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: PROCESS_TIMEOUT_MS });
  return probe.status === 0;
}

/** z3 on PATH? Probed once per process, same shape as gen-smt2-from-ir.test.ts. */
export const z3Available: boolean = probeBinary("z3");

/** cvc5 on PATH? */
export const cvc5Available: boolean = probeBinary("cvc5");

function verdictsOf(cmd: string, args: readonly string[], input: string): Verdict[] {
  const r = spawnSync(cmd, [...args], {
    input,
    encoding: "utf8",
    timeout: PROCESS_TIMEOUT_MS,
  });
  return (r.stdout ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l): l is Verdict => l === "sat" || l === "unsat" || l === "unknown");
}

/** Run z3 over proof TEXT (stdin, never a file path) and return the verdict sequence. */
export function z3Verdicts(smt2: string): Verdict[] {
  return verdictsOf("z3", ["-in", `-T:${SOLVER_SECONDS}`], smt2);
}

/** Run cvc5 over proof TEXT and return the verdict sequence. */
export function cvc5Verdicts(smt2: string): Verdict[] {
  // `--incremental` is required: every lemma file here uses (push)/(pop) scoping.
  // `--produce-models` is required too: several files call (get-model) on their
  // non-vacuity probes, and without the flag cvc5 emits
  //   (error "cannot get model unless model generation is enabled")
  // — CHECKED against cvc5 1.3.4, not inferred.
  return verdictsOf(
    "cvc5",
    ["--lang=smt2", "-q", "--incremental", "--produce-models", `--tlimit=${SOLVER_SECONDS * 1000}`, "-"],
    smt2,
  );
}

/** Read a lemma file from this directory. */
export function readLemma(fileName: string): string {
  return readFileSync(join(import.meta.dir, fileName), "utf8");
}

/**
 * Structural facts a runner can assert without a solver: scope balance and query count.
 *
 * Comments are stripped first, and commands are counted ANYWHERE on a line rather than only
 * at line start — light-time-endpoint-speed-envelope.smt2 writes four of its blocks as a
 * single line (`(push 1) (assert base) ... (check-sat) (pop 1)`), and a line-anchored count
 * silently under-reported it 7 instead of 11. A structural check that miscounts is the same
 * defect class as a verdict check that cannot fail.
 */
export function structureOf(text: string): { pushes: number; pops: number; checks: number } {
  const code = text
    .split(/\r?\n/)
    .map((line) => line.replace(/;.*$/, ""))
    .join("\n");
  return {
    pushes: (code.match(/\(push\b/g) ?? []).length,
    pops: (code.match(/\(pop\b/g) ?? []).length,
    checks: (code.match(/\(check-sat\b/g) ?? []).length,
  };
}

/**
 * Plant a tautology / apply a mutation to lemma text.
 *
 * The falsifier proof. `find` must occur EXACTLY ONCE — a mutation that silently
 * matched nothing would make the falsifier leg pass without mutating anything, which is
 * the same class of defect this whole work-item is about, one level up.
 */
export function mutate(text: string, find: string, replace: string): string {
  const occurrences = text.split(find).length - 1;
  if (occurrences !== 1) {
    throw new Error(`mutate: anchor must occur exactly once, found ${occurrences} for ${JSON.stringify(find)}`);
  }
  return text.replace(find, replace);
}
