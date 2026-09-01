// The Orleans silo's manifests and its SOURCE are two halves of one contract, and
// nothing checked that they agree until 2026-09-01.
//
// They had already drifted, in the way that is hardest to see: each half was
// internally consistent. `configmap.yaml` names a `clustering.passwordSecret`, and
// `statefulset.yaml` projected no secret at all — so a silo would have read a Redis
// endpoint it had no credential for, failed to form membership, and (because the
// readiness probe is a TCP check on the gateway port) possibly still reported Ready.
//
// Every assertion here reads BOTH artifacts. A test that read only the manifests
// would pass against a silo that ignores them, and one that read only the source
// would pass against manifests that feed it nothing.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..", "..");
const APP = join(REPO, "full-ai-cluster", "k8s", "applications", "orleans");
const SILO = join(REPO, "full-ai-cluster", "orleans-silo");

const configmap = readFileSync(join(APP, "configmap.yaml"), "utf8");
const statefulset = readFileSync(join(APP, "statefulset.yaml"), "utf8");
const clusterConfigCs = readFileSync(join(SILO, "ClusterConfig.cs"), "utf8");
const programCs = readFileSync(join(SILO, "Program.cs"), "utf8");
const dockerfile = readFileSync(join(SILO, "Dockerfile"), "utf8");

/** Pull the embedded `cluster.json` document out of the ConfigMap's block scalar. */
export function clusterJsonFromConfigMap(yaml: string): Record<string, unknown> {
  const marker = "cluster.json: |";
  const at = yaml.indexOf(marker);
  if (at < 0) throw new Error("configmap.yaml no longer embeds a `cluster.json: |` block");
  const body: string[] = [];
  for (const line of yaml.slice(at + marker.length).split("\n").slice(1)) {
    if (line.trim() !== "" && !line.startsWith("    ")) break;
    body.push(line.slice(4));
  }
  return JSON.parse(body.join("\n")) as Record<string, unknown>;
}

/** Every `[JsonPropertyName("x")]` the silo declares. */
export function jsonPropertyNames(csharp: string): Set<string> {
  return new Set([...csharp.matchAll(/\[JsonPropertyName\("([^"]+)"\)\]/g)].map((m) => m[1] as string));
}

/** Every key the ConfigMap's JSON actually carries, at any depth. */
export function keysDeep(value: unknown, into = new Set<string>()): Set<string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      into.add(k);
      keysDeep(v, into);
    }
  }
  return into;
}

describe("the Orleans silo agrees with the manifests that run it", () => {
  const config = clusterJsonFromConfigMap(configmap);

  test("every key the ConfigMap ships is one the silo actually reads", () => {
    const declared = jsonPropertyNames(clusterConfigCs);
    const shipped = [...keysDeep(config)];
    const unread = shipped.filter((k) => !declared.has(k));
    // A key the silo never reads is config the operator believes is in effect.
    expect(unread).toEqual([]);
  });

  test("the ports in the ConfigMap are the ports the pod exposes AND the image EXPOSEs", () => {
    const silo = config["silo"] as { siloPort: number; gatewayPort: number };
    const dashboard = (config["telemetry"] as { dashboard: { port: number } }).dashboard;

    for (const [name, port] of [["silo", silo.siloPort], ["gateway", silo.gatewayPort], ["dashboard", dashboard.port]] as const) {
      expect(statefulset).toContain(`{ name: ${name}, containerPort: ${String(port)} }`);
      expect(dockerfile).toContain(String(port));
    }
  });

  // THE ASSERTION THIS FILE WAS WRITTEN FOR.
  test("a ConfigMap that names a passwordSecret means the pod must project it", () => {
    const clustering = config["clustering"] as { passwordSecret?: { name: string; key: string } };
    if (!clustering.passwordSecret) return; // no secret named, nothing to project

    const { name, key } = clustering.passwordSecret;
    expect(statefulset).toContain(`secretKeyRef: { name: ${name}, key: ${key}`);
    // ...and the silo must actually READ the env the pod projects, or the
    // projection is decoration.
    expect(programCs).toContain("REDIS_PASSWORD");
  });

  test("the silo refuses a clustering provider it does not implement", () => {
    // The ConfigMap carried `kubernetes` until 2026-09-01. A silo that defaulted
    // instead of refusing would have started alone and reported healthy.
    expect(clusterConfigCs).toContain('!string.Equals(Clustering.Provider, "redis", StringComparison.Ordinal)');
    expect((config["clustering"] as { provider: string }).provider).toBe("redis");
  });

  test("the downward-API env the pod sets is env the silo reads", () => {
    for (const name of ["POD_NAME", "POD_IP"]) {
      expect(statefulset).toContain(name);
      const readSomewhere = programCs.includes(name) || readFileSync(join(SILO, "Grains", "HeartbeatGrain.cs"), "utf8").includes(name);
      expect(readSomewhere).toBe(true);
    }
  });

  test("the image the StatefulSet pins is the image the workflow builds", () => {
    const workflow = readFileSync(join(REPO, ".github", "workflows", "build-platform-images.yml"), "utf8");
    expect(statefulset).toContain("ghcr.io/lucent-financial-group/zeta-orleans-silo");
    expect(workflow).toContain("image: zeta-orleans-silo");
    expect(workflow).toContain("context: full-ai-cluster/orleans-silo");
  });
});
