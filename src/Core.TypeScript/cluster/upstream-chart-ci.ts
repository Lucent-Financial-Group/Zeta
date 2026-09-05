// src/Core.TypeScript/cluster/upstream-chart-ci.ts
//
// WHAT DOES THE CHART'S OWN REPO DO TO TEST IT?
//
// Aaron 2026-09-05: "you can also look at those charts home repos and see if
// there is any evidence of how they test on github runners if they do, or small
// server testing."
//
// It cost one API call and it solved a live failure the same hour. OpenSearch
// was OutOfSync/Progressing on our lane; opensearch-project/helm-charts runs
// `helm/kind-action` + `ct install` on `ubuntu-latest`, and all three of its
// `ci/*-values.yaml` set `OPENSEARCH_INITIAL_ADMIN_PASSWORD` -- a key the stock
// `values.yaml` leaves COMMENTED OUT while shipping security on. The chart at
// its defaults cannot boot. Nothing in our tree could have told us that; the
// upstream repo says it plainly.
//
// THE GENERAL CLAIM THIS MAKES CHECKABLE: `helm/chart-testing` ("ct") is the de
// facto standard for chart CI, and its convention is that
// `charts/<name>/ci/*-values.yaml` are the value sets the maintainers actually
// install in CI. Those files are, by construction, A CONFIGURATION KNOWN TO COME
// UP ON A GITHUB RUNNER. When one of our Applications will not start, the first
// question is whether upstream's own known-good values set something we do not.
//
// ── WHAT THIS IS NOT ──────────────────────────────────────────────────────────
// It is a POINTER GENERATOR, not an oracle. It reports where upstream tests and
// what its CI values name; it does not diff semantics, and a key present in both
// can still hold an incompatible value. It reads the network, so it belongs on
// the same weekly lane as the currency refresh -- never in the offline gate.
//
// It also cannot find a repo that does not declare itself. `Chart.yaml`'s
// `sources:` is optional, and a chart that omits it is reported as UNKNOWN
// rather than guessed at, because guessing a GitHub org from a chart name is how
// you end up reading somebody else's CI and trusting it.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAllDocuments } from "yaml";

import { discoverApplicationDirs } from "./zero-pod-health.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const APPS = "full-ai-cluster/k8s/applications";

export interface ChartCoordinate {
  readonly dir: string;
  readonly chart: string;
  readonly repoURL: string;
  /** Keys our Application sets under `valuesObject`, dotted, sorted. */
  readonly ourKeys: readonly string[];
}

/** GitHub `owner/repo` parsed out of a URL, or null when it is not a GitHub URL. */
export function githubSlug(url: string): string | null {
  const direct = /github\.com\/([^/]+)\/([^/#?]+)/.exec(url);
  if (direct !== null) {
    const [, owner, repo] = direct;
    if (owner !== undefined && repo !== undefined) return `${owner}/${repo.replace(/\.git$/, "")}`;
  }
  // GITHUB PAGES IS THE COMMON CASE AND THE FIRST DRAFT MISSED IT ENTIRELY.
  // A chart's `repoURL` is a HELM repo, not a source repo, and almost every one
  // in this tree is `https://<owner>.github.io/<repo>` -- which is exactly
  // `github.com/<owner>/<repo>` serving its `gh-pages` branch. Reading only
  // `github.com/...` matched ZERO of our 38 charts; reading this form matches
  // most of them. Measured, not assumed: the first version printed
  // "declaring a GitHub URL directly: 0" and that number is what found the bug.
  const pages = /^https?:\/\/([^./]+)\.github\.io\/([^/#?]+)/.exec(url);
  if (pages !== null) {
    const [, owner, repo] = pages;
    if (owner !== undefined && repo !== undefined) return `${owner}/${repo}`;
  }
  return null;
}

function flattenKeys(node: unknown, prefix: string, out: string[]): void {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    if (prefix.length > 0) out.push(prefix);
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    flattenKeys(value, prefix.length === 0 ? key : `${prefix}.${key}`, out);
  }
}

export function readChartCoordinates(repoRoot = REPO_ROOT): readonly ChartCoordinate[] {
  const appsDir = join(repoRoot, APPS);
  const out: ChartCoordinate[] = [];
  for (const dir of discoverApplicationDirs(appsDir)) {
    const doc = parseAllDocuments(readFileSync(join(appsDir, dir, "Application.yaml"), "utf8"))[0];
    if (doc === undefined) continue;
    const chart = doc.getIn(["spec", "source", "chart"]);
    const repoURL = doc.getIn(["spec", "source", "repoURL"]);
    if (typeof chart !== "string" || typeof repoURL !== "string") continue;
    const values = doc.getIn(["spec", "source", "helm", "valuesObject"], false);
    const ourKeys: string[] = [];
    if (values !== undefined && values !== null) {
      flattenKeys(JSON.parse(JSON.stringify(values)) as unknown, "", ourKeys);
    }
    out.push({ dir, chart, repoURL, ourKeys: [...ourKeys].sort() });
  }
  return out;
}

export interface UpstreamCiReport {
  readonly dir: string;
  readonly chart: string;
  /** `owner/repo` when the chart declares a GitHub source, else null. */
  readonly slug: string | null;
  /** Workflow filenames that mention a kind/k3d/minikube cluster. */
  readonly clusterWorkflows: readonly string[];
  /** `ci/*-values.yaml` paths found for this chart. */
  readonly ciValueFiles: readonly string[];
  /** Dotted keys upstream's CI values set that our Application does not. */
  readonly keysWeDoNotSet: readonly string[];
  readonly note: string;
}

export function formatReport(reports: readonly UpstreamCiReport[]): string {
  const lines: string[] = [];
  for (const r of reports) {
    lines.push(`${r.dir} (${r.chart}) -> ${r.slug ?? "NO DECLARED GITHUB SOURCE"}`);
    if (r.clusterWorkflows.length > 0) {
      lines.push(`  tests on a real cluster in CI: ${r.clusterWorkflows.join(", ")}`);
    }
    if (r.ciValueFiles.length > 0) {
      lines.push(`  known-good CI values: ${r.ciValueFiles.join(", ")}`);
    }
    if (r.keysWeDoNotSet.length > 0) {
      lines.push(`  UPSTREAM CI SETS, WE DO NOT: ${r.keysWeDoNotSet.slice(0, 12).join(", ")}`);
    }
    if (r.note.length > 0) lines.push(`  ${r.note}`);
  }
  return lines.join("\n");
}
