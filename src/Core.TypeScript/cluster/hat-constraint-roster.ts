#!/usr/bin/env bun
/**
 * hat-constraint-roster.ts -- the seven Hat policies, derived from the committed
 * YAML rather than restated.
 *
 * -- THE DEFECT THIS CLOSES -------------------------------------------------
 * A Gatekeeper policy is TWO objects, and only one of them was ever asserted:
 *
 *   1. a `ConstraintTemplate` -- Rego. Gatekeeper compiles it and, only if it
 *      compiles, generates a CRD for the Constraint kind it declares.
 *   2. a `Constraint` -- an instance of that generated CRD. THE POLICY. A
 *      compiled template with no Constraint enforces exactly nothing.
 *
 * `k8s-argocd-health-test.yml` grew a real check for (1) on 2026-09-09
 * ("Gatekeeper compiled every ConstraintTemplate"), after two runs -- 34323056405
 * red and 34338106811 GREEN -- in which `hatconflict` and `hatnocycle` never
 * compiled. Nothing asserts (2), and the reason (2) is the harder half is that
 * ArgoCD assigns Constraints NO HEALTH: an Application whose Constraints are all
 * unapplied reports `OutOfSync + Healthy`, which `isApplicationSynced` admits for
 * git-directory apps with benign drift. So the policy engine can hold zero
 * installed policies inside a green lane, which is what it did.
 *
 * RE-MEASURED 2026-09-09 on run 34390707656 -- the GREEN 37/37 main run, after
 * the template check landed. At proof time `hat-system` was `OutOfSync/Healthy`
 * and its per-resource dump read `ConstraintTemplate/hatconflict: sync=OutOfSync
 * health=-`, and so on for all seven -- while NOT ONE of the seven Constraints
 * appeared in the resource list at all, because ArgoCD cannot render a Constraint
 * whose CRD does not yet exist. The template step then passed 31 seconds later
 * ("all 7 ConstraintTemplates compiled and created") because it waits. So the
 * half that is checked recovers on retry and says so; the half that is not
 * checked has never been observed either way.
 *
 * -- WHAT THIS MODULE IS ----------------------------------------------------
 * The roster, parsed from `full-ai-cluster/k8s/applications/hat-system/policies/`.
 * It is derived, never restated, because a hardcoded list of seven names is the
 * drift shape this tree has already been bitten by: an eighth policy file would
 * be added and the check would keep passing over seven.
 *
 * It also cross-checks the two halves against each other STATICALLY: every
 * Constraint's `kind` must be declared by some ConstraintTemplate's
 * `spec.crd.spec.names.kind`. A Constraint naming a kind no template defines can
 * never be applied on any cluster, and that is knowable from the text alone.
 *
 * -- REFUSALS (each one exists because its absence makes the check vacuous) --
 *   - an EMPTY roster is a failure, never a skip. A loop over zero constraints
 *     passes trivially, which is the check-that-cannot-fail this file exists to
 *     remove -- the same rule the template step already states for itself.
 *   - a Constraint whose kind no template declares is a failure.
 *   - a ConstraintTemplate declaring a kind no Constraint instantiates is a
 *     failure: an installed template enforcing nothing reads as coverage.
 *
 * Run:   bun src/Core.TypeScript/cluster/hat-constraint-roster.ts [--json]
 * Exit:  0 -- roster is well-formed and the two halves agree
 *        1 -- empty, or the halves disagree
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";
// Ordinal (code-point) ordering, per .claude/rules/culture-invariant-by-default.md:
// this roster is iterated by a CI step, not displayed, so a locale-dependent order
// would be a locale-dependent roster.
import { stringCompare } from "../collation/collation.ts";

/** Where the policies live, relative to the repo root. */
export const HAT_POLICY_DIR = "full-ai-cluster/k8s/applications/hat-system/policies";

/** The API group every Gatekeeper Constraint instance carries. */
export const CONSTRAINT_GROUP = "constraints.gatekeeper.sh";
/** The API group every Gatekeeper ConstraintTemplate carries. */
export const TEMPLATE_GROUP = "templates.gatekeeper.sh";

/** One live policy object the lane must be able to find. */
export interface ConstraintRef {
  /** e.g. `HatCooldown` -- the generated CRD kind. */
  readonly kind: string;
  /** e.g. `hat-cooldown-default`. */
  readonly name: string;
  /** The file it was parsed out of, for a diagnosable failure message. */
  readonly source: string;
}

/** One ConstraintTemplate and the Constraint kind it declares. */
export interface TemplateRef {
  /** `metadata.name`, e.g. `hatcooldown`. */
  readonly name: string;
  /** `spec.crd.spec.names.kind`, e.g. `HatCooldown`. */
  readonly declaresKind: string;
  readonly source: string;
}

interface CrdNames {
  readonly kind?: string;
}
interface CrdSpec {
  readonly names?: CrdNames;
}
interface Crd {
  readonly spec?: CrdSpec;
}
interface TemplateSpec {
  readonly crd?: Crd;
}
interface YamlDoc {
  readonly apiVersion?: string;
  readonly kind?: string;
  readonly metadata?: { readonly name?: string };
  readonly spec?: TemplateSpec;
}

/** Every YAML document in a multi-doc body, nulls dropped. */
function documents(text: string): YamlDoc[] {
  const out: YamlDoc[] = [];
  for (const doc of parseAllDocuments(text)) {
    const value = doc.toJS() as unknown;
    if (value === null) continue;
    if (typeof value === "object") out.push(value as YamlDoc);
  }
  return out;
}

/**
 * The Constraint instances in one file body.
 *
 * Matched on the API GROUP, not on a kind allowlist: the whole point is that a
 * new policy file is picked up without editing this one.
 */
export function parseConstraints(text: string, source: string): ConstraintRef[] {
  const out: ConstraintRef[] = [];
  for (const doc of documents(text)) {
    const apiVersion = doc.apiVersion ?? "";
    if (apiVersion.startsWith(CONSTRAINT_GROUP + "/") === false) continue;
    const kind = doc.kind ?? "";
    const name = doc.metadata?.name ?? "";
    if (kind.length === 0) continue;
    if (name.length === 0) continue;
    out.push({ kind, name, source });
  }
  return out;
}

/** The ConstraintTemplates in one file body, with the kind each declares. */
export function parseTemplates(text: string, source: string): TemplateRef[] {
  const out: TemplateRef[] = [];
  for (const doc of documents(text)) {
    const apiVersion = doc.apiVersion ?? "";
    if (apiVersion.startsWith(TEMPLATE_GROUP + "/") === false) continue;
    if (doc.kind !== "ConstraintTemplate") continue;
    const name = doc.metadata?.name ?? "";
    const declaresKind = doc.spec?.crd?.spec?.names?.kind ?? "";
    if (name.length === 0) continue;
    if (declaresKind.length === 0) continue;
    out.push({ name, declaresKind, source });
  }
  return out;
}

/** Both halves, read off the committed policy directory. */
export interface HatPolicyRoster {
  readonly constraints: readonly ConstraintRef[];
  readonly templates: readonly TemplateRef[];
}

/** Read and sort both halves. Sorting keeps the CI output diffable run-to-run. */
export function readHatPolicyRoster(repoRoot: string): HatPolicyRoster {
  const dir = join(repoRoot, HAT_POLICY_DIR);
  const constraints: ConstraintRef[] = [];
  const templates: TemplateRef[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (file.endsWith(".yaml") === false) continue;
    const text = readFileSync(join(dir, file), "utf8");
    constraints.push(...parseConstraints(text, file));
    templates.push(...parseTemplates(text, file));
  }
  constraints.sort((a, b) => stringCompare(a.kind + a.name, b.kind + b.name));
  templates.sort((a, b) => stringCompare(a.name, b.name));
  return { constraints, templates };
}

/**
 * Everything wrong with a roster. An empty array means the roster is sound.
 *
 * Returned rather than thrown so a caller can report ALL of them at once: a run
 * that names one defect per attempt turns a five-minute fix into five CI cycles.
 */
export function rosterFailures(roster: HatPolicyRoster): string[] {
  const failures: string[] = [];
  const emptyRoster =
    "a loop over an empty roster passes trivially, so an empty roster is a failure and never a skip";
  if (roster.constraints.length === 0) {
    failures.push("no Constraint under " + HAT_POLICY_DIR + " -- " + emptyRoster);
  }
  if (roster.templates.length === 0) {
    failures.push("no ConstraintTemplate under " + HAT_POLICY_DIR + " -- " + emptyRoster);
  }
  const declared = new Set(roster.templates.map((t) => t.declaresKind));
  const instantiated = new Set(roster.constraints.map((c) => c.kind));
  for (const c of roster.constraints) {
    if (declared.has(c.kind)) continue;
    failures.push(
      c.source +
        ": Constraint " +
        c.kind +
        "/" +
        c.name +
        " names a kind no ConstraintTemplate declares -- gatekeeper never generates that CRD, so this policy can never be applied on any cluster",
    );
  }
  for (const t of roster.templates) {
    if (instantiated.has(t.declaresKind)) continue;
    failures.push(
      t.source +
        ": ConstraintTemplate " +
        t.name +
        " declares kind " +
        t.declaresKind +
        " that no Constraint instantiates -- a compiled template with no instance enforces nothing while reading as coverage",
    );
  }
  return failures;
}

/**
 * The lines the CI step consumes: `<kind> <name>`, one per Constraint.
 *
 * Deliberately not JSON by default. The consumer is a `while read` loop in bash,
 * and a shape a shell can read without `jq` is one fewer place an empty list can
 * be produced silently -- which is the failure this whole module exists to make
 * impossible.
 */
export function rosterLines(roster: HatPolicyRoster): string[] {
  return roster.constraints.map((c) => c.kind + " " + c.name);
}

/** Repo root, from this file's location. Overridable for tests. */
export function defaultRepoRoot(): string {
  return join(import.meta.dir, "..", "..", "..");
}

if (import.meta.main) {
  const roster = readHatPolicyRoster(defaultRepoRoot());
  const failures = rosterFailures(roster);
  for (const failure of failures) console.error("::error::" + failure);
  if (failures.length > 0) process.exit(1);
  for (const line of rosterLines(roster)) console.log(line);
}
