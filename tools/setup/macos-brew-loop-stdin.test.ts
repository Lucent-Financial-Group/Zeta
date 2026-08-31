// macos-brew-loop-stdin.test.ts — the brew loops must survive a child that reads stdin.
//
// THE DEFECT THIS PINS, measured on a real runner 2026-08-31
// ----------------------------------------------------------
// `macos.sh` drove both brew loops as `printf '%s\n' "$PKGS" | while IFS= read -r line`.
// Every child started inside the body inherits that pipe as ITS stdin -- and the pipe is
// the package list. A child that reads stdin therefore consumes the rest of the manifest;
// the loop hits EOF, exits 0, and the script prints "✓ brew packages up to date" over rows
// it never attempted.
//
// It is not hypothetical. On macos-install-sh-test, `brew install zig` (pulling llvm@21 and
// lld@21) swallowed the tail of the list. The job log shows the remaining rows echoed raw:
//
//     llvm tier=standard
//     pandoc tier=standard
//     ykman
//     yubico-piv-tool
//     opensc
//     pam-reattach
//     ✓ brew packages up to date            <- and install.sh exited 0
//
// Four `tier=slim` rows -- required on every host -- were never attempted on a machine that
// had just reported a successful provision, and `opensc` was one of them. That is the same
// package whose declared-and-absent state cost a week of false diagnosis on the maintainer's
// Mac, which means this loop is the most likely mechanism there too.
//
// WHY THIS TEST IS BEHAVIOURAL AND NOT JUST A GREP
// ------------------------------------------------
// A structural assertion ("the file does not contain `| while read`") pins today's spelling
// and proves nothing about the property. So the first test RUNS both shapes against a
// stdin-eating child and asserts they differ -- which makes the buggy shape the CONTROL. If
// the control ever stops truncating, this test is measuring nothing and says so by failing.
//
// The second test is structural on purpose and narrow: it checks the real `macos.sh` reads
// from a dedicated descriptor. Structure + behaviour together; neither alone.

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const macosSh = join(import.meta.dir, "macos.sh");

function runBash(script: string): string {
  return Bun.spawnSync(["bash", "-c", script], { stdout: "pipe", stderr: "pipe" }).stdout.toString();
}

/** The loop body stands in for `brew install <pkg>` with a child that reads stdin. */
const BODY = 'echo "did $line"; cat >/dev/null';

test("CONTROL: the piped shape truncates silently and still exits 0", () => {
  // This is the bug, reproduced. If this ever stops truncating, the test below is vacuous.
  const out = runBash(
    `set -euo pipefail
     L=$'a\\nb\\nc\\nd\\ne'
     printf '%s\\n' "$L" | while IFS= read -r line; do ${BODY}; done
     echo "rc=$?"`,
  );
  expect(out).toContain("did a");
  expect(out).not.toContain("did c");
  expect(out).toContain("rc=0"); // silent: truncated, and reports success
});

test("the FD-3 shape processes every row despite a stdin-eating child", () => {
  const out = runBash(
    `set -euo pipefail
     L=$'a\\nb\\nc\\nd\\ne'
     while IFS= read -r line <&3; do ${BODY}; done 3<<EOF
$L
EOF
     echo "rc=$?"`,
  );
  for (const row of ["a", "b", "c", "d", "e"]) expect(out).toContain(`did ${row}`);
  expect(out).toContain("rc=0");
});

test("macos.sh drives BOTH brew loops off a dedicated descriptor, not stdin", () => {
  const src = readFileSync(macosSh, "utf8");
  // COMMENTS STRIPPED FIRST. Written naively this test failed on its own subject: the fix's
  // comment QUOTES the old `printf ... | while` line to explain the defect, and a grep over
  // the raw file cannot tell an explanation from an occurrence. A structural check that
  // reads prose is measuring documentation, not code.
  const code = src
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  // The vulnerable shape, in the form it actually had.
  expect(code).not.toMatch(/printf '%s\\n' "\$(PKGS|CASKS)" \| while/);
  expect(code).toContain("while IFS= read -r pkg_line <&3; do");
  expect(code).toContain("while IFS= read -r cask_line <&3; do");
  expect(code).toContain("3<<EOF_BREW_PKGS");
  expect(code).toContain("3<<EOF_BREW_CASKS");
});

test("the manifests carry no character the heredoc would expand", () => {
  // The FD-3 fix feeds `$PKGS` through an UNQUOTED heredoc delimiter, so `$`, backtick and
  // backslash would be interpreted. No row has one today; this fails the moment one does,
  // which is the point at which the delimiter needs quoting or the shape needs changing.
  for (const name of ["brew", "brew-cask"]) {
    const rows = readFileSync(join(import.meta.dir, "manifests", name), "utf8")
      .split(/\r?\n/)
      .map((l) => (l.split("#")[0] ?? "").trim())
      .filter((l) => l.length > 0);
    expect({ name, offenders: rows.filter((r) => /[$`\\]/.test(r)) }).toEqual({ name, offenders: [] });
  }
});
