#!/usr/bin/env bun
// split-by-license.ts -- splits ROMs into safe/unsafe folders
// based on an allowlist manifest. Part of B-0273.

import {
  readdirSync,
  readFileSync,
  renameSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { basename, join } from "node:path";

interface Args {
  readonly romDir: string;
  readonly safeDir: string;
  readonly allowlist: string;
}

function parseArgs(argv: readonly string[]): Args {
  let romDir: string | undefined;
  let safeDir: string | undefined;
  let allowlist: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--rom-dir') {
      romDir = argv[++i];
    } else if (arg === '--safe-dir') {
      safeDir = argv[++i];
    } else if (arg === '--allowlist') {
      allowlist = argv[++i];
    }
  }

  if (!romDir || !safeDir || !allowlist) {
    throw new Error('Usage: --rom-dir <path> --safe-dir <path> --allowlist <path>');
  }

  return { romDir, safeDir, allowlist };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.romDir)) {
    console.error(`ROM directory not found: ${args.romDir}`);
    process.exit(1);
  }
  if (!existsSync(args.allowlist)) {
    console.error(`Allowlist not found: ${args.allowlist}`);
    process.exit(1);
  }

  if (!existsSync(args.safeDir)) {
    mkdirSync(args.safeDir, { recursive: true });
  }

  const allowlistContent = readFileSync(args.allowlist, 'utf-8');
  const allowlist = new Set(allowlistContent.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#')));

  const romFiles = readdirSync(args.romDir);
  let movedCount = 0;

  for (const file of romFiles) {
    if (allowlist.has(file)) {
      const oldPath = join(args.romDir, file);
      const newPath = join(args.safeDir, file);
      try {
        renameSync(oldPath, newPath);
        console.log(`Moved ${file} to safe directory.`);
        movedCount++;
      } catch (error) {
        console.error(`Failed to move ${file}:`, error);
      }
    }
  }

  console.log(`\nSplit complete. Moved ${movedCount} files to the safe directory.`);
}

main();
