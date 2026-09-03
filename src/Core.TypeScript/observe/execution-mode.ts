/**
 * observe/execution-mode.ts — the promotion gate's grip on the loop's actual dispatch.
 *
 * `enforcement/promotion-gate.ts` decides shadow vs primary and stays pure. This is where that
 * decision becomes a difference the world can notice: in shadow, the loop still observes, builds
 * the menu, chooses and records — and the command is NOT dispatched.
 *
 * ── WHY THE SHADOW EXECUTOR REPORTS `ok: true` ───────────────────────────────
 * Shadow mode is not a failure mode. The lane is working exactly as intended; it simply has not
 * earned dispatch yet. Returning a refusal would make every shadow tick look like a broken tick and
 * would poison the very divergence rate the gate reads to decide whether to promote — the gate
 * would then be reading its own suppression as evidence against promotion, and no lane could ever
 * soak its way out of shadow. The outcome carries an explicit `[shadow]` marker instead.
 *
 * ── WHY IT REPORTS TIER `fake` ───────────────────────────────────────────────
 * Same rule the room sandbox follows: never misdescribe where work ran. Nothing ran. Reporting the
 * real executor's tier would tell the glass-halo audit that a shell executed when none did, which is
 * a worse lie than the one it would be hiding.
 */

import { readFileSync } from "node:fs";
import type { CommandExecutor, RunOutcome, RunSpec } from "./do-item";
import {
  DEFAULT_WINDOW_PATH,
  decisionFromSource,
  parseWindow,
  type ExecutionMode,
  type GateDecision,
  type WindowSource,
} from "../enforcement/promotion-gate";

/** A record of what a shadow tick WOULD have run. The evidence a soak window is folded from. */
export interface ShadowRun {
  readonly script: string;
  readonly cwd?: string;
}

export interface ShadowExecutor extends CommandExecutor {
  /** Every spec this executor was handed and did not run, in order. */
  readonly runs: readonly ShadowRun[];
}

/** Records what it was asked to do and dispatches nothing. */
export function shadowExecutor(): ShadowExecutor {
  const runs: ShadowRun[] = [];
  return {
    tier: "fake",
    runs,
    run: async (spec: RunSpec): Promise<RunOutcome> => {
      runs.push(spec.cwd === undefined ? { script: spec.script } : { script: spec.script, cwd: spec.cwd });
      return { ok: true, stdout: `[shadow] not dispatched: ${spec.script}`, exitCode: 0 };
    },
  };
}

/**
 * The executor this mode permits.
 *
 * Note the asymmetry, and that it is deliberate: `primary` returns the real executor unchanged,
 * while `shadow` DISCARDS it. A shadow executor that held a reference to the real one would be one
 * refactor away from calling it.
 */
export function executorForMode(mode: ExecutionMode, real: CommandExecutor): CommandExecutor {
  return mode === "primary" ? real : shadowExecutor();
}

/** Read a promotion window from disk. Missing is ABSENT; anything else that fails is UNREADABLE. */
export function readWindowSource(path: string = DEFAULT_WINDOW_PATH): WindowSource {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    // Only "the file is not there" is absent. A permission error or an I/O fault is a thing we
    // could not read, and that is a different answer with the same safe destination.
    if (code === "ENOENT") return { absent: true };
    return { ok: false, why: `${code ?? "read failed"}: ${e instanceof Error ? e.message : String(e)}` };
  }
  return parseWindow(raw);
}

/** The gate's decision for this tick, read from disk. */
export function currentExecutionMode(path: string = DEFAULT_WINDOW_PATH): GateDecision {
  return decisionFromSource(readWindowSource(path));
}
