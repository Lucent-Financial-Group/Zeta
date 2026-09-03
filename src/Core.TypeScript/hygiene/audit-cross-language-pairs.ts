#!/usr/bin/env bun
/**
 * audit-cross-language-pairs.ts — which concepts exist in BOTH F# and TypeScript with nothing
 * checking they agree.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * A sweep of the 538 F# modules against the TypeScript ones found 68 concepts implemented in both
 * languages, six of them unpinned: `ErasureCharge`, `IndexedZSet`, `IoBoundary`, `RecoverableSpine`,
 * `SnapshotStore`, `SpecializationCache`. All six are pinned now, and three of the six treaties
 * found a live defect — two of them silent data loss.
 *
 * **That sweep was done by hand, once.** So the finding was real and the CAPABILITY was not: a
 * seventh unpinned pair added tomorrow is invisible, and the only thing standing between the fleet
 * and a silent divergence is somebody remembering to look again. A one-time audit that found three
 * defects is an argument for making it standing, not for trusting the memory of it.
 *
 * ── WHAT "PINNED" MEANS HERE, AND WHAT IT DOES NOT ───────────────────────────
 * Pinned = there is an artifact whose job is to make the two implementations answer the same
 * question: a treaty transcript, a golden-vector file, or an F# replay test named for the concept.
 *
 * This audit checks that such an artifact EXISTS and names the concept. It does **not** check that
 * the artifact is any good — a treaty with one vacuous vector would pass here. Mutation matrices are
 * what judge a treaty's quality, and they are per-treaty work that no roster can do. Said plainly so
 * a green run is not read as "the pairs agree"; it means "nobody has left a pair unwatched".
 *
 * ── THE HONEST LIMIT OF THE PAIRING ITSELF ───────────────────────────────────
 * Pairing is by NAME: F# `IndexedZSet.fs` to TypeScript `indexed-z-set`. That finds concepts whose
 * authors used the same word in both languages and misses a pair that was deliberately renamed. It
 * therefore UNDER-reports, which is the safe direction for a roster whose failure mode would
 * otherwise be false confidence — but it is a floor on the real count, not the count.
 *
 * Usage:
 *   bun src/Core.TypeScript/hygiene/audit-cross-language-pairs.ts            # report + exit code
 *   bun src/Core.TypeScript/hygiene/audit-cross-language-pairs.ts --list     # every pair
 */

import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { basename, join } from "node:path";

const REPO_ROOT = process.cwd();
const FSHARP_DIR = join(REPO_ROOT, "src", "Core");
const TS_DIR = join(REPO_ROOT, "src", "Core.TypeScript");
const FSHARP_TESTS = join(REPO_ROOT, "tests", "Tests.FSharp");

/** `IndexedZSet` -> `indexed-z-set`. The naming convention the two trees actually follow. */
export function kebabOf(pascal: string): string {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Every file under `dir`, recursively, as repo-relative paths. */
function walk(dir: string, out: string[] = []): string[] {
  // One syscall, one answer. An `existsSync` before the read is a check-then-use race (CWE-367)
  // that this repo's own `lint-check-then-use-file-races` refuses: between the two calls the path
  // can be created, deleted or replaced, so the check's answer is already stale when the use runs.
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return out;
    throw e;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "bin" || entry.name === "obj") continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

export interface Pair {
  readonly concept: string;
  readonly fsharp: string;
  readonly typescript: string;
  readonly pinnedBy: readonly string[];
}

/**
 * The artifacts that count as a pin, and why each one does:
 *
 *   a treaty transcript   one side generates, the other replays — the strongest form
 *   golden vectors        a shared seed both sides must reproduce
 *   an F# replay test     named `<Concept>Treaty` or `<Concept>Interop`
 */
/**
 * Concepts whose evidence is named for the ARTIFACT rather than the concept.
 *
 * Name-matching finds a pin when someone named the treaty after the module. Three real pins are not
 * named that way, and reporting them as unwatched would be a false alarm in the roster whose whole
 * value is that its alarms mean something. Each entry names the file that actually pins it, so a
 * reader can check the claim rather than trust the map.
 */
const PIN_ALIASES: ReadonlyMap<string, readonly string[]> = new Map([
  // The manifest IS the snapshot store's cross-language surface — filename and `LATEST.json`.
  ["SnapshotStore", ["SnapshotManifestInterop", "snapshot-interop-fixture"]],
  // The log's frames and directory layout are what a spine's recovery crosses on.
  ["DiskDeltaLog", ["DeltaLogInterop", "delta-log-interop-fixture"]],
  ["RecoverableSpine", ["DeltaLogInterop", "SnapshotManifestInterop"]],
]);

function pinsFor(concept: string, kebab: string, tsFiles: readonly string[], fsTestFiles: readonly string[]): string[] {
  const pins: string[] = [];

  const aliases = PIN_ALIASES.get(concept) ?? [];
  for (const alias of aliases) {
    for (const f of [...tsFiles, ...fsTestFiles]) {
      if (basename(f).includes(alias)) pins.push(f);
    }
  }

  for (const f of tsFiles) {
    const b = basename(f);
    const isEvidence = b.includes("golden-vectors") || b.includes("treaty-transcript") || b.includes("interop-fixture");
    if (!isEvidence) continue;
    // The evidence must belong to this concept: either its directory is the concept's, or its
    // filename names it. A repo-wide `golden-vectors.json` elsewhere is not this pair's pin.
    if (f.replace(/\\/g, "/").includes(`/${kebab}/`) || b.includes(kebab)) pins.push(f);
  }

  for (const f of fsTestFiles) {
    const b = basename(f);
    if (b.startsWith(`${concept}Treaty`) || b.startsWith(`${concept}Interop`)) pins.push(f);
    // `SnapshotStore` is pinned by `SnapshotManifestInterop`, so allow a prefix match on the
    // concept's leading word when the file also says Treaty/Interop.
    else if ((b.includes("Treaty") || b.includes("Interop")) && b.includes(concept)) pins.push(f);
  }

  return pins;
}

export function findPairs(): Pair[] {
  const fsharpFiles = walk(FSHARP_DIR).filter((f) => f.endsWith(".fs"));
  const tsFiles = walk(TS_DIR);
  const fsTestFiles = walk(FSHARP_TESTS).filter((f) => f.endsWith(".fs"));

  const tsPathSet = new Set(tsFiles.map((f) => f.replace(/\\/g, "/")));
  const tsDirs = new Set<string>();
  for (const f of tsFiles) {
    const parts = f.replace(/\\/g, "/").split("/");
    parts.pop();
    tsDirs.add(parts.join("/"));
  }

  const pairs: Pair[] = [];
  for (const fsPath of fsharpFiles) {
    const concept = basename(fsPath, ".fs");
    const kebab = kebabOf(concept);

    // A TypeScript counterpart is either a module file or a directory named for the concept.
    const tsRoot = TS_DIR.replace(/\\/g, "/");
    const asFile = [`${tsRoot}/${kebab}.ts`, `${tsRoot}/${kebab}/${kebab}.ts`];
    const asDir = `${tsRoot}/${kebab}`;

    let ts: string | undefined;
    for (const cand of asFile) if (tsPathSet.has(cand)) ts = cand;
    if (ts === undefined) {
      // Any nested module with exactly this basename counts, e.g. algebra/erasure-charge.ts.
      const nested = tsFiles.find((f) => basename(f) === `${kebab}.ts`);
      if (nested !== undefined) ts = nested.replace(/\\/g, "/");
      // No `statSync` confirmation: `tsDirs` was built from `withFileTypes` entries during the
      // walk, so it already holds only real directories. Asking the filesystem again would be a
      // second syscall answering a question the listing already answered — and a race besides.
      else if (tsDirs.has(asDir)) ts = asDir;
    }
    if (ts === undefined) continue;

    pairs.push({ concept, fsharp: fsPath, typescript: ts, pinnedBy: pinsFor(concept, kebab, tsFiles, fsTestFiles) });
  }
  return pairs.sort((a, b) => (a.concept < b.concept ? -1 : a.concept > b.concept ? 1 : 0));
}

/**
 * Pairs that are unpinned ON PURPOSE, each with the reason.
 *
 * An allowlist with no reasons is a way to make a check quiet; the reason is what lets the next
 * reader judge whether it still holds.
 */
export const DECLARED_UNPINNED: ReadonlyMap<string, string> = new Map([]);

const BASELINE_PATH = join(REPO_ROOT, "src", "Core.TypeScript", "hygiene", "audit-cross-language-pairs.baseline.json");

interface Baseline {
  readonly unpinned: readonly string[];
}

export function readBaseline(): Baseline {
  // Same rule as `walk`: read and interpret the failure, rather than ask first and act on a stale
  // answer. A MISSING baseline is an empty one — the honest reading for a repo that has not
  // recorded any pairs yet. Any other error is re-thrown, because "I could not read the baseline"
  // and "there is nothing baselined" are different facts and collapsing them would silently turn
  // every recorded pair back into a new failure.
  let raw: string;
  try {
    raw = readFileSync(BASELINE_PATH, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { unpinned: [] };
    throw e;
  }
  return JSON.parse(raw) as Baseline;
}

if (import.meta.main) {
  const pairs = findPairs();
  const unpinned = pairs.filter((p) => p.pinnedBy.length === 0 && !DECLARED_UNPINNED.has(p.concept));
  const baseline = readBaseline();
  const known = new Set(baseline.unpinned);
  const fresh = unpinned.filter((p) => !known.has(p.concept));

  if (process.argv.includes("--list")) {
    for (const p of pairs) {
      const mark = p.pinnedBy.length > 0 ? "PINNED" : "unpinned";
      console.log(`  ${mark.padEnd(9)} ${p.concept}`);
      for (const pin of p.pinnedBy) console.log(`              ${pin.replace(REPO_ROOT, "").replace(/\\/g, "/")}`);
    }
    console.log("");
  }

  console.log(
    `cross-language pairs: ${String(pairs.length)} concept(s) implemented in BOTH F# and TypeScript, ` +
      `${String(pairs.length - unpinned.length)} pinned, ${String(unpinned.length)} not.`,
  );

  if (unpinned.length > 0) {
    console.log("\nunpinned (no treaty transcript, golden vectors, or F# replay names them):");
    for (const p of unpinned) console.log(`  ${p.concept}`);
  }

  if (fresh.length > 0) {
    console.log(
      `\n::error::${String(fresh.length)} NEW unpinned cross-language pair(s): ${fresh.map((p) => p.concept).join(", ")}`,
    );
    console.log(
      "Two implementations of one idea with nothing checking they agree. Three of the six found by\n" +
        "the original hand sweep carried a live defect, two of them silent data loss — so this is the\n" +
        "class that does not announce itself. Pin it with a treaty, or declare it in DECLARED_UNPINNED\n" +
        "with the reason it does not need one.",
    );
    process.exit(1);
  }

  console.log(
    "\nOK — no pair is unwatched beyond the recorded baseline. Note this checks that a pin EXISTS, not\n" +
      "that it is any good: a treaty with one vacuous vector passes here, and only a mutation matrix\n" +
      "can judge that.",
  );
}
