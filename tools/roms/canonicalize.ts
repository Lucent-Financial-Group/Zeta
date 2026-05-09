#!/usr/bin/env bun
// canonicalize.ts -- hash ROM files and match against a TOSEC / No-Intro
// datfile (Logiqx XML format). Smallest safe slice of B-0272.
//
// Usage:
//   bun tools/roms/canonicalize.ts --datfile <path.dat> --dir <rom-dir>
//   bun tools/roms/canonicalize.ts --datfile <path.dat> --dir <rom-dir> --apply
//
// Output (default dry-run): JSON array of { file, sha1, match, canonicalName }.
// --apply: renames matched files to their canonical names.

import { createHash } from "node:crypto";
import {
  readdirSync,
  readFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import { basename, extname, join } from "node:path";

// --- Datfile parsing (Logiqx XML) ---

interface DatEntry {
  readonly name: string;
  readonly size: number;
  readonly sha1: string;
  readonly md5: string;
  readonly crc: string;
}

const ROM_EXTENSIONS = new Set([
  ".bin",
  ".a26",
  ".rom",
  ".int",
  ".vec",
  ".gg",
  ".sms",
  ".gen",
  ".smc",
  ".sfc",
  ".nes",
  ".gb",
  ".gbc",
  ".gba",
  ".n64",
  ".z64",
  ".v64",
  ".pce",
  ".ngp",
  ".ngc",
  ".ws",
  ".wsc",
  ".sg",
  ".32x",
  ".col",
]);

export function parseDatfile(xml: string): ReadonlyMap<string, DatEntry> {
  const lookup = new Map<string, DatEntry>();
  const romTagRe = /<rom\s+([^>]*?)\/?\s*>/g;
  const attrRe = /(\w+)\s*=\s*"([^"]*)"/g;

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = romTagRe.exec(xml)) !== null) {
    const attrStr = tagMatch[1] ?? "";
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(attrStr)) !== null) {
      const key = attrMatch[1];
      const val = attrMatch[2];
      if (key !== undefined && val !== undefined) {
        attrs[key] = val;
      }
    }
    attrRe.lastIndex = 0;

    const sha1 = attrs["sha1"]?.toLowerCase();
    const name = attrs["name"];
    if (sha1 && name) {
      lookup.set(sha1, {
        name,
        size: parseInt(attrs["size"] ?? "0", 10),
        sha1,
        md5: (attrs["md5"] ?? "").toLowerCase(),
        crc: (attrs["crc"] ?? "").toLowerCase(),
      });
    }
  }
  return lookup;
}

// --- File hashing ---

export function hashFileSha1(path: string): string {
  const data = readFileSync(path);
  return createHash("sha1").update(data).digest("hex");
}

// --- Directory scanning ---

export function scanRomFiles(dir: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (ROM_EXTENSIONS.has(ext) || ext === "") {
      files.push(join(dir, entry.name));
    }
  }
  return files.sort();
}

// --- Match + rename ---

interface MatchResult {
  readonly file: string;
  readonly sha1: string;
  readonly matched: boolean;
  readonly canonicalName: string | null;
  readonly renamed: boolean;
}

export function matchAndReport(
  datLookup: ReadonlyMap<string, DatEntry>,
  romFiles: readonly string[],
  apply: boolean,
): readonly MatchResult[] {
  const results: MatchResult[] = [];
  const usedNames = new Set<string>();

  for (const filePath of romFiles) {
    const sha1 = hashFileSha1(filePath);
    const entry = datLookup.get(sha1);
    const currentName = basename(filePath);

    if (!entry) {
      results.push({
        file: filePath,
        sha1,
        matched: false,
        canonicalName: null,
        renamed: false,
      });
      continue;
    }

    const canonicalName = entry.name;
    const alreadyCorrect = currentName === canonicalName;
    let renamed = false;

    if (apply && !alreadyCorrect) {
      const dir = filePath.slice(0, filePath.length - currentName.length);
      const target = join(dir, canonicalName);
      if (existsSync(target) || usedNames.has(canonicalName)) {
        process.stderr.write(
          `skip: target already exists: ${target}\n`,
        );
      } else {
        renameSync(filePath, target);
        renamed = true;
      }
    }

    usedNames.add(canonicalName);
    results.push({
      file: filePath,
      sha1,
      matched: true,
      canonicalName,
      renamed,
    });
  }

  return results;
}

// --- CLI ---

interface Args {
  readonly datfile: string;
  readonly dir: string;
  readonly apply: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  let datfile: string | undefined;
  let dir: string | undefined;
  let apply = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--datfile" || arg === "-d") {
      datfile = argv[++i];
    } else if (arg === "--dir") {
      dir = argv[++i];
    } else if (arg === "--apply") {
      apply = true;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: canonicalize.ts --datfile <path.dat> --dir <rom-dir> [--apply]\n\n" +
          "  --datfile, -d  Path to a TOSEC / No-Intro datfile (Logiqx XML).\n" +
          "  --dir          Directory containing ROM files to match.\n" +
          "  --apply        Actually rename files (default: dry-run report).\n",
      );
      process.exit(0);
    } else {
      process.stderr.write(`unknown arg: ${arg}\n`);
      process.exit(64);
    }
  }

  if (!datfile) {
    process.stderr.write("--datfile is required\n");
    process.exit(64);
  }
  if (!dir) {
    process.stderr.write("--dir is required\n");
    process.exit(64);
  }
  return { datfile, dir, apply };
}

export function main(argv: readonly string[]): number {
  const args = parseArgs(argv);

  if (!existsSync(args.datfile)) {
    process.stderr.write(`datfile not found: ${args.datfile}\n`);
    return 1;
  }
  if (!existsSync(args.dir)) {
    process.stderr.write(`directory not found: ${args.dir}\n`);
    return 1;
  }

  const datXml = readFileSync(args.datfile, "utf8");
  const lookup = parseDatfile(datXml);
  process.stderr.write(`datfile: ${lookup.size} entries loaded\n`);

  const romFiles = scanRomFiles(args.dir);
  process.stderr.write(`directory: ${romFiles.length} ROM files found\n`);

  if (romFiles.length === 0) {
    process.stdout.write("[]\n");
    return 0;
  }

  const results = matchAndReport(lookup, romFiles, args.apply);

  const matched = results.filter((r) => r.matched);
  const unmatched = results.filter((r) => !r.matched);
  const renamed = results.filter((r) => r.renamed);

  process.stdout.write(JSON.stringify(results, null, 2) + "\n");

  process.stderr.write(
    `\nsummary: ${matched.length} matched, ` +
      `${unmatched.length} unmatched, ` +
      `${renamed.length} renamed\n`,
  );

  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
