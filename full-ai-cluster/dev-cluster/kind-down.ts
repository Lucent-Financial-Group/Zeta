#!/usr/bin/env bun
// Tear down a kind cluster used by dev/CI.

import {
  assertDnsLabel,
  containerRuntime,
  kindRuntimeEnv,
  rejectLegacyContainerRuntimeEnv,
  run,
  runCapture,
} from "./dev-cluster-lib.ts";

const DEFAULT_CLUSTER_NAME = "zeta-ci";

function usage(): never {
  console.error("usage: bun full-ai-cluster/dev-cluster/kind-down.ts [--cluster-name <name>]");
  process.exit(1);
}

function main(argv: readonly string[]): void {
  let clusterName = DEFAULT_CLUSTER_NAME;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") usage();
    if (arg === "--cluster-name") {
      const value = argv[i + 1];
      if (value === undefined) usage();
      clusterName = value;
      i++;
      continue;
    }
    usage();
  }

  assertDnsLabel(clusterName, "cluster name");
  rejectLegacyContainerRuntimeEnv();
  const runtime = containerRuntime();
  const env = kindRuntimeEnv(runtime);

  const clusters = runCapture("kind", ["get", "clusters"], env).split("\n");
  if (clusters.some((line) => line.trim() === clusterName)) {
    console.log(`Deleting kind cluster ${clusterName} ...`);
    run("kind", ["delete", "cluster", "--name", clusterName], env);
  } else {
    console.log(`Kind cluster ${clusterName} not present.`);
  }
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
