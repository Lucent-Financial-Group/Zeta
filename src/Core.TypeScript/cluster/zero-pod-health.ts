// src/Core.TypeScript/cluster/zero-pod-health.ts
//
// WHAT REMAINS, ASSERTED. WHAT ACTS, NEVER CHECKED.
//
// The included Synced+Healthy proof reports an Application Healthy when
// gitops-engine says its workloads are Healthy. For a workload that declares
// ZERO replicas, gitops-engine says Healthy immediately and correctly:
// `getAppsv1StatefulSetHealth` compares `ReadyReplicas 0 < Replicas 0`, which
// is false, so nothing is unready and the object is Healthy. No pod is ever
// scheduled, no image is ever pulled, no container ever starts.
//
// So the proof establishes that the MANIFEST is valid and that ArgoCD could
// reconcile it. It establishes nothing about whether the thing runs.
//
// Aaron 2026-09-04, on being told four Applications pass this way:
//
//   "this is a cheat we want at least one pod to start does this mean 0 pods
//    if so 0 pods is not a real test, it's half a test of the chart but not
//    the pod/continer"
//
// He is right, and `hat-system`'s own manifest says the quiet part in writing:
// `replicas: 0` with the comment "so ArgoCD reports OK".
//
// ── THE ANCHOR, AND IT IS NOT DECORATION ──────────────────────────────────────
// This repo already carries the distinction this defect sits on:
// **agents are what remains, actors are what acts** (docs/CONCEPT-REGISTRY.md).
// It also already carries **μένω** (menō) as a first-class primitive -- the
// temporal dual of the other five, added on Aaron's own instruction and
// following the ratified Greek-primary/English-secondary alias pattern.
//
// μένω is the ancient Greek verb "to remain, to abide" (Liddell-Scott-Jones;
// Proto-Indo-European *men-, "to stay, stand still"; cognate with Latin
// `maneo`). Until now the term and the distinction lived in the repo without
// being connected to each other. The connection is what names this defect
// exactly: a zero-replica Application is **μένω with nothing that acts** -- the
// identity remains, the manifest abides, and the proof mistakes that for the
// whole thing.
//
// The name earns its place by being CHECKABLE, not by being evocative: the
// finding below is a count of declared replicas, and the metric would be the
// same if it were called `healthy-with-zero-pods`. The anchor explains why the
// vocabulary was already right; it does no work the arithmetic does not.
//
// ── WHAT THIS DOES NOT CATCH, STATED RATHER THAN HIDDEN ───────────────────────
// It reads DECLARED zeros out of the committed manifests: an Application's own
// `replicas:`/`replicaCount:` and the in-repo workload YAML it applies. A chart
// whose DEFAULT is zero, with nothing said in our tree, is invisible here. That
// is a real hole and it is why this reports a FLOOR: "at least N Applications
// prove no running container", never "exactly N".

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const APPS_RELATIVE = "full-ai-cluster/k8s/applications";

export interface ZeroPodFinding {
  /** Application directory, relative to the applications root. */
  readonly dir: string;
  /** The files that declare a zero, and the literal line from each. */
  readonly declarations: readonly string[];
}

/** `replicas: 0` / `replicaCount: 0`, at any indentation, comment stripped. */
export function declaresZeroReplicas(yaml: string): readonly string[] {
  const out: string[] = [];
  for (const raw of yaml.split("\n")) {
    const line = raw.split("#")[0] ?? "";
    if (/^\s*(replicas|replicaCount)\s*:\s*0\s*$/.test(line)) out.push(raw.trim());
  }
  return out;
}

/** Directories under the applications root holding an Application.yaml, depth 1 and 2. */
function applicationDirs(appsDir: string): readonly string[] {
  const subdirs = (at: string): readonly string[] =>
    readdirSync(at, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  const out: string[] = [];
  for (const dir of subdirs(appsDir)) {
    if (existsSync(join(appsDir, dir, "Application.yaml"))) {
      out.push(dir);
      continue;
    }
    for (const child of subdirs(join(appsDir, dir))) {
      if (existsSync(join(appsDir, dir, child, "Application.yaml"))) out.push(`${dir}/${child}`);
    }
  }
  return out;
}

/**
 * Applications that would reach Healthy while scheduling no pod.
 *
 * Reads the Application and every sibling `.yaml` it could apply, because a
 * git-path Application's replica count lives in `deployment.yaml` /
 * `statefulset.yaml` rather than in the Application itself.
 */
export function findZeroPodApplications(repoRoot = REPO_ROOT): readonly ZeroPodFinding[] {
  const appsDir = join(repoRoot, APPS_RELATIVE);
  const findings: ZeroPodFinding[] = [];

  for (const dir of applicationDirs(appsDir)) {
    const here = join(appsDir, dir);
    const declarations: string[] = [];
    for (const entry of readdirSync(here, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
      const lines = declaresZeroReplicas(readFileSync(join(here, entry.name), "utf8"));
      for (const line of lines) declarations.push(`${entry.name}: ${line}`);
    }
    if (declarations.length > 0) findings.push({ dir, declarations });
  }
  return findings;
}

function main(): void {
  const findings = findZeroPodApplications();
  if (findings.length === 0) {
    console.log("zero-pod health: no Application declares zero replicas.");
    return;
  }
  for (const f of findings) {
    console.log(
      `::warning title=zero-pod health (μένω without action)::${f.dir} declares zero replicas ` +
        `(${f.declarations.join("; ")}). A Healthy verdict here proves the manifest reconciles, ` +
        "NOT that any container starts.",
    );
  }
  console.error(
    `\nzero-pod health: at least ${String(findings.length)} Application(s) can reach Healthy with NO pod.\n` +
      "That is a FLOOR, not a count -- this reads DECLARED zeros only, so a chart defaulting to\n" +
      "zero with nothing said in our tree is invisible here.\n" +
      "Each one is half a test: the chart renders and ArgoCD reconciles it; the pod and the\n" +
      "container are never exercised. Either bring up >=1 pod at the dev rung, or record the\n" +
      "Application as NOT ASSERTED rather than letting it count toward the green.\n",
  );
  process.exit(1);
}

if (import.meta.main) main();
