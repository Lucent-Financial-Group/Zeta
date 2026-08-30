/**
 * audit-mise-version-agreement.test.ts — one mise version, declared in five files.
 *
 * WHY. mise is the tool that enforces every OTHER pin, so an unpinned or drifted mise
 * makes the whole pinning story unpinned at the root. That is not hypothetical: it
 * was measured three times in two days.
 *
 *   linux.sh pinned 2026.6.12; install.ps1 ran `scoop install mise` (unpinned) and
 *   drifted to 2026.8.14, which ENFORCES aube's supply-chain trust policy while the
 *   pinned version does not -- so `build-and-test (windows-*)` failed a check no
 *   other platform ran. macOS drifted the same way via Homebrew to 2026.7.15 and
 *   failed on a transitive dependency whose provenance had regressed.
 *
 * The versions are spread across shell, PowerShell, TOML and Nix, so no single
 * language's tooling can check them. This test is the only thing that can.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const read = (...p: string[]): string => readFileSync(join(ROOT, ...p), "utf8");

/** Each declaration, with the file it lives in, so a failure names the file to edit. */
function declaredVersions(): Map<string, string> {
  const out = new Map<string, string>();

  const linux = /^MISE_PIN_VERSION="([^"]+)"/m.exec(read("tools", "setup", "linux.sh"));
  if (linux?.[1]) out.set("tools/setup/linux.sh MISE_PIN_VERSION", linux[1]);

  const macos = /^MISE_MIN_VERSION="([^"]+)"/m.exec(read("tools", "setup", "macos.sh"));
  if (macos?.[1]) out.set("tools/setup/macos.sh MISE_MIN_VERSION", macos[1]);

  const win = /^\$MisePinVersion = '([^']+)'/m.exec(read("tools", "setup", "install.ps1"));
  if (win?.[1]) out.set("tools/setup/install.ps1 MisePinVersion", win[1]);

  const toml = /^min_version = "([^"]+)"/m.exec(read(".mise.toml"));
  if (toml?.[1]) out.set(".mise.toml min_version", toml[1]);

  const nix = /^\s*version = "([^"]+)";/m.exec(
    read("full-ai-cluster", "nixos", "overlays", "mise-pin.nix"),
  );
  if (nix?.[1]) out.set("mise-pin.nix version", nix[1]);

  return out;
}

describe("mise version agreement across every declaration", () => {
  it("finds all five declarations (a check over a missing file cannot fail)", () => {
    // If a regex stops matching -- a file is renamed, a variable reshaped -- this
    // test would silently range over fewer sites and still pass. Pin the count.
    expect(declaredVersions().size).toBe(5);
  });

  it("all five declare the SAME version", () => {
    const found = [...declaredVersions()];
    const versions = new Set(found.map(([, v]) => v));
    // Report file-by-file, because "they disagree" is useless without knowing which.
    expect({ distinct: [...versions], sites: Object.fromEntries(found) }).toEqual({
      distinct: [...versions].slice(0, 1),
      sites: Object.fromEntries(found),
    });
    expect(versions.size).toBe(1);
  });

  it("the linux SHA256 set is complete — six, one per arch/libc", () => {
    // The pin is only as strong as its content hashes; a bumped version with a stale
    // hash fails closed at install time, but a MISSING hash line would not.
    const s = read("tools", "setup", "linux.sh");
    for (const k of ["X64", "ARM64", "ARMV7", "X64_MUSL", "ARM64_MUSL", "ARMV7_MUSL"]) {
      expect(new RegExp(`MISE_SHA256_${k}="[0-9a-f]{64}"`).test(s)).toBe(true);
    }
  });
});
