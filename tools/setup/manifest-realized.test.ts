// manifest-realized.test.ts — falsifiers for the "declared but not installed" check.
//
// The tests that matter here are NOT the happy path. They are the four ways this verifier
// could look like a check and be none:
//
//   1. reporting `absent` when the QUERY could not run (a missing brew would "find" 26
//      missing formulae and the remedy would be nonsense);
//   2. reporting `unknown` when the query DID run and found nothing (an empty index is a
//      real answer -- confusing it with null would make a bare machine pass);
//   3. exiting 0 while some row was never asked about;
//   4. drifting from `common/host-tier.sh`, which would invent drift on a slim host by
//      demanding `tier=standard` rows the installer correctly skipped.
//
// Every one of those has a test below, and the mutation log in the PR body records that
// each of them dies when the corresponding line is broken.

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MANIFESTS,
  detectTier,
  evaluate,
  parseManifest,
  renderHuman,
  tierRank,
  type HostPort,
  type ManifestName,
  type Tier,
} from "./manifest-realized";

const repoRoot = join(import.meta.dir, "..", "..");

/** A port with everything stubbed; each test overrides only what it is about. */
function port(over: Partial<HostPort> & { readonly texts?: Partial<Record<ManifestName, string>> } = {}): HostPort {
  const texts = over.texts ?? {};
  return {
    readManifest: over.readManifest ?? ((m) => texts[m] ?? null),
    installed: over.installed ?? (() => new Set<string>()),
    applicable: over.applicable ?? (() => Object.keys(texts) as ManifestName[]),
    notApplicableReason: over.notApplicableReason ?? (() => "stub"),
    hostTier: over.hostTier ?? (() => ({ tier: "full" as Tier, source: "detected" as const })),
  };
}

// ── parsing parity with the installers' awk ──────────────────────────────────

test("parse: strips inline comments and blank lines, keeps 1-based line numbers", () => {
  const { rows, errors } = parseManifest(
    "brew",
    ["# header", "", "p7zip  # cascade #4 audit", "  ollama  "].join("\n"),
  );
  expect(errors).toEqual([]);
  expect(rows.map((r) => [r.name, r.line])).toEqual([
    ["p7zip", 3],
    ["ollama", 4],
  ]);
});

test("parse: a token inside a trailing COMMENT is not a token — comments are stripped first", () => {
  // These manifests are mostly prose. The `#`-stripping is not cosmetic: without it a
  // sentence that merely MENTIONS `tier=` or `optional` silently re-grades the row, and
  // the row would still name the right package, so nothing else would notice.
  const brew = parseManifest("brew", "podman  # heavier than tier=full, see the note\n").rows[0];
  expect(brew?.name).toBe("podman");
  expect(brew?.tier).toBe("slim");

  const win = parseManifest("windows", "ollama  winget=Ollama.Ollama  # optional in a later round\n").rows[0];
  expect(win?.optional).toBe(false);
  expect(win?.candidates).toEqual(["ollama", "ollama.ollama"]);
});

test("parse: `tier=` is read and removed from the package name", () => {
  const { rows } = parseManifest("brew", "qemu tier=standard\nmtools\n");
  expect(rows.map((r) => [r.name, r.tier])).toEqual([
    ["qemu", "standard"],
    ["mtools", "slim"],
  ]);
});

test("parse: an UNKNOWN tier is an error, never a silent downgrade to slim", () => {
  // The shell's zeta_tier_rank dies loudly on this. Defaulting to slim here would install
  // on every host a row whose author meant to gate it -- silent, and in the expensive
  // direction.
  const { rows, errors } = parseManifest("apt", "agda tier=huge\n");
  expect(rows).toEqual([]);
  expect(errors).toHaveLength(1);
  expect(errors[0]?.reason).toContain("unknown tier 'huge'");
});

test("parse: a row that is ONLY a tier token is an error, not a package named ''", () => {
  const { rows, errors } = parseManifest("brew", "tier=full\n");
  expect(rows).toEqual([]);
  expect(errors[0]?.reason).toContain("no package name");
});

test("parse: windows rows carry scoop + winget + choco ids as alternatives", () => {
  const { rows } = parseManifest("windows", "git    winget=Git.Git    choco=git\n");
  expect(rows[0]?.name).toBe("git");
  expect(rows[0]?.candidates).toEqual(["git", "git.git", "git"]);
});

test("parse: the windows `optional` token is recognised, and only on windows", () => {
  expect(parseManifest("windows", "tectonic    optional\n").rows[0]?.optional).toBe(true);
  // `optional` is not a token in the brew grammar; a brew row is never best-effort.
  expect(parseManifest("brew", "tectonic optional\n").rows[0]?.optional).toBe(false);
});

// ── tier parity with tools/setup/common/host-tier.sh ─────────────────────────

test("tier: rank order and loud refusal match zeta_tier_rank", () => {
  expect([tierRank("slim"), tierRank("standard"), tierRank("full")]).toEqual([0, 1, 2]);
  expect(() => tierRank("enormous")).toThrow(/unknown tier/);
});

test("tier: detection thresholds are the shell's, at the exact boundaries", () => {
  const GiB = 1024 ** 3;
  expect(detectTier(16 * GiB)).toBe("full");
  expect(detectTier(16 * GiB - 1)).toBe("standard");
  expect(detectTier(8 * GiB)).toBe("standard");
  expect(detectTier(8 * GiB - 1)).toBe("slim");
  // "unknown hardware: degrade to the permissive default, never silently slim"
  expect(detectTier(0)).toBe("full");
  expect(detectTier(Number.NaN)).toBe("full");
});

test("tier: a row above the host tier is skipped-by-tier, NOT absent", () => {
  const r = evaluate(
    port({
      texts: { brew: "qemu tier=standard\n" },
      installed: () => new Set<string>(),
      hostTier: () => ({ tier: "slim", source: "declared" }),
    }),
  );
  expect(r.verdicts[0]?.verdict).toBe("skipped-by-tier");
  expect(r.absent).toEqual([]);
  expect(r.exitCode).toBe(0);
});

// ── THE VACUITY GUARDS ───────────────────────────────────────────────────────

test("VACUITY 1: a query that could NOT run yields `unknown` and exit 2 — never `absent`", () => {
  const r = evaluate(port({ texts: { brew: "opensc\npam-reattach\n" }, installed: () => null }));
  expect(r.verdicts.map((v) => v.verdict)).toEqual(["unknown", "unknown"]);
  expect(r.absent).toEqual([]);
  expect(r.exitCode).toBe(2);
  expect(renderHuman(r)).toContain("This is NOT a pass and NOT a");
});

test("VACUITY 2: an EMPTY index is a real answer — the rows are absent, exit 1", () => {
  // The distinction null-vs-empty is the whole difference between "brew is missing" and
  // "brew is here and has nothing installed". Collapsing them either way breaks a host.
  const r = evaluate(port({ texts: { brew: "opensc\n" }, installed: () => new Set<string>() }));
  expect(r.verdicts[0]?.verdict).toBe("absent");
  expect(r.exitCode).toBe(1);
});

test("VACUITY 3: exit 0 requires that EVERY applicable row was resolved", () => {
  // One present row and one unasked row must not add up to a green.
  const r = evaluate(
    port({
      texts: { brew: "opensc\n", "brew-cask": "yubihsm2-sdk\n" },
      installed: (m) => (m === "brew" ? new Set(["opensc"]) : null),
    }),
  );
  expect(r.absent).toEqual([]);
  expect(r.unknown).toHaveLength(1);
  expect(r.exitCode).toBe(2);
});

test("VACUITY 4: a host that owns NO manifest exits 2, never 0", () => {
  const r = evaluate(port({ texts: {}, applicable: () => [] }));
  expect(r.verdicts).toEqual([]);
  expect(r.exitCode).toBe(2);
  expect(renderHuman(r)).toContain("CHECK DID NOT RUN");
});

test("VACUITY 5: an unreadable-but-applicable manifest is an error, not zero rows passing", () => {
  const r = evaluate(port({ readManifest: () => null, applicable: () => ["brew"] }));
  expect(r.errors).toHaveLength(1);
  expect(r.exitCode).toBe(2);
});

test("a positive finding outranks an unresolved one: absent + unknown exits 1 and names both", () => {
  const r = evaluate(
    port({
      texts: { brew: "opensc\n", "brew-cask": "yubihsm2-sdk\n" },
      installed: (m) => (m === "brew" ? new Set<string>() : null),
    }),
  );
  expect(r.exitCode).toBe(1);
  expect(r.absent).toHaveLength(1);
  expect(r.unknown).toHaveLength(1);
  const text = renderHuman(r);
  expect(text).toContain("DECLARED AND ABSENT");
  expect(text).toContain("UNKNOWN");
});

// ── verdicts ─────────────────────────────────────────────────────────────────

test("present: any one of a windows row's three resolver ids satisfies it", () => {
  const r = evaluate(
    port({ texts: { windows: "git winget=Git.Git choco=git\n" }, installed: () => new Set(["git.git"]) }),
  );
  expect(r.verdicts[0]?.verdict).toBe("present");
  expect(r.exitCode).toBe(0);
});

test("an `optional` windows row that is absent warns and does NOT fail the check", () => {
  const r = evaluate(port({ texts: { windows: "tectonic optional\n" }, installed: () => new Set<string>() }));
  expect(r.verdicts[0]?.verdict).toBe("absent-optional");
  expect(r.absent).toEqual([]);
  expect(r.exitCode).toBe(0);
  expect(renderHuman(r)).toContain("ABSENT BUT OPTIONAL");
});

test("the remedy names the right installer per manifest, and never runs it", () => {
  const r = evaluate(
    port({
      texts: { brew: "zig\n", "brew-cask": "yubihsm2-sdk\n" },
      installed: () => new Set<string>(),
    }),
  );
  const text = renderHuman(r);
  expect(text).toContain("brew install zig");
  expect(text).toContain("brew install --cask yubihsm2-sdk");
  expect(text).toContain("never installs anything");
});

// ── against the REAL manifests (repo-only; this half runs anywhere) ───────────

test("every real manifest parses with zero errors under the installers' grammar", () => {
  for (const m of MANIFESTS) {
    const text = readFileSync(join(repoRoot, "tools", "setup", "manifests", m), "utf8");
    const { rows, errors } = parseManifest(m, text);
    expect({ m, errors }).toEqual({ m, errors: [] });
    expect(rows.length).toBeGreaterThan(0);
  }
});

test("the smartcard rows this check was built for are still declared", () => {
  // Same shape as touchid-sudo-config.ts's `reattachDeclared`: deleting the row must fail a
  // test rather than silently downgrade the check to a no-op. `opensc` is here because its
  // declared-and-absent state is what produced a week of false diagnosis.
  const brew = readFileSync(join(repoRoot, "tools", "setup", "manifests", "brew"), "utf8");
  const names = parseManifest("brew", brew).rows.map((r) => r.name);
  expect(names).toContain("opensc");
  expect(names).toContain("pam-reattach");
  expect(names).toContain("ykman");
});
