#!/usr/bin/env bun
// Bring up the CI-friendly kind substrate for the B-0967 ArgoCD health test.

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { applyRootApp } from "./apply-root-app.ts";
import {
  assertCommandExists,
  assertDnsLabel,
  assertFileExists,
  assertGitHubRepoUrl,
  assertSafeGitRef,
  containerRuntime,
  DEV_CLUSTER_DIR,
  kindRuntimeEnv,
  readFlagValue,
  rejectLegacyContainerRuntimeEnv,
  run,
  runCapture,
  runOptional,
  commandSucceeded,
} from "./dev-cluster-lib.ts";

const DEFAULT_GIT_REPO_URL =
  process.env.ZETA_ARGOCD_GIT_REPO_URL ?? "https://github.com/Lucent-Financial-Group/Zeta";

function usage(): never {
  console.error(
    "usage: bun full-ai-cluster/dev-cluster/kind-up.ts [--config <kind-config.yaml>] [--cluster-name <name>] [--git-ref <ref>] [--repo-url <url>]",
  );
  process.exit(1);
}

function main(argv: readonly string[]): void {
  let configPath = join(DEV_CLUSTER_DIR, "profiles", "ci.kind-config.yaml");
  let clusterName = "zeta-ci";
  let gitRef = "main";
  let gitRepoUrl = DEFAULT_GIT_REPO_URL;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") usage();
    if (arg === "--config") {
      configPath = readFlagValue(argv, i, arg)!;
      i++;
      continue;
    }
    if (arg === "--cluster-name") {
      clusterName = readFlagValue(argv, i, arg)!;
      i++;
      continue;
    }
    if (arg === "--git-ref") {
      gitRef = readFlagValue(argv, i, arg)!;
      i++;
      continue;
    }
    if (arg === "--repo-url") {
      gitRepoUrl = readFlagValue(argv, i, arg)!;
      i++;
      continue;
    }
    usage();
  }

  assertFileExists(configPath, "kind config");
  assertDnsLabel(clusterName, "cluster name");
  rejectLegacyContainerRuntimeEnv();
  const runtime = containerRuntime();
  const env = kindRuntimeEnv(runtime);
  assertSafeGitRef(gitRef);
  assertGitHubRepoUrl(gitRepoUrl);
  assertCommandExists([runtime, "kind", "kubectl", "helm"], runtime);

  const clusters = runCapture("kind", ["get", "clusters"], env).split("\n");
  if (clusters.some((line) => line.trim() === clusterName)) {
    console.log(
      `Cluster ${clusterName} already exists. Use bun full-ai-cluster/dev-cluster/kind-down.ts --cluster-name ${clusterName} to recreate.`,
    );
  } else {
    console.log(`Creating kind cluster ${clusterName} ...`);
    run("kind", ["create", "cluster", "--name", clusterName, "--config", configPath, "--wait", "180s"], env);
  }

  run("kubectl", ["config", "use-context", `kind-${clusterName}`]);
  run("kubectl", ["wait", "--for=condition=Ready", "nodes", "--all", "--timeout=180s"]);

  console.log("Installing Gateway API CRDs (cert-manager enableGatewayAPI on kind/k3d) ...");
  run("kubectl", [
    "apply",
    "--server-side",
    "-f",
    "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml",
  ]);

  console.log("Ensuring zeta-local-path StorageClass alias (dev/CI parity) ...");
  run("kubectl", ["apply", "-f", join(DEV_CLUSTER_DIR, "manifests", "zeta-local-path.yaml")]);

  const helmStatus = commandSucceeded("helm", ["-n", "argocd", "status", "argocd"]);
  if (!helmStatus) {
    console.log("Installing ArgoCD ...");
    runOptional("kubectl", ["create", "namespace", "argocd"]);
    runOptional("helm", ["repo", "add", "argo", "https://argoproj.github.io/argo-helm"]);
    run("helm", ["repo", "update", "argo"]);
    run("helm", [
      "install",
      "argocd",
      "argo/argo-cd",
      "--version",
      "7.7.10",
      "--namespace",
      "argocd",
      "--set",
      "server.service.type=ClusterIP",
      "--wait",
    ]);
  }

  run("kubectl", ["wait", "--for=condition=Established", "--timeout=120s", "crd/applications.argoproj.io"]);

  applyRootApp(gitRef, gitRepoUrl);

  console.log(`
Kind CI cluster up.

  kubectl get nodes
  kubectl -n argocd get applications

Tear down: bun full-ai-cluster/dev-cluster/kind-down.ts --cluster-name ${clusterName}
`);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
