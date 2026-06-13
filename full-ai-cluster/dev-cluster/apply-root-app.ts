#!/usr/bin/env bun
// Apply the dev/CI root App-of-Apps against the current kubectl context.

import {
  assertGitHubRepoUrl,
  assertSafeGitRef,
} from "./dev-cluster-lib.ts";

const DEFAULT_GIT_REPO_URL =
  process.env.ZETA_ARGOCD_GIT_REPO_URL ?? "https://github.com/Lucent-Financial-Group/Zeta";

export function applyRootApp(gitRef: string, gitRepoUrl: string = DEFAULT_GIT_REPO_URL): void {
  assertSafeGitRef(gitRef);
  assertGitHubRepoUrl(gitRepoUrl);

  console.log(`Applying root App-of-Apps (git repo: ${gitRepoUrl}, git ref: ${gitRef}) ...`);
  const manifest = `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: zeta-root-dev
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: ${gitRepoUrl}
    targetRevision: ${gitRef}
    path: full-ai-cluster/k8s/applications
    directory:
      recurse: true
      include: '{*/Application.yaml,Application.yaml}'
      exclude: '{cilium/**,cilium-lb-ipam/**,longhorn/**,ollama/**,vllm/**,deepseek-coder/**,qwen-coder/**,gitlab/**,orleans/**,temporal/**,agent-memory/**,platform/**}'
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
`;
  const result = Bun.spawnSync(["kubectl", "apply", "-f", "-"], {
    stdin: new TextEncoder().encode(manifest),
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

function usage(): never {
  console.error("usage: bun full-ai-cluster/dev-cluster/apply-root-app.ts [git-ref] [repo-url]");
  process.exit(1);
}

function main(argv: readonly string[]): void {
  if (argv.includes("-h") || argv.includes("--help")) {
    usage();
  }
  const gitRef = argv[0] ?? "main";
  const gitRepoUrl = argv[1] ?? DEFAULT_GIT_REPO_URL;
  applyRootApp(gitRef, gitRepoUrl);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
