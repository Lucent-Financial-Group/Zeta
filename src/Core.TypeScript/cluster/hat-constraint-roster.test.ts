#!/usr/bin/env bun
/**
 * Falsifiers for `hat-constraint-roster.ts`.
 *
 * The module exists because a green lane held zero installed policies, so the
 * tests here are built around the two ways THIS module could repeat that:
 *
 *   - report an empty roster as success (the vacuity class in its purest form);
 *   - report a roster whose halves cannot possibly line up on a live cluster.
 *
 * Every negative test MUTATES a copy of the real committed YAML rather than
 * asserting over a hand-written fixture, so a change to the policy format that
 * silently stops the parser from matching turns these red instead of leaving
 * them passing over text nothing reads.
 *
 * THE CONTROL, and it is the important one: `rosterFailures` over the REAL
 * committed roster must return an EMPTY array. Without it, every negative test
 * below would still pass if `rosterFailures` were mutated to return a failure
 * unconditionally -- a check that always fails is as useless as one that cannot.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HAT_POLICY_DIR,
  parseConstraints,
  parseTemplates,
  readHatPolicyRoster,
  rosterFailures,
  rosterLines,
  defaultRepoRoot,
  type HatPolicyRoster,
} from "./hat-constraint-roster.ts";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const POLICY_DIR = join(REPO_ROOT, HAT_POLICY_DIR);

/** Every committed policy file body, keyed by filename. */
function policyBodies(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const file of readdirSync(POLICY_DIR).sort()) {
    if (file.endsWith(".yaml") === false) continue;
    out.push([file, readFileSync(join(POLICY_DIR, file), "utf8")]);
  }
  return out;
}

/** A roster built from bodies the caller may have mutated first. */
function rosterFrom(bodies: Array<[string, string]>): HatPolicyRoster {
  const constraints = bodies.flatMap(([f, t]) => parseConstraints(t, f));
  const templates = bodies.flatMap(([f, t]) => parseTemplates(t, f));
  return { constraints, templates };
}

describe("hat constraint roster", () => {
  test("CONTROL: the committed roster is sound -- must SURVIVE every mutation below", () => {
    const roster = readHatPolicyRoster(REPO_ROOT);
    expect(rosterFailures(roster)).toEqual([]);
  });

  test("CONTROL: the roster is non-empty and every entry is well-formed", () => {
    const roster = readHatPolicyRoster(REPO_ROOT);
    expect(roster.constraints.length).toBeGreaterThan(0);
    expect(roster.templates.length).toBe(roster.constraints.length);
  });

  test("an EMPTY roster is a failure, never a skip", () => {
    expect(rosterFailures({ constraints: [], templates: [] }).length).toBeGreaterThan(0);
  });

  /**
   * Text-level mutation, not object-level: the parser is part of what is under
   * test, so a mutation that never passes through it would leave a broken
   * parser green.
   */
  function keepDocs(body: string, wanted: string): string {
    const docs = body.split("\n---");
    return docs.filter((d) => d.includes(wanted)).join("\n---");
  }

  test("MUTATION: a Constraint whose kind no template declares is refused", () => {
    const bodies = policyBodies();
    const first = bodies[0];
    if (first === undefined) throw new Error("no policy files to mutate");
    const stripped = keepDocs(first[1], "constraints.gatekeeper.sh");
    const mutated = rosterFrom([[first[0], stripped], ...bodies.slice(1)]);
    const failures = rosterFailures(mutated);
    expect(failures.join(" ")).toContain("names a kind no ConstraintTemplate declares");
  });

  test("MUTATION: a ConstraintTemplate no Constraint instantiates is refused", () => {
    const bodies = policyBodies();
    const first = bodies[0];
    if (first === undefined) throw new Error("no policy files to mutate");
    const stripped = keepDocs(first[1], "templates.gatekeeper.sh");
    const mutated = rosterFrom([[first[0], stripped], ...bodies.slice(1)]);
    const failures = rosterFailures(mutated);
    expect(failures.join(" ")).toContain("that no Constraint instantiates");
  });

  test("rosterLines emits one shell-readable KIND NAME pair per Constraint", () => {
    const roster = readHatPolicyRoster(REPO_ROOT);
    const lines = rosterLines(roster);
    expect(lines.length).toBe(roster.constraints.length);
    for (const line of lines) expect(line.split(" ").length).toBe(2);
  });

  test("defaultRepoRoot resolves to a tree containing the policy directory", () => {
    expect(readHatPolicyRoster(defaultRepoRoot()).constraints.length).toBeGreaterThan(0);
  });
});
