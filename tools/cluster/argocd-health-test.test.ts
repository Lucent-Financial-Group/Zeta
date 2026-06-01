import { describe, expect, test } from "bun:test";
import {
  architectureFailure,
  buildPlan,
  classifyApplications,
  classifySmokeApplications,
  discoverExpectedApplications,
  parseApplicationList,
  parseApplicationName,
  parseArgs,
  parseK3dClusterName,
} from "./argocd-health-test.ts";

describe("B-0967 argocd-health-test argument parsing", () => {
  test("defaults to safe dry-run against the k3d dev cluster", () => {
    const parsed = parseArgs([], {});
    expect("kind" in parsed).toBe(false);
    if ("kind" in parsed) throw new Error(parsed.message);
    expect(parsed.mode).toBe("dry-run");
    expect(parsed.provider).toBe("k3d");
    expect(parsed.gitRef).toBe("main");
    expect(parsed.runtime).toBe("docker");
    expect(parsed.configPath).toBe("full-ai-cluster/dev-cluster/k3d-config.yaml");
  });

  test("rejects git refs that could inject YAML or shell syntax", () => {
    const parsed = parseArgs(["--git-ref", "feature/good\nbad"], {});
    expect("kind" in parsed).toBe(true);
    if (!("kind" in parsed)) throw new Error("expected usage failure");
    expect(parsed.kind).toBe("UsageError");
  });

  test("accepts explicit live k3d mode with bounded polling", () => {
    const parsed = parseArgs([
      "--run",
      "--provider",
      "k3d",
      "--git-ref",
      "claim/example-2026-06-01",
      "--timeout-sec",
      "60",
      "--poll-sec",
      "5",
      "--drift-check",
    ], {});
    expect("kind" in parsed).toBe(false);
    if ("kind" in parsed) throw new Error(parsed.message);
    expect(parsed.mode).toBe("run");
    expect(parsed.provider).toBe("k3d");
    expect(parsed.timeoutSeconds).toBe(60);
    expect(parsed.pollSeconds).toBe(5);
    expect(parsed.driftCheck).toBe(true);
  });

  test("switches kind runs to the CI kind profile by default", () => {
    const parsed = parseArgs(["--run", "--provider", "kind"], {});
    expect("kind" in parsed).toBe(false);
    if ("kind" in parsed) throw new Error(parsed.message);
    expect(parsed.provider).toBe("kind");
    expect(parsed.scope).toBe("smoke");
    expect(parsed.configPath).toBe("full-ai-cluster/dev-cluster/profiles/ci.kind-config.yaml");
  });

  test("accepts kind on podman for the OCI-runtime lane", () => {
    const parsed = parseArgs(["--run", "--provider", "kind", "--runtime", "podman"], {});
    expect("kind" in parsed).toBe(false);
    if ("kind" in parsed) throw new Error(parsed.message);
    expect(parsed.provider).toBe("kind");
    expect(parsed.runtime).toBe("podman");
  });

  test("uses ZETA_CONTAINER_RUNTIME as the repo-wide OCI runtime switch", () => {
    const parsed = parseArgs(["--run"], { ZETA_CONTAINER_RUNTIME: "podman" });
    expect("kind" in parsed).toBe(false);
    if ("kind" in parsed) throw new Error(parsed.message);
    expect(parsed.provider).toBe("kind");
    expect(parsed.runtime).toBe("podman");
    expect(parsed.scope).toBe("smoke");
    expect(parsed.configPath).toBe("full-ai-cluster/dev-cluster/profiles/ci.kind-config.yaml");
  });

  test("rejects CONTAINER_RUNTIME instead of treating it as an alias", () => {
    const parsed = parseArgs(["--run", "--provider", "kind"], { CONTAINER_RUNTIME: "podman" });
    expect("kind" in parsed).toBe(true);
    if (!("kind" in parsed)) throw new Error("expected usage error");
    expect(parsed.message).toContain("CONTAINER_RUNTIME is not supported");
  });
});

describe("B-0967 argocd-health-test manifest parsing", () => {
  test("extracts the k3d cluster name from metadata", () => {
    expect(parseK3dClusterName("apiVersion: k3d.io/v1alpha5\nkind: Simple\nmetadata:\n  name: zeta-ci\n")).toBe("zeta-ci");
  });

  test("extracts ArgoCD Application metadata.name", () => {
    const yaml = [
      "apiVersion: argoproj.io/v1alpha1",
      "kind: Application",
      "metadata:",
      "  name: argocd",
      "  namespace: argocd",
      "spec:",
      "  project: default",
      "",
    ].join("\n");
    expect(parseApplicationName(yaml)).toBe("argocd");
  });

  test("discovers current dev Application graph and marks dev exclusions", () => {
    const applications = discoverExpectedApplications();
    expect(applications.length).toBeGreaterThan(20);
    expect(applications.some((app) => app.name === "argocd" && !app.excludedFromDev)).toBe(true);
    expect(applications.some((app) => app.dir === "cilium" && app.excludedFromDev)).toBe(true);
    expect(applications.some((app) => app.dir === "longhorn" && app.excludedFromDev)).toBe(true);
  });

  test("smoke scope accepts a broad graph with lightweight healthy anchors", () => {
    const verdicts = classifySmokeApplications([
      { name: "zeta-root-dev", syncStatus: "OutOfSync", healthStatus: "Healthy", message: "" },
      { name: "argocd", syncStatus: "Unknown", healthStatus: "Healthy", message: "" },
      { name: "cert-manager", syncStatus: "Synced", healthStatus: "Healthy", message: "" },
      ...Array.from({ length: 20 }, (_value, index) => ({
        name: `child-${String(index)}`,
        syncStatus: "OutOfSync",
        healthStatus: "Missing",
        message: "",
      })),
    ]);
    expect(verdicts.every((verdict) => verdict.ok)).toBe(true);
  });
});

describe("B-0967 argocd-health-test Application verdicts", () => {
  test("parses kubectl Application JSON into compact snapshots", () => {
    const snapshots = parseApplicationList(JSON.stringify({
      items: [
        {
          metadata: { name: "argocd" },
          status: {
            sync: { status: "Synced" },
            health: { status: "Healthy", message: "" },
          },
        },
      ],
    }));
    expect(snapshots).toEqual([
      {
        name: "argocd",
        syncStatus: "Synced",
        healthStatus: "Healthy",
        message: "",
      },
    ]);
  });

  test("reports exact missing and unhealthy Applications", () => {
    const verdicts = classifyApplications(
      [
        {
          dir: "argocd",
          name: "argocd",
          excludedFromDev: false,
          path: "full-ai-cluster/k8s/applications/argocd/Application.yaml",
        },
        {
          dir: "cilium",
          name: "cilium",
          excludedFromDev: true,
          path: "full-ai-cluster/k8s/applications/cilium/Application.yaml",
        },
        {
          dir: "vault",
          name: "vault",
          excludedFromDev: false,
          path: "full-ai-cluster/k8s/applications/vault/Application.yaml",
        },
      ],
      [
        {
          name: "argocd",
          syncStatus: "OutOfSync",
          healthStatus: "Healthy",
          message: "chart values drift",
        },
      ],
    );
    expect(verdicts).toEqual([
      {
        name: "argocd",
        ok: false,
        syncStatus: "OutOfSync",
        healthStatus: "Healthy",
        reason: "chart values drift",
      },
      {
        name: "vault",
        ok: false,
        syncStatus: "Missing",
        healthStatus: "Missing",
        reason: "Application not found; expected from full-ai-cluster/k8s/applications/vault/Application.yaml",
      },
    ]);
  });
});

describe("B-0967 argocd-health-test planning", () => {
  test("builds the B-0967 plan without touching Docker or Kubernetes", () => {
    const parsed = parseArgs(["--dry-run"], {});
    if ("kind" in parsed) throw new Error(parsed.message);
    const plan = buildPlan(parsed);
    if ("kind" in plan) throw new Error(plan.message);
    expect(plan.rowId).toBe("B-0967");
    expect(plan.scope).toBe("full");
    expect(plan.clusterName).toBe("zeta-dev");
    expect(plan.expectedApplications.some((app) => app.name === "argocd")).toBe(true);
    expect(plan.notes.join("\n")).toContain("separate from B-0891");
  });

  test("architecture guard names the supported hardware classes", () => {
    expect(architectureFailure("x64")).toBeNull();
    expect(architectureFailure("arm64")).toBeNull();
    expect(architectureFailure("s390x")?.message).toContain("x86_64 and ARM64/aarch64");
  });
});
