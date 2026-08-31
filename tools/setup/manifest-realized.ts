#!/usr/bin/env bun
// manifest-realized.ts — is every DECLARED package actually INSTALLED on THIS host?
//
// THE GAP THIS CLOSES
// -------------------
// `tools/setup/manifests/README.md` ends with the sentence "A declaration that nothing
// checks is not a declaration", and then names exactly ONE row that is checked:
// `pam-reattach`, whose absence `touchid-sudo-config.ts` turns red via `reattachDeclared`.
// Twenty-five other brew rows, thirty-five apt rows and fourteen windows rows had nothing.
//
// The declaration side already has falsifiers -- `ci/manifest-symmetry.test.ts` refuses an
// apt/brew tool with no Windows disposition, `ci/apt-manifest-host-tier.test.ts` refuses a
// malformed tier token, `hygiene/audit-install-tier-declared.ts` refuses a silent tier.
// Every one of them checks the TEXT. Nothing checked the HOST. So the manifests were a
// well-audited wish list, and whether any of it was true of a running machine was a
// question no artifact asked.
//
// MEASURED ON THE MAINTAINER'S HOST, 2026-08-31 (the reason this file exists)
// --------------------------------------------------------------------------
// Ten of the twenty-six `manifests/brew` rows were declared and NOT installed:
//
//   tectonic  headscale-cli  tailscale  wabt  lua  binaryen  zig
//   yubico-piv-tool  opensc  pam-reattach
//
// `opensc` is the expensive one. A week of smartcard work proceeded on the belief that
// the maintainer's SmartCard-HSM was invisible to the OS -- a belief formed from an empty
// `security list-smartcards` and never controlled against `opensc-tool --list-readers`,
// BECAUSE OPENSC WAS NOT INSTALLED. It was declared. Installing it took nine seconds and
// the reader enumerated immediately, with a card present, on the stock Apple driver. The
// missing row did not merely fail to help; it manufactured a false diagnosis and held it
// for a week.
//
// WHY THIS IS DRIFT AND NOT A BROKEN INSTALLER -- the mechanism, measured
// ----------------------------------------------------------------------
// The obvious theory is that `macos.sh` aborted partway. It did not, and the receipts
// refute it. `brew`'s `INSTALL_RECEIPT.json` carries `installed_on_request` and an mtime:
//
//   2026-06-08  tectonic row added        -> ABSENT today
//   2026-06-10  headscale-cli/tailscale   -> ABSENT today
//   2026-06-21  ollama, podman, r, pandoc, eprover installed, all on_request=true
//
// Rows added on 06-08 and 06-10 sit ABOVE rows installed on 06-21 in the same manifest,
// in an order `git show` confirms was the same then. A `set -euo pipefail` loop cannot
// skip three entries and continue. What actually happened is that each PR author
// installed the rows THEIR PR added, on THEIR host, and no host ever re-ran the sweep.
//
// So the failure mode is TIME, not logic: the manifest gains rows continuously and every
// host satisfies only the subset that landed while someone was looking at it. Divergence
// is monotone and silent, and no amount of care inside `macos.sh` prevents it.
//
// WHY THIS IS HOST-ONLY, AND WHY CI CANNOT SUBSTITUTE -- stated so nobody re-litigates it
// ---------------------------------------------------------------------------------------
// Three separable claims hide inside "the manifest is satisfied", and they do NOT share a
// home:
//
//   (A) WELL-FORMEDNESS  -- the row parses, its tier token is one of three values.
//       Repo-only, free, already covered by the tests named above. CI, correctly.
//
//   (B) RESOLVABILITY    -- the name exists in some tap/index upstream.
//       Reaches outside the repo, so a schedule can catch drift a path filter cannot.
//       NOT covered here, and worth saying plainly: it would NOT have caught the case
//       above. All ten absent names resolve. `brew info --formula` returns 0 for every
//       one of them. Measured, not assumed -- a resolvability check landed today would
//       have gone green and taught us nothing.
//
//   (C) REALIZATION      -- it is installed HERE, NOW.  <-- this file
//
// On a hosted runner (C) is very close to tautological, because the runner installed from
// this manifest four minutes ago and has no history to drift from. DRIFT REQUIRES
// PERSISTENCE, AND CI RUNNERS ARE AMNESIAC BY CONSTRUCTION. A cron that provisions a fresh
// machine and then asks whether the fresh machine is provisioned is the vacuity class with
// a schedule attached: it cannot fail for the reason we care about, and its green would be
// read as "the fleet's hosts are in sync", which it never measured.
//
// There IS one honest CI use, and it is a different question: run this IMMEDIATELY AFTER
// `install.sh` in the install-shield workflows and it stops being "is the host in sync"
// and becomes "did the loop you just ran satisfy the rows it claimed to". That is a real
// cross-check because the two sides are independent implementations -- an `awk` parse plus
// `brew install` on one side, a TypeScript parse plus `brew list` on the other -- so a row
// the loop silently skips, or a formula whose install name differs from its list name,
// fails. `macos-install-sh-test.yml` carries that step. It is honestly weaker than the
// host check and is not a replacement for it.
//
// "REALIZED BY ITS DECLARED MECHANISM", NOT "A BINARY BY THAT NAME EXISTS SOMEWHERE"
// -----------------------------------------------------------------------------------
// This distinction is not pedantry; it was found by the check's first run and it is the
// reason a `present` here means something. On the maintainer's host, 2026-08-31:
//
//   manifests/brew-cask declares `yubihsm2-sdk`         -> `brew list --cask` does NOT have it
//   /usr/local/bin/yubihsm-shell                        -> EXISTS, reports 2.7.3
//   pkgutil --pkg-info com.yubico.yubihsm2-sdk          -> receipt, `version: 0`,
//                                                          install-time 2026-08-18T19:22:02Z
//   the cask row was added                                 2026-08-20
//
// So the SDK was hand-installed from a downloaded `.pkg` two days BEFORE a PR wrote the
// row that was meant to make it reproducible -- and no host ever realized the row. The
// tool works. The declaration is still false, and the check is right to say so, because
// what the row promises is not "a file exists" but: brew knows the version, `brew upgrade`
// advances it, `brew uninstall` removes it, and a FRESH CLONE ON A FRESH MACHINE gets it.
// A hand-placed artifact satisfies none of those. (`version: 0` is itself the tell -- the
// receipt carries no version, so nothing on the host can say what is installed.)
//
// This is `doctor.sh`'s own origin story repeating: it was born after "Aaron noted his jars
// ended up in random locations before install.sh existed". Same drift, new decade, and
// nothing had been watching the package layer for it.
//
// The honest limit, stated so a reader is not surprised: a row whose artifact is present by
// another route reports ABSENT. That is the intended reading, not a false positive -- but
// it does mean a red here is sometimes "wrong provenance" rather than "missing tool", and
// the remedy line (`brew install --cask ...`) is still the right fix for both.
//
// WHAT THIS FILE REFUSES TO DO
// ----------------------------
// It NEVER INSTALLS ANYTHING. It is a read-only falsifier; the remedy it prints is a
// command a human or a setup run performs. A verifier that repairs what it measures cannot
// report a red, and its green would mean "I fixed it just now", not "it was true".
//
// A PROBE THAT COULD NOT RUN IS `unknown`, NEVER `absent`
// -------------------------------------------------------
// `brew` missing from PATH does not mean twenty-six formulae are missing; it means the
// question was not asked. Those rows report `unknown` and the process exits 2 -- the
// "check that did not run" code, distinct from 1 ("check ran and found drift") and from 0.
// Exit 0 requires every applicable row to have been RESOLVED and none to be absent.
// (`.claude/rules/rest-is-the-default-transport-*.md`: a failed probe is `unknown`, never
// a negative result. `memory/exit-code-2-is-a-check-that-never-ran-*`.)
//
// TIER PARITY IS LOAD-BEARING
// ---------------------------
// A `tier=standard` row on a slim host is CORRECTLY absent. This file resolves
// `ZETA_HOST_TIER` by the same rule as `common/host-tier.sh` (declared wins; else >=16 GiB
// full, >=8 GiB standard, else slim; unknown memory degrades to full) and reports such
// rows as `skipped-by-tier`. If that rule ever diverges from the shell, this verifier
// invents drift that is not there -- which is why `manifest-realized.test.ts` pins the
// thresholds against the shell's own numbers.
//
// SCOPE: the four OS-NATIVE manifests only -- brew, brew-cask, apt, windows. The fifteen
// `from-*` manifests are realized by `ace-realize`, which owns their idempotency and their
// verification; duplicating it here would create a second, drifting opinion about what
// "installed" means for fifteen different mechanisms.
//
// Rule 0 (`.claude/rules.bak/rule-0-no-sh-files.md`): TypeScript, not `.sh`.
//
// Usage:
//   bun tools/setup/manifest-realized.ts            # human output
//   bun tools/setup/manifest-realized.ts --json     # machine-readable
//
// Exit codes:
//   0  every applicable row was resolved, and none is absent
//   1  at least one required row is DECLARED AND ABSENT
//   2  the check could not run (no package manager, unreadable manifest, unknown tier)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { totalmem } from "node:os";
import { resolve } from "node:path";

export const DRIFT_CLASS = "AH004";

// ── the manifest model ───────────────────────────────────────────────────────

export const TIERS = ["slim", "standard", "full"] as const;
export type Tier = (typeof TIERS)[number];

/** Rank parity with `zeta_tier_rank` in tools/setup/common/host-tier.sh. */
export function tierRank(tier: string): number {
  const i = (TIERS as readonly string[]).indexOf(tier);
  if (i < 0) throw new Error(`unknown tier '${tier}' (slim|standard|full)`);
  return i;
}

export const MANIFESTS = ["brew", "brew-cask", "apt", "windows"] as const;
export type ManifestName = (typeof MANIFESTS)[number];

export interface Row {
  readonly manifest: ManifestName;
  /** 1-based line number in the manifest, so a finding is clickable. */
  readonly line: number;
  /** The primary package id -- the first token after `tier=` tokens are stripped. */
  readonly name: string;
  /**
   * Every id this row may be satisfied by, lowercased. For brew/apt that is just
   * `[name]`; for windows it is the scoop id plus any `winget=`/`choco=` override,
   * because install.ps1 resolves scoop -> winget -> chocolatey and any of the three
   * satisfies the declaration.
   */
  readonly candidates: readonly string[];
  readonly tier: Tier;
  /** manifests/windows `optional` token: install.ps1 warns and continues. */
  readonly optional: boolean;
}

export interface ParseError {
  readonly manifest: ManifestName;
  readonly line: number;
  readonly raw: string;
  readonly reason: string;
}

/**
 * Parse a manifest the way the installers do.
 *
 * Parity contract with `macos.sh` / `linux.sh` / `common/host-tier.sh`, which is the whole
 * reason this function is written out longhand instead of using a tidier regex:
 *
 *     awk '{ sub(/#.*$/, ""); gsub(/^[[:space:]]+|[[:space:]]+$/, "") } NF > 0 { print }'
 *
 * then `zeta_strip_tier` (drop every `tier=` token, rejoin) then `awk '{print $1}'`.
 * Note `sub(/#.*$/, "")` strips from the FIRST `#` to end of line -- there is no escaping,
 * which is the 2026-05-26 `p7zip  # cascade #4 audit` bug's actual shape and why a row may
 * never contain a `#` inside a value.
 */
export function parseManifest(
  manifest: ManifestName,
  text: string,
): { readonly rows: readonly Row[]; readonly errors: readonly ParseError[] } {
  const rows: Row[] = [];
  const errors: ParseError[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const stripped = raw.replace(/#.*$/, "").trim();
    if (stripped.length === 0) continue;
    const tokens = stripped.split(/\s+/).filter((t) => t.length > 0);

    let tier: Tier = "slim";
    let tierBad: string | null = null;
    const kept: string[] = [];
    for (const token of tokens) {
      if (token.startsWith("tier=")) {
        const value = token.slice("tier=".length);
        if ((TIERS as readonly string[]).includes(value)) tier = value as Tier;
        else tierBad = value;
        continue;
      }
      kept.push(token);
    }

    const name = kept[0];
    if (name === undefined) {
      errors.push({ manifest, line: i + 1, raw, reason: "row has a tier= token and no package name" });
      continue;
    }
    if (tierBad !== null) {
      // Loud, exactly like the shell's `zeta_tier_rank` which dies on an unknown tier.
      // Silently defaulting to slim would install a row the author meant to gate.
      errors.push({ manifest, line: i + 1, raw, reason: `unknown tier '${tierBad}' (slim|standard|full)` });
      continue;
    }

    const optional = manifest === "windows" && kept.includes("optional");
    const candidates =
      manifest === "windows"
        ? [
            name,
            ...kept.flatMap((t) =>
              t.startsWith("winget=") || t.startsWith("choco=") ? [t.slice(t.indexOf("=") + 1)] : [],
            ),
          ]
        : [name];

    rows.push({
      manifest,
      line: i + 1,
      name,
      candidates: candidates.map((c) => c.toLowerCase()),
      tier,
      optional,
    });
  }
  return { rows, errors };
}

// ── the verdict model ────────────────────────────────────────────────────────

export type Verdict = "present" | "absent" | "absent-optional" | "skipped-by-tier" | "unknown";

export interface RowVerdict {
  readonly row: Row;
  readonly verdict: Verdict;
  readonly detail: string;
}

export interface Report {
  readonly hostTier: Tier;
  readonly hostTierSource: "declared" | "detected";
  readonly applicable: readonly ManifestName[];
  /** Manifests this host does not own, with the reason -- NOT counted as absent. */
  readonly notApplicable: readonly { readonly manifest: ManifestName; readonly reason: string }[];
  readonly verdicts: readonly RowVerdict[];
  readonly errors: readonly ParseError[];
  readonly absent: readonly RowVerdict[];
  readonly absentOptional: readonly RowVerdict[];
  readonly unknown: readonly RowVerdict[];
  readonly exitCode: 0 | 1 | 2;
}

/**
 * The host port. Everything that touches the machine goes through here so the whole
 * decision procedure is testable without a machine (and so a test cannot accidentally
 * shell out). `installed` is BATCHED on purpose: one `brew list --formula` instead of
 * twenty-six `brew list --formula <name>` calls -- same answer, ~26x cheaper, and it is
 * the only reason this is cheap enough to run from `doctor.sh` unconditionally.
 */
export interface HostPort {
  readManifest(manifest: ManifestName): string | null;
  /** Lowercased ids installed under this manifest's manager. `null` = the query could NOT RUN. */
  installed(manifest: ManifestName): ReadonlySet<string> | null;
  /** Manifests this host owns. A darwin host owns brew + brew-cask and nothing else. */
  applicable(): readonly ManifestName[];
  /** Why a manifest is not applicable, for the report. */
  notApplicableReason(manifest: ManifestName): string;
  hostTier(): { readonly tier: Tier; readonly source: "declared" | "detected" };
}

export function evaluate(port: HostPort): Report {
  const { tier: hostTier, source: hostTierSource } = port.hostTier();
  const hostRank = tierRank(hostTier);
  const applicable = port.applicable();

  const verdicts: RowVerdict[] = [];
  const errors: ParseError[] = [];

  for (const manifest of applicable) {
    const text = port.readManifest(manifest);
    if (text === null) {
      errors.push({ manifest, line: 0, raw: "", reason: "manifest is applicable to this host but could not be read" });
      continue;
    }
    const parsed = parseManifest(manifest, text);
    errors.push(...parsed.errors);

    const index = port.installed(manifest);
    for (const row of parsed.rows) {
      if (tierRank(row.tier) > hostRank) {
        verdicts.push({
          row,
          verdict: "skipped-by-tier",
          detail: `requires tier=${row.tier}, host is ${hostTier} (${hostTierSource})`,
        });
        continue;
      }
      if (index === null) {
        verdicts.push({ row, verdict: "unknown", detail: "the package query could not run on this host" });
        continue;
      }
      const hit = row.candidates.find((c) => index.has(c));
      if (hit !== undefined) {
        verdicts.push({ row, verdict: "present", detail: hit });
        continue;
      }
      verdicts.push({
        row,
        verdict: row.optional ? "absent-optional" : "absent",
        detail: `none of [${row.candidates.join(", ")}] is installed`,
      });
    }
  }

  const absent = verdicts.filter((v) => v.verdict === "absent");
  const absentOptional = verdicts.filter((v) => v.verdict === "absent-optional");
  const unknown = verdicts.filter((v) => v.verdict === "unknown");

  // Precedence, and it is deliberate. A positive finding outranks an unresolved one, so a
  // host with one unreadable manager and one genuinely-missing package still exits 1 and
  // names the package. Exit 0 is reserved for "asked every question and liked every answer"
  // -- an unresolved row must never be able to produce a green.
  const exitCode: 0 | 1 | 2 =
    absent.length > 0 ? 1 : unknown.length > 0 || errors.length > 0 || applicable.length === 0 ? 2 : 0;

  return {
    hostTier,
    hostTierSource,
    applicable,
    notApplicable: MANIFESTS.filter((m) => !applicable.includes(m)).map((m) => ({
      manifest: m,
      reason: port.notApplicableReason(m),
    })),
    verdicts,
    errors,
    absent,
    absentOptional,
    unknown,
    exitCode,
  };
}

// ── rendering ────────────────────────────────────────────────────────────────

const REMEDY: Record<ManifestName, (names: readonly string[]) => string> = {
  brew: (n) => `brew install ${n.join(" ")}`,
  "brew-cask": (n) => `brew install --cask ${n.join(" ")}`,
  apt: (n) => `sudo apt-get install -y --no-install-recommends ${n.join(" ")}`,
  windows: (n) => `scoop install ${n.join(" ")}`,
};

export function renderHuman(r: Report): string {
  const counted = (v: Verdict): number => r.verdicts.filter((x) => x.verdict === v).length;
  const head =
    `manifest-realized: host tier ${r.hostTier} (${r.hostTierSource}); ` +
    `${String(r.verdicts.length)} row(s) across [${r.applicable.join(", ") || "no applicable manifest"}] — ` +
    `${String(counted("present"))} present, ${String(r.absent.length)} ABSENT, ` +
    `${String(counted("skipped-by-tier"))} skipped-by-tier, ${String(r.unknown.length)} unknown` +
    (r.absentOptional.length > 0 ? `, ${String(r.absentOptional.length)} absent-but-optional` : "");

  const out: string[] = [head];

  if (r.applicable.length === 0) {
    out.push(
      "",
      "CHECK DID NOT RUN: this host owns none of the four OS-native manifests.",
      ...r.notApplicable.map((n) => `  ${n.manifest}: ${n.reason}`),
    );
  }

  for (const e of r.errors) {
    out.push("", `PARSE ERROR  manifests/${e.manifest}:${String(e.line)}  ${e.reason}`);
    if (e.raw.length > 0) out.push(`             ${e.raw}`);
  }

  if (r.unknown.length > 0) {
    const byManifest = [...new Set(r.unknown.map((u) => u.row.manifest))];
    out.push(
      "",
      `UNKNOWN — ${String(r.unknown.length)} row(s) were never asked about. This is NOT a pass and NOT a`,
      "failure; the query itself could not run, so the rows carry no information either way:",
      ...byManifest.map((m) => `  manifests/${m}: ${r.unknown.find((u) => u.row.manifest === m)?.detail ?? ""}`),
    );
  }

  if (r.absent.length > 0) {
    out.push("", `DECLARED AND ABSENT — ${String(r.absent.length)} row(s):`);
    for (const a of r.absent) out.push(`  manifests/${a.row.manifest}:${String(a.row.line)}  ${a.row.name}`);
    out.push("", "Remedy (this verifier never installs anything — run the setup script, or):");
    for (const m of [...new Set(r.absent.map((a) => a.row.manifest))]) {
      out.push(`  ${REMEDY[m](r.absent.filter((a) => a.row.manifest === m).map((a) => a.row.name))}`);
    }
  }

  if (r.absentOptional.length > 0) {
    out.push(
      "",
      `ABSENT BUT OPTIONAL — ${String(r.absentOptional.length)} row(s) carry manifests/windows' \`optional\``,
      "token, so install.ps1 warns and continues on failure. Reported, not failed:",
      ...r.absentOptional.map((a) => `  manifests/${a.row.manifest}:${String(a.row.line)}  ${a.row.name}`),
    );
  }

  if (r.exitCode === 0) out.push("", "OK — every applicable declared package is installed on this host.");
  return out.join("\n");
}

// ── the real host port ───────────────────────────────────────────────────────

function tryExec(file: string, args: readonly string[]): string | null {
  try {
    return execFileSync(file, [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120_000 });
  } catch {
    return null;
  }
}

/** Parity with `zeta_detect_host_tier`: >=16 GiB full, >=8 GiB standard, else slim; 0 => full. */
export function detectTier(memBytes: number): Tier {
  if (!Number.isFinite(memBytes) || memBytes <= 0) return "full";
  if (memBytes >= 16 * 1024 ** 3) return "full";
  if (memBytes >= 8 * 1024 ** 3) return "standard";
  return "slim";
}

export function realHostPort(root: string, platform: string = process.platform): HostPort {
  const cache = new Map<ManifestName, ReadonlySet<string> | null>();

  const brewIndex = (flag: "--formula" | "--cask"): ReadonlySet<string> | null => {
    const out = tryExec("brew", ["list", flag]);
    if (out === null) return null;
    return new Set(
      out
        .split(/\s+/)
        .filter((s) => s.length > 0)
        .map((s) => s.toLowerCase()),
    );
  };

  const dpkgIndex = (): ReadonlySet<string> | null => {
    // `${Package}` is the bare name (no :arch suffix, unlike ${binary:Package}), which is
    // what manifests/apt rows carry. Status is filtered to genuinely-installed, so a
    // config-files-remaining ("rc") package reads as ABSENT -- which it is, for our purpose.
    const out = tryExec("dpkg-query", ["-W", "-f=${Package} ${db:Status-Status}\n"]);
    if (out === null) return null;
    const set = new Set<string>();
    for (const line of out.split(/\r?\n/)) {
      const [name, status] = line.trim().split(/\s+/);
      if (name !== undefined && status === "installed") set.add(name.toLowerCase());
    }
    return set;
  };

  const windowsIndex = (): ReadonlySet<string> | null => {
    // install.ps1 resolves scoop -> winget -> choco, so the union is the honest index: a
    // row is satisfied if ANY resolver has it. If NO resolver can be queried we return
    // null (unknown), never an empty set -- an empty set would report all 14 rows absent.
    const set = new Set<string>();
    let asked = false;
    const scoop = tryExec("scoop", ["list"]);
    if (scoop !== null) {
      asked = true;
      for (const line of scoop.split(/\r?\n/)) {
        const first = line.trim().split(/\s+/)[0];
        if (first !== undefined && /^[A-Za-z0-9][\w.+-]*$/.test(first)) set.add(first.toLowerCase());
      }
    }
    const winget = tryExec("winget", ["list", "--disable-interactivity"]);
    if (winget !== null) {
      asked = true;
      for (const line of winget.split(/\r?\n/)) {
        for (const token of line.trim().split(/\s{2,}/)) {
          if (/^[A-Za-z0-9][\w.+-]*\.[\w.+-]+$/.test(token)) set.add(token.toLowerCase());
        }
      }
    }
    const choco = tryExec("choco", ["list", "--limit-output"]);
    if (choco !== null) {
      asked = true;
      for (const line of choco.split(/\r?\n/)) {
        const id = line.split("|")[0]?.trim();
        if (id !== undefined && id.length > 0) set.add(id.toLowerCase());
      }
    }
    return asked ? set : null;
  };

  const applicable = (): readonly ManifestName[] => {
    if (platform === "darwin") return ["brew", "brew-cask"];
    if (platform === "win32") return ["windows"];
    if (platform === "linux") return tryExec("dpkg-query", ["--version"]) === null ? [] : ["apt"];
    return [];
  };

  return {
    readManifest(manifest) {
      try {
        return readFileSync(resolve(root, "tools", "setup", "manifests", manifest), "utf8");
      } catch {
        return null;
      }
    },
    installed(manifest) {
      if (!cache.has(manifest)) {
        cache.set(
          manifest,
          manifest === "brew"
            ? brewIndex("--formula")
            : manifest === "brew-cask"
              ? brewIndex("--cask")
              : manifest === "apt"
                ? dpkgIndex()
                : windowsIndex(),
        );
      }
      return cache.get(manifest) ?? null;
    },
    applicable,
    notApplicableReason(manifest) {
      if (manifest === "brew" || manifest === "brew-cask") {
        return platform === "darwin" ? "brew is unavailable" : `Homebrew manifest; this host is ${platform}`;
      }
      if (manifest === "apt") {
        return platform === "linux"
          ? "no dpkg-query on PATH (a non-Debian Linux -- NixOS takes linux.sh's nix path)"
          : `Debian/Ubuntu manifest; this host is ${platform}`;
      }
      return `Windows manifest; this host is ${platform}`;
    },
    hostTier() {
      const declared = process.env["ZETA_HOST_TIER"];
      if (declared !== undefined && declared.length > 0) {
        tierRank(declared); // validate or throw, exactly like the shell
        return { tier: declared as Tier, source: "declared" };
      }
      return { tier: detectTier(totalmem()), source: "detected" };
    },
  };
}

export function main(argv: readonly string[]): number {
  const root = resolve(process.env["REPO_ROOT"] ?? resolve(import.meta.dir, "..", ".."));
  let report: Report;
  try {
    report = evaluate(realHostPort(root));
  } catch (err) {
    process.stderr.write(`manifest-realized: check could not run — ${String(err)}\n`);
    return 2;
  }
  process.stdout.write((argv.includes("--json") ? JSON.stringify(report, null, 2) : renderHuman(report)) + "\n");
  return report.exitCode;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
