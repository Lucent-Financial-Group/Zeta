// Falsifiers for image-resolvability.ts.
//
// The registry client is exercised against a MOCKED `global.fetch` — never the
// real network, so this suite is fast and deterministic. The real network is
// exercised by `bun src/Core.TypeScript/cluster/image-resolvability.ts --refresh`,
// which is a scheduled/manual run, not this test.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  KUBE_VERSION_PATH,
  OPERATOR_INJECTED_RULES,
  REQUIRED_ARCHES,
  SNAPSHOT_PATH,
  audit,
  canonicalRef,
  declaredKubeVersion,
  formatReport,
  isKubeVersionDerived,
  mapWithConcurrency,
  resolveImage,
  type DiscoveredImage,
  type ResolvedImage,
} from "./image-resolvability.ts";

// ---------------------------------------------------------------------------
// canonicalRef
// ---------------------------------------------------------------------------

describe("canonicalRef", () => {
  test("a tagged reference normalizes to host/repository:tag", () => {
    expect(canonicalRef("ghcr.io/foo/bar:1.2.3")).toBe("ghcr.io/foo/bar:1.2.3");
  });

  test("an untagged docker.io reference defaults to library/<name>:latest", () => {
    expect(canonicalRef("busybox")).toBe("registry-1.docker.io/library/busybox:latest");
  });

  test("a digest reference uses @ not :, and keeps the sha256: prefix", () => {
    expect(canonicalRef("ghcr.io/foo/bar@sha256:abcd")).toBe("ghcr.io/foo/bar@sha256:abcd");
  });

  test("a tag AND a digest resolve to the digest form (the bug image-footprint.ts names)", () => {
    expect(canonicalRef("ghcr.io/foo/bar:v1.2@sha256:abcd")).toBe("ghcr.io/foo/bar@sha256:abcd");
  });
});

// ---------------------------------------------------------------------------
// declaredKubeVersion / isKubeVersionDerived — the spire/kubectl incident
// ---------------------------------------------------------------------------

describe("declaredKubeVersion", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "image-resolvability-kubever-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("reads kubernetesVersion out of the declared file — never hardcoded", () => {
    const abs = join(root, KUBE_VERSION_PATH);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, JSON.stringify({ kubernetesVersion: "1.35.7" }));
    expect(declaredKubeVersion(root)).toBe("1.35.7");
  });

  test("refuses (throws) rather than silently defaulting when the field is missing", () => {
    const abs = join(root, KUBE_VERSION_PATH);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, JSON.stringify({ notTheRightKey: "1.35.7" }));
    expect(() => declaredKubeVersion(root)).toThrow();
  });
});

describe("isKubeVersionDerived", () => {
  test("flags a hook image whose tag EXACTLY equals the render's kube-version (v-prefix either way)", () => {
    expect(isKubeVersionDerived("docker.io/rancher/kubectl:v1.35.7", "1.35.7")).toBe(true);
    expect(isKubeVersionDerived("docker.io/rancher/kubectl:1.35.7", "v1.35.7")).toBe(true);
  });

  test("does not flag a tag that merely shares a major.minor with the kube-version", () => {
    // Precise on purpose — a fuzzy major.minor match would flag unrelated
    // images that happen to share a version prefix (the noise this checker's
    // other risk flags avoid by being narrow).
    expect(isKubeVersionDerived("docker.io/grafana/loki:1.35.2", "1.35.7")).toBe(false);
  });

  test("never flags a digest reference — a digest cannot equal a version string", () => {
    expect(isKubeVersionDerived("docker.io/rancher/kubectl@sha256:abcd", "1.35.7")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveImage — mocked registry client
// ---------------------------------------------------------------------------

type Handler = (url: string) => Response | null;

let originalFetch: typeof fetch;

function installFetch(handler: Handler): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = async (input: unknown): Promise<Response> => {
    const url = typeof input === "string" ? input : (input as Request | URL).toString();
    const response = handler(url);
    if (response === null) throw new Error(`unmocked URL: ${url}`);
    return response;
  };
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("resolveImage", () => {
  test("a manifest LIST covering linux/amd64 and linux/arm64 resolves ok with both arches reported", async () => {
    installFetch((url) => {
      if (url.endsWith("/manifests/v1.0")) {
        return jsonResponse(200, {
          manifests: [
            { digest: "sha256:aaa", platform: { os: "linux", architecture: "amd64" } },
            { digest: "sha256:bbb", platform: { os: "linux", architecture: "arm64" } },
            { digest: "sha256:ccc", platform: { os: "unknown", architecture: "unknown" } }, // attestation, excluded
          ],
        });
      }
      return null;
    });
    const r = await resolveImage("example.com/foo/bar:v1.0");
    expect(r.status).toBe("ok");
    expect(r.arches).toEqual(["linux/amd64", "linux/arm64"]);
    expect(r.requiredArchesMissing).toEqual([]);
  });

  test("a manifest LIST with no linux/amd64 entry is arch-missing, never ok", async () => {
    installFetch((url) => {
      if (url.endsWith("/manifests/v1.0")) {
        return jsonResponse(200, { manifests: [{ digest: "sha256:bbb", platform: { os: "linux", architecture: "arm64" } }] });
      }
      return null;
    });
    const r = await resolveImage("example.com/foo/bar:v1.0");
    expect(r.status).toBe("arch-missing");
    expect(r.requiredArchesMissing).toEqual([...REQUIRED_ARCHES]);
    expect(r.arches).toEqual(["linux/arm64"]);
  });

  test("a single-platform manifest reads its arch from the CONFIG BLOB, not the manifest itself", async () => {
    installFetch((url) => {
      if (url.endsWith("/manifests/v1.0")) return jsonResponse(200, { config: { digest: "sha256:cfg" } });
      if (url.endsWith("/blobs/sha256:cfg")) return jsonResponse(200, { architecture: "amd64", os: "linux" });
      return null;
    });
    const r = await resolveImage("example.com/foo/bar:v1.0");
    expect(r.status).toBe("ok");
    expect(r.arches).toEqual(["linux/amd64"]);
  });

  test("a single-platform manifest whose config blob is a different arch is arch-missing", async () => {
    installFetch((url) => {
      if (url.endsWith("/manifests/v1.0")) return jsonResponse(200, { config: { digest: "sha256:cfg" } });
      if (url.endsWith("/blobs/sha256:cfg")) return jsonResponse(200, { architecture: "arm64", os: "linux" });
      return null;
    });
    const r = await resolveImage("example.com/foo/bar:v1.0");
    expect(r.status).toBe("arch-missing");
    expect(r.arches).toEqual(["linux/arm64"]);
  });

  test("a top-level 404 is `missing`, never `unknown`", async () => {
    installFetch((url) => (url.endsWith("/manifests/v1.0") ? jsonResponse(404, { errors: [{ code: "MANIFEST_UNKNOWN" }] }) : null));
    const r = await resolveImage("example.com/foo/bar:v1.0");
    expect(r.status).toBe("missing");
    expect(r.httpStatus).toBe(404);
  });

  test("a 401 (closed door) is `unknown`, never `missing`", async () => {
    installFetch((url) => (url.endsWith("/manifests/v1.0") ? jsonResponse(401, { errors: [] }) : null));
    const r = await resolveImage("example.com/foo/bar:v1.0");
    expect(r.status).toBe("unknown");
    expect(r.httpStatus).toBe(401);
  });

  test("a network throw, after retries exhaust, is `unknown` — never `missing`", async () => {
    installFetch(() => {
      throw new Error("ECONNRESET");
    });
    const r = await resolveImage("example.com/foo/bar:v1.0", new Map(), 1);
    expect(r.status).toBe("unknown");
    expect(r.reason).toContain("ECONNRESET");
  });

  test("a transient 503 is retried and can still resolve ok on a later attempt", async () => {
    let calls = 0;
    installFetch((url) => {
      if (url.endsWith("/manifests/v1.0")) {
        calls += 1;
        if (calls === 1) return new Response("", { status: 503 });
        return jsonResponse(200, { config: { digest: "sha256:cfg" } });
      }
      if (url.endsWith("/blobs/sha256:cfg")) return jsonResponse(200, { architecture: "amd64" });
      return null;
    });
    const r = await resolveImage("example.com/foo/bar:v1.0", new Map(), 3);
    expect(r.status).toBe("ok");
    expect(calls).toBeGreaterThan(1);
  });

  test("docker.io / latest / digest flags are read off the reference, not the resolution", async () => {
    installFetch((url) => (url.endsWith("/manifests/latest") ? jsonResponse(200, { config: { digest: "sha256:cfg" } }) : url.endsWith("/blobs/sha256:cfg") ? jsonResponse(200, { architecture: "amd64" }) : null));
    const r = await resolveImage("busybox");
    expect(r.isDockerHub).toBe(true);
    expect(r.isLatestOrUntagged).toBe(true);
    expect(r.hasDigest).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapWithConcurrency
// ---------------------------------------------------------------------------

describe("mapWithConcurrency", () => {
  test("preserves result order regardless of completion order", async () => {
    const delays = [30, 10, 20, 5];
    const results = await mapWithConcurrency(delays, 4, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms));
      return i;
    });
    expect(results).toEqual([0, 1, 2, 3]);
  });

  test("never runs more than `dop` at once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return n;
    });
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  test("DoP=1 drains the queue one at a time (the deterministic/DST-friendly floor)", async () => {
    const order: number[] = [];
    await mapWithConcurrency([3, 1, 2], 1, async (n) => {
      order.push(n);
      return n;
    });
    expect(order).toEqual([3, 1, 2]);
  });

  test("an empty item list resolves to an empty result, not a hang", async () => {
    const results = await mapWithConcurrency<number, number>([], 4, async (n) => n);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Operator-injected images — KubeVirt
// ---------------------------------------------------------------------------

describe("OPERATOR_INJECTED_RULES", () => {
  test("kubevirt-component-images derives every component at the operator's own tag", () => {
    const rule = OPERATOR_INJECTED_RULES.find((r) => r.name === "kubevirt-component-images");
    expect(rule).toBeDefined();
    const derived = rule?.derive("quay.io/kubevirt/virt-operator:v1.8.4") ?? [];
    expect(derived).toContain("quay.io/kubevirt/virt-api:v1.8.4");
    expect(derived).toContain("quay.io/kubevirt/pr-helper:v1.8.4");
    expect(derived).toContain("quay.io/kubevirt/sidecar-shim:v1.8.4");
    // NOT "virt-pr-helper" — the wrong guess this table was corrected FROM
    // (quay.io answers no-such-repository for it; see the module header).
    expect(derived).not.toContain("quay.io/kubevirt/virt-pr-helper:v1.8.4");
  });

  test("a non-matching image derives nothing", () => {
    const rule = OPERATOR_INJECTED_RULES.find((r) => r.name === "kubevirt-component-images");
    expect(rule?.derive("ghcr.io/some/other-image:1.0")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// audit() — the offline, snapshot-gated path
// ---------------------------------------------------------------------------

function resolvedFixture(over: Partial<ResolvedImage> & Pick<ResolvedImage, "reference" | "status">): ResolvedImage {
  return {
    httpStatus: 200,
    arches: ["linux/amd64"],
    requiredArchesMissing: [],
    reason: "",
    isDockerHub: false,
    isLatestOrUntagged: false,
    hasDigest: false,
    resolvedAt: "2026-09-22",
    ...over,
  };
}

describe("audit (offline, snapshot-gated)", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "image-resolvability-audit-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeSnapshot(entries: readonly ResolvedImage[]): void {
    const abs = join(root, SNAPSHOT_PATH);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, JSON.stringify({ $comment: "fixture", requiredArches: REQUIRED_ARCHES, reportedArches: REQUIRED_ARCHES, entries }, null, 2));
  }

  function fakeDiscover(images: readonly DiscoveredImage[]): () => { images: readonly DiscoveredImage[]; renderFailures: readonly string[] } {
    return () => ({ images, renderFailures: [] });
  }

  test("an image the snapshot marks `missing` is a gating finding", () => {
    writeSnapshot([resolvedFixture({ reference: "example.com/foo/bar:1.0", status: "missing", httpStatus: 404 })]);
    const report = audit(root, fakeDiscover([{ image: "example.com/foo/bar:1.0", sources: ["app/one"], kubeVersionDerived: false }]));
    expect(report.rows[0]?.resolution?.status).toBe("missing");
    const gating = report.rows.some((r) => r.resolution?.status === "missing" || r.resolution?.status === "arch-missing");
    expect(gating).toBe(true);
  });

  test("an image the snapshot marks `unknown` is reported but not gating", () => {
    writeSnapshot([resolvedFixture({ reference: "example.com/foo/bar:1.0", status: "unknown", httpStatus: 401 })]);
    const report = audit(root, fakeDiscover([{ image: "example.com/foo/bar:1.0", sources: ["app/one"], kubeVersionDerived: false }]));
    const gating = report.rows.some((r) => r.resolution?.status === "missing" || r.resolution?.status === "arch-missing");
    expect(gating).toBe(false);
    expect(report.rows[0]?.resolution?.status).toBe("unknown");
  });

  test("an image not yet in the snapshot resolves to `null` (not-yet-measured) and does not gate", () => {
    writeSnapshot([]);
    const report = audit(root, fakeDiscover([{ image: "example.com/brand-new:1.0", sources: ["app/one"], kubeVersionDerived: false }]));
    expect(report.rows[0]?.resolution).toBeNull();
    const gating = report.rows.some((r) => r.resolution?.status === "missing" || r.resolution?.status === "arch-missing");
    expect(gating).toBe(false);
  });

  test("an ok image reports clean", () => {
    writeSnapshot([resolvedFixture({ reference: "example.com/foo/bar:1.0", status: "ok" })]);
    const report = audit(root, fakeDiscover([{ image: "example.com/foo/bar:1.0", sources: ["app/one"], kubeVersionDerived: false }]));
    expect(report.rows[0]?.resolution?.status).toBe("ok");
    expect(formatReport(report)).toContain("no missing or arch-missing images");
  });

  test("images are looked up by CANONICAL reference, so a re-rendered tag+digest form still matches", () => {
    writeSnapshot([resolvedFixture({ reference: "ghcr.io/foo/bar@sha256:abcd", status: "ok" })]);
    const report = audit(root, fakeDiscover([{ image: "ghcr.io/foo/bar:v1@sha256:abcd", sources: ["app/one"], kubeVersionDerived: false }]));
    expect(report.rows[0]?.resolution?.status).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// formatReport
// ---------------------------------------------------------------------------

describe("formatReport", () => {
  test("counts risk images (docker.io / latest / no-digest) separately from gating status", () => {
    const report = {
      mode: "offline" as const,
      renderFailures: [],
      rows: [
        {
          image: "busybox",
          sources: ["app/one"],
          resolution: resolvedFixture({ reference: "registry-1.docker.io/library/busybox:latest", status: "ok", isDockerHub: true, isLatestOrUntagged: true }),
          kubeVersionDerived: false,
        },
      ],
    };
    const text = formatReport(report);
    expect(text).toContain("docker.io=1");
    expect(text).toContain(":latest-or-untagged=1");
  });

  test("counts and lists kube-version-derived images as a separate, report-only risk", () => {
    const report = {
      mode: "offline" as const,
      renderFailures: [],
      rows: [
        {
          image: "docker.io/rancher/kubectl:v1.35.7",
          sources: ["full-ai-cluster/k8s/bootstrap/spire-install.yaml"],
          resolution: resolvedFixture({ reference: "registry-1.docker.io/rancher/kubectl:v1.35.7", status: "missing", httpStatus: 404 }),
          kubeVersionDerived: true,
        },
      ],
    };
    const text = formatReport(report);
    expect(text).toContain("kube-version-derived=1");
    expect(text).toContain("KUBE-VERSION-DERIVED");
    expect(text).toContain("docker.io/rancher/kubectl:v1.35.7");
  });
});
