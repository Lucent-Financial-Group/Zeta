// workflow-step-env-vars-are-defined.test.ts — a STEP that quotes a variable must have
// something IN ITS OWN SCOPE that defines it.
//
// THE DEFECT, measured 2026-09-01 on run 33474432508. A new job copied a working command
// line from a sibling lane:
//
//     --git-ref "$ZETA_ARGOCD_GIT_REF"
//
// but not the `env:` block above it that defines the variable. It expanded to empty and the
// harness refused with {"kind":"UsageError", ...} and exit 2 -- a USAGE error, a check that
// never ran rather than one that failed. The job then reported four applications as
// "NOT ASSERTED IN THIS SCOPE", which reads like a measurement of the roster and was not.
//
// `actionlint` cannot catch this: the YAML is valid and `"$VAR"` is a legal expansion.
//
// SCOPE IS THE WHOLE POINT, AND THE FIRST VERSION OF THIS FILE GOT IT WRONG. It asked
// whether the variable was defined ANYWHERE IN THE WORKFLOW -- and `ZETA_ARGOCD_GIT_REF` is
// defined in four other steps of that same file, so removing it from the offending step
// still passed. The test could not fail for the bug it was written for; mutation caught it.
// Resolution is now per-step: step env -> job env -> workflow env, which is what the
// runner actually does.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const WORKFLOWS = resolve(ROOT, ".github/workflows");

/** ZETA_ vars a step may read without a local `env:` — install.sh's shellenv exports these. */
const AMBIENT = new Set(["ZETA_HOST_TIER", "ZETA_APT_ARCHIVES_DIR", "ZETA_INSTALL_FULL", "ZETA_EXPECTED_BRANCH"]);

const READ_RE = /\$\{?(ZETA_[A-Z0-9_]+)\}?/g;
const DEF_RE = /^\s*(ZETA_[A-Z0-9_]+)\s*:/;

const indentOf = (l: string): number => l.length - l.trimStart().length;

/**
 * Env names defined by the `env:` block that starts at `start`, i.e. every `KEY:` line
 * indented deeper than the `env:` key itself.
 */
function envBlockAt(lines: readonly string[], start: number): readonly string[] {
  const base = indentOf(lines[start] ?? "");
  const names: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i] ?? "";
    if (l.trim() === "" || l.trim().startsWith("#")) continue;
    if (indentOf(l) <= base) break;
    const m = DEF_RE.exec(l);
    if (m?.[1] !== undefined) names.push(m[1]);
  }
  return names;
}

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly variable: string;
}

/**
 * Per-step resolution. Walks the file once, tracking the innermost `env:` blocks at
 * workflow (indent 0), job (indent 2) and step (inside a `- name:` item) level, then
 * reports a `$ZETA_*` read no enclosing scope defines.
 */
export function undefinedStepVars(text: string, file: string): readonly Finding[] {
  const lines = text.split("\n");
  const workflowEnv = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    if (/^env:\s*$/.test(lines[i] ?? "")) for (const n of envBlockAt(lines, i)) workflowEnv.add(n);
  }
  const out: Finding[] = [];
  let jobEnv = new Set<string>();
  let stepEnv = new Set<string>();
  let stepIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const ind = indentOf(raw);
    const trimmed = raw.trim();

    // A new job resets job+step scope.
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(raw)) {
      jobEnv = new Set<string>();
      stepEnv = new Set<string>();
      stepIndent = -1;
    }
    // A new step item resets step scope.
    if (/^\s*-\s+(name|uses|run):/.test(raw)) {
      stepEnv = new Set<string>();
      stepIndent = ind;
    }
    if (/^\s*env:\s*$/.test(raw)) {
      const names = envBlockAt(lines, i);
      // Inside a step (deeper than the `- ` marker) => step env; at indent 4 => job env.
      if (stepIndent >= 0 && ind > stepIndent) for (const n of names) stepEnv.add(n);
      else if (ind === 4) for (const n of names) jobEnv.add(n);
      else if (ind === 0) for (const n of names) workflowEnv.add(n);
    }
    if (trimmed.startsWith("#")) continue;

    for (const m of raw.matchAll(READ_RE)) {
      const v = m[1];
      if (v === undefined) continue;
      if (AMBIENT.has(v) || stepEnv.has(v) || jobEnv.has(v) || workflowEnv.has(v)) continue;
      out.push({ file, line: i + 1, variable: v });
    }
  }
  return out;
}

describe("every ZETA_ variable a step reads is defined in that STEP's scope", () => {
  const files = readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  const read = (f: string): string => readFileSync(resolve(WORKFLOWS, f), "utf8");

  test("corpus is non-empty", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  // CONTROL THROUGH THE SAME FUNCTION the assertion uses. The previous version's control
  // had its own inline regex, so blinding the scanner left every test green -- the exact
  // failure this file exists to name, committed inside the file that names it.
  test("CONTROL: the scanner resolves reads at all — a synthetic missing var IS found", () => {
    const synthetic = ["jobs:", "  j:", "    steps:", "      - name: s", "        run: echo \"$ZETA_SYNTHETIC_MISSING\""].join("\n");
    const f = undefinedStepVars(synthetic, "synthetic");
    expect(f.map((x) => x.variable)).toEqual(["ZETA_SYNTHETIC_MISSING"]);
  });

  test("CONTROL: a step env DOES satisfy the read (no false positives)", () => {
    const ok = [
      "jobs:", "  j:", "    steps:", "      - name: s", "        env:",
      "          ZETA_SYNTHETIC_MISSING: x", "        run: echo \"$ZETA_SYNTHETIC_MISSING\"",
    ].join("\n");
    expect(undefinedStepVars(ok, "synthetic")).toEqual([]);
  });

  test("no step reads a ZETA_ variable its own scope does not define", () => {
    const findings = files.flatMap((f) => undefinedStepVars(read(f), f));
    expect(findings.map((x) => `${x.file}:${x.line} $${x.variable}`)).toEqual([]);
  });
});
