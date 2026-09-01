/**
 * applied-vs-asserted-agreement.test.ts — the two layers must agree.
 *
 * WHY THIS FILE EXISTS, and it is a defect I shipped.
 *
 * There are two independent decisions about an Application, in different files,
 * and NOTHING compared them:
 *
 *   DEFAULT_ROOT_DEV_CATALOG.excludeGlob   what ArgoCD APPLIES
 *   isExcludedFromIncludedProof            what the harness ASSERTS
 *
 * I made the second provider-aware so `cilium` would lift on k3d, and left the
 * first hardcoding `cilium/**`. The harness then waited 48 minutes for an
 * Application ArgoCD was never told to sync, and blamed the Application.
 *
 * This repo already documents the OTHER direction — the "shadow" set, applied
 * but asserted by nothing, which reports green while proving nothing. Mine is
 * the inverse: ASSERTED BUT UNAPPLIED, which cannot report green at all; it
 * hangs for the full timeout and names the wrong culprit.
 *
 * The invariant is one line: nothing the harness asserts may be excluded from
 * what ArgoCD applies. Per provider, because both sides are now provider-aware.
 */

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { discoverExpectedApplications } from "./argocd-health-test.ts";
import { excludeGlobDirs, rootDevCatalogExcludeGlobFor } from "./ports.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const PROVIDERS = ["kind", "k3d", null] as const;

/**
 * Dirs ArgoCD is told NOT to apply, FOR THIS PROVIDER. Prefix-matched:
 * `cilium/**` also drops `cilium/nested`.
 *
 * Per-provider is the whole point. Comparing the asserted set against the
 * STATIC glob would keep measuring the wrong thing the moment either side
 * learned about providers — which is exactly how the defect got in.
 */
function appliedExcluded(provider: (typeof PROVIDERS)[number]): readonly string[] {
  return excludeGlobDirs(rootDevCatalogExcludeGlobFor(provider));
}

function asserted(provider: (typeof PROVIDERS)[number]): readonly string[] {
  return discoverExpectedApplications(REPO_ROOT, provider)
    .filter((a) => !a.excludedFromDev)
    .map((a) => a.dir);
}

describe("nothing the harness ASSERTS may be excluded from what ArgoCD APPLIES", () => {
  for (const provider of PROVIDERS) {
    test(`provider=${String(provider)}: no asserted Application is in the catalog's exclude glob`, () => {
      const excluded = appliedExcluded(provider);
      const orphans = asserted(provider).filter((dir) =>
        excluded.some((e) => dir === e || dir.startsWith(`${e}/`)),
      );
      // Each orphan would make the lane wait its FULL timeout for an
      // Application that was never synced — the failure mode is a timeout that
      // names the Application rather than the disagreement.
      expect(orphans).toEqual([]);
    });
  }

  test("the check is not vacuous — the asserted set is non-empty on every provider", () => {
    // Without this, an empty asserted set would satisfy every case above.
    for (const provider of PROVIDERS) {
      expect(asserted(provider).length).toBeGreaterThan(10);
    }
  });

  test("and the exclude glob is non-empty — otherwise there is nothing to disagree with", () => {
    for (const provider of PROVIDERS) expect(appliedExcluded(provider).length).toBeGreaterThan(0);
  });
});
