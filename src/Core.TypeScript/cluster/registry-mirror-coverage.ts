#!/usr/bin/env bun
// src/Core.TypeScript/cluster/registry-mirror-coverage.ts
//
// HOW MUCH OF THE FIRST-BOOT DOCKER HUB PULL DOES mirror.gcr.io ACTUALLY
// COVER? — WP9 (081M33STPKN087G0R0004B5CAK).
//
// -- REPORT-ONLY, NOT A GATE -------------------------------------------
// `nixos/tests/k3s-registry-mirrors-eval-test.nix` (the CI-gated check) proves
// the MIRROR IS CONFIGURED — that registries.yaml exists, names docker.io,
// and does not disable the upstream fallback. It cannot and does not ask
// whether mirror.gcr.io actually SERVES the images this cluster pulls: that is
// a live network measurement against a cache Google owns and periodically
// evicts ("mirror.gcr.io ... periodically removes images that are no longer
// requested" — https://docs.cloud.google.com/artifact-registry/docs/pull-cached-dockerhub-images),
// so its answer is a snapshot with a date, never a pass/fail a PR should be
// blocked on. This script is that snapshot. Nothing in gate.yml calls it.
//
// -- ONE SOURCE FOR THE MIRROR LIST --------------------------------------
// Reads `full-ai-cluster/k8s/registry-mirrors.json` — the SAME file
// `nixos/modules/k3s-registry-mirrors.nix` renders into
// /etc/rancher/k3s/registries.yaml — so this measurement is always against
// the mirror actually configured on nodes, not a hardcoded assumption.
//
// -- ONE SOURCE FOR THE IMAGE LIST, WITH A DOCUMENTED FALLBACK -----------
// Reads `full-ai-cluster/k8s/image-resolvability.json`, the committed
// snapshot `src/Core.TypeScript/cluster/image-resolvability.ts --refresh`
// writes (added by PR #17475; may not be on `main` yet at the time this
// script first lands — see that PR's own header for why it is not
// re-implemented here rather than duplicated). Filters to `isDockerHub`
// entries, which is exactly the WP9 problem statement's "51 [50, measured
// 2026-09-22] are from Docker Hub". If that file is absent, this script says
// so and exits 0 (report-only — a missing snapshot is not a coverage
// failure, it is a "run the other tool first" instruction) rather than
// re-rendering the whole catalog with helm, which would duplicate
// `image-resolvability.ts`'s own render pipeline for a second time in this
// tree — exactly the "not a fourth scanner" discipline that file's own
// header states.
//
// -- WHY A BARE HEAD IS SOUND HERE ---------------------------------------
// mirror.gcr.io serves public Docker Hub content with NO authentication —
// confirmed live 2026-09-22 (`curl -I https://mirror.gcr.io/v2/library/alpine/manifests/latest`
// returns 200 with no WWW-Authenticate challenge). That is different from
// docker.io's own registry, which requires a bearer token even for public
// anonymous pulls — this script only ever talks to the mirror, so no token
// flow is needed.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const MIRROR_CONFIG_PATH = join(REPO_ROOT, "full-ai-cluster/k8s/registry-mirrors.json");
const IMAGE_RESOLVABILITY_PATH = join(REPO_ROOT, "full-ai-cluster/k8s/image-resolvability.json");

const PROBE_TIMEOUT_MS = 15_000;

interface MirrorConfig {
  readonly mirrors: Readonly<Record<string, { readonly endpoint: readonly string[] }>>;
}

interface ImageResolvabilityEntry {
  readonly reference: string;
  readonly isDockerHub: boolean;
}

interface ImageResolvabilitySnapshot {
  readonly entries: readonly ImageResolvabilityEntry[];
}

interface ParsedDockerHubRef {
  readonly reference: string;
  readonly repo: string;
  readonly tag: string;
}

/** `registry-1.docker.io/library/alpine:latest` -> { repo: "library/alpine", tag: "latest" }. */
function parseDockerHubReference(reference: string): ParsedDockerHubRef {
  const noHost = reference.replace(/^registry-1\.docker\.io\//, "");
  const atIndex = noHost.lastIndexOf("@");
  if (atIndex !== -1) {
    return { reference, repo: noHost.slice(0, atIndex), tag: noHost.slice(atIndex + 1) };
  }
  const colonIndex = noHost.lastIndexOf(":");
  if (colonIndex === -1) {
    return { reference, repo: noHost, tag: "latest" };
  }
  return { reference, repo: noHost.slice(0, colonIndex), tag: noHost.slice(colonIndex + 1) };
}

const MANIFEST_ACCEPT = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.docker.distribution.manifest.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
].join(",");

async function probeMirror(mirrorBaseUrl: string, ref: ParsedDockerHubRef): Promise<number | "error"> {
  const url = `${mirrorBaseUrl}/v2/${ref.repo}/manifests/${ref.tag}`;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { Accept: MANIFEST_ACCEPT },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.status;
  } catch {
    return "error";
  }
}

interface CoverageRow extends ParsedDockerHubRef {
  readonly status: number | "error";
  readonly hit: boolean;
}

async function main(): Promise<void> {
  if (!existsSync(MIRROR_CONFIG_PATH)) {
    console.error(`registry-mirror-coverage: missing ${MIRROR_CONFIG_PATH}`);
    process.exitCode = 1;
    return;
  }
  const mirrorConfig = JSON.parse(readFileSync(MIRROR_CONFIG_PATH, "utf8")) as MirrorConfig;
  const dockerIoMirror = mirrorConfig.mirrors["docker.io"];
  if (!dockerIoMirror || dockerIoMirror.endpoint.length === 0) {
    console.error("registry-mirror-coverage: registry-mirrors.json has no docker.io mirror configured");
    process.exitCode = 1;
    return;
  }
  const mirrorBaseUrl = dockerIoMirror.endpoint[0]!;

  if (!existsSync(IMAGE_RESOLVABILITY_PATH)) {
    console.log(
      "registry-mirror-coverage: no full-ai-cluster/k8s/image-resolvability.json snapshot found " +
        "(the tool that writes it — src/Core.TypeScript/cluster/image-resolvability.ts, PR #17475 " +
        "— may not be merged yet). Run `bun src/Core.TypeScript/cluster/image-resolvability.ts " +
        "--refresh` first, then re-run this script. Nothing to measure; exiting 0 (report-only).",
    );
    return;
  }
  const snapshot = JSON.parse(readFileSync(IMAGE_RESOLVABILITY_PATH, "utf8")) as ImageResolvabilitySnapshot;
  const dockerHubEntries = snapshot.entries.filter((e) => e.isDockerHub);

  console.log(
    `registry-mirror-coverage: probing ${dockerHubEntries.length} Docker Hub image(s) against ` +
      `${mirrorBaseUrl} (from registry-mirrors.json)`,
  );

  const rows: CoverageRow[] = [];
  for (const entry of dockerHubEntries) {
    const ref = parseDockerHubReference(entry.reference);
    const status = await probeMirror(mirrorBaseUrl, ref);
    const hit = status === 200;
    rows.push({ ...ref, status, hit });
    console.log(`  ${hit ? "HIT " : "MISS"} ${status.toString().padStart(5)}  ${ref.reference}`);
  }

  const hits = rows.filter((r) => r.hit);
  const misses = rows.filter((r) => !r.hit);

  console.log("");
  console.log(
    `registry-mirror-coverage: ${hits.length}/${rows.length} Docker Hub images hit ${mirrorBaseUrl} ` +
      `(${misses.length} miss${misses.length === 1 ? "" : "es"} fall through to Docker Hub itself — ` +
      "the default-endpoint fallback this module deliberately leaves enabled).",
  );
  if (misses.length > 0) {
    console.log("misses:");
    for (const m of misses) {
      console.log(`  ${m.reference} (status ${m.status})`);
    }
  }
}

if (import.meta.main) {
  await main();
}

export { parseDockerHubReference };
