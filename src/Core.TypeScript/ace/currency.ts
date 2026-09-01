// ace currency — "how far behind is this pin, and is the thing on the other end still alive?"
//
// WHY THIS IS IN `ace` AND NOT IN N SCRIPTS. `ace` is the package manager for any
// kind of package, so the question "is this pin current" belongs to it once rather
// than to each ecosystem separately. `report-chart-currency.ts` answers it for Helm
// charts today and nothing answers it for container images, NuGet, or npm — which is
// how `bitnamilegacy` (an archive frozen since 2025-08) and `ankane/pgvector:latest`
// (no push since 2023-10-11) sat in the tree unnoticed while the CHART versions above
// them looked fine.
//
// THE LESSON THIS MODULE IS BUILT AROUND, taken from the chart report's own header:
//
//   > A pure versions-behind metric reports the MOST DANGEROUS dependency as the
//   > HEALTHIEST one, which is exactly what happened with minio: it was the only pin
//   > not behind, and only because upstream archived the repository.
//
// So a gap is NOT the verdict. `gapCount` and `upstreamSilentDays` are two independent
// axes and both are reported; `DORMANT` is the class that exists solely because being
// at the newest version can mean upstream stopped publishing. Any consumer that
// collapses this to one number reintroduces the bug.

/** Package ecosystems ace can ask a currency question about. */
export type Ecosystem = "oci" | "nuget" | "npm" | "helm" | "cargo" | "pypi";

/** One published release, as any registry can describe it. */
export interface PublishedVersion {
  readonly version: string;
  /** ISO-8601, or null when the registry does not carry publish dates (OCI often does not). */
  readonly publishedAt: string | null;
}

/**
 * What a registry must answer. Deliberately an INTERFACE with no state:
 * ecosystems differ only in how they fetch, never in how they are judged, so the
 * verdict logic below is shared and each ecosystem contributes a fetch and nothing
 * else. (`interfaces-free-classes-earned-under-rules`.)
 */
export interface CurrencyRegistry {
  readonly ecosystem: Ecosystem;
  /** Every published version of `coordinate`, newest-last order not required. */
  publishedVersions(coordinate: string): Promise<readonly PublishedVersion[]>;
}

export type CurrencyLevel =
  /** at the newest published version, and upstream is still publishing */
  | "current"
  /** behind, and upstream is still publishing — ordinary staleness */
  | "behind"
  /** at the newest version BECAUSE upstream stopped publishing — the minio class */
  | "dormant"
  /** upstream is silent AND we are behind — worse than either alone */
  | "behind-dormant"
  /** the pin is not among the published versions at all — it can never resolve */
  | "unpublished"
  /** the registry could not be reached; NOT a negative result */
  | "unreachable";

export interface CurrencyVerdict {
  readonly level: CurrencyLevel;
  readonly pinned: string;
  readonly newest: string | null;
  /** how many published versions sit between the pin and newest; null when unknown */
  readonly gapCount: number | null;
  /** days since the newest version was published; null when the registry carries no dates */
  readonly upstreamSilentDays: number | null;
  readonly reason: string;
}

/** Upstream silent for longer than this reads as dormant rather than merely stable. */
export const DORMANT_AFTER_DAYS = 365;

/**
 * Judge one pin. PURE — takes the registry's answer, never fetches — so it is
 * testable without a network and replays deterministically (DST).
 *
 * `nowIso` is INJECTED rather than read from the clock: a verdict that depends on
 * ambient time cannot be replayed, and this repo's rule is that entropy enters only
 * through declared channels.
 */
export function currencyVerdict(
  pinned: string,
  published: readonly PublishedVersion[] | null,
  nowIso: string,
  dormantAfterDays: number = DORMANT_AFTER_DAYS,
): CurrencyVerdict {
  if (published === null) {
    return {
      level: "unreachable",
      pinned,
      newest: null,
      gapCount: null,
      upstreamSilentDays: null,
      // A failed probe is UNKNOWN, never a negative result — the same discipline the
      // transport rule states for API probes. Reporting "current" here would be a
      // check that cannot fail.
      reason: "registry unreachable; currency is UNKNOWN, which is not the same as current",
    };
  }
  if (published.length === 0) {
    return {
      level: "unpublished",
      pinned,
      newest: null,
      gapCount: null,
      upstreamSilentDays: null,
      reason: "registry returned no versions at all for this coordinate",
    };
  }

  const ordered = [...published].sort((a, b) => compareVersions(a.version, b.version));
  const newest = ordered[ordered.length - 1]!;
  const pinIndex = ordered.findIndex((v) => v.version === pinned);

  const silentDays = newest.publishedAt === null ? null : daysBetween(newest.publishedAt, nowIso);
  const silent = silentDays !== null && silentDays > dormantAfterDays;

  if (pinIndex < 0) {
    return {
      level: "unpublished",
      pinned,
      newest: newest.version,
      gapCount: null,
      upstreamSilentDays: silentDays,
      reason: `pin '${pinned}' is not among the ${String(ordered.length)} published versions; it can never resolve`,
    };
  }

  const gapCount = ordered.length - 1 - pinIndex;

  if (gapCount === 0) {
    return {
      level: silent ? "dormant" : "current",
      pinned,
      newest: newest.version,
      gapCount: 0,
      upstreamSilentDays: silentDays,
      reason: silent
        ? `at the newest version, but upstream has published nothing for ${String(silentDays)} days — ` +
          "being current may mean upstream STOPPED, not that the pin is fresh"
        : "at the newest published version and upstream is still publishing",
    };
  }

  return {
    level: silent ? "behind-dormant" : "behind",
    pinned,
    newest: newest.version,
    gapCount,
    upstreamSilentDays: silentDays,
    reason: silent
      ? `${String(gapCount)} version(s) behind AND upstream silent for ${String(silentDays)} days`
      : `${String(gapCount)} version(s) behind; upstream is still publishing`,
  };
}

/** True when a verdict warrants attention beyond ordinary staleness. */
export function isSuspicious(v: CurrencyVerdict): boolean {
  return v.level === "dormant" || v.level === "behind-dormant" || v.level === "unpublished";
}

/**
 * Order two versions. Numeric-segment aware so `4.45.0` > `4.9.0`, which a plain
 * string sort gets wrong — and getting it wrong understates a gap, which is the
 * ACQUITTING direction.
 */
export function compareVersions(a: string, b: string): number {
  const seg = (s: string): (number | string)[] =>
    s.replace(/^v/, "").split(/[.\-+]/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const sa = seg(a);
  const sb = seg(b);
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const x = sa[i];
    const y = sb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === "number" && typeof y === "number") {
      if (x !== y) return x - y;
    } else {
      // ORDINAL, never locale-aware. A locale-sensitive compare orders versions
      // differently per machine and breaks byte-lock across the oracles.
      //
      // This block used to CALL `localeCompare` and then discard its result,
      // returning the ordinal `<` comparison anyway -- so the comment above it was
      // true of the returned value and false of the code, and the call did nothing
      // but sit there being culture-sensitive. The `collation` linter caught it.
      // JavaScript's `<` on strings is already UTF-16 code-unit order, which is the
      // ordinal comparison this wants.
      const sx = String(x);
      const sy = String(y);
      if (sx !== sy) return sx < sy ? -1 : 1;
    }
  }
  return 0;
}

/** Whole days from `fromIso` to `toIso`; negative clamped to 0. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}
