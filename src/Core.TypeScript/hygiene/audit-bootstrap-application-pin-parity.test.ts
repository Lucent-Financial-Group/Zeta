// audit-bootstrap-application-pin-parity.test.ts — falsifiers for the first-boot pin check.
//
// The audit covers a path NO CI CLUSTER TAKES: `*/k8s/bootstrap/` is applied by K3S on
// NixOS first boot, and the kind/k3d lanes bring ArgoCD up from `dev-cluster/use-cases.ts`
// instead. So there is no live run to catch a mistake in it, and these cases carry the
// whole weight. They are weighted accordingly toward the ways such a check goes quietly
// useless: parsing less than it thinks, and letting an acknowledgement outlive its defect.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  adjudicate,
  APPLICATIONS_DIR,
  BASELINE_FILE,
  BOOTSTRAP_DIRS,
  type BaselineEntry,
  type ChartPin,
  divergenceKey,
  findDivergences,
  parseApplicationPin,
  parseBootstrapPins,
} from "./audit-bootstrap-application-pin-parity.ts";

const helmChart = (chart: string, version: string): string => `apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: ${chart}
  namespace: kube-system
spec:
  chart: ${chart}
  repo: https://example.invalid/charts
  version: ${version}
`;

const application = (chart: string, version: string): string => `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${chart}
spec:
  source:
    repoURL: https://example.invalid/charts
    chart: ${chart}
    targetRevision: ${version}
`;

const pin = (chart: string, version: string, file: string): ChartPin => ({ chart, version, file });

describe("bootstrap-application-pin-parity", () => {
  test("control: agreeing pins produce NO divergence", () => {
    const found = findDivergences(
      [pin("cilium", "1.20.1", "b/cilium.yaml")],
      [pin("cilium", "1.20.1", "a/cilium/Application.yaml")],
    );
    expect(found).toEqual([]);
  });

  test("RED when the two pins disagree, naming both files", () => {
    const found = findDivergences(
      [pin("cert-manager", "v1.16.2", "b/cert-manager.yaml")],
      [pin("cert-manager", "v1.21.1", "a/cert-manager/Application.yaml")],
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.bootstrapFile).toBe("b/cert-manager.yaml");
    expect(found[0]?.applicationFile).toBe("a/cert-manager/Application.yaml");
  });

  test("a chart installed ONLY at boot is not a divergence", () => {
    // Nothing adopts it, so there is no second reconciler to disagree with. Reporting it
    // would train people to acknowledge non-problems, which is how a roster stops being read.
    expect(findDivergences([pin("k3s-only", "1.0.0", "b/x.yaml")], [])).toEqual([]);
  });

  test("MULTI-DOCUMENT bootstrap files yield every HelmChart, not just the first", () => {
    // `spire-install.yaml` really does carry two (spire-crds and spire). A parser that took
    // only the first document would silently stop checking one of them -- and it would still
    // print a confident count.
    const twoCharts = `${helmChart("spire-crds", "0.5.0")}---\n${helmChart("spire", "0.24.2")}`;
    const pins = parseBootstrapPins(twoCharts, "b/spire-install.yaml");
    expect(pins.map((p) => `${p.chart}@${p.version}`)).toEqual(["spire-crds@0.5.0", "spire@0.24.2"]);
  });

  test("non-HelmChart documents are ignored, and a HelmChart without a version is skipped", () => {
    const mixed = `apiVersion: v1
kind: Namespace
metadata:
  name: argocd
---
apiVersion: helm.cattle.io/v1
kind: HelmChart
spec:
  chart: no-version-here
---
${helmChart("argo-cd", "10.8.0")}`;
    expect(parseBootstrapPins(mixed, "b/x.yaml").map((p) => p.chart)).toEqual(["argo-cd"]);
  });

  test("an Application with no Helm source yields no pin", () => {
    const directorySource = `apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  source:
    repoURL: https://github.com/example/repo
    path: k8s/applications/orleans
`;
    expect(parseApplicationPin(directorySource, "a/orleans/Application.yaml")).toBeNull();
    expect(parseApplicationPin(application("cilium", "1.20.1"), "a/cilium/Application.yaml")?.version).toBe("1.20.1");
  });

  test("an acknowledged divergence passes, and an UNACKNOWLEDGED one is open", () => {
    const found = findDivergences(
      [pin("cert-manager", "v1.16.2", "b/cm.yaml"), pin("trust-manager", "v0.15.0", "b/tm.yaml")],
      [pin("cert-manager", "v1.21.1", "a/cm/Application.yaml"), pin("trust-manager", "v0.24.0", "a/tm/Application.yaml")],
    );
    const baseline: BaselineEntry[] = [
      { key: "cert-manager|bootstrap=v1.16.2|application=v1.21.1", reason: "r", liftsWhen: "l" },
    ];
    const { open, stale } = adjudicate(found, baseline);
    expect(open.map((d) => d.chart)).toEqual(["trust-manager"]);
    expect(stale).toEqual([]);
  });

  test("THE KEY CARRIES BOTH VERSIONS, so paying the debt makes the entry stale", () => {
    // This is the property that stops the roster becoming a permanent excuse. Bump the
    // bootstrap to match and the OLD acknowledgement no longer describes anything -- the
    // audit must say so rather than silently keep passing.
    const baseline: BaselineEntry[] = [
      { key: "cert-manager|bootstrap=v1.16.2|application=v1.21.1", reason: "r", liftsWhen: "l" },
    ];
    const nowAgreeing = findDivergences(
      [pin("cert-manager", "v1.21.1", "b/cm.yaml")],
      [pin("cert-manager", "v1.21.1", "a/cm/Application.yaml")],
    );
    const { open, stale } = adjudicate(nowAgreeing, baseline);
    expect(open).toEqual([]);
    expect(stale).toEqual(["cert-manager|bootstrap=v1.16.2|application=v1.21.1"]);
  });

  test("a HALF-paid debt is open, not silently acknowledged", () => {
    // Moving the bootstrap to some THIRD version is not paying it. The old key goes stale
    // AND the new pair is unacknowledged, so both halves are reported.
    const baseline: BaselineEntry[] = [
      { key: "cert-manager|bootstrap=v1.16.2|application=v1.21.1", reason: "r", liftsWhen: "l" },
    ];
    const moved = findDivergences(
      [pin("cert-manager", "v1.18.0", "b/cm.yaml")],
      [pin("cert-manager", "v1.21.1", "a/cm/Application.yaml")],
    );
    const { open, stale } = adjudicate(moved, baseline);
    expect(open.map(divergenceKey)).toEqual(["cert-manager|bootstrap=v1.18.0|application=v1.21.1"]);
    expect(stale).toHaveLength(1);
  });

  test("THE REAL TREE: the scan reaches both sides, and every divergence is acknowledged", () => {
    // Guards the PATHS. Every case above is fixture-driven, so a renamed directory would
    // leave them all green over an audit that reads nothing -- and the audit's own
    // empty-scan refusal is the only other thing standing between that and a false green.
    const root = process.cwd();
    const bootstrapPins: ChartPin[] = [];
    for (const dir of BOOTSTRAP_DIRS) {
      const full = join(root, dir);
      for (const name of readdirSync(full).filter((n) => n.endsWith(".yaml") || n.endsWith(".yml"))) {
        bootstrapPins.push(...parseBootstrapPins(readFileSync(join(full, name), "utf8"), `${dir}/${name}`));
      }
    }
    const applicationPins: ChartPin[] = [];
    const appsRoot = join(root, APPLICATIONS_DIR);
    const walk = (current: string): void => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const path = join(current, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name === "Application.yaml") {
          const p = parseApplicationPin(readFileSync(path, "utf8"), path.slice(root.length + 1));
          if (p !== null) applicationPins.push(p);
        }
      }
    };
    walk(appsRoot);

    expect(bootstrapPins.length).toBeGreaterThan(0);
    expect(applicationPins.length).toBeGreaterThan(0);
    // spire-install.yaml's second document is the one a first-doc-only parser would lose.
    expect(bootstrapPins.some((p) => p.chart === "spire-crds")).toBe(true);
    expect(bootstrapPins.some((p) => p.chart === "spire")).toBe(true);

    const baseline = (
      JSON.parse(readFileSync(join(root, BASELINE_FILE), "utf8")) as { entries: BaselineEntry[] }
    ).entries;
    const { open, stale } = adjudicate(findDivergences(bootstrapPins, applicationPins), baseline);
    expect(open).toEqual([]);
    expect(stale).toEqual([]);
    // Every acknowledgement states BOTH why it is carried and what retires it. An entry
    // with an empty liftsWhen is an excuse with no exit.
    for (const entry of baseline) {
      expect(entry.reason.length).toBeGreaterThan(80);
      expect(entry.liftsWhen).toContain("LIFTS WHEN:");
    }
  });
});
