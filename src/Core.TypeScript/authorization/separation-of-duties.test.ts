/**
 * separation-of-duties.test.ts — including the falsifier for the hole in the version this came from.
 *
 * The first test is the reason this module exists rather than being a copy: it drives the exact
 * manoeuvre the org's hat-id comparison lets through, and pins that keying on the persona stops it.
 */

import { describe, expect, test } from "bun:test";
import { preflightApproval, preflightQuorum, type Actor } from "./separation-of-duties";

const otto = (hat: string): Actor => ({ persona: "otto", hat });
const vera = (hat: string): Actor => ({ persona: "vera", hat });

describe("separation of duties is keyed on the WEARER, not the hat", () => {
  test("THE HOLE IN THE SOURCE: one persona cannot approve its own work by changing hats", () => {
    // `agentic-organization`'s `preflightApproval` compares hat ids, so this pair has DIFFERENT ids
    // and is allowed there. Under `Persona.Worn` — a list, mutable by wear/doff — that is a two-line
    // manoeuvre, not an exotic case. Keying on the persona is what closes it.
    const result = preflightApproval(otto("author"), otto("reviewer"));
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.persona).toBe("otto");
      expect(result.reason).toContain("changing hats does not change who you are");
    }
  });

  test("the same persona in the same hat is refused too — the plain case still holds", () => {
    const result = preflightApproval(otto("author"), otto("author"));
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain('wearing "author"');
  });

  test("a different persona may approve, even wearing the same hat", () => {
    // The rule is about WHO, not about which role. Two authors reviewing each other is the normal,
    // permitted case; refusing it would make the guard unusable.
    expect(preflightApproval(otto("author"), vera("author")).allowed).toBe(true);
    expect(preflightApproval(otto("author"), vera("reviewer")).allowed).toBe(true);
  });
});

describe("quorum counts DISTINCT non-proposer personas", () => {
  test("the proposer's own approval never counts toward the quorum", () => {
    const r = preflightQuorum(otto("author"), [otto("reviewer"), vera("reviewer")], 2);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.reason).toContain("1 distinct non-proposer persona");
      expect(r.reason).toContain("1 self-approval(s) discounted");
    }
  });

  test("duplicate approvals from one persona collapse to one", () => {
    // Otherwise a quorum of N is reachable by one agent signing N times, which is a quorum in name.
    const r = preflightQuorum(otto("author"), [vera("a"), vera("b"), vera("c")], 2);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toContain("1 distinct non-proposer persona");
  });

  test("two genuinely distinct approvers meet a quorum of two", () => {
    const r = preflightQuorum(otto("author"), [vera("reviewer"), { persona: "riven", hat: "reviewer" }], 2);
    expect(r.allowed).toBe(true);
  });

  test("a quorum of zero is met by nobody, and a negative requirement is floored at zero", () => {
    expect(preflightQuorum(otto("a"), [], 0).allowed).toBe(true);
    expect(preflightQuorum(otto("a"), [], -3).allowed).toBe(true);
  });

  test("HONEST CEILING: two personas held by one actor defeat this, and it does not pretend otherwise", () => {
    // A sybil holding two names passes, exactly as it passes any identity-keyed rule. Pricing that
    // is the anti-sybil machinery's job (TravelerRankLedger / SocietyUsefulWork), not this check's.
    const sybilA: Actor = { persona: "otto-alt-1", hat: "author" };
    const sybilB: Actor = { persona: "otto-alt-2", hat: "reviewer" };
    expect(preflightApproval(sybilA, sybilB).allowed).toBe(true);
  });
});
