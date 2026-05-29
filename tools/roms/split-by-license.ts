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
import { join } from "node:path";

interface Args {
  readonly romDir: string;
  readonly safeDir: string;
  readonly unsafeDir: string;
  readonly allowlist: string;
}

function parseArgs(argv: readonly string[]): Args {
  let romDir: string | undefined;
  let safeDir: string | undefined;
  let unsafeDir: string | undefined;
  let allowlist: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--rom-dir') {
      romDir = argv[++i];
    } else if (arg === '--safe-dir') {
      safeDir = argv[++i];
    } else if (arg === '--unsafe-dir') {
        unsafeDir = argv[++i];
    } else if (arg === '--allowlist') {
      allowlist = argv[++i];
    }
  }

  if (!romDir || !safeDir || !unsafeDir || !allowlist) {
    throw new Error('Usage: --rom-dir <path> --safe-dir <path> --unsafe-dir <path> --allowlist <path>');
  }

  return { romDir, safeDir, unsafeDir, allowlist };
}

export async function splitRoms(romDir: string, safeDir: string, unsafeDir: string, allowlistPath: string) {
    if (!existsSync(romDir)) {
        console.error(`ROM directory not found: ${romDir}`);
        process.exit(1);
    }
    if (!existsSync(allowlistPath)) {
        console.error(`Allowlist not found: ${allowlistPath}`);
        process.exit(1);
    }

    if (!existsSync(safeDir)) {
        mkdirSync(safeDir, { recursive: true });
    }
    if (!existsSync(unsafeDir)) {
        mkdirSync(unsafeDir, { recursive: true });
    }

    const allowlistContent = readFileSync(allowlistPath, 'utf-8');
    const allowedNames = new Set(allowlistContent.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#')));

    const romFiles = readdirSync(romDir);
    let movedToSafe = 0;
    let movedToUnsafe = 0;

    for (const file of romFiles) {
        const oldPath = join(romDir, file);
        if (allowedNames.has(file)) {
            const newPath = join(safeDir, file);
            try {
                renameSync(oldPath, newPath);
                console.log(`Moved ${file} to safe directory.`);
                movedToSafe++;
            } catch (error) {
                console.error(`Failed to move ${file}:`, error);
            }
        } else {
            const newPath = join(unsafeDir, file);
            try {
                renameSync(oldPath, newPath);
                console.log(`Moved ${file} to unsafe directory.`);
                movedToUnsafe++;
            } catch (error) {
                console.error(`Failed to move ${file}:`, error);
            }
        }
    }

    console.log(`\nSplit complete. Moved ${movedToSafe} files to the safe directory and ${movedToUnsafe} to the unsafe directory.`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  splitRoms(args.romDir, args.safeDir, args.unsafeDir, args.allowlist);
}

if (import.meta.main) {
    main();
}
