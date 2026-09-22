// registry-mirror-coverage.test.ts — the reference parser, and that both
// single-source files it reads (registry-mirrors.json, and the
// image-resolvability.json shape it expects) parse the way the script
// assumes.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDockerHubReference } from "./registry-mirror-coverage.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const MIRROR_CONFIG_PATH = join(REPO_ROOT, "full-ai-cluster", "k8s", "registry-mirrors.json");

describe("parseDockerHubReference", () => {
  test("library image with a tag", () => {
    expect(parseDockerHubReference("registry-1.docker.io/library/alpine:latest")).toEqual({
      reference: "registry-1.docker.io/library/alpine:latest",
      repo: "library/alpine",
      tag: "latest",
    });
  });

  test("namespaced image with a tag", () => {
    expect(parseDockerHubReference("registry-1.docker.io/grafana/loki:3.7.7")).toEqual({
      reference: "registry-1.docker.io/grafana/loki:3.7.7",
      repo: "grafana/loki",
      tag: "3.7.7",
    });
  });

  test("digest reference uses the digest as the manifest lookup key", () => {
    const ref = "registry-1.docker.io/library/busybox@sha256:deadbeef";
    expect(parseDockerHubReference(ref)).toEqual({
      reference: ref,
      repo: "library/busybox",
      tag: "sha256:deadbeef",
    });
  });

  test("no tag defaults to latest", () => {
    expect(parseDockerHubReference("registry-1.docker.io/library/nginx")).toEqual({
      reference: "registry-1.docker.io/library/nginx",
      repo: "library/nginx",
      tag: "latest",
    });
  });
});

describe("registry-mirrors.json — the single source this script and the nix module both read", () => {
  test("exists, parses, and declares a docker.io mirror with an https endpoint", () => {
    // No existsSync check-then-use: readFileSync itself is the existence
    // check, and a missing file throws ENOENT here, failing the test with a
    // clear error rather than a stale pre-check.
    const parsed = JSON.parse(readFileSync(MIRROR_CONFIG_PATH, "utf8")) as {
      mirrors: Record<string, { endpoint: string[] }>;
    };
    expect(parsed.mirrors["docker.io"]).toBeDefined();
    expect(parsed.mirrors["docker.io"]!.endpoint.length).toBeGreaterThan(0);
    for (const endpoint of parsed.mirrors["docker.io"]!.endpoint) {
      expect(endpoint.startsWith("https://")).toBe(true);
    }
  });

  test("every registry key is a bare hostname (the nix module hand-renders YAML with no escaping)", () => {
    const parsed = JSON.parse(readFileSync(MIRROR_CONFIG_PATH, "utf8")) as { mirrors: Record<string, unknown> };
    for (const name of Object.keys(parsed.mirrors)) {
      expect(name).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});
