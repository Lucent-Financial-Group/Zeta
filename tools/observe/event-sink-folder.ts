/**
 * tools/observe/event-sink-folder.ts — the real EventSink: folder-direct-to-main.
 *
 * The sovereign transport for `execute` (per the observe-act + DB-design + keystone
 * ADRs). Where `execute.ts` defines the `EventSink` port (append a chosen action to
 * the durable log), THIS is the production adapter: it writes the event as a
 * ZetaId-named JSON file into a git folder and commits it **direct to `main`,
 * no-PR** (B-0890.1 folders-on-main; same mechanism as the agent-bus G-Set,
 * B-0954). Corporate batch-to-main (B-0890) is the same event shape behind a
 * different commit fn — swap `commit`, not the envelope.
 *
 * ── Fact, not command (per the design review) ────────────────────────────────
 * Replay must fold FACTS, not redo COMMANDS. So the durable record is an
 * `EventEnvelope` — `{ id, at, by, action }` — a fact ("at t, actor X recorded
 * this action"), carrying a **stable ZetaId identity** (design-review caution #2) so the
 * log is idempotent (the filename IS the id; re-appending the same id is a
 * no-op — the G-Set CRDT property). The richer executed-event envelope
 * (ActionExecutionStarted/Succeeded/Failed/ModeChanged) is the next refinement;
 * this slice logs the chosen action as the fact, with identity + actor + time.
 *
 * ── Conflict discipline (design-review cautions #5/#6) ───────────────────────
 * Direct-to-main is safe here for the same reason the bus is: events are
 * **disjoint ZetaId files** — two agents appending never touch the same path, so
 * a concurrent peer advancing `main` only causes a non-fast-forward push, which
 * `git pull --rebase` + retry resolves cleanly (G-Set merge = set union). The
 * on-main guard + ahead-check (mirrored from the bus) prevent shoving unrelated
 * local commits to main.
 *
 * ── Never throws (Result discipline) ─────────────────────────────────────────
 * Every failure (not-on-main, local-ahead, write error, push failure) becomes an
 * `AppendOutcome { ok: false; reason }` — the sink AUTHORS its outcome channel
 * (asymmetric-authorship); the caller (`execute`) surfaces it as feedback.
 *
 * I/O is injectable (`mint` / `now` / `commit`) so the whole adapter is testable
 * with no real git and a temp dir.
 *
 * Composes with:
 *   - tools/observe/execute.ts (the EventSink port this implements)
 *   - tools/observe/observe.ts (NextAction — the action recorded)
 *   - tools/agent-bus/publish.ts (the proven atomic-write + git-direct-to-main pattern this mirrors)
 *   - src/Core.TypeScript/zeta-id (the ZetaId codec — Category.WorkItem ids)
 *   - docs/DECISIONS/2026-05-31-observe-act-16-direction-universal-action-grammar-local-no-cloud-llm.md
 *   - docs/backlog/P1/B-0890.1-fast-lane-as-folders-on-main-not-branches-supersedes-coordinator-complexity-per-operator-2026-05-28-zeta-native-branch-protection.md
 *   - docs/backlog/P2/B-0951-git-native-eventually-consistent-text-indexes-sorted-inverted-graph-plus-git-native-hindsight-storage-interface-aaron-2026-05-31.md (the read side: indexes over this log)
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pack, DEFAULT_ENV, type SimulationEnvironment } from "../../src/Core.TypeScript/zeta-id/zeta-id";
import {
  Category,
  IdVersion,
  Chromosome,
  Firefly,
  Persona,
  LocationHint,
  type ZetaObservation,
  type Milliseconds,
} from "../../src/Core.TypeScript/zeta-id/types";
import type { AppendOutcome, EventSink } from "./execute";
import type { NextAction } from "./observe";

/**
 * Mint a WorkItem-category ZetaId as 32-hex — the observe-event identity.
 * `DEFAULT_ENV` (crypto randomness) makes each call unique; pass a deterministic
 * env in tests for reproducible ids. Mirrors the bus minter but tags the id
 * `Category.WorkItem` (planning/workflow), not `Category.Bus`.
 */
export function mintObserveEventIdHex(env: SimulationEnvironment = DEFAULT_ENV, atMs: number = Date.now()): string {
  const obs: ZetaObservation = {
    version: IdVersion.V1,
    timestamp: atMs as Milliseconds,
    chromosome: Chromosome.MetaCoherence,
    category: Category.WorkItem,
    firefly: Firefly.NoDirective,
    authority: { type: "TrustedAgent" },
    persona: Persona.FireflyCoherence,
    momentum: { type: "Normal" },
    location: LocationHint.EastUS_VA1,
  };
  return pack(obs, env).toString(16).padStart(32, "0");
}

/** A canonical observe-event id is 32 lowercase hex chars (mintObserveEventIdHex output). */
export function isCanonicalEventId(id: string): boolean {
  return /^[0-9a-f]{32}$/.test(id);
}

/** The durable FACT: a recorded action with stable identity + actor + time. */
export interface EventEnvelope {
  readonly id: string; // ZetaId hex — stable identity; the filename; G-Set dedup key
  readonly at: string; // canonical ISO-8601 ms timestamp
  readonly by: string; // acting agent id (the actor trail)
  readonly action: NextAction; // the chosen action this event records
}

/** Outcome of committing the event file (sync; mirrors the bus's git pattern). */
export type CommitOutcome = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export interface FolderSinkOptions {
  /** The git folder events land in (folders-not-branches, on a main checkout). */
  readonly eventDir: string;
  /** Acting agent id, stamped into every envelope. */
  readonly by: string;
  /** Id minter (default: WorkItem ZetaId). Inject a deterministic one in tests. */
  readonly mint?: () => string;
  /** Clock (default: Date.now). Inject in tests. */
  readonly now?: () => number;
  /** Commit the written file (default: gitCommitToMain). Inject a fake in tests. */
  readonly commit?: (filePath: string, envelope: EventEnvelope) => CommitOutcome;
}

/**
 * Write the envelope as an atomic, ZetaId-named file. `flag: "wx"` fails if the
 * file exists — but for a G-Set the same id means the same event already landed,
 * so EEXIST is idempotent SUCCESS, not an error.
 */
function writeEventFile(envelope: EventEnvelope, eventDir: string): { ok: true; path: string } | { ok: false; reason: string } {
  const path = join(eventDir, `${envelope.id}.json`);
  try {
    mkdirSync(eventDir, { recursive: true });
    writeFileSync(path, `${JSON.stringify(envelope, null, 2)}\n`, { flag: "wx" });
    return { ok: true, path };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "EEXIST") {
      // Same id already on disk. Idempotent SUCCESS only if the content matches
      // (the true G-Set property). A reused id with a different action/by/at is a
      // real collision — surface it, never silently accept stale (Codex #6312 P2).
      try {
        const existing = readFileSync(path, "utf-8");
        if (existing === `${JSON.stringify(envelope, null, 2)}\n`) return { ok: true, path };
        return { ok: false, reason: `id collision: ${envelope.id} already exists with different content` };
      } catch (readErr) {
        return { ok: false, reason: `EEXIST but re-read failed: ${(readErr as Error).message}` };
      }
    }
    return { ok: false, reason: `write failed: ${e.message}` };
  }
}

/**
 * Harness-specific `Co-Authored-By` trailer derived from the acting agent id.
 * The sink is SHARED — Vera/Riven/Alexa/Lior all use it — and the repo requires
 * per-surface trailers (agent-roster-reference-card), so a hardcoded Claude
 * trailer mis-attributes every non-Otto surface's events (Codex #6312 P2).
 * Mirrors the agent-bus `coauthorFor` map; falls back to naming the sender.
 */
export function coauthorFor(by: string): string {
  const id = by.toLowerCase();
  // Match the EXACT surface id or a hyphen-delimited variant (otto, otto-cli, otto-desktop) —
  // NOT a bare prefix, so "ottobot" / "liorx" fall back to the sender trailer instead of being
  // mis-stamped (Codex #6312: mirror the agent-bus exact-or-hyphen matching, not startsWith).
  const TRAILERS: readonly (readonly [string, string])[] = [
    ["otto", "Co-Authored-By: Claude <noreply@anthropic.com>"],
    ["alexa", "Co-Authored-By: Kiro <noreply@kiro.dev>"],
    ["riven", "Co-Authored-By: Grok <noreply@x.ai>"],
    ["vera", "Co-Authored-By: Codex <noreply@openai.com>"],
    ["lior", "Co-Authored-By: Gemini <noreply@google.com>"],
  ];
  for (const [surface, trailer] of TRAILERS) {
    if (id === surface || id.startsWith(`${surface}-`)) return trailer;
  }
  return `Co-Authored-By: ${by} <noreply@zeta.local>`;
}

/**
 * Default commit: folder-direct-to-`main`, no-PR. Mirrors the agent-bus
 * `gitPushEnvelope` (B-0954): on-main guard, fetch + 0-ahead check (never shove
 * unrelated local commits to main), add ONLY this file, `--no-verify` (events are
 * DATA not code), push `HEAD:main` with rebase-retry (disjoint ZetaId files →
 * G-Set union, never a real conflict). Returns a CommitOutcome; never throws.
 */
export function gitCommitToMain(filePath: string, envelope: EventEnvelope): CommitOutcome {
  const run = (args: readonly string[]): string =>
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    execFileSync("git", [...args], { encoding: "utf-8" }).trim();
  const gitPath = filePath.replaceAll("\\", "/");
  try {
    const branch = run(["rev-parse", "--abbrev-ref", "HEAD"]);
    if (branch !== "main") {
      return { ok: false, reason: `observe event sink must run on a main checkout (on '${branch}')` };
    }
    run(["fetch", "origin", "main"]);
    const ahead = run(["rev-list", "--count", "origin/main..HEAD"]);
    if (ahead !== "0") {
      return { ok: false, reason: `local main is ${ahead} commit(s) ahead of origin/main; reconcile before appending events` };
    }
    run(["add", gitPath]);
    // Idempotent re-append: if the file is already committed + unchanged, `git add` stages
    // nothing, so `git commit` would fail ("nothing to commit"). That's a no-op, not an error —
    // return ok (the event already landed durably). `git diff --cached --quiet` exits 0 when
    // nothing is staged (Copilot #6312 — re-append of an already-landed event must be idempotent ok).
    let staged = false;
    try {
      run(["diff", "--cached", "--quiet", "--", gitPath]);
    } catch {
      staged = true; // non-zero exit = staged changes present
    }
    if (!staged) return { ok: true };
    const msg = [
      `observe(${envelope.by}): ${envelope.action.kind} ${gitPath}`,
      "",
      `Observe event ${envelope.id} appended folder-direct-to-main (sovereign transport, B-0890.1).`,
      "",
      coauthorFor(envelope.by),
    ].join("\n");
    run(["commit", "--no-verify", "-q", "-m", msg, "--", gitPath]);
    // After this point the commit exists on local main. If the push never lands we MUST fully undo
    // it — commit AND the event file — leaving the checkout exactly at origin/main. A soft reset
    // would leave the file STAGED, which then makes the next append's `git pull --rebase` refuse on
    // a dirty index (Codex #6312). A hard reset of our own pathspec-scoped commit on the sink's
    // clean-main checkout leaves zero residue; the failed append didn't land, and the loop re-appends
    // a fresh event next tick (so nothing is lost). (Codex #6312 P2: ahead-check wedge + dirty-index.)
    const undoLocalCommit = (): void => {
      try {
        run(["reset", "--hard", "HEAD~1"]); // drop our commit + the event file → clean at origin/main
      } catch {
        /* nothing to undo — fine */
      }
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        run(["push", "origin", "HEAD:main"]);
        return { ok: true };
      } catch {
        try {
          run(["pull", "--rebase", "origin", "main"]);
        } catch {
          // Leave the checkout clean: abort the in-progress rebase + undo our local commit
          // (best-effort) so neither a dangling rebase nor an ahead local main blocks the next
          // append. Result-only contract: a failed append leaves no local residue (Codex #6312 P2).
          try {
            run(["rebase", "--abort"]);
          } catch {
            /* no rebase in progress to abort — fine */
          }
          undoLocalCommit();
          return { ok: false, reason: "push rejected and rebase failed (peer contention); local commit undone" };
        }
      }
    }
    undoLocalCommit();
    return { ok: false, reason: "push failed after 3 rebase-retry attempts; local commit undone" };
  } catch (err) {
    return { ok: false, reason: `git commit failed: ${(err as Error).message}` };
  }
}

/**
 * The real folder-direct-to-main EventSink. `append` mints a ZetaId, builds the
 * fact envelope, atomically writes `<eventDir>/<id>.json`, and commits it to main.
 * Pure-shaped (Result; never throws); I/O injected for tests.
 */
export function folderSink(opts: FolderSinkOptions): EventSink {
  const mint = opts.mint ?? (() => mintObserveEventIdHex());
  const now = opts.now ?? (() => Date.now());
  const commit = opts.commit ?? gitCommitToMain;
  return {
    append: (action: NextAction): Promise<AppendOutcome> => {
      // Wrap the whole body: the injected `mint` / `now` / `commit` could throw (e.g. a now()
      // returning NaN makes toISOString() throw), but the documented contract is Result-only —
      // convert ANY throw to { ok: false } like the rest of the adapter (Copilot #6312 P1).
      try {
        const id = mint();
        // `mint` is injectable + FolderSinkOptions is exported, so a caller could return a
        // path-traversal segment ("../outside") or a Windows-reserved name. The id is used as a
        // path segment — reject anything but a canonical 32-hex ZetaId before joining a path
        // (the bus guards its segments the same way). Security-relevant (Copilot #6312 P1).
        if (!isCanonicalEventId(id)) {
          return Promise.resolve({ ok: false, reason: `non-canonical event id (expected 32 lowercase hex): '${id}'` });
        }
        const at = new Date(now()).toISOString();
        const envelope: EventEnvelope = { id, at, by: opts.by, action };
        const written = writeEventFile(envelope, opts.eventDir);
        if (!written.ok) return Promise.resolve({ ok: false, reason: written.reason });
        const committed = commit(written.path, envelope);
        if (!committed.ok) return Promise.resolve({ ok: false, reason: committed.reason });
        return Promise.resolve({ ok: true, eventId: id });
      } catch (err) {
        return Promise.resolve({ ok: false, reason: `append failed: ${(err as Error).message}` });
      }
    },
  };
}
