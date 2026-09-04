/**
 * run-loop-real.test.ts — the `--hat` flag's parse, and the one refusal it exists for.
 *
 * The whole point of the flag is to NARROW what a tick may do. So the dangerous input is not a
 * hat name that fails to parse — it is one that fails to parse and is then treated as "no hat",
 * because sovereign is the MOST permissive setting. `--hat mangaer` would then run unrestricted
 * while reading, in the command line and in the log, as governed.
 *
 * That is the vacuity class wearing a gate: a restriction that cannot fail is not a restriction.
 */

import { describe, expect, test } from "bun:test";
import { parseHatLevel } from "./run-loop-real";
import { authorityForLevel, SOVEREIGN } from "./room/hat-gate";

describe("parseHatLevel", () => {
  test("every level the gate knows about parses", () => {
    // Derived from the gate rather than retyped: a level added there and forgotten here would
    // otherwise be refused at the command line while working everywhere else.
    for (const level of ["executive_board", "c_suite", "director", "manager", "lead", "individual_contributor"] as const) {
      expect(parseHatLevel(level)).toBe(level);
      // ...and each one denotes a real authority, so the roster is not just six strings.
      expect(authorityForLevel(level)).toBeDefined();
    }
  });

  test("A TYPO IS REFUSED — it must never fall through to sovereign", () => {
    // `null` is the caller's fatal signal. Returning `undefined` here would be indistinguishable
    // from "no --hat given", which is the unrestricted case.
    expect(parseHatLevel("mangaer")).toBeNull();
    expect(parseHatLevel("")).toBeNull();
    expect(parseHatLevel("sovereign")).toBeNull();
    // Case matters: the levels are identifiers, not prose.
    expect(parseHatLevel("Manager")).toBeNull();
    expect(parseHatLevel("C_SUITE")).toBeNull();
  });

  test("a refused hat is NOT the same value as no hat", () => {
    // The distinction the caller depends on: absent means sovereign on purpose, null means the
    // operator asked for something and got it wrong.
    expect(parseHatLevel("manager")).not.toBe(SOVEREIGN);
    expect(parseHatLevel("nonsense")).toBeNull();
  });
});
