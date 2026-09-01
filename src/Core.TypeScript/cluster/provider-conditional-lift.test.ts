/**
 * provider-conditional-lift.test.ts — a LIFTS WHEN the mechanism can evaluate.
 *
 * WHY THIS FILE EXISTS.
 *
 * `cilium`'s recorded exclusion reason says it lifts when "the app-of-apps
 * included proof runs on that profile, so ArgoCD is reconciling a cluster whose
 * CNI slot Cilium already owns." That became true on 2026-08-31 when the k3d
 * lane went green at `--scope included`.
 *
 * It could not fire. `isExcludedFromIncludedProof` took no provider argument and
 * `discoverExpectedApplications` threaded none, so the condition was unevaluable
 * by the code that enforces it — a promise in prose with no mechanism behind it.
 * That is the vacuity class pointed at an EXIT condition rather than at a check.
 *
 * The other half is `cilium-lb-ipam`, and it is the more interesting one: its
 * lift is CONJUNCTIVE and the second conjunct is measurably FALSE, so it must
 * stay excluded even though its sibling lifted.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPlan, discoverExpectedApplications, isExcludedFromIncludedProof, parseArgs } from "./argocd-health-test.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

function included(provider: "kind" | "k3d" | null): readonly string[] {
  return discoverExpectedApplications(REPO_ROOT, provider)
    .filter((a) => !a.excludedFromDev)
    .map((a) => a.dir);
}

describe("cilium lifts on k3d and only on k3d", () => {
  test("k3d includes cilium — the condition its own reason names", () => {
    expect(included("k3d")).toContain("cilium");
  });

  test("kind does NOT include cilium — kind runs its own CNI, which is the whole reason", () => {
    expect(included("kind")).not.toContain("cilium");
  });

  test("an UNKNOWN provider lifts nothing — absence of information is not permission", () => {
    expect(included(null)).not.toContain("cilium");
  });

  test("the lift is the ONLY difference k3d makes to the roster", () => {
    const k3d = new Set(included("k3d"));
    const kind = new Set(included("kind"));
    const onlyK3d = [...k3d].filter((d) => !kind.has(d));
    const onlyKind = [...kind].filter((d) => !k3d.has(d));
    expect(onlyK3d).toEqual(["cilium"]);
    expect(onlyKind).toEqual([]);
  });
});

describe("cilium-lb-ipam stays excluded — half a conjunction is not a condition", () => {
  test("it is excluded on EVERY provider, including k3d", () => {
    for (const p of ["k3d", "kind", null] as const) {
      expect(included(p)).not.toContain("cilium-lb-ipam");
    }
  });

  test("the unmet conjunct is REAL and checkable: the pool is a pinned home subnet", () => {
    // "the pool is parameterised per substrate rather than pinned to one
    // maintainer's subnet" -- measurably false, so the lift must not fire.
    const pool = readFileSync(
      join(REPO_ROOT, "full-ai-cluster/k8s/applications/cilium-lb-ipam/ip-pool.yaml"),
      "utf8",
    );
    expect(pool).toMatch(/192\.168\.\d+\.\d+/);
  });
});

describe("the default is conservative", () => {
  test("isExcludedFromIncludedProof with no provider behaves exactly as before", () => {
    // Same call shape the 16 repo-level call sites use.
    expect(isExcludedFromIncludedProof("cilium", "", join(REPO_ROOT, "full-ai-cluster/k8s/applications/cilium"))).toBe(
      true,
    );
  });
});

describe("the provider actually REACHES the plan — the wiring, not just the predicate", () => {
  // M4 OF THE MUTATION SUITE SURVIVED WITHOUT THIS. Every test above calls
  // `discoverExpectedApplications` directly, so deleting `options.provider` from
  // `buildPlan` broke nothing: the lift worked in isolation and never reached
  // production. A capability with no consumer is the same defect as a lift
  // condition nothing evaluates, one layer up.
  function planIncluded(provider: string): readonly string[] {
    // `parseArgs` returns `CliOptions | Failure` DIRECTLY, discriminated by
    // `"kind" in x` — not a `{ok, value}` wrapper. My first draft assumed the
    // wrapper and all three tests failed identically in the control, which is
    // the tell that the TEST was wrong rather than the code.
    const parsed = parseArgs(["--dry-run", "--provider", provider, "--scope", "included"], {});
    if ("kind" in parsed) throw new Error(`parseArgs rejected a valid argv: ${parsed.message}`);
    const plan = buildPlan(parsed, REPO_ROOT);
    if ("kind" in plan) throw new Error(`buildPlan failed: ${plan.message}`);
    return plan.expectedApplications.filter((a) => !a.excludedFromDev).map((a) => a.dir);
  }

  test("a k3d PLAN includes cilium", () => {
    expect(planIncluded("k3d")).toContain("cilium");
  });

  test("a kind PLAN does not", () => {
    expect(planIncluded("kind")).not.toContain("cilium");
  });

  test("neither plan includes cilium-lb-ipam", () => {
    expect(planIncluded("k3d")).not.toContain("cilium-lb-ipam");
    expect(planIncluded("kind")).not.toContain("cilium-lb-ipam");
  });
});
