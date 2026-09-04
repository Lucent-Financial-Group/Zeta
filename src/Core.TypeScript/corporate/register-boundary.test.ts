/**
 * register-boundary.test.ts — the architecture, as a check rather than a claim.
 *
 * The ADR makes the canonical observe-algebra the substrate and the corporate workflow a register
 * that *retrofits onto it*. That is a statement about the DIRECTION of dependency, and a direction
 * asserted only in a header is a convention — which is exactly what this directory would quietly
 * become part of the first time a core module reached into it for a hat level or a supervisor.
 *
 * So: `corporate/` may import the core. The core may not import `corporate/`.
 *
 * The failure this prevents is not hypothetical or stylistic. If the sovereign loop depended on the
 * org chart, then a hierarchy would be a property of the machine rather than a policy someone chose,
 * and the sovereign register — which the same ADR describes as *"self-modifying, free of PR gating"*
 * — could not run without one. The two registers stop being alternatives.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const CORE_ROOT = join(import.meta.dir, "..");
const REGISTER_DIR = "corporate";

/**
 * The checkout is OneDrive-backed, so filesystem calls are expensive enough to matter: a naive
 * `statSync` per entry over ~2500 files took 47 seconds and timed out the suite. `withFileTypes`
 * gets the directory/file distinction from the single `readdir` that already happened.
 */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "roms", "templates"]);

function* walk(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // a directory that vanished mid-walk is not a boundary violation
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".ts")) yield full;
  }
}

/** One pass over the tree, shared by every test below — the reads are the expensive part. */
const SCAN = (() => {
  const core: { file: string; imports: readonly string[] }[] = [];
  let registerFilesImportingSiblings = 0;
  for (const file of walk(CORE_ROOT)) {
    const inRegister = relative(CORE_ROOT, file).split(sep).includes(REGISTER_DIR);
    const src = readFileSync(file, "utf8");
    if (inRegister) {
      if (/from\s*["']\.\/(org-chart|discussion-anchor|work-schedule|goal-cascade)/.test(src)) {
        registerFilesImportingSiblings += 1;
      }
      continue;
    }
    core.push({ file: relative(CORE_ROOT, file), imports: corporateImportsIn(file, src) });
  }
  return { core, registerFilesImportingSiblings };
})();

/**
 * Import specifiers that resolve into `corporate/`.
 *
 * Matches `from "..."` and `import("...")`, then asks whether the specifier's path lands in the
 * register. Done on the specifier rather than by a bare substring search so that a file merely
 * MENTIONING the word in a comment — as several of these files do at length — is not a violation.
 */
function corporateImportsIn(file: string, src: string): readonly string[] {
  const found: string[] = [];
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = m[1];
    if (spec === undefined || !spec.startsWith(".")) continue;
    // Normalise the relative specifier against the importing file's directory.
    const resolved = relative(CORE_ROOT, join(file, "..", spec)).split(sep);
    if (resolved[0] === REGISTER_DIR) found.push(spec);
  }
  return found;
}

describe("the corporate register is a plugin, not a dependency of the core", () => {
  test("the walk actually reached the core — an empty sweep would pass vacuously", () => {
    // Without this the whole check could pass by finding nothing at all, which is the failure mode
    // it exists to catch elsewhere.
    expect(SCAN.core.length).toBeGreaterThan(500);
    expect(SCAN.core.some((f) => f.file === join("observe", "observe.ts"))).toBe(true);
  });

  test("NO core module imports from corporate/", () => {
    const violations = SCAN.core.filter((v) => v.imports.length > 0);
    expect(violations.map((v) => `${v.file} → ${v.imports.join(", ")}`)).toEqual([]);
  });

  test("and the detector is not vacuous — it finds a corporate import when there is one", () => {
    // The register's own files import each other, so the same scan must produce hits inside it.
    // A checker that cannot fire is not a checker.
    expect(SCAN.registerFilesImportingSiblings).toBeGreaterThan(0);
  });
});

describe("the register composes over the core, and does so for real", () => {
  test("it reuses the core's HatLevel rather than redefining the tiers", () => {
    // If `corporate/` declared its own six-tier union, the two would drift and the gate would be
    // filtering on a different vocabulary than the org chart routes on.
    const orgChart = readFileSync(join(CORE_ROOT, REGISTER_DIR, "org-chart.ts"), "utf8");
    expect(orgChart).toContain('from "../observe/room/hat-gate"');
  });
});
