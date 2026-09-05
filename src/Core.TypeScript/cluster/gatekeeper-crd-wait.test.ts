#!/usr/bin/env bun
/**
 * The hat-system wait Job used to discover constraint CRDs at runtime:
 * `kubectl get crd -o jsonpath` on `spec.names.kind`, driven by `/bin/bash`.
 * `registry.k8s.io/kubectl` has no shell, so the wait is now a hardcoded
 * `kubectl wait` list. Hardcoding the WRONG names is the new failure mode:
 * Gatekeeper names the CRD `{ConstraintTemplate.metadata.name}.constraints.gatekeeper.sh`,
 * not the Kubernetes plural of the kind. HatMaxNew -> hatmaxnews is the
 * guess that would wait forever.
 *
 * This file derives the lists from policies/*.yaml and refuses the Job
 * drifting from them. It does not invent plurals.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllDocuments } from "yaml";

const HAT = fileURLToPath(new URL("../../../full-ai-cluster/k8s/applications/hat-system", import.meta.url));
const WAIT_FILE = join(HAT, "gatekeeper-crd-wait.yaml");
const POLICIES = join(HAT, "policies");
const KUBECTL_IMAGE = "registry.k8s.io/kubectl:v1.32.3";
const CRD_GROUP = "constraints.gatekeeper.sh";

interface ConstraintTemplate {
  readonly name: string;
  readonly kind: string;
}

interface Container {
  readonly name: string;
  readonly image: string;
  readonly command: readonly string[];
  readonly args: readonly string[];
}

function yamlDocs(path: string): unknown[] {
  return parseAllDocuments(readFileSync(path, "utf8")).map((d) => d.toJS() as unknown);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function constraintTemplates(): ConstraintTemplate[] {
  const out: ConstraintTemplate[] = [];
  for (const entry of readdirSync(POLICIES, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
    for (const raw of yamlDocs(join(POLICIES, entry.name))) {
      if (!isRecord(raw) || raw.kind !== "ConstraintTemplate") continue;
      const metadata = isRecord(raw.metadata) ? raw.metadata : {};
      const spec = isRecord(raw.spec) ? raw.spec : {};
      const crd = isRecord(spec.crd) ? spec.crd : {};
      const crdSpec = isRecord(crd.spec) ? crd.spec : {};
      const names = isRecord(crdSpec.names) ? crdSpec.names : {};
      const name = asString(metadata.name);
      const kind = asString(names.kind);
      if (name === undefined || kind === undefined) {
        throw new Error(`${entry.name}: ConstraintTemplate missing metadata.name or spec.crd.spec.names.kind`);
      }
      out.push({ name, kind });
    }
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function jobPodSpec(): {
  readonly initContainers: Container[];
  readonly containers: Container[];
} {
  for (const raw of yamlDocs(WAIT_FILE)) {
    if (!isRecord(raw) || raw.kind !== "Job") continue;
    const spec = isRecord(raw.spec) ? raw.spec : {};
    const template = isRecord(spec.template) ? spec.template : {};
    const pod = isRecord(template.spec) ? template.spec : {};
    const toContainers = (value: unknown): Container[] => {
      if (!Array.isArray(value)) return [];
      const out: Container[] = [];
      for (const item of value) {
        if (!isRecord(item)) continue;
        out.push({
          name: asString(item.name) ?? "",
          image: asString(item.image) ?? "",
          command: Array.isArray(item.command) ? item.command.map(String) : [],
          args: Array.isArray(item.args) ? item.args.map(String) : [],
        });
      }
      return out;
    };
    return {
      initContainers: toContainers(pod.initContainers),
      containers: toContainers(pod.containers),
    };
  }
  throw new Error(`${WAIT_FILE}: no Job document`);
}

function argvOf(c: Container): string[] {
  return [...c.command, ...c.args];
}

function resourceArgs(c: Container, prefix: string): string[] {
  return argvOf(c)
    .filter((a) => a.startsWith(prefix))
    .map((a) => a.slice(prefix.length))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

describe("gatekeeper-crd-wait is a shell-free kubectl wait derived from ConstraintTemplates", () => {
  const templates = constraintTemplates();
  const pod = jobPodSpec();
  const all = [...pod.initContainers, ...pod.containers];
  const waitTemplates = pod.initContainers.find((c) => c.name === "wait-templates");
  const waitCrdCreate = pod.initContainers.find((c) => c.name === "wait-crd-create");
  const waitEstablished = pod.containers.find((c) => c.name === "wait");

  test("there are ConstraintTemplates to lock against -- otherwise this suite proves nothing", () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  test("every ConstraintTemplate name is the lowercase of its kind -- Gatekeeper's own invariant, not a plural", () => {
    for (const t of templates) {
      expect(t.name).toBe(t.kind.toLowerCase());
    }
  });

  test("HatMaxNew / HatNoCycle are present so the pluralisation footgun cannot silently leave the suite", () => {
    expect(templates.map((t) => t.kind).sort()).toEqual(expect.arrayContaining(["HatMaxNew", "HatNoCycle"]));
  });

  test("the Job has the three sequential kubectl wait containers", () => {
    expect(waitTemplates).toBeDefined();
    expect(waitCrdCreate).toBeDefined();
    expect(waitEstablished).toBeDefined();
  });

  test(`every wait container pins ${KUBECTL_IMAGE}`, () => {
    expect(all.length).toBeGreaterThan(0);
    for (const c of all) {
      expect(c.image).toBe(KUBECTL_IMAGE);
    }
  });

  test("every wait container is argv `/bin/kubectl wait ...`, not a shell", () => {
    expect(all.length).toBe(3);
    for (const c of all) {
      expect(c.command).toEqual(["/bin/kubectl"]);
      expect(c.args[0]).toBe("wait");
    }
  });

  test("wait-templates --for=create lists every ConstraintTemplate metadata.name", () => {
    expect(waitTemplates).toBeDefined();
    const argv = argvOf(waitTemplates as Container);
    expect(argv).toContain("--for=create");
    expect(resourceArgs(waitTemplates as Container, "constrainttemplate/")).toEqual(templates.map((t) => t.name));
  });

  test("CRD waits use {templateName}.constraints.gatekeeper.sh -- not a guessed plural", () => {
    const expected = templates.map((t) => `${t.name}.${CRD_GROUP}`);
    expect(waitCrdCreate).toBeDefined();
    expect(waitEstablished).toBeDefined();
    expect(argvOf(waitCrdCreate as Container)).toContain("--for=create");
    expect(argvOf(waitEstablished as Container)).toContain("--for=condition=Established");
    expect(resourceArgs(waitCrdCreate as Container, "crd/")).toEqual(expected);
    expect(resourceArgs(waitEstablished as Container, "crd/")).toEqual(expected);
    expect(expected).toEqual(
      expect.arrayContaining(["hatmaxnew.constraints.gatekeeper.sh", "hatnocycle.constraints.gatekeeper.sh"]),
    );
  });
});
