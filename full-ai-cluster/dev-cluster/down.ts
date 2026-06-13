#!/usr/bin/env bun
// Tear down the local dev cluster + its registry. Idempotent.

import { join } from "node:path";
import {
  assertDnsLabel,
  assertFileExists,
  captureOptional,
  DEV_CLUSTER_DIR,
  parseK3dClusterName,
  readFlagValue,
  run,
  runCapture,
  runOptional,
} from "./dev-cluster-lib.ts";

function usage(): never {
  console.error("usage: bun full-ai-cluster/dev-cluster/down.ts [--config <k3d-config.yaml>]");
  process.exit(1);
}

function main(argv: readonly string[]): void {
  let configPath = join(DEV_CLUSTER_DIR, "k3d-config.yaml");

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") usage();
    if (arg === "--config") {
      configPath = readFlagValue(argv, i, arg)!;
      i++;
      continue;
    }
    usage();
  }

  assertFileExists(configPath, "k3d config");
  const clusterName = parseK3dClusterName(configPath);
  assertDnsLabel(clusterName, "k3d config metadata.name");
  const registryName = `${clusterName}-registry`;
  const kubecontext = `k3d-${clusterName}`;

  const clusters = runCapture("k3d", ["cluster", "list"]).split("\n");
  if (clusters.some((line) => line.startsWith(`${clusterName} `))) {
    console.log(`Deleting k3d cluster ${clusterName} ...`);
    run("k3d", ["cluster", "delete", clusterName]);
  }

  const registries = runCapture("k3d", ["registry", "list"]).split("\n");
  if (registries.some((line) => line.startsWith(`k3d-${registryName} `))) {
    console.log(`Deleting k3d registry ${registryName} ...`);
    runOptional("k3d", ["registry", "delete", registryName]);
  }

  const currentContext = captureOptional("kubectl", ["config", "current-context"])?.trim() ?? "";
  if (currentContext === kubecontext) {
    runOptional("kubectl", ["config", "unset", "current-context"]);
  }

  console.log("Dev cluster torn down.");
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
