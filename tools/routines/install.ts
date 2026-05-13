#!/usr/bin/env bun
/**
 * tools/routines/install.ts
 *
 * Syncs canonical routine sources (tools/routines/<id>/SKILL.md) to the
 * Claude Desktop runtime location (~/.claude/scheduled-tasks/<id>/SKILL.md).
 *
 * Idempotent: writes are no-op if file content already matches.
 *
 * Does NOT register cron schedules with the MCP server — that requires an
 * active Claude session with the `scheduled-tasks` MCP server. After running
 * this installer, ask Otto (or call directly) to run `create_scheduled_task`
 * for any routines whose schedule.json lists a cronExpression not yet
 * registered. The approval dialog is the consent step.
 *
 * Composes with tools/setup/ install-graph pattern; obeys rule-0 (TS, not bash).
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const REPO_ROUTINES_DIR = resolve(import.meta.dir);
const RUNTIME_TASKS_DIR = join(homedir(), ".claude", "scheduled-tasks");

type Action =
  | "created"
  | "updated"
  | "skipped-unchanged"
  | "skipped-missing-skill";

interface SyncResult {
  taskId: string;
  action: Action;
  runtimePath: string;
  cronExpression?: string;
  scheduleMissing?: boolean;
}

function listRoutines(): string[] {
  if (!existsSync(REPO_ROUTINES_DIR)) return [];
  return readdirSync(REPO_ROUTINES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function readSchedule(srcDir: string): { cronExpression?: string; missing: boolean } {
  const path = join(srcDir, "schedule.json");
  if (!existsSync(path)) return { missing: true };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { cronExpression?: string };
    return { cronExpression: parsed.cronExpression, missing: false };
  } catch {
    return { missing: false };
  }
}

function syncRoutine(taskId: string): SyncResult {
  const srcDir = join(REPO_ROUTINES_DIR, taskId);
  const srcSkill = join(srcDir, "SKILL.md");
  const dstDir = join(RUNTIME_TASKS_DIR, taskId);
  const dstSkill = join(dstDir, "SKILL.md");

  if (!existsSync(srcSkill)) {
    return { taskId, action: "skipped-missing-skill", runtimePath: dstSkill };
  }

  const srcContent = readFileSync(srcSkill, "utf8");
  let action: Action = "created";

  if (existsSync(dstSkill)) {
    const dstContent = readFileSync(dstSkill, "utf8");
    action = dstContent === srcContent ? "skipped-unchanged" : "updated";
  }

  if (action !== "skipped-unchanged") {
    mkdirSync(dstDir, { recursive: true });
    writeFileSync(dstSkill, srcContent);
  }

  const { cronExpression, missing } = readSchedule(srcDir);
  return {
    taskId,
    action,
    runtimePath: dstSkill,
    cronExpression,
    scheduleMissing: missing,
  };
}

function main() {
  console.log(`tools/routines/install.ts`);
  console.log(`  source: ${REPO_ROUTINES_DIR}`);
  console.log(`  target: ${RUNTIME_TASKS_DIR}\n`);

  const routines = listRoutines().filter((id) => id !== "install.ts" && !id.endsWith(".md"));
  if (routines.length === 0) {
    console.log("No routines found under tools/routines/");
    return;
  }

  const results = routines.map(syncRoutine);

  for (const r of results) {
    const tag = `[${r.action}]`.padEnd(22, " ");
    console.log(`${tag} ${r.taskId}`);
    console.log(`  runtime: ${r.runtimePath}`);
    if (r.cronExpression) {
      console.log(`  cron:    ${r.cronExpression}`);
    } else if (r.scheduleMissing) {
      console.log(`  cron:    (no schedule.json — ad-hoc routine, register manually)`);
    }
  }

  const needsRegistration = results.filter(
    (r) => r.cronExpression && (r.action === "created" || r.action === "updated"),
  );
  if (needsRegistration.length > 0) {
    console.log(`\nNext step — register cron schedules via the scheduled-tasks MCP:`);
    console.log(`(in a Claude session, ask Otto to run create_scheduled_task for each)\n`);
    for (const r of needsRegistration) {
      console.log(`  create_scheduled_task(taskId="${r.taskId}", cronExpression="${r.cronExpression}", ...)`);
    }
  }

  const summary = {
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    unchanged: results.filter((r) => r.action === "skipped-unchanged").length,
    missingSkill: results.filter((r) => r.action === "skipped-missing-skill").length,
  };
  console.log(
    `\nDone. created=${summary.created} updated=${summary.updated} unchanged=${summary.unchanged} missing=${summary.missingSkill}`,
  );
}

main();
