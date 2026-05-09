#!/usr/bin/env bun
// ace.ts -- Ace DLC package manager CLI. Smallest safe slice of B-0288.
//
// Usage:
//   bun tools/ace/ace.ts list [--store <path>] [--json]
//
// Future commands (not yet implemented): install, verify, remove, inspect.

import { defaultStorePath, listInstalled } from "./store";

interface ListArgs {
  readonly command: "list";
  readonly storePath: string;
  readonly json: boolean;
}

interface HelpArgs {
  readonly command: "help";
}

type ParsedArgs = ListArgs | HelpArgs;

interface ArgError {
  readonly error: string;
}

export function parseArgs(argv: readonly string[]): ParsedArgs | ArgError {
  const command = argv[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (command === "list") {
    let storePath = defaultStorePath();
    let json = false;

    for (let i = 1; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === "--store" || arg === "-s") {
        const next = argv[i + 1];
        if (!next || next.startsWith("-")) {
          return { error: "--store requires a path argument" };
        }
        storePath = next;
        i++;
      } else if (arg === "--json") {
        json = true;
      } else {
        return { error: `Unknown option for list: ${arg}` };
      }
    }

    return { command: "list", storePath, json };
  }

  const known = ["install", "verify", "remove", "inspect"];
  if (known.includes(command)) {
    return { error: `'${command}' is not yet implemented (smallest safe slice: list only)` };
  }

  return { error: `Unknown command: ${command}` };
}

function printUsage(): void {
  const text = `Ace DLC Package Manager

Usage:
  ace list [--store <path>] [--json]    List installed DLC packages
  ace help                              Show this help

Future commands (not yet implemented):
  ace install <hash-or-url>             Download, verify, and extract a DLC
  ace verify <hash>                     Check signature and integrity
  ace remove <hash>                     Uninstall a DLC
  ace inspect <hash>                    Show manifest without installing`;
  console.log(text);
}

export function main(argv: readonly string[]): number {
  const parsed = parseArgs(argv);

  if ("error" in parsed) {
    console.error(`ace: ${parsed.error}`);
    return 64;
  }

  if (parsed.command === "help") {
    printUsage();
    return 0;
  }

  if (parsed.command === "list") {
    const packages = listInstalled(parsed.storePath);

    if (parsed.json) {
      console.log(JSON.stringify(packages, null, 2));
      return 0;
    }

    if (packages.length === 0) {
      console.log("No DLC packages installed.");
      return 0;
    }

    console.log(`Installed DLC packages (${packages.length}):\n`);
    for (const pkg of packages) {
      const desc = pkg.manifest.description ? ` — ${pkg.manifest.description}` : "";
      console.log(`  ${pkg.manifest.name}@${pkg.manifest.version}${desc}`);
      console.log(`    hash: ${pkg.hash}`);
    }
    return 0;
  }

  return 1;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
