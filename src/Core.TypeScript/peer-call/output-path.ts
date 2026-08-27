/**
 * output-path.ts — where a peer call writes its transcript, created so the path is not a
 * shared-directory race.
 *
 * WHAT CODEQL FOUND, and it is right. `js/insecure-temporary-file`, 24 open alerts, and the
 * peer-call family is the densest cluster. Four files carried an identical copy of:
 *
 *     return `/tmp/peer-call-output/${ts}-${entity}.md`;
 *
 * Three things wrong with that line, in descending order of how much they matter:
 *
 *   1. **`/tmp` is world-writable and shared.** `mkdirSync(..., { recursive: true })` creates
 *      `peer-call-output` with the process umask — typically `0755` — so any local user can read
 *      every transcript in it. These files hold peer-model conversations, which is real content.
 *      Worse, a user who creates the directory FIRST owns it and chooses its mode; a symlink
 *      planted at a predictable filename redirects the write somewhere else entirely.
 *   2. **The filename is fully predictable** — a second-resolution timestamp and a known entity
 *      name. Guessing it is not work.
 *   3. **`/tmp` is hardcoded**, which is simply wrong off Unix and ignores `TMPDIR` where a user
 *      has deliberately pointed temp elsewhere.
 *
 * THE FIX IS THE DIRECTORY, NOT THE FILENAME. Randomising the name (`mkdtemp` per call) would
 * defeat the reason the fixed name exists — five callers and a shell contract grep for it — and it
 * would leave a world-readable directory behind anyway. Creating the directory `0o700` removes the
 * exposure at its root: once only the owner can traverse it, a predictable name inside is not a
 * weakness, and a planted symlink cannot be planted.
 *
 * `mode` ON `mkdirSync` IS NOT ENOUGH ON ITS OWN, and that is the subtle part. `mode` is masked by
 * the umask and is ignored entirely when the directory already exists — which it will, from every
 * previous run and from any earlier version of this code that created it `0755`. So the mode is
 * asserted afterwards with an explicit `chmod`, and the result is verified. A permission that was
 * requested and not checked is the vacuity class wearing a security hat.
 *
 * `PEER_CALL_OUTPUT_DIR` is honoured because five of the ten callers already honoured it and four
 * did not — the same setting meaning two different things depending on which entity you called is
 * its own defect. When it is set the operator has chosen the location, so the mode is left alone:
 * hardening a directory the operator named would be this code reaching outside what it was asked
 * to do.
 */

import { chmodSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Subdirectory name, fixed on purpose — the `.sh` contract and five callers grep for it. */
export const PEER_CALL_OUTPUT_DIRNAME = "peer-call-output";

/** Owner-only. The whole fix lives here: the name inside may be predictable once this holds. */
export const PEER_CALL_OUTPUT_MODE = 0o700;

/** The environment override five callers already honoured, now honoured by all of them. */
export const PEER_CALL_OUTPUT_DIR_ENV = "PEER_CALL_OUTPUT_DIR";

/**
 * A filesystem-safe stamp. Separated so `peerCallOutputPath` stays a pure function of its inputs
 * and the clock enters at exactly one call site (§13 noninterference).
 */
export function outputStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * Create the output directory and return it.
 *
 * Returns the path whether or not the mode could be enforced — a peer call that cannot write its
 * transcript is a worse outcome than one written to a directory whose mode is not what we asked
 * for, and the caller is told which happened via `secured`.
 */
export function ensurePeerCallOutputDir(
  env: NodeJS.ProcessEnv = process.env,
): { readonly dir: string; readonly secured: boolean; readonly operatorChosen: boolean } {
  const override = env[PEER_CALL_OUTPUT_DIR_ENV];
  if (override !== undefined && override.length > 0) {
    mkdirSync(override, { recursive: true });
    // Operator-chosen: they named it, so its mode is theirs. Reaching in to chmod a directory
    // someone else specified would be this code exceeding its instruction.
    return { dir: override, secured: false, operatorChosen: true };
  }

  // The temp ROOT is read from the SUPPLIED env, not from ambient `process.env`.
  //
  // `tmpdir()` reads `process.env` directly, so an earlier version of this function accepted an
  // `env` argument, used it only for the override, and silently ignored it for the base path — an
  // ambient read wearing an injected-dependency's clothes. Its own test caught it (§13
  // noninterference: influence enters only through declared channels). `tmpdir()` remains the
  // fallback for the case where no temp variable is set at all.
  const root = env["TMPDIR"] ?? env["TMP"] ?? env["TEMP"] ?? tmpdir();
  const dir = join(root, PEER_CALL_OUTPUT_DIRNAME);
  mkdirSync(dir, { recursive: true, mode: PEER_CALL_OUTPUT_MODE });
  // `mode` above is masked by the umask, and is IGNORED OUTRIGHT when the directory already exists
  // — which it does after any previous run, including runs of the version that created it 0755. So
  // set it explicitly and then read it back: a permission requested and never verified is exactly
  // the check-that-cannot-fail this repository keeps finding.
  let secured = false;
  try {
    chmodSync(dir, PEER_CALL_OUTPUT_MODE);
    secured = (statSync(dir).mode & 0o777) === PEER_CALL_OUTPUT_MODE;
  } catch {
    secured = false;
  }
  return { dir, secured, operatorChosen: false };
}

/** The full transcript path for one call. Creates the directory as a side effect. */
export function peerCallOutputPath(
  entity: string,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const { dir } = ensurePeerCallOutputDir(env);
  return join(dir, `${outputStamp(now)}-${entity}.md`);
}
