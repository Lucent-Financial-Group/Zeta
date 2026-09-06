#!/usr/bin/env node
/**
 * compare-across-legs.mjs - THE CROSS-PROCESSOR BYTE-LOCK.
 *
 * == WHY THIS EXISTS =========================================================
 * The byte-lock runs nine independent implementations against pinned golden
 * vectors, which catches an implementation that computes the wrong trajectory.
 * It ran on ONE runner (`ubuntu-24.04`, no matrix), and that is a real gap
 * rather than a nicety:
 *
 *   AN ERROR-CORRECTING CODE CANNOT DETECT A WRONG PROCESSOR.
 *
 * A code over data detects corruption OF the data. If the CPU miscomputes, it
 * computes the check wrong too - consistently, and in agreement with itself -
 * so recomputing or lengthening the code does not help: the check and the thing
 * checked share the fault. That is not hypothetical. Mercurial cores miscompute
 * specific inputs while passing every self-test (Hochschild et al., "Cores That
 * Don't Count", HotOS 2021; Dixit et al. 2021).
 *
 * The only mechanism that catches it is redundant computation on INDEPENDENT
 * HARDWARE. This file is that comparison.
 *
 * == WHAT IT COMPARES, AND WHY THAT IS ENOUGH ================================
 * Each leg emits `bytelock-report.json` with a per-(substrate, seed) verdict
 * against a COMMITTED golden vector. So for a given (substrate, seed) the
 * source, the input and the expectation are all held fixed, and the only free
 * variable left across legs is the machine. Therefore:
 *
 *   Two legs disagreeing on the same (substrate, seed) is a
 *   HARDWARE-OR-TOOLCHAIN fact by construction. No other explanation is left.
 *
 * It does NOT catch a fault common to every leg - an implementation wrong
 * everywhere, or a specification bug. Knight & Leveson (1986) measured that
 * independently developed versions fail in correlated ways; that limit is
 * inherited here, not solved.
 *
 * == THE VACUITY GUARD IS THE POINT ==========================================
 * A cross-leg comparison that finds no disagreement is indistinguishable, in an
 * exit code, from one that compared NOTHING - and "nothing to compare" is the
 * overwhelmingly likely failure mode here (an artifact that did not upload, a
 * leg that died before emitting, a toolchain absent on every non-Linux runner).
 * So this file REFUSES rather than passes when it cannot do its job:
 *
 *   - fewer than two legs reported         -> exit 2 (REFUSED)
 *   - zero (substrate, seed) pairs shared  -> exit 2 (REFUSED)
 *
 * Silence is never reported as agreement.
 *
 * == ANTI-ROT: --expect-legs ================================================
 * The comparison itself needs only TWO legs. That is enough to catch a
 * disagreement and it is NOT enough to keep the matrix honest: three healthy
 * Linux legs would hold this green forever while macOS and Windows quietly
 * stopped reporting, the comparison set shrinking with nothing saying so. Those
 * legs are non-blocking by design (Aaron 2026-09-06: "windows and mac can always
 * stay non blocking but we dont want to let it rot"), and non-blocking is exactly
 * how a leg rots.
 *
 * `--expect-legs=a,b,c` names the set that SHOULD report. A missing one is
 * printed as a GitHub warning annotation and listed in the summary. It does NOT
 * fail the run -- absence is environmental, and blocking on it would re-import the
 * flakiness the non-blocking decision exists to keep out. What it does is make the
 * shrinkage impossible to not see.
 *
 * Usage:
 *   node compare-across-legs.mjs <dir-of-leg-reports> [--expect-legs=a,b,c]
 *   node compare-across-legs.mjs --self-test
 *
 * Exit: 0 agreed | 1 DIVERGED across legs | 2 REFUSED (could not compare)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** A leg is one machine's report; `name` is the artifact directory (the runner label). */
export function loadLegs(rootDir) {
  const legs = [];
  for (const entry of readdirSync(rootDir).sort()) {
    const dir = join(rootDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    const file = join(dir, "bytelock-report.json");
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      // A leg that uploaded no report, or an unparseable one, is a NAMED absence.
      // It must never silently shrink the comparison set - that is how a
      // cross-check quietly becomes a single-machine check again.
      legs.push({ name: entry, ok: false, reason: String(err && err.message ? err.message : err) });
      continue;
    }
    legs.push({ name: entry, ok: true, report: parsed });
  }
  return legs;
}

/**
 * Index one report as (substrate, seed) -> verdict.
 *
 * Only EXECUTED results are indexed. A substrate that was SKIP / TOOLING-ABSENT
 * / MALFORMED on a leg did not run there, and comparing "did not run" against
 * "passed" would manufacture a divergence out of a toolchain difference - the
 * exact conflation `run-bytelock-ci.mjs` already refuses internally.
 */
export function indexVerdicts(report) {
  const out = new Map();
  for (const sub of (report && report.substrates) || []) {
    if (sub.status === "SKIP" || sub.status === "MALFORMED") continue;
    for (const r of sub.results || []) {
      if (r.kind === "tooling" || r.kind === "malformed") continue;
      out.set(sub.name + " " + String(r.seed), r.pass === true ? "pass" : "fail");
    }
  }
  return out;
}

/**
 * Legs that were expected and did not report, matched against the artifact
 * directory names (which carry a `bytelock-report-` prefix).
 *
 * A leg that reported but was UNREADABLE counts as present here on purpose: it is
 * already named by `compareLegs` as unreadable, and reporting it twice under two
 * different headings would suggest two problems where there is one.
 */
export function missingLegs(legs, expected) {
  if (expected.length === 0) return [];
  const seen = legs.map((l) => l.name.replace(/^bytelock-report-/, ""));
  return expected.filter((e) => !seen.includes(e));
}

export function compareLegs(legs) {
  const usable = legs.filter((l) => l.ok);
  const findings = [];

  if (usable.length < 2) {
    const seen = legs.map((l) => l.name + (l.ok ? "" : " (unreadable)")).join(", ") || "none";
    return {
      status: "REFUSED",
      reason:
        "cross-processor comparison needs at least TWO legs with a readable report; got " +
        usable.length +
        ". A single leg cannot disagree with itself, and reporting that as agreement would be a " +
        "check that cannot fail. Legs seen: " + seen,
      comparedPairs: 0,
      findings,
    };
  }

  const indexed = usable.map((l) => ({ name: l.name, verdicts: indexVerdicts(l.report) }));

  // Only keys present on 2+ legs are comparable. Toolchain availability differs
  // per OS by design, so the comparison is over the INTERSECTION, not the union.
  const counts = new Map();
  for (const leg of indexed) for (const k of leg.verdicts.keys()) counts.set(k, (counts.get(k) || 0) + 1);
  const shared = [...counts.entries()].filter((e) => e[1] >= 2).map((e) => e[0]).sort();

  if (shared.length === 0) {
    return {
      status: "REFUSED",
      reason:
        usable.length +
        " legs reported, but NO (substrate, seed) pair executed on more than one of them, so nothing " +
        "was actually compared. This is the vacuity case: exit 0 here would mean \"no disagreement\" " +
        "when the truth is \"no comparison\".",
      comparedPairs: 0,
      findings,
    };
  }

  for (const key of shared) {
    const sep = key.lastIndexOf(" ");
    const substrate = key.slice(0, sep);
    const seed = key.slice(sep + 1);
    const byVerdict = new Map();
    for (const leg of indexed) {
      const v = leg.verdicts.get(key);
      if (v === undefined) continue;
      if (!byVerdict.has(v)) byVerdict.set(v, []);
      byVerdict.get(v).push(leg.name);
    }
    if (byVerdict.size > 1) {
      findings.push({
        substrate,
        seed,
        split: [...byVerdict.entries()].map((e) => ({ verdict: e[0], legs: e[1] })),
      });
    }
  }

  return {
    status: findings.length > 0 ? "DIVERGED" : "AGREED",
    comparedPairs: shared.length,
    legs: indexed.map((l) => l.name),
    findings,
  };
}

function selfTest() {
  const mk = (name, pairs) => ({
    name,
    ok: true,
    report: {
      substrates: [...new Set(pairs.map((p) => p[0]))].map((s) => ({
        name: s,
        results: pairs.filter((p) => p[0] === s).map((p) => ({ seed: p[1], pass: p[2] })),
      })),
    },
  });
  const checks = [];
  const check = (label, got, want) => checks.push({ label, ok: got === want, got, want });

  // 1. AGREEMENT - two legs, same verdicts.
  check(
    "agreeing legs -> AGREED",
    compareLegs([mk("a", [["Rust", 1, true]]), mk("b", [["Rust", 1, true]])]).status,
    "AGREED",
  );

  // 2. THE CONTROL THAT MATTERS - same substrate and seed, different verdicts.
  //    This is what a mercurial core looks like from here.
  const div = compareLegs([mk("x86", [["Rust", 1, true]]), mk("arm", [["Rust", 1, false]])]);
  check("disagreeing legs -> DIVERGED", div.status, "DIVERGED");
  check("divergence names the substrate", div.findings[0] && div.findings[0].substrate, "Rust");

  // 3. VACUITY GUARDS - silence must never read as agreement.
  check("one leg -> REFUSED", compareLegs([mk("only", [["Rust", 1, true]])]).status, "REFUSED");
  check("zero legs -> REFUSED", compareLegs([]).status, "REFUSED");
  check(
    "no shared pairs -> REFUSED",
    compareLegs([mk("a", [["Rust", 1, true]]), mk("b", [["Zig", 1, true]])]).status,
    "REFUSED",
  );

  // 4. A TOOLCHAIN DIFFERENCE IS NOT A DIVERGENCE. `b` never ran Rust; that must
  //    not be compared against `a`'s pass.
  const tool = {
    name: "b",
    ok: true,
    report: {
      substrates: [
        { name: "Rust", status: "SKIP", results: [] },
        { name: "Zig", results: [{ seed: 1, pass: true }] },
      ],
    },
  };
  check(
    "skipped substrate is not a divergence",
    compareLegs([mk("a", [["Rust", 1, true], ["Zig", 1, true]]), tool]).status,
    "AGREED",
  );

  // 5. An unreadable leg does not count toward the two-leg minimum.
  check(
    "unreadable leg does not satisfy the minimum",
    compareLegs([mk("a", [["Rust", 1, true]]), { name: "b", ok: false, reason: "ENOENT" }]).status,
    "REFUSED",
  );

  // 6. A substrate whose name contains a space still parses back correctly.
  const spaced = compareLegs([mk("a", [["JS (V8)", 42, true]]), mk("b", [["JS (V8)", 42, false]])]);
  check("substrate names with spaces round-trip", spaced.findings[0] && spaced.findings[0].substrate, "JS (V8)");

  // 7. ANTI-ROT: a declared leg that did not report is named.
  const legsFor = [mk("bytelock-report-ubuntu-24.04", [["Rust", 1, true]]), mk("bytelock-report-macos-26", [["Rust", 1, true]])];
  check(
    "a leg that did not report is named as missing",
    missingLegs(legsFor, ["ubuntu-24.04", "macos-26", "windows-2025"]).join(","),
    "windows-2025",
  );
  check("no expected set -> nothing is missing", missingLegs(legsFor, []).length, 0);
  check(
    "an UNREADABLE leg counts as present, not missing (it is already named once)",
    missingLegs([...legsFor, { name: "bytelock-report-windows-2025", ok: false, reason: "empty" }], [
      "ubuntu-24.04",
      "macos-26",
      "windows-2025",
    ]).length,
    0,
  );

  let failed = 0;
  for (const c of checks) {
    if (!c.ok) failed++;
    console.log(
      (c.ok ? "ok    " : "FAIL  ") +
        c.label +
        (c.ok ? "" : " (got " + JSON.stringify(c.got) + ", want " + JSON.stringify(c.want) + ")"),
    );
  }
  console.log("\n" + (checks.length - failed) + "/" + checks.length + " self-tests passed");
  return failed === 0 ? 0 : 1;
}

const argv = process.argv.slice(2);
if (argv.includes("--self-test")) {
  process.exit(selfTest());
}

const expectArg = argv.find((a) => a.startsWith("--expect-legs="));
const expected = expectArg ? expectArg.slice("--expect-legs=".length).split(",").map((x) => x.trim()).filter(Boolean) : [];

const root = argv.find((a) => !a.startsWith("--"));
if (!root) {
  console.error("usage: node compare-across-legs.mjs <dir-of-leg-reports> | --self-test");
  process.exit(2);
}

const loaded = loadLegs(root);

// Loud, never blocking. Emitted BEFORE the verdict so it is visible even when the
// comparison then refuses for its own reasons.
const absent = missingLegs(loaded, expected);
for (const leg of absent) {
  console.log(
    `::warning title=byte-lock leg did not report::${leg} produced no artifact. ` +
      `The comparison proceeded without it, so the cross-processor set is SMALLER than declared. ` +
      `This does not fail the run (these legs are non-blocking by design) and it must not go unnoticed.`,
  );
}
if (expected.length > 0) {
  const present = expected.length - absent.length;
  console.log(`legs expected: ${expected.length} · reported: ${present}${absent.length ? ` · MISSING: ${absent.join(", ")}` : ""}`);
}

const result = compareLegs(loaded);
if (result.status === "REFUSED") {
  console.error("\nCROSS-PROCESSOR BYTE-LOCK REFUSED - " + result.reason + "\n");
  process.exit(2);
}
if (result.status === "DIVERGED") {
  console.error(
    "\nCROSS-PROCESSOR DIVERGENCE - " + result.findings.length + " (substrate, seed) pair(s) disagree across machines.",
  );
  console.error("Legs: " + result.legs.join(", ") + " | compared " + result.comparedPairs + " shared pair(s)\n");
  for (const f of result.findings) {
    console.error("  " + f.substrate + " @ seed " + f.seed + ":");
    for (const s of f.split) console.error("      " + s.verdict.padEnd(4) + " on " + s.legs.join(", "));
  }
  console.error(
    "\nSame source, same input, same committed expectation - the only free variable across legs is the " +
      "MACHINE. This is the fault class no checksum can see.\n",
  );
  process.exit(1);
}
console.log(
  "\nCROSS-PROCESSOR BYTE-LOCK AGREED - " +
    result.comparedPairs +
    " shared (substrate, seed) pair(s) identical across " +
    result.legs.length +
    " machines: " +
    result.legs.join(", ") +
    ".\n",
);
