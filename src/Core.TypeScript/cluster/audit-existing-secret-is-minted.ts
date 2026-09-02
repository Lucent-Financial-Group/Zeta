#!/usr/bin/env bun
// audit-existing-secret-is-minted.ts -- an Application that names a Secret it does
// not create has a dependency on something OUTSIDE the manifest, and the dev lane
// has exactly one roster for those.
//
// ---------------------------------------------------------------------------
// THE BREAK THIS WAS WRITTEN FROM, WHICH WAS MINE
// ---------------------------------------------------------------------------
//
// The redis -> valkey migration (#16292) wrote:
//
//     auth:
//       usersExistingSecret: redis-auth   # create via Sealed Secret / Vault
//
// That comment is true of metal and false of the dev lane, and nothing said so.
// `applyDevBootstrapSecrets` mints the credentials Applications expect to find
// ALREADY PRESENT -- `monitoring/grafana-admin-credentials` for
// kube-prometheus-stack, the ziti admin Secret for oz -- and redis was never
// added to it. The chart then refuses to render a user with no credential, the
// Application sat OutOfSync/Progressing in the included proof, and the defect
// reached a lane rather than a check.
//
// The shape is one this repo already knows: change an Application, re-derive
// what is keyed to it. The observability roster taught it for a GENERATED FILE.
// This is the same lesson for a RUNTIME dependency, which is worse, because a
// stale generated file fails in CI in seconds and a missing Secret fails after a
// cluster has been built and an Application has tried to sync.
//
// ---------------------------------------------------------------------------
// WHAT IT CHECKS, AND THE ONE THING IT REFUSES TO GUESS
// ---------------------------------------------------------------------------
//
// Every `*existingSecret`-shaped value in every Application's `valuesObject` is
// a NAME, and a name is a promise that something else creates the object. The
// audit collects them and asks one question of each: does the dev bootstrap
// roster mint it?
//
//   MINTED      the roster carries it. Nothing to do.
//   NOT MINTED  refused, unless the baseline carries a reason -- because the
//               honest answers ("this Application is excluded from the dev lane
//               so it never needs one", "this is metal-only via Vault") are
//               CLAIMS, and a claim in this repo goes in a file with a lift
//               condition rather than in someone's head.
//
// IT DOES NOT decide whether an Application is applied in the dev lane. That
// question has three sources of truth already -- `DEV_EXCLUDED_REASONS`, the
// root catalogue's `excludeGlob`, and `isExcludedFromIncludedProof`'s rules --
// and a fourth reimplementation of it here would be a copy that drifts. So an
// excluded Application's Secret is carried in the baseline WITH its exclusion
// named, which keeps the two facts in one place and makes the entry go stale the
// day the exclusion lifts.
//
// Exit codes: 0 clean, 1 an unminted Secret or a stale acknowledgement, 2 usage.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAllDocuments } from "yaml";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
export const BASELINE_RELATIVE_PATH = "src/Core.TypeScript/cluster/existing-secret-is-minted.baseline.json";
const APPLICATIONS_DIR = "full-ai-cluster/k8s/applications";

/**
 * A key whose VALUE is the name of a Secret this manifest does not create.
 *
 * WIDENED FROM `existingSecret` ALONE, and the narrow version was wrong in the
 * ACQUITTING direction. `oz` names its credential `customAdminSecretName:
 * ziti-admin-credentials` -- a Secret the dev roster really does mint -- and the
 * first pattern here matched none of it. A guard that only recognises ONE
 * spelling does not prevent the class of defect it was built for; it prevents
 * that defect written one particular way, and the next one arrives spelled
 * differently. Found by noticing the minted count was 1 when the roster mints 2.
 *
 * So the rule is the SHAPE of the key, not a fixed vocabulary: anything ending
 * in `existingSecret` or in `secretName` (either case) is a promise that some
 * other actor creates that object.
 */
const SECRET_NAME_KEY = /(^|\.)[A-Za-z]*([Ee]xistingSecret|[Ss]ecretName)$/;

export interface SecretReference {
  /** Application directory — the name an operator sees. */
  readonly app: string;
  readonly manifest: string;
  /** Dotted path inside `valuesObject`. */
  readonly field: string;
  /** The Secret NAME the Application promises will exist. */
  readonly secretName: string;
}

export interface BaselineEntry {
  /** `<app>|<secretName>`. */
  readonly key: string;
  readonly reason: string;
  readonly liftsWhen: string;
}

export interface Adjudicated {
  readonly minted: readonly SecretReference[];
  readonly refused: readonly SecretReference[];
  readonly acknowledged: readonly SecretReference[];
  readonly staleKeys: readonly string[];
}

export function referenceKey(app: string, secretName: string): string {
  return `${app}|${secretName}`;
}

/** Walk a values tree, yielding `[dottedPath, value]` for every scalar leaf. */
function* leaves(node: unknown, path = ""): Generator<readonly [string, unknown]> {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) yield* leaves(item, `${path}[${String(index)}]`);
    return;
  }
  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      yield* leaves(value, path === "" ? key : `${path}.${key}`);
    }
    return;
  }
  yield [path, node];
}

/**
 * Every Secret NAME promised by an Application's `valuesObject`.
 *
 * Only non-empty strings count. An empty `existingSecret: ""` is the chart's own
 * "generate one for me" idiom in several charts, and refusing it would report a
 * working default as a missing dependency -- cry-wolf on the first run.
 */
export function collectSecretReferences(repoRoot = REPO_ROOT): readonly SecretReference[] {
  const root = resolve(repoRoot, APPLICATIONS_DIR);
  const out: SecretReference[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = join(APPLICATIONS_DIR, entry.name, "Application.yaml");
    let text: string;
    try {
      text = readFileSync(resolve(repoRoot, manifest), "utf8");
    } catch {
      continue;
    }
    for (const doc of parseAllDocuments(text)) {
      const value = doc.toJS() as Record<string, unknown> | null;
      if (value === null || typeof value !== "object") continue;
      const spec = value.spec as Record<string, unknown> | undefined;
      const source = spec?.source as Record<string, unknown> | undefined;
      const helm = source?.helm as Record<string, unknown> | undefined;
      const values = helm?.valuesObject;
      if (values === undefined) continue;
      for (const [field, leaf] of leaves(values)) {
        if (!SECRET_NAME_KEY.test(field)) continue;
        if (typeof leaf !== "string" || leaf.trim() === "") continue;
        out.push({ app: entry.name, manifest, field, secretName: leaf });
      }
    }
  }
  return out.sort((a, b) => (referenceKey(a.app, a.secretName) < referenceKey(b.app, b.secretName) ? -1 : 1));
}

export function readBaseline(path = BASELINE_RELATIVE_PATH, repoRoot = REPO_ROOT): readonly BaselineEntry[] {
  const raw = JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")) as { entries?: unknown };
  if (!Array.isArray(raw.entries)) throw new Error(`${path}: "entries" must be an array`);
  return raw.entries.map((value, index) => {
    const e = value as Record<string, unknown>;
    for (const field of ["key", "reason", "liftsWhen"] as const) {
      if (typeof e[field] !== "string" || (e[field] as string).trim().length === 0) {
        throw new Error(
          `${path}: entries[${String(index)}] has no "${field}" — an Application that depends on a Secret nobody ` +
            `mints must say WHY that is acceptable and WHAT lifts it, or the dependency is simply undeclared`,
        );
      }
    }
    return e as unknown as BaselineEntry;
  });
}

export function adjudicate(
  references: readonly SecretReference[],
  mintedNames: ReadonlySet<string>,
  baseline: readonly BaselineEntry[],
): Adjudicated {
  const byKey = new Map(baseline.map((e) => [e.key, e]));
  const used = new Set<string>();
  const minted: SecretReference[] = [];
  const refused: SecretReference[] = [];
  const acknowledged: SecretReference[] = [];
  for (const reference of references) {
    if (mintedNames.has(reference.secretName)) {
      minted.push(reference);
      continue;
    }
    const key = referenceKey(reference.app, reference.secretName);
    if (byKey.has(key)) {
      used.add(key);
      acknowledged.push(reference);
      continue;
    }
    refused.push(reference);
  }
  const staleKeys = baseline
    .filter((e) => !used.has(e.key))
    .map((e) => e.key)
    .sort();
  return { minted, refused, acknowledged, staleKeys };
}

export function exitCode(a: Adjudicated): number {
  return a.refused.length > 0 || a.staleKeys.length > 0 ? 1 : 0;
}

export function formatReport(a: Adjudicated): string {
  const lines: string[] = ["Applications that name a Secret they do not create", ""];
  for (const r of a.refused) {
    lines.push(
      `  REFUSED ${r.app} — names Secret \`${r.secretName}\` at ${r.field}`,
      `          ${r.manifest}`,
      `          Nothing mints it. Add it to DEV_BOOTSTRAP_SECRETS so the dev lane creates it,`,
      `          or carry it in ${BASELINE_RELATIVE_PATH} with a reason and a lift condition.`,
      "",
    );
  }
  for (const key of a.staleKeys) {
    lines.push(`  STALE ACKNOWLEDGEMENT ${key} — matches no reference; delete it`, "");
  }
  lines.push(
    `  minted by the dev roster (${String(a.minted.length)}): ${a.minted.map((r) => r.secretName).join(", ") || "none"}`,
    `  acknowledged (${String(a.acknowledged.length)}) — STILL UNMINTED. An acknowledgement buys a non-red gate,`,
    `  never a Secret in a cluster.`,
    "",
    exitCode(a) === 0
      ? "OK — every named Secret is minted by the dev roster, or acknowledged as deliberately not."
      : "FAILED — an Application depends on a Secret nothing creates.",
  );
  return lines.join("\n");
}

export function auditExistingSecretIsMinted(mintedNames: ReadonlySet<string>, repoRoot = REPO_ROOT): Adjudicated {
  return adjudicate(collectSecretReferences(repoRoot), mintedNames, readBaseline(BASELINE_RELATIVE_PATH, repoRoot));
}

async function main(): Promise<void> {
  // Imported lazily so the pure functions above stay testable without dragging
  // the dev-cluster port surface into every consumer.
  const { DEV_BOOTSTRAP_SECRETS } = (await import("./dev-cluster/lib.ts")) as {
    DEV_BOOTSTRAP_SECRETS: readonly { readonly name: string }[];
  };
  const result = auditExistingSecretIsMinted(new Set(DEV_BOOTSTRAP_SECRETS.map((s) => s.name)));
  process.stdout.write(`${formatReport(result)}\n`);
  process.exit(exitCode(result));
}

if (import.meta.main) await main();
