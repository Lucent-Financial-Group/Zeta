#!/usr/bin/env bun
// check-md032-blanks-around-lists.ts — pre-CI catch for MD032 violations.
//
// MD032 (markdownlint rule): "Lists should be surrounded by blank lines."
// Common failure mode in tick shards: a label sentence ending with `:`
// is immediately followed by a list item with no blank line between.
//
// Example (BAD — fires MD032):
//
//   Each row:
//   - id: updated
//   - title: updated
//
// Example (GOOD):
//
//   Each row:
//
//   - id: updated
//   - title: updated
//
// This helper catches the same pattern that markdownlint catches but
// runs locally (faster feedback) and pre-push (before the CI cycle).
//
// Scope: detects the most common pattern — a non-blank, non-list line
// immediately followed by a list item (`- `, `+ `, `* `, or `1. ` style).
// Markdownlint catches more variants; this is the minimal helper that
// catches the 5 recurring failures from the 2026-05-13/14 session.
//
// Exit codes:
//   0 — no findings (or no files processed)
//   1 — findings present; emits `file:line` for each
//
// CLI usage:
//   bun tools/hygiene/check-md032-blanks-around-lists.ts <file1> <file2> ...
//   bun tools/hygiene/check-md032-blanks-around-lists.ts --staged
//
// B-0456 — see docs/backlog/P2/B-0456-mechanize-md032-blanks-around-lists-pre-commit-2026-05-14.md

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, relative } from "node:path";

export type Md032Finding = {
  file: string;
  line: number; // 1-indexed line where the list starts (after the bad break)
  context: string; // the first 60 chars of the offending list line
};

/**
 * Detect whether a line is a list-item start.
 *
 * Matches the three unordered-list markers (`-`, `+`, `*`) and both
 * ordered-list punctuation forms (`1.` and `1)`, plus multi-digit
 * variants like `12.` / `12)`), each followed by at least one space.
 * CommonMark + markdownlint treat both `1.` and `1)` as ordered-list
 * markers; omitting `1)` lets a `Label:` followed by `1) item` pass
 * locally while still firing MD032 in CI (pre-CI review P1 on PR
 * #3075 round 6).
 *
 * CommonMark allows list markers indented 0-3 spaces; 4+ spaces is
 * treated as indented code, not a list — `[ ]{0,3}` enforces that
 * boundary so a code block line like `    - option` isn't falsely
 * flagged as a list start (pre-CI review P1 on PR #3075 round 1).
 */
function isListItemStart(line: string): boolean {
  // CommonMark caps ordered-list markers at 9 digits (`{1,9}`); a
  // longer numeric prefix like `1234567890. value` is not an
  // ordered-list item per the spec — markdownlint will not flag MD032
  // on a label preceding it, so neither should this helper (pre-CI
  // review P1 on PR #3075 round 8).
  //
  // Optional leading blockquote prefixes (`>` and `> >`...) are
  // accepted so a list inside a blockquote (e.g. `> - item` or
  // `> > 1) nested`) is still recognised as a list-item start.
  // markdownlint MD032 enforces blanks around lists even inside
  // blockquotes (pre-CI review P1 on PR #3075 round 9).
  return /^ {0,3}(>\s?)*([-+*]|\d{1,9}[.)])\s+/.test(line);
}

/**
 * A line is "blank" if it contains only whitespace, OR if it is a
 * blockquoted blank line — a line whose only non-whitespace content
 * is `>` markers (e.g., `>`, `> `, `>>`). Markdownlint treats such
 * lines as the blockquote-equivalent of a blank line, so a list
 * inside a blockquote can be properly preceded by a `>`-only line
 * without firing MD032 (pre-CI review P1 on PR #3075 round 9).
 */
function isBlank(line: string): boolean {
  return /^\s*$/.test(line) || /^ {0,3}(>\s?)+$/.test(line);
}

/**
 * ATX heading detection (`#` through `######` followed by a space).
 * Optional leading blockquote markers are accepted so a heading
 * inside a blockquote (`> ## title`) is still recognised.
 *
 * Headings are list-block terminators per CommonMark: a heading
 * between two bullet lists splits them into separate lists, and
 * MD032 fires on the second list (pre-CI review P1 on PR #3075
 * round 12).
 */
function isHeading(line: string): boolean {
  return /^ {0,3}(?:>\s?)*#{1,6}\s+/.test(line);
}

/**
 * A line is "list-friendly leading" if it can come right before a list
 * without an intervening blank. Two valid cases:
 *
 * 1. Already a list-item line (the prior bullet — sibling/nested list).
 * 2. An indented continuation of a list item — BUT ONLY when we are
 *    already confirmed to be inside a list block (`inList === true`).
 *    Without the `inList` guard, ordinary prose indented 1–3 spaces
 *    (which CommonMark permits) would be treated as list continuation
 *    and suppress a real MD032 violation (pre-CI review P1 on PR #3075
 *    round 2).
 *
 * Note: ATX headings are intentionally NOT list-friendly. markdownlint's
 * blanks-around-lists check requires a blank line before a list even
 * when the preceding line is a heading — treating headings as exempt
 * produces false negatives in CI (pre-CI review P1 on PR #3075 round 2).
 */
function isListFriendlyLeading(line: string, inList: boolean): boolean {
  // Already a list item — nested or sibling list, both fine.
  if (isListItemStart(line)) return true;
  // Indented continuation of a list-item body — only suppress if we are
  // already inside an established list block so that arbitrary indented
  // prose lines do not get a free pass.
  if (inList && /^\s+\S/.test(line)) return true;
  return false;
}

/**
 * Parse a fenced-code-block delimiter (`\`\`\`` or `~~~`), returning
 * the fence character, run length, and whether the line could close
 * an open fence. The token must be on its own line (indented up to 3
 * spaces per CommonMark) and the run must be 3+ chars.
 *
 * `closer === true` when the line has only whitespace after the run.
 * Per CommonMark, an opening fence may carry an info string (e.g.,
 * ` ```ts `), but a closing fence cannot. Treating every fence line
 * as a potential closer would let an inner same-delimiter info-string
 * line (a code-sample example) terminate the outer block prematurely
 * and falsely flag the list-like lines that follow inside the outer
 * block as MD032 violations (pre-CI review P1 on PR #3075 round 4).
 *
 * Tracking the (char, len) pair — not just a boolean — is what lets a
 * fenced block containing an inner fence example with a *different*
 * delimiter or *shorter* run keep the outer block open (pre-CI review
 * P2 on PR #3075 round 2).
 */
function fenceInfo(line: string): { char: "`" | "~"; len: number; closer: boolean } | null {
  // Optional leading blockquote markers (`> `, `> > `) so a fenced
  // block INSIDE a blockquote is recognised. Without this, a sample
  // like `> \`\`\`` containing `> - item` would be reported as MD032
  // even though markdownlint treats it as fenced code (pre-CI review
  // P1 on PR #3075 round 12).
  const m = line.match(/^ {0,3}(?:>\s?)*(`{3,}|~{3,})(.*)$/);
  if (!m) return null;
  const run = m[1] ?? "";
  const tail = m[2] ?? "";
  const char: "`" | "~" = run[0] === "`" ? "`" : "~";
  // CommonMark: a BACKTICK-fence opener's info string must not contain
  // a backtick (otherwise the inline-code grammar takes over and the
  // line is not a fence). A TILDE-fence opener's info string CAN
  // contain tildes — only the backtick variant has the restriction.
  // Treating ` ```ts`extra ` as a fence would suppress real MD032
  // findings in ordinary prose; rejecting `~~~text~bad` as a fence
  // would falsely flag list-like content inside a valid tilde-fenced
  // block (pre-CI review P1 on PR #3075 round 8 + round 10
  // refinement).
  if (char === "`" && tail.includes("`")) return null;
  return {
    char,
    len: run.length,
    closer: /^\s*$/.test(tail),
  };
}

export function findMd032Violations(content: string): { line: number; context: string }[] {
  const lines = content.split(/\r?\n/);
  const findings: { line: number; context: string }[] = [];
  // Track fenced-code-block state so list-like lines INSIDE code samples
  // (e.g., a documentation example showing a bad MD032 pattern) aren't
  // flagged. The state remembers the opening delimiter (char + length)
  // so a nested inner fence with a different char or shorter run can't
  // close the outer block (pre-CI review P2 on PR #3075 round 2).
  let openFence: { char: "`" | "~"; len: number } | null = null;
  // Track whether we are inside a list block (reset by blank lines and
  // fence boundaries). Used by isListFriendlyLeading to avoid treating
  // ordinary indented prose as list continuation (pre-CI review P1 on
  // PR #3075 round 2).
  let inList = false;

  // Determine the start-of-content cursor, skipping YAML front matter if
  // present. Markdownlint treats the YAML block between leading `---`
  // fences as metadata, NOT as Markdown content — list-like keys (e.g.,
  // `tags:` followed by `- item`) inside front matter must not fire
  // MD032 locally (pre-CI review P2 on PR #3075 round 7).
  let startLine = 0;
  if (lines[0] === "---") {
    let j = 1;
    while (j < lines.length && lines[j] !== "---") j++;
    if (j < lines.length) {
      // Closing `---` found; skip everything through it.
      startLine = j + 1;
    }
    // No closing fence → not a real front matter block; fall back to
    // scanning the whole file from line 0.
  }

  // Start at startLine so a fenced-code open on the first content line
  // is still recorded; the original i=1 start (back when no front-matter
  // skip existed) caused the fence-state to be wrong for files whose
  // first line was a fence marker (pre-CI review P1 on PR #3075 round 2).
  for (let i = startLine; i < lines.length; i++) {
    const cur = lines[i] ?? "";

    // Update fence state BEFORE the list-start check so a fence line
    // itself never registers as a list-start candidate.
    const fence = fenceInfo(cur);
    if (fence !== null) {
      if (openFence === null) {
        // Opening a new fence. Info string permitted on opener.
        //
        // An INDENTED fence (1+ leading space, possibly after `>`
        // blockquote markers) is a child block inside the current
        // list-item body — keep `inList` so a sibling bullet that
        // follows isn't false-flagged as a new list.
        //
        // A FLUSH-LEFT fence (zero leading space, no blockquote
        // prefix) is a top-level block that terminates the prior
        // list per CommonMark — reset `inList` so a list-start
        // that follows fires MD032 correctly (pre-CI review P1
        // on PR #3075 round 12, refining the round-10 over-relaxation).
        if (!/^[ \t>]/.test(cur)) {
          inList = false;
        }
        openFence = { char: fence.char, len: fence.len };
        continue;
      }
      // We're inside an open fence. Closing requires:
      // - matching delimiter char
      // - run length >= opener's
      // - no info string / trailing text (closer === true)
      // Otherwise the fence-like line is still inside the code block
      // (an inner same-delim opener with info string, or different
      // delimiter / shorter run) and the outer block stays open.
      if (
        fence.char === openFence.char &&
        fence.len >= openFence.len &&
        fence.closer
      ) {
        openFence = null;
        // Keep `inList` across the close — the open already set the
        // correct list-context state.
      }
      // else: still inside the code block — list state irrelevant.
      continue;
    }
    if (openFence !== null) continue;

    if (isBlank(cur)) {
      inList = false;
      continue;
    }

    if (isHeading(cur)) {
      // ATX heading terminates the prior list per CommonMark. A list
      // immediately after the heading is conceptually a new list; MD032
      // requires a blank line between heading and list. The list-start
      // branch already flags that case when prev = heading and inList
      // = false (round-2 fix). What was missing: when a heading appears
      // BETWEEN two bullet lists, the second bullet was treated as a
      // continuation of the first list (false negative). Resetting
      // inList here makes the second bullet a new-list candidate so
      // its predecessor (the heading) triggers MD032 (pre-CI review
      // P1 on PR #3075 round 12).
      inList = false;
      continue;
    }

    if (isListItemStart(cur)) {
      // Only check the predecessor when ENTERING a new list. When
      // `inList` is already true, this list-item is a sibling/nested
      // member of the same list and the previous line (a sibling
      // item or a lazy-continuation of the previous item's paragraph)
      // is not subject to MD032 (pre-CI review P1 on PR #3075 round 8
      // — without this guard, an unindented continuation between two
      // list items would falsely fire on the second bullet).
      if (!inList && i > startLine) {
        // The `i > startLine` guard (rather than `i > 0`) means a list
        // immediately after a YAML front-matter block is treated as
        // start-of-content, not as missing-blank-line.
        const prev = lines[i - 1] ?? "";
        if (!isBlank(prev) && !isListFriendlyLeading(prev, inList)) {
          findings.push({
            line: i + 1, // 1-indexed
            context: cur.slice(0, 60),
          });
        }
      }
      inList = true;
    } else {
      // Non-list, non-blank, non-heading, non-fence line. CommonMark
      // allows BOTH indented and lazy (unindented) continuations of a
      // list-item paragraph, so we keep `inList` unchanged here — the
      // list block only ends on a blank line, an ATX heading, or a
      // fence boundary (all handled above). The earlier algorithm reset
      // `inList = false` on unindented prose, which made
      //   - first line
      //   continued text
      //   - next item
      // produce a false MD032 on the second bullet because the helper
      // had already considered the list ended (pre-CI review P1 on PR
      // #3075 round 8).
    }
  }
  return findings;
}

/**
 * Walk a list of files; collect MD032 findings; return them as an
 * array. The CLI `main()` owns the output boundary (stderr emit,
 * exit code).
 *
 * @param files - Paths to scan.
 * @param surfaceReadErrors - When true, throw on unreadable files so
 *   the caller (main) can exit non-zero. When false (default, used for
 *   --staged mode), unreadable files are skipped silently — push or CI
 *   will surface the underlying I/O error (pre-CI review P1 on PR #3075
 *   round 2).
 */
export function checkFiles(files: string[], surfaceReadErrors = false): Md032Finding[] {
  const all: Md032Finding[] = [];
  for (const f of files) {
    let content: string;
    try {
      content = readFileSync(f, "utf-8");
    } catch (e) {
      if (surfaceReadErrors) {
        throw Object.assign(
          new Error(`Cannot read '${f}': ${(e as NodeJS.ErrnoException).message ?? String(e)}`),
          { cause: e },
        );
      }
      continue; // --staged mode: silently skip; push/CI surfaces the I/O error
    }
    const findings = findMd032Violations(content);
    for (const finding of findings) {
      all.push({
        file: f,
        line: finding.line,
        context: finding.context,
      });
    }
  }
  return all;
}

/**
 * Convert a markdownlint-cli2 `ignores` glob into an anchored regex.
 *
 * Supported syntax (matches the subset used in `.markdownlint-cli2.jsonc`):
 *
 * - `**` — any number of path segments, including the following `/`
 *   (so `memory/**` matches `memory/anything/deep`)
 * - `*` — any sequence of non-`/` characters (one segment)
 * - `?` — any single non-`/` character
 * - Everything else is matched literally (with regex specials escaped).
 */
export function globToRegex(glob: string): RegExp {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i] ?? "";
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i += 2;
      if (glob[i] === "/") i++;
    } else if (c === "*") {
      re += "[^/]*";
      i++;
    } else if (c === "?") {
      re += "[^/]";
      i++;
    } else if (".+^$|()[]{}\\".includes(c)) {
      re += "\\" + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += "$";
  return new RegExp(re);
}

/**
 * Read `ignores` from `.markdownlint-cli2.jsonc` (JSONC with line
 * comments). Returns `[]` when the file is absent or unparseable —
 * a missing config is not a gate failure; CI will surface a real
 * misconfiguration on its own.
 */
export function loadMarkdownlintIgnores(repoRoot: string): string[] {
  const cfg = `${repoRoot}/.markdownlint-cli2.jsonc`;
  let raw: string;
  try {
    raw = readFileSync(cfg, "utf-8");
  } catch {
    return [];
  }
  // Strip `// ...` line comments. The config does not use `/* ... */`
  // block comments today; if that ever changes, extend here.
  const stripped = raw.replace(/\/\/[^\n]*/g, "");
  try {
    const json = JSON.parse(stripped) as { ignores?: unknown };
    if (Array.isArray(json.ignores)) {
      return json.ignores.filter((g): g is string => typeof g === "string");
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Collect staged `.md` files via `git diff --name-only --cached`.
 *
 * Throws if the git command fails so the caller can exit non-zero
 * instead of silently scanning zero files (pre-CI review P1 on
 * PR #3075 round 2). Includes renames (`R`) so `git mv old.md new.md`
 * with edits is still scanned — markdownlint will lint `new.md` in
 * CI regardless (pre-CI review P2 on PR #3075 round 3).
 *
 * Applies the markdownlint-cli2 `ignores` list so paths under
 * `memory/**`, `docs/pr-preservation/**`, `docs/history/pr-reviews/**`,
 * the date-prefixed `docs/research/2026-*-*.md`, etc., are NOT scanned
 * locally — those are verbatim / archive surfaces that CI itself
 * ignores, so a pre-push gate that flagged them would diverge from
 * CI behavior (pre-CI review P1 on PR #3075 round 6).
 */
export function stagedMarkdownFiles(repoRoot: string): string[] {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- git invoked as explicit args array; no shell, no user input on the command line.
  const r = spawnSync(
    "git",
    ["-C", repoRoot, "diff", "--name-only", "--cached", "--diff-filter=AMR"],
    { encoding: "utf-8" },
  );
  if (r.status !== 0 || r.error) {
    // `spawnSync` returns `r.error` when the process couldn't be
    // launched at all (e.g., `git` not on PATH, EACCES) — in that case
    // `r.status` is null and `r.stderr` is typically empty. Surfacing
    // `r.error.message` makes the failure diagnosable instead of just
    // "unknown error" (pre-CI review P2 on PR #3075 round 8).
    const reason =
      r.error?.message ??
      (r.stderr ? r.stderr.trim() : "") ??
      "unknown error";
    throw new Error(`git diff --cached failed: ${reason || "unknown error"}`);
  }
  const ignoreRes = loadMarkdownlintIgnores(repoRoot).map(globToRegex);
  return (r.stdout ?? "")
    .split("\n")
    .filter((line) => line.endsWith(".md"))
    .filter((line) => !ignoreRes.some((re) => re.test(line)))
    .map((line) => `${repoRoot}/${line}`);
}

export function main(): number {
  const repoRoot = resolve(import.meta.dir, "..", "..");
  const argv = process.argv.slice(2);
  const isStaged = argv.includes("--staged");

  let files: string[] = [];
  if (isStaged) {
    try {
      files = stagedMarkdownFiles(repoRoot);
    } catch (e) {
      console.error(`check-md032: ${(e as Error).message}`);
      return 1;
    }
    if (files.length === 0) {
      console.log("check-md032: no staged .md files");
      return 0;
    }
  } else if (argv.length === 0) {
    console.error(
      "Usage: check-md032-blanks-around-lists.ts <file1> <file2> ... | --staged",
    );
    return 1;
  } else {
    files = argv.map((f) => (f.startsWith("/") ? f : resolve(f)));
  }

  let findings: Md032Finding[];
  try {
    // Surface read errors for explicit file paths; suppress for --staged
    // (CI will catch the broken file at push time).
    findings = checkFiles(files, !isStaged);
  } catch (e) {
    console.error(`check-md032: ${(e as Error).message}`);
    return 1;
  }

  if (findings.length === 0) {
    console.log(`check-md032: ${files.length} file(s) scanned, no MD032 findings`);
    return 0;
  }

  console.error(`check-md032: ${findings.length} MD032 finding(s):`);
  for (const f of findings) {
    const rel = f.file.startsWith(repoRoot) ? relative(repoRoot, f.file) : f.file;
    console.error(`  ${rel}:${f.line}: ${f.context}`);
  }
  return 1;
}

if (import.meta.main) {
  process.exit(main());
}
