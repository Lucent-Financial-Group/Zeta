/**
 * audit-tool-pin-agreement.test.ts — a tool pinned in two places must agree.
 *
 * WHY THIS EXISTS. `lint (Python)` failed 6 of 60 runs on main. The cause was not
 * a lint finding: `.mise.toml` pinned `pipx:ruff = "0.15.17"` and
 * `tools/setup/manifests/from-uv-tool` listed a bare `ruff`, so the install ran
 *
 *     pipx:ruff 0.15.17        <- mise installs the pin
 *     uv tool install ruff...
 *      + ruff==0.16.5          <- overwrites it, unpinned
 *
 * and the job then linted with a ruff the tree was never green against
 * (.mise.toml records 0.15.17 -> "All checks passed!", 0.16.4 -> "Found 65 errors").
 *
 * A pin that a second installer can overwrite is not a pin. Nothing compared the
 * two files, so the disagreement was invisible until CI went red intermittently --
 * intermittently because the realizer's already-installed check matches on NAME
 * alone, so a warm cache skipped the overwrite and a cold one did not.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");

/** `"pipx:<tool>" = "<version>"` in .mise.toml. */
function misePins(): Map<string, string> {
  const text = readFileSync(join(ROOT, ".mise.toml"), "utf8");
  const out = new Map<string, string>();
  for (const line of text.split("\n")) {
    const m = /^\s*"pipx:([A-Za-z0-9_.-]+)"\s*=\s*"([^"]+)"/.exec(line);
    if (m?.[1] && m[2]) out.set(m[1], m[2]);
  }
  return out;
}

/** `<tool>[==<version>]` in the from-uv-tool manifest, comments/blank lines skipped. */
function uvToolPins(): Map<string, string | null> {
  const text = readFileSync(join(ROOT, "tools", "setup", "manifests", "from-uv-tool"), "utf8");
  const out = new Map<string, string | null>();
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const [name, version] = line.split("==");
    if (name) out.set(name.trim(), version?.trim() ?? null);
  }
  return out;
}

describe("tool pins agree across installers", () => {
  it("parses both manifests (a check over an empty set cannot fail)", () => {
    expect(misePins().size).toBeGreaterThan(0);
    expect(uvToolPins().size).toBeGreaterThan(0);
  });

  it("every from-uv-tool entry carries an explicit version", () => {
    const unpinned = [...uvToolPins()].filter(([, v]) => v === null).map(([n]) => n);
    expect(unpinned).toEqual([]);
  });

  it("a tool pinned in BOTH .mise.toml and from-uv-tool pins the same version", () => {
    const mise = misePins();
    const disagreements: string[] = [];
    for (const [tool, uvVersion] of uvToolPins()) {
      const miseVersion = mise.get(tool);
      if (miseVersion === undefined || uvVersion === null) continue;
      if (miseVersion !== uvVersion) {
        disagreements.push(`${tool}: .mise.toml=${miseVersion} from-uv-tool=${uvVersion}`);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("ruff specifically is pinned in both and agrees (the case that went red)", () => {
    expect(uvToolPins().get("ruff")).toBe(misePins().get("ruff"));
    expect(misePins().get("ruff")).toBeTruthy();
  });
});

/** `"npm:<tool>" = "<version>"` in .mise.toml. */
function miseNpmPins(): Map<string, string> {
  const text = readFileSync(join(ROOT, ".mise.toml"), "utf8");
  const out = new Map<string, string>();
  for (const line of text.split("\n")) {
    const m = /^\s*"npm:([A-Za-z0-9_./@-]+)"\s*=\s*"([^"]+)"/.exec(line);
    if (m?.[1] && m[2]) out.set(m[1], m[2]);
  }
  return out;
}

/** devDependencies + dependencies from the root package.json. */
function packageJsonPins(): Map<string, string> {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return new Map(Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }));
}

describe("npm tool pins agree between .mise.toml and package.json", () => {
  // THE THIRD INSTANCE of one defect: a tool declared in two places that drift.
  // ruff was .mise.toml vs from-uv-tool; mise itself was linux.sh vs brew/scoop;
  // this is .mise.toml vs package.json. markdownlint-cli2 sat at 0.22.1 in mise and
  // 0.23.2 in package.json, package.json won in practice (`lint:markdown` runs the
  // node_modules binary), and the stale mise entry broke `build-and-test (macos-26)`
  // by resolving a transitive dep whose provenance had regressed.
  it("parses both sides (a check over an empty set cannot fail)", () => {
    expect(miseNpmPins().size).toBeGreaterThan(0);
    expect(packageJsonPins().size).toBeGreaterThan(0);
  });

  it("a tool pinned in BOTH pins the same version", () => {
    const pkg = packageJsonPins();
    const disagreements: string[] = [];
    for (const [tool, miseVersion] of miseNpmPins()) {
      const pkgVersion = pkg.get(tool);
      if (pkgVersion === undefined) continue;
      // package.json may carry a range; only exact pins are comparable, and this
      // repo pins exactly. A range is skipped rather than guessed at.
      if (/^[0-9]/.test(pkgVersion) && pkgVersion !== miseVersion) {
        disagreements.push(`${tool}: .mise.toml=${miseVersion} package.json=${pkgVersion}`);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("markdownlint-cli2 specifically agrees (the case that broke macOS)", () => {
    expect(miseNpmPins().get("markdownlint-cli2")).toBe(
      packageJsonPins().get("markdownlint-cli2"),
    );
  });
});
