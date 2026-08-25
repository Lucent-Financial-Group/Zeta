/**
 * CROSS-MANIFEST CONSISTENCY FOR THE RAW-YAML APPLY SET AT agentic-organization/deploy/k8s.
 *
 * WHY THIS EXISTS, AND WHAT IT IS *NOT* DUPLICATING.
 *
 * These twelve files are not a Helm chart and not an ArgoCD Application set --
 * they are raw Kubernetes YAML that an operator applies with a single
 * `kubectl apply -f deploy/k8s/`. That is the tree a USB-booted node actually
 * runs, so a defect here is a machine that comes up broken in front of someone
 * holding a stick.
 *
 * Two checks already cover this directory, and both are real:
 *   - `yamllint -d relaxed` (gate.yml lint-yaml-k8s) -- syntax, indentation,
 *     duplicate keys. Catches a malformed file.
 *   - `kubeconform -strict -ignore-missing-schemas` (same job) -- the
 *     Kubernetes API schema. Catches a typo'd field or a wrong apiVersion.
 *
 * Neither can see ACROSS documents, and that is where this tree's real failures
 * live. Every finding below is schema-VALID YAML that a cluster accepts at apply
 * time and that fails later, at run time, with a symptom that does not name its
 * cause:
 *
 *   - a Service whose `targetPort: http` names a port no container declares --
 *     apply succeeds, the Service gets zero endpoints, and every client sees a
 *     connection refused that looks like the server crashed;
 *   - an env var pointing at `http://tempo:4318` when no Service `tempo` exposes
 *     4318 -- apply succeeds, telemetry silently goes nowhere;
 *   - a volume naming a ConfigMap that no document in the set creates -- the pod
 *     stays in ContainerCreating forever with the reason three `kubectl describe`
 *     levels down;
 *   - a template file that `kubectl apply -f <dir>` picks up ANYWAY because
 *     kubectl filters by EXTENSION, not by filename. `.example.yaml` still ends
 *     in `.yaml`.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not re-check schema (kubeconform
 * owns that), it does not lint YAML style (yamllint owns that), and it does not
 * assert a node memory budget -- no hardware spec for the USB target is written
 * down anywhere in this repo, so a numeric ceiling here would be a toy wearing a
 * gate's uniform. What it does instead is REPORT the summed requests and limits
 * and FAIL only on a container that declares no requests at all, because a
 * BestEffort container is the kubelet's first eviction victim and that is a
 * property of the manifest, not of the node.
 *
 * Composes with:
 *   .github/workflows/gate.yml  lint-yaml-k8s   (the job that runs it)
 *   src/Core.TypeScript/cluster/audit-agentic-org-manifests.test.ts (the falsifiers)
 *   src/Core.TypeScript/hygiene/audit-observability-chain.ts (the same CLASS of
 *     check -- endpoint-names-a-port-the-Service-does-not-expose -- for the OTHER
 *     cluster tree, full-ai-cluster/k8s/applications. This file is that discipline
 *     pointed at the tree it never covered.)
 */

import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { parseAllDocuments } from "yaml";

/** A single cross-manifest defect. `check` is the stable machine-readable class. */
export type Finding = {
  readonly check: string;
  readonly file: string;
  readonly message: string;
};

export type AuditResult = {
  readonly findings: readonly Finding[];
  /** Files kubectl would apply from this directory, in apply order. */
  readonly applySet: readonly string[];
  /** Summed pod resource requests/limits across the apply set, for the report. */
  readonly totals: ResourceTotals;
  readonly documentCount: number;
};

export type ResourceTotals = {
  readonly requestCpuMilli: number;
  readonly requestMemoryMi: number;
  readonly limitCpuMilli: number;
  readonly limitMemoryMi: number;
};

type Doc = {
  readonly file: string;
  readonly index: number;
  readonly value: Record<string, unknown>;
};

type Workload = {
  readonly doc: Doc;
  readonly namespace: string;
  readonly podLabels: Readonly<Record<string, string>>;
  readonly containers: readonly Container[];
};

type Container = {
  readonly name: string;
  readonly image: string;
  readonly portNames: readonly string[];
  readonly portNumbers: readonly number[];
  readonly hasRequests: boolean;
  readonly hasLimits: boolean;
};

type ServiceDoc = {
  readonly doc: Doc;
  readonly name: string;
  readonly namespace: string;
  readonly selector: Readonly<Record<string, string>>;
  readonly ports: readonly ServicePort[];
};

type ServicePort = {
  readonly port: number;
  readonly targetPort: string | number | undefined;
};

export const DEFAULT_DIR = "agentic-organization/deploy/k8s";

/**
 * `kubectl apply -f <dir>` is NOT recursive and selects by EXTENSION ONLY.
 * Mirrors k8s.io/cli-runtime resource.FileVisitor: ".json", ".yaml", ".yml".
 * A file named `foo.example.yaml` matches. That is the whole point of check A.
 */
const KUBECTL_EXTENSIONS = [".json", ".yaml", ".yml"] as const;

/**
 * Filename fragments that declare a file to be a TEMPLATE for a human to copy,
 * fill in and apply -- never a document the apply set should contain.
 */
const TEMPLATE_MARKERS = [".example.", ".template.", ".sample.", ".tpl."] as const;

/** Hosts that are never in-cluster Service DNS names. */
const NON_SERVICE_HOSTS = new Set(["localhost"]);

/**
 * Bare single-label hosts only -- in-cluster Service DNS. A dotted host
 * (`api.linear.app`, `foo.svc.cluster.local`) is external or fully-qualified and
 * is deliberately out of scope: this check resolves same-namespace short names,
 * which is the form every manifest in this tree actually uses.
 */
const URL_RE =
  /\b[a-z][a-z0-9+.-]*:\/\/(?:[^/@\s"']*@)?([a-z0-9](?:[-a-z0-9]*[a-z0-9])?)(?::(\d{1,5}))?(?![a-z0-9.-])/gi;

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet"]);

export function auditDirectory(dir: string): AuditResult {
  const applySet = kubectlApplySet(dir);
  const findings: Finding[] = [];

  // ── CHECK A: apply-set hygiene ────────────────────────────────────────────
  // A template that still carries a kubectl-visible extension IS applied.
  for (const file of applySet) {
    const marker = TEMPLATE_MARKERS.find((m) => basename(file).includes(m));
    if (marker !== undefined) {
      findings.push({
        check: "apply-set-contains-template",
        file,
        message:
          `filename marks this a template ('${marker}') but it still ends in a kubectl-visible ` +
          `extension, so \`kubectl apply -f ${dir}/\` APPLIES IT. kubectl filters by extension ` +
          `(.json/.yaml/.yml), never by filename. Rename to '${basename(file).replace(/\.(ya?ml|json)$/i, "")}' ` +
          `+ '.example' as the FINAL extension (e.g. 'x.yaml.example') so kubectl skips it.`,
      });
    }
  }

  const docs = loadDocuments(dir, applySet, findings);
  const workloads = docs.filter((d) => WORKLOAD_KINDS.has(kindOf(d))).map(toWorkload);
  const services = docs.filter((d) => kindOf(d) === "Service").map(toService);
  const configMaps = new Map<string, Set<string>>();
  const secrets = new Set<string>();

  for (const d of docs) {
    const name = metaName(d);
    const ns = metaNamespace(d);
    if (kindOf(d) === "ConfigMap") {
      const data = asRecord(d.value.data);
      configMaps.set(`${ns}/${name}`, new Set(Object.keys(data)));
    }
    if (kindOf(d) === "Secret") secrets.add(`${ns}/${name}`);
  }

  // ── CHECK B: every Service selector matches some workload's pod labels ─────
  for (const svc of services) {
    const matched = workloads.filter(
      (w) => w.namespace === svc.namespace && isSuperset(w.podLabels, svc.selector),
    );
    if (Object.keys(svc.selector).length === 0) {
      findings.push({
        check: "service-without-selector",
        file: svc.doc.file,
        message: `Service ${svc.namespace}/${svc.name} declares no selector, so it can never get endpoints from this apply set.`,
      });
      continue;
    }
    if (matched.length === 0) {
      findings.push({
        check: "service-selector-matches-nothing",
        file: svc.doc.file,
        message:
          `Service ${svc.namespace}/${svc.name} selects ${fmtLabels(svc.selector)} and NO workload in the ` +
          `apply set carries those pod-template labels. Apply succeeds; the Service gets zero endpoints and ` +
          `every client sees connection-refused.`,
      });
      continue;
    }

    // ── CHECK C: a NAMED targetPort must be declared by a selected container ─
    for (const p of svc.ports) {
      if (typeof p.targetPort !== "string") continue;
      const declared = matched.flatMap((w) => w.containers.flatMap((c) => c.portNames));
      if (!declared.includes(p.targetPort)) {
        findings.push({
          check: "service-named-targetport-undeclared",
          file: svc.doc.file,
          message:
            `Service ${svc.namespace}/${svc.name} port ${p.port} has targetPort '${p.targetPort}', but the ` +
            `selected pod declares containerPort name(s) [${declared.join(", ") || "<none>"}]. A named ` +
            `targetPort that no container declares yields an endpoint with no port: schema-valid, silently dead.`,
        });
      }
    }
  }

  // ── CHECK D: in-cluster host:port references resolve to a Service + port ───
  const svcByKey = new Map(services.map((s) => [`${s.namespace}/${s.name}`, s]));
  for (const d of docs) {
    const ns = metaNamespace(d);
    for (const ref of extractUrlRefs(d)) {
      if (NON_SERVICE_HOSTS.has(ref.host)) continue;
      const svc = svcByKey.get(`${ns}/${ref.host}`);
      if (svc === undefined) {
        // Only a reference that LOOKS like this tree's own naming is a finding;
        // an unknown single-label host may legitimately be an external name.
        // Restrict to hosts some document in the set names as a Service or workload.
        const knownHere = services.some((s) => s.name === ref.host) || workloads.some((w) => metaName(w.doc) === ref.host);
        if (!knownHere) continue;
        findings.push({
          check: "reference-to-service-in-other-namespace",
          file: d.file,
          message: `${describe(d)} references '${ref.raw}' but Service '${ref.host}' is not in namespace '${ns}'.`,
        });
        continue;
      }
      if (ref.port === undefined) continue;
      if (!svc.ports.some((p) => p.port === ref.port)) {
        findings.push({
          check: "reference-to-unexposed-service-port",
          file: d.file,
          message:
            `${describe(d)} references '${ref.raw}' but Service ${svc.namespace}/${svc.name} exposes port(s) ` +
            `[${svc.ports.map((p) => p.port).join(", ") || "<none>"}]. The connection is refused at run time; ` +
            `nothing fails at apply time.`,
        });
      }
    }
  }

  // ── CHECK E/F: volume + envFrom references are satisfied by the apply set ──
  for (const w of workloads) {
    const spec = podSpec(w.doc);
    for (const vol of asArray(spec.volumes)) {
      const v = asRecord(vol);
      const cm = asRecord(v.configMap);
      const cmName = typeof cm.name === "string" ? cm.name : undefined;
      if (cmName !== undefined && !configMaps.has(`${w.namespace}/${cmName}`)) {
        findings.push({
          check: "volume-configmap-missing",
          file: w.doc.file,
          message:
            `${describe(w.doc)} mounts ConfigMap '${cmName}' which no document in the apply set creates in ` +
            `namespace '${w.namespace}'. The pod hangs in ContainerCreating.`,
        });
      }
      const sec = asRecord(v.secret);
      const secName = typeof sec.secretName === "string" ? sec.secretName : undefined;
      if (secName !== undefined && v.optional !== true && !secrets.has(`${w.namespace}/${secName}`)) {
        findings.push({
          check: "volume-secret-missing",
          file: w.doc.file,
          message: `${describe(w.doc)} mounts Secret '${secName}', absent from the apply set and not marked optional.`,
        });
      }
    }

    // subPath keys must exist in the named ConfigMap.
    const volConfigMap = new Map<string, string>();
    for (const vol of asArray(spec.volumes)) {
      const v = asRecord(vol);
      const cm = asRecord(v.configMap);
      if (typeof v.name === "string" && typeof cm.name === "string") volConfigMap.set(v.name, cm.name);
    }
    for (const cRaw of asArray(spec.containers)) {
      const c = asRecord(cRaw);
      for (const mRaw of asArray(c.volumeMounts)) {
        const m = asRecord(mRaw);
        if (typeof m.subPath !== "string" || typeof m.name !== "string") continue;
        const cmName = volConfigMap.get(m.name);
        if (cmName === undefined) continue;
        const keys = configMaps.get(`${w.namespace}/${cmName}`);
        if (keys !== undefined && !keys.has(m.subPath)) {
          findings.push({
            check: "volumemount-subpath-key-missing",
            file: w.doc.file,
            message:
              `${describe(w.doc)} mounts subPath '${m.subPath}' from ConfigMap '${cmName}', whose data keys are ` +
              `[${[...keys].join(", ") || "<none>"}]. The mount silently produces an empty directory.`,
          });
        }
      }

      // envFrom: a NON-optional ref must be satisfied by the apply set.
      for (const efRaw of asArray(c.envFrom)) {
        const ef = asRecord(efRaw);
        const sr = asRecord(ef.secretRef);
        if (typeof sr.name === "string" && sr.optional !== true && !secrets.has(`${w.namespace}/${sr.name}`)) {
          findings.push({
            check: "envfrom-secret-missing",
            file: w.doc.file,
            message:
              `${describe(w.doc)} has envFrom secretRef '${sr.name}' with optional unset/false, and no Secret of ` +
              `that name is in the apply set. Every pod stays in CreateContainerConfigError.`,
          });
        }
        const cr = asRecord(ef.configMapRef);
        if (typeof cr.name === "string" && cr.optional !== true && !configMaps.has(`${w.namespace}/${cr.name}`)) {
          findings.push({
            check: "envfrom-configmap-missing",
            file: w.doc.file,
            message: `${describe(w.doc)} has envFrom configMapRef '${cr.name}' with optional unset/false, absent from the apply set.`,
          });
        }
      }
    }
  }

  // ── CHECK G: images must be tag-pinned ────────────────────────────────────
  for (const w of workloads) {
    for (const c of w.containers) {
      const tag = imageTag(c.image);
      if (tag === undefined) {
        findings.push({
          check: "image-unpinned",
          file: w.doc.file,
          message: `${describe(w.doc)} container '${c.name}' image '${c.image}' has no tag, so it resolves to ':latest' and is not reproducible across a reboot.`,
        });
      } else if (tag === "latest") {
        findings.push({
          check: "image-unpinned",
          file: w.doc.file,
          message: `${describe(w.doc)} container '${c.name}' image '${c.image}' is pinned to ':latest'. Two nodes booted a week apart run different code.`,
        });
      }
    }
  }

  // ── CHECK H: every container must declare resource requests AND limits ────
  for (const w of workloads) {
    for (const c of w.containers) {
      if (!c.hasRequests) {
        findings.push({
          check: "container-without-requests",
          file: w.doc.file,
          message:
            `${describe(w.doc)} container '${c.name}' declares no resources.requests, giving it BestEffort QoS. ` +
            `On a single node under memory pressure the kubelet evicts BestEffort pods FIRST -- so this is the ` +
            `first thing to die, and it dies without the manifest saying so.`,
        });
      }
      if (!c.hasLimits) {
        findings.push({
          check: "container-without-limits",
          file: w.doc.file,
          message: `${describe(w.doc)} container '${c.name}' declares no resources.limits, so it can consume the whole node.`,
        });
      }
    }
  }

  return {
    findings,
    applySet,
    totals: sumResources(docs.filter((d) => WORKLOAD_KINDS.has(kindOf(d)))),
    documentCount: docs.length,
  };
}

// ── the apply set ───────────────────────────────────────────────────────────

export function kubectlApplySet(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => KUBECTL_EXTENSIONS.some((ext) => n.toLowerCase().endsWith(ext)))
    .sort();
}

function loadDocuments(dir: string, files: readonly string[], findings: Finding[]): Doc[] {
  const out: Doc[] = [];
  for (const file of files) {
    const text = readFileSync(join(dir, file), "utf8");
    const parsed = parseAllDocuments(text);
    parsed.forEach((doc, index) => {
      if (doc.errors.length > 0) {
        findings.push({
          check: "yaml-parse-error",
          file,
          message: `document ${index} failed to parse: ${doc.errors[0]?.message ?? "unknown"}`,
        });
        return;
      }
      const value: unknown = doc.toJS();
      if (value === null || typeof value !== "object" || Array.isArray(value)) return;
      out.push({ file, index, value: value as Record<string, unknown> });
    });
  }
  return out;
}

// ── projections ─────────────────────────────────────────────────────────────

function kindOf(d: Doc): string {
  return typeof d.value.kind === "string" ? d.value.kind : "";
}

function metaName(d: Doc): string {
  const m = asRecord(d.value.metadata);
  return typeof m.name === "string" ? m.name : "<unnamed>";
}

function metaNamespace(d: Doc): string {
  const m = asRecord(d.value.metadata);
  return typeof m.namespace === "string" ? m.namespace : "default";
}

function describe(d: Doc): string {
  return `${kindOf(d) || "<no kind>"} ${metaNamespace(d)}/${metaName(d)}`;
}

function podSpec(d: Doc): Record<string, unknown> {
  return asRecord(asRecord(asRecord(asRecord(d.value.spec).template).spec));
}

function toWorkload(doc: Doc): Workload {
  const template = asRecord(asRecord(doc.value.spec).template);
  const labels = asRecord(asRecord(template.metadata).labels);
  const podLabels: Record<string, string> = {};
  for (const [k, v] of Object.entries(labels)) if (typeof v === "string") podLabels[k] = v;

  const containers = asArray(podSpec(doc).containers).map((cRaw): Container => {
    const c = asRecord(cRaw);
    const ports = asArray(c.ports).map(asRecord);
    const resources = asRecord(c.resources);
    return {
      name: typeof c.name === "string" ? c.name : "<unnamed>",
      image: typeof c.image === "string" ? c.image : "",
      portNames: ports.map((p) => p.name).filter((n): n is string => typeof n === "string"),
      portNumbers: ports.map((p) => p.containerPort).filter((n): n is number => typeof n === "number"),
      hasRequests: Object.keys(asRecord(resources.requests)).length > 0,
      hasLimits: Object.keys(asRecord(resources.limits)).length > 0,
    };
  });

  return { doc, namespace: metaNamespace(doc), podLabels, containers };
}

function toService(doc: Doc): ServiceDoc {
  const spec = asRecord(doc.value.spec);
  const sel = asRecord(spec.selector);
  const selector: Record<string, string> = {};
  for (const [k, v] of Object.entries(sel)) if (typeof v === "string") selector[k] = v;

  const ports = asArray(spec.ports).map((pRaw): ServicePort => {
    const p = asRecord(pRaw);
    const tp = p.targetPort;
    return {
      port: typeof p.port === "number" ? p.port : Number.NaN,
      targetPort: typeof tp === "string" || typeof tp === "number" ? tp : undefined,
    };
  });

  return { doc, name: metaName(doc), namespace: metaNamespace(doc), selector, ports };
}

// ── URL references ──────────────────────────────────────────────────────────

type UrlRef = { readonly raw: string; readonly host: string; readonly port: number | undefined };

function extractUrlRefs(d: Doc): readonly UrlRef[] {
  const texts: string[] = [];
  collectStrings(d.value, texts);
  const out: UrlRef[] = [];
  const seen = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(URL_RE)) {
      const raw = m[0];
      const host = m[1];
      if (host === undefined || seen.has(raw)) continue;
      seen.add(raw);
      out.push({ raw, host, port: m[2] === undefined ? undefined : Number(m[2]) });
    }
  }
  return out;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out);
  }
}

// ── resources ───────────────────────────────────────────────────────────────

export function parseCpuMilli(raw: unknown): number {
  if (typeof raw === "number") return Math.round(raw * 1000);
  if (typeof raw !== "string") return 0;
  return raw.endsWith("m") ? Number(raw.slice(0, -1)) : Math.round(Number(raw) * 1000);
}

export function parseMemoryMi(raw: unknown): number {
  if (typeof raw === "number") return Math.round(raw / (1024 * 1024));
  if (typeof raw !== "string") return 0;
  const units: readonly (readonly [string, number])[] = [
    ["Gi", 1024],
    ["Mi", 1],
    ["Ki", 1 / 1024],
    ["G", 1000 * 1000 * 1000 / (1024 * 1024)],
    ["M", 1000 * 1000 / (1024 * 1024)],
  ];
  for (const [suffix, factor] of units) {
    if (raw.endsWith(suffix)) return Math.round(Number(raw.slice(0, -suffix.length)) * factor);
  }
  return Math.round(Number(raw) / (1024 * 1024));
}

function sumResources(workloadDocs: readonly Doc[]): ResourceTotals {
  let requestCpuMilli = 0;
  let requestMemoryMi = 0;
  let limitCpuMilli = 0;
  let limitMemoryMi = 0;
  for (const d of workloadDocs) {
    const replicas = typeof asRecord(d.value.spec).replicas === "number" ? (asRecord(d.value.spec).replicas as number) : 1;
    for (const cRaw of asArray(podSpec(d).containers)) {
      const r = asRecord(asRecord(cRaw).resources);
      const req = asRecord(r.requests);
      const lim = asRecord(r.limits);
      requestCpuMilli += parseCpuMilli(req.cpu) * replicas;
      requestMemoryMi += parseMemoryMi(req.memory) * replicas;
      limitCpuMilli += parseCpuMilli(lim.cpu) * replicas;
      limitMemoryMi += parseMemoryMi(lim.memory) * replicas;
    }
  }
  return { requestCpuMilli, requestMemoryMi, limitCpuMilli, limitMemoryMi };
}

// ── small helpers ───────────────────────────────────────────────────────────

function imageTag(image: string): string | undefined {
  if (image.startsWith("sha256:") || image.includes("@sha256:")) return "digest";
  const lastSlash = image.lastIndexOf("/");
  const colon = image.lastIndexOf(":");
  if (colon <= lastSlash) return undefined;
  return image.slice(colon + 1);
}

function isSuperset(labels: Readonly<Record<string, string>>, selector: Readonly<Record<string, string>>): boolean {
  return Object.entries(selector).every(([k, v]) => labels[k] === v);
}

function fmtLabels(labels: Readonly<Record<string, string>>): string {
  return Object.entries(labels)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

// ── CLI ─────────────────────────────────────────────────────────────────────

export function render(result: AuditResult, dir: string): string {
  const lines: string[] = [];
  lines.push(`apply set (${result.applySet.length} files kubectl would apply from ${dir}/):`);
  for (const f of result.applySet) lines.push(`  ${f}`);
  lines.push(`Kubernetes documents parsed: ${result.documentCount}`);
  const t = result.totals;
  // STATED, NOT GATED. No USB-node hardware spec is written down anywhere in this
  // repo, so there is no honest ceiling to compare these against. They are printed
  // so the operator can compare them against the node actually in their hand.
  lines.push(
    `pod resource totals (REPORTED, not gated -- no node budget is on file): ` +
      `requests ${t.requestCpuMilli}m CPU / ${t.requestMemoryMi}Mi memory; ` +
      `limits ${t.limitCpuMilli}m CPU / ${t.limitMemoryMi}Mi memory`,
  );
  if (result.findings.length === 0) {
    lines.push("Results: 0 findings.");
    return lines.join("\n");
  }
  lines.push("");
  for (const f of result.findings) lines.push(`FAIL [${f.check}] ${f.file}: ${f.message}`);
  lines.push("");
  lines.push(`Results: ${result.findings.length} findings.`);
  return lines.join("\n");
}

function main(): void {
  const argv = process.argv.slice(2);
  const dirFlag = argv.indexOf("--dir");
  const dir = dirFlag >= 0 ? (argv[dirFlag + 1] ?? DEFAULT_DIR) : DEFAULT_DIR;

  let result: AuditResult;
  try {
    result = auditDirectory(dir);
  } catch (error) {
    console.error(`audit-agentic-org-manifests: cannot read ${dir}: ${String(error)}`);
    process.exit(1);
  }

  // A run that discovered no manifests is NOT a clean run -- it is a check that
  // did not run, and reporting it as success is the vacuity class.
  if (result.applySet.length === 0) {
    console.error(`audit-agentic-org-manifests: no kubectl-visible files under ${dir}/ -- refusing to report success.`);
    process.exit(1);
  }
  if (result.documentCount === 0) {
    console.error(`audit-agentic-org-manifests: parsed 0 Kubernetes documents under ${dir}/ -- refusing to report success.`);
    process.exit(1);
  }

  console.log(render(result, dir));
  process.exit(result.findings.length === 0 ? 0 : 1);
}

if (import.meta.main) main();
