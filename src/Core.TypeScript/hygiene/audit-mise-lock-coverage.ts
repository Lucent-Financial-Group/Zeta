#!/usr/bin/env bun
// audit-mise-lock-coverage.ts — the committed mise digests are OURS, and stay ours.
//
// THE DEFECT THIS CLOSES (081M24MADR2087G0R001FCD8K6, measured 2026-09-10).
// There was no `mise.lock` in the tree, so the `[2/3] checksum` step every `mise install`
// prints was verified against a checksum FETCHED FROM UPSTREAM AT INSTALL TIME. Across the
// ~24 tool pins in `.mise.toml` + `.mise.full.toml`, not one digest was one we owned. The
// day GitHub's attestation service returned 503 (`trust-metadata-api service unavailable`)
// both ARM lanes on `main` died on `kubeconform@0.7.0` — after the checksum step had
// already passed. Integrity was established; the install died on an AVAILABILITY check
// layered over it, because neither of the two trust sources was in this repository.
//
// `mise.lock` / `mise.full.lock` are now committed and this audit is what keeps them
// meaning something. Four things it refuses, each of which was measured to be possible:
//
//   1. A CONFIG PIN THAT MOVED WITHOUT A RE-LOCK. `zig = "0.13.0"` -> `"0.14.0"` with a
//      stale lockfile is a one-line diff that reads as housekeeping. Under `locked = true`
//      it breaks every install in the fleet; without this check it breaks them AFTER merge.
//   2. A TOOL THAT LOST ITS COVERAGE. A platform silently dropping out of the lockfile is
//      invisible in review — the file is 600 lines of generated TOML.
//   3. `locked = true` GOING MISSING from `.mise.toml`. Measured: with `locked = false`
//      (the default) mise still verifies digests it HAS, but silently ADDS a missing
//      platform entry from upstream and rewrites the lockfile in place. A lockfile that
//      repairs itself is not a lock — it is a cache that looks like one.
//   4. THE EXEMPTION ROSTER GROWING. Six backends emit no lockable artifact at all
//      (`core:dotnet`, `core:rust`, `npm:`, `pipx:`) and one emits a URL with no digest
//      (`vfox:1password-cli`). Under `locked = true` those PASS THROUGH — measured, not
//      assumed — so `locked = true` does NOT mean "everything is locked". They are named
//      below with reasons, and this audit fails BOTH ways: a roster tool that is not
//      declared, and a roster tool that has since become lockable and should be dropped
//      from the roster. The exemption set can shrink; it cannot grow without a diff here.
//
// WHAT IT DOES NOT DO: prove the digests are right. Only a real fetch can, and that is
// `.github/workflows/verify-mise-lock.yml` — a re-lock on the PINNED mise plus
// `git diff --exit-code`, and a tampered-digest run that MUST be refused.
//
// Run:   bun src/Core.TypeScript/hygiene/audit-mise-lock-coverage.ts
// Exit:  0 — every declared tool is locked, or named on the roster with a reason
//        1 — drift, lost coverage, a missing `locked = true`, or a stale roster entry

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The two config/lockfile pairs. `MISE_ENV=full` merges the second onto the first. */
export const PAIRS: readonly { readonly config: string; readonly lock: string }[] = [
  { config: ".mise.toml", lock: "mise.lock" },
  { config: ".mise.full.toml", lock: "mise.full.lock" },
];

/**
 * The platforms a host in this fleet actually runs on, and therefore the ones a locked
 * tool must carry a digest for. Derived from the runner labels in `.github/workflows/`
 * plus the container images under `src/Core.TypeScript/ci/dockerfiles/`:
 *
 *   ubuntu-24.04 / ubuntu-22.04 / ubuntu-slim / the ubuntu+nixos images -> linux-x64
 *   ubuntu-24.04-arm                                                    -> linux-arm64
 *   macos-26 / macos-15 (and every dev laptop)                          -> macos-arm64
 *   macos-13-class x86 hosts                                            -> macos-x64
 *   windows-2025 / the servercore image                                 -> windows-x64
 *   windows-11-arm                                                      -> windows-arm64
 *
 * The `-musl` variants are locked too where upstream publishes them, but are NOT required:
 * measured 2026-09-10, no runner, container image or cluster node in this repo is musl
 * (every image is glibc — `ubuntu:24.04`, `ubuntu:22.04`, `nixos/nix`, `servercore`). A
 * required platform nothing runs would be a check that can only ever fail for a reason
 * nobody can act on.
 */
export const REQUIRED_PLATFORMS: readonly string[] = [
  "linux-x64",
  "linux-arm64",
  "macos-x64",
  "macos-arm64",
  "windows-x64",
  "windows-arm64",
];

/**
 * Tools whose mise backend produces NOTHING a lockfile can hold, with the reason each.
 *
 * This is not a suppression list. Every entry was measured on 2026-09-10 by running
 * `mise lock` and reading what it emitted, and each one is separately covered — or
 * separately NOT covered, said out loud — somewhere else:
 *
 *   dotnet   `core:dotnet` shells out to Microsoft's `dotnet-install` script, which
 *            resolves and verifies its own payload. mise never sees a URL to lock.
 *   rust     `core:rust` drives rustup. The rustup INSTALLER is digest-pinned by us
 *            (`tools/setup/rustup-pin.json`, verify-rustup-pin.yml); the toolchain it
 *            then fetches is verified by rustup's own signed channel manifests.
 *   npm:*    installs through npm's own resolver. `package.json` + `bun.lock` is that
 *            ecosystem's lock, and mise 2026.6.12+ additionally enforces aube's
 *            publisher-trust policy on the tree (the `fastq@1.20.2` note in `.mise.toml`).
 *   pipx:*   routed through `uv tool install` against PyPI. No single artifact URL exists
 *            to pin — the install is a resolved dependency set, not a download.
 *
 * HONEST STATEMENT OF WHAT THAT COSTS: for these seven tools the digest is still not ours.
 * `locked = true` does not fail closed on them — measured, `mise install` proceeds and
 * installs them unlocked — so the guarantee this file's header claims is a guarantee about
 * the OTHER fourteen. Closing these is separate work per ecosystem, not a mise setting.
 */
export const UNLOCKABLE_BACKENDS: Readonly<Record<string, string>> = {
  dotnet: "core:dotnet delegates to Microsoft's dotnet-install script; mise sees no artifact URL",
  rust: "core:rust drives rustup; the rustup INSTALLER is digest-pinned by tools/setup/rustup-pin.json",
  "npm:markdownlint-cli2": "npm resolver; package.json + bun.lock is that ecosystem's lock",
  "pipx:semgrep": "uv tool install against PyPI; a resolved dependency set, not one artifact",
  "pipx:yamllint": "uv tool install against PyPI; a resolved dependency set, not one artifact",
  "pipx:ruff": "uv tool install against PyPI; a resolved dependency set, not one artifact",
  "pipx:mypy": "uv tool install against PyPI; a resolved dependency set, not one artifact",
};

/**
 * Tools mise DOES lock a URL for but cannot attach a digest to, and single platforms a
 * vendor does not publish. Narrower than the roster above: the lockfile row exists and is
 * checked for drift; only the `checksum` is absent.
 *
 * `1password-cli` — the `vfox:` backend records the download URL and no checksum. So the
 * URL is ours and the bytes are not; that is strictly better than nothing and strictly
 * worse than a digest, and saying which is the point of listing it here.
 *
 * `java` on `windows-arm64` — no vendor ships it. Measured against the vendor APIs
 * 2026-09-09 and recorded independently in `tools/setup/install.ps1`: Adoptium publishes
 * 21 for windows/aarch64 and not 25 or 26; Azul publishes 25 and not 26. install.ps1
 * therefore excludes `java` from the Windows-ARM64 spec list and installs `java@zulu-25`
 * as a best-effort fallback outside the declared graph. Two independent measurements of
 * the same absence, which is why this exemption is a fact and not a shrug.
 *
 * `1password-cli` on `windows-arm64` — likewise absent upstream, and likewise already
 * excluded by install.ps1's `$unsupported` map.
 */
export const PARTIAL_COVERAGE: Readonly<Record<string, string>> = {
  "1password-cli": "vfox backend records the URL and no checksum; upstream publishes no windows-arm64 archive",
  java: "no vendor publishes a Java 26 build for windows-arm64 (install.ps1 measured Adoptium + Azul, 2026-09-09)",
};

export interface Finding {
  readonly ok: boolean;
  readonly message: string;
}

export interface LockedTool {
  readonly versions: string[];
  /** platform -> true when that platform row carries a `checksum`. */
  readonly platforms: Record<string, boolean>;
}

/**
 * The `[tools]` table of a `.mise.toml`, as `name -> version spec`.
 *
 * Deliberately a line parser and not a TOML library: this must run with no dependency on
 * the very toolchain it is auditing, on a machine where `mise install` has not run yet.
 * Both spellings mise accepts are handled — `zig = "0.13.0"` and the inline table
 * `rust = { version = "1.99.0-beta.3", components = [...] }` — because a parser that
 * silently skipped the inline-table form would report FULL coverage for a tool it never
 * looked at, which is the vacuity class wearing a green tick.
 */
export function parseConfigTools(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let inTools = false;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("[")) {
      inTools = line === "[tools]";
      continue;
    }
    if (!inTools || line === "" || line.startsWith("#")) continue;
    const m = /^("[^"]+"|[A-Za-z0-9_.:@/-]+)\s*=\s*(.+)$/.exec(line);
    const rawName = m?.[1];
    const rawRhs = m?.[2];
    if (rawName === undefined || rawRhs === undefined) continue;
    const name = rawName.replace(/^"|"$/g, "");
    const rhs = rawRhs.trim();
    if (rhs.startsWith("{")) {
      const v = /version\s*=\s*"([^"]+)"/.exec(rhs)?.[1];
      if (v !== undefined) out[name] = v;
      continue;
    }
    const s = /^"([^"]*)"/.exec(rhs)?.[1];
    if (s !== undefined) out[name] = s;
  }
  return out;
}

/** A `mise.lock` body, as `name -> { versions, platforms }`. */
export function parseLock(body: string): Record<string, LockedTool> {
  const out: Record<string, LockedTool> = {};
  let current: LockedTool | null = null;
  let platform: string | null = null;
  const entryFor = (rawName: string): LockedTool => {
    const name = rawName.replace(/^"|"$/g, "");
    const existing = out[name];
    if (existing !== undefined) return existing;
    const fresh: LockedTool = { versions: [], platforms: {} };
    out[name] = fresh;
    return fresh;
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const toolName = /^\[\[tools\.("[^"]+"|[^\]]+)\]\]$/.exec(line)?.[1];
    if (toolName !== undefined) {
      current = entryFor(toolName);
      platform = null;
      continue;
    }
    const platMatch = /^\[tools\.("[^"]+"|[^.\]]+)\."platforms\.([^"]+)"\]$/.exec(line);
    const platTool = platMatch?.[1];
    const platName = platMatch?.[2];
    if (platTool !== undefined && platName !== undefined) {
      current = entryFor(platTool);
      platform = platName;
      current.platforms[platName] = false;
      continue;
    }
    if (line.startsWith("[")) {
      // `[tools.rust.options]` and anything else: still inside the tool, no longer a platform.
      platform = null;
      continue;
    }
    if (current === null) continue;
    if (platform === null) {
      const v = /^version\s*=\s*"([^"]+)"$/.exec(line)?.[1];
      if (v !== undefined) current.versions.push(v);
    } else if (/^checksum\s*=\s*"/.test(line)) {
      current.platforms[platform] = true;
    }
  }
  return out;
}

/**
 * Does `locked` resolve a `spec` from the config?
 *
 * Exact pins must be byte-equal. Fuzzy pins (`node = "24"`, `bun = "1.3"`, `java = "26"`)
 * are satisfied by any version that extends them at a dot boundary, which is exactly what
 * `mise lock` writes when it resolves them. `24` must NOT accept `240.1` — hence the
 * boundary rather than a bare `startsWith`.
 */
export function versionSatisfies(spec: string, locked: string): boolean {
  if (spec === locked) return true;
  return locked.startsWith(`${spec}.`);
}

export function checkLockedSettingPresent(miseToml: string): Finding {
  // `[settings]` ... `locked = true`, tolerating comments and any key order.
  const settings = miseToml.split(/^\[settings\]$/m)[1] ?? "";
  const ok = /^\s*locked\s*=\s*true\s*$/m.test(settings);
  return ok
    ? { ok: true, message: "`.mise.toml` [settings] declares `locked = true`" }
    : {
        ok: false,
        message:
          "`.mise.toml` [settings] does not declare `locked = true`. Without it mise still " +
          "verifies digests it HAS, but silently adds a missing platform entry from upstream " +
          "and rewrites mise.lock in place — a lockfile that repairs itself is not a lock.",
      };
}

export function checkPair(
  pairLabel: string,
  config: string,
  lock: string,
  requiredPlatforms: readonly string[] = REQUIRED_PLATFORMS,
): Finding[] {
  const out: Finding[] = [];
  const declared = parseConfigTools(config);
  const locked = parseLock(lock);

  if (Object.keys(declared).length === 0) {
    out.push({
      ok: false,
      message: `${pairLabel}: parsed ZERO tools from the config — the parser or the file is wrong`,
    });
    return out;
  }

  for (const [name, spec] of Object.entries(declared)) {
    const entry = locked[name];
    const unlockable = Object.hasOwn(UNLOCKABLE_BACKENDS, name);

    if (entry === undefined) {
      out.push({
        ok: false,
        message: `${pairLabel}: ${name} is declared but has NO entry in the lockfile — run the refresh below`,
      });
      continue;
    }

    // Version agreement. This is the drift that actually happens: a pin is bumped and the
    // lockfile is not regenerated, so the committed digest describes the OLD artifact.
    if (entry.versions.length === 0) {
      out.push({ ok: false, message: `${pairLabel}: ${name} has a lockfile block with no version` });
    } else if (!entry.versions.some((v) => versionSatisfies(spec, v))) {
      out.push({
        ok: false,
        message:
          `${pairLabel}: ${name} is pinned "${spec}" in the config but the lockfile holds ` +
          `${entry.versions.map((v) => `"${v}"`).join(", ")} — the committed digest describes a different artifact`,
      });
    }

    const withDigest = requiredPlatforms.filter((p) => entry.platforms[p] === true);

    if (unlockable) {
      // The roster can shrink, never grow: a tool that has BECOME lockable must leave it,
      // or the roster turns into a place where coverage quietly goes to die.
      if (withDigest.length > 0) {
        out.push({
          ok: false,
          message:
            `${pairLabel}: ${name} is on UNLOCKABLE_BACKENDS but now carries digests for ` +
            `${withDigest.join(", ")} — delete its roster entry, the exemption is stale`,
        });
      } else {
        out.push({ ok: true, message: `${pairLabel}: ${name} unlocked by backend — ${UNLOCKABLE_BACKENDS[name]}` });
      }
      continue;
    }

    const missing = requiredPlatforms.filter((p) => entry.platforms[p] !== true);
    if (missing.length === 0) {
      out.push({
        ok: true,
        message: `${pairLabel}: ${name} digest-locked on all ${String(requiredPlatforms.length)} required platforms`,
      });
      continue;
    }
    const reason = PARTIAL_COVERAGE[name];
    if (reason === undefined) {
      out.push({
        ok: false,
        message: `${pairLabel}: ${name} has NO committed digest for ${missing.join(", ")} — and no PARTIAL_COVERAGE reason on file`,
      });
    } else {
      out.push({
        ok: true,
        message: `${pairLabel}: ${name} partial (${withDigest.length}/${String(requiredPlatforms.length)}; missing ${missing.join(", ")}) — ${reason}`,
      });
    }
  }

  // A roster entry naming a tool nobody declares any more is dead weight that reads as
  // coverage policy. Scoped to the pair that could plausibly declare it: `.mise.full.toml`
  // declares five tools and would otherwise convict every base-tier roster entry.
  for (const name of Object.keys(UNLOCKABLE_BACKENDS)) {
    if (pairLabel === PAIRS[0]?.config && !Object.hasOwn(declared, name)) {
      out.push({
        ok: false,
        message: `${pairLabel}: UNLOCKABLE_BACKENDS names ${name}, which nothing declares — remove the stale roster entry`,
      });
    }
  }

  return out;
}

export function refreshInstructions(): string {
  return [
    "REFRESH (never hand-edit a digest):",
    "  MISE_LOCKED=0 mise lock                              # refresh every locked platform",
    "  MISE_LOCKED=0 mise lock --platform windows-arm64     # windows-arm64 is not in mise's default set",
    "  MISE_LOCKED=0 mise lock                              # run again: the first pass discovers x86-64 baseline variants",
    "MISE_LOCKED=0 is required, not cosmetic: with `locked = true` in the config, `mise lock`",
    "cannot resolve a version that is not already in the lockfile and PRUNES the old entry",
    "instead — measured 2026-09-10, it emptied a lockfile that way.",
    "Use the mise version tools/setup/linux.sh pins: `mise lock` output differs between mise",
    "releases (2026.6.12 vs 2026.8.14 disagree on header, `specifiers`, and the baseline",
    "platform variants), so a re-lock on the wrong mise reads as drift that is not there.",
  ].join("\n");
}

function main(): void {
  const root = process.cwd();
  const findings: Finding[] = [checkLockedSettingPresent(readFileSync(join(root, ".mise.toml"), "utf8"))];
  for (const pair of PAIRS) {
    let lockBody: string;
    try {
      lockBody = readFileSync(join(root, pair.lock), "utf8");
    } catch {
      // The PRE-FIX state, and the reason it is a named finding rather than an ENOENT
      // stack trace: "there is no lockfile" is the defect this audit exists for, so it
      // has to read as a conviction with the repair attached, not as a crash a reader
      // mistakes for a bug in the audit.
      findings.push({
        ok: false,
        message: `${pair.config}: ${pair.lock} does not exist — not one mise-managed digest in this repo would be one we own`,
      });
      continue;
    }
    findings.push(...checkPair(pair.config, readFileSync(join(root, pair.config), "utf8"), lockBody));
  }
  let failed = false;
  for (const f of findings) {
    if (f.ok) console.log(`[mise-lock-coverage] ${f.message}`);
    else {
      console.error(`[mise-lock-coverage] ✗ ${f.message}`);
      failed = true;
    }
  }
  if (failed) {
    console.error(`\n${refreshInstructions()}`);
    process.exit(1);
  }
}

if (import.meta.main) main();
