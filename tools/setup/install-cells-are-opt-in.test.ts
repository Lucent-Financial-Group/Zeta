// Installing background agents is a SEPARATE decision from installing the toolchain.
//
// install.sh used to provision four launchd cells BY DEFAULT on macOS, with
// ZETA_SKIP_CELLS=1 as the escape. Nothing in the tree ever set that escape, so the
// default was the only path anyone took: run the toolchain installer, receive four
// launchd jobs, a per-cell git clone under ~/.zeta, and three state directories under
// ~/Library -- none of them inside the repo you cloned, none of them asked for.
//
// This pins the flip. The scanner below is used by BOTH the assertion about the real
// file AND the mutants that prove the scanner can fail; a control that re-implements
// its own matching is a control that cannot catch the bug it exists to catch.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const INSTALL_SH = join(import.meta.dir, "install.sh");

export type CellGuard = "opt-in" | "opt-out" | "unconditional" | "absent";

/**
 * Read the disposition of install.sh's cell-provisioning guard.
 *
 * "opt-in"        the block runs only when an env var is affirmatively set
 * "opt-out"       the block runs unless an env var is set (the old shape)
 * "unconditional" the block has no env guard at all
 * "absent"        no call to host-loop-bootstrap.sh
 */
export function cellGuardDisposition(script: string): CellGuard {
  if (!script.includes("host-loop-bootstrap.sh")) return "absent";

  const callIndex = script.indexOf('bash "$SETUP_DIR/host-loop-bootstrap.sh"');
  if (callIndex < 0) return "absent";

  // Classify by the cell env var's COMPARISON, not by `if`-nesting position. An
  // earlier draft picked "the second-to-last if before the call", which is a guess
  // about nesting depth -- the opt-out mutant below read as "unconditional" and
  // caught it. Only a `${ZETA_*CELLS:-0}` comparison counts, so the prose in the
  // comment and the `ZETA_PROVISION_CELLS=1` hint in the echo cannot satisfy this.
  const guards = [
    ...script.slice(0, callIndex).matchAll(/\$\{(ZETA_\w*CELLS\w*):-0\}"?\s*(=|!=)\s*"?1/g),
  ];
  if (guards.length === 0) return "unconditional";

  const [, , operator] = guards[guards.length - 1];
  return operator === "=" ? "opt-in" : "opt-out";
}

describe("install.sh does not provision background agents by default", () => {
  const script = readFileSync(INSTALL_SH, "utf8");

  test("the real install.sh gates cell provisioning behind an affirmative opt-in", () => {
    expect(cellGuardDisposition(script)).toBe("opt-in");
  });

  // MUTATION. Each mutant is the real file with the guard rewritten, run through the
  // SAME scanner the assertion above uses. If any of these still read "opt-in", the
  // assertion above is decorative.
  test("the scanner reports opt-out when the old default is restored", () => {
    const mutant = script.replace(
      /if \[ "\$\{ZETA_PROVISION_CELLS:-0\}" = "1" \] && \[ "\$\{CI:-\}" != "true" \]; then/,
      'if [ "${CI:-}" != "true" ] && [ "${ZETA_SKIP_CELLS:-0}" != "1" ]; then',
    );
    expect(mutant).not.toBe(script); // the mutation actually applied
    expect(cellGuardDisposition(mutant)).toBe("opt-out");
  });

  test("the scanner reports unconditional when the guard is deleted entirely", () => {
    const mutant = script.replace(
      /if \[ "\$\{ZETA_PROVISION_CELLS:-0\}" = "1" \] && \[ "\$\{CI:-\}" != "true" \]; then/,
      'if true; then',
    );
    expect(mutant).not.toBe(script);
    expect(cellGuardDisposition(mutant)).toBe("unconditional");
  });

  test("the scanner reports absent when the bootstrap call is gone", () => {
    expect(cellGuardDisposition("#!/bin/sh\necho hello\n")).toBe("absent");
  });

  // The point of the flip is that the roots are NAMED where the decision is made,
  // because the surprise being removed is not knowing where the files went.
  test("the block names every out-of-repo root it writes to", () => {
    for (const root of [
      "~/.zeta/clones/",
      "~/Library/LaunchAgents/",
      "~/Library/Logs/",
      "~/Library/Application Support/",
    ]) {
      expect(script).toContain(root);
    }
  });

  test("the skip path tells the reader how to opt in", () => {
    expect(script).toContain("ZETA_PROVISION_CELLS=1");
  });
});
