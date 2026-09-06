#!/usr/bin/env bun
// audit-bootstrap-application-pin-parity.ts — a chart installed TWICE is pinned ONCE.
//
// -- THE SHAPE, AND WHY METAL IS WHERE IT BITES ----------------------------
// Several charts are installed twice on the same cluster, by two mechanisms that run at
// different times:
//
//   1. a `helm.cattle.io/v1` HelmChart under `*/k8s/bootstrap/`, which K3S auto-applies
//      on NixOS FIRST BOOT, before ArgoCD exists;
//   2. an ArgoCD Application under `full-ai-cluster/k8s/applications/`, which adopts that
//      same Helm release once ArgoCD comes up.
//
// When those two name DIFFERENT chart versions, the cluster installs one version at boot
// and then upgrades itself to another in the earliest sync wave. `argocd-install.yaml`
// states the hazard in its own header, and it is not theoretical:
//
//   > "a bootstrap behind the self-managed Application means a mid-run self-upgrade,
//      which is exactly the failure that cached the seaweedfs manifest error."
//
// That was measured on run 33736439359 (2026-09-03): ArgoCD v2.13.2 could not render a
// Helm-4-only template, the repo-server CACHED the manifest-generation error per revision,
// and the wave -90 self-upgrade arrived too late to clear it. seaweedfs then read
// health=Healthy VACUOUSLY with zero applied resources.
//
// `trust-manager-install.yaml` says the same thing about a VALUE rather than a version:
// the bootstrap and the Application "share a Helm release", so a mismatch is "two
// reconcilers flipping the flag against each other". The version is the same coupling,
// unguarded.
//
// -- WHY THIS IS A METAL-PARITY CHECK -------------------------------------
// The CI lanes bring ArgoCD up with `dev-cluster/use-cases.ts` on kind/k3d. They never
// apply `*/k8s/bootstrap/` at all. So the first-boot install path is the LEAST-exercised
// surface in the tree, and a divergence there is invisible to every lane that runs today.
// This audit is text-only and offline, which is what lets it cover a path no CI cluster
// takes.
//
// -- FOUR PAIRS ARE ACKNOWLEDGED, NOT FIXED -------------------------------
// Measured on `main` at 2026-09-06, the first run found FOUR divergent pairs, three of
// them CRD-bearing. They are carried in `bootstrap-application-pin-parity.baseline.json`
// with a reason and a lift condition each, rather than being fixed blind: bumping a
// first-boot CRD chart is a real cluster change that needs its values re-rendered at the
// new version, which is a separate piece of work per chart. An acknowledged divergence is
// visible debt; an unacknowledged one is a surprise on someone's hardware.
//
// A pair NOT in the baseline fails. A baseline entry whose pair now AGREES also fails, so
// the roster shrinks as the debt is paid and can never over-claim.
//
// Run:   bun src/Core.TypeScript/hygiene/audit-bootstrap-application-pin-parity.ts

import { type Dirent, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseAllDocuments, parse as parseYaml } from "yaml";
import { bootstrapDirs } from "../cluster/declared-cluster-trees.ts";

/** Derived from the tree roster — see `declared-cluster-trees.ts` for why it is not a literal. */
export const BOOTSTRAP_DIRS: readonly string[] = bootstrapDirs();
export const APPLICATIONS_DIR = "full-ai-cluster/k8s/applications";
export const BASELINE_FILE = "src/Core.TypeScript/hygiene/bootstrap-application-pin-parity.baseline.json";

export interface ChartPin {
  readonly chart: string;
  readonly version: string;
  readonly file: string;
}

export interface Divergence {
  readonly chart: string;
  readonly bootstrapVersion: string;
  readonly bootstrapFile: string;
  readonly applicationVersion: string;
  readonly applicationFile: string;
}

export interface BaselineEntry {
  readonly key: string;
  readonly reason: string;
  readonly liftsWhen: string;
}

/** `key` is chart + both versions, so PAYING the debt (either side moving) makes it stale. */
export function divergenceKey(d: Divergence): string {
  return `${d.chart}|bootstrap=${d.bootstrapVersion}|application=${d.applicationVersion}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Every HelmChart CR in one bootstrap manifest. Multi-document: `spire-install.yaml` has two. */
export function parseBootstrapPins(yamlText: string, file: string): ChartPin[] {
  const pins: ChartPin[] = [];
  for (const doc of parseAllDocuments(yamlText)) {
    const value = asRecord(doc.toJS({ maxAliasCount: -1 }) as unknown);
    if (value === null || value["kind"] !== "HelmChart") continue;
    const spec = asRecord(value["spec"]);
    const chart = spec?.["chart"];
    const version = spec?.["version"];
    if (typeof chart === "string" && typeof version === "string") pins.push({ chart, version, file });
  }
  return pins;
}

/** The `spec.source` chart pin of one ArgoCD Application, when it has a Helm source. */
export function parseApplicationPin(yamlText: string, file: string): ChartPin | null {
  const value = asRecord(parseYaml(yamlText) as unknown);
  if (value === null || value["kind"] !== "Application") return null;
  const source = asRecord(asRecord(value["spec"])?.["source"]);
  const chart = source?.["chart"];
  const version = source?.["targetRevision"];
  return typeof chart === "string" && typeof version === "string" ? { chart, version, file } : null;
}

export function findDivergences(
  bootstrapPins: readonly ChartPin[],
  applicationPins: readonly ChartPin[],
): Divergence[] {
  const byChart = new Map(applicationPins.map((pin) => [pin.chart, pin]));
  const out: Divergence[] = [];
  for (const boot of bootstrapPins) {
    const app = byChart.get(boot.chart);
    // A chart installed ONLY at boot is not a divergence -- nothing adopts it, so there is
    // no second reconciler to disagree with.
    if (app === undefined || app.version === boot.version) continue;
    out.push({
      chart: boot.chart,
      bootstrapVersion: boot.version,
      bootstrapFile: boot.file,
      applicationVersion: app.version,
      applicationFile: app.file,
    });
  }
  // ORDINAL, never `localeCompare`: this output is compared byte-for-byte against a
  // committed baseline, and a locale-sensitive order would make the roster's meaning depend
  // on the machine that ran it (culture-invariant-by-default).
  return out.sort((a, b) => (a.chart < b.chart ? -1 : a.chart > b.chart ? 1 : 0));
}

export interface Adjudication {
  readonly open: readonly Divergence[];
  readonly stale: readonly string[];
}

export function adjudicate(
  divergences: readonly Divergence[],
  baseline: readonly BaselineEntry[],
): Adjudication {
  const acknowledged = new Set(baseline.map((entry) => entry.key));
  const present = new Set(divergences.map(divergenceKey));
  return {
    open: divergences.filter((d) => !acknowledged.has(divergenceKey(d))),
    // A baseline entry whose pair now agrees is STALE. Without this the roster only ever
    // grows, and an acknowledgement that outlives its defect is an excuse.
    stale: [...acknowledged].filter((key) => !present.has(key)).sort(),
  };
}

/**
 * READS AND HANDLES ENOENT rather than `existsSync` then `readdirSync`. The two-call form is
 * a check-then-use race the repo lints for, and the single call is also the honest one: the
 * only question is "what is in this directory", and a missing directory is one answer to it.
 */
function yamlFiles(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"))
    .map((name) => join(dir, name))
    .sort();
}

function applicationFiles(root: string): string[] {
  const dir = join(root, APPLICATIONS_DIR);
  const out: string[] = [];
  const walk = (current: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "Application.yaml") out.push(path);
    }
  };
  walk(dir);
  return out.sort();
}

function main(): void {
  const root = process.cwd();

  const bootstrapPins: ChartPin[] = [];
  for (const dir of BOOTSTRAP_DIRS) {
    for (const file of yamlFiles(join(root, dir))) {
      bootstrapPins.push(...parseBootstrapPins(readFileSync(file, "utf8"), file.slice(root.length + 1)));
    }
  }
  const applicationPins: ChartPin[] = [];
  for (const file of applicationFiles(root)) {
    const pin = parseApplicationPin(readFileSync(file, "utf8"), file.slice(root.length + 1));
    if (pin !== null) applicationPins.push(pin);
  }

  // REFUSES on an empty scan rather than reporting zero divergences. A glob that stopped
  // matching would otherwise print "all pins agree" over a tree it never read -- the
  // failure this repo names first and most often.
  if (bootstrapPins.length === 0 || applicationPins.length === 0) {
    console.error(
      `[bootstrap-application-pin-parity] ✗ REFUSING: found ${String(bootstrapPins.length)} bootstrap ` +
        `HelmChart pin(s) and ${String(applicationPins.length)} Application chart pin(s). ` +
        `A zero on either side means the scan is broken, not that the tree is clean.`,
    );
    process.exit(1);
  }

  const baselinePath = join(root, BASELINE_FILE);
  let baseline: BaselineEntry[] = [];
  try {
    baseline = (JSON.parse(readFileSync(baselinePath, "utf8")) as { entries?: BaselineEntry[] }).entries ?? [];
  } catch {
    // An absent baseline is the same as an empty one: every divergence is then OPEN and the
    // audit is red, which is the correct posture for a roster nobody has written yet.
    baseline = [];
  }

  const divergences = findDivergences(bootstrapPins, applicationPins);
  const { open, stale } = adjudicate(divergences, baseline);

  console.log(
    `[bootstrap-application-pin-parity] ${String(bootstrapPins.length)} bootstrap pin(s) vs ` +
      `${String(applicationPins.length)} Application pin(s); ${String(divergences.length)} divergence(s), ` +
      `${String(baseline.length)} acknowledged`,
  );
  for (const d of divergences) {
    const mark = open.some((o) => divergenceKey(o) === divergenceKey(d)) ? "OPEN " : "ackd ";
    console.log(`  ${mark} ${d.chart}: bootstrap ${d.bootstrapVersion} vs Application ${d.applicationVersion}`);
  }

  let failed = false;
  for (const d of open) {
    console.error(
      `[bootstrap-application-pin-parity] ✗ ${d.chart} is pinned ${d.bootstrapVersion} in ` +
        `${d.bootstrapFile} and ${d.applicationVersion} in ${d.applicationFile}. K3S installs the first on ` +
        `NixOS first boot and the Application upgrades it in the earliest sync wave -- a mid-run ` +
        `self-upgrade on real hardware. Move both, or acknowledge it in ${BASELINE_FILE} with a reason ` +
        `and a lift condition.`,
    );
    failed = true;
  }
  for (const key of stale) {
    console.error(
      `[bootstrap-application-pin-parity] ✗ STALE acknowledgement: "${key}" no longer describes any ` +
        `divergence. The pins agree now -- delete the entry.`,
    );
    failed = true;
  }
  if (!failed) console.log("[bootstrap-application-pin-parity] every divergence is acknowledged; none is new");
  if (failed) process.exit(1);
}

if (import.meta.main) main();
