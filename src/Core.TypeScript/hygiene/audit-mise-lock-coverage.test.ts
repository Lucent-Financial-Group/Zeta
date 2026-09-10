// audit-mise-lock-coverage.test.ts — the refusals, which are the half that matters.
//
// A coverage audit that has only ever been shown to PASS is the vacuity class: it cannot
// tell a working check from an absent one. Every case here mutates the audit's subject and
// asserts the audit CONVICTS, and the mutations are the four drifts that were measured to
// be possible on 2026-09-10 rather than four invented ones:
//
//   1. `locked = true` deleted from `.mise.toml`      -> the lockfile silently self-heals
//   2. a config pin bumped without a re-lock          -> the committed digest describes the old artifact
//   3. a platform row dropped from the lockfile       -> invisible in 600 lines of generated TOML
//   4. an UNLOCKABLE_BACKENDS entry gone stale        -> the exemption roster grows without a diff
//
// Plus the parser cases, because a parser that silently skips a declaration form reports
// FULL coverage for a tool it never looked at — the same defect wearing a green tick.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkLockedSettingPresent,
  checkPair,
  PAIRS,
  parseConfigTools,
  parseLock,
  REQUIRED_PLATFORMS,
  UNLOCKABLE_BACKENDS,
  versionSatisfies,
} from "./audit-mise-lock-coverage.ts";

const ROOT = join(import.meta.dir, "..", "..", "..");

/** Indexed once, so `noUncheckedIndexedAccess` does not spread `?? ` through every case. */
const BASE_PAIR = PAIRS[0] as { readonly config: string; readonly lock: string };
const FULL_PAIR = PAIRS[1] as { readonly config: string; readonly lock: string };
const read = (p: string): string => readFileSync(join(ROOT, p), "utf8");

const failures = (fs: readonly { ok: boolean; message: string }[]): string[] =>
  fs.filter((f) => !f.ok).map((f) => f.message);

/** A minimal but REAL-SHAPED pair: one lockable tool, one roster tool, one fuzzy pin. */
const CONFIG = `min_version = "2026.6.12"

[tools]
zig = "0.13.0"
node = "24"
rust = { version = "1.99.0-beta.3", components = ["rustfmt"] }

[settings]
locked = true
python.compile = false
`;

const platformBlock = (tool: string, plat: string, digest: string): string =>
  `[tools.${tool}."platforms.${plat}"]\nchecksum = "sha256:${digest}"\nurl = "https://example.invalid/${tool}-${plat}"\n`;

const lockFor = (tool: string, version: string, platforms: readonly string[]): string =>
  `[[tools.${tool}]]\nversion = "${version}"\nbackend = "core:${tool}"\n\n` +
  platforms.map((p, i) => platformBlock(tool, p, String(i).repeat(64))).join("\n");

const LOCK =
  "# @generated\n\nlockfile_version = 1\n\n" +
  lockFor("zig", "0.13.0", REQUIRED_PLATFORMS) +
  "\n" +
  lockFor("node", "24.16.0", REQUIRED_PLATFORMS) +
  '\n[[tools.rust]]\nversion = "1.99.0-beta.3"\nbackend = "core:rust"\n\n[tools.rust.options]\ncomponents = "rustfmt"\n';

describe("the audit passes on a correct pair (the control)", () => {
  test("no findings against the synthetic tree", () => {
    // Scoped to the full-tier label so the base-tier roster-completeness rule (which
    // demands every UNLOCKABLE_BACKENDS name be declared) does not apply to this fixture.
    expect(failures(checkPair(FULL_PAIR.config, CONFIG, LOCK))).toEqual([]);
  });

  test("and on the REAL tree — a fixture-only suite would survive a rename", () => {
    const findings = [checkLockedSettingPresent(read(".mise.toml"))];
    for (const p of PAIRS) findings.push(...checkPair(p.config, read(p.config), read(p.lock)));
    expect(failures(findings)).toEqual([]);
  });
});

describe("1. `locked = true` is what makes the lockfile a lock", () => {
  test("its absence convicts", () => {
    const f = checkLockedSettingPresent("[settings]\npython.compile = false\n");
    expect(f.ok).toBe(false);
    expect(f.message).toContain("repairs itself is not a lock");
  });

  test("`locked = false` convicts too — the word being present is not the check", () => {
    expect(checkLockedSettingPresent("[settings]\nlocked = false\n").ok).toBe(false);
  });

  test("a `locked = true` in a COMMENT does not satisfy it", () => {
    expect(checkLockedSettingPresent("[settings]\n# locked = true\n").ok).toBe(false);
  });

  test("the real .mise.toml satisfies it", () => {
    expect(checkLockedSettingPresent(read(".mise.toml")).ok).toBe(true);
  });
});

describe("2. a pin bumped without a re-lock", () => {
  test("convicts, and the message names both versions", () => {
    const bumped = CONFIG.replace('zig = "0.13.0"', 'zig = "0.14.0"');
    const msgs = failures(checkPair(FULL_PAIR.config, bumped, LOCK));
    expect(msgs).toHaveLength(1);
    const only = msgs[0] ?? "";
    expect(only).toContain("zig");
    expect(only).toContain('"0.14.0"');
    expect(only).toContain('"0.13.0"');
  });

  test("a tool declared but wholly absent from the lockfile convicts", () => {
    const extra = CONFIG.replace('zig = "0.13.0"', 'zig = "0.13.0"\nshellcheck = "0.11.0"');
    expect(failures(checkPair(FULL_PAIR.config, extra, LOCK)).join(" ")).toContain("shellcheck");
  });

  test("a FUZZY pin is satisfied by the version mise resolved it to", () => {
    expect(versionSatisfies("24", "24.16.0")).toBe(true);
    expect(versionSatisfies("1.3", "1.3.14")).toBe(true);
    expect(versionSatisfies("0.13.0", "0.13.0")).toBe(true);
  });

  test("and NOT by one that merely shares a prefix — the dot boundary is the check", () => {
    expect(versionSatisfies("24", "240.1.0")).toBe(false);
    expect(versionSatisfies("1.3", "1.30.0")).toBe(false);
  });
});

describe("3. a platform silently losing its digest", () => {
  for (const plat of REQUIRED_PLATFORMS) {
    test(`dropping the ${plat} row convicts`, () => {
      const stripped = LOCK.split("\n\n")
        .filter((p) => !p.includes(`tools.zig."platforms.${plat}"`))
        .join("\n\n");
      const msgs = failures(checkPair(FULL_PAIR.config, CONFIG, stripped));
      expect(msgs.join(" ")).toContain(plat);
    });
  }

  test("a platform row present but with NO checksum convicts — a URL is not a digest", () => {
    const noDigest = LOCK.replace(/checksum = "sha256:0{64}"\n/, "");
    expect(failures(checkPair(FULL_PAIR.config, CONFIG, noDigest)).join(" ")).toContain("NO committed digest");
  });
});

describe("4. the exemption roster can shrink, never grow", () => {
  test("a roster tool that has BECOME lockable convicts, so the exemption cannot outlive its reason", () => {
    const nowLocked = `${LOCK}\n${lockFor("rust", "1.99.0-beta.3", REQUIRED_PLATFORMS)}`;
    const msgs = failures(checkPair(FULL_PAIR.config, CONFIG, nowLocked));
    expect(msgs.join(" ")).toContain("the exemption is stale");
  });

  test("a roster entry naming a tool nothing declares convicts on the base pair", () => {
    // Every UNLOCKABLE_BACKENDS name must still be declared in `.mise.toml`; drop one and
    // the base-tier pair must notice. Uses the real config with one line removed.
    const name = Object.keys(UNLOCKABLE_BACKENDS)[0] ?? "";
    const withoutIt = read(".mise.toml")
      .split("\n")
      .filter((l) => !new RegExp(`^"?${name}"?\\s*=`).test(l.trim()))
      .join("\n");
    const msgs = failures(checkPair(BASE_PAIR.config, withoutIt, read("mise.lock")));
    expect(msgs.join(" ")).toContain("stale roster entry");
  });
});

describe("the parsers see what mise actually writes", () => {
  test("both config declaration forms — a skipped inline table would report false coverage", () => {
    const tools = parseConfigTools(CONFIG);
    expect(tools["zig"]).toBe("0.13.0");
    expect(tools["rust"]).toBe("1.99.0-beta.3");
  });

  test("quoted, colon-bearing backend names round-trip", () => {
    const tools = parseConfigTools('[tools]\n"pipx:ruff" = "0.16.5"\n"github:yannh/kubeconform" = "0.7.0"\n');
    expect(tools["pipx:ruff"]).toBe("0.16.5");
    expect(tools["github:yannh/kubeconform"]).toBe("0.7.0");
  });

  test("`[tools.<x>.options]` is not mistaken for a platform row", () => {
    const rust = parseLock(LOCK)["rust"];
    expect(rust).toBeDefined();
    expect(rust?.versions).toEqual(["1.99.0-beta.3"]);
    expect(Object.keys(rust?.platforms ?? {})).toEqual([]);
  });

  test("the REAL lockfile parses to the tools the REAL config declares", () => {
    const declared = Object.keys(parseConfigTools(read(".mise.toml")));
    const locked = parseLock(read("mise.lock"));
    expect(declared.length).toBeGreaterThan(10);
    for (const name of declared) expect(locked[name]).toBeDefined();
  });

  test("a config with an empty [tools] table convicts rather than reporting success", () => {
    expect(failures(checkPair("fixture", "[tools]\n[settings]\n", LOCK)).join(" ")).toContain("ZERO tools");
  });
});
