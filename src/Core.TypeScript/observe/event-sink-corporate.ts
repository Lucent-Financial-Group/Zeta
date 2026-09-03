/**
 * observe/event-sink-corporate.ts — the other half of the sink DU, declared since it was written.
 *
 * `EventSink`'s own contract names two transports: *"sovereign folder-direct-to-main / **corporate
 * batched**"*. Only `folderSink` existed. Every lane, corporate or not, pushed straight to `main` —
 * so the harness's `plan → execute → review → push` sequence had no PUSH stage that anyone could
 * review, because the push had already happened by the time there was anything to look at.
 *
 * This is the corporate half:
 *
 *   sovereign   append -> commit -> push to main.        One event, one push. No review.
 *   corporate   append -> stage.  flush -> branch -> PR. A batch, proposed, reviewable.
 *
 * ── IT CANNOT PUSH TO MAIN, AND THAT IS STRUCTURAL ───────────────────────────
 * The whole point of the lane is that its output is a PROPOSAL. So this sink never touches local
 * git and never writes `main`: it builds the branch through the forge's git-data API — blob, tree,
 * commit, ref — and the ref it writes is refused unless it is under the configured branch prefix
 * and different from the base. A configuration that could aim it at `main` is rejected at flush
 * time rather than trusted not to occur.
 *
 * That also gives six `ForgeHost` methods their first consumer: `getRef`, `getCommit`,
 * `createBlob`, `createTree`, `createCommit`, `createRef` — and `createPullRequest`, which had none.
 *
 * ── WHAT "BATCHED" MEANS, AND WHAT IT COSTS ──────────────────────────────────
 * `append` returns as soon as the event is durable IN MEMORY and is NOT yet on the forge. That is a
 * real weakening against the sovereign sink, where `append` returning means the event is committed:
 * a crash between append and flush loses the batch. Stated rather than hidden, because the sink's
 * caller is the one who can decide whether that trade is acceptable, and it cannot decide about a
 * property it was not told.
 *
 * A FAILED FLUSH KEEPS THE BATCH. Events stay pending and the next flush retries them. Dropping
 * them would turn a transient forge failure into silent data loss, which is the shape this repo
 * keeps finding: an error handled by forgetting.
 */

import type { EventSink, AppendOutcome } from "./execute";
import type { NextAction } from "./observe";
import type { ForgeHost } from "../forge-host/forge-host";
import { describeForgeError } from "./forge-diagnosis";

export interface CorporateEventEnvelope {
  readonly id: string;
  readonly at: string;
  readonly by: string;
  readonly action: NextAction;
}

export interface CorporateSinkOptions {
  /** Where event files live in the repo, e.g. "docs/observe-events". */
  readonly eventDir: string;
  readonly by: string;
  /** Every branch this sink writes must start here. Refused otherwise. */
  readonly branchPrefix?: string;
  readonly baseRef?: string;
  /** Absent means this sink cannot propose anything — and `flush` says so rather than pushing. */
  readonly forge?: ForgeHost;
  readonly mint: () => string;
  readonly now: () => number;
  /** Flush automatically once this many events are pending. 0 disables. */
  readonly autoFlushAt?: number;
}

export type FlushOutcome =
  | { readonly ok: true; readonly kind: "nothing-to-flush" }
  | {
      readonly ok: true;
      readonly kind: "proposed";
      readonly branch: string;
      readonly prNumber: number;
      readonly url: string;
      readonly eventIds: readonly string[];
    }
  | { readonly ok: false; readonly reason: string };

export interface CorporateSink extends EventSink {
  /** Events appended and not yet proposed. Readable so a caller can see what a crash would cost. */
  pending(): readonly CorporateEventEnvelope[];
  flush(): Promise<FlushOutcome>;
}

export const DEFAULT_BRANCH_PREFIX = "observe/";
export const DEFAULT_BASE_REF = "main";

/**
 * Is this branch one the corporate sink may write?
 *
 * Exported because it is the safety property, and a safety property that can only be exercised
 * through the sink's happy path is a safety property with one test.
 */
export function branchIsProposable(
  branch: string,
  prefix: string,
  baseRef: string,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  if (branch === baseRef) {
    return { ok: false, reason: `refusing to write "${branch}": the corporate sink proposes, it does not land` };
  }
  if (!branch.startsWith(prefix)) {
    return {
      ok: false,
      reason: `refusing to write "${branch}": every corporate branch must start with "${prefix}", so a misconfiguration cannot aim this sink at an arbitrary ref`,
    };
  }
  if (branch.includes("..") || branch.includes(" ")) {
    return { ok: false, reason: `refusing to write "${branch}": not a plausible branch name` };
  }
  return { ok: true };
}

/** The branch a batch lands on. Derived from the FIRST event's id, so a retry reuses it. */
export function branchForBatch(prefix: string, firstEventId: string): string {
  return `${prefix}${firstEventId}`;
}

export function corporateSink(opts: CorporateSinkOptions): CorporateSink {
  const prefix = opts.branchPrefix ?? DEFAULT_BRANCH_PREFIX;
  const baseRef = opts.baseRef ?? DEFAULT_BASE_REF;
  const autoFlushAt = opts.autoFlushAt ?? 0;
  const staged: CorporateEventEnvelope[] = [];

  const sink: CorporateSink = {
    append: async (action: NextAction): Promise<AppendOutcome> => {
      const id = opts.mint();
      const at = new Date(opts.now()).toISOString();
      staged.push({ id, at, by: opts.by, action });
      if (autoFlushAt > 0 && staged.length >= autoFlushAt) {
        const flushed = await sink.flush();
        // A failed auto-flush is NOT a failed append: the event is staged and will be retried. The
        // caller is told, because "your event is durable" would be a stronger claim than the truth.
        if (!flushed.ok) {
          return { ok: false, reason: `event ${id} staged, but the batch could not be proposed: ${flushed.reason}` };
        }
      }
      return { ok: true, eventId: id };
    },

    pending: () => [...staged],

    flush: async (): Promise<FlushOutcome> => {
      if (staged.length === 0) return { ok: true, kind: "nothing-to-flush" };
      if (opts.forge === undefined) {
        return {
          ok: false,
          reason: `${String(staged.length)} event(s) staged and no forge is wired — the corporate sink proposes through the forge, and with none it can only hold the batch, never land it another way`,
        };
      }
      const forge = opts.forge;

      const first = staged[0];
      if (first === undefined) return { ok: true, kind: "nothing-to-flush" };
      const branch = branchForBatch(prefix, first.id);
      const guard = branchIsProposable(branch, prefix, baseRef);
      if (!guard.ok) return { ok: false, reason: guard.reason };

      const base = await forge.getRef(`heads/${baseRef}`);
      if (!base.ok) return { ok: false, reason: `could not read ${baseRef}: ${describeForgeError(base.error)}` };
      const baseCommit = await forge.getCommit(base.value.sha);
      if (!baseCommit.ok) {
        return { ok: false, reason: `could not read the base commit: ${describeForgeError(baseCommit.error)}` };
      }

      // One blob per event, then ONE tree and ONE commit for the whole batch — which is what
      // "batched" buys: the reviewer sees a tick's worth of events as a single proposal.
      const entries: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
      for (const envelope of staged) {
        const blob = await forge.createBlob(`${JSON.stringify(envelope, null, 2)}\n`);
        if (!blob.ok)
          return { ok: false, reason: `could not write event ${envelope.id}: ${describeForgeError(blob.error)}` };
        entries.push({ path: `${opts.eventDir}/${envelope.id}.json`, mode: "100644", type: "blob", sha: blob.value });
      }

      const tree = await forge.createTree(entries, baseCommit.value.treeSha);
      if (!tree.ok) return { ok: false, reason: `could not build the tree: ${describeForgeError(tree.error)}` };

      const message = commitMessageFor(staged);
      const commit = await forge.createCommit({ message, tree: tree.value, parents: [base.value.sha] });
      if (!commit.ok) return { ok: false, reason: `could not commit: ${describeForgeError(commit.error)}` };

      const ref = await forge.createRef(`refs/heads/${branch}`, commit.value);
      if (!ref.ok) return { ok: false, reason: `could not create ${branch}: ${describeForgeError(ref.error)}` };

      const pr = await forge.createPullRequest({
        title: prTitleFor(staged),
        body: prBodyFor(staged),
        head: branch,
        base: baseRef,
      });
      if (!pr.ok) {
        // The branch EXISTS now. Say so: a caller told only "createPullRequest failed" would retry
        // the whole flush and hit a ref that is already there, and read that as a second failure.
        return {
          ok: false,
          reason: `branch ${branch} was created but the pull request was not: ${describeForgeError(pr.error)}`,
        };
      }

      const eventIds = staged.map((e) => e.id);
      staged.length = 0; // proposed — and only now
      return { ok: true, kind: "proposed", branch, prNumber: pr.value.number, url: pr.value.url, eventIds };
    },
  };

  return sink;
}

// ─── What the reviewer reads ─────────────────────────────────────────────────

function actionSummary(e: CorporateEventEnvelope): string {
  const item = "item" in e.action && e.action.item !== undefined ? ` ${e.action.item.id}` : "";
  return `${e.action.kind}${item}`;
}

export function commitMessageFor(batch: readonly CorporateEventEnvelope[]): string {
  const head = `observe(${batch[0]?.by ?? "unknown"}): ${String(batch.length)} event(s)`;
  return [head, "", ...batch.map((e) => `- ${e.at} ${actionSummary(e)}`)].join("\n");
}

export function prTitleFor(batch: readonly CorporateEventEnvelope[]): string {
  const kinds = [...new Set(batch.map((e) => e.action.kind))].sort();
  return `observe(${batch[0]?.by ?? "unknown"}): ${String(batch.length)} event(s) — ${kinds.join(", ")}`;
}

export function prBodyFor(batch: readonly CorporateEventEnvelope[]): string {
  return [
    "A batch of observe-loop events, proposed rather than landed.",
    "",
    "This lane does not push to the base branch: the corporate sink writes a branch through the",
    "forge's git-data API and opens this pull request, so the tick is reviewable before it lands.",
    "",
    `${String(batch.length)} event(s):`,
    "",
    ...batch.map((e) => `- \`${e.id}\` ${e.at} — ${actionSummary(e)}`),
  ].join("\n");
}
