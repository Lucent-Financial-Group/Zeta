/**
 * flowdent-web.test.ts - the public flowdent.net website, moved off Azure Container Apps
 * (full-ai-cluster/k8s/flowdent-web/, docs/ops/AZURE-EXIT.md).
 *
 * What these tests can prove with no cluster: the directory is opt-in and self-consistent; the pod
 * satisfies the `restricted` Pod Security profile the namespace ENFORCES (so a rollout cannot be
 * refused at admission); the image is pinned by digest; every container declares the requests the
 * namespace quota requires; and each HTTPRoute attaches to a listener that public-tls really defines,
 * for the hostname that listener really carries. What they cannot prove: that a certificate issued or
 * that Cloudflare reaches the origin -- that needs the live node and is recorded in AZURE-EXIT.md.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { publicTlsObjects, yamlDocs, type K8sObject } from "./public-tls.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const DIR = join(REPO_ROOT, "full-ai-cluster/k8s/flowdent-web");
const SET = { acmeEmail: "ops@flowdent.net", publicDomain: "flowdent.net" } as const;

const read = (f: string) => readFileSync(join(DIR, f), "utf8");
const docs = (f: string) => yamlDocs(read(f));
const kinds = (objs: K8sObject[], kind: string) => objs.filter((o) => o["kind"] === kind);
const files = () => readdirSync(DIR).filter((f) => f.endsWith(".yaml")).sort();

describe("A. opt-in: nothing here exists unless an operator applies Application.yaml", () => {
  const root = parseYaml(readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/bootstrap/root-application.yaml"), "utf8")) as Record<string, any>;

  test("the app-of-apps root recurses only k8s/applications, and this directory is not under it", () => {
    expect("full-ai-cluster/k8s/flowdent-web".startsWith(root.spec.source.path)).toBe(false);
  });

  test("the Application points at this directory, never prunes (the namespace holds a Secret not in git), and self-heals", () => {
    const app = parseYaml(read("Application.yaml")) as Record<string, any>;
    expect(app.metadata.name).toBe("flowdent-web");
    expect(app.spec.source.path).toBe("full-ai-cluster/k8s/flowdent-web");
    expect(app.spec.destination.namespace).toBe("flowdent-web");
    expect(app.spec.syncPolicy.automated.prune).toBe(false);
    expect(app.spec.syncPolicy.automated.selfHeal).toBe(true);
  });

  test("kustomization.yaml lists exactly the manifests in the directory (Application.yaml and itself excluded)", () => {
    const k = parseYaml(read("kustomization.yaml")) as Record<string, any>;
    const present = files().filter((f) => f !== "Application.yaml" && f !== "kustomization.yaml");
    expect([...k.resources].sort()).toEqual(present);
  });
});

describe("B. the pod passes the `restricted` profile the namespace enforces", () => {
  const ns = kinds(docs("namespace.yaml"), "Namespace")[0]!;
  const dep = kinds(docs("deployment.yaml"), "Deployment")[0] as any;
  const pod = dep.spec.template.spec;
  const c = pod.containers[0];

  test("the namespace ENFORCES restricted", () => {
    expect((ns as any).metadata.labels["pod-security.kubernetes.io/enforce"]).toBe("restricted");
  });

  test("non-root with a numeric uid, RuntimeDefault seccomp, no privilege escalation, all caps dropped, read-only root", () => {
    expect(pod.securityContext.runAsNonRoot).toBe(true);
    expect(typeof pod.securityContext.runAsUser).toBe("number");
    expect(pod.securityContext.runAsUser).toBeGreaterThan(0);
    expect(pod.securityContext.seccompProfile.type).toBe("RuntimeDefault");
    expect(c.securityContext.allowPrivilegeEscalation).toBe(false);
    expect(c.securityContext.capabilities.drop).toEqual(["ALL"]);
    expect(c.securityContext.readOnlyRootFilesystem).toBe(true);
    expect(pod.hostNetwork).toBeUndefined();
    expect(pod.automountServiceAccountToken).toBe(false);
  });

  test("every volume is an emptyDir with a size limit (no PVC: the site is stateless and the quota allows none)", () => {
    for (const v of pod.volumes) {
      expect(v.emptyDir?.sizeLimit).toBeTruthy();
      expect(v.persistentVolumeClaim).toBeUndefined();
    }
    const quota = kinds(docs("namespace.yaml"), "ResourceQuota")[0] as any;
    expect(quota.spec.hard.persistentvolumeclaims).toBe("0");
  });

  test("the image is pinned by digest, on the cluster's own registry", () => {
    expect(c.image).toMatch(/^registry\.flowdent\.net\/flowdent\/fd-webclient\/flowdent-webapp:[0-9a-f]+@sha256:[0-9a-f]{64}$/);
  });

  test("requests and limits declared, including ephemeral storage (the quota refuses a pod without them)", () => {
    expect(c.resources.requests.cpu).toBeTruthy();
    expect(c.resources.requests.memory).toBeTruthy();
    expect(c.resources.requests["ephemeral-storage"]).toBeTruthy();
    expect(c.resources.limits.memory).toBeTruthy();
    expect(c.resources.limits["ephemeral-storage"]).toBeTruthy();
  });

  test("two replicas, never fewer than one available, readiness gates traffic", () => {
    expect(dep.spec.replicas).toBeGreaterThanOrEqual(2);
    expect(dep.spec.strategy.rollingUpdate.maxUnavailable).toBe(0);
    const pdb = kinds(docs("pdb.yaml"), "PodDisruptionBudget")[0] as any;
    expect(pdb.spec.minAvailable).toBe(1);
    expect(pdb.spec.selector.matchLabels).toEqual(dep.spec.selector.matchLabels);
    expect(c.readinessProbe.httpGet.port).toBe("http");
  });

  test("the Service selects the pods and targets the named port", () => {
    const svc = kinds(docs("service.yaml"), "Service")[0] as any;
    expect(svc.spec.selector).toEqual(dep.spec.selector.matchLabels);
    expect(svc.spec.ports[0].targetPort).toBe("http");
    expect(c.ports[0].name).toBe("http");
  });
});

describe("C. routes attach to listeners that public-tls defines, for the hostname each carries", () => {
  const listeners = ((kinds(publicTlsObjects(SET), "Gateway")[0]!["spec"] as any).listeners as Array<Record<string, any>>);
  const routes = kinds(docs("httproute.yaml"), "HTTPRoute") as any[];

  test("each HTTPS route's sectionName is a listener whose hostname is exactly the route's hostname", () => {
    const https = routes.filter((r) => r.spec.parentRefs[0].sectionName !== "http");
    expect(https.length).toBe(2);
    for (const r of https) {
      const l = listeners.find((x) => x["name"] === r.spec.parentRefs[0].sectionName);
      expect(l).toBeDefined();
      expect([l!["hostname"]]).toEqual(r.spec.hostnames);
      expect(r.spec.parentRefs[0].name).toBe("zeta-public-gateway");
      expect(r.spec.parentRefs[0].namespace).toBe("zeta-platform");
    }
  });

  test("the apex and www are both served, and nothing else is claimed", () => {
    const hosts = routes.flatMap((r) => r.spec.hostnames as string[]);
    expect(new Set(hosts)).toEqual(new Set(["flowdent.net", "www.flowdent.net"]));
  });

  test("the :80 route only redirects to https", () => {
    const r = routes.find((x) => x.spec.parentRefs[0].sectionName === "http")!;
    expect(r.spec.rules).toEqual([{ filters: [{ type: "RequestRedirect", requestRedirect: { scheme: "https", statusCode: 301 } }] }]);
  });
});
