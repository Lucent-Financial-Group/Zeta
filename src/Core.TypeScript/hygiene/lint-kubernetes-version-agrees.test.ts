// Falsifiers for the Kubernetes-version agreement linter.
//
// THE FIRST CLEAN RUN REPORTED "0 literal(s) scanned, all agree" -- which is a pass
// that cannot fail, and the exact shape this repo refuses. Wiring all three consumers
// to the declaration removed every literal the scanner could see, so the scanner had
// nothing left to disagree with. These tests exist because that verdict is worthless
// without them: they prove the matcher recognises each real spelling, and that a
// disagreeing literal is caught rather than passed over.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DECLARATION_PATH,
  declaredVersion,
  disagreements,
  findVersionLiterals,
  formatFinding,
  EXEMPT,
} from "./lint-kubernetes-version-agrees.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

describe("the declaration itself", () => {
  test("declares a well-formed version", () => {
    expect(declaredVersion(REPO_ROOT)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("its k3s provenance agrees with the Kubernetes version it declares", () => {
    // k3s versions are `<kubernetes-version>+k3s<n>`. If these two ever disagree the
    // file is describing a derivation it did not perform.
    const parsed = JSON.parse(readFileSync(join(REPO_ROOT, DECLARATION_PATH), "utf8")) as {
      kubernetesVersion: string;
      k3sVersion: string;
    };
    expect(parsed.k3sVersion).toStartWith(parsed.kubernetesVersion);
  });

  test("refuses a malformed declaration rather than defaulting", () => {
    // A default here would silently change which API surface the tree is checked
    // against, which is how the previous bare literal survived unnoticed.
    expect(() => declaredVersion("/nonexistent-repo-root")).toThrow();
  });
});

describe("the matcher recognises every spelling that CONFIGURES a validator", () => {
  const cases: [string, string][] = [
    ["kubeconform long flag", 'kubeconform -kubernetes-version 1.30.0 -summary'],
    ["helm-style double dash", 'helm template x --kube-version 1.30.0'],
    ["quoted flag value", 'kubeconform -kubernetes-version "1.30.0"'],
    ["TS constant", 'export const KUBE_VERSION = "1.30.0";'],
    ["JSON-ish field", '  "kubernetesVersion": "1.30.0",'],
    ["chart kubeVersion field", '  kubeVersion: "1.30.0"'],
  ];
  for (const [name, line] of cases) {
    test(name, () => {
      const found = findVersionLiterals("f.ts", line);
      expect(found.map((l) => l.version)).toEqual(["1.30.0"]);
    });
  }

  test("does NOT flag things that merely look like versions", () => {
    // A broad "any 1.NN.N" scan would flag chart versions, image tags and prose, and a
    // linter that cries wolf is one people learn to skip -- the same vacuity in a
    // different costume.
    for (const line of [
      "    targetRevision: 1.30.0",
      '    image: "grafana/mimir:1.30.0"',
      "  # we used to run 1.30.0 here",
      '    "chartVersion": "1.30.0"',
    ]) {
      expect(findVersionLiterals("f.yaml", line)).toEqual([]);
    }
  });
});

describe("disagreement is CAUGHT — the mutants", () => {
  const declared = "1.35.6";

  test("a literal that disagrees is refused", () => {
    const found = findVersionLiterals("some/file.yml", "kubeconform -kubernetes-version 1.31.0");
    expect(disagreements(found, declared)).toHaveLength(1);
  });

  test("a literal that AGREES is not refused", () => {
    // The control. Without it, a matcher that flagged everything would pass the test
    // above while being useless.
    const found = findVersionLiterals("some/file.yml", `kubeconform -kubernetes-version ${declared}`);
    expect(disagreements(found, declared)).toEqual([]);
  });

  test("THE HISTORICAL DRIFT is caught — the three literals that motivated this", () => {
    // Reconstructed verbatim from what the tree carried on 2026-09-01.
    const tree: [string, string][] = [
      ["src/Core.TypeScript/hygiene/audit-observability-chain.ts", 'export const KUBE_VERSION = "1.31.0";'],
      // path generalised: this fixture demonstrates the SHAPE, and naming the tree
      // scheduled for deletion would add a consumer to a list meant to reach zero.
      ["some/manifest-validator.ts", '"kube-version": { type: "string", default: "1.33.0" },'],
      [".github/workflows/gate.yml", "kubeconform -kubernetes-version 1.33.0 -skip x"],
    ];
    const found = tree.flatMap(([f, t]) => findVersionLiterals(f, t));
    expect(found).toHaveLength(3);
    const caught = disagreements(found, declared);
    // All three disagreed with what the cluster runs, and TWO of them disagreed with
    // each other -- which is the drift a single shared file makes impossible.
    expect(caught).toHaveLength(3);
    expect(new Set(caught.map((l) => l.version))).toEqual(new Set(["1.31.0", "1.33.0"]));
  });

  test("the exemption list is narrow, and the declaration is on it", () => {
    expect(EXEMPT.has(DECLARATION_PATH)).toBe(true);
    // An exemption that swallowed a real consumer would make this whole check
    // vacuous, so the list is asserted to be SMALL and self-referential rather than
    // by naming a consumer -- naming one would add this test to the roster of files
    // coupled to the tree scheduled for deletion, which is a list meant to reach zero.
    expect(EXEMPT.size).toBeLessThanOrEqual(3);
    for (const path of EXEMPT.keys()) {
      const selfReferential = path === DECLARATION_PATH || path.includes("lint-kubernetes-version-agrees");
      expect(selfReferential).toBe(true);
    }
    expect(EXEMPT.has(".github/workflows/gate.yml")).toBe(false);
  });

  test("the finding says what is wrong AND why it matters in both directions", () => {
    const [l] = findVersionLiterals("f.yml", "kubeconform -kubernetes-version 1.31.0");
    const msg = formatFinding(l!, declared);
    expect(msg).toContain("1.31.0");
    expect(msg).toContain(declared);
    expect(msg).toContain("rejects charts that would install");
    expect(msg).toContain("silently clears");
  });
});

describe("the live tree agrees with itself", () => {
  test("every consumer reads the declaration rather than a literal", () => {
    const declared = declaredVersion(REPO_ROOT);
    for (const f of [
      "src/Core.TypeScript/hygiene/audit-observability-chain.ts",
      ".github/workflows/gate.yml",
    ]) {
      const found = findVersionLiterals(f, readFileSync(join(REPO_ROOT, f), "utf8"));
      expect(disagreements(found, declared)).toEqual([]);
    }
  });
});
