#!/usr/bin/env bun
// Bring up the local dev cluster end-to-end (k3d → Cilium → ArgoCD → root app).

import { join } from "node:path";
import { applyRootApp } from "./apply-root-app.ts";
import {
  assertCommandExists,
  assertDnsLabel,
  assertFileExists,
  assertGitHubRepoUrl,
  assertSafeGitRef,
  commandSucceeded,
  DEV_CLUSTER_DIR,
  parseK3dAgentCount,
  parseK3dClusterName,
  readFlagValue,
  run,
  runCapture,
  runOptional,
} from "./dev-cluster-lib.ts";

const DEFAULT_GIT_REPO_URL =
  process.env.ZETA_ARGOCD_GIT_REPO_URL ?? "https://github.com/Lucent-Financial-Group/Zeta";

function usage(): never {
  console.error(`usage: bun full-ai-cluster/dev-cluster/up.ts [git-ref]
       bun full-ai-cluster/dev-cluster/up.ts --config <k3d-config.yaml> [--git-ref <ref>] [--repo-url <url>]`);
  process.exit(1);
}

function waitForApiReady(): void {
  console.log("Waiting for Kubernetes API readiness ...");
  for (let attempt = 0; attempt < 60; attempt++) {
    if (commandSucceeded("kubectl", ["get", "--raw=/readyz"])) return;
    Bun.sleepSync(3000);
  }
  run("kubectl", ["get", "--raw=/readyz"]);
}

function main(argv: readonly string[]): void {
  let configPath = join(DEV_CLUSTER_DIR, "k3d-config.yaml");
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
    if (gitRef !== "main") usage();
    gitRef = arg;
  }

  assertFileExists(configPath, "k3d config");
  const clusterName = parseK3dClusterName(configPath);
  assertDnsLabel(clusterName, "k3d config metadata.name");
  const kubecontext = `k3d-${clusterName}`;
  const k3dServerHost = `${kubecontext}-server-0`;
  const agentCount = parseK3dAgentCount(configPath);

  assertSafeGitRef(gitRef);
  assertGitHubRepoUrl(gitRepoUrl);
  assertCommandExists(["docker", "k3d", "kubectl", "helm"]);

  const clusters = runCapture("k3d", ["cluster", "list"]).split("\n");
  if (clusters.some((line) => line.startsWith(`${clusterName} `))) {
    console.log(`Cluster ${clusterName} already exists. Use bun full-ai-cluster/dev-cluster/down.ts --config ${configPath} to recreate.`);
  } else {
    console.log(`Creating k3d cluster ${clusterName} ...`);
    run("k3d", ["cluster", "create", "--config", configPath, "--wait=false"]);
  }

  run("k3d", ["kubeconfig", "merge", clusterName, "--kubeconfig-merge-default", "--kubeconfig-switch-context"]);
  run("kubectl", ["config", "use-context", kubecontext]);
  waitForApiReady();

  if (!commandSucceeded("helm", ["-n", "kube-system", "status", "cilium"])) {
    console.log("Installing Cilium ...");
    runOptional("helm", ["repo", "add", "cilium", "https://helm.cilium.io"]);
    run("helm", ["repo", "update", "cilium"]);

    const ciliumArgs = [
      "install",
      "cilium",
      "cilium/cilium",
      "--version",
      "1.16.5",
      "--namespace",
      "kube-system",
      "--set",
      "kubeProxyReplacement=true",
      "--set",
      `k8sServiceHost=${k3dServerHost}`,
      "--set",
      "k8sServicePort=6443",
      "--set",
      "hubble.enabled=true",
      "--set",
      "ipam.mode=kubernetes",
    ];
    if (agentCount === 0) {
      ciliumArgs.push("--set", "operator.replicas=1", "--set", "hubble.relay.enabled=false", "--set", "hubble.ui.enabled=false");
    } else {
      ciliumArgs.push("--set", "hubble.relay.enabled=true", "--set", "hubble.ui.enabled=true");
    }
    ciliumArgs.push("--wait");
    run("helm", ciliumArgs);
  }

  if (!commandSucceeded("helm", ["-n", "argocd", "status", "argocd"])) {
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
      "server.service.type=LoadBalancer",
      "--wait",
    ]);
  }

  runOptional("kubectl", ["wait", "--for=condition=Established", "--timeout=120s", "crd/applications.argoproj.io"]);

  applyRootApp(gitRef, gitRepoUrl);

  console.log(`
Dev cluster up. Same substrate as prod, minus Longhorn + GPU stack.

  kubectl get nodes
  kubectl -n argocd get applications
  kubectl -n argocd port-forward svc/argocd-server 8443:443
  open https://localhost:8443

  kubectl -n argocd get secret argocd-initial-admin-secret \\
    -o jsonpath='{.data.password}' | base64 -d ; echo

Tear down: bun full-ai-cluster/dev-cluster/down.ts
`);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
