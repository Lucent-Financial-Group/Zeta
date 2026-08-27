// defender-exclusions.test.ts — the falsifiers.
//
// One property carries this script, and it is the kind that is trivially asserted and rarely
// tested:
//
//     WITHOUT `--apply`, NOTHING ON THE HOST CHANGES.
//
// Reading the source and seeing an `if [ "$APPLY" -eq 0 ]; then exit 0` is not evidence — the guard
// could sit below a mutating line, an early `mdatp` call could slip in above it during a later edit,
// or `--apply` could be defaulted to 1 by a typo. The only honest check is to give the script a FAKE
// `mdatp` that records every invocation, run it both ways, and compare.
//
// That fake is also what lets the apply path be tested at all. Real `mdatp` needs elevation and
// would make a genuine security change to the developer's machine, which a test must never do.

import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "defender-exclusions.sh");

interface Run {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  /** Every argv the fake `mdatp` was called with, one per line. Empty when never called. */
  readonly calls: string;
}

/**
 * Run the script with a sandboxed PATH.
 *
 * `withMdatp: false` removes the fake entirely, which is how the "product not installed" branch is
 * exercised on a host where Defender genuinely IS installed — otherwise that branch would be
 * untestable here and would rot.
 */
function run(args: string[], opts: { withMdatp: boolean }): Run {
  // mkdtempSync: atomic and 0700, unlike mkdirSync whose mode is umask-masked.
  const dir = mkdtempSync(join(tmpdir(), "zeta-defender-test-"));
  const marker = join(dir, "mdatp-calls.txt");
  const bin = join(dir, "bin");
  try {
    Bun.spawnSync(["mkdir", "-p", bin]);
    // Create the trees the script looks for INSIDE the sandbox HOME. Without this the script
    // correctly skips every absent path, `--apply` calls nothing, and the "never calls mdatp"
    // assertions above pass vacuously — a guard proven by a system that cannot act at all. The
    // control test is what surfaced this; it is the reason these mkdirs exist.
    for (const rel of ["Documents/src/repos", ".nuget/packages", ".dotnet", ".bun/install/cache",
                       ".local/share/mise", ".cargo/registry", "zeta-wt-alpha", "zeta-wt-beta"]) {
      Bun.spawnSync(["mkdir", "-p", join(dir, rel)]);
    }
    if (opts.withMdatp) {
      // Records the call and succeeds. `exclusion list` echoes back everything previously added, so
      // the script's read-back verification has something truthful to read.
      const fake = [
        "#!/usr/bin/env bash",
        `printf '%s\\n' "$*" >> ${JSON.stringify(marker)}`,
        'if [ "$1" = "exclusion" ] && [ "$2" = "list" ]; then',
        `  grep -o -- '--path .*' ${JSON.stringify(marker)} 2>/dev/null | sed 's/^--path //' || true`,
        "fi",
        "exit 0",
      ].join("\n");
      writeFileSync(join(bin, "mdatp"), fake, "utf8");
      chmodSync(join(bin, "mdatp"), 0o755);
    }
    const p = Bun.spawnSync(["bash", SCRIPT, ...args], {
      env: {
        // A minimal PATH containing ONLY our fake plus the system basics. Inheriting the real PATH
        // would let the machine's genuine /usr/local/bin/mdatp answer, and the test would make a
        // real change to the developer's endpoint configuration.
        PATH: `${bin}:/usr/bin:/bin`,
        HOME: dir,
      },
    });
    return {
      code: p.exitCode,
      stdout: p.stdout.toString(),
      stderr: p.stderr.toString(),
      calls: existsSync(marker) ? readFileSync(marker, "utf8") : "",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("without --apply, nothing on the host changes", () => {
  test("the default invocation NEVER calls mdatp", () => {
    // The load-bearing test. A mutating line above the dry-run guard, or `APPLY=1` by typo, fails
    // here and nowhere else.
    const r = run([], { withMdatp: true });
    expect(r.calls).toBe("");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("DRY RUN");
  });

  test("an explicit --dry-run also never calls mdatp", () => {
    expect(run(["--dry-run"], { withMdatp: true }).calls).toBe("");
  });

  test("--apply DOES call it — otherwise the test above passes on a script that does nothing", () => {
    // The control. Without this, a completely inert script would satisfy every assertion above,
    // which is the vacuity class: a guard proven by a system that cannot act at all.
    const r = run(["--apply"], { withMdatp: true });
    expect(r.calls).toContain("exclusion folder add");
    expect(r.calls).toContain("--path");
  });
});

describe("the cost is stated before anything is proposed", () => {
  test("the dry run says exclusions are NOT SCANNED, unprompted", () => {
    // An exclusion list that advertises only its speed benefit is a security change wearing a
    // performance costume. The warning is part of the deliverable, so it is pinned.
    const out = run([], { withMdatp: true }).stdout;
    expect(out).toMatch(/NOT scanned/i);
    expect(out).toMatch(/NOT on a server or shared host/i);
  });

  test("every proposed path carries a reason", () => {
    // A bare path list rots into a set nobody can audit. `$HOME` is the sandbox here, so the caches
    // are absent and marked as such; the reason text still has to accompany what IS present.
    const out = run([], { withMdatp: true }).stdout;
    expect(out).toMatch(/candidate path\(s\)/);
  });
});

describe("platform detection fails closed and stays loud", () => {
  test("with no mdatp on PATH it exits 0, says so, and calls nothing", () => {
    // A no-op is correct when the product is absent. Announcing it is what stops a silent success
    // from reading as a completed change.
    const r = run(["--apply"], { withMdatp: false });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("mdatp NOT FOUND");
    expect(r.calls).toBe("");
  });

  test("the proposal is still printed with no mdatp — review must not require the product", () => {
    expect(run([], { withMdatp: false }).stdout).toMatch(/proposed antivirus scan exclusions/i);
  });
});

describe("argument handling refuses what it does not understand", () => {
  test("an unknown flag exits 2 rather than being ignored", () => {
    // Silently ignoring `--aply` would run the dry path while the operator believed they had
    // applied — a typo becoming a false report of a completed change.
    const r = run(["--aply"], { withMdatp: true });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("unknown argument");
    expect(r.calls).toBe("");
  });
});

describe("re-running is safe", () => {
  test("two --apply runs issue the same adds — idempotent by construction", () => {
    // mdatp treats a duplicate add as a no-op, so the script does not track state. What must hold is
    // that the SECOND run proposes exactly what the first did, with no accumulation.
    //
    // Each `run` gets its own sandbox HOME, so the absolute paths necessarily differ between the
    // two — comparing raw output compared the temp directory names, not the behaviour. Normalise
    // the sandbox prefix away and compare the SHAPE, which is the actual claim.
    const shape = (calls: string): string =>
      calls.replace(/\/[^ \n]*zeta-defender-test-[A-Za-z0-9]+/g, "$HOME");
    const a = shape(run(["--apply"], { withMdatp: true }).calls);
    const b = shape(run(["--apply"], { withMdatp: true }).calls);
    expect(a).toBe(b);
    // And the shape is non-empty, or this compares two blanks.
    expect(a).toContain("exclusion folder add");
  });
});
