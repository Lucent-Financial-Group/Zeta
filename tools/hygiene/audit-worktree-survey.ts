#!/usr/bin/env bun
// audit-worktree-survey.ts -- classify git worktrees into the lost-substrate
// recovery buckets from B-0090.5.
//
// Usage:
//   bun tools/hygiene/audit-worktree-survey.ts
//   bun tools/hygiene/audit-worktree-survey.ts --json
//   bun tools/hygiene/audit-worktree-survey.ts --root PATH
//   bun tools/hygiene/audit-worktree-survey.ts --report PATH
//   bun tools/hygiene/audit-worktree-survey.ts --dry
//
// Exit codes:
//   0   survey completed
//   64  argument error
//   128 git worktree list failed

import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type AuditExitCode = 0 | 64 | 128;

type WorktreeBucket = "ALREADY-COVERED" | "NEEDS-RECOVERY" | "OBSOLETE";

interface Args {
  readonly root: string | null;
  readonly report: string | null;
  readonly json: boolean;
  readonly dry: boolean;
}

interface WorktreeEntry {
  readonly path: string;
  readonly head: string | null;
  readonly branch: string | null;
  readonly locked: boolean;
  readonly lockReason: string | null;
  readonly prunable: boolean;
}

interface WorktreeInspection {
  readonly pathExists: boolean;
  readonly dirty: boolean | null;
  readonly headReachableFromMain: boolean | null;
  readonly patchEquivalentToMain: boolean | null;
  readonly statusError: string | null;
}

interface WorktreeSurveyItem extends WorktreeEntry, WorktreeInspection {
  readonly bucket: WorktreeBucket;
  readonly reason: string;
}

interface WorktreeSurvey {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly root: string | null;
  readonly totals: {
    readonly worktrees: number;
    readonly alreadyCovered: number;
    readonly needsRecovery: number;
    readonly obsolete: number;
  };
  readonly items: readonly WorktreeSurveyItem[];
}

interface Inspector {
  readonly inspect: (entry: WorktreeEntry) => WorktreeInspection;
}

function hasFlagValue(value: string | undefined): value is string {
  return value !== undefined && value.length > 0 && !value.startsWith("-");
}

function parseArgs(argv: string[]): { kind: "args"; args: Args } | { kind: "error"; message: string } {
  let root: string | null = null;
  let report: string | null = null;
  let json = false;
  let dry = false;
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i]!;
    if (arg === "--root") {
      const next = argv[i + 1];
      if (!hasFlagValue(next)) return { kind: "error", message: "--root requires a path" };
      root = next;
      i += 2;
    } else if (arg === "--report") {
      const next = argv[i + 1];
      if (!hasFlagValue(next)) return { kind: "error", message: "--report requires a path" };
      report = next;
      i += 2;
    } else if (arg === "--json") {
      json = true;
      i += 1;
    } else if (arg === "--dry") {
      dry = true;
      i += 1;
    } else {
      return { kind: "error", message: `Unknown argument: ${arg}` };
    }
  }

  return { kind: "args", args: { root, report, json, dry } };
}

function gitArgs(root: string | null, args: readonly string[]): string[] {
  return root === null ? [...args] : ["-C", root, ...args];
}

function parseWorktreePorcelain(stdout: string): WorktreeEntry[] {
  const entries: WorktreeEntry[] = [];
  for (const block of stdout.split("\n\n")) {
    if (!block.trim()) continue;

    let path = "";
    let head: string | null = null;
    let branch: string | null = null;
    let locked = false;
    let lockReason: string | null = null;
    let prunable = false;

    for (const line of block.split("\n")) {
      if (line.startsWith("worktree ")) path = line.slice(9);
      else if (line.startsWith("HEAD ")) head = line.slice(5);
      else if (line.startsWith("branch ")) branch = line.slice(7);
      else if (line === "locked") locked = true;
      else if (line.startsWith("locked ")) {
        locked = true;
        lockReason = line.slice(7);
      } else if (line === "prunable" || line.startsWith("prunable ")) prunable = true;
    }

    if (path.length > 0) entries.push({ path, head, branch, locked, lockReason, prunable });
  }
  return entries;
}

function classify(entry: WorktreeEntry, inspection: WorktreeInspection): Pick<WorktreeSurveyItem, "bucket" | "reason"> {
  if (!inspection.pathExists && entry.prunable) {
    return {
      bucket: "OBSOLETE",
      reason: "git marks the worktree prunable and the working path is missing",
    };
  }

  if (!inspection.pathExists) {
    return {
      bucket: "NEEDS-RECOVERY",
      reason: "working path is missing but git did not mark the entry prunable",
    };
  }

  if (inspection.statusError !== null) {
    return {
      bucket: "NEEDS-RECOVERY",
      reason: `worktree status could not be read: ${inspection.statusError}`,
    };
  }

  if (inspection.dirty === true) {
    return {
      bucket: "NEEDS-RECOVERY",
      reason: "worktree has uncommitted or untracked changes",
    };
  }

  if (inspection.headReachableFromMain === true) {
    return {
      bucket: "ALREADY-COVERED",
      reason: "clean worktree HEAD is reachable from origin/main",
    };
  }

  if (inspection.patchEquivalentToMain === true) {
    return {
      bucket: "ALREADY-COVERED",
      reason: "clean worktree changes are patch-equivalent to origin/main",
    };
  }

  return {
    bucket: "NEEDS-RECOVERY",
    reason: "clean worktree HEAD is not known reachable or patch-equivalent to origin/main",
  };
}

function classifyWorktrees(entries: readonly WorktreeEntry[], inspector: Inspector): WorktreeSurveyItem[] {
  return entries.map((entry) => {
    const inspection = inspector.inspect(entry);
    const bucket = classify(entry, inspection);
    return { ...entry, ...inspection, ...bucket };
  });
}

function makeSurvey(
  entries: readonly WorktreeEntry[],
  inspector: Inspector,
  now: Date,
  root: string | null,
): WorktreeSurvey {
  const scopedEntries = entries.filter((entry) => entry.locked || entry.prunable);
  const items = classifyWorktrees(scopedEntries, inspector);
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    root,
    totals: {
      worktrees: items.length,
      alreadyCovered: items.filter((item) => item.bucket === "ALREADY-COVERED").length,
      needsRecovery: items.filter((item) => item.bucket === "NEEDS-RECOVERY").length,
      obsolete: items.filter((item) => item.bucket === "OBSOLETE").length,
    },
    items,
  };
}

function renderBranch(branch: string | null): string {
  return branch === null ? "_(detached)_" : renderInlineCode(branch);
}

function renderNullableBoolean(value: boolean | null): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
}

function longestBacktickRun(value: string): number {
  const runs = value.match(/`+/g);
  return runs === null ? 0 : Math.max(...runs.map((run) => run.length));
}

function renderInlineCode(value: string): string {
  const fence = "`".repeat(longestBacktickRun(value) + 1);
  const padding =
    value.startsWith("`") || value.endsWith("`") || value.startsWith(" ") || value.endsWith(" ") ? " " : "";
  return `${fence}${padding}${value}${padding}${fence}`;
}

function renderCoveredByMain(item: WorktreeSurveyItem): string {
  if (item.headReachableFromMain === true || item.patchEquivalentToMain === true) return "yes";
  if (item.headReachableFromMain === false && item.patchEquivalentToMain === false) return "no";
  return "unknown";
}

function renderMarkdown(survey: WorktreeSurvey): string {
  const lines: string[] = [];
  lines.push("# git-worktree recovery survey");
  lines.push("");
  lines.push(`Generated: ${survey.generatedAt}`);
  if (survey.root !== null) lines.push(`Root: \`${survey.root}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total worktrees: ${survey.totals.worktrees}`);
  lines.push(`- ALREADY-COVERED: ${survey.totals.alreadyCovered}`);
  lines.push(`- NEEDS-RECOVERY: ${survey.totals.needsRecovery}`);
  lines.push(`- OBSOLETE: ${survey.totals.obsolete}`);
  lines.push("");

  for (const bucket of ["NEEDS-RECOVERY", "OBSOLETE", "ALREADY-COVERED"] as const) {
    const bucketItems = survey.items.filter((item) => item.bucket === bucket);
    if (bucketItems.length === 0) continue;

    lines.push(`## ${bucket}`);
    lines.push("");
    lines.push("| Path | Branch | Dirty | Covered by main | Reason |");
    lines.push("|------|--------|-------|-----------------|--------|");
    for (const item of bucketItems) {
      lines.push(
        `| ${escapeMarkdownTableCell(renderInlineCode(item.path))} | ${escapeMarkdownTableCell(renderBranch(item.branch))} | ${renderNullableBoolean(item.dirty)} | ${renderCoveredByMain(item)} | ${escapeMarkdownTableCell(item.reason)} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatSurveyOutput(survey: WorktreeSurvey, json: boolean): string {
  const output = json ? JSON.stringify(survey, null, 2) : renderMarkdown(survey);
  return output.endsWith("\n") ? output : `${output}\n`;
}

function realInspector(): Inspector {
  return {
    inspect(entry: WorktreeEntry): WorktreeInspection {
      const pathExists = existsSync(entry.path);
      if (!pathExists) {
        return {
          pathExists,
          dirty: null,
          headReachableFromMain: null,
          patchEquivalentToMain: null,
          statusError: null,
        };
      }

      // eslint-disable-next-line sonarjs/no-os-command-from-path
      const status = spawnSync("git", ["-C", entry.path, "status", "--porcelain=v1", "--untracked-files=normal"], {
        encoding: "utf8",
      });
      if (status.error) {
        return {
          pathExists,
          dirty: null,
          headReachableFromMain: null,
          patchEquivalentToMain: null,
          statusError: status.error.message,
        };
      }
      if (status.status !== 0) {
        const stderr = (status.stderr || "").trim() || `(no stderr; exit ${status.status ?? "null"})`;
        return {
          pathExists,
          dirty: null,
          headReachableFromMain: null,
          patchEquivalentToMain: null,
          statusError: stderr,
        };
      }

      let headReachableFromMain: boolean | null = null;
      let patchEquivalentToMain: boolean | null = null;
      if (entry.head !== null) {
        // eslint-disable-next-line sonarjs/no-os-command-from-path
        const mergeBase = spawnSync(
          "git",
          ["-C", entry.path, "merge-base", "--is-ancestor", entry.head, "origin/main"],
          {
            encoding: "utf8",
          },
        );
        if (!mergeBase.error && (mergeBase.status === 0 || mergeBase.status === 1)) {
          headReachableFromMain = mergeBase.status === 0;
        }

        if (headReachableFromMain !== true) {
          // eslint-disable-next-line sonarjs/no-os-command-from-path
          const cherry = spawnSync("git", ["-C", entry.path, "cherry", "origin/main", entry.head], {
            encoding: "utf8",
          });
          if (!cherry.error && cherry.status === 0) {
            const lines = cherry.stdout
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0);
            patchEquivalentToMain = lines.every((line) => line.startsWith("-"));
          }
        }
      }

      return {
        pathExists,
        dirty: status.stdout.trim().length > 0,
        headReachableFromMain,
        patchEquivalentToMain,
        statusError: null,
      };
    },
  };
}

function runSurvey(root: string | null, now: Date): WorktreeSurvey | { error: string; code: AuditExitCode } {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const list = spawnSync("git", gitArgs(root, ["worktree", "list", "--porcelain"]), { encoding: "utf8" });
  if (list.error) {
    return { error: `git worktree list failed to launch: ${list.error.message}`, code: 128 };
  }
  if (list.status !== 0) {
    const stderr = (list.stderr || "").trim() || `(no stderr; exit ${list.status ?? "null"})`;
    return { error: `git worktree list failed: ${stderr}`, code: 128 };
  }

  return makeSurvey(parseWorktreePorcelain(list.stdout), realInspector(), now, root);
}

function main(argv: string[]): AuditExitCode {
  const parsed = parseArgs(argv);
  if (parsed.kind === "error") {
    console.error(`error: ${parsed.message}`);
    return 64;
  }

  const survey = runSurvey(parsed.args.root, new Date());
  if ("error" in survey) {
    console.error(survey.error);
    return survey.code;
  }

  const output = formatSurveyOutput(survey, parsed.args.json);
  if (parsed.args.report !== null && !parsed.args.dry) {
    writeFileSync(parsed.args.report, output);
    console.log(`wrote ${parsed.args.report}`);
  } else {
    process.stdout.write(output);
  }

  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}

export { classifyWorktrees, formatSurveyOutput, makeSurvey, parseArgs, parseWorktreePorcelain, renderMarkdown };
export type { WorktreeEntry, WorktreeInspection, WorktreeSurvey, WorktreeSurveyItem };
