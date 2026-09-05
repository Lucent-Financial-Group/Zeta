// Falsifiers for the upstream-CI reader. The one that matters is the GitHub
// Pages form: reading only `github.com/...` matched ZERO of 38 charts, and the
// zero is what exposed the bug.

import { describe, expect, test } from "bun:test";
import { githubSlug, readChartCoordinates } from "./upstream-chart-ci.ts";

describe("githubSlug", () => {
  test("a direct github.com URL resolves", () => {
    expect(githubSlug("https://github.com/owner/repo")).toBe("owner/repo");
    expect(githubSlug("https://github.com/owner/repo.git")).toBe("owner/repo");
  });

  /**
   * THE FALSIFIER FOR THE BUG THIS MODULE SHIPPED WITH. A chart's `repoURL` is a
   * HELM repo, not a source repo, and almost every one here is GitHub Pages.
   * Dropping this case makes the whole module report nothing while exiting 0.
   */
  test("a GitHub Pages helm repo resolves to its source repo", () => {
    expect(githubSlug("https://opensearch-project.github.io/helm-charts/")).toBe(
      "opensearch-project/helm-charts",
    );
    expect(githubSlug("https://kedacore.github.io/charts")).toBe("kedacore/charts");
    expect(githubSlug("https://grafana-community.github.io/helm-charts")).toBe(
      "grafana-community/helm-charts",
    );
  });

  test("a non-GitHub helm repo is UNKNOWN, never guessed", () => {
    // Guessing an org from a chart name is how you read somebody else's CI and
    // trust it. These must return null rather than a plausible slug.
    expect(githubSlug("https://helm.releases.hashicorp.com")).toBeNull();
    expect(githubSlug("https://charts.longhorn.io")).toBeNull();
    expect(githubSlug("https://go.temporal.io/helm-charts")).toBeNull();
  });
});

describe("readChartCoordinates — the live tree", () => {
  test("it finds the charts, and opensearch resolves to the repo whose CI diagnosed it", () => {
    const coords = readChartCoordinates();
    expect(coords.length).toBeGreaterThan(30);
    const os = coords.find((c) => c.dir === "opensearch");
    expect(os).toBeDefined();
    expect(githubSlug(os?.repoURL ?? "")).toBe("opensearch-project/helm-charts");
  });

  test("every coordinate carries a chart name, and repoURL may be HTTP **or OCI**", () => {
    // The first version of this asserted `startsWith("http")` and went red on
    // four charts: arc-controller, arc-runner-set and hindsight are
    // `ghcr.io/...` and forgejo is `code.forgejo.org/...`. Those are OCI
    // registry refs, which carry no scheme and are perfectly valid ArgoCD
    // sources. The ASSERTION was wrong, not the tree -- recorded because
    // tightening the data to fit a test is the tempting direction.
    let oci = 0;
    for (const c of readChartCoordinates()) {
      expect(c.chart.length).toBeGreaterThan(0);
      expect(c.repoURL.length).toBeGreaterThan(0);
      if (!c.repoURL.startsWith("http")) oci += 1;
    }
    expect(oci).toBeGreaterThan(0);
  });
});
