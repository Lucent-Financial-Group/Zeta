/**
 * sudo-option-order.test.ts — `sudo VAR=value -u user cmd` runs nothing as that user.
 *
 * sudo stops parsing options at the first non-option word, and a leading `VAR=value`
 * is that word: `-u` is then handed to sudo as the COMMAND ("sudo: -u: command not
 * found"). The installer's `claude login` and `codex login` steps were written that way
 * (`sudo HOME="$ZETA_HOME" -u "#$ZETA_UID" "$CLAUDE_BIN" login`), so the interactive
 * login the operator was prompted for could never run as the zeta user — each one fell
 * through to its "WARN: ... failed; can re-run post-reboot" branch, which reads like a
 * network blip and names no cause.
 *
 * The form that works under either reading of sudo's parser puts every option first:
 * `sudo -u "#$ZETA_UID" HOME="$ZETA_HOME" cmd`.
 */

import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

/** A `sudo` whose first word after it is an assignment and which carries a later -u/--user/-g/-E... option. */
const BAD = /\bsudo\s+(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S)*\s+)+-(?:u|-user|g|-group|E|H|n)\b/;

function shellFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "--", "full-ai-cluster", "tools/setup", "tools/installer"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter((p) => p.endsWith(".sh") || p.endsWith(".nix"))
    .filter(Boolean);
}

describe("sudo option order", () => {
  it("the detector recognises the broken spelling (so a clean tree below means something)", () => {
    expect(BAD.test('sudo HOME="$ZETA_HOME" -u "#$ZETA_UID" "$CLAUDE_BIN" login')).toBe(true);
    expect(BAD.test("sudo A=1 B=2 -u zeta cmd")).toBe(true);
  });

  it("and accepts the working spelling", () => {
    expect(BAD.test('sudo -u "#$ZETA_UID" HOME="$ZETA_HOME" "$CLAUDE_BIN" login')).toBe(false);
    expect(BAD.test("sudo env HOME=/x cmd")).toBe(false);
  });

  it("no installer or first-boot script puts a VAR=value before a sudo option", () => {
    const offenders: string[] = [];
    for (const rel of shellFiles()) {
      const lines = readFileSync(join(REPO_ROOT, rel), "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/^\s*#/.test(line)) return;
        if (BAD.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
