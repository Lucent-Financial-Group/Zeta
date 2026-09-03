/**
 * observe/review-work.ts — a review is work the agent owes, not a wall it waits behind.
 *
 * ── WHAT WAS MISSING ─────────────────────────────────────────────────────────
 * The loop saw `openPrCount` and acted only on CLEAN PRs. A PR of its own, blocked on an unanswered
 * review, was the one kind of work it could never pick up: invisible in the menu, invisible in the
 * oracle's lead, and — since the merge receipt started blocking on unresolved threads — a wall it
 * would sit behind indefinitely.
 *
 * `review-pr-N` is the symmetric twin of `merge-pr-N`: a synthetic item the FORGE produced rather
 * than the backlog, offered like any other work and never forced.
 *
 * ── THE LINE THIS MODULE WILL NOT CROSS ──────────────────────────────────────
 * It builds a PROMPT. It does not resolve threads.
 *
 * `resolveThread` replies and marks the conversation settled — an assertion that the reviewer's
 * concern was addressed. An agent that resolves on the strength of having read the comment is
 * laundering: the thread goes quiet, the gate opens, and nothing was answered. That is the exact
 * failure the whole review stage exists to prevent, so resolution stays downstream of evidence
 * (a pushed change the reviewer can see), and this module hands the agent the words it must
 * respond to rather than a button that makes them go away.
 */

import type { ReviewThread } from "../forge-host/types";

/** How many threads to put in one prompt before summarising. A prompt nobody finishes is not read. */
export const MAX_PROMPT_THREADS = 12;

export interface ReviewPromptInput {
  readonly prNumber: number;
  readonly threads: readonly ReviewThread[];
  /** Threads the forge reported as blocking but could not identify. Counted, never invented. */
  readonly unanswerable: number;
}

/**
 * Frame ONE thread the way a responder needs it: where, who, and what they actually said.
 *
 * An outdated thread is marked rather than dropped. The diff moved under it, so the line may be
 * gone — but the concern is not, and silently omitting it would turn "the code changed" into "the
 * reviewer was answered", which is the same laundering in a quieter form.
 */
export function renderThread(t: ReviewThread): string {
  const where = t.path === undefined ? "(no file)" : `${t.path}${t.line === undefined ? "" : `:${String(t.line)}`}`;
  const who = t.firstComment?.author ?? "a reviewer";
  const said = t.firstComment?.body ?? "(the comment body was not returned by the forge)";
  const stale = t.isOutdated ? " [OUTDATED — the diff moved under this thread; the concern still stands]" : "";
  return [`- thread ${t.id} — ${where}${stale}`, `  ${who} said:`, ...said.split("\n").map((l) => `    ${l}`)].join(
    "\n",
  );
}

/**
 * The prompt for answering a review.
 *
 * States the boundary in the prompt itself, not only in this file's header: the agent is asked to
 * CHANGE THE CODE or explain, and told explicitly that it cannot mark anything resolved. A boundary
 * the executing agent never sees is a boundary that depends on the executing agent already knowing
 * it.
 */
export function reviewPrompt(input: ReviewPromptInput): string {
  const open = input.threads.filter((t) => !t.isResolved);
  const shown = open.slice(0, MAX_PROMPT_THREADS);
  const omitted = open.length - shown.length;

  const lines: string[] = [
    `A reviewer asked for changes on PR #${String(input.prNumber)}. Answer the review.`,
    "",
    `${String(open.length)} unresolved thread(s):`,
    "",
    ...shown.map(renderThread),
  ];
  if (omitted > 0) lines.push(`- ... and ${String(omitted)} further thread(s) not shown here`);
  if (input.unanswerable > 0) {
    lines.push(
      `- NOTE: ${String(input.unanswerable)} further unresolved thread(s) could not be identified by the forge.`,
      "  They still block the merge and are not listed above.",
    );
  }
  lines.push(
    "",
    "What to do:",
    "  1. Read each comment and decide whether it is right.",
    "  2. Where it is right, CHANGE THE CODE and push. The pushed change is the answer.",
    "  3. Where you disagree, say why in the thread — disagreement is a legitimate answer.",
    "",
    "What you may NOT do:",
    "  - You cannot mark a thread resolved. Resolving asserts the concern was addressed, and that",
    "    claim belongs to whoever can see the evidence. Push the change; the thread is answered by",
    "    what you did, not by declaring it handled.",
  );
  return lines.join("\n");
}
