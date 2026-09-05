// src/Core.TypeScript/cluster/zero-pod-health.test.ts
//
// The falsifiers for "what remains, asserted; what acts, never checked".
// Each states the inversion it guards, because a test that cannot fail is the
// same defect one layer up from the one this module was written to find.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { declaresZeroReplicas, findZeroPodApplications } from "./zero-pod-health.ts";

describe("declaresZeroReplicas — the arithmetic, not the vocabulary", () => {
  test("catches both spellings, at any indentation", () => {
    expect(declaresZeroReplicas("replicas: 0")).toHaveLength(1);
    expect(declaresZeroReplicas("        replicaCount: 0")).toHaveLength(1);
    expect(declaresZeroReplicas("  replicas:   0   ")).toHaveLength(1);
  });

  test("a NON-zero replica count is not a finding — the guard is the zero, not the key", () => {
    expect(declaresZeroReplicas("replicas: 1")).toEqual([]);
    expect(declaresZeroReplicas("replicaCount: 3")).toEqual([]);
    // 10 must not match as "1" followed by "0".
    expect(declaresZeroReplicas("replicas: 10")).toEqual([]);
  });

  test("a COMMENTED declaration is not a declaration", () => {
    expect(declaresZeroReplicas("# replicas: 0")).toEqual([]);
    expect(declaresZeroReplicas("  # was replicas: 0 before the fix")).toEqual([]);
    // But a real declaration with a trailing comment IS one -- that is exactly
    // how `hat-system` and `ollama` write theirs, and missing them would make
    // this check vacuous against its own motivating cases.
    expect(declaresZeroReplicas("replicas: 0  # see header note")).toHaveLength(1);
  });

  test("prose ABOUT zero replicas is not a declaration", () => {
    // argocd-health-test.ts discusses `replicas: 0` in four comments. A checker
    // that convicted on discussion would fire on the file explaining the defect.
    expect(declaresZeroReplicas("// its StatefulSet ships `replicas: 0`, which")).toEqual([]);
  });
});

describe("findZeroPodApplications — the live tree", () => {
  /**
   * THE FALSIFIER THAT MATTERS. These four are the reason the module exists,
   * and the count is asserted so that bringing one up to >=1 replica MOVES this
   * test rather than silently improving a number nobody reads.
   */
  test("the four known zero-pod Applications are found", () => {
    const dirs = findZeroPodApplications().map((f) => f.dir).sort();
    expect(dirs).toEqual(["hat-system", "ollama", "orleans", "vllm"]);
  });

  test("it reaches BOTH the Application and its sibling workload YAML", () => {
    const found = findZeroPodApplications();
    // ollama declares its zero in the Application's valuesObject...
    const ollama = found.find((f) => f.dir === "ollama");
    expect(ollama?.declarations.some((d) => d.startsWith("Application.yaml:"))).toBe(true);
    // ...while orleans declares it in a git-path StatefulSet the Application applies.
    // A checker that read only Application.yaml would miss three of the four.
    const orleans = found.find((f) => f.dir === "orleans");
    expect(orleans?.declarations.some((d) => d.startsWith("statefulset.yaml:"))).toBe(true);
  });

  test("a tree with a running replica count yields NOTHING — the check can pass", () => {
    // A checker that fires on every tree is not a checker. This builds a clean
    // fixture and asserts silence, which is the half that mutation-testing a
    // finding count cannot establish.
    const root = mkdtempSync(join(tmpdir(), "zeta-zero-pod-clean-"));
    const app = join(root, "full-ai-cluster/k8s/applications/demo");
    mkdirSync(app, { recursive: true });
    writeFileSync(join(app, "Application.yaml"), "kind: Application\nspec:\n  replicas: 2\n");
    writeFileSync(join(app, "deployment.yaml"), "kind: Deployment\nspec:\n  replicas: 1\n");
    expect(findZeroPodApplications(root)).toEqual([]);
  });

  test("a NESTED Application is reached — game-hosting/gmod-shaped layouts are not skipped", () => {
    const root = mkdtempSync(join(tmpdir(), "zeta-zero-pod-nested-"));
    const nested = join(root, "full-ai-cluster/k8s/applications/group/inner");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "Application.yaml"), "kind: Application\n");
    writeFileSync(join(nested, "statefulset.yaml"), "spec:\n  replicas: 0\n");
    expect(findZeroPodApplications(root).map((f) => f.dir)).toEqual(["group/inner"]);
  });
});
