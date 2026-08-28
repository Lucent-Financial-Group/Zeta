#!/usr/bin/env bun
/**
 * audit-preservation-namespaces.ts — refuse a NEW preservation root.
 *
 * Enforces `.claude/rules/preservation-has-one-namespace-per-kind.md`. Measured 2026-08-28:
 * preservation had twelve conventions across three surfaces, and had begun nesting on
 * itself (`docs/recovered-orphan-branches-2026-05/misc/archive/`). Nobody diverged on
 * purpose — each agent was mid-rescue and inventing a path was faster than finding the
 * convention. A norm could not stop that; a check can.
 *
 * WHAT IT CHECKS: tracked paths whose FIRST TWO SEGMENTS look like preservation but are not
 * one of the sanctioned roots. It deliberately does not police deeper nesting — inside a
 * sanctioned root, an agent may lay out whatever the rescue needs.
 *
 * WHY IT IS NOT A CONTENT CHECK. It cannot tell whether a rescue was correct or complete;
 * it answers only "will the next agent find this". That is the failure this class actually
 * has — a backup nobody can locate is worse than none, because it also produces the belief
 * that the material is safe.
 *
 * THE GRANDFATHERED SET IS EXPLICIT AND SHRINKING. Existing roots predate the rule and are
 * listed by name so the list is auditable and the count only goes down. A new root is
 * refused; retiring an old one is deleting a line here.
 */

/** The sanctioned roots. Adding to this list is a reviewed change to the rule. */
export const SANCTIONED = ["docs/recovered"] as const;

/**
 * Roots that predate the rule (2026-08-28). Listed individually so they are auditable and
 * can be retired one line at a time — never a wildcard, which would silently re-admit the
 * whole class.
 */
export const GRANDFATHERED = [
  "docs/pr-preservation",
  "docs/recovered-orphan-branches-2026-05",
  "docs/ops/recovery",
  "docs/ops/ruleset-backups",
] as const;

const PRESERVATION_WORD = /(recover|preserv|backup|rescue|salvage|archive)/i;

/**
 * Does this tracked path introduce a preservation root outside the allowed set?
 *
 * Pure so the rule is testable without a repository — the whole value of this audit is the
 * predicate, and a predicate only exercisable against a real checkout is one nobody can
 * write a failing case for.
 */
export function offendingRoot(path: string): string | null {
  const seg = path.split("/");
  if (seg.length < 2) return null;
  const one = seg[0] ?? "";
  const two = `${one}/${seg[1] ?? ""}`;

  // Only paths under docs/ are in scope: `.github/actions/apt-archive-cache` and
  // `memory/feedback_..._preservation_...md` merely CONTAIN the word, and policing every
  // filename containing "archive" would make this a nuisance rather than a guard.
  if (one !== "docs") return null;
  if (!PRESERVATION_WORD.test(seg[1] ?? "")) return null;
  if ((SANCTIONED as readonly string[]).includes(two)) return null;
  if ((GRANDFATHERED as readonly string[]).includes(two)) return null;
  // docs/ops/recovery is three segments; check that shape too.
  const three = `${two}/${seg[2] ?? ""}`;
  if ((GRANDFATHERED as readonly string[]).includes(three)) return null;
  return two;
}

export function auditPaths(paths: readonly string[]): readonly string[] {
  const bad = new Set<string>();
  for (const p of paths) {
    const r = offendingRoot(p);
    if (r !== null) bad.add(r);
  }
  return [...bad].sort();
}

if (import.meta.main) {
  const r = Bun.spawnSync(["git", "ls-files"]);
  const paths = r.stdout.toString().split("\n").filter((l) => l.trim() !== "");

  // CONTROL: an empty file list makes "no offenders" vacuous.
  if (paths.length < 1000) {
    console.log(`REFUSING: only ${String(paths.length)} tracked paths; expected thousands.`);
    process.exit(2);
  }

  const offenders = auditPaths(paths);
  if (offenders.length === 0) {
    console.log(`preservation namespaces: ${String(paths.length)} paths checked, no new roots.`);
    console.log(`  sanctioned: ${SANCTIONED.join(", ")}`);
    console.log(`  grandfathered (${String(GRANDFATHERED.length)}, shrinking): ${GRANDFATHERED.join(", ")}`);
    process.exit(0);
  }
  console.log(`preservation namespaces: ${String(offenders.length)} NEW ROOT(S).`);
  for (const o of offenders) {
    console.log(`::error title=New preservation root::${o} — use docs/recovered/<date>-<event>/ instead`);
    console.log(`  ${o}`);
  }
  console.log("\nA rescue put somewhere new is a rescue the next agent cannot find.");
  console.log("If a fifth KIND is genuinely needed, that is a reviewed change to");
  console.log(".claude/rules/preservation-has-one-namespace-per-kind.md — not a new directory.");
  process.exit(1);
}
