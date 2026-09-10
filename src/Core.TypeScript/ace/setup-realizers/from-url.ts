import { spawnSync } from "node:child_process";
import { mkdirSync, renameSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { parseMechanismManifest } from "../setup-manifest.ts";
import {
  curlFetchToFile,
  resolveRepoRelativeDest,
  sha256File,
} from "./curl-fetch.ts";
import {
  activeExceptionFor,
  appendAcceptanceRecord,
  decideRollingAccept,
  loadRollingExceptions,
  rollingRemedy,
  type RollingException,
} from "./rolling-exception.ts";
import {
  commandOnPath,
  finishResult,
  readManifestFile,
  type SetupRealizer,
} from "./shared.ts";

const MANIFEST = "tools/setup/manifests/from-url";

type Attrs = Readonly<Record<string, string>>;

const SHA256_HEX = /^[0-9a-f]{64}$/;

// A URL is a name, not a pin. GitHub release assets can be re-uploaded under
// an unchanged tag -- tlaplus v1.8.0 is a rolling prerelease that has served
// at least two different tla2tools.jar builds -- so the digest is the only
// thing that says which bytes arrived. Mandatory here as in from-elan and
// from-autotools-tarball. See 081M001E114087G0R001AZF4KD.
/**
 * The one sanctioned way to say "this row is pinned by its TAG, not by a digest".
 *
 * MAINTAINER'S RULING, Aaron 2026-09-10:
 *
 *   "for some things we don't need a pin at all, or we can pin a tag instead of a
 *    SHA, we can't be perfect with security here if it keeps blocking us over and
 *    over and over and over, security on a product that never ships never matters."
 *
 * WHAT FORCED IT. The digest-on-a-re-cut-tag arrangement did not merely cost
 * maintenance -- it DEADLOCKED. `repin-rolling.ts` advances a digest only after its
 * declared `remeasure=` passes; for `tla2tools.jar` that sweep judges the jar against
 * `registry/tlc-models.json`'s versionBanner, which is a committed restatement of the
 * pin that only a successful re-pin updates. So the sweep reports "banner is X,
 * registry pins Y" for all 52 models, the re-measure fails, the tool restores the tree,
 * and the pin can NEVER advance. Measured 2026-09-10, exit 1, nothing re-pinned. Three
 * hand re-pins in one day were people stepping around a tool that cannot succeed.
 *
 * WHAT IS GIVEN UP, said plainly rather than softened: for a tag-only row, whoever can
 * publish to that tag chooses the bytes this repo installs, and nothing here will
 * notice. That is the same exposure the auto-accept exception already granted for this
 * dest -- this removes the ceremony around it, not a protection.
 *
 * WHAT IS NOT GIVEN UP, and why the trade is bounded:
 *
 *   * It is PER ROW and OPT-IN. `sha256=tag-only` matches that literal string and
 *     nothing else; every other row still requires 64 hex and still fails closed.
 *     There is no global switch and none may be added.
 *   * It requires a REASON as a value (`tagonly=`), not a comment. A comment gets
 *     copied along with the line it excuses; a required field does not.
 *   * The URL must carry a version-shaped tag segment. A row pointing at `latest`,
 *     `main`, or a bare filename is REFUSED -- "pin the tag" means there is a tag.
 *   * Consumers keep their own verdicts. For tla2tools the four TLC model verdicts
 *     (completion marker, expected-violation substring, exit code, and the pinned
 *     exhaustive distinct-state count) still run on every gated run, so a substituted
 *     jar that changes any RESULT still fails. The digest was never the only guard.
 */
const TAG_ONLY = "tag-only";
const VERSION_TAG_SEGMENT = /\/(?:v?\d+[\w.-]*)\//u;

export function requireSha256(destRel: string, attrs: Attrs, url: string): string {
  const sha256 = attrs.sha256;
  if (sha256 === undefined) {
    throw new Error(`from-url ${destRel}: sha256= pin required`);
  }
  if (sha256 === TAG_ONLY) {
    if (attrs.tagonly === undefined || attrs.tagonly.trim() === "") {
      throw new Error(
        `from-url ${destRel}: sha256=tag-only requires tagonly=<reason> saying why a digest is not used. A reason in a comment is not enough — it travels with the line that copies it.`,
      );
    }
    // URL AS A PARAMETER, NOT AN ATTR. The manifest row's URL is POSITIONAL
    // (`entry.tokens[1]`); `attrs.url` does not exist and never did. The first draft
    // of this function read `attrs.url ?? ""`, so the tag check saw an empty string
    // and EVERY REAL tag-only row would have thrown at install time -- while its seven
    // unit tests passed, because they handed in `url` as an attr, a shape the caller
    // never produces. Green in test, red in production: a test that constructs an
    // input the production path cannot create is not testing the production path.
    // Caught in review by another agent before this merged. The falsifier added
    // alongside runs the resolver over the COMMITTED manifest text, so the shape under
    // test is the shape that ships.
    if (!VERSION_TAG_SEGMENT.test(url)) {
      throw new Error(
        `from-url ${destRel}: sha256=tag-only requires a version-shaped tag in the URL, and ${JSON.stringify(url)} has none. "Pin the tag instead of the digest" is only meaningful when there IS a tag; a moving alias like latest/main pins nothing.`,
      );
    }
    return TAG_ONLY;
  }
  const normalized = sha256.toLowerCase();
  if (!SHA256_HEX.test(normalized)) {
    throw new Error(`from-url ${destRel}: sha256= must be 64 hex chars, or the literal ${TAG_ONLY}`);
  }
  return normalized;
}

/** True when the row declined a digest deliberately, rather than carrying one. */
export function isTagOnly(pin: string): boolean {
  return pin === TAG_ONLY;
}

/**
 * `rolling=<name>` declares that the bytes behind this URL are REPLACED IN
 * PLACE upstream -- a GitHub prerelease tag whose asset is re-uploaded, a
 * "latest" alias, a nightly. By itself it changes NOTHING about enforcement:
 * the digest is still mandatory and a mismatch still fails closed. What it
 * changes is the DIAGNOSIS. Without it, "sha256 mismatch" reads as corruption
 * or attack and sends the reader hunting for a compromise that did not happen;
 * with it, the message names the actual event, prints both digests, and gives
 * the one command that re-measures and re-pins.
 *
 * A DECLARED EXCEPTION is the second half, added 081M24396B2087G0R000MDMDEA on
 * the maintainer's ruling. It does not change the default either: a rolling row
 * with no row in `tools/setup/manifests/from-url-rolling-exceptions` still
 * fails closed here, and so does one whose row has expired. See
 * `rolling-exception.ts` for what the exception costs and what it does not.
 *
 * The rule the message has to carry, because it is the whole point of the
 * regime: BUMPING THE DIGEST TO MAKE A RED TREE GREEN IS THE FAILURE MODE.
 * It swaps the verifier under every claim the verifier ever established, in a
 * one-line diff that looks like housekeeping. An auto-accept does NOT bump the
 * digest -- the pin stays where it is and keeps disagreeing.
 */
export { rollingRemedy };

function checkRequires(requires: string | undefined, logWarn: (msg: string) => void): void {
  if (!requires) return;
  for (const req of requires.split(",")) {
    const trimmed = req.trim();
    if (trimmed.length === 0) continue;
    if (trimmed === "java") {
      if (!commandOnPath("java")) {
        throw new Error("from-url entry requires java on PATH");
      }
      continue;
    }
    logWarn(`unknown requires=${trimmed}; skipping check`);
  }
}

/**
 * Runs an exception row's `verify=` argv under `bun`, in the repo root.
 *
 * `ok` is "the process exited 0" and nothing softer. A spawn that could not
 * start at all (`status === null`, no bun, ENOENT) is NOT a pass -- it is a
 * check that did not run, and it is reported as a failure so the accept path
 * refuses rather than treating an unanswerable question as a yes.
 */
function runVerifyUnderBun(repoRoot: string, argv: readonly string[]): { ok: boolean; transcript: string } {
  const run = spawnSync("bun", [...argv], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const transcript = (run.stdout ?? "") + (run.stderr ?? "");
  if (run.status === null) {
    return {
      ok: false,
      transcript: transcript + "\nverify could not be spawned: " + String(run.error?.message ?? "unknown"),
    };
  }
  return { ok: run.status === 0, transcript };
}

async function downloadWithOuterRetry(
  dest: string,
  destRel: string,
  url: string,
  sha256: string,
  rolling: string | undefined,
  exception: RollingException | null,
  repoRoot: string,
  dryRun: boolean,
  log: (msg: string) => void,
): Promise<void> {
  if (dryRun) {
    log(`dry-run: would download ${dest} ← ${url}`);
    return;
  }

  const part = `${dest}.part`;
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // The fetch and the digest are the only things that may be RETRIED: they
    // are the transport-class failures. Everything after this block is a
    // judgement about bytes that already arrived, and retrying a judgement just
    // asks the same question of the same bytes four times.
    let fetched: string;
    try {
      await curlFetchToFile(part, url);
      // Hash BEFORE the rename: bytes that fail the pin must never reach the
      // destination, where the next run's existence check would adopt them.
      fetched = sha256File(part);
    } catch (err) {
      removeIfPresent(part);
      if (attempt >= maxAttempts) throw err;
      const sleepS = attempt * 30;
      log(`  attempt ${String(attempt)}/${String(maxAttempts)} failed; retrying in ${String(sleepS)}s`);
      await Bun.sleep(sleepS * 1000);
      continue;
    }

    // A TAG-ONLY row has no digest to disagree with. It still hashes the bytes --
    // the digest is RECORDED so an operator can see what arrived and diff two
    // machines -- but the value is a report, never a verdict. Logged at accept time
    // rather than swallowed: an unpinned install nobody can see is worse than the
    // pin it replaced.
    if (isTagOnly(sha256)) {
      log(`  tag-only pin: accepted ${dest} sha256=${fetched} (no digest pinned; see tagonly= on its row)`);
      renameSync(part, dest);
      return;
    }

    if (fetched === sha256) {
      renameSync(part, dest);
      return;
    }

    // UPSTREAM DISAGREES WITH THE PIN. For a non-rolling row that is a
    // supply-chain event and there is nothing to say but the digests.
    if (rolling === undefined) {
      removeIfPresent(part);
      throw new Error(
        `sha256 mismatch for ${destRel}: expected ${sha256}, got ${fetched}`,
      );
    }

    // A rolling row: `decideRollingAccept` is the ONLY thing that can turn this
    // into an acceptance, and with `exception === null` it never does.
    const decision = decideRollingAccept(
      { dest: destRel, rolling, pinned: sha256, fetched, exception },
      {
        runVerify: (argv) => runVerifyUnderBun(repoRoot, argv),
        appendRecord: (line) => {
          appendAcceptanceRecord(repoRoot, line);
        },
        nowIso: () => new Date().toISOString(),
      },
    );
    if (!decision.accepted) {
      removeIfPresent(part);
      throw new Error(decision.message);
    }
    renameSync(part, dest);
    log(decision.message);
    return;
  }
}

function isMissing(err: unknown): boolean {
  return (err as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

/** The file's digest, or null when it is simply not there. Never a throw for absence. */
function digestIfPresent(path: string): string | null {
  try {
    return sha256File(path);
  } catch (err) {
    if (isMissing(err)) return null;
    throw err;
  }
}

function removeIfPresent(path: string): void {
  try {
    unlinkSync(path);
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
}

export const realizeFromUrl: SetupRealizer = async (ctx) => {
  const text = readManifestFile(ctx.repoRoot, MANIFEST);
  if (text === null) {
    ctx.log("✓ from-url: no manifest; skipping");
    return finishResult("from-url", ctx, true);
  }

  const entries = parseMechanismManifest(text);
  // Read once, for the whole realizer. The clock is read once too and passed
  // down: a run that straddles midnight must not have an exception expire
  // halfway through it and treat two identical rows differently.
  const exceptions = loadRollingExceptions(ctx.repoRoot);
  const today = new Date().toISOString().slice(0, 10);
  for (const entry of entries) {
    const destRel = entry.tokens[0];
    const url = entry.tokens[1];
    if (destRel === undefined || url === undefined) continue;

    const sha256 = requireSha256(destRel, entry.attrs, url);
    checkRequires(entry.attrs.requires, ctx.warn);

    const dest = resolveRepoRelativeDest(ctx.repoRoot, destRel);
    mkdirSync(dirname(dest), { recursive: true });

    const rolling = entry.attrs.rolling;
    // An exception is meaningless without `rolling=`, and letting one apply to
    // an IMMUTABLE row would be the worst version of this feature: on an
    // immutable upstream a byte change is a supply-chain event, not a rebuild,
    // and auto-accepting it is exactly what must never happen. The lint refuses
    // such a row too; this is the second, independent refusal, at the only
    // place that could act on it.
    const exception =
      rolling === undefined ? null : activeExceptionFor(exceptions, destRel, today);

    // Present is not the same as correct, so this hashes rather than asking
    // whether the path exists: a partial, poisoned, or re-uploaded-upstream file
    // is exactly what a bare existence check waves through. Reading first and
    // interpreting ENOENT is also one syscall with one answer -- an existsSync
    // gate would already be stale by the time the unlink below ran.
    const onDisk = digestIfPresent(dest);
    if (onDisk === sha256) {
      ctx.log(`✓ ${destRel} already present (sha256 verified)`);
      continue;
    }
    if (onDisk !== null) {
      // A WRONG FILE ON DISK IS RECOVERABLE, so recover instead of wedging.
      // This used to throw, which made every already-provisioned machine -- dev
      // laptop, warm CI cache, devcontainer layer -- fail the WHOLE from-url
      // realizer (it is not best-effort, so install.sh aborts) the moment a pin
      // moved or a byte flipped, with no remedy printed and no way out but a
      // hand `rm`. The stale bytes are not evidence of anything; the PIN is.
      //
      // Fail-closed is untouched: the replacement is verified before it is put
      // in place, so this can only ever end with the pinned bytes or an error.
      ctx.warn(
        `${destRel}: on-disk sha256=${onDisk} disagrees with the pin ${sha256}` +
          " -- discarding those bytes and re-fetching from the pinned URL",
      );
      removeIfPresent(dest);
    }

    if (!url.startsWith("https://")) {
      throw new Error(`from-url requires HTTPS for ${destRel} (${url})`);
    }

    ctx.log(`↓ from-url: ${destRel} ← ${url}`);
    ctx.actions.push(ctx.dryRun ? `dry-run: curl ${url} → verify sha256 → ${dest}` : `curl ${url} → verify sha256 → ${dest}`);
    await downloadWithOuterRetry(
      dest,
      destRel,
      url,
      sha256,
      rolling,
      exception,
      ctx.repoRoot,
      ctx.dryRun,
      ctx.log,
    );
    ctx.log(`✓ ${destRel}`);
  }

  ctx.log("✓ from-url complete");
  return finishResult("from-url", ctx, false);
};
