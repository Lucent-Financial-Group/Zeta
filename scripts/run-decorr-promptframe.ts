#!/usr/bin/env bun
/**
 * run-decorr-promptframe.ts — the real corrected prompt-frame experiment.
 *
 * Runs the candidate arms (blank-line, synonym, clause-swap, trailing-whitespace) and
 * the NULL arm against the canonical prompt on gemma2:2b. Every arm preserves the
 * option ordering/indices (the contamination check enforces it), so it never breaks the
 * universal-controller interface. Records honest v2 entries with φ_max, Yule's Q, CIs,
 * and the required-N power number.
 *
 * Usage: bun scripts/run-decorr-promptframe.ts [N] [preRegSha]
 */
import { PROMPT_ARMS, testPromptArm, formatMeasurement, recordMeasurement } from "../src/Core.TypeScript/observe/decorrelation-harness";

const N = parseInt(process.argv[2] ?? "150", 10);
const preRegSha = process.argv[3] ?? undefined;
const MODEL = "gemma2:2b";
const HOST = "http://127.0.0.1:11434";
const repoRoot = process.cwd();

// Deterministic scenario generation (same shape as F1/F2 hard+adversarial items).
function generateScenarios(count: number) {
  const scenarios: { context: string; options: string[]; correctIndex: number }[] = [];
  let s = 42;
  const rng = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  while (scenarios.length < count) {
    const menuSize = 6 + Math.floor(rng() * 6);
    const opts: string[] = [];
    for (let j = 0; j < menuSize - 1; j++) opts.push(`do_item: task-${j}`);
    const insertPos = Math.floor(rng() * menuSize);
    opts.splice(insertPos, 0, "respond_to_operator");
    scenarios.push({
      context: `Operator: msg=true ferry=false | Backlog: ${menuSize - 1} items(ready) | Mode: work`,
      options: opts,
      correctIndex: insertPos,
    });
  }
  return scenarios;
}

async function main() {
  const scenarios = generateScenarios(N);
  console.log(`Prompt-frame decorrelation experiment (corrected, v2)`);
  console.log(`Model: ${MODEL}  N=${N} per arm  preReg=${preRegSha ?? "none"}`);
  console.log(`All arms preserve option ordering (contamination check enforced).`);
  console.log("═".repeat(70));

  // Run the null arm FIRST — if it shows association, the harness is broken and we stop.
  const nullArm = PROMPT_ARMS.find((a) => a.kind === "null")!;
  console.log(`\nNULL ARM (${nullArm.name}) — must show NO association or the run is void:`);
  const nullResult = await testPromptArm(MODEL, nullArm, scenarios, HOST);
  console.log(formatMeasurement(nullResult));

  const nullAssociates = Math.abs(nullResult.stats.phiRatio) > 0.1 || Math.abs(nullResult.stats.yulesQ) > 0.1;
  const nullArmVerdict = nullAssociates ? "FAILED (null arm shows association — harness nondeterministic)" : "PASSED (null arm shows no association)";
  console.log(`\nNull arm verdict: ${nullArmVerdict}`);
  recordMeasurement(repoRoot, nullResult, { preRegistrationSha: preRegSha, nullArmVerdict });

  if (nullAssociates) {
    console.log("\n⚠️  NULL ARM FAILED. Candidate arms would be uninterpretable. Recording null only.");
    return;
  }

  // Candidate arms.
  for (const arm of PROMPT_ARMS.filter((a) => a.kind === "candidate")) {
    console.log("\n" + "─".repeat(70));
    console.log(`CANDIDATE ARM: ${arm.name}`);
    const m = await testPromptArm(MODEL, arm, scenarios, HOST);
    console.log(formatMeasurement(m));
    recordMeasurement(repoRoot, m, { preRegistrationSha: preRegSha, nullArmVerdict });
  }

  console.log("\n" + "═".repeat(70));
  console.log("Done. Ledger updated with honest v2 entries.");
}

main();
