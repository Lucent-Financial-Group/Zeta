/**
 * followup-commands.test.ts — the seam between the runtime and a session command.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * `ferry.test.ts` proved the queue runs N at once, and passed, because it is handed async work.
 * The port underneath it called `spawnSync`, which holds the only thread for as long as the session
 * runs — so the COMPOSITION was serial while both halves looked right. MEASURED on agentic-tpm,
 * 2026-09-12: `--parallel 3`, the runtime queued two requests and recorded "3 at a time", and
 * task-032's session started at 15:15:46 — the second task-040's ended.
 *
 * So this tests the thing neither unit test could: two real port calls, through the real command
 * path, must OVERLAP.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commandFollowUp } from "./followup-commands";
import { ferry } from "./ferry";
import type { FollowUpRequest } from "./change-followup";

/** A stand-in session: sleeps, then answers the protocol. Nothing here calls a model. */
function stubSession(dir: string, sleepMs: number): string {
  const stub = join(dir, "session.cjs");
  writeFileSync(
    stub,
    `const ms=${String(sleepMs)};` +
      `setTimeout(()=>{process.stdout.write(JSON.stringify({decisions:[],syncWithTarget:false,summary:"done"}));},ms);`,
  );
  return stub;
}

const request = (workId: string, workdir: string): FollowUpRequest => ({
  workId,
  hatId: "backend_implementer",
  branch: `defect/${workId}`,
  workdir,
  items: [],
  mode: "triage",
  canSync: false,
});

describe("A SESSION MUST NOT HOLD THE ONLY THREAD", () => {
  test("two follow-ups at dop 2 overlap — the port is awaited, not blocked", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-port-"));
    const sleepMs = 1500;
    const follow = commandFollowUp({ command: "node", args: [stubSession(dir, sleepMs)] }, dir);

    const started = Date.now();
    const results = await ferry(["task-a", "task-b"], 2, async (w) => await follow(request(w, dir)));
    const elapsed = Date.now() - started;

    expect(results.every((r) => r.ok)).toBe(true);
    // Serial would be >= 2 x sleep. Overlapped is a little over one. The midpoint is the falsifier:
    // with `spawnSync` this measured ~2x and failed; with an awaited spawn it is ~1x.
    expect(elapsed).toBeLessThan(sleepMs * 2);
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);

  test("the result still reads like spawnSync's: a non-zero exit is a refusal carrying its reason", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-port-"));
    const stub = join(dir, "boom.cjs");
    writeFileSync(stub, `process.stderr.write("the session refused");process.exit(4);`);
    const follow = commandFollowUp({ command: "node", args: [stub] }, dir);

    const r = await follow(request("task-a", dir));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("exited 4");
      expect(r.reason).toContain("the session refused");
    }
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);

  test("a session that answers nothing is a refusal, not an empty set of decisions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-port-"));
    const stub = join(dir, "quiet.cjs");
    writeFileSync(stub, `process.exit(0);`);
    const follow = commandFollowUp({ command: "node", args: [stub] }, dir);

    const r = await follow(request("task-a", dir));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("printed no decisions");
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);
});
