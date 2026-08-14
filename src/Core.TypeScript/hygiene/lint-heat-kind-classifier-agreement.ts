#!/usr/bin/env bun
// lint-heat-kind-classifier-agreement.ts — one classifier for the deferral/destruction bit.
//
// 081M010W1BP087G0R002M2BNVW. `src/Core/Heat.fs` used to decide "is this kind pressure?"
// TWICE, by two independent routes:
//
//   HeatSignature.isPressureKind  = isBackpressureKind || isDeniedKind        (substring disjunction)
//   HeatSignal.ofKind             = ordered chain testing FORGETTING FIRST,
//                                   then HeatSignal.isPressure read off the result
//
// A kind carrying BOTH a forgetting token and a pressure token ("soft-emu.prune-backpressure")
// takes the forgetting branch, so route 2 says "not pressure" while route 1 says "pressure".
// Executed and confirmed: 3 of 3 dual-token probes disagreed.
//
// That bit is not cosmetic. The composition law from the backpressure study (PR #10693) is
// that operators which only DEFER compose as a monoid and operators which DESTROY do not —
// and pressure-vs-loss IS that discriminator. Two classifiers of it means the composition
// property is answered differently depending on which one you ask, which defeats the point
// of having a decidable law.
//
// The fix deleted `HeatSignature.isPressureKind` and derived `HeatSignal.isPressureKind`
// from `ofKind`. This lint keeps that shape, in two independent parts:
//
//   PART A — the ambiguous class stays EMPTY. No emitted heat-kind literal may carry both a
//            forgetting token and a pressure token. The single classifier still resolves such
//            a kind by branch ORDER rather than by meaning, so the honest guard is to refuse
//            the input class rather than to pretend the ordering is a decision.
//
//   PART B — pressure is decided in exactly ONE place. The raw substring probes
//            (`isBackpressureKind` / `isDeniedKind`) may be referenced by `ofKind` and by
//            nothing else in Heat.fs. Reintroducing a second classifier beside it fails here.
//
// SCAN FLOORS. Both parts exit non-zero if they inspected fewer sites than the stated
// minimum. A guard whose extraction patterns quietly stop matching reports "clean" forever;
// that is the blind-instrument failure this repo has been finding all week, and a lint is not
// exempt from it. The floors are what make a green run mean "I looked and found nothing"
// rather than "I did not look".
//
// Usage: bun src/Core.TypeScript/hygiene/lint-heat-kind-classifier-agreement.ts
// Exit:  0 — one classifier, and no dual-token kind literal
//        1 — a second classifier, a dual-token kind, or a scan that fell below its floor

import { readFileSync, existsSync } from "node:fs";

const HEAT_FS = "src/Core/Heat.fs";

/**
 * Files that can give birth to a heat `Kind` string, plus the treaty that enumerates the
 * vocabulary. Explicit rather than globbed: a new emitter should have to appear here, which
 * makes the corpus reviewable and keeps the scan floor meaningful.
 */
const KIND_SOURCES: readonly string[] = [
  "src/Core/Heat.fs",
  "src/Core/WSetHeat.fs",
  "src/Core/MetaCart.fs",
  "src/Core/RoomAdmission.fs",
  "src/Core/RoomHorizon.fs",
  "src/Core/RoomBoundary.fs",
  "src/Core/SoftEmu.fs",
  "src/Core/SchedulerShedHeat.fs",
  "src/Core/DarkHallScheduler.fs",
  "src/Core/DarkHallRoomLoop.fs",
  "src/Core/DarkHallCabinetRuntime.fs",
  "src/Core.QSharp.ReferenceOracle/heat-signals-treaty.json",
];

/** Minimum kind literals PART A must inspect before a clean result means anything. */
const KIND_SCAN_FLOOR = 30;
/** Minimum token-predicate definitions PART B must find in Heat.fs. */
const PREDICATE_SCAN_FLOOR = 6;

/**
 * PER-PATTERN floor, and why the aggregate floor alone is not enough.
 *
 * Measured, not assumed: disabling ONE of the four extraction patterns dropped the corpus
 * from 33 kinds to 30, and at an aggregate floor of 20 the lint still exited 0 and printed
 * "OK". A guard that keeps reporting clean while an entire extraction route has gone dark is
 * precisely the blind instrument this file exists to prevent — found in this file, by
 * planting the mutant instead of trusting the design.
 *
 * So every NAMED pattern must contribute at least one match. Extraction drift now fails
 * immediately, whatever the remaining patterns happen to cover.
 */
const PATTERN_FLOOR = 1;

// ── extraction ────────────────────────────────────────────────────────────────

/** Strip F# comments so a token named in prose is not mistaken for a reference. */
export function stripFSharpComments(source: string): string {
  return source
    .replace(/\(\*[\s\S]*?\*\)/g, " ")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/**
 * Heat-kind string literals reachable by a classifier.
 *
 * Deliberately targeted rather than "every string in the file": a broad net would sweep in
 * unrelated record fields (`Kind = "gen"`, `Kind = "treaty"`, …) and the noise would push
 * someone to weaken the check. The cost of being targeted is that a new emission shape is
 * invisible — which is exactly what the scan floor is here to catch.
 */
const EMITTERS = String.raw`(?:HeatSignature\.ofMass|BoundedHeat\.signature|BoundedHeat\.emit|positiveSignature)`;

/** Named extraction routes. Each must contribute at least `PATTERN_FLOOR` matches overall. */
const KIND_PATTERNS: readonly { readonly name: string; readonly re: RegExp }[] = [
  // F#: HeatSignature.ofMass <source> "kind" / BoundedHeat.signature <source> "kind"
  { name: "fsharp-emitter-inline", re: new RegExp(`${EMITTERS}\\s+[A-Za-z_][A-Za-z0-9_.']*\\s+"([^"]+)"`, "g") },
  // F#: the same, written across lines (ofMass\n  source\n  "kind")
  {
    name: "fsharp-emitter-multiline",
    re: new RegExp(`${EMITTERS}\\s*\\n\\s*[A-Za-z_][A-Za-z0-9_.']*\\s*\\n\\s*"([^"]+)"`, "g"),
  },
  // F#: [<Literal>] let SomethingKind = "kind"
  { name: "fsharp-kind-literal", re: /let\s+[A-Za-z0-9_]*Kind\s*=\s*"([^"]+)"/g },
  // Q#/JSON treaty: "kind": "..."
  { name: "treaty-kind-field", re: /"kind"\s*:\s*"([^"]+)"/g },
  // WSetHeat composes its kind as "wset." + WSetFunction + ".forgotten"; the composed form is
  // assembled below, but the route is named here so its disappearance trips the pattern floor.
  { name: "wset-composed", re: /WSetFunction\s*=\s*"([^"]+)"/g },
];

export function kindLiterals(path: string, source: string): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, string[]>();
  const text = path.endsWith(".fs") ? stripFSharpComments(source) : source;

  // WSetHeat composes its kind: "wset." + WSetFunction + ".forgotten". Expand over the
  // closed set of WSetFunction literals so a pressure-token function name cannot hide here.
  const composesWset = /"wset\."\s*\+\s*[A-Za-z0-9_.]*WSetFunction\s*\+\s*"\.forgotten"/.test(text);

  for (const { name, re } of KIND_PATTERNS) {
    const found: string[] = [];
    for (const m of text.matchAll(re)) {
      if (m[1] === undefined) continue;
      if (name === "wset-composed") {
        if (composesWset) found.push(`wset.${m[1]}.forgotten`);
      } else {
        found.push(m[1]);
      }
    }
    if (found.length > 0) out.set(name, found);
  }

  return out;
}

/**
 * The token sets are PARSED OUT OF Heat.fs rather than restated here, so this lint cannot
 * drift away from the classifier it is guarding. A hardcoded copy would keep passing after
 * someone added a new forgetting token to the F#.
 */
export function tokenPredicates(heatSource: string): ReadonlyMap<string, readonly string[]> {
  const text = stripFSharpComments(heatSource);
  const out = new Map<string, readonly string[]>();
  // let isXKind (kind: string) : bool = <body up to the next top-level let>
  const re = /let\s+(is[A-Za-z]+Kind)\s*\([^)]*\)\s*:\s*bool\s*=([\s\S]*?)(?=\n\s{0,4}(?:let|\/\/\/|\[<)|\n\n\n)/g;
  for (const m of text.matchAll(re)) {
    const name = m[1];
    const body = m[2];
    if (name === undefined || body === undefined) continue;
    const needles = [...body.matchAll(/kindContains\s+"([^"]+)"/g)]
      .map((n) => n[1])
      .filter((n): n is string => n !== undefined);
    if (needles.length > 0) out.set(name, needles);
  }
  return out;
}

/** Bindings in Heat.fs whose body references a raw pressure substring probe. */
export function pressureDecidingBindings(heatSource: string): readonly string[] {
  const text = stripFSharpComments(heatSource);
  const names: string[] = [];
  // Split on top-level-ish `let` bindings and keep those whose body mentions the raw probes.
  const parts = text.split(/\n(?=\s*let\s)/);
  for (const part of parts) {
    const nameMatch = /^\s*let\s+(?:private\s+)?([A-Za-z0-9_']+)/.exec(part);
    if (!nameMatch || nameMatch[1] === undefined) continue;
    const name = nameMatch[1];
    // The definitions of the probes themselves are not decisions.
    if (name === "isBackpressureKind" || name === "isDeniedKind") continue;
    const body = part.slice(nameMatch[0].length);
    if (/\bisBackpressureKind\b|\bisDeniedKind\b/.test(body)) names.push(name);
  }
  return names;
}

// ── checks ────────────────────────────────────────────────────────────────────

interface Failure {
  readonly part: "A" | "B" | "floor";
  readonly message: string;
}

export function run(read: (p: string) => string | null): {
  failures: readonly Failure[];
  kindsInspected: number;
  predicatesFound: number;
} {
  const failures: Failure[] = [];

  const heat = read(HEAT_FS);
  if (heat === null) {
    return {
      failures: [{ part: "floor", message: `${HEAT_FS} not found — the classifier surface moved` }],
      kindsInspected: 0,
      predicatesFound: 0,
    };
  }

  // ── token sets, parsed from the source of truth ──
  const predicates = tokenPredicates(heat);
  const forgetting = predicates.get("isForgettingKind") ?? [];
  const backpressure = predicates.get("isBackpressureKind") ?? [];
  const denied = predicates.get("isDeniedKind") ?? [];
  const pressure = [...backpressure, ...denied];

  if (forgetting.length === 0 || pressure.length === 0) {
    failures.push({
      part: "floor",
      message:
        `could not parse the token sets out of ${HEAT_FS} ` +
        `(forgetting=${forgetting.length}, pressure=${pressure.length}) — ` +
        `the classifier was restructured and this lint is now blind`,
    });
  }

  if (predicates.size < PREDICATE_SCAN_FLOOR) {
    failures.push({
      part: "floor",
      message: `scan floor: parsed ${predicates.size} token predicates from ${HEAT_FS}, need >= ${PREDICATE_SCAN_FLOOR}`,
    });
  }

  // ── PART A — the ambiguous class stays empty ──
  const seen = new Map<string, string[]>();
  const perPattern = new Map<string, number>();
  for (const path of KIND_SOURCES) {
    const source = read(path);
    if (source === null) {
      failures.push({ part: "floor", message: `kind source ${path} not found — the corpus moved` });
      continue;
    }
    for (const [pattern, kinds] of kindLiterals(path, source)) {
      perPattern.set(pattern, (perPattern.get(pattern) ?? 0) + kinds.length);
      for (const kind of kinds) {
        const at = seen.get(kind) ?? [];
        if (!at.includes(path)) at.push(path);
        seen.set(kind, at);
      }
    }
  }

  for (const { name } of KIND_PATTERNS) {
    const hits = perPattern.get(name) ?? 0;
    if (hits < PATTERN_FLOOR) {
      failures.push({
        part: "floor",
        message:
          `scan floor: extraction route '${name}' matched ${hits} times across ${KIND_SOURCES.length} ` +
          `sources, need >= ${PATTERN_FLOOR}. That route has gone dark — the corpus below is ` +
          `incomplete and a clean result would be a lie.`,
      });
    }
  }

  const lower = (s: string) => s.toLowerCase();
  for (const [kind, paths] of seen) {
    const k = lower(kind);
    const hitsForget = forgetting.filter((t) => k.includes(lower(t)));
    const hitsPressure = pressure.filter((t) => k.includes(lower(t)));
    if (hitsForget.length > 0 && hitsPressure.length > 0) {
      failures.push({
        part: "A",
        message:
          `heat kind "${kind}" (${paths.join(", ")}) carries BOTH a forgetting token ` +
          `[${hitsForget.join(", ")}] and a pressure token [${hitsPressure.join(", ")}]. ` +
          `HeatSignal.ofKind resolves it by branch ORDER, not by meaning, so it reads ` +
          `Forgotten (destruction) while its name also claims deferral. Rename the kind so ` +
          `exactly one vocabulary token applies.`,
      });
    }
  }

  if (seen.size < KIND_SCAN_FLOOR) {
    failures.push({
      part: "floor",
      message:
        `scan floor: inspected ${seen.size} distinct heat kinds, need >= ${KIND_SCAN_FLOOR}. ` +
        `The extraction patterns stopped matching — a clean result here would be a lie.`,
    });
  }

  // ── PART B — pressure is decided in exactly one place ──
  const deciders = pressureDecidingBindings(heat);
  const extra = deciders.filter((n) => n !== "ofKind");
  if (!deciders.includes("ofKind")) {
    failures.push({
      part: "B",
      message:
        `no binding in ${HEAT_FS} named 'ofKind' consumes isBackpressureKind/isDeniedKind — ` +
        `the single classifier moved or was renamed, and this lint no longer knows where it is`,
    });
  }
  for (const name of extra) {
    failures.push({
      part: "B",
      message:
        `'${name}' in ${HEAT_FS} decides pressure from the raw substring probes, beside ` +
        `HeatSignal.ofKind. That is the SECOND classifier (081M010W1BP087G0R002M2BNVW). ` +
        `Derive it: '${name} kind = kind |> ofKind |> isPressure'.`,
    });
  }

  return { failures, kindsInspected: seen.size, predicatesFound: predicates.size };
}

// ── main ──────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const read = (p: string): string | null => (existsSync(p) ? readFileSync(p, "utf8") : null);
  const { failures, kindsInspected, predicatesFound } = run(read);

  if (failures.length === 0) {
    console.log(
      `heat-kind classifier agreement OK — ${kindsInspected} distinct kinds inspected, ` +
        `${predicatesFound} token predicates parsed, one pressure classifier (HeatSignal.ofKind).`,
    );
    process.exit(0);
  }

  console.error("heat-kind classifier agreement FAILED\n");
  for (const f of failures) console.error(`  [part ${f.part}] ${f.message}`);
  console.error(
    `\n  inspected ${kindsInspected} kinds / ${predicatesFound} predicates. ` +
      `See 081M010W1BP087G0R002M2BNVW and PR #10693 §6.`,
  );
  process.exit(1);
}
