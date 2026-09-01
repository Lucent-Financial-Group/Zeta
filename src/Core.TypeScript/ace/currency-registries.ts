// The per-ecosystem fetch half of `ace currency`. Each registry contributes ONLY a
// way to list published versions; the verdict logic lives once in `currency.ts` and
// is shared, so no ecosystem can quietly acquire its own definition of "current".

import type { CurrencyRegistry, PublishedVersion } from "./currency.ts";

/** Shared fetch with a timeout, returning null on ANY failure. */
async function getJson(url: string, headers: Record<string, string> = {}, timeoutMs = 20_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Null means UNKNOWN and is turned into `unreachable` upstream — never into a
    // pass. A catch that returned "current" would be the vacuity class.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * NuGet. `coordinate` is the package id, e.g. `Microsoft.Orleans.Server`.
 *
 * The flat container carries versions but NO publish dates, so `publishedAt` is null
 * and dormancy is UNKNOWN rather than false for this ecosystem. Saying "not dormant"
 * from an absent date would be inventing a measurement.
 */
export const nugetRegistry: CurrencyRegistry = {
  ecosystem: "nuget",
  async publishedVersions(coordinate: string): Promise<readonly PublishedVersion[]> {
    const id = coordinate.toLowerCase();
    const body = await getJson(`https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(id)}/index.json`);
    if (body === null) throw new Error(`nuget: unreachable for ${coordinate}`);
    const versions = (body as { versions?: unknown }).versions;
    if (!Array.isArray(versions)) return [];
    return versions.filter((v): v is string => typeof v === "string").map((version) => ({ version, publishedAt: null }));
  },
};

/** npm. The registry document carries a `time` map, so dates ARE available here. */
export const npmRegistry: CurrencyRegistry = {
  ecosystem: "npm",
  async publishedVersions(coordinate: string): Promise<readonly PublishedVersion[]> {
    const body = await getJson(`https://registry.npmjs.org/${coordinate.replace("/", "%2F")}`);
    if (body === null) throw new Error(`npm: unreachable for ${coordinate}`);
    const doc = body as { versions?: Record<string, unknown>; time?: Record<string, string> };
    if (typeof doc.versions !== "object" || doc.versions === null) return [];
    return Object.keys(doc.versions).map((version) => ({
      version,
      publishedAt: doc.time?.[version] ?? null,
    }));
  },
};

/**
 * OCI / container images. `coordinate` is `<registry>/<repo>`, e.g.
 * `docker.io/bitnamilegacy/redis` or `ghcr.io/actions/actions-runner-controller-charts`.
 *
 * TWO HONEST LIMITS, stated because they change what a verdict here means:
 *
 * 1. **Docker Hub is queried through its own v2 API, not the OCI distribution API.**
 *    The OCI `/v2/<name>/tags/list` endpoint returns tag NAMES and no dates at all,
 *    so dormancy would be permanently unknown for every image. Docker Hub's API
 *    carries `last_updated`, which is what caught `bitnamilegacy` (frozen 2025-08)
 *    and `ankane/pgvector` (2023-10). Non-Docker-Hub registries fall back to the
 *    dateless OCI listing and report dormancy as UNKNOWN rather than as false.
 *
 * 2. **Only the first 100 tags are read, ordered by `last_updated`.** So a pin older
 *    than the 100 most recently-touched tags reports `unpublished` when the truthful
 *    answer is "not on the first page". MEASURED: `bitnamilegacy/redis` pinned at
 *    `7.4.1-debian-12-r2` reports `unpublished` for exactly this reason, alongside a
 *    correct `silentDays=375`. That errs toward ALARM rather than reassurance, which
 *    is the safe direction for this tool, but it is a false reason for a true verdict
 *    and pagination is the fix.
 *
 * 3. **A tag is not a version.** `latest` sorts as a string and means nothing
 *    ordinally, so an image pinned to a floating tag gets `unpublished` or a
 *    meaningless gap rather than a reassuring `current`. That is deliberate: a
 *    floating tag has no currency answer, and pretending otherwise is how
 *    `bitnami/redis:latest` reads as healthy.
 */
export const ociRegistry: CurrencyRegistry = {
  ecosystem: "oci",
  async publishedVersions(coordinate: string): Promise<readonly PublishedVersion[]> {
    // A coordinate is Docker Hub unless its FIRST path segment looks like a host
    // (contains a dot or a port). An earlier heuristic keyed off the position of the
    // first dot ANYWHERE in the string, which sent `bitnamilegacy/redis` down the
    // registry path with `bitnamilegacy` as the hostname -- so every Docker Hub image
    // came back UNREACHABLE, and unreachable is precisely the answer that hides a
    // frozen repository. Caught by probing the three images this tool exists for.
    const dockerHub = isDockerHubCoordinate(coordinate);
    if (dockerHub) {
      const repo = normalizeDockerHubRepo(coordinate);
      const body = await getJson(`https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100&ordering=last_updated`);
      if (body === null) throw new Error(`oci: unreachable for ${coordinate}`);
      const results = (body as { results?: unknown }).results;
      if (!Array.isArray(results)) return [];
      return results
        .filter((r): r is { name: string; last_updated?: string } =>
          typeof r === "object" && r !== null && typeof (r as { name?: unknown }).name === "string")
        // cosign/attestation artifacts are not releases; counting them would inflate
        // every gap and hide a repository that ships nothing but signatures.
        .filter((r) => !r.name.startsWith("sha256-") && !r.name.endsWith(".sig") && !r.name.endsWith(".att"))
        .map((r) => ({ version: r.name, publishedAt: r.last_updated ?? null }));
    }
    const [host, ...rest] = coordinate.split("/");
    const body = await getJson(`https://${host!}/v2/${rest.join("/")}/tags/list`);
    if (body === null) throw new Error(`oci: unreachable for ${coordinate}`);
    const tags = (body as { tags?: unknown }).tags;
    if (!Array.isArray(tags)) return [];
    return tags.filter((t): t is string => typeof t === "string").map((version) => ({ version, publishedAt: null }));
  },
};

/** True when `coordinate` addresses Docker Hub rather than a named registry host. */
export function isDockerHubCoordinate(coordinate: string): boolean {
  if (coordinate.startsWith("docker.io/")) return true;
  const first = coordinate.split("/")[0] ?? "";
  return !(first.includes(".") || first.includes(":"));
}

/** `redis` -> `library/redis`; `docker.io/bitnami/redis` -> `bitnami/redis`. */
export function normalizeDockerHubRepo(coordinate: string): string {
  const bare = coordinate.replace(/^docker\.io\//, "");
  return bare.includes("/") ? bare : `library/${bare}`;
}

export const REGISTRIES: Readonly<Record<string, CurrencyRegistry>> = {
  nuget: nugetRegistry,
  npm: npmRegistry,
  oci: ociRegistry,
};
