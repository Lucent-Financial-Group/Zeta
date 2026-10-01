// zeta-postgres-instances.test.ts
//
// EXECUTES `full-ai-cluster/nixos/modules/zeta-postgres-instances.sh` against a fake kubectl
// (same discipline as zeta-virt-first-sync.test.ts): a script a test can RUN, not Nix source a
// test can only read.
//
// THE PROPERTIES THAT MATTER:
//   1. the instance count FOLLOWS the schedulable-node count, capped at 3 (the owner's goal:
//      "clusters of pods", 1 on one box, replicated once nodes exist);
//   2. it NEVER scales down -- a node that blips out of the count must not delete a replica;
//   3. an API error is `waiting`, never "zero nodes" and never "steady" (reading an error as an
//      empty cluster is how a scale-down guard is built wrong);
//   4. ArgoCD is told to leave exactly the three fields this unit writes alone, or the next
//      selfHeal sync would put `instances: 1` back and scale three instances to one.
// A mutant of the never-scale-down guard proves the fake is not agreeing with itself.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { join as posixJoin } from "node:path/posix";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const MODULES = join(REPO_ROOT, "full-ai-cluster/nixos/modules");
const SCRIPT = join(MODULES, "zeta-postgres-instances.sh");
const NIX_MODULE = join(MODULES, "zeta-postgres-instances.nix");
const SERVER_MODULE = join(MODULES, "k3s-server.nix");
const APP_DIR = join(REPO_ROOT, "full-ai-cluster/k8s/applications/postgres-shared");

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "zeta-postgres-instances-")).replace(/\\/g, "/");
}

// A fake `k3s kubectl`. The node listing is the go-template's OUTPUT shape (one line per node:
// `<name> <Ready> <ok|unschedulable> <taint effects,>`), supplied by the scenario.
const FAKE_KUBECTL = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
args="$*"
case "$args" in
  *"get nodes"*)
    [ -n "$FAKE_NODES_FAIL" ] && exit 1
    printf '%b' "$FAKE_NODES"; exit 0;;
  *"get cluster.postgresql.cnpg.io"*)
    [ -n "$FAKE_CLUSTER_FAIL" ] && exit 1
    printf '%s' "$FAKE_INSTANCES"; exit 0;;
  *"patch cluster.postgresql.cnpg.io"*)
    [ -n "$FAKE_PATCH_FAILS" ] && exit 1
    exit 0;;
esac
exit 0
`;

const node = (name: string, ready = "True", sched = "ok", taints = ""): string => `${name} ${ready} ${sched} ${taints}\\n`;
const nodes = (n: number): string => Array.from({ length: n }, (_, i) => node(`n${i + 1}`)).join("");

interface Scenario {
  readonly nodes?: string;
  readonly instances?: string;
  readonly nodesFail?: boolean;
  readonly clusterFail?: boolean;
  readonly patchFails?: boolean;
}

interface Result {
  readonly status: number;
  readonly out: string;
  readonly patches: readonly string[];
  readonly patchBodies: readonly Record<string, any>[];
  readonly calls: readonly string[];
  readonly root: string;
}

function run(scenario: Scenario, script: string = SCRIPT, root: string = tempRoot()): Result {
  const fake = posixJoin(root, "fake-kubectl.sh");
  writeFileSync(fake, FAKE_KUBECTL);
  const log = posixJoin(root, "kubectl.log");
  writeFileSync(log, "");
  const result = spawnSync("bash", [script], {
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      LC_ALL: "C",
      ZETA_KUBECTL_CMD: `bash ${fake}`,
      ZETA_PG_ONCE: "1",
      ZETA_PG_LAST_STATE_FILE: posixJoin(root, "last-state"),
      ZETA_SERIAL_DEVICE: posixJoin(root, "no-such-serial-device"),
      FAKE_LOG: log,
      FAKE_NODES: scenario.nodes ?? nodes(1),
      FAKE_INSTANCES: scenario.instances ?? "1",
      FAKE_NODES_FAIL: scenario.nodesFail ? "1" : "",
      FAKE_CLUSTER_FAIL: scenario.clusterFail ? "1" : "",
      FAKE_PATCH_FAILS: scenario.patchFails ? "1" : "",
    },
    encoding: "utf8",
    maxBuffer: 64 * 1024,
  });
  const calls = readFileSync(log, "utf8").split("\n").filter((l) => l.length > 0);
  const patches = calls.filter((c) => c.includes("patch cluster.postgresql.cnpg.io"));
  const patchBodies = patches.map((p) => JSON.parse(/-p (\{.*\})$/.exec(p)![1]!) as Record<string, any>);
  return { status: result.status ?? -1, out: `${result.stdout}${result.stderr}`, patches, patchBodies, calls, root };
}

describe("the instance count follows the number of schedulable nodes", () => {
  test("one node, one instance: nothing is patched (the committed default stands)", () => {
    const r = run({ nodes: nodes(1), instances: "1" });
    expect(r.status).toBe(0);
    expect(r.patches).toEqual([]);
    expect(r.out).toContain("VERDICT steady");
  });

  test("three nodes: instances go 1 -> 3 and enablePDB / primaryUpdateMethod move WITH them", () => {
    const r = run({ nodes: nodes(3), instances: "1" });
    expect(r.status).toBe(0);
    expect(r.patchBodies).toHaveLength(1);
    expect(r.patchBodies[0]!.spec).toEqual({ instances: 3, enablePDB: true, primaryUpdateMethod: "switchover" });
    expect(r.patches[0]).toContain("--type merge");
    expect(r.out).toContain("VERDICT scaled");
  });

  test("two nodes: two instances, not three (a third could not spread)", () => {
    expect(run({ nodes: nodes(2), instances: "1" }).patchBodies[0]!.spec.instances).toBe(2);
  });

  test("seven nodes: capped at three", () => {
    expect(run({ nodes: nodes(7), instances: "1" }).patchBodies[0]!.spec.instances).toBe(3);
  });

  test("only nodes that can take a pod count: NotReady, cordoned and NoSchedule-tainted nodes do not", () => {
    const mixed = node("a") + node("b", "False") + node("c", "True", "unschedulable") + node("d", "True", "ok", "NoSchedule,") + node("e", "True", "ok", "NoExecute,");
    const r = run({ nodes: mixed, instances: "1" });
    // only `a` is eligible, so there is nothing to scale to
    expect(r.patches).toEqual([]);
    const withTwo = run({ nodes: mixed + node("f"), instances: "1" });
    expect(withTwo.patchBodies[0]!.spec.instances).toBe(2);
  });

  test("a PreferNoSchedule taint does not exclude a node (it is a preference, not a refusal)", () => {
    const r = run({ nodes: node("a") + node("b", "True", "ok", "PreferNoSchedule,"), instances: "1" });
    expect(r.patchBodies[0]!.spec.instances).toBe(2);
  });

  test("the triple it writes is the one postgres-shared-cluster.test.ts pins for any instances > 1", () => {
    // That test: instances == 1 <=> (enablePDB false, restart); otherwise (enablePDB not false, switchover).
    const spec = run({ nodes: nodes(3), instances: "1" }).patchBodies[0]!.spec;
    expect(spec.instances).toBeGreaterThan(1);
    expect(spec.enablePDB).not.toBe(false);
    expect(spec.primaryUpdateMethod).toBe("switchover");
  });
});

describe("it never scales down", () => {
  test("a single schedulable node against a three-instance Cluster patches NOTHING", () => {
    const r = run({ nodes: nodes(1), instances: "3" });
    expect(r.status).toBe(0);
    expect(r.patches).toEqual([]);
    expect(r.out).toContain("never scales down");
  });

  test("an already-scaled Cluster is left alone", () => {
    expect(run({ nodes: nodes(3), instances: "3" }).patches).toEqual([]);
  });

  test("mutation: with the guard deleted, the scale-down scenario DETECTS it", () => {
    // Without this the suite above would pass against a script that happily patches 3 -> 1.
    const source = readFileSync(SCRIPT, "utf8");
    const mutated = source.replace('if [ "$target" -le "$current" ]; then', 'if [ "$target" -eq "$current" ]; then');
    expect(mutated).not.toBe(source); // the mutation matched; else this proves nothing
    const root = tempRoot();
    const mutantPath = posixJoin(root, "mutant.sh");
    writeFileSync(mutantPath, mutated);
    // the mutant takes a 3-instance Cluster down to the 1 node it can see...
    expect(run({ nodes: nodes(1), instances: "3" }, mutantPath, root).patchBodies[0]!.spec.instances).toBe(1);
    // ...which is exactly what the real script must not do.
    expect(run({ nodes: nodes(1), instances: "3" }).patches).toEqual([]);
  });
});

describe("an unanswered question is `waiting`, never an answer", () => {
  test("the node list fails: waiting, nothing patched, and NOT read as zero nodes or as steady", () => {
    const r = run({ nodesFail: true, instances: "3" });
    expect(r.status).toBe(0);
    expect(r.patches).toEqual([]);
    expect(r.out).toContain("VERDICT waiting: could not list nodes");
    expect(r.out).not.toContain("VERDICT steady");
    expect(r.out).not.toContain("VERDICT scaled");
  });

  test("the Cluster read fails: waiting, nothing patched", () => {
    const r = run({ nodes: nodes(3), clusterFail: true });
    expect(r.patches).toEqual([]);
    expect(r.out).toContain("VERDICT waiting: could not ask the API for Cluster");
  });

  test("the Cluster does not exist yet: waiting (ArgoCD has not synced it), nothing patched", () => {
    const r = run({ nodes: nodes(3), instances: "" });
    expect(r.patches).toEqual([]);
    expect(r.out).toContain("does not exist yet");
  });

  test("a garbage instance count is waiting, not a number to compare against", () => {
    const r = run({ nodes: nodes(3), instances: "<no value>" });
    expect(r.patches).toEqual([]);
    expect(r.out).toContain("non-numeric");
  });

  test("a failed patch is waiting, never a `scaled` verdict", () => {
    const r = run({ nodes: nodes(3), instances: "1", patchFails: true });
    expect(r.out).toContain("VERDICT waiting: patching Cluster");
    expect(r.out).not.toContain("VERDICT scaled");
  });

  test("no schedulable node counted at all is waiting (nothing safe to scale to)", () => {
    const r = run({ nodes: node("a", "False"), instances: "1" });
    expect(r.patches).toEqual([]);
    expect(r.out).toContain("no schedulable Ready node");
  });
});

describe("a loop does not repeat itself", () => {
  test("the same verdict twice prints once; a changed one prints again", () => {
    const first = run({ nodes: nodes(1), instances: "1" });
    expect(first.out.match(/VERDICT steady/g)).toHaveLength(1);
    const again = run({ nodes: nodes(1), instances: "1" }, SCRIPT, first.root);
    expect(again.out).not.toContain("VERDICT");
    const changed = run({ nodes: nodes(3), instances: "1" }, SCRIPT, first.root);
    expect(changed.out).toContain("VERDICT scaled");
  });
});

describe("wiring", () => {
  const nix = readFileSync(NIX_MODULE, "utf8");

  test("the unit runs THIS script after k3s and keeps looping; nothing requires it", () => {
    expect(nix).toContain("./zeta-postgres-instances.sh");
    expect(nix).toContain('after = [ "k3s.service" ]');
    expect(nix).toContain('Restart = "always"');
    const code = nix
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
    expect(code).not.toMatch(/requiredBy|bindsTo|requires\s*=/);
  });

  test("it is imported by the server role, so a worker never runs it", () => {
    expect(readFileSync(SERVER_MODULE, "utf8")).toContain("./zeta-postgres-instances.nix");
  });

  test("the script's file is where the bash-retirement inventory expects it", () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });
});

describe("ArgoCD does not put `instances: 1` back", () => {
  const app = parseYaml(readFileSync(join(APP_DIR, "Application.yaml"), "utf8")) as any;

  test("the Application ignores exactly the three Cluster fields this unit writes, and RESPECTS the ignore on sync", () => {
    const entry = (app.spec.ignoreDifferences ?? []).find((e: any) => e.kind === "Cluster" && e.group === "postgresql.cnpg.io" && e.name === "postgres-shared");
    expect(entry).toBeDefined();
    expect([...entry.jsonPointers].sort()).toEqual(["/spec/enablePDB", "/spec/instances", "/spec/primaryUpdateMethod"]);
    // Without this the ignore only hides the DIFF: a sync (selfHeal included) would still apply `instances: 1`.
    expect(app.spec.syncPolicy.syncOptions).toContain("RespectIgnoreDifferences=true");
  });

  test("the committed Cluster still starts at ONE instance: the unit scales up, it is not the default", () => {
    const cluster = parseYaml(readFileSync(join(APP_DIR, "cluster.yaml"), "utf8")) as any;
    expect(cluster.spec.instances).toBe(1);
  });
});
