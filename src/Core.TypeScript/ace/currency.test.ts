// The falsifiers for `ace currency`.
//
// The property that matters is NOT "does it compute a gap" — it is that a pin at the
// newest version is NOT reported healthy when upstream has stopped publishing. That
// is the minio case, and a currency tool that gets it wrong is worse than none: it
// manufactures confidence about the most dangerous dependency in the tree.

import { describe, expect, test } from "bun:test";
import {
  compareVersions,
  currencyVerdict,
  daysBetween,
  isSuspicious,
  DORMANT_AFTER_DAYS,
  type PublishedVersion,
} from "./currency.ts";
import { normalizeDockerHubRepo } from "./currency-registries.ts";

const NOW = "2026-09-01T00:00:00Z";
const v = (version: string, publishedAt: string | null = null): PublishedVersion => ({ version, publishedAt });

describe("the minio case — at newest, because upstream stopped", () => {
  // The real shape: minio's chart was the ONLY pin not behind, and only because
  // upstream archived the repository.
  const archived = [v("1.0.0", "2024-01-01T00:00:00Z"), v("2.0.0", "2025-01-01T00:00:00Z")];

  test("a pin at the newest version of a DEAD upstream is `dormant`, never `current`", () => {
    const verdict = currencyVerdict("2.0.0", archived, NOW);
    expect(verdict.level).toBe("dormant");
    expect(verdict.gapCount).toBe(0);
    expect(isSuspicious(verdict)).toBe(true);
  });

  test("...and a gap-only reading would have called it the HEALTHIEST pin", () => {
    // The mutant: judge by gapCount alone, which is the bug this module exists to
    // avoid. It reports the archived dependency as perfect.
    const verdict = currencyVerdict("2.0.0", archived, NOW);
    const gapOnlyVerdict = verdict.gapCount === 0 ? "healthy" : "behind";
    expect(gapOnlyVerdict).toBe("healthy"); // <- the wrong answer, demonstrated
    expect(verdict.level).not.toBe("current"); // <- what this module says instead
  });

  test("the SAME pin against a live upstream is `current`", () => {
    // Controls the test above: the only variable changed is the publish date, so the
    // dormant verdict is attributable to upstream silence and to nothing else.
    const live = [v("1.0.0", "2024-01-01T00:00:00Z"), v("2.0.0", "2026-08-25T00:00:00Z")];
    expect(currencyVerdict("2.0.0", live, NOW).level).toBe("current");
  });

  test("behind AND silent is its own class, worse than either", () => {
    expect(currencyVerdict("1.0.0", archived, NOW).level).toBe("behind-dormant");
  });
});

describe("a failed probe is UNKNOWN, never a pass", () => {
  test("null (unreachable) does not read as current", () => {
    const verdict = currencyVerdict("1.0.0", null, NOW);
    expect(verdict.level).toBe("unreachable");
    expect(verdict.level).not.toBe("current");
    expect(verdict.reason).toContain("UNKNOWN");
  });

  test("an empty version list is `unpublished`, not `current`", () => {
    expect(currencyVerdict("1.0.0", [], NOW).level).toBe("unpublished");
  });

  test("a pin upstream never published can never resolve, and says so", () => {
    const verdict = currencyVerdict("9.9.9", [v("1.0.0"), v("2.0.0")], NOW);
    expect(verdict.level).toBe("unpublished");
    expect(verdict.reason).toContain("never resolve");
  });
});

describe("dates absent means dormancy UNKNOWN, not dormancy false", () => {
  test("a registry with no publish dates yields null silent-days and does not claim `dormant`", () => {
    // NuGet and the OCI distribution API carry no dates. Reporting "not dormant"
    // from an absent date would be inventing a measurement.
    const verdict = currencyVerdict("2.0.0", [v("1.0.0"), v("2.0.0")], NOW);
    expect(verdict.upstreamSilentDays).toBeNull();
    expect(verdict.level).toBe("current");
  });
});

describe("version ordering — getting this wrong understates the gap, the ACQUITTING direction", () => {
  test("numeric segments beat string sort", () => {
    expect(compareVersions("4.45.0", "4.9.0")).toBeGreaterThan(0);
    // the mutant this guards: a plain string sort says 4.45.0 < 4.9.0
    expect("4.45.0" < "4.9.0").toBe(true);
  });

  test("a real gap is counted correctly under numeric ordering", () => {
    const published = ["4.9.0", "4.33.0", "4.40.0", "4.45.0"].map((s) => v(s));
    const verdict = currencyVerdict("4.33.0", published, NOW);
    expect(verdict.newest).toBe("4.45.0");
    expect(verdict.gapCount).toBe(2);
  });

  test("a leading v is tolerated", () => {
    expect(compareVersions("v1.21.1", "v1.16.2")).toBeGreaterThan(0);
  });
});

describe("the dormancy threshold is a real boundary", () => {
  const at = (days: number) => {
    const ms = Date.parse(NOW) - days * 86_400_000;
    return [v("1.0.0", new Date(ms).toISOString())];
  };
  test("just inside the threshold is current", () => {
    expect(currencyVerdict("1.0.0", at(DORMANT_AFTER_DAYS - 1), NOW).level).toBe("current");
  });
  test("just outside it is dormant", () => {
    expect(currencyVerdict("1.0.0", at(DORMANT_AFTER_DAYS + 1), NOW).level).toBe("dormant");
  });
});

describe("time is injected, never ambient", () => {
  test("the same inputs give the same verdict for a fixed now — replayable", () => {
    const published = [v("1.0.0", "2020-01-01T00:00:00Z")];
    const a = currencyVerdict("1.0.0", published, NOW);
    const b = currencyVerdict("1.0.0", published, NOW);
    expect(a).toEqual(b);
  });
  test("and a DIFFERENT now changes it — so the parameter is load-bearing, not decorative", () => {
    const published = [v("1.0.0", "2026-08-01T00:00:00Z")];
    expect(currencyVerdict("1.0.0", published, "2026-09-01T00:00:00Z").level).toBe("current");
    expect(currencyVerdict("1.0.0", published, "2028-09-01T00:00:00Z").level).toBe("dormant");
  });
});

describe("docker hub coordinate normalisation", () => {
  test("official images get the library/ prefix", () => {
    expect(normalizeDockerHubRepo("redis")).toBe("library/redis");
  });
  test("namespaced images do not", () => {
    expect(normalizeDockerHubRepo("bitnamilegacy/redis")).toBe("bitnamilegacy/redis");
  });
  test("the docker.io host prefix is stripped", () => {
    expect(normalizeDockerHubRepo("docker.io/bitnamilegacy/redis")).toBe("bitnamilegacy/redis");
  });
});

describe("daysBetween", () => {
  test("counts whole days", () => {
    expect(daysBetween("2026-08-01T00:00:00Z", "2026-09-01T00:00:00Z")).toBe(31);
  });
  test("an unparseable date yields 0 rather than NaN — NaN would silently defeat every comparison", () => {
    expect(daysBetween("not-a-date", NOW)).toBe(0);
  });
});
