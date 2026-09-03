#!/usr/bin/env bun
/**
 * loop-acting-probe.ts — the loop's ACTING path, run for real, end to end.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `loop-resilience-probe.ts` drives the real loop under injected failure, and every one of its ten
 * scenarios passes `--dry-run`. That is the right contract for a chaos harness — a probe that could
 * push or merge would become the incident it is testing for — but it leaves the half of the loop
 * that actually *does* something completely unexercised:
 *
 *   observe → choose → **execute** → sink → commit → **push**
 *
 * Nothing had ever run that. The unit tests inject a fake sink, the resilience probe declines to
 * act, and the only thing that had ever exercised a real acting tick was production.
 *
 * ── THE INVERSE CONTRACT, AND HOW IT IS ENFORCED ─────────────────────────────
 * This probe is the resilience probe's opposite: it EXECUTES, deliberately and with no `--dry-run`.
 * The safety property is not "does nothing" but "does it somewhere that cannot matter":
 *
 *   * it builds its own bare repository in a temp directory and clones it
 *   * the loop is spawned with `cwd` and `--repo-root` pointing at that clone
 *   * `assertDisposable` REFUSES to run against a checkout whose `origin` is not under the temp
 *     directory this process created — so pointing it at a real repo is an error, not a mistake
 *
 * The last one matters most. "Don't run this against the real repo" is a comment; a refusal that
 * reads the remote and compares it to a path minted this run is a check.
 *
 * ── WHAT IT PROVES ───────────────────────────────────────────────────────────
 * That a promoted lane completes the whole chain and the event reaches the REMOTE — not a local
 * commit, not a file on disk, but a ref on another repository. And that the two gates above it
 * change that outcome: a halt flag stops the push entirely, and a shadow window still records.
 *
 * Usage:
 *   bun src/Core.TypeScript/observe/loop-acting-probe.ts
 *   bun src/Core.TypeScript/observe/loop-acting-probe.ts --participant local-llm:qwen2.5:0.5b
 */

import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

/** A promotion window that passes every gate — the acting case. */
const CLEAN_WINDOW = JSON.stringify({
  shadowTicks: 105,
  shadowSoakHours: 25,
  illegalSelections: 0,
  divergenceRate: 0,
  primarySelectorRejections30m: 0,
  primaryControlBypassRejections30m: 0,
});

/** A window that has not soaked — the lane must stay in shadow. */
const UNSOAKED_WINDOW = JSON.stringify({
  shadowTicks: 3,
  shadowSoakHours: 0,
  illegalSelections: 0,
  divergenceRate: 0,
  primarySelectorRejections30m: 0,
  primaryControlBypassRejections30m: 0,
});

const git = (cwd: string, ...args: string[]): string => execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();

export interface ActingScenario {
  readonly name: string;
  /** What the loop is supposed to do. Behaviour, not log text. */
  readonly expectation: string;
  /** Files written into the clone before the run, relative to it. */
  readonly setup?: (clone: string) => Record<string, string>;
  readonly env: (clone: string) => Record<string, string>;
  readonly mustPrint: readonly string[];
  readonly mustNotPrint?: readonly string[];
  readonly expectExit: number;
  /** Whether an event must have reached the bare origin's `main`. */
  readonly expectEventOnOrigin: boolean;
}

export const ACTING_SCENARIOS: readonly ActingScenario[] = [
  {
    name: "promoted lane acts, and the event reaches the REMOTE",
    expectation:
      "the whole chain runs — observe, choose, execute, commit, push — and the event is on origin/main, not merely committed locally",
    env: (clone) => ({ ZETA_PROMOTION_WINDOW: join(clone, "window.json") }),
    setup: () => ({ "window.json": CLEAN_WINDOW }),
    mustPrint: ["[promotion-gate] primary", "[execute] OK"],
    mustNotPrint: ["[dry-run]"],
    expectExit: 0,
    expectEventOnOrigin: true,
  },
  {
    name: "an unsoaked lane stays in shadow and still RECORDS",
    expectation:
      "shadow withholds dispatch, not observation — the event still reaches the remote, because the soak window the gate reads is folded from exactly these ticks",
    env: (clone) => ({ ZETA_PROMOTION_WINDOW: join(clone, "window.json") }),
    setup: () => ({ "window.json": UNSOAKED_WINDOW }),
    mustPrint: ["[promotion-gate] shadow", "[execute] OK"],
    mustNotPrint: ["[promotion-gate] primary"],
    expectExit: 0,
    expectEventOnOrigin: true,
  },
  {
    name: "the e-stop stops an ACTING tick, not just a dry one",
    expectation:
      "a halt flag blocks the tick before anything is executed or pushed — the resilience probe can only show this for a dry run, where nothing would have been pushed anyway",
    env: (clone) => ({
      ZETA_PROMOTION_WINDOW: join(clone, "window.json"),
      ZETA_CONTROL_PLANE_FLAGS: join(clone, "flags.json"),
    }),
    setup: () => ({
      "window.json": CLEAN_WINDOW,
      "flags.json": JSON.stringify([
        { flag: "halt", setBy: "acting-probe", reason: "probing the e-stop against a real acting tick" },
      ]),
    }),
    mustPrint: ["HALTED"],
    mustNotPrint: ["[execute] OK"],
    expectExit: 0,
    expectEventOnOrigin: false,
  },
];

export interface ActingResult {
  readonly name: string;
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly output: string;
}

/**
 * REFUSE to act on anything but a repository this run created.
 *
 * The whole safety argument rests on the loop pushing to a bare repo in a temp directory. A comment
 * saying so protects nothing; this reads the clone's actual `origin` and compares it to the root
 * minted a few lines earlier, so a probe pointed at a real checkout stops instead of pushing to it.
 */
export function assertDisposable(clone: string, root: string): void {
  const origin = git(clone, "remote", "get-url", "origin");
  // CONTAINMENT, not a string prefix. The first version of this guard was
  // `resolve(origin).toLowerCase().startsWith(resolve(root).toLowerCase())`, which accepts
  // `/tmp/zeta-acting-XYZ-evil` for the root `/tmp/zeta-acting-XYZ` — the classic path-prefix hole,
  // and here it would mean pushing into a repository the probe did not create. Caught by the test
  // written for exactly that case, in the guard whose whole job is to be the last line of defence.
  //
  // `relative` answers the real question: a path inside `root` has a relative path that neither
  // escapes with `..` nor is absolute.
  const rel = relative(resolve(root), resolve(origin));
  if (rel.length === 0 || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(
      `refusing to act: ${clone} has origin ${origin}, which is outside the disposable root ${root}. This probe executes for real and may only ever do so against a repository it created.`,
    );
  }
}

/** Build a bare "origin" plus a clone, seeded with one commit on `main`. */
function makeDisposableRepo(root: string): { origin: string; clone: string } {
  const origin = join(root, "origin.git");
  const clone = join(root, "work");

  mkdirSync(origin, { recursive: true });
  git(origin, "init", "--bare", "--initial-branch=main");
  git(root, "clone", "--quiet", origin, clone);

  writeFileSync(join(clone, "README.md"), "disposable\n");
  mkdirSync(join(clone, "events"), { recursive: true });
  git(clone, "config", "user.name", "zeta-acting-probe");
  git(clone, "config", "user.email", "zeta-acting-probe@example.invalid");
  git(clone, "config", "commit.gpgsign", "false");
  git(clone, "add", "README.md");
  git(clone, "commit", "-q", "-m", "seed");
  git(clone, "push", "-q", "origin", "main");

  return { origin, clone };
}

/** Event files present on the bare origin's `main`. */
function eventsOnOrigin(origin: string): string[] {
  return git(origin, "ls-tree", "-r", "--name-only", "main")
    .split("\n")
    .filter((l) => l.startsWith("events/"));
}

export function runActingScenario(s: ActingScenario, repoRoot: string, participant: string): ActingResult {
  const root = mkdtempSync(join(tmpdir(), "zeta-acting-"));

  try {
    const { origin, clone } = makeDisposableRepo(root);
    assertDisposable(clone, root);

    for (const [rel, body] of Object.entries(s.setup?.(clone) ?? {})) {
      writeFileSync(join(clone, rel), body);
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      // No forge token reaches the child. A real acting tick must not be able to touch a forge, and
      // the loop's own diagnosis path is what handles the absence.
      GH_TOKEN: "",
      GITHUB_TOKEN: "",
      ZETA_PARTICIPANT: participant,
      // Default both to paths inside the clone, so a scenario that does not set them gets "absent"
      // rather than the real repository's control plane.
      ZETA_CONTROL_PLANE_FLAGS: join(clone, "no-such-flags.json"),
      ZETA_PROMOTION_WINDOW: join(clone, "no-such-window.json"),
      ...s.env(clone),
    };

    const proc = spawnSync(
      "bun",
      [
        join(repoRoot, "src", "Core.TypeScript", "observe", "run-loop-real.ts"),
        "--by",
        "zeta-acting-probe",
        "--event-dir",
        "events",
        "--repo-root",
        clone,
        "--participant",
        participant,
      ],
      { cwd: clone, env, encoding: "utf-8", timeout: 240_000 },
    );

    const output = `${proc.stdout ?? ""}\n${proc.stderr ?? ""}`;
    const failures: string[] = [];
    const exitCode = proc.status ?? -1;

    if (exitCode !== s.expectExit) failures.push(`exit ${String(exitCode)}, expected ${String(s.expectExit)}`);
    for (const want of s.mustPrint) if (!output.includes(want)) failures.push(`missing: ${want}`);
    for (const nope of s.mustNotPrint ?? []) if (output.includes(nope)) failures.push(`must not print: ${nope}`);

    // THE ASSERTION THIS PROBE EXISTS FOR: not what the loop said, but what reached another
    // repository. A tick that printed every expected line and pushed nothing has not acted.
    const landed = eventsOnOrigin(origin);
    if (s.expectEventOnOrigin && landed.length === 0) {
      failures.push("no event reached origin/main — the tick reported success without acting");
    }
    if (!s.expectEventOnOrigin && landed.length > 0) {
      failures.push(`an event reached origin/main despite the gate: ${landed.join(", ")}`);
    }

    return { name: s.name, passed: failures.length === 0, failures, output };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf("--participant");
  const participant = at >= 0 ? (argv[at + 1] ?? "oracle") : "oracle";
  const verbose = argv.includes("--verbose");
  const repoRoot = process.cwd();

  console.log(
    `loop-acting-probe: ${String(ACTING_SCENARIOS.length)} scenarios, participant=${participant}\n` +
      `  these ticks EXECUTE — against a disposable repo this process creates, never ${repoRoot}\n`,
  );

  const results = ACTING_SCENARIOS.map((s) => {
    const r = runActingScenario(s, repoRoot, participant);
    console.log(`${r.passed ? "  PASS" : "  FAIL"}  ${s.name}`);
    console.log(`        ${s.expectation}`);
    for (const f of r.failures) console.log(`        !! ${f}`);
    if (verbose || !r.passed) {
      for (const line of r.output
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .slice(0, 14)) {
        console.log(`        | ${line}`);
      }
    }
    return r;
  });

  const failed = results.filter((r) => !r.passed);
  console.log(
    `\n${String(results.length - failed.length)}/${String(results.length)} acting scenarios behaved as specified`,
  );
  if (failed.length > 0) {
    console.log("FAILED:");
    for (const f of failed) console.log(`  - ${f.name}`);
    process.exit(1);
  }
}
