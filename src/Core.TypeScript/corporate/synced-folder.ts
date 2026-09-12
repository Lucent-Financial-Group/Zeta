/**
 * corporate/synced-folder.ts — whether the organization is working inside a file-sync folder.
 *
 * ── WHY THIS IS WORTH SAYING OUT LOUD ────────────────────────────────────────
 * A sync client watches every file under its root and uploads what changes. A git checkout under
 * one is therefore not just storage: every `git status`, every branch switch, every test run's
 * temporary files and every throwaway worktree becomes upload traffic and contends with the
 * process doing the work.
 *
 * MEASURED on this machine, 2026-09-12: the repositories, the org's worktrees and the scratch
 * copies reviewers make all sit under `OneDrive - Toshiba TEC`, and the repository's own suite
 * takes 81-88s per run there. How much of that is the sync client is NOT measured here, and this
 * file does not claim a number - the direction is not in doubt but the size is unknown.
 *
 * ── SO THIS WARNS, AND NEVER REFUSES ─────────────────────────────────────────
 * Where a person keeps their work is their decision, and an organization that refused to run
 * because it disapproved of a directory would be worse than a slow one. It says what it sees, once,
 * with the path - and then does exactly what it was asked to do.
 */

import { sep } from "node:path";

/**
 * Directory names that mean "a sync client is watching everything below here".
 *
 * Matched on a whole path SEGMENT, and OneDrive gets a prefix match because its folder carries the
 * tenant name (`OneDrive - Toshiba TEC`). Anything cleverer - reading the client's own
 * configuration, asking the filesystem - would be right more often and wrong less legibly.
 */
const SYNC_ROOTS: readonly string[] = ["onedrive", "dropbox", "google drive", "googledrive", "iclouddrive", "icloud drive", "box sync", "creative cloud files"];

/** The sync folder a path sits under, or undefined. The segment as written, so it can be shown. */
export function syncedUnder(path: string): string | undefined {
  if (typeof path !== "string" || path.trim() === "") return undefined;
  for (const segment of path.split(/[\\/]/)) {
    const s = segment.trim().toLowerCase();
    if (s === "") continue;
    // The segment must BE the folder, or the folder plus a suffix that begins with a SPACE -
    // OneDrive's is `OneDrive - Toshiba TEC`. Accepting a bare hyphen matched `onedrive-exporter`,
    // which is a repository named after the thing, not a repository inside it.
    if (SYNC_ROOTS.some((root) => s === root || s.startsWith(`${root} `))) return segment;
  }
  return undefined;
}

/** One line per place the organization works that a sync client is watching. Empty when none are. */
export function syncedFolderWarnings(places: Readonly<Record<string, string | undefined>>): readonly string[] {
  const out: string[] = [];
  for (const [what, where] of Object.entries(places)) {
    if (where === undefined) continue;
    const under = syncedUnder(where);
    if (under === undefined) continue;
    out.push(
      `${what} is inside '${under}', which a sync client watches: every git command, test run and ` +
        `scratch worktree here is also upload traffic. Moving it off the synced tree is a one-time ` +
        `change (${where})`,
    );
  }
  return out;
}

/** The separator, exported so a caller can build a path the same way this reads one. */
export const PATH_SEP = sep;
