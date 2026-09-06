#!/usr/bin/env bun
// committed-chart-credentials.ts — no chart's values carry a SECRET as a literal.
//
// -- WHAT THIS IS FOR, AND WHY IT IS NARROW ---------------------------------
// Aaron 2026-09-05: "passwords can be auto generated on cluster started never stored and
// then just the same secrets can be injected to the pod that need them." That pattern is
// already built -- `DEV_BOOTSTRAP_SECRETS` mints per-cluster credentials from
// `randomBytes(24)`, logs nothing, and lets them die with the cluster.
//
// `audit-existing-secret-is-minted.ts` guards the REFERENCE side: a chart that names an
// `existingSecret` nothing mints. Nothing guarded the other side -- a chart whose values
// carry the secret ITSELF, as text, in a PUBLIC repository. That is the harder failure,
// because the manifest looks complete and every other check passes.
//
// -- WHAT IT FOUND, AND WHY THAT MAKES IT WORTH KEEPING --------------------
// The first scan of the whole cluster surface -- every Application `valuesObject` and every
// bootstrap `valuesContent` -- found FIVE credential-shaped literals, and all five are the
// SAME credential (`zeta-blob-store`'s S3 secret key: the seaweedfs producer plus loki and
// mimir x3 as consumers). So the population is one credential, not a sprawl, and this audit
// is a floor at zero as soon as 081M1S6Z5S3087G0R000GEPSS2 lands. Until then those five are
// acknowledged, so the class is CLOSED AGAINST NEW ONES today rather than after the
// migration.
//
// -- WHAT COUNTS AS A SECRET, AND WHAT DELIBERATELY DOES NOT ---------------
// Only the SECRET half of a credential pair. `accessKey` / `access_key_id` is an
// identifier, not a secret, and flagging it would train people to acknowledge non-problems
// -- which is how a roster stops being read. `secretKey`, `secret_access_key`, `password`,
// `token`, `apiKey`, `privateKey`, `clientSecret` are the leaf names that carry one.
//
// A value is FINE when it is empty (the chart default, to be supplied elsewhere), an
// environment reference (`${VAR}`, which is how a value arrives from a Secret at runtime),
// or a `valueFrom`/`existingSecret`-style indirection. It is a VIOLATION when it is a
// literal string, because that string is in git forever.
//
// Run:  bun src/Core.TypeScript/cluster/committed-chart-credentials.ts

import { type Dirent, readFileSync, readdirSync } from "node:fs";
import { bootstrapDirs } from "./declared-cluster-trees.ts";
import { join } from "node:path";
import { parseAllDocuments, parse as parseYaml } from "yaml";

export const APPLICATIONS_DIR = "full-ai-cluster/k8s/applications";
/** Derived from the tree roster — see `declared-cluster-trees.ts` for why it is not a literal. */
export const BOOTSTRAP_DIRS: readonly string[] = bootstrapDirs();
export const BASELINE_FILE = "src/Core.TypeScript/cluster/committed-chart-credentials.baseline.json";

/** The lowest number of values documents a healthy scan reaches. Below this it REFUSES. */
export const MIN_EXPECTED_VALUES_DOCS = 20;

/**
 * Leaf key names that carry the SECRET half of a credential.
 *
 * `accessKey` is deliberately absent: an access-key ID is an identifier, and flagging it
 * would fill the roster with non-problems.
 */
export const SECRET_LEAF = /^(secretkey|secretaccesskey|secret_access_key|password|passwd|token|apikey|api_key|privatekey|private_key|clientsecret|client_secret)$/i;

export interface Finding {
  readonly file: string;
  readonly path: string;
  readonly value: string;
}

export interface BaselineEntry {
  readonly key: string;
  readonly reason: string;
  readonly liftsWhen: string;
}

export function findingKey(f: Finding): string {
  return `${f.file}|${f.path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A value that is NOT a committed secret.
 *
 * Empty means "supplied elsewhere". `${...}` is an env reference, which is exactly the shape
 * a minted Secret arrives in at runtime. A non-string is structure (`valueFrom:`,
 * `secretKeyRef:`), i.e. an indirection rather than a value.
 */
export function isSafeValue(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  return trimmed.startsWith("${") || trimmed.startsWith("$(");
}

/** Every credential-shaped literal in one values tree. */
export function scanValues(values: unknown, file: string): Finding[] {
  const out: Finding[] = [];
  const walk = (node: unknown, path: string): void => {
    if (isRecord(node)) {
      for (const [k, v] of Object.entries(node)) walk(v, path === "" ? k : `${path}.${k}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => {
        walk(v, `${path}[${String(i)}]`);
      });
      return;
    }
    const leaf = path.split(".").pop() ?? "";
    if (SECRET_LEAF.test(leaf.replace(/\[\d+\]$/, "")) && !isSafeValue(node)) {
      out.push({ file, path, value: String(node) });
    }
  };
  walk(values, "");
  return out;
}

/** The values tree of one manifest document, from either an Application or a HelmChart CR. */
export function valuesOf(doc: unknown): unknown {
  if (!isRecord(doc)) return undefined;
  const spec = isRecord(doc["spec"]) ? doc["spec"] : undefined;
  if (spec === undefined) return undefined;
  const source = isRecord(spec["source"]) ? spec["source"] : undefined;
  const helm = source !== undefined && isRecord(source["helm"]) ? source["helm"] : undefined;
  if (helm !== undefined && helm["valuesObject"] !== undefined) return helm["valuesObject"];
  const content = spec["valuesContent"];
  if (typeof content === "string") {
    try {
      return parseYaml(content) as unknown;
    } catch {
      // A values block that does not parse is not this audit's business -- the strict-YAML
      // test in validate-applications.ts convicts that -- but it must not be read as clean.
      return undefined;
    }
  }
  return undefined;
}

export interface ScanResult {
  readonly findings: readonly Finding[];
  readonly valuesDocs: number;
}

export function scanTree(root: string): ScanResult {
  const findings: Finding[] = [];
  let valuesDocs = 0;

  const consider = (absolute: string, relative: string): void => {
    let text: string;
    try {
      text = readFileSync(absolute, "utf8");
    } catch {
      return;
    }
    for (const doc of parseAllDocuments(text)) {
      let parsed: unknown;
      try {
        parsed = doc.toJS({ maxAliasCount: -1 }) as unknown;
      } catch {
        continue;
      }
      const values = valuesOf(parsed);
      if (values === undefined) continue;
      valuesDocs += 1;
      findings.push(...scanValues(values, relative));
    }
  };

  const walkApps = (current: string, relative: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(current, entry.name);
      const rel = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walkApps(abs, rel);
      else if (entry.name === "Application.yaml") consider(abs, rel);
    }
  };
  walkApps(join(root, APPLICATIONS_DIR), APPLICATIONS_DIR);

  for (const dir of BOOTSTRAP_DIRS) {
    let names: string[];
    try {
      names = readdirSync(join(root, dir));
    } catch {
      continue;
    }
    for (const name of names.filter((n) => n.endsWith(".yaml") || n.endsWith(".yml"))) {
      consider(join(root, dir, name), `${dir}/${name}`);
    }
  }

  findings.sort((a, b) => (findingKey(a) < findingKey(b) ? -1 : findingKey(a) > findingKey(b) ? 1 : 0));
  return { findings, valuesDocs };
}

export interface Adjudication {
  readonly open: readonly Finding[];
  readonly stale: readonly string[];
}

export function adjudicate(findings: readonly Finding[], baseline: readonly BaselineEntry[]): Adjudication {
  const acknowledged = new Set(baseline.map((e) => e.key));
  const present = new Set(findings.map(findingKey));
  return {
    open: findings.filter((f) => !acknowledged.has(findingKey(f))),
    // An acknowledgement whose literal is gone is STALE. Without this the roster only grows,
    // and the migration that removes a credential would leave its excuse behind.
    stale: [...acknowledged].filter((k) => !present.has(k)).sort(),
  };
}

function main(): void {
  const root = process.cwd();
  const { findings, valuesDocs } = scanTree(root);

  // REFUSES on a thin scan rather than reporting zero literals over it. This is a
  // CREDENTIAL check: a false clean here is the most expensive false clean in the tree.
  if (valuesDocs < MIN_EXPECTED_VALUES_DOCS) {
    console.error(
      `[committed-chart-credentials] ✗ REFUSING: reached ${String(valuesDocs)} values document(s), ` +
        `floor is ${String(MIN_EXPECTED_VALUES_DOCS)}. A clean result over a collapsed scan is not a clean result.`,
    );
    process.exit(1);
  }

  let baseline: BaselineEntry[] = [];
  try {
    baseline = (JSON.parse(readFileSync(join(root, BASELINE_FILE), "utf8")) as { entries?: BaselineEntry[] }).entries ?? [];
  } catch {
    baseline = [];
  }
  const { open, stale } = adjudicate(findings, baseline);

  console.log(
    `[committed-chart-credentials] ${String(valuesDocs)} values document(s); ` +
      `${String(findings.length)} credential-shaped literal(s), ${String(baseline.length)} acknowledged`,
  );
  for (const f of findings) {
    const mark = open.some((o) => findingKey(o) === findingKey(f)) ? "OPEN " : "ackd ";
    console.log(`  ${mark} ${f.file}: ${f.path}`);
  }

  let failed = false;
  for (const f of open) {
    // The VALUE is never printed. A check that reports a committed secret by quoting it has
    // copied it into every CI log that runs the check.
    console.error(
      `[committed-chart-credentials] ✗ ${f.file}: \`${f.path}\` holds a literal secret. ` +
        `This repository is PUBLIC and git keeps it forever. Mint it per cluster ` +
        `(DEV_BOOTSTRAP_SECRETS) and reference it — an empty value, a \`\${ENV}\` reference, or ` +
        `an existingSecret indirection all pass. If it must stay for now, acknowledge it in ` +
        `${BASELINE_FILE} with a reason and a lift condition.`,
    );
    failed = true;
  }
  for (const key of stale) {
    console.error(
      `[committed-chart-credentials] ✗ STALE acknowledgement: "${key}" names no literal any more. ` +
        `The credential moved — delete the entry.`,
    );
    failed = true;
  }
  if (!failed) console.log("[committed-chart-credentials] every literal is acknowledged; none is new");
  if (failed) process.exit(1);
}

if (import.meta.main) main();
