#!/usr/bin/env bun
/**
 * observe/loop-resilience-probe.ts — inject each failure the loop is supposed to survive, and check
 * that it actually does.
 *
 * ── WHY A PROBE AND NOT MORE UNIT TESTS ──────────────────────────────────────
 * Every guard the loop consults has unit tests, and `run-loop-gate-wiring.test.ts` pins that
 * `main()` still routes through them. Neither answers the question an operator actually has:
 *
 *   *when this thing breaks, what does the loop DO?*
 *
 * A unit test drives one function with a hand-made failure. This drives the REAL `run-loop-real.ts`,
 * as a subprocess, with the failure injected the way it would really arrive — a flag file on disk, a
 * corrupt window, a dead daemon, a bad token — and asserts on what the loop printed and the exit
 * code it returned. That is the difference between "the halt function halts" and "the loop halted".
 *
 * ── WHAT IT REFUSES TO DO ────────────────────────────────────────────────────
 * Every scenario runs `--dry-run`. A resilience probe that could push, merge, or write to the event
 * log would be a chaos harness with side effects, and the first person to run it on a live checkout
 * would find out the hard way. The one thing this must never do is become the incident it is
 * testing for.
 *
 * ── READING A RESULT ─────────────────────────────────────────────────────────
 * Each scenario states the expected BEHAVIOUR, not the expected text of a log line. Where a
 * substring is matched it is a substring the loop deliberately prints as its answer — `HALTED`,
 * `promotion-gate`, `auth-failure` — not incidental wording.
 *
 * Usage:
 *   bun src/Core.TypeScript/observe/loop-resilience-probe.ts
 *   bun src/Core.TypeScript/observe/loop-resilience-probe.ts --participant local-llm:qwen2.5:0.5b
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Scenario {
  readonly name: string;
  /** What the loop is supposed to do. Stated in behaviour, not in log text. */
  readonly expectation: string;
  /** Environment the failure is injected through. */
  readonly env: (dir: string) => Record<string, string>;
  /** Files the scenario writes before the run. */
  readonly setup?: (dir: string) => void;
  /** Substrings the loop must print. Each is an answer the loop deliberately gives. */
  readonly mustPrint: readonly string[];
  /** Substrings the loop must NOT print. */
  readonly mustNotPrint?: readonly string[];
  /**
   * Pass this as `--participant` instead of the probe's default.
   *
   * Needed because the CLI flag WINS over `ZETA_PARTICIPANT`: the "unknown participant" scenario
   * set the env, the flag overrode it, and the loop fell back to the oracle by a different route
   * entirely — a scenario that passed for the wrong reason until it didn't.
   */
  readonly participantOverride?: string;
  readonly expectExit: number;
}

const FLAGS = "flags.json";
const WINDOW = "window.json";

/** A promotion window that passes every gate. */
const CLEAN_WINDOW = JSON.stringify({
  shadowTicks: 105,
  shadowSoakHours: 25,
  illegalSelections: 0,
  divergenceRate: 0,
  primarySelectorRejections30m: 0,
  primaryControlBypassRejections30m: 0,
});

export const SCENARIOS: readonly Scenario[] = [
  {
    name: "baseline",
    expectation: "with nothing broken, the loop completes a dry tick and reports its gate",
    env: () => ({}),
    mustPrint: ["[promotion-gate]", "[dry-run] would execute"],
    expectExit: 0,
  },
  {
    name: "e-stop raised",
    expectation:
      "an operator's halt flag stops the loop ACTING; a dry run still reports, because observing is not gated",
    setup: (dir) =>
      writeFileSync(
        join(dir, FLAGS),
        JSON.stringify([
          { kind: "estop", reason: "operator pulled the cord", setBy: "max", scope: { kind: "organization" } },
        ]),
      ),
    env: (dir) => ({ ZETA_CONTROL_PLANE_FLAGS: join(dir, FLAGS) }),
    mustPrint: ["HALTED", "operator pulled the cord"],
    expectExit: 0,
  },
  {
    name: "control-plane flags CORRUPT",
    expectation:
      'an unreadable flags file HALTS — "could not tell" is not permission, so a truncated file must not read as "nobody halted us"',
    setup: (dir) => writeFileSync(join(dir, FLAGS), "[{ truncated"),
    env: (dir) => ({ ZETA_CONTROL_PLANE_FLAGS: join(dir, FLAGS) }),
    mustPrint: ["HALTED", "could not be read"],
    expectExit: 0,
  },
  {
    name: "promotion window CORRUPT",
    expectation: "a window that cannot be parsed resolves to shadow, never to primary",
    setup: (dir) => writeFileSync(join(dir, WINDOW), "{ not json"),
    env: (dir) => ({ ZETA_PROMOTION_WINDOW: join(dir, WINDOW) }),
    mustPrint: ["[promotion-gate] shadow", "window_unreadable"],
    mustNotPrint: ["[promotion-gate] primary"],
    expectExit: 0,
  },
  {
    name: "promotion window with a NaN counter",
    expectation:
      "a non-finite counter resolves to shadow — every comparison against NaN is false, so an unvalidated gate would read it as clean",
    setup: (dir) =>
      writeFileSync(
        join(dir, WINDOW),
        '{"shadowTicks":105,"shadowSoakHours":25,"illegalSelections":0,"divergenceRate":null,"primarySelectorRejections30m":0,"primaryControlBypassRejections30m":0}',
      ),
    env: (dir) => ({ ZETA_PROMOTION_WINDOW: join(dir, WINDOW) }),
    mustPrint: ["[promotion-gate] shadow"],
    mustNotPrint: ["[promotion-gate] primary"],
    expectExit: 0,
  },
  {
    name: "promotion window CLEAN",
    expectation: "a soaked, non-diverging window promotes — the gate is satisfiable, not merely safe",
    setup: (dir) => writeFileSync(join(dir, WINDOW), CLEAN_WINDOW),
    env: (dir) => ({ ZETA_PROMOTION_WINDOW: join(dir, WINDOW) }),
    mustPrint: ["[promotion-gate] primary", "promoted"],
    expectExit: 0,
  },
  {
    name: "forge token INVALID",
    expectation:
      "a bad token is diagnosed by kind and named as not-retryable; the loop continues WITHOUT PR state rather than reading a failure as zero PRs",
    env: () => ({ GH_TOKEN: "ghp_this_token_is_not_real_and_will_401" }),
    mustPrint: ["[forge]", "continuing WITHOUT PR state"],
    mustNotPrint: ["[object Object]"],
    expectExit: 0,
  },
  {
    name: "no forge at all",
    expectation: "with no token the loop still completes a tick — a forge outage is not a loop outage",
    env: () => ({ GH_TOKEN: "", GITHUB_TOKEN: "" }),
    mustPrint: ["[dry-run] would execute"],
    mustNotPrint: ["[object Object]"],
    expectExit: 0,
  },
  {
    name: "local model DAEMON DOWN",
    expectation:
      "a dead ollama does not abort the tick: the participant degrades to the deterministic oracle and the loop still picks and reports",
    env: () => ({ ZETA_PARTICIPANT: "local-llm:qwen2.5:0.5b", ZETA_OLLAMA_HOST: "http://127.0.0.1:59999" }),
    mustPrint: ["[observe]", "[dry-run] would execute"],
    expectExit: 0,
  },
  {
    name: "unknown participant spec",
    expectation: "an unrecognised participant falls back to the oracle with a warning, rather than crashing the tick",
    env: () => ({}),
    participantOverride: "not-a-real-participant",
    mustPrint: ["falling back to oracle", "[dry-run] would execute"],
    expectExit: 0,
  },
];

export interface ScenarioResult {
  readonly name: string;
  readonly passed: boolean;
  readonly exitCode: number;
  readonly failures: readonly string[];
  readonly output: string;
}

export function runScenario(s: Scenario, repoRoot: string, participant: string): ScenarioResult {
  const dir = mkdtempSync(join(tmpdir(), "zeta-resilience-"));
  try {
    mkdirSync(dir, { recursive: true });
    s.setup?.(dir);

    // A marker file that EXISTS means the first-session credential adventure is complete, so the
    // loop reaches ordinary work instead of leading with cred setup in every scenario.
    const marker = join(dir, "first-session.done");
    writeFileSync(marker, "");

    const run = spawnSync(
      "bun",
      [
        "src/Core.TypeScript/observe/run-loop-real.ts",
        "--dry-run",
        "--participant",
        s.participantOverride ?? participant,
        "--by",
        "resilience",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 180_000,
        env: {
          ...process.env,
          ZETA_FIRST_SESSION_MARKER: marker,
          ...s.env(dir),
        },
      },
    );

    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    const failures: string[] = [];
    const exitCode = run.status ?? -1;

    if (exitCode !== s.expectExit) failures.push(`exit ${String(exitCode)}, expected ${String(s.expectExit)}`);
    for (const want of s.mustPrint) if (!output.includes(want)) failures.push(`missing: ${want}`);
    for (const nope of s.mustNotPrint ?? [])
      if (output.includes(nope)) failures.push(`present but must not be: ${nope}`);

    return { name: s.name, passed: failures.length === 0, exitCode, failures, output };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf("--participant");
  const participant = at >= 0 ? (argv[at + 1] ?? "oracle") : "oracle";
  const verbose = argv.includes("--verbose");
  const repoRoot = process.cwd();

  console.log(`loop-resilience-probe: ${String(SCENARIOS.length)} scenarios, participant=${participant}\n`);

  const results: ScenarioResult[] = [];
  for (const s of SCENARIOS) {
    const r = runScenario(s, repoRoot, participant);
    results.push(r);
    console.log(`${r.passed ? "  PASS" : "  FAIL"}  ${s.name}`);
    console.log(`        ${s.expectation}`);
    for (const f of r.failures) console.log(`        !! ${f}`);
    if (verbose || !r.passed) {
      for (const line of r.output
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .slice(0, 12)) {
        console.log(`        | ${line}`);
      }
    }
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${String(results.length - failed.length)}/${String(results.length)} scenarios behaved as specified`);
  if (failed.length > 0) {
    console.log("FAILED:");
    for (const f of failed) console.log(`  - ${f.name}`);
    process.exit(1);
  }
}
