/**
 * zetafs-virtual-path healer — Tier 1 (pattern-matched, mechanically verifiable).
 *
 * -- THE DRIFT CLASS ---------------------------------------------------------------
 * A ZetaFS module builds a path and hands it to `FileSystem.Current`, which is an
 * ABSTRACTION: it may be the host filesystem, it may be `InMemoryFileSystem`, and the
 * module cannot tell. Building that path with `System.IO.Path.Combine` makes it a
 * function of the HOST — `\` on Windows, `/` everywhere else — so the namespace of a
 * filesystem that is supposed to be the substrate's own takes its shape from whichever
 * machine happened to run the code. That is ambient state in a namespace (§13), and it
 * breaks the DST property that identical inputs give identical outputs regardless of host.
 *
 * MEASURED 2026-09-04: 27 `Path.Combine` and 4 `Path.GetDirectoryName` calls across five
 * modules. The observable symptom was ONE test — `ZetaFsFreezeTests."Journaled freeze
 * ContentId matches the mutbuf snapshot"` asserted `Exists "/freeze-mem/cas"` while the
 * code created `/freeze-mem\cas` — and it held both Windows lanes red in 35/59 and 33/59
 * executions, keeping `drift (loud)` from ever going green
 * (081M1N854ED087G0R002JP5V5N).
 *
 * -- WHY THIS CLASS IS SAFE TO AUTOMATE, AND WHERE THE JUDGEMENT WENT --------------
 * `lockfile-healer.yml` names the properties a "no intelligence" healer needs. The one
 * that does NOT hold repo-wide here is NO JUDGEMENT: `Path.Combine` is perfectly correct
 * on a genuine host path, so a repo-wide rewrite would be a judgement call at every site.
 *
 * The judgement is removed by SCOPE, not by cleverness. Inside a module that routes every
 * path through `FileSystem.Current` and never touches `System.IO.File` / `Directory`
 * directly, there is no host path — every path is an abstraction path, so the rewrite is
 * mechanical. `inScope` below derives that set from the files themselves rather than from
 * a hand-written roster, which is the difference between a scope and an allowlist: a new
 * ZetaFS module is covered the moment it exists, and a module that starts touching the
 * host filesystem directly leaves scope on its own.
 *
 * Laws (checked by `healer-harness`):
 * - Idempotence: a rewritten call contains no `Path.Combine`, so a second pass is a no-op.
 * - Closure: the healed tree has zero findings — that is the detector's own definition.
 * - Convergence: one pass; each call site is rewritten independently, no cascades.
 * - Totality: unparseable arguments DECLINE (left for a human) rather than throw.
 *
 * -- WHAT IT DELIBERATELY DOES NOT TOUCH ------------------------------------------
 * `Path.GetFullPath` (`ZetaFsDeltaLog.fs:36`). That is a DIFFERENT defect — it resolves
 * against the process working directory, so it is ambient CWD rather than ambient
 * separator, and on a virtual path it fabricates a host-rooted one. Removing it changes
 * behaviour for existing real-path callers (a relative dir stops becoming absolute), which
 * is a semantic choice and therefore Tier 2. Detected and reported, never rewritten.
 */

import type { Healer, Detector, Finding, FileTree } from "../healer-harness";

/** Where the rewrite is mechanical: F# modules that build paths for the FS abstraction. */
export function inScope(path: string, content: string): boolean {
  if (!path.endsWith(".fs")) return false;
  // The module must route through the abstraction ...
  if (!content.includes("FileSystem.Current") && !content.includes("fs.CreateDirectory")) return false;
  // ... and must not be reaching the host filesystem directly, which would mean some of
  // its paths are genuine host paths and the rewrite would need judgement after all.
  if (
    /\bSystem\.IO\.(File|Directory)\.|(?<![.\w])(File|Directory)\.(Exists|Create|Delete|Move|Open|ReadAll|WriteAll)/.test(
      content,
    )
  )
    return false;
  return true;
}

const COMBINE = /Path\.Combine\(/g;
const GET_DIRECTORY_NAME = /Path\.GetDirectoryName\b/g;
/** Reported, never rewritten — see the header. */
const GET_FULL_PATH = /Path\.GetFullPath\b/g;

export const zetafsVirtualPathDetector: Detector = {
  name: "zetafs-virtual-path",
  detect(tree: FileTree): readonly Finding[] {
    const findings: Finding[] = [];
    for (const [path, content] of tree) {
      if (!inScope(path, content)) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // The module that DEFINES the replacement names the old calls in its own docs.
        if (path.endsWith("ZetaFsPath.fs")) continue;
        if (/Path\.Combine\(/.test(line))
          findings.push({
            path,
            rule: "zetafs-virtual-path/combine",
            detail: `line ${String(i + 1)}: Path.Combine joins with the HOST separator; use ZetaFsPath.join / combine2..4`,
          });
        if (/Path\.GetDirectoryName\b/.test(line))
          findings.push({
            path,
            rule: "zetafs-virtual-path/dirname",
            detail: `line ${String(i + 1)}: Path.GetDirectoryName reads host separators; use ZetaFsPath.directoryName`,
          });
        if (/Path\.GetFullPath\b/.test(line))
          findings.push({
            path,
            rule: "zetafs-virtual-path/fullpath-tier2",
            detail: `line ${String(i + 1)}: Path.GetFullPath resolves against the process CWD — ambient state. NOT auto-healed: removing it changes behaviour for real-path callers. Needs a human.`,
          });
      }
    }
    return findings;
  },
};

/** Split a call's argument list on top-level commas, honouring nesting and strings. */
export function splitArgs(inner: string): readonly string[] | null {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  let inString = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]!;
    if (inString) {
      cur += c;
      if (c === '"' && inner[i - 1] !== "\\") inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      cur += c;
    } else if (c === "(" || c === "[") {
      depth++;
      cur += c;
    } else if (c === ")" || c === "]") {
      depth--;
      cur += c;
    } else if (c === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim().length > 0) out.push(cur.trim());
  // An unbalanced or unterminated call is DECLINED, not guessed at.
  if (depth !== 0 || inString) return null;
  return out;
}

/** `a` if it needs no parentheses as an F# argument, `(a)` otherwise. */
function asArg(a: string): string {
  return /^[\w.]+$/.test(a) || /^"[^"]*"$/.test(a) ? a : `(${a})`;
}

export function rewriteCombines(content: string): string {
  let out = content;
  for (;;) {
    COMBINE.lastIndex = 0;
    const m = COMBINE.exec(out);
    if (m === null) break;
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < out.length && depth > 0) {
      if (out[i] === "(") depth++;
      else if (out[i] === ")") depth--;
      i++;
    }
    if (depth !== 0) break; // unbalanced — decline the whole file's remaining calls
    const args = splitArgs(out.slice(start, i - 1));
    if (args === null || args.length === 0) break;
    const named: Record<number, string> = { 2: "combine2", 3: "combine3", 4: "combine4" };
    const fn = named[args.length];
    const replacement =
      fn === undefined ? `ZetaFsPath.join [ ${args.join("; ")} ]` : `ZetaFsPath.${fn} ${args.map(asArg).join(" ")}`;
    out = out.slice(0, m.index) + replacement + out.slice(i);
  }
  return out;
}

export const zetafsVirtualPathHealer: Healer = {
  name: "zetafs-virtual-path",
  heal(tree: FileTree): FileTree {
    const next = new Map(tree);
    for (const [path, content] of tree) {
      if (!inScope(path, content)) continue;
      if (path.endsWith("ZetaFsPath.fs")) continue;
      let healed = rewriteCombines(content);
      GET_DIRECTORY_NAME.lastIndex = 0;
      healed = healed
        .replace(/Path\.GetDirectoryName\s+([A-Za-z_][\w.]*)/g, "ZetaFsPath.directoryName $1")
        .replace(/Path\.GetDirectoryName\(/g, "ZetaFsPath.directoryName(");
      // GET_FULL_PATH is intentionally untouched — see the header.
      GET_FULL_PATH.lastIndex = 0;
      if (healed !== content) next.set(path, healed);
    }
    return next;
  },
};

// ═══ CLI: the DETECTOR as a loud check ══════════════════════════════════════
//
// The healer above is certified against the harness laws and is NOT yet registered in
// `run-tier0.ts`, because that runner reads `.ts/.tsx/.js/.md/.yml` and would have to be
// widened to `.fs` — which changes the blast radius of five other healers over a language
// none of them was written against. Registering it is a filed increment
// (081M1N97ECS087G0R003GCPEDZ), not something to slip in beside a fix.
//
// What ships today is the detector, running as a check that WRITES NOTHING. That is the
// half with no blast radius at all, and it is the half that stops the class coming back —
// a healer that can fix drift nobody is looking for is worth less than a detector that
// makes the drift loud.

async function main(): Promise<number> {
  const { readdirSync, readFileSync } = await import("node:fs");
  const root = "src/Core";
  const entries = new Map<string, string>();
  for (const name of readdirSync(root)) {
    if (!name.startsWith("ZetaFs") || !name.endsWith(".fs")) continue;
    entries.set(`${root}/${name}`, readFileSync(`${root}/${name}`, "utf8"));
  }

  // ZERO FILES IS AN ALARM, NOT A PASS. A renamed directory or a changed prefix would
  // otherwise make this check report "no drift" over nothing at all, which is the shape
  // this repository treats as its worst failure.
  if (entries.size === 0) {
    console.log(
      "::error::[zetafs-virtual-path] found no src/Core/ZetaFs*.fs files at all — the walk is broken, and zero findings over zero inputs is a check that did not run",
    );
    return 1;
  }

  const findings = zetafsVirtualPathDetector.detect(entries);
  const rewritable = findings.filter((f) => f.rule !== "zetafs-virtual-path/fullpath-tier2");
  const tier2 = findings.filter((f) => f.rule === "zetafs-virtual-path/fullpath-tier2");

  console.log(`[zetafs-virtual-path] scanned ${String(entries.size)} ZetaFs module(s)`);
  for (const f of rewritable) console.log(`::error::[zetafs-virtual-path] ${f.path}: ${f.detail}`);
  // Tier 2 is a WARNING: it is a real finding and it is not one this check may fix, so
  // failing on it would make the check permanently red for a decision it cannot make.
  for (const f of tier2) console.log(`::warning::[zetafs-virtual-path] ${f.path}: ${f.detail}`);

  console.log(
    rewritable.length === 0
      ? `[zetafs-virtual-path] no host-separator path construction; ${String(tier2.length)} tier-2 finding(s) reported above.`
      : `[zetafs-virtual-path] ${String(rewritable.length)} call site(s) build ZetaFS paths with the host separator. Use ZetaFsPath.`,
  );
  return rewritable.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  process.exit(await main());
}
