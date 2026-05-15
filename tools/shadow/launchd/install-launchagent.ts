#!/usr/bin/env bun
/**
 * tools/shadow/launchd/install-launchagent.ts
 *
 * Install (or reinstall) the Zeta shadow observer as a macOS LaunchAgent.
 *
 * Performs the placeholder substitution that the README previously documented
 * with a `sed` recipe. The `sed` form is unsafe when the substituted values
 * contain `&`, `|`, `\`, or newlines — a path like `/Users/foo & bar/Zeta`
 * would silently produce a broken plist. This script reads the template,
 * substitutes by string replace (no shell metacharacter risk), runs
 * `plutil -lint` on the result, and writes it to ~/Library/LaunchAgents/.
 *
 * USAGE
 *
 *   bun tools/shadow/launchd/install-launchagent.ts
 *
 *   # Optional flags:
 *   --bun-path <path>     override `which bun`
 *   --repo-root <path>    override `git rev-parse --show-toplevel`
 *   --dry-run             write to stdout instead of LaunchAgents dir
 *   --bootstrap           after writing, `launchctl bootstrap` the agent
 *
 * SAFETY
 *
 *   - Refuses to write if substitution would leave any `{{PLACEHOLDER}}`
 *     markers in the output (catches mis-spelled / new placeholders).
 *   - Verifies the output with `plutil -lint` before writing to the
 *     final location.
 *   - Backs up any existing LaunchAgent plist before overwriting.
 *
 * COMPOSES WITH
 *
 *   tools/shadow/launchd/com.zeta.shadow-observer.plist — the template
 *   tools/shadow/launchd/README.md — install procedure documentation
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, isAbsolute, resolve } from "node:path";
import { execFileSync } from "node:child_process";

interface Args {
  bunPath: string;
  repoRoot: string;
  dryRun: boolean;
  bootstrap: boolean;
}

/**
 * Tries `which bun` (or `git rev-parse --show-toplevel`) and returns
 * the trimmed stdout. If the command isn't on PATH or errors, returns
 * undefined so the caller can emit the documented actionable error
 * instead of a raw exception.
 */
function tryDetect(cmd: string, args: string[]): string | undefined {
  try {
    return execFileSync(cmd, args, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Enforce that a user-supplied path override is absolute. LaunchAgent
 * plists are persistent and must not depend on the installer's cwd —
 * `--repo-root .` would write relative paths into ProgramArguments,
 * WorkingDirectory, and log paths, all of which would fail under
 * launchd (which has no defined cwd unless explicit).
 */
function requireAbsolute(name: string, value: string): string {
  if (!isAbsolute(value)) {
    console.error(`${name} must be an absolute path; got "${value}". Use \`${resolve(value)}\` if that's what you meant.`);
    process.exit(1);
  }
  return value;
}

function parseArgs(argv: string[]): Args {
  let bunPath: string | undefined;
  let repoRoot: string | undefined;
  let dryRun = false;
  let bootstrap = false;
  let i = 0;
  function nextArg(name: string): string {
    const v = argv[++i];
    if (v === undefined) {
      console.error(`Missing value for ${name}`);
      process.exit(1);
    }
    if (v.startsWith("--")) {
      console.error(`Missing value for ${name} (next token "${v}" looks like a flag)`);
      process.exit(1);
    }
    return v;
  }
  for (; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--bun-path":
        bunPath = requireAbsolute("--bun-path", nextArg("--bun-path"));
        break;
      case "--repo-root":
        repoRoot = requireAbsolute("--repo-root", nextArg("--repo-root"));
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--bootstrap":
        bootstrap = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        // Unknown flag — refuse before performing any filesystem action.
        // Otherwise a typo like `--dryrun` or `--bootstap` would silently
        // proceed with default-installation behavior.
        console.error(`Unknown argument: ${a}. Run with --help to see supported flags.`);
        process.exit(1);
    }
  }
  if (!bunPath) {
    bunPath = tryDetect("which", ["bun"]);
    if (!bunPath) {
      console.error("Could not detect bun via `which bun`. Install bun or pass --bun-path <absolute-path>.");
      process.exit(1);
    }
  }
  if (!repoRoot) {
    repoRoot = tryDetect("git", ["rev-parse", "--show-toplevel"]);
    if (!repoRoot) {
      console.error("Could not detect repo root via `git rev-parse --show-toplevel` (not in a git checkout?). Pass --repo-root <absolute-path>.");
      process.exit(1);
    }
  }
  if (!existsSync(bunPath)) {
    console.error(`bun not found at "${bunPath}". Install bun or pass --bun-path.`);
    process.exit(1);
  }
  if (!existsSync(repoRoot)) {
    console.error(`repo root "${repoRoot}" does not exist. Pass --repo-root explicitly.`);
    process.exit(1);
  }
  return { bunPath, repoRoot, dryRun, bootstrap };
}

function printHelp(): void {
  console.error(`
Install Zeta shadow observer as a macOS LaunchAgent.

Usage: bun tools/shadow/launchd/install-launchagent.ts [options]

Options:
  --bun-path <path>     Absolute path to bun (default: \`which bun\`)
  --repo-root <path>    Absolute path to Zeta checkout (default: \`git rev-parse --show-toplevel\`)
  --dry-run             Write to stdout instead of LaunchAgents dir
  --bootstrap           After writing, \`launchctl bootstrap\` the agent

After install, complete Step 2 (accessibility permission) from
tools/shadow/launchd/README.md before live mode is useful.
`);
}

/**
 * XML-text escape: substituted values go inside <string>…</string> nodes,
 * so any of `& < >` would either produce an invalid plist (`&` without a
 * matching `;`) or alter the parsed value. Apple's plutil rejects raw `&`
 * in text nodes outright. We escape before substitution.
 *
 * `'` and `"` aren't strictly required to be escaped inside element text,
 * but escaping them is conservative and matches XML 1.0 predefined-entity
 * recommendations.
 */
function xmlEscape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function substitutePlaceholders(template: string, repoRoot: string, bunPath: string): string {
  // String replace is metacharacter-safe (unlike sed). No escaping needed
  // for shell — but the values are about to land in XML text nodes, so
  // they DO need XML-entity escaping (else `/Users/foo & bar/Zeta`
  // produces an invalid plist).
  // Placeholders use `{{NAME}}` (Mustache-style) so the template header
  // comment can document them without itself being substituted.
  const result = template
    .replaceAll("{{BUN_PATH}}", xmlEscape(bunPath))
    .replaceAll("{{REPO_ROOT}}", xmlEscape(repoRoot));
  // Sanity check: any remaining {{NAME}} markers indicate a new placeholder
  // the script doesn't know about. Refuse to write a partial substitution.
  const leftover = result.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) {
    console.error(`Unsubstituted placeholder(s) in template: ${[...new Set(leftover)].join(", ")}`);
    console.error("Update install-launchagent.ts to handle them.");
    process.exit(1);
  }
  return result;
}

function plutilLint(content: string): void {
  // Write to a temp path so plutil can read it. Use a deterministic temp path
  // to keep this simple; if multiple invocations race, the loser overwrites
  // the winner's temp file but each writes its own content first.
  const tmp = join("/tmp", `zeta-shadow-launchagent-${process.pid}.plist`);
  writeFileSync(tmp, content, "utf-8");
  try {
    execFileSync("plutil", ["-lint", tmp], { stdio: "pipe" });
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    console.error("plutil -lint rejected the generated plist:");
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const templatePath = join(args.repoRoot, "tools/shadow/launchd/com.zeta.shadow-observer.plist");
  if (!existsSync(templatePath)) {
    console.error(`Template not found at ${templatePath}. Wrong --repo-root?`);
    process.exit(1);
  }
  const template = readFileSync(templatePath, "utf-8");
  const configured = substitutePlaceholders(template, args.repoRoot, args.bunPath);
  plutilLint(configured);

  if (args.dryRun) {
    process.stdout.write(configured);
    return;
  }

  const destDir = join(homedir(), "Library", "LaunchAgents");
  const destPath = join(destDir, "com.zeta.shadow-observer.plist");
  // recursive: true is idempotent; no existsSync check needed.
  mkdirSync(destDir, { recursive: true });

  // Atomic write-then-promote pattern:
  //   1. Write the new content to a temp file alongside destPath
  //   2. If destPath exists, rename it to the timestamped backup
  //   3. Atomically rename the temp file into destPath
  // If step 1 or 3 fails, the existing destPath is still intact (or
  // restored from backup). Avoids the previous failure mode where
  // renameSync(destPath, backup) succeeded but the subsequent
  // writeFileSync failed, leaving destPath missing.
  const tmpDest = `${destPath}.tmp-${process.pid}`;
  const backup = `${destPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  writeFileSync(tmpDest, configured, "utf-8");
  let backedUp = false;
  try {
    renameSync(destPath, backup);
    backedUp = true;
    console.error(`Backed up existing plist to ${backup}`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      // Couldn't back up for a reason other than absence — clean up
      // temp file and bail out so we don't lose the existing plist.
      try { unlinkSync(tmpDest); } catch { /* tmp may already be gone */ }
      throw e;
    }
    // No existing plist — nothing to back up.
  }
  try {
    renameSync(tmpDest, destPath);
  } catch (e) {
    // Promote failed. If we successfully moved the old plist aside,
    // restore it so the caller's existing install is untouched.
    if (backedUp) {
      try { renameSync(backup, destPath); } catch { /* original lost; manual cleanup needed */ }
    }
    try { unlinkSync(tmpDest); } catch { /* tmp may already be gone */ }
    throw e;
  }
  console.error(`Wrote ${destPath}`);

  if (args.bootstrap) {
    const uid = execFileSync("id", ["-u"], { encoding: "utf-8" }).trim();
    const domain = `gui/${uid}`;
    // bootout first (idempotent — fine if not loaded)
    try {
      execFileSync("launchctl", ["bootout", domain, destPath], { stdio: "pipe" });
    } catch {
      // Not loaded — fine.
    }
    execFileSync("launchctl", ["bootstrap", domain, destPath], { stdio: "inherit" });
    console.error(`Bootstrapped com.zeta.shadow-observer in ${domain}`);
  } else {
    console.error("Next: complete Step 2 (accessibility permission) per README, then:");
    console.error(`  launchctl bootstrap gui/$(id -u) ${destPath}`);
  }
}

// Bun convention: only invoke main() when this file is the entry point.
// Lets tests / helpers `import { ... } from "./install-launchagent.ts"`
// without triggering filesystem or launchctl side effects.
if (import.meta.main) {
  main();
}
