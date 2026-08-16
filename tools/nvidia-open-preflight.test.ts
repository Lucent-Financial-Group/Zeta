/**
 * tools/nvidia-open-preflight.test.ts
 *
 * Falsifier suite for `nvidia-open-preflight.sh` — the gate that decides
 * whether one node may set `hardware.nvidia.open = true`.
 *
 * The script cannot be exercised against real hardware from CI (or from the
 * machine that wrote it), so the only thing standing between it and a wrong
 * answer is this suite. It stubs `nvidia-smi` with a script that prints a
 * chosen GPU roster, runs the real preflight as a subprocess, and asserts BOTH
 * the exit code AND the reason. Exit code alone is not enough: a script that
 * fell over on argument parsing would exit 1 and look exactly like a correct
 * refusal.
 *
 * The case that earns the suite is `volta-7.0`. The architecture boundary for
 * the open kernel modules is Turing, whose compute capability is 7.5 — but
 * Volta is 7.0/7.2, so a natural-looking `major >= 7` test passes a card the
 * open module cannot bind. That mistake is invisible in every other case here
 * and would take out a node. `turing-7.5` pins the other side of the same
 * boundary.
 *
 * `control` (a plain Ampere box) is what stops a script that refused
 * unconditionally from passing all the refusal cases.
 */

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "nvidia-open-preflight.sh");

// Resolved absolutely on purpose. The "nvidia-smi absent" case empties PATH,
// and a bare "bash" then fails to SPAWN — which surfaced as a non-zero status
// and read exactly like the script correctly refusing. Caught while writing
// this suite: the first version of that case was passing for the wrong reason.
const BASH = existsSync("/bin/bash") ? "/bin/bash" : "bash";

/** Run the preflight with `nvidia-smi` stubbed to report `roster`. */
function runWithRoster(roster: string): { code: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), "nvopen-"));
  const stub = join(dir, "nvidia-smi");
  writeFileSync(stub, "#!/usr/bin/env bash\nprintf '%s\\n' \"$FAKE_GPUS\"\n");
  chmodSync(stub, 0o755);

  const r = spawnSync(BASH, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${dir}:${process.env["PATH"] ?? ""}`, FAKE_GPUS: roster },
  });

  return { code: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** Run with no `nvidia-smi` on PATH at all. */
function runWithoutSmi(): { code: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), "nvopen-empty-"));
  const r = spawnSync(BASH, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, PATH: dir },
  });
  return { code: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

describe("nvidia-open-preflight: passes only Turing-or-newer silicon", () => {
  test("control — Ampere RTX 3090 x2 passes", () => {
    const { code, out } = runWithRoster(
      "0, NVIDIA GeForce RTX 3090, 8.6\n1, NVIDIA GeForce RTX 3090, 8.6",
    );
    expect(code).toBe(0);
    expect(out).toContain("can run the open kernel modules");
    expect(out).not.toContain("BLOCKING");
  });

  test("ada-8.9 — RTX 4090 passes", () => {
    const { code, out } = runWithRoster("0, NVIDIA GeForce RTX 4090, 8.9");
    expect(code).toBe(0);
    expect(out).toContain("can run the open kernel modules");
  });

  test("turing-7.5 — the exact boundary passes", () => {
    const { code, out } = runWithRoster("0, NVIDIA GeForce RTX 2080, 7.5");
    expect(code).toBe(0);
    expect(out).toContain("can run the open kernel modules");
  });

  // The case a `major >= 7` shortcut gets wrong. Volta has no GSP.
  test("volta-7.0 — blocked despite major version 7", () => {
    const { code, out } = runWithRoster("0, Tesla V100-PCIE-16GB, 7.0");
    expect(code).toBe(1);
    expect(out).toContain("BLOCKING");
    expect(out).toContain("pre-Turing");
    expect(out).toContain("DO NOT set hardware.nvidia.open = true");
  });

  test("pascal-6.1 — GTX 1080 Ti blocked", () => {
    const { code, out } = runWithRoster("0, NVIDIA GeForce GTX 1080 Ti, 6.1");
    expect(code).toBe(1);
    expect(out).toContain("BLOCKING");
  });

  test("blackwell-12.0 — passes AND is flagged as requiring open", () => {
    const { code, out } = runWithRoster("0, NVIDIA GeForce RTX 5090, 12.0");
    expect(code).toBe(0);
    expect(out).toContain("REQUIRES the open module");
    expect(out).toContain("not the conservative option");
  });

  test("mixed box — one pre-Turing card blocks the whole node", () => {
    const { code, out } = runWithRoster(
      "0, NVIDIA GeForce RTX 3090, 8.6\n1, NVIDIA GeForce GTX 1080 Ti, 6.1",
    );
    expect(code).toBe(1);
    expect(out).toContain("1 of 2 card(s) would lose their driver");
  });
});

describe("nvidia-open-preflight: unknown is never a pass", () => {
  test("unreadable compute capability blocks", () => {
    const { code, out } = runWithRoster("0, NVIDIA Weird Prototype, N/A");
    expect(code).toBe(1);
    expect(out).toContain("UNREADABLE");
  });

  test("no GPUs reported blocks", () => {
    const { code, out } = runWithRoster("");
    expect(code).toBe(1);
    expect(out).toContain("no NVIDIA GPUs reported");
  });

  test("nvidia-smi absent blocks", () => {
    const { code, out } = runWithoutSmi();
    expect(code).toBe(1);
    expect(out).toContain("nvidia-smi not found");
  });

  test("--quiet still reports the verdict through the exit code", () => {
    const dir = mkdtempSync(join(tmpdir(), "nvopen-quiet-"));
    const stub = join(dir, "nvidia-smi");
    writeFileSync(stub, "#!/usr/bin/env bash\nprintf '%s\\n' \"$FAKE_GPUS\"\n");
    chmodSync(stub, 0o755);

    const pass = spawnSync(BASH, [SCRIPT, "--quiet"], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${dir}:${process.env["PATH"] ?? ""}`, FAKE_GPUS: "0, RTX 3090, 8.6" },
    });
    const fail = spawnSync(BASH, [SCRIPT, "--quiet"], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${dir}:${process.env["PATH"] ?? ""}`, FAKE_GPUS: "0, GTX 1080 Ti, 6.1" },
    });

    expect(pass.status).toBe(0);
    expect(fail.status).toBe(1);
    expect(`${pass.stdout ?? ""}`.trim()).toBe("");
  });
});
