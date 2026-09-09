#!/usr/bin/env bun
// repin-rolling.ts — re-measure, then re-pin, a ROLLING from-url row.
//
// THE ONE SENTENCE THIS FILE EXISTS FOR:
//
//   BUMPING THE DIGEST WITHOUT RE-MEASURING IS THE FAILURE MODE. It is a
//   one-line diff that reads as housekeeping and is actually a verifier swap:
//   every claim the old verifier established is now resting on a verifier
//   nobody ran.
//
// A rolling row (`rolling=<name>` in tools/setup/manifests/from-url) declares
// that upstream REPLACES the asset behind the URL. The digest is still the pin
// and still fails closed; what changes is that the failure is EXPECTED and
// recurs. Measured for tla2tools on 2026-09-09: the v1.8.0 prerelease asset was
// rebuilt twice in three hours, and `tlaplus` master saw commits on 24 distinct
// days over the preceding 180. So this will fire roughly weekly, and a re-pin
// that is tedious or spread across five files is a re-pin someone will shortcut.
//
// So the re-pin is ONE COMMAND that does the whole thing in the right order and
// REFUSES TO WRITE ANYTHING PERMANENT unless the declared re-measure passed:
//
//   1. fetch the URL, hash it. Same digest  -> nothing to do, exit 0.
//   2. put the new bytes in place, keeping the old ones as <dest>.prepin.
//   3. rewrite the digest and the derived identity in every file the row
//      declares as a `pinsurfaces=` restatement, plus the manifest row itself.
//      `derivedpins=` files are those whose OWN sha256 is quoted inside a pin
//      surface (registry/tlc-models.json is quoted by nci-witness-receipt.ts);
//      their digests are recomputed after the edits and swapped too.
//   4. run the row's declared `remeasure=` argv, capturing all output.
//   5. FAILED -> restore every touched file and the old bytes, exit 1.
//      PASSED -> write the transcript as evidence and append the receipt row.
//
// The receipt is what `lint-verifier-jar-provenance.ts` demands before it will
// accept a rolling pin, so skipping this tool and hand-editing the manifest
// leaves the tree red until someone also hand-writes a receipt -- a second,
// explicit, reviewable assertion rather than a hex string in a diff.
//
// Honest limits, stated rather than implied:
//   * a hand-written receipt still passes the lint. Nothing here can tell an
//     earned attestation from a typed one; see the ledger's own header.
//   * this tool WRITES to the working tree. It never commits, never pushes,
//     and restores what it touched when the re-measure fails.
//
// Usage:
//   bun tools/setup/repin-rolling.ts --list
//   bun tools/setup/repin-rolling.ts --check <dest>   # report only; exit 1 if rebuilt
//   bun tools/setup/repin-rolling.ts <dest>           # re-measure and re-pin
//
// Exit codes:
//   0  nothing to do, or re-measured and re-pinned
//   1  a rebuild is pending (--check), or the re-measure failed
//   2  the check could not run (bad argv, unknown dest, no network, no bun)
//
// 081M23ESC5B087G0R002HJ39DG

import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { curlFetchToFile } from "../../src/Core.TypeScript/ace/setup-realizers/curl-fetch.ts";
import {
  alloyVersionFromManifest,
  jarManifestText,
  parseFromUrlPins,
  tlcVersionFromManifest,
  ROLLING_RECEIPTS,
  type UrlPin,
} from "../../src/Core.TypeScript/hygiene/lint-verifier-jar-provenance.ts";

const FROM_URL_MANIFEST = "tools/setup/manifests/from-url";
const EVIDENCE_DIR = "docs/cross-verify";

export type IdentityKind = "jar-tlc" | "jar-alloy";

/** `identity=` names HOW to read a human identity out of the bytes. */
export function deriveIdentity(kind: string | undefined, absPath: string): string | null {
  if (kind === undefined || kind === "") return null;
  const text = jarManifestText(absPath);
  if (kind === "jar-tlc") return tlcVersionFromManifest(text);
  if (kind === "jar-alloy") return alloyVersionFromManifest(text);
  throw new Error(`unknown identity=${kind} (jar-tlc|jar-alloy)`);
}

/**
 * The SHAPE a derived identity takes, per `identity=` kind.
 *
 * WHY THIS EXISTS — a defect measured 2026-09-09 (081M24396B2087G0R000MDMDEA).
 * The old identity was derived from the OLD BYTES, via the `.prepin` backup. On
 * a tree that does not already hold the previously-pinned artefact -- every CI
 * runner with a cold cache, every fresh clone, and every machine whose jar was
 * replaced by an auto-accept -- there are no old bytes, `oldIdentity` came back
 * `null`, and the identity restatement inside `pinsurfaces=` was silently never
 * rewritten. The digest moved, `registry/tlc-models.json`'s `versionBanner` did
 * not, and the re-measure then failed on a banner mismatch that says nothing
 * about any model. MEASURED: 52 of 52 models "failed" that way, after six
 * minutes, and the tool rolled back correctly and unhelpfully.
 *
 * The previous identity is not gone, though -- it is written down, in the pin
 * surfaces, which is exactly where the tool is about to rewrite it. So read it
 * from there. That is a fallback rather than the primary source because the
 * BYTES are the better authority when they exist: a surface can already have
 * drifted, and matching against bytes cannot.
 */
export function identityPattern(kind: string): RegExp {
  // THE PATTERN MUST MATCH EXACTLY WHAT `deriveIdentity` EMITS -- no more.
  //
  // MEASURED DEFECT, 2026-09-09, caught before it shipped: the first version of
  // this pattern included the `TLC2 Version ` prefix, because that is how the
  // banner READS in the surface. But `tlcVersionFromManifest` returns
  // `2026.09.09.213036 (rev: ede5b88)` WITHOUT that prefix, so substituting the
  // wider match with the narrower value silently DELETED the prefix from every
  // pin surface -- turning `"versionBanner": "TLC2 Version 2026...(rev: ...)"`
  // into `"versionBanner": "2026...(rev: ...)"`.
  //
  // WHY THAT IS DANGEROUS RATHER THAN COSMETIC: `judgeToolchainBanner` asks
  // `stdout.includes(expected)`, and the truncated string is still a substring
  // of TLC's real banner. So the sweep passed 52/52 and NOTHING went red -- the
  // verifier pin just got weaker, permanently, in a diff that reads as a routine
  // re-pin. A check that quietly stops checking part of what it checked is the
  // vacuity class arriving by erosion.
  //
  // So: match the derived form only, and let the surrounding prose keep its own
  // prefix. `identityRoundTrips` below is the falsifier for this.
  if (kind === "jar-tlc") return /\d{4}\.\d{2}\.\d{2}\.\d{6} \(rev: [0-9a-f]+\)/g;
  // Alloy: `<Bundle-Version> (rev: <Git-Descriptor>)`, as `alloyVersionFromManifest` emits it.
  if (kind === "jar-alloy") return /\d+(?:\.\d+)+ \(rev: [^)\s]+\)/g;
  throw new Error(`unknown identity=${kind} (jar-tlc|jar-alloy)`);
}

/**
 * The invariant the defect above violated: an identity DERIVED from bytes must
 * be matched WHOLE by the pattern used to find its predecessor in a surface.
 * If the pattern can match something wider, substitution truncates; if narrower,
 * substitution leaves a fragment. Either way the restatement stops meaning what
 * it meant.
 */
export function identityRoundTrips(kind: string, derived: string): boolean {
  const matches = [...derived.matchAll(identityPattern(kind))].map((m) => m[0]);
  return matches.length === 1 && matches[0] === derived;
}

/**
 * The single identity string the pin surfaces agree on, or null.
 *
 * FAILS CLOSED ON AMBIGUITY, deliberately: zero matches means the surfaces
 * carry no identity to move, and two DIFFERENT matches means they already
 * disagree with each other. Picking one in either case would rewrite half a
 * tree and call it a re-pin, so both answer `null` and the caller refuses
 * BEFORE spending a re-measure.
 */
export function identityFromSurfaces(kind: string, texts: readonly string[]): string | null {
  const found = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(identityPattern(kind))) found.add(match[0]);
  }
  return found.size === 1 ? ([...found][0] as string) : null;
}

export function sha256Of(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// An existsSync that gates a copy or an unlink is already stale by the time the
// operation runs -- one question, a different answer. Do the operation and
// interpret ENOENT, which is one syscall with one answer and no window.
function isMissing(err: unknown): boolean {
  return (err as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

/** true when bytes were copied, false when the source simply was not there. */
function copyIfPresent(from: string, to: string): boolean {
  try {
    copyFileSync(from, to);
    return true;
  } catch (err) {
    if (isMissing(err)) return false;
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

/**
 * Replace every occurrence of each old value with its new one.
 *
 * Returns the count so a caller can tell "rewrote 3 places" from "rewrote
 * nothing" -- and a pin surface that matched NOTHING is a finding, because it
 * means the row's `pinsurfaces=` list has drifted from where the digest
 * actually lives.
 */
export function substituteAll(
  text: string,
  pairs: ReadonlyArray<readonly [string, string]>,
): { readonly text: string; readonly replacements: number } {
  let out = text;
  let replacements = 0;
  for (const [from, to] of pairs) {
    if (from === "" || from === to) continue;
    const parts = out.split(from);
    replacements += parts.length - 1;
    out = parts.join(to);
  }
  return { text: out, replacements };
}

/** The manifest row, with `sha256=<old>` swapped for the new digest. */
export function rewriteManifestRow(text: string, dest: string, oldSha: string, newSha: string): string {
  const lines = text.split("\n");
  let touched = false;
  const out = lines.map((line) => {
    // No separate comment guard, deliberately. A `#` comment's first token is
    // `#` (or `#something`), never the bare dest, so the dest check below
    // already leaves every comment untouched -- and an EXTRA guard that cannot
    // change any outcome is a line no test can kill, which is the vacuity class
    // in miniature. Measured: a `startsWith("#")` guard here SURVIVED mutation.
    const tokens = line.trim().split(/\s+/);
    if (tokens[0] !== dest) return line;
    touched = true;
    return line.replace("sha256=" + oldSha, "sha256=" + newSha);
  });
  if (!touched) throw new Error(`${FROM_URL_MANIFEST} has no row for ${dest}`);
  return out.join("\n");
}

export function receiptRow(
  dest: string,
  sha256: string,
  measured: string,
  remeasure: string,
  evidence: string,
): string {
  return [
    dest,
    "sha256=" + sha256,
    "measured=" + measured,
    "result=pass",
    "remeasure=" + remeasure,
    "evidence=" + evidence,
  ].join("  ");
}

function repoRootOf(): string {
  return join(import.meta.dir, "..", "..");
}

function die(code: 1 | 2, message: string): never {
  process.stderr.write(message + "\n");
  process.exit(code);
}

function findPin(repoRoot: string, dest: string): UrlPin {
  const pins = parseFromUrlPins(readFileSync(join(repoRoot, FROM_URL_MANIFEST), "utf8"));
  const pin = pins.find((p) => p.dest === dest);
  if (pin === undefined) die(2, `no ${FROM_URL_MANIFEST} row for ${dest}`);
  if (pin.rolling === null) {
    die(
      2,
      `${dest} is not a rolling row. An immutable upstream that changed its bytes is` +
        " NOT a re-pin -- it is a supply-chain event, and this tool must not paper over it.",
    );
  }
  if (pin.sha256 === null) die(2, `${dest} has no sha256= pin to move`);
  if (pin.remeasure === null) die(2, `${dest} declares no remeasure= command`);
  return pin;
}

/**
 * The manifest is a committed, reviewed surface -- but "reviewed" is a process
 * claim and this is a mechanical one, so the scheme is checked here rather than
 * assumed. `realizeFromUrl` already refuses a non-HTTPS row; this tool reads the
 * same rows and had no such guard, which was a real gap and is what CodeQL's
 * "outbound request depends on file data" was pointing at.
 *
 * A redirect is followed, and that is deliberate -- GitHub release assets are
 * served via a redirect to a CDN -- so the guard is on the row's declared URL,
 * not on every hop. What makes that safe is the layer below: nothing fetched
 * here is trusted, it is measured, and it does not become the pin until the
 * declared re-measure has passed against it.
 */
/**
 * THROWS rather than exiting, so the guard is reachable from a test. A scheme
 * guard no test can exercise is a guard nobody knows works -- and this one was
 * missing entirely until CodeQL pointed at the flow. Parsed rather than
 * prefix-matched: `new URL` normalises case and rejects the shapes a
 * `startsWith` accepts by accident.
 */
export function assertHttpsUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`from-url ${url}: not a URL`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`from-url ${url}: HTTPS required (the realizer refuses this row too)`);
  }
  return parsed;
}

/**
 * ONE FETCHER, not two. This routes through `curlFetchToFile` -- the same
 * function `setup-realizers/from-url.ts` uses for exactly these rows -- rather
 * than adding a second downloader with its own timeout, redirect and retry
 * behaviour that would drift from the realizer's. The digest that matters is
 * computed by the caller from what actually landed.
 */
export async function fetchToBuffer(url: string): Promise<Uint8Array> {
  const parsed = assertHttpsUrl(url);
  const scratch = join(mkdtempSync(join(tmpdir(), "zeta-repin-")), "asset");
  await curlFetchToFile(scratch, parsed.toString());
  const bytes = readFileSync(scratch);
  removeIfPresent(scratch);
  return new Uint8Array(bytes);
}

/**
 * Stage, verify what landed, then rename -- the same discipline
 * `setup-realizers/from-url.ts` uses, and for the same reason: a short write, a
 * full disk, or a truncated body must never leave partial bytes at the path a
 * runner loads from. `digest` is the hash of what we INTENDED to write, so this
 * catches the write going wrong; it cannot and does not claim to say the
 * upstream bytes are the right ones. Only the re-measure says that.
 */
export function stageVerifiedWrite(dest: string, bytes: Uint8Array, digest: string): void {
  const part = dest + ".part";
  writeFileSync(part, bytes);
  const landed = sha256Of(readFileSync(part));
  if (landed !== digest) {
    removeIfPresent(part);
    // THROWS rather than exiting: a process.exit here would be untestable, and a
    // guard no test can exercise is a guard nobody knows works.
    throw new Error(
      `wrote ${part} but it hashes to ${landed}, not ${digest} -- the write did not land intact`,
    );
  }
  renameSync(part, dest);
}

interface Restore {
  readonly rel: string;
  readonly text: string;
}

async function main(argv: readonly string[]): Promise<number> {
  const repoRoot = repoRootOf();
  if (argv.includes("--list")) {
    const pins = parseFromUrlPins(readFileSync(join(repoRoot, FROM_URL_MANIFEST), "utf8"));
    for (const pin of pins) {
      if (pin.rolling !== null) process.stdout.write(`${pin.dest}  rolling=${pin.rolling}\n`);
    }
    return 0;
  }
  const checkOnly = argv.includes("--check");
  const dest = argv.find((a) => !a.startsWith("--"));
  if (dest === undefined) {
    die(2, "usage: bun tools/setup/repin-rolling.ts [--check] <dest> | --list");
  }

  const pin = findPin(repoRoot, dest);
  const oldSha = pin.sha256 as string;
  const remeasure = pin.remeasure as string;

  process.stdout.write(`fetching ${pin.url}\n`);
  let bytes: Uint8Array;
  try {
    bytes = await fetchToBuffer(pin.url);
  } catch (err) {
    // Exit 2, not 1: a fetch that could not happen is a check that did not run.
    die(2, err instanceof Error ? err.message : String(err));
  }
  const newSha = sha256Of(bytes);
  if (newSha === oldSha) {
    process.stdout.write(`no rebuild: ${dest} upstream still serves sha256=${newSha}\n`);
    return 0;
  }
  process.stdout.write(
    `UPSTREAM REBUILT ${dest} (rolling=${String(pin.rolling)})\n` +
      `  pinned  sha256=${oldSha}\n  upstream sha256=${newSha}\n`,
  );
  if (checkOnly) {
    process.stdout.write(`re-measure and re-pin with: bun tools/setup/repin-rolling.ts ${dest}\n`);
    return 1;
  }

  const absDest = join(repoRoot, dest);
  const backup = absDest + ".prepin";
  const hadBytes = copyIfPresent(absDest, backup);
  // The BYTES are the better authority and are tried first. They are also often
  // absent (cold CI cache, fresh clone, an auto-accept having already replaced
  // them), and `identityFromSurfaces` below is what makes those trees
  // re-pinnable at all -- see `identityPattern`'s header for the measured
  // failure this repairs.
  const bytesIdentity = hadBytes ? deriveIdentity(pin.identity, backup) : null;
  mkdirSync(dirname(absDest), { recursive: true });
  stageVerifiedWrite(absDest, bytes, newSha);
  const newIdentity = deriveIdentity(pin.identity, absDest);

  // Snapshot every file we are about to touch so a failed re-measure restores
  // the tree rather than leaving a half re-pin behind.
  const touched = [...pin.pinSurfaces, FROM_URL_MANIFEST];
  const restore: Restore[] = touched.map((rel) => ({
    rel,
    text: readFileSync(join(repoRoot, rel), "utf8"),
  }));
  const rollback = (): void => {
    for (const item of restore) writeFileSync(join(repoRoot, item.rel), item.text);
    if (hadBytes) copyFileSync(backup, absDest);
    else removeIfPresent(absDest);
    removeIfPresent(backup);
  };

  // The identity to REPLACE. Bytes when we have them; otherwise whatever the pin
  // surfaces themselves currently say, read from the snapshot above so it is the
  // pre-edit text by construction.
  //
  // `bytesIdentity === newIdentity` also routes to the surfaces, and that case is
  // not hypothetical: after an auto-accept the artefact on disk IS the new build,
  // so the "old" bytes describe the new identity and would rewrite nothing.
  const surfaceTexts = restore
    .filter((item) => item.rel !== FROM_URL_MANIFEST)
    .map((item) => item.text);
  const oldIdentity =
    bytesIdentity !== null && bytesIdentity !== newIdentity
      ? bytesIdentity
      : pin.identity === undefined || pin.identity === ""
        ? null
        : identityFromSurfaces(pin.identity, surfaceTexts);
  // The round-trip invariant, ENFORCED rather than trusted. A pattern that does
  // not match its own derived identity exactly will truncate or fragment every
  // pin surface it touches, and -- because the banner check is a substring test
  // -- it can do so without turning anything red. Refuse before writing.
  if (pin.identity !== undefined && pin.identity !== "" && newIdentity !== null
      && !identityRoundTrips(pin.identity, newIdentity)) {
    rollback();
    die(
      2,
      `identity=${pin.identity} does not round-trip: the derived value` +
        `\n  "${newIdentity}"\n  is not matched WHOLE by identityPattern(${pin.identity}).` +
        "\n  Substituting would truncate or fragment every pin surface, and because the" +
        "\n  banner check is a substring test it could do so without failing anything." +
        "\n  Fix identityPattern so it matches exactly what deriveIdentity emits.",
    );
  }
  if (pin.identity !== undefined && pin.identity !== "" && oldIdentity === null) {
    rollback();
    // Exit 2 BEFORE the re-measure, not exit 1 after it. Six minutes of TLC
    // reporting a banner mismatch is a check that answered a question nobody
    // asked; this is the question that actually failed.
    die(
      2,
      `cannot determine the PREVIOUS identity=${pin.identity} for ${dest}.\n` +
        `  ${hadBytes ? "The bytes on disk describe the NEW build" : "The previously-pinned bytes are not in this tree"},` +
        " and the pin surfaces\n  carry no single identity string to move" +
        " (none found, or two that already disagree).\n" +
        "  Re-pinning would move the digest and leave the restatement behind, so it refuses.\n" +
        "  Surfaces read: " + pin.pinSurfaces.join(", "),
    );
  }

  // `derivedpins=` files have their OWN sha256 quoted inside a pin surface, so
  // their before-value has to be captured BEFORE the digest edits land.
  const derivedBefore = new Map<string, string>();
  for (const rel of pin.derivedPins) {
    derivedBefore.set(rel, sha256Of(readFileSync(join(repoRoot, rel))));
  }

  const pairs: Array<readonly [string, string]> = [[oldSha, newSha]];
  if (oldIdentity !== null && newIdentity !== null) pairs.push([oldIdentity, newIdentity]);
  for (const rel of pin.pinSurfaces) {
    const abs = join(repoRoot, rel);
    const before = readFileSync(abs, "utf8");
    const { text, replacements } = substituteAll(before, pairs);
    if (replacements === 0) {
      rollback();
      die(
        2,
        `${rel} is declared as a pinsurfaces= restatement of ${dest} but carries neither` +
          ` the old digest nor the old identity -- the row's pinsurfaces= list has drifted.`,
      );
    }
    writeFileSync(abs, text);
    process.stdout.write(`  rewrote ${String(replacements)} value(s) in ${rel}\n`);
  }
  for (const rel of pin.derivedPins) {
    const after = sha256Of(readFileSync(join(repoRoot, rel)));
    const before = derivedBefore.get(rel) ?? "";
    for (const surface of pin.pinSurfaces) {
      const abs = join(repoRoot, surface);
      const swapped = substituteAll(readFileSync(abs, "utf8"), [[before, after]]);
      if (swapped.replacements > 0) {
        writeFileSync(abs, swapped.text);
        process.stdout.write(`  rewrote derived digest of ${rel} in ${surface}\n`);
      }
    }
  }
  writeFileSync(
    join(repoRoot, FROM_URL_MANIFEST),
    rewriteManifestRow(readFileSync(join(repoRoot, FROM_URL_MANIFEST), "utf8"), dest, oldSha, newSha),
  );

  const argvRemeasure = remeasure.split(":");
  process.stdout.write(`\nre-measuring: bun ${argvRemeasure.join(" ")}\n`);
  const run = spawnSync("bun", argvRemeasure, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const transcript = (run.stdout ?? "") + (run.stderr ?? "");
  process.stdout.write(transcript);
  if (run.status !== 0) {
    rollback();
    die(
      1,
      `\nRE-MEASURE FAILED (exit ${String(run.status)}). Nothing was re-pinned and the tree` +
        " was restored.\nThe new upstream build DISAGREES with a pinned expectation. That is a" +
        "\nFINDING about the verifier, not a registry to edit: report it, and do not" +
        "\nreconcile an expectation to whatever the new build happens to print.",
    );
  }

  const measured = new Date().toISOString().slice(0, 10);
  const slug = (dest.split("/").pop() ?? dest).replace(/\.[^.]+$/, "");
  const evidence = `${EVIDENCE_DIR}/${measured}-${slug}-${newSha.slice(0, 8)}-remeasure.md`;
  mkdirSync(join(repoRoot, EVIDENCE_DIR), { recursive: true });
  writeFileSync(
    join(repoRoot, evidence),
    `# ${slug} ${newSha.slice(0, 8)} — re-measure, ${measured}\n\n` +
      `Evidence for the rolling re-pin of \`${dest}\`.\n\n` +
      `- upstream: ${pin.url} (rolling=${String(pin.rolling)})\n` +
      `- previous sha256: \`${oldSha}\`${oldIdentity === null ? "" : ` (${oldIdentity})`}\n` +
      `- new sha256: \`${newSha}\`${newIdentity === null ? "" : ` (${newIdentity})`}\n` +
      `- command: \`bun ${argvRemeasure.join(" ")}\`, exit 0\n\n` +
      "## Transcript\n\n```text\n" + transcript.trimEnd() + "\n```\n",
  );
  const receipts = readFileSync(join(repoRoot, ROLLING_RECEIPTS), "utf8").replace(/\n+$/, "\n");
  writeFileSync(
    join(repoRoot, ROLLING_RECEIPTS),
    receipts + receiptRow(dest, newSha, measured, remeasure, evidence) + "\n",
  );
  removeIfPresent(backup);
  process.stdout.write(
    `\nre-pinned ${dest} to sha256=${newSha}\n` +
      `evidence: ${evidence}\nreceipt appended to ${ROLLING_RECEIPTS}\n`,
  );
  return 0;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
