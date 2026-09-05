import { describe, expect, test } from "bun:test";

import {
  IGNORE_LABEL,
  type LabelledNamespace,
  auditIgnoreLabels,
  collectNamespaces,
  readExemptNamespaces,
} from "./gatekeeper-ignore-label";

function labelled(name: string): LabelledNamespace {
  return { name, path: `full-ai-cluster/k8s/applications/${name}/namespace.yaml`, value: "true" };
}

describe("auditIgnoreLabels", () => {
  test("THE LIVE DEFECT: a labelled namespace outside the exempt set is refused", () => {
    // Reproduces run 33790413535 offline. `agent-memory` and `game-hosting` both
    // carried the label and neither was in `exemptNamespaces`, so Gatekeeper's own
    // check-ignore-label webhook denied the Namespace on every sync attempt and
    // both Applications sat OutOfSync/Missing.
    const findings = auditIgnoreLabels([labelled("agent-memory")], ["zeta-platform"], 9);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.namespace).toBe("agent-memory");
    expect(findings[0]?.problem).toContain("check-ignore-label");
  });

  test("a labelled namespace that IS in the exempt set passes", () => {
    expect(auditIgnoreLabels([labelled("zeta-platform")], ["kube-system", "zeta-platform"], 9)).toHaveLength(0);
  });

  test("an exempt namespace with NO label is not a finding — the list is the authority", () => {
    // Deliberate asymmetry. The exempt list names namespaces this tree never
    // creates (`kube-system`, `gatekeeper-system`, ...), and it is the list, not
    // the label, that makes a namespace exempt. Refusing an unlabelled exempt
    // namespace would fail on every infra entry and would be a check about nothing.
    expect(auditIgnoreLabels([], ["kube-system", "gatekeeper-system", "zeta-platform"], 9)).toHaveLength(0);
  });

  test("ZERO NAMESPACES SEEN is an alarm, not a pass", () => {
    // A broken walk, a moved directory or a changed extension all produce an empty
    // input, and "no labelled namespaces were found" reads exactly like "everything
    // is fine". Zero findings over zero inputs is a check that did not run.
    const findings = auditIgnoreLabels([], ["zeta-platform"], 0);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.problem).toContain("check that did not run");
  });

  test("AN UNREADABLE EXEMPT LIST is reported, not defaulted in either direction", () => {
    // Defaulting to `[]` would report every labelled namespace as broken — a pile
    // of confident false findings. Defaulting to "assume exempt" would report none
    // — silence. Neither is a measurement, so the honest outcome is one finding
    // that says the comparison could not be made.
    const findings = auditIgnoreLabels([labelled("agent-memory"), labelled("game-hosting")], undefined, 9);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.problem).toContain("could not be made");
  });

  test("an EMPTY exempt list is a measurement and is not the same as an unreadable one", () => {
    // `[]` says "the list is empty" and every labelled namespace really is broken;
    // `undefined` says "there is no list to compare against". Collapsing the second
    // into the first is the defect the previous test guards; this one guards the
    // reverse, so neither can be silently substituted for the other.
    const findings = auditIgnoreLabels([labelled("agent-memory"), labelled("game-hosting")], [], 9);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.namespace).sort()).toEqual(["agent-memory", "game-hosting"]);
  });
});

describe("readExemptNamespaces", () => {
  const wrap = (controllerManager: string): string => `apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  source:
    helm:
      valuesObject:
${controllerManager}
`;

  test("reads the list off the Gatekeeper Application's valuesObject", () => {
    expect(
      readExemptNamespaces(
        wrap(
          "        controllerManager:\n          exemptNamespaces:\n            - kube-system\n            - argocd",
        ),
      ),
    ).toEqual(["kube-system", "argocd"]);
  });

  test("an EMPTY declared list reads as [], never as undefined", () => {
    expect(readExemptNamespaces(wrap("        controllerManager:\n          exemptNamespaces: []"))).toEqual([]);
  });

  test("every missing coordinate returns undefined rather than an empty list", () => {
    // One case per level, because a partial path is exactly how this silently
    // becomes "the list is empty" after someone restructures the values file.
    expect(readExemptNamespaces(wrap("        controllerManager:\n          replicas: 1"))).toBeUndefined();
    expect(readExemptNamespaces(wrap("        replicas: 1"))).toBeUndefined();
    expect(readExemptNamespaces("apiVersion: v1\nkind: Namespace\n")).toBeUndefined();
    expect(readExemptNamespaces("")).toBeUndefined();
    expect(readExemptNamespaces("::: not yaml :::\n  - [")).toBeUndefined();
  });

  test("a non-list exemptNamespaces is undefined, not a one-element list", () => {
    expect(
      readExemptNamespaces(wrap('        controllerManager:\n          exemptNamespaces: "kube-system"')),
    ).toBeUndefined();
  });
});

describe("collectNamespaces, against the live tree", () => {
  const tree = collectNamespaces("full-ai-cluster/k8s/applications");

  test("the walk finds Namespace manifests — the input to every check above", () => {
    // Pinned as a floor rather than an exact count so adding an Application does
    // not fail this, while a walk that stops finding anything does.
    expect(tree.total).toBeGreaterThan(0);
  });

  test("THE FIX, asserted against the tree: no namespace claims an exemption it does not have", () => {
    const exempt = readExemptNamespaces(
      require("node:fs").readFileSync(
        "full-ai-cluster/k8s/applications/open-policy-agent/Application.yaml",
        "utf8",
      ) as string,
    );
    expect(auditIgnoreLabels(tree.labelled, exempt, tree.total)).toEqual([]);
  });

  test("the check still has a SUBJECT — at least one namespace carries the label", () => {
    // Without this, deleting the last label would make the assertion above pass
    // over an empty set forever, and the check would quietly stop constraining
    // anything. `zeta-platform` is the one legitimate holder today.
    expect(tree.labelled.length).toBeGreaterThan(0);
    expect(tree.labelled.every((n) => n.value === "true")).toBe(true);
    expect(IGNORE_LABEL).toBe("admission.gatekeeper.sh/ignore");
  });
});
