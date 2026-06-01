import { parseRange, satisfies, compareVersions, type Range } from "./semver.ts";
import type { AcePackage, AceDependency, Registry } from "./store.ts";
import type { FetchPackage } from "./resolve.ts";

export type SolveResult =
  | { ok: true; versions: Map<string, string> }   // name -> concrete version (incl. inline-fixed names)
  | { ok: false; reason: "unsatisfiable" | "bad-range" | "registry-miss" | "fetch-failed" | "invalid-package"; detail: string; path: string[] };

// ---- internal helpers ---------------------------------------------------

/** Parse a fetched JSON string into a well-formed AcePackage, or return a failure. Mirrors
 *  resolve.ts's shape guard: a present-but-non-array dependencies field is malformed → invalid-package
 *  (an absent dependencies field is fine; depsOf treats it as []). */
function parsePackage(json: string, url: string, path: string[]): AcePackage | { fail: SolveResult } {
  let dep: unknown;
  try { dep = JSON.parse(json); }
  catch (e) { return { fail: { ok: false, reason: "fetch-failed", detail: `${url}: ${(e as Error).message}`, path } }; }
  const m = (dep as { manifest?: { dependencies?: unknown }; files?: unknown });
  if (typeof dep !== "object" || dep === null || typeof m.manifest !== "object" || m.manifest === null
      || typeof m.files !== "object" || m.files === null
      || (m.manifest.dependencies !== undefined && !Array.isArray(m.manifest.dependencies))) {
    return { fail: { ok: false, reason: "invalid-package", detail: `${url}: not a well-formed AcePackage`, path } };
  }
  return dep as AcePackage;
}

const depsOf = (pkg: AcePackage): ReadonlyArray<AceDependency> =>
  Array.isArray(pkg.manifest.dependencies) ? pkg.manifest.dependencies : [];

/** Highest registry version of `name` (newest-first) satisfying EVERY accumulated range, strictly
 *  below `belowExclusive` when given (the version a later constraint just ruled out — try lower).
 *  null = no candidate. */
function pickCandidate(
  name: string, registry: Registry, ranges: ReadonlyArray<Range>, belowExclusive: string | null,
): string | null {
  const sorted = [...(registry.get(name)?.keys() ?? [])].sort((a, b) => compareVersions(b, a)); // desc: newest first
  for (const v of sorted) {
    if (belowExclusive !== null && compareVersions(v, belowExclusive) >= 0) continue;
    if (ranges.every((r) => satisfies(v, r))) return v;
  }
  return null;
}

// ---- solver -------------------------------------------------------------

/**
 * Deterministic newest-first backtracking version solver. Inline edges are pre-decided (fix version
 * AND source; never registry-looked-up); registry edges contribute semver ranges solved against the
 * registry's versions. On EVERY new constraint the current assignment is re-validated (the load-bearing
 * correctness rule): a now-invalid assignment is repaired to its next-lower satisfying candidate, and
 * its replacement's transitive deps are re-explored. Never verifies hashes/signatures — that is
 * resolve()'s job (Task 5).
 */
export async function solve(root: AcePackage, fetchPackage: FetchPackage, registry: Registry): Promise<SolveResult> {
  const inlineFixed = new Map<string, string>();      // name -> inline version (authoritative; never registry-solved)
  const constraints = new Map<string, Range[]>();     // name -> accumulated registry ranges (monotone: only added)
  const assigned = new Map<string, string>();         // name -> chosen registry version
  const cache = new Map<string, AcePackage>();         // "name@version" / "inline:<url>" -> pkg (fetch at most once)
  const toExplore = new Set<string>();                // registry names queued for a decision
  const inlinePending = new Map<string, AcePackage>(); // inline pkgs whose deps still need exploring

  const addConstraint = (name: string, r: Range): void => {
    const arr = constraints.get(name); if (arr) arr.push(r); else constraints.set(name, [r]);
  };

  /** Ingest a manifest's dependency edges. Inline edges fix the name (version + source) and fetch the
   *  inline package for dep recursion; registry edges add a range constraint and queue the name.
   *  Returns a failure or null. */
  const ingest = async (deps: ReadonlyArray<AceDependency>, ownerPath: string[]): Promise<SolveResult | null> => {
    for (const edge of deps) {
      const here = [...ownerPath, edge.name];
      const ek = (edge as { readonly kind?: unknown }).kind;
      if (ek !== undefined && ek !== "inline" && ek !== "registry") {
        return { ok: false, reason: "invalid-package", detail: `${edge.name}: unknown dependency kind ${JSON.stringify(ek)}`, path: here };
      }

      if (edge.kind === "registry") {
        const parsed = parseRange(edge.version);
        if ("error" in parsed) return { ok: false, reason: "bad-range", detail: `${edge.name}: ${parsed.error}`, path: here };
        addConstraint(edge.name, parsed);
        // Inline-fixed names are authoritative: a registry range on them is a constraint the inline
        // pin must satisfy, not a name to solve.
        if (inlineFixed.has(edge.name)) {
          if (!satisfies(inlineFixed.get(edge.name)!, parsed)) {
            return { ok: false, reason: "unsatisfiable", detail: `${edge.name}@${inlineFixed.get(edge.name)} (inline) violates ${edge.version} (via ${here.join(" → ")})`, path: here };
          }
          continue;
        }
        toExplore.add(edge.name); // (re)consider under the accumulated constraints
        continue;
      }

      // inline edge: fix version + source; record + fetch its package for dep exploration.
      if (typeof edge.url !== "string" || typeof edge.package_hash !== "string") {
        return { ok: false, reason: "invalid-package", detail: `${edge.name}: inline edge missing url/package_hash`, path: here };
      }
      if (inlineFixed.has(edge.name)) continue; // already pinned inline (diamond dedup on inline source)
      inlineFixed.set(edge.name, edge.version);
      // Any registry ranges already accumulated for this name must be satisfied by the inline pin.
      for (const r of constraints.get(edge.name) ?? []) {
        if (!satisfies(edge.version, r)) {
          return { ok: false, reason: "unsatisfiable", detail: `${edge.name}@${edge.version} (inline) violates an accumulated registry range`, path: here };
        }
      }
      toExplore.delete(edge.name);    // inline pin wins; never registry-solve this name
      assigned.delete(edge.name);     // drop any prior registry assignment (inline is authoritative)
      const cacheKey = `inline:${edge.url}`;
      let dep = cache.get(cacheKey);
      if (dep === undefined) {
        let json: string;
        try { json = await fetchPackage(edge.url); }
        catch (e) { return { ok: false, reason: "fetch-failed", detail: `${edge.url}: ${(e as Error).message}`, path: here }; }
        const p = parsePackage(json, edge.url, here);
        if ("fail" in p) return p.fail;
        dep = p; cache.set(cacheKey, dep);
      }
      inlinePending.set(edge.name, dep);
    }
    return null;
  };

  // 1) Seed from the root's deps.
  const seedFail = await ingest(depsOf(root), ["root"]);
  if (seedFail) return seedFail;

  // 2) Fixed-point loop: explore inline-pending packages, then make/repair registry assignments,
  //    until stable. Deterministic — names processed in sorted order, candidates newest-first.
  //    The ceiling guards against pathological non-convergence (e.g. cyclic constraint churn).
  let guard = 0;
  const ceiling = 100000;
  for (;;) {
    if (guard++ > ceiling) return { ok: false, reason: "unsatisfiable", detail: "solver did not converge (possible cycle)", path: ["root"] };

    // 2a) Explore inline-pending packages first — their edges feed the constraint set.
    if (inlinePending.size > 0) {
      const name = [...inlinePending.keys()].sort()[0]!;
      const pkg = inlinePending.get(name)!;
      inlinePending.delete(name);
      const f = await ingest(depsOf(pkg), ["root", name]);
      if (f) return f;
      continue;
    }

    // 2b) Find the next registry name that needs a decision (unassigned) or a repair (current
    //     assignment no longer satisfies all accumulated constraints — the re-validation rule).
    let target: string | null = null;
    const candidates = [...new Set([...toExplore, ...assigned.keys()])].sort();
    for (const name of candidates) {
      if (inlineFixed.has(name)) continue; // inline-fixed names are never registry-solved
      const cur = assigned.get(name);
      const ranges = constraints.get(name) ?? [];
      if (cur === undefined) { target = name; break; }                          // unassigned → decide
      if (!ranges.every((r) => satisfies(cur, r))) { target = name; break; }    // invalidated → repair
    }
    if (target === null) break; // stable

    // 3) Decide / repair `target`.
    if (!registry.has(target)) {
      return { ok: false, reason: "registry-miss", detail: `${target} not found in registry`, path: ["root", target] };
    }
    const ranges = constraints.get(target) ?? [];
    const prev = assigned.get(target);
    // Repairing an invalidated assignment: try strictly below the version that was ruled out.
    const belowExclusive = prev !== undefined && !ranges.every((r) => satisfies(prev, r)) ? prev : null;
    const pick = pickCandidate(target, registry, ranges, belowExclusive);
    if (pick === null) {
      return { ok: false, reason: "unsatisfiable", detail: `${target}: no version satisfies all accumulated ranges`, path: ["root", target] };
    }
    if (pick === prev) { toExplore.delete(target); continue; } // already at the valid pick; just clear the queue

    // Assign, then fetch + explore the chosen version's deps (which may add constraints → trigger 2b repairs).
    assigned.set(target, pick);
    toExplore.delete(target);
    const cacheKey = `${target}@${pick}`;
    let dep = cache.get(cacheKey);
    if (dep === undefined) {
      const entry = registry.get(target)!.get(pick)!;
      let json: string;
      try { json = await fetchPackage(entry.url); }
      catch (e) { return { ok: false, reason: "fetch-failed", detail: `${entry.url}: ${(e as Error).message}`, path: ["root", target] }; }
      const p = parsePackage(json, entry.url, ["root", target]);
      if ("fail" in p) return p.fail;
      dep = p; cache.set(cacheKey, dep);
    }
    const f = await ingest(depsOf(dep), ["root", target]);
    if (f) return f;
  }

  // 4) Compose: inline-fixed names + registry assignments.
  const versions = new Map<string, string>();
  for (const [name, v] of inlineFixed) versions.set(name, v);
  for (const [name, v] of assigned) if (!versions.has(name)) versions.set(name, v);
  return { ok: true, versions };
}
