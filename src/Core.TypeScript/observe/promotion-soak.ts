#!/usr/bin/env bun
/**
 * observe/promotion-soak.ts — the missing producer: measure a lane, then write its window.
 *
 * `enforcement/promotion-gate.ts` decides shadow vs primary from a `PromotionWindow`. It shipped
 * with the honest admission that **nothing produced one**, so every lane resolved to
 * `insufficient_soak` forever and the gate could only ever say no. A gate that can only refuse is
 * half a control: it is safe, and it can never be satisfied, so nobody can use it and eventually
 * someone routes around it.
 *
 * This is the other half. It runs a participant over N ticks of real scenarios, counts what the
 * gate reads, and writes the window.
 *
 * ── WHAT IT COUNTS, AND WHY EACH ONE IS HONEST ───────────────────────────────
 *
 *   shadowTicks         ticks actually run. Not configured — counted.
 *   illegalSelections   `participantTick().illegalSelection` — the participant named a slot the
 *                       menu does not have. This was structurally unobservable until
 *                       `participantTick` existed, so this counter would have been a hardcoded 0.
 *   divergenceRate      how often the participant's action KIND differed from the oracle's.
 *   shadowSoakHours     wall-clock hours the soak actually took. A soak measured in ticks is not a
 *                       soak measured in hours, and reporting one as the other would let a
 *                       three-second run claim a day of exposure.
 *
 * ── WHAT IT DOES NOT COUNT, STATED RATHER THAN FAKED ─────────────────────────
 * `primarySelectorRejections30m` and `primaryControlBypassRejections30m` are PRIMARY-mode counters:
 * they describe a lane that is already dispatching. A shadow soak has not dispatched anything, so
 * it has nothing to report and writes **zero** — which is the true count, not an assumption of good
 * behaviour. They are produced by the change-control clamp at dispatch time
 * (`enforcement/change-control.ts` — an out-of-legal-set choice is a selector rejection, an unowned
 * authority is a control bypass), and folding those belongs to whatever runs primary.
 *
 * ── THE POINT OF RUNNING IT AGAINST A SMALL LOCAL MODEL ──────────────────────
 * A 0.5B model diverges. Measured here on the seven built-in scenarios it disagrees with the oracle
 * roughly one time in seven — about 14%, comfortably over the gate's 5% bar — so the gate refuses
 * to promote it. That refusal is the system working, and it is only visible because the divergence
 * is measured rather than assumed.
 *
 * Usage:
 *   bun src/Core.TypeScript/observe/promotion-soak.ts --participant local-llm:qwen2.5:0.5b --rounds 3
 *   bun src/Core.TypeScript/observe/promotion-soak.ts --participant oracle --rounds 20 --write
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SCENARIOS } from "./simulate-tick";
import { participantTick, localLlmParticipant, oracleParticipant, type Participant } from "./participant";
import { DEFAULT_WINDOW_PATH, evaluatePromotion, type PromotionWindow } from "../enforcement/promotion-gate";

export interface SoakTally {
  readonly ticks: number;
  readonly illegalSelections: number;
  readonly divergences: number;
  readonly oracleFallbacks: number;
  readonly elapsedMs: number;
}

export interface SoakOptions {
  readonly participant: Participant;
  /** How many passes over the scenario set. */
  readonly rounds: number;
  /** Injected for tests; defaults to the real clock. */
  readonly now?: () => number;
  readonly verbose?: boolean;
}

/**
 * Run the soak and tally it. Pure of I/O apart from the participant itself and the clock, both
 * injected — so a test can drive it with a deterministic participant and a fake clock.
 */
export async function runSoak(opts: SoakOptions): Promise<SoakTally> {
  const now = opts.now ?? (() => Date.now());
  const started = now();
  const scenarios = Object.entries(SCENARIOS);

  let ticks = 0;
  let illegalSelections = 0;
  let divergences = 0;
  let oracleFallbacks = 0;

  for (let round = 0; round < opts.rounds; round++) {
    for (const [name, world] of scenarios) {
      const tick = await participantTick(world, opts.participant);
      ticks++;
      if (tick.illegalSelection) illegalSelections++;
      if (tick.divergedFromOracle) divergences++;
      if (tick.fellBackToOracle) oracleFallbacks++;
      if (opts.verbose) {
        const flags = [
          tick.illegalSelection ? "ILLEGAL" : "",
          tick.divergedFromOracle ? "DIVERGED" : "",
          tick.fellBackToOracle ? `fallback(${tick.cause})` : "",
        ]
          .filter((f) => f.length > 0)
          .join(" ");
        console.log(`  [soak r${round}/${name}] ${tick.action.kind}${flags.length > 0 ? ` — ${flags}` : ""}`);
      }
    }
  }

  return { ticks, illegalSelections, divergences, oracleFallbacks, elapsedMs: now() - started };
}

/**
 * Turn a tally into the window the gate reads.
 *
 * `divergenceRate` is 0 for an empty soak rather than NaN: `0/0` is not "no divergence", and a NaN
 * here would be caught by the gate's own validity check and reported as a corrupt window — true, but
 * a confusing way to say "you ran zero ticks". The zero-tick window fails on `insufficient_soak`
 * instead, which is the accurate reason.
 */
export function windowFromTally(tally: SoakTally): PromotionWindow {
  return {
    shadowTicks: tally.ticks,
    shadowSoakHours: tally.elapsedMs / 3_600_000,
    illegalSelections: tally.illegalSelections,
    divergenceRate: tally.ticks === 0 ? 0 : tally.divergences / tally.ticks,
    // Primary-mode counters. A shadow soak has dispatched nothing, so it has nothing to report.
    primarySelectorRejections30m: 0,
    primaryControlBypassRejections30m: 0,
  };
}

export function writeWindow(window: PromotionWindow, path: string = DEFAULT_WINDOW_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(window, null, 2)}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function resolveParticipant(spec: string): Participant {
  if (spec === "oracle") return oracleParticipant();
  if (spec === "local-llm") return localLlmParticipant();
  if (spec.startsWith("local-llm:")) return localLlmParticipant({ model: spec.slice("local-llm:".length) });
  throw new Error(`promotion-soak: unknown participant "${spec}" (oracle | local-llm | local-llm:<model>)`);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const valueOf = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const spec = valueOf("--participant") ?? "oracle";
  const rounds = Number.parseInt(valueOf("--rounds") ?? "1", 10);
  const shouldWrite = argv.includes("--write");
  const path = valueOf("--out") ?? DEFAULT_WINDOW_PATH;

  const participant = resolveParticipant(spec);
  console.log(
    `promotion-soak: ${participant.name}, ${rounds} round(s) over ${Object.keys(SCENARIOS).length} scenarios\n`,
  );

  const tally = await runSoak({ participant, rounds, verbose: argv.includes("--verbose") });
  const window = windowFromTally(tally);
  const decision = evaluatePromotion(window);

  console.log(`\nticks              ${tally.ticks}`);
  console.log(`illegal selections ${tally.illegalSelections}`);
  console.log(`divergences        ${tally.divergences} (${(window.divergenceRate * 100).toFixed(1)}%)`);
  console.log(`oracle fallbacks   ${tally.oracleFallbacks}`);
  console.log(`soak hours         ${window.shadowSoakHours.toFixed(4)}`);
  console.log(`\ngate: ${decision.mode} (${decision.reason})`);
  console.log(`      ${decision.detail}`);

  if (shouldWrite) {
    writeWindow(window, path);
    console.log(`\nwrote ${path}`);
  } else {
    console.log(`\n(not written — pass --write to publish this window to ${path})`);
  }
}
