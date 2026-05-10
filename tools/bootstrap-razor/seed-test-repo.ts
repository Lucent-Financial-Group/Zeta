#!/usr/bin/env bun
import { readFileSync } from "fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const manifestPath = resolve(repoRoot, "docs/bootstrap-razor/SEED-MANIFEST.md");

function extractYamlListBlock(source: string, key: string): string[] {
  const yamlFenceMatches = source.matchAll(/```ya?ml\s*\n([\s\S]*?)```/gi);
  for (const fenceMatch of yamlFenceMatches) {
    const yamlBody = fenceMatch[1];
    if (yamlBody === undefined) {
      continue;
    }

    const lines = yamlBody.split(/\r?\n/);
    const keyLineIndex = lines.findIndex((line) => line.trim() === `${key}:`);
    if (keyLineIndex < 0) {
      continue;
    }

    const entries: string[] = [];
    for (const line of lines.slice(keyLineIndex + 1)) {
      if (/^\S/.test(line) && line.trim().endsWith(":")) {
        break;
      }

      const uncommented = line.replace(/\s+#.*$/, "").trim();
      if (!uncommented.startsWith("- ")) {
        continue;
      }

      const entry = uncommented.slice(2).trim();
      if (entry.length > 0) {
        entries.push(entry);
      }
    }

    return entries;
  }

  return [];
}

export function main(argv: string[]): number {
  const dryRun = argv.includes("--dry-run");

  if (dryRun) {
    const manifest = readFileSync(manifestPath, "utf8");
    console.log("DRY-RUN: would read manifest from", manifestPath);
    const includeGlobs = extractYamlListBlock(manifest, "include");
    if (includeGlobs.length > 0) {
      console.log("DRY-RUN: would seed these globs:");
      console.log(includeGlobs.join("\n"));
    } else {
      console.log("DRY-RUN: manifest parse fallback (no fenced include block)");
    }
    console.log("DRY-RUN: no repo created (gh api skipped in slice 1)");
    return 0;
  }

  console.log("seed-test-repo: real run not implemented in this bounded slice; use --dry-run");
  return 1;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
