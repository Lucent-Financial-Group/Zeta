#!/usr/bin/env bun

/**
 * src/Core.TypeScript/cluster/gatekeeper-ignore-label.ts
 *
 * Does every namespace that claims a Gatekeeper exemption actually have one?
 *
 * -- THE DEFECT THIS WAS WRITTEN FOR ---------------------------------------
 * Gatekeeper ships its own validating webhook, `check-ignore-label.gatekeeper.sh`,
 * which refuses the label `admission.gatekeeper.sh/ignore` on any namespace that
 * is NOT in the controller's `--exempt-namespace` set. It is not one of our
 * ConstraintTemplates and it cannot be turned off by a Constraint; it guards the
 * exemption mechanism itself, so that a workload cannot exempt itself from policy
 * merely by writing a label on its own namespace.
 *
 * Three namespace manifests in this tree carried that label. One of them was in
 * the exempt list. MEASURED on run 33790413535 (main, 2026-09-03), both of the
 * others were rejected on every sync attempt:
 *
 *     application/agent-memory  Sync operation ... failed: the namespace failed to
 *       apply, reason: admission webhook "check-ignore-label.gatekeeper.sh" denied
 *       the request: Only exempt namespace can have the
 *       admission.gatekeeper.sh/ignore label (retried 5 times).
 *     application/gmod          ... identical ...
 *
 * The namespace never applies, so the Application never syncs, so it reads
 * `OutOfSync` / `Missing` forever. Two Applications were permanently unsyncable,
 * and `agent-memory is OutOfSync/Missing` is one of the two findings that failed
 * the included Synced+Healthy proof.
 *
 * -- WHY IT WENT UNNOTICED ---------------------------------------------------
 * The correspondence was asserted in a COMMENT and never checked. The comment on
 * `agent-memory/namespace.yaml` read "(matches open-policy-agent exemptions)",
 * which was false when it was written. Nothing in the repo compared the two
 * files, so the claim could be wrong for as long as nobody deployed it — and the
 * failure, when it came, arrived as an ArgoCD sync error a long way from the
 * label that caused it.
 *
 * That is the shape this module removes: a cross-file invariant stated in prose
 * on one side and never read from the other.
 *
 * -- WHAT IT REFUSES ---------------------------------------------------------
 *   1. a namespace carrying the ignore label that is not in `exemptNamespaces`
 *      -> the manifest cannot apply; this is the live defect
 *   2. no namespace manifests discovered at all
 *      -> the walk is broken. Zero findings over zero inputs is not a pass, it is
 *         a check that did not run
 *   3. the exempt list cannot be read from the Gatekeeper Application
 *      -> refused rather than defaulted. Defaulting to `[]` would report every
 *         labelled namespace as broken (a false alarm), and defaulting to "assume
 *         exempt" would report none (a silence). Neither is a measurement, so the
 *         only honest outcome is to say the comparison could not be made
 *
 * NOTE ON DIRECTION 1's CONVERSE. A namespace in `exemptNamespaces` that carries
 * no label is NOT refused, and that is deliberate rather than an omission: the
 * exempt list also names namespaces this tree does not create (`kube-system`,
 * `gatekeeper-system`, ...), and it is the list, not the label, that makes a
 * namespace exempt. The label is an optimisation Gatekeeper reads at admission
 * time; the list is the authority. Refusing an unlabelled exempt namespace would
 * fail on every infra entry and would be a check about nothing.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { parseAllDocuments } from "yaml";

/** The label Gatekeeper's own webhook guards. */
export const IGNORE_LABEL = "admission.gatekeeper.sh/ignore";

/** Where the Applications live, relative to the repository root. */
const APPLICATIONS_DIR = "full-ai-cluster/k8s/applications";

/** The Application whose `valuesObject` carries the exempt set. */
const GATEKEEPER_APPLICATION = join(APPLICATIONS_DIR, "open-policy-agent", "Application.yaml");

/** One namespace manifest that asks to be exempt. */
export interface LabelledNamespace {
  readonly name: string;
  readonly path: string;
  /** The label's literal value, so a finding can quote what was written. */
  readonly value: string;
}

export interface IgnoreLabelFinding {
  readonly namespace: string;
  readonly path: string;
  readonly problem: string;
}

/**
 * Collect every `kind: Namespace` document under a directory tree, with the
 * subset that carries the ignore label.
 *
 * Multi-document files are parsed with `parseAllDocuments`, not `parse`: a
 * namespace declared as the second document of a combined manifest is exactly as
 * real as one in its own file, and a parser that throws on `---` would skip it
 * silently.
 */
export function collectNamespaces(root: string): {
  readonly total: number;
  readonly labelled: readonly LabelledNamespace[];
} {
  const labelled: LabelledNamespace[] = [];
  let total = 0;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue;

      let documents: ReturnType<typeof parseAllDocuments>;
      try {
        documents = parseAllDocuments(readFileSync(path, "utf8"));
      } catch {
        // An unparseable YAML file is not this module's finding to report — other
        // checkers own manifest validity — but it must not be read as "contains no
        // namespace" either. Skipping it here is safe only because a file this
        // module cannot read is also a file ArgoCD cannot apply, so it fails
        // loudly somewhere a human will see.
        continue;
      }

      for (const document of documents) {
        const value: unknown = document.toJS?.({ maxAliasCount: -1 }) ?? null;
        if (value === null || typeof value !== "object") continue;
        const manifest = value as { kind?: unknown; metadata?: { name?: unknown; labels?: unknown } };
        if (manifest.kind !== "Namespace") continue;
        total += 1;

        const name = typeof manifest.metadata?.name === "string" ? manifest.metadata.name : "";
        const labels = manifest.metadata?.labels;
        if (labels === null || typeof labels !== "object") continue;
        const label = (labels as Record<string, unknown>)[IGNORE_LABEL];
        if (label === undefined) continue;
        labelled.push({ name, path, value: String(label) });
      }
    }
  };

  walk(root);
  return { total, labelled };
}

/**
 * Read `controllerManager.exemptNamespaces` out of the Gatekeeper Application.
 *
 * Returns `undefined` — never `[]` — when the coordinate is absent. The
 * difference matters: `[]` is a measurement ("the list is empty"), `undefined` is
 * the absence of one, and collapsing the second into the first would turn a
 * broken read into a pile of confident false findings.
 */
export function readExemptNamespaces(applicationYaml: string): readonly string[] | undefined {
  let parsed: unknown;
  try {
    parsed = parseAllDocuments(applicationYaml)[0]?.toJS?.({ maxAliasCount: -1 }) ?? undefined;
  } catch {
    return undefined;
  }
  if (parsed === null || typeof parsed !== "object") return undefined;
  const spec = (parsed as { spec?: unknown }).spec;
  if (spec === null || typeof spec !== "object") return undefined;
  const source = (spec as { source?: unknown }).source;
  if (source === null || typeof source !== "object") return undefined;
  const helm = (source as { helm?: unknown }).helm;
  if (helm === null || typeof helm !== "object") return undefined;
  const values = (helm as { valuesObject?: unknown }).valuesObject;
  if (values === null || typeof values !== "object") return undefined;
  const controllerManager = (values as { controllerManager?: unknown }).controllerManager;
  if (controllerManager === null || typeof controllerManager !== "object") return undefined;
  const exempt = (controllerManager as { exemptNamespaces?: unknown }).exemptNamespaces;
  if (!Array.isArray(exempt)) return undefined;
  return exempt.filter((entry): entry is string => typeof entry === "string");
}

/**
 * The comparison. Pure over its two inputs so every refusal above is reachable
 * from a test without a filesystem.
 */
export function auditIgnoreLabels(
  labelled: readonly LabelledNamespace[],
  exemptNamespaces: readonly string[] | undefined,
  namespacesSeen: number,
): readonly IgnoreLabelFinding[] {
  if (namespacesSeen === 0) {
    return [
      {
        namespace: "(none)",
        path: APPLICATIONS_DIR,
        problem:
          "no Namespace manifests were found at all — the walk is broken, and zero findings over zero inputs is a check that did not run, not a pass",
      },
    ];
  }
  if (exemptNamespaces === undefined) {
    return [
      {
        namespace: "(unknown)",
        path: GATEKEEPER_APPLICATION,
        problem:
          "could not read spec.source.helm.valuesObject.controllerManager.exemptNamespaces — the comparison could not be made, which is reported rather than defaulted in either direction",
      },
    ];
  }

  const exempt = new Set(exemptNamespaces);
  return labelled
    .filter((namespace) => !exempt.has(namespace.name))
    .map((namespace) => ({
      namespace: namespace.name,
      path: namespace.path,
      problem:
        `carries ${IGNORE_LABEL}="${namespace.value}" but is not in ${GATEKEEPER_APPLICATION} ` +
        `controllerManager.exemptNamespaces. Gatekeeper's own check-ignore-label webhook REFUSES this ` +
        `namespace, so the manifest never applies and its Application stays OutOfSync/Missing forever. ` +
        `Either add "${namespace.name}" to exemptNamespaces (a policy decision — it exempts the namespace ` +
        `from every Constraint) or drop the label (free when no Constraint targets that namespace's kinds).`,
    }));
}

function main(): number {
  const { total, labelled } = collectNamespaces(APPLICATIONS_DIR);

  let exempt: readonly string[] | undefined;
  try {
    exempt = readExemptNamespaces(readFileSync(GATEKEEPER_APPLICATION, "utf8"));
  } catch {
    exempt = undefined;
  }

  const findings = auditIgnoreLabels(labelled, exempt, total);

  console.log(
    `[gatekeeper-ignore-label] ${String(total)} Namespace manifest(s); ` +
      `${String(labelled.length)} carry ${IGNORE_LABEL}; ` +
      `exemptNamespaces: ${exempt === undefined ? "UNREADABLE" : String(exempt.length)}`,
  );
  for (const namespace of labelled) {
    const ok = exempt !== undefined && exempt.includes(namespace.name);
    console.log(`[gatekeeper-ignore-label]   ${ok ? "EXEMPT" : "NOT EXEMPT"}  ${namespace.name}  (${namespace.path})`);
  }
  for (const finding of findings) {
    console.log(`::error::[gatekeeper-ignore-label] ${finding.namespace}: ${finding.problem}`);
  }
  console.log(
    findings.length === 0
      ? "[gatekeeper-ignore-label] every labelled namespace is exempt."
      : `[gatekeeper-ignore-label] ${String(findings.length)} namespace(s) claim an exemption they do not have.`,
  );
  return findings.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  process.exit(main());
}
