/**
 * provider-coverage.test.ts — every provider the harness SUPPORTS must be
 * DISPATCHED by CI, and every provider dispatched must be able to fail.
 *
 * WHY THIS FILE EXISTS.
 *
 * `argocd-health-test.ts` has accepted `--provider k3d` since it was written:
 * `isProvider` returns true for it, `bootstrapK3dClusterInProcess` is a real
 * code path with its own named failure kind, `ci.k3d-config.yaml` has existed
 * since 2026-06-21, and `dev-cluster/k3d-up.ts` / `k3d-down.ts` both ship.
 *
 * Measured 2026-08-31, before the `live-k3d` job existed: ZERO occurrences of
 * `--provider k3d` anywhere in `.github/workflows`. A complete second substrate
 * — built, pinned in `.mise.full.toml`, documented — dispatched by nothing, for
 * over two months.
 *
 * That is the vacuity class in its infrastructure form. Nothing was broken and
 * nothing was lying; the capability simply had no consumer, and no check could
 * notice, because "supported" and "exercised" were never compared. This file
 * compares them. It is deliberately structural: it reads the workflow, not a
 * cluster, so it costs milliseconds and runs in the ordinary test suite.
 *
 * IT WILL GO RED IF someone adds a provider to `isProvider` without a lane, or
 * deletes the k3d lane, or makes a provider lane `continue-on-error` — which is
 * the same defect wearing permission: a lane that cannot fail is not dispatch.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const WORKFLOW = join(REPO_ROOT, ".github", "workflows", "k8s-argocd-health-test.yml");
const HARNESS = join(REPO_ROOT, "src", "Core.TypeScript", "cluster", "argocd-health-test.ts");

/** The providers the harness accepts, read from its own guard rather than restated. */
function supportedProviders(): string[] {
  const src = readFileSync(HARNESS, "utf8");
  const body = src.match(/function isProvider\([^)]*\)[^{]*\{([\s\S]*?)\n\}/)?.[1];
  if (body === undefined) {
    throw new Error("isProvider not found in argocd-health-test.ts — this test is stale, not passing");
  }
  return [...body.matchAll(/value === "([a-z0-9]+)"/g)].map((m) => m[1]!).sort();
}

interface Job {
  readonly steps?: ReadonlyArray<{ readonly run?: string; readonly name?: string }>;
  readonly "continue-on-error"?: unknown;
}

function jobs(): Record<string, Job> {
  return (parse(readFileSync(WORKFLOW, "utf8")) as { jobs: Record<string, Job> }).jobs;
}

/** Job names whose steps pass `--provider <p>` to the harness. */
function jobsDispatching(provider: string): string[] {
  return Object.entries(jobs())
    .filter(([, j]) =>
      (j.steps ?? []).some((s) => typeof s.run === "string" && new RegExp(`--provider\\s+${provider}\\b`).test(s.run)),
    )
    .map(([name]) => name);
}

describe("every supported provider is exercised by a real CI lane", () => {
  test("the guard advertises exactly kind and k3d — a new provider must update this test deliberately", () => {
    expect(supportedProviders()).toEqual(["k3d", "kind"]);
  });

  for (const provider of ["kind", "k3d"]) {
    test(`${provider} is dispatched by at least one job`, () => {
      const dispatchers = jobsDispatching(provider);
      expect(dispatchers.length).toBeGreaterThan(0);
    });

    test(`no ${provider} lane is continue-on-error (a lane that cannot fail is not dispatch)`, () => {
      const all = jobs();
      for (const name of jobsDispatching(provider)) {
        expect(all[name]!["continue-on-error"]).toBeUndefined();
      }
    });
  }

  test("k3d specifically — the lane that did not exist before 2026-08-31", () => {
    expect(jobsDispatching("k3d")).toContain("live-k3d");
  });

  test("the k3d lane tears its cluster down even when the assertion fails", () => {
    const teardown = (jobs()["live-k3d"]!.steps ?? []).find((s) => (s.run ?? "").includes("k3d-down.ts"));
    expect(teardown).toBeDefined();
  });

  test("the k3d lane uses the committed k3d profile, not an inline cluster definition", () => {
    const runs = (jobs()["live-k3d"]!.steps ?? []).map((s) => s.run ?? "").join("\n");
    expect(runs).toContain("full-ai-cluster/dev-cluster/profiles/ci.k3d-config.yaml");
  });

  /**
   * 081M1DFQ2MZ — remaining second class after Gateway API CRDs landed.
   *
   * spire-agent 0.24.2 hardcodes `hostNetwork: true` and
   * `dnsPolicy: ClusterFirstWithHostNet`. Selector labels are
   * `app.kubernetes.io/name=spire-agent` / `app.kubernetes.io/instance`.
   * MEASURED live-k3d smoke 33739778288: `-l app=spire-agent` printed no
   * logs while the pod was 0/1 with 2 restarts. MEASURED 33751425785:
   * the real selector is `app.kubernetes.io/name=agent`; DaemonSet
   * name is `spire-agent`. Delete `logs daemonset/spire-agent` or
   * restore `logs -l app=spire-agent` and this goes red. Swallowing
   * `cilium-dbg` with `2>/dev/null | grep` also goes red: that dump
   * printed nothing and looked like KPR had no kube-dns.
   *
   * The remaining included-class question is TCP ClusterIP from the
   * hostNetwork netns (the k3d node). OPEN + DNS timeout => hostAliases.
   * FAIL => not DNS-only. Delete the probe strings and this goes red.
   */
  test("live-k3d dump logs the spire-agent DaemonSet, not a label the chart does not set", () => {
    const dump = (jobs()["live-k3d"]!.steps ?? []).find((s) =>
      (s.name ?? "").includes("Gateway API CRDs and the four"),
    );
    const run = dump?.run ?? "";
    expect(run.length).toBeGreaterThan(0);
    expect(run).toContain("logs daemonset/spire-agent");
    expect(run).toContain("--previous");
    expect(run).not.toMatch(/logs\s+-l\s+app=spire-agent/);
    expect(run).toContain("k8s-app=kube-dns");
    expect(run).toContain("cilium-dbg service list");
    expect(run).toContain("get pvc,cm");
    expect(run).toContain("get cm spire-bundle");
    expect(run.includes("cilium-dbg service list 2>/dev/null")).toBe(false);
    expect(run).toContain("k8s-app=cilium");
    expect(run).toContain("hostNetwork TCP ClusterIP probe");
    expect(run).toContain("TCP kube-dns");
    expect(run).toContain("TCP spire-server");
    expect(run).toContain("busybox nc");
    expect(run).toContain("hostNetwork: true");
    expect(run).not.toMatch(/docker exec.*\|\s*(grep|rg)\s+-[^\n]*q/);
  });
});
