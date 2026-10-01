// Unit tests for the PURE half of cnpg-postgres-shared-live-test.ts. The live half needs a
// kind cluster and runs in .github/workflows/k8s-cnpg-live.yml; these pin what it decides
// before it touches one -- which Applications are re-pointed at the commit under test,
// how the bootstrap charts are read, and what counts as "healthy" / "done".

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  backupIsCompleted,
  clusterIsHealthy,
  conditionIs,
  isSyncedAndHealthy,
  parseHelmChartCr,
  pinApplicationToRef,
  readApplicationState,
} from "./cnpg-postgres-shared-live-test.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const app = (dir: string): string => readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/applications", dir, "Application.yaml"), "utf8");

describe("pinApplicationToRef", () => {
  test("re-points a git-path Application of this repo at the commit under test", () => {
    const pinned = pinApplicationToRef(app("postgres-shared"), "https://github.com/someone/Zeta-fork", "deadbeef");
    expect(pinned.spec.source.repoURL).toBe("https://github.com/someone/Zeta-fork");
    expect(pinned.spec.source.targetRevision).toBe("deadbeef");
    // nothing else about the Application moves: the sync policy IS the thing under test
    expect(pinned.spec.syncPolicy.automated.selfHeal).toBe(true);
    expect(pinned.spec.syncPolicy.syncOptions).toContain("SkipDryRunOnMissingResource=true");
  });

  test("leaves a chart-sourced Application exactly as the tree ships it", () => {
    for (const dir of ["cloudnativepg", "cnpg-barman-cloud", "seaweedfs"]) {
      const pinned = pinApplicationToRef(app(dir), "https://github.com/someone/Zeta-fork", "deadbeef");
      expect(pinned.spec.source.repoURL).not.toContain("Zeta-fork");
      expect(pinned.spec.source.targetRevision).not.toBe("deadbeef");
    }
  });

  test("refuses an Application with no source rather than passing it through", () => {
    expect(() => pinApplicationToRef("apiVersion: argoproj.io/v1alpha1\nkind: Application\nspec: {}\n", "u", "r")).toThrow();
  });
});

describe("parseHelmChartCr", () => {
  test("reads the exact pins the first-boot installs use", () => {
    const cm = parseHelmChartCr(readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/bootstrap/cert-manager-install.yaml"), "utf8"));
    expect(cm).toMatchObject({ name: "cert-manager", chart: "cert-manager", repo: "https://charts.jetstack.io", namespace: "cert-manager" });
    expect(cm.version).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(cm.values).toContain("crds:");
    const argo = parseHelmChartCr(readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/bootstrap/argocd-install.yaml"), "utf8"));
    expect(argo).toMatchObject({ name: "argocd", chart: "argo-cd", namespace: "argocd" });
    // the Application-kind health override the root's wave gating relies on travels with the values
    expect(argo.values).toContain("resource.customizations.health.argoproj.io_Application");
  });

  test("refuses a document that is not a HelmChart", () => {
    expect(() => parseHelmChartCr("kind: ConfigMap\nmetadata: { name: x }\n")).toThrow();
  });
});

describe("what counts as done", () => {
  test("an Application is done only when Synced AND Healthy", () => {
    const state = (sync: string, health: string) => readApplicationState({ status: { sync: { status: sync }, health: { status: health } } });
    expect(isSyncedAndHealthy(state("Synced", "Healthy"))).toBe(true);
    // the owner's WP11 symptom, and its siblings, must all read as NOT done
    expect(isSyncedAndHealthy(state("OutOfSync", "Unknown"))).toBe(false);
    expect(isSyncedAndHealthy(state("OutOfSync", "Healthy"))).toBe(false);
    expect(isSyncedAndHealthy(state("Synced", "Progressing"))).toBe(false);
    expect(isSyncedAndHealthy(readApplicationState({}))).toBe(false);
  });

  test("a Cluster is healthy only at the healthy phase with every instance ready", () => {
    const c = (phase: string, ready: number, want = 1) => ({ spec: { instances: want }, status: { phase, readyInstances: ready } });
    expect(clusterIsHealthy(c("Cluster in healthy state", 1)).ok).toBe(true);
    expect(clusterIsHealthy(c("Cluster in healthy state", 2, 3)).ok).toBe(false);
    expect(clusterIsHealthy(c("Setting up primary", 0)).ok).toBe(false);
    // the phase ArgoCD's built-in health script does not know, which is what reads as Unknown
    expect(clusterIsHealthy(c("Cluster cannot proceed to reconciliation due to an error while interacting with plugins", 0)).ok).toBe(false);
    expect(clusterIsHealthy({}).ok).toBe(false);
  });

  test("a Backup is done at `completed` and not at any earlier phase", () => {
    for (const phase of ["started", "running", "walArchiving", "failed", undefined]) {
      expect(backupIsCompleted({ status: { phase } })).toBe(false);
    }
    expect(backupIsCompleted({ status: { phase: "completed" } })).toBe(true);
  });

  test("conditionIs distinguishes True from False from absent", () => {
    const obj = { status: { conditions: [{ type: "ContinuousArchiving", status: "False" }] } };
    expect(conditionIs(obj, "ContinuousArchiving", "True")).toBe(false);
    expect(conditionIs(obj, "ContinuousArchiving", "False")).toBe(true);
    expect(conditionIs({}, "ContinuousArchiving", "True")).toBe(false);
  });
});
