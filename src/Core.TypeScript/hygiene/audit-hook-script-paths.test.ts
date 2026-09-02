import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { audit, danglingReferences, extractReferences, hookSourceFiles } from "./audit-hook-script-paths";

const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..");

describe("audit-hook-script-paths", () => {
  test("finds a `${projectDir}`-rooted spawn target — the #8048 shape", () => {
    const text = 'spawnSync("bun", [`${projectDir}/src/Core.TypeScript/orchestrator-checks/verify-branch.ts`]);';
    expect(extractReferences("h.ts", text)).toEqual([
      { source: "h.ts", target: "src/Core.TypeScript/orchestrator-checks/verify-branch.ts" },
    ]);
  });

  test("finds a `$CLAUDE_PROJECT_DIR`-rooted settings command", () => {
    const text = '"command": "bun \\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/pre-edit-recent-read.ts"';
    expect(extractReferences("settings.json", text)).toEqual([
      { source: "settings.json", target: ".claude/hooks/pre-edit-recent-read.ts" },
    ]);
  });

  test("a BARE relative path is deliberately not matched", () => {
    // It would resolve against the fire-time cwd, which this audit cannot know. Guessing would
    // produce false positives, and a hygiene check that cries wolf gets disabled.
    expect(extractReferences("h.ts", 'spawnSync("bun", ["tools/whatever.ts"]);')).toEqual([]);
  });

  test("scanning twice yields the same result", () => {
    // The patterns are module-level /g RegExp objects, which carry `lastIndex` ACROSS calls.
    // Without the reset in extractReferences the second scan would start mid-string and silently
    // return fewer references — a guard that quietly stops guarding.
    const text = "`${projectDir}/a/b.ts` and `${projectDir}/c/d.ts`";
    expect(extractReferences("h.ts", text)).toEqual(extractReferences("h.ts", text));
    expect(extractReferences("h.ts", text)).toHaveLength(2);
  });

  test("dangling is decided by the injected existence check, not by the filesystem", () => {
    const refs = [
      { source: "h.ts", target: "present.ts" },
      { source: "h.ts", target: "moved.ts" },
    ];
    expect(danglingReferences(refs, (t) => t === "present.ts")).toEqual([{ source: "h.ts", target: "moved.ts" }]);
  });

  test("the hook source set includes settings.json and every hook script", () => {
    const sources = hookSourceFiles(REPO_ROOT);
    expect(sources).toContain(".claude/settings.json");
    expect(sources).toContain(".claude/hooks/verify-branch-pretooluse.ts");
  });

  test("THIS repo has no dangling hook references", () => {
    // The regression bar. Two were dangling when this audit was written — verify-branch (#8048)
    // and check-md032, the second found BY this audit rather than by a reader.
    expect(audit(REPO_ROOT)).toEqual([]);
  });
});
