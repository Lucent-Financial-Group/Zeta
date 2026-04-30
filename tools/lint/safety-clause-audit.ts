#!/usr/bin/env bun
// safety-clause-audit.ts — counts how many .claude/skills/*/SKILL.md
// files carry an explicit scope-limiting ("what this skill does NOT
// do" or equivalent) section.
//
// TypeScript+Bun port of safety-clause-audit.sh, slice 7 of the
// TS+Bun migration. See docs/best-practices/repo-scripting.md.
//
// Promotes the `every-skill-has-safety-clause` invariant in
// .claude/skills/prompt-protector/skill.yaml from `guess` to
// `observed` — we now have a mechanical count, not a subjective
// impression.
//
// Matches three heading patterns in order of decreasing confidence:
//   H1 — explicit "NOT do" heading
//   H2 — scope heading (## Scope, ## Out of scope)
//   H3 — authority-boundary heading (## does-not-audit)
//
// Usage:
//   bun tools/lint/safety-clause-audit.ts                  # summary
//   bun tools/lint/safety-clause-audit.ts --list-missing   # names only
//   bun tools/lint/safety-clause-audit.ts --verbose        # per-skill
//   bun tools/lint/safety-clause-audit.ts --fail-over N    # exit 1 if
//                                                          # MISSING > N
//
// Exit codes:
//   0   audit ran (irrespective of MISSING count, unless --fail-over)
//   1   MISSING > N when --fail-over N specified

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

type ExitCode = 0 | 1;
type Mode = "summary" | "list-missing" | "verbose";
type Tier = "H1" | "H2" | "H3" | "MISSING";

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;

// H1 patterns split into a small pattern list to keep each individual
// regex under sonarjs/regex-complexity threshold (20). The bash
// original packed all alternatives into one pattern; here we test
// each variant separately and OR via .some().
// Each H1 regex stays under sonarjs/regex-complexity threshold (20)
// by using a non-capturing optional `do` suffix and the /i flag for
// NOT/not equivalence (matches the bash original's case-insensitive
// `grep -iqE`).
const H1_PATTERNS: readonly RegExp[] = [
  /^#+[\t ]+What[\t ]+this[\t ]+skill[\t ]+does[\t ]+not(?:[\t ]+do)?\b/im,
  /^#+[\t ]+What[\t ]+this[\t ]+skill[\t ]+(?:don't|doesn't)[\t ]+do\b/im,
  /^#+[\t ]+What[\t ]+this[\t ]+agent[\t ]+does[\t ]+not(?:[\t ]+do)?\b/im,
  /^#+[\t ]+What[\t ]+this[\t ]+agent[\t ]+(?:don't|doesn't)[\t ]+do\b/im,
  /^#+[\t ]+What[\t ]+(?:he|she|they|I)[\t ]+does[\t ]+not(?:[\t ]+do)?\b/im,
  /^#+[\t ]+What[\t ]+(?:he|she|they|I)[\t ]+(?:don't|doesn't)[\t ]+do\b/im,
  /^#+[\t ]+What[\t ]+it[\t ]+does[\t ]+not(?:[\t ]+do)?\b/im,
  /^#+[\t ]+What[\t ]+it[\t ]+(?:don't|doesn't)[\t ]+do\b/im,
];

const H2_PATTERNS: readonly RegExp[] = [
  /^#+[\t ]+Scope\b/im,
  /^#+[\t ]+What[\t ]+this[\t ]+skill[\t ]+does[\t ]+not[\t ]+cover\b/im,
  /^#+[\t ]+Out[\t ]+of[\t ]+scope\b/im,
];

const H3_PATTERNS: readonly RegExp[] = [
  /^#+[\t ]+does-not-audit\b/im,
  /^#+[\t ]+What[\t ]+this[\t ]+skill[\t ]+does[\t ]+not[\t ]+audit\b/im,
];

interface ParsedArgs {
  readonly mode: Mode;
  readonly failOver: number | null;
}

interface SkillResult {
  readonly name: string;
  readonly tier: Tier;
}

interface AuditCounts {
  readonly total: number;
  readonly h1: number;
  readonly h2: number;
  readonly h3: number;
  readonly missing: number;
  readonly h1List: readonly string[];
  readonly h2List: readonly string[];
  readonly h3List: readonly string[];
  readonly missingList: readonly string[];
}

function repoRoot(): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  if (result.status !== 0) return process.cwd();
  return result.stdout.trim();
}

interface FailOverParse {
  readonly value: number | null;
  readonly consumeNext: boolean;
}

function parseFailOverArg(
  arg: string,
  next: string | undefined,
): FailOverParse {
  if (arg === "--fail-over") {
    if (next === undefined) return { value: null, consumeNext: false };
    const parsed = Number.parseInt(next, 10);
    return {
      value: Number.isNaN(parsed) ? null : parsed,
      consumeNext: true,
    };
  }
  if (arg.startsWith("--fail-over=")) {
    const parsed = Number.parseInt(arg.slice("--fail-over=".length), 10);
    return {
      value: Number.isNaN(parsed) ? null : parsed,
      consumeNext: false,
    };
  }
  return { value: null, consumeNext: false };
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let mode: Mode = "summary";
  let failOver: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--list-missing") {
      mode = "list-missing";
      continue;
    }
    if (arg === "--verbose") {
      mode = "verbose";
      continue;
    }
    const fo = parseFailOverArg(arg, argv[i + 1]);
    if (fo.value !== null) failOver = fo.value;
    if (fo.consumeNext) i++;
  }
  return { mode, failOver };
}

function listSkillFiles(skillsDir: string): readonly string[] {
  let entries: readonly import("node:fs").Dirent[];
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillMd = join(skillsDir, e.name, "SKILL.md");
    try {
      if (statSync(skillMd).isFile()) out.push(skillMd);
    } catch {
      continue;
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function matchesAny(content: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => re.test(content));
}

function classifySkill(content: string): Tier {
  if (matchesAny(content, H1_PATTERNS)) return "H1";
  if (matchesAny(content, H2_PATTERNS)) return "H2";
  if (matchesAny(content, H3_PATTERNS)) return "H3";
  return "MISSING";
}

function auditSkills(files: readonly string[]): AuditCounts {
  const results: SkillResult[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const name = basename(dirname(file));
    results.push({ name, tier: classifySkill(content) });
  }
  const h1List = results.filter((r) => r.tier === "H1").map((r) => r.name);
  const h2List = results.filter((r) => r.tier === "H2").map((r) => r.name);
  const h3List = results.filter((r) => r.tier === "H3").map((r) => r.name);
  const missingList = results
    .filter((r) => r.tier === "MISSING")
    .map((r) => r.name);
  return {
    total: results.length,
    h1: h1List.length,
    h2: h2List.length,
    h3: h3List.length,
    missing: missingList.length,
    h1List,
    h2List,
    h3List,
    missingList,
  };
}

function formatPercent(numerator: number, total: number): string {
  if (total === 0) return "0.0";
  return ((100 * numerator) / total).toFixed(1);
}

function emitListMissing(c: AuditCounts): void {
  if (c.missingList.length === 0) {
    process.stdout.write("\n");
    return;
  }
  for (const name of c.missingList) process.stdout.write(`${name}\n`);
}

function emitVerboseRow(name: string, tier: string): void {
  if (name.length > 0) process.stdout.write(`| \`${name}\` | ${tier} |\n`);
}

function emitVerbose(c: AuditCounts): void {
  process.stdout.write("# Safety-clause audit — per skill\n");
  process.stdout.write("\n");
  process.stdout.write("| Skill | Tier |\n");
  process.stdout.write("|---|---|\n");
  for (const n of c.h1List) emitVerboseRow(n, "H1 explicit");
  for (const n of c.h2List) emitVerboseRow(n, "H2 scope");
  for (const n of c.h3List) emitVerboseRow(n, "H3 authority");
  for (const n of c.missingList) emitVerboseRow(n, "MISSING");
  process.stdout.write("\n");
}

function emitSummary(c: AuditCounts): void {
  const covered = c.h1 + c.h2 + c.h3;
  const pctCov = formatPercent(covered, c.total);
  const pctH1 = formatPercent(c.h1, c.total);
  process.stdout.write("# Safety-clause audit — summary\n");
  process.stdout.write("\n");
  process.stdout.write(
    "Counts of `.claude/skills/*/SKILL.md` files carrying a\n",
  );
  process.stdout.write("scope-limiting clause. Promotes the\n");
  process.stdout.write("`every-skill-has-safety-clause` invariant in\n");
  process.stdout.write("`.claude/skills/prompt-protector/skill.yaml` from `guess`\n");
  process.stdout.write("to `observed`.\n");
  process.stdout.write("\n");
  process.stdout.write("| Tier | Pattern | Count |\n");
  process.stdout.write("|---|---|---:|\n");
  process.stdout.write(
    `| H1 | explicit "does NOT do" heading | ${String(c.h1)} |\n`,
  );
  process.stdout.write(
    `| H2 | "Scope" / "Out of scope" heading | ${String(c.h2)} |\n`,
  );
  process.stdout.write(
    `| H3 | "does-not-audit" / equivalent | ${String(c.h3)} |\n`,
  );
  process.stdout.write(
    `| MISSING | no scope-limiting heading | ${String(c.missing)} |\n`,
  );
  process.stdout.write(`| **total** | | **${String(c.total)}** |\n`);
  process.stdout.write("\n");
  process.stdout.write(
    `Covered (H1+H2+H3): **${String(covered)} / ${String(c.total)}** — **${pctCov}%**.\n`,
  );
  process.stdout.write(
    `H1-only (strongest): **${String(c.h1)} / ${String(c.total)}** — **${pctH1}%**.\n`,
  );
  process.stdout.write("\n");
  process.stdout.write(`Missing count: **${String(c.missing)}**.\n`);
}

export function main(argv: readonly string[]): ExitCode {
  const root = repoRoot();
  const skillsDir = join(root, ".claude", "skills");
  const { mode, failOver } = parseArgs(argv);

  const files = listSkillFiles(skillsDir);
  const counts = auditSkills(files);

  if (mode === "list-missing") emitListMissing(counts);
  else if (mode === "verbose") emitVerbose(counts);
  else emitSummary(counts);

  if (failOver !== null && counts.missing > failOver) {
    process.stderr.write(
      `FAIL: missing=${String(counts.missing)} exceeds threshold ${String(failOver)}\n`,
    );
    return 1;
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
