#!/usr/bin/env bun
// audit-argocd-pin-parity.ts — every place that installs ArgoCD names ONE chart version.
//
// -- THE DEFECT THIS CLOSES, AND IT HAS ALREADY HAPPENED ONCE ---------------
// 2026-09-03, measured on run 33736439359 and written up at length in
// `dev-cluster/use-cases.ts`: the k3s bootstrap moved 7.7.10 -> 10.6.0 on 2026-09-01
// and "this kind-lane pin was the one left behind". ArgoCD v2.13.2 ships Helm 3 only;
// seaweedfs >= 4.33.0 uses the Helm-4-only `fromToml`; the repo-server failed manifest
// generation and CACHED the error per revision, so the wave -90 self-upgrade arrived
// after the failure was already cached and could not clear it. seaweedfs then reported
// health=Healthy VACUOUSLY with zero applied resources, kube-dns answered `no such host`
// 700 times, and every mimir module died on its sanity-check.
//
// The response to that incident was PROSE. Four files now carry a paragraph saying
// "All FOUR pin sites move together". Prose is what was already there when the pin was
// left behind, so it is not what stops the next one.
//
// -- AND THE PROSE WAS ALREADY WRONG WHEN IT WAS WRITTEN --------------------
// There are FIVE sites, not four. `infra/k8s/bootstrap/argocd-install.yaml` — the
// HelmChart K3S auto-applies on NixOS first boot, i.e. the METAL bring-up path — was
// never in the roster and sat at 7.7.10 through all three bumps (09-01, 09-03, 09-04).
// Its own header still claimed "It is also the pin `full-ai-cluster` uses", which was
// true when written on 2026-08-18 and false from 2026-09-01.
//
// The consequence on metal is the incident above, on real hardware and one major
// version wider: K3S installs v2.13.2 (Helm 3), then the root Application it applies
// carries argo-cd 10.8.0 (v3.5.2, Helm 4), so ArgoCD attempts to upgrade itself across
// a major version in the earliest sync wave.
//
// -- WHAT THIS CHECKS -------------------------------------------------------
//   1. All five sites parse and yield a version.
//   2. All five are byte-equal.
//   3. The dev-cluster file yields EXACTLY TWO pins. A sixth install site appearing
//      there fails rather than being silently unchecked — the roster is the thing that
//      drifted last time, so a check that quietly audits fewer sites than exist would
//      reproduce the defect it is here to catch.
//
// It is a TEXT check: offline, no `helm`, no cluster, no network. What it cannot say is
// whether a version RESOLVES upstream (`audit-chart-target-revisions.ts`) or whether the
// values survive the bump (`helm template`, done by hand at bump time and recorded in the
// file headers). Three different questions; none replaces the others.
//
// Run:   bun src/Core.TypeScript/hygiene/audit-argocd-pin-parity.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { bootstrapManifests } from "../cluster/declared-cluster-trees.ts";

/**
 * The `helm.cattle.io/v1` HelmChart manifests, each with `spec.version` — one per declared
 * cluster tree. DERIVED from the tree roster rather than listed here: the pair exists only
 * because the repo currently carries two declarations of one cluster, so the roster is where
 * that fact belongs. `assertRootsPresent` refuses if a declared tree is missing from disk,
 * which is louder than the literal list it replaces — it names the tree that vanished.
 */
export const HELMCHART_PIN_FILES: readonly string[] = bootstrapManifests("argocd-install.yaml");

/** The self-managing ArgoCD Application, with `spec.source.targetRevision`. */
export const APPLICATION_PIN_FILE = "full-ai-cluster/k8s/applications/argocd/Application.yaml";

/** The kind and k3d bring-ups, each a `packages.install({ chart: "argo/argo-cd", version })`. */
export const DEV_CLUSTER_PIN_FILE = "src/Core.TypeScript/cluster/dev-cluster/use-cases.ts";

/** How many install sites `DEV_CLUSTER_PIN_FILE` is expected to hold. */
export const EXPECTED_DEV_CLUSTER_PINS = 2;

export interface Pin {
  readonly site: string;
  readonly version: string;
}

export interface Finding {
  readonly ok: boolean;
  readonly message: string;
}

function get(value: unknown, path: readonly string[]): unknown {
  let cursor: unknown = value;
  for (const key of path) {
    if (typeof cursor !== "object" || cursor === null || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

/** `spec.version` from a HelmChart manifest, or null when it is absent or not a string. */
export function parseHelmChartVersion(yamlText: string): string | null {
  const version = get(parseYaml(yamlText), ["spec", "version"]);
  return typeof version === "string" ? version : null;
}

/** `spec.source.targetRevision` from an ArgoCD Application, or null. */
export function parseApplicationTargetRevision(yamlText: string): string | null {
  const revision = get(parseYaml(yamlText), ["spec", "source", "targetRevision"]);
  return typeof revision === "string" ? revision : null;
}

/**
 * Every `version:` belonging to an `argo/argo-cd` install in the dev-cluster source.
 *
 * ANCHORED ON THE CHART NAME, not on a bare `version:` scan: that file installs several
 * charts, and a scan would happily return cilium's pin and compare it to ArgoCD's. The
 * window is generous because both sites carry a long comment between the two lines --
 * the comment is where the 2026-09-03 incident is written down, so it is not going away.
 */
export function parseDevClusterPins(sourceText: string): string[] {
  const lines = sourceText.split("\n");
  const versions: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/chart:\s*"argo\/argo-cd"/.test(lines[i] ?? "")) continue;
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j += 1) {
      const match = /^\s*version:\s*"([^"]+)"/.exec(lines[j] ?? "");
      if (match?.[1] !== undefined) {
        versions.push(match[1]);
        break;
      }
    }
  }
  return versions;
}

export function checkPins(
  helmChartTexts: Readonly<Record<string, string>>,
  applicationText: string,
  devClusterText: string,
): Finding[] {
  const findings: Finding[] = [];
  const pins: Pin[] = [];

  for (const site of HELMCHART_PIN_FILES) {
    const text = helmChartTexts[site];
    const version = text === undefined ? null : parseHelmChartVersion(text);
    if (version === null) {
      findings.push({ ok: false, message: `${site}: no string \`spec.version\` — cannot check parity` });
    } else {
      pins.push({ site, version });
    }
  }

  const appVersion = parseApplicationTargetRevision(applicationText);
  if (appVersion === null) {
    findings.push({
      ok: false,
      message: `${APPLICATION_PIN_FILE}: no string \`spec.source.targetRevision\` — cannot check parity`,
    });
  } else {
    pins.push({ site: APPLICATION_PIN_FILE, version: appVersion });
  }

  const devPins = parseDevClusterPins(devClusterText);
  if (devPins.length !== EXPECTED_DEV_CLUSTER_PINS) {
    // REFUSES rather than checking whatever it found. The roster is exactly what drifted
    // in 2026-09-03 and again on the infra file, so "audit the sites I happened to see"
    // is the failure mode, not the fallback.
    findings.push({
      ok: false,
      message:
        `${DEV_CLUSTER_PIN_FILE}: expected ${String(EXPECTED_DEV_CLUSTER_PINS)} \`argo/argo-cd\` install sites, ` +
        `found ${String(devPins.length)} (${devPins.join(", ") || "none"}). ` +
        `An install site was added or removed — update EXPECTED_DEV_CLUSTER_PINS with it.`,
    });
  }
  devPins.forEach((version, index) => {
    pins.push({ site: `${DEV_CLUSTER_PIN_FILE}#${String(index + 1)}`, version });
  });

  const distinct = [...new Set(pins.map((pin) => pin.version))].sort();
  if (distinct.length > 1) {
    findings.push({
      ok: false,
      message:
        `ArgoCD chart pins DISAGREE across ${String(pins.length)} sites: ` +
        `${distinct.join(" vs ")}. A bootstrap behind the self-managed Application makes ArgoCD ` +
        `upgrade itself in the earliest sync wave — the 2026-09-03 cached-manifest failure. Sites: ` +
        pins.map((pin) => `${pin.site}=${pin.version}`).join(", "),
    });
  } else if (distinct.length === 1 && findings.length === 0) {
    findings.push({
      ok: true,
      message: `all ${String(pins.length)} ArgoCD install sites pin argo-cd ${distinct[0] ?? ""}`,
    });
  }

  return findings;
}

function main(): void {
  const root = process.cwd();
  const helmChartTexts: Record<string, string> = {};
  for (const site of HELMCHART_PIN_FILES) helmChartTexts[site] = readFileSync(join(root, site), "utf8");

  const findings = checkPins(
    helmChartTexts,
    readFileSync(join(root, APPLICATION_PIN_FILE), "utf8"),
    readFileSync(join(root, DEV_CLUSTER_PIN_FILE), "utf8"),
  );

  let failed = false;
  for (const finding of findings) {
    if (finding.ok) console.log(`[argocd-pin-parity] ${finding.message}`);
    else {
      console.error(`[argocd-pin-parity] ✗ ${finding.message}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}

if (import.meta.main) main();
