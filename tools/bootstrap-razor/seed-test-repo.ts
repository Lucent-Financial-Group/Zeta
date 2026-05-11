#!/usr/bin/env bun
/**
 * B-0343 smallest safe slice (re-decomposed per "assume decomposition mistakes" rule).
 * Bounded step: manifest reader + --dry-run only. No gh, no create, no repo mutation.
 * Follow-up slices will add gh api + idempotency + commit logic.
 */

import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type ExitCode = 0 | 1;
type ManifestSection = "include" | "exclude";

interface SeedManifest {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

const MANIFEST_DISPLAY_PATH = "docs/bootstrap-razor/SEED-MANIFEST.md";
const MANIFEST_PATH = fileURLToPath(new URL("../../docs/bootstrap-razor/SEED-MANIFEST.md", import.meta.url));

function usage(): string {
  return [
    "Usage: bun seed-test-repo.ts [--dry-run] [--help]",
    "  --dry-run   Show the manifest seed plan without side effects",
    "",
  ].join("\n");
}

function stripYamlComment(value: string): string {
  return value.replace(/\s+#.*$/, "").trim();
}

export function parseSeedManifest(content: string): SeedManifest {
  const include: string[] = [];
  const exclude: string[] = [];
  let inYaml = false;
  let section: ManifestSection | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "```yaml") {
      inYaml = true;
      section = null;
      continue;
    }
    if (inYaml && line === "```") {
      inYaml = false;
      section = null;
      continue;
    }
    if (!inYaml) continue;
    if (line === "include:") {
      section = "include";
      continue;
    }
    if (line === "exclude:") {
      section = "exclude";
      continue;
    }
    if (!section || !line.startsWith("- ")) continue;

    const item = stripYamlComment(line.slice(2));
    if (item.length === 0) continue;
    if (section === "include") include.push(item);
    else exclude.push(item);
  }

  return { include, exclude };
}

function readManifest(path: string): SeedManifest | string {
  if (!existsSync(path)) return `missing seed manifest: ${MANIFEST_DISPLAY_PATH}`;
  const manifest = parseSeedManifest(readFileSync(path, "utf8"));
  if (manifest.include.length === 0) return `seed manifest has no include entries: ${MANIFEST_DISPLAY_PATH}`;
  if (manifest.exclude.length === 0) return `seed manifest has no exclude entries: ${MANIFEST_DISPLAY_PATH}`;
  return manifest;
}

function emitDryRun(manifest: SeedManifest): void {
  console.log(`[B-0343] DRY-RUN: read ${MANIFEST_DISPLAY_PATH}`);
  console.log(`Would seed exactly these manifest include entries (${manifest.include.length}):`);
  for (const item of manifest.include) console.log(`  - ${item}`);
  console.log(`Would exclude these manifest entries (${manifest.exclude.length}):`);
  for (const item of manifest.exclude) console.log(`  - ${item}`);
  console.log("Provenance commit would link to B-0193 / B-0343.");
  console.log("Idempotency + gh create + real seeding: follow-up slice.");
}

export function main(argv: readonly string[]): ExitCode {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: false,
  });

  if (values.help) {
    process.stdout.write(usage());
    return 0;
  }

  if (values["dry-run"]) {
    const manifest = readManifest(MANIFEST_PATH);
    if (typeof manifest === "string") {
      process.stderr.write(`${manifest}\n`);
      return 1;
    }
    emitDryRun(manifest);
    return 0;
  }

  console.log("This is the minimal TS stub for B-0343.");
  console.log("Re-run with --dry-run to see the manifest seed plan.");
  console.log("No repo creation performed (bounded slice).");
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
