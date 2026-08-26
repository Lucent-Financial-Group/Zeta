#!/usr/bin/env bun
/**
 * f4-question-bias-run.ts — sequences generations and writes raw JSONL. Nothing else.
 *
 * STATUS: toy. Every metric and its falsifier live in `f4-question-bias.ts` /
 * `.test.ts`; this file makes no claim and computes no statistic.
 *
 *   bun f4-question-bias-run.ts role         # domain R across the small models
 *   bun f4-question-bias-run.ts preference   # domain P across the small models
 *   bun f4-question-bias-run.ts role-large   # domain R on the 7B, for the size question
 *
 * Raw generations land in `data/f4-question-bias/` as JSONL so every number in the
 * research doc is recomputable offline, without a model and without a GPU. Runs are
 * resumable: an interrupted run skips the rows already on disk, in the same order.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "./f3-hat-choice-decorrelation";
import { domainById, promptText, seedFor, type DomainSpec } from "./f4-question-bias";

const HOST = "http://127.0.0.1:11434";
const OUT_DIR = join(import.meta.dir, "..", "..", "..", "data", "f4-question-bias");

/** The sampler temperature is the ONLY entropy source separating replicates. */
const TEMPERATURE = 0.8;
const NUM_PREDICT = 24;

export const SMALL_MODELS = ["qwen2.5:0.5b", "llama3.2:1b", "gemma2:2b"] as const;
export const LARGE_MODEL = "qwen2.5:7b";
export const REPLICATES_SMALL = 120;
export const REPLICATES_LARGE = 80;

export interface AnswerRow {
  readonly domain: string;
  readonly model: string;
  readonly prompt: string;
  readonly replicate: number;
  readonly seed: number;
  readonly temperature: number;
  readonly raw: string;
  /** Wall-clock. LABELLED latency, used for nothing. It is not energy and not a cost. */
  readonly ms: number;
  readonly promptTokens: number;
  readonly evalTokens: number;
}

function outFile(domain: string, model: string): string {
  return `${domain}-${model.replace(/[:.]/g, "-")}.jsonl`;
}

function writeRow(file: string, row: AnswerRow): void {
  mkdirSync(OUT_DIR, { recursive: true });
  appendFileSync(join(OUT_DIR, file), JSON.stringify(row) + "\n");
}

function rowsOnDisk(file: string): number {
  const p = join(OUT_DIR, file);
  if (!existsSync(p)) return 0;
  return readFileSync(p, "utf8")
    .split("\n")
    .filter((l) => l.length > 0).length;
}

async function runDomain(domain: DomainSpec, models: readonly string[], replicates: number): Promise<void> {
  for (const model of models) {
    const file = outFile(domain.id, model);
    const done = rowsOnDisk(file);
    const total = domain.prompts.length * replicates;
    console.log(`${domain.id} / ${model}: ${total} generations (${done} already on disk)`);
    let n = 0;
    const t0 = performance.now();
    for (let pi = 0; pi < domain.prompts.length; pi++) {
      const prompt = domain.prompts[pi]!;
      const text = promptText(domain, prompt);
      for (let rep = 0; rep < replicates; rep++) {
        n++;
        if (n <= done) continue;
        const seed = seedFor(pi, rep);
        const r = await generate(HOST, model, text, seed, TEMPERATURE, NUM_PREDICT);
        writeRow(file, {
          domain: domain.id,
          model,
          prompt: prompt.id,
          replicate: rep,
          seed,
          temperature: TEMPERATURE,
          raw: r?.text ?? "",
          ms: r?.ms ?? 0,
          promptTokens: r?.promptTokens ?? 0,
          evalTokens: r?.evalTokens ?? 0,
        });
        if (n % 100 === 0) {
          const rate = (n - done) / ((performance.now() - t0) / 1000);
          process.stdout.write(`  ${n}/${total} (${rate.toFixed(1)}/s)\r`);
        }
      }
    }
    console.log(`\n  ${domain.id} / ${model} complete -> ${join(OUT_DIR, file)}`);
  }
}

if (import.meta.main) {
  const cmd = process.argv[2];
  if (cmd === "role") await runDomain(domainById("role"), SMALL_MODELS, REPLICATES_SMALL);
  else if (cmd === "preference") await runDomain(domainById("preference"), SMALL_MODELS, REPLICATES_SMALL);
  else if (cmd === "role-large") await runDomain(domainById("role"), [LARGE_MODEL], REPLICATES_LARGE);
  else {
    console.log("usage: bun f4-question-bias-run.ts <role|preference|role-large>");
    process.exit(2);
  }
}
