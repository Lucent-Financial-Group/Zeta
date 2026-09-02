import { describe, expect, test } from "bun:test";
import { hatFilter, authorityForLevel, SOVEREIGN } from "./hat-gate";
import type { NextAction } from "../observe";

describe("hat-gate — authority filter", () => {
  const menu: NextAction[] = [
    { kind: "do_item", item: { id: "081KPYCJH0008QG0R003MDS51N", title: "Work", ready: true, ambiguous: false } },
    { kind: "do_item", item: { id: "merge-pr-42", title: "Merge", ready: true, ambiguous: false } },
    { kind: "decompose", item: { id: "081KQ0YZ80008QG0R002T6TM7Z", title: "Big", ready: true, ambiguous: true } },
    { kind: "explore", reason: "curiosity" },
    { kind: "play", reason: "rest" },
    { kind: "edit_grammar", reason: "new action needed" },
    { kind: "respond_to_operator", reason: "operator spoke" },
  ];

  test("sovereign mode passes everything through", () => {
    const filtered = hatFilter(menu, SOVEREIGN);
    expect(filtered).toHaveLength(menu.length);
  });

  // CHANGED, deliberately. This test previously asserted "individual_contributor can only do free
  // modes" — it pinned the defect rather than the intent. `do_item` was gated on `canCreateWork`,
  // false at IC, so the tier that exists to do the work could not do any of it. Doing work and
  // creating work are different authorities; `canDoWork` now carries the first.
  test("individual_contributor DOES do offered work — it just cannot merge or create", () => {
    const auth = authorityForLevel("individual_contributor");
    const filtered = hatFilter(menu, auth);
    expect(filtered.some(a => a.kind === "do_item" && a.item.id === "081KPYCJH0008QG0R003MDS51N")).toBe(true);
    expect(filtered.some(a => a.kind === "do_item" && a.item.id === "merge-pr-42")).toBe(false);
    expect(filtered.some(a => a.kind === "decompose")).toBe(false);
    expect(filtered.some(a => a.kind === "edit_grammar")).toBe(false);
    expect(filtered.some(a => a.kind === "respond_to_operator")).toBe(false);
  });

  test("a claim is gated exactly as the execution it promises", () => {
    // `self_claim` used to fall through to `default: return true`, so ANY hat could promise to
    // deliver an item it was forbidden to touch. The work then does not happen AND a peer stands
    // down because someone said they had it.
    const claimWork: NextAction = {
      kind: "self_claim",
      item: { id: "081KPYCJH0008QG0R003MDS51N", title: "Work", ready: true, ambiguous: false },
      deadline: 0,
    };
    const claimMerge: NextAction = {
      kind: "self_claim",
      item: { id: "merge-pr-42", title: "Merge", ready: true, ambiguous: false },
      deadline: 0,
    };
    const ic = authorityForLevel("individual_contributor");
    expect(hatFilter([claimWork], ic)).toHaveLength(1); // may do it, so may claim it
    expect(hatFilter([claimMerge], ic)).toHaveLength(0); // may NOT merge, so may not claim a merge
    expect(hatFilter([claimMerge], authorityForLevel("manager"))).toHaveLength(1);
  });

  test("lead can create work + decompose but not merge or edit grammar", () => {
    const auth = authorityForLevel("lead");
    const filtered = hatFilter(menu, auth);
    expect(filtered.some(a => a.kind === "do_item" && a.item.id === "081KPYCJH0008QG0R003MDS51N")).toBe(true);
    expect(filtered.some(a => a.kind === "decompose")).toBe(true);
    expect(filtered.some(a => a.kind === "do_item" && a.item.id === "merge-pr-42")).toBe(false);
    expect(filtered.some(a => a.kind === "edit_grammar")).toBe(false);
  });

  test("manager can merge but not edit grammar or access operator", () => {
    const auth = authorityForLevel("manager");
    const filtered = hatFilter(menu, auth);
    expect(filtered.some(a => a.kind === "do_item" && a.item.id === "merge-pr-42")).toBe(true);
    expect(filtered.some(a => a.kind === "edit_grammar")).toBe(false);
    expect(filtered.some(a => a.kind === "respond_to_operator")).toBe(false);
  });

  test("director can edit grammar but not access operator", () => {
    const auth = authorityForLevel("director");
    const filtered = hatFilter(menu, auth);
    expect(filtered.some(a => a.kind === "edit_grammar")).toBe(true);
    expect(filtered.some(a => a.kind === "respond_to_operator")).toBe(false);
  });

  test("free modes are NEVER gated regardless of hat level", () => {
    const auth = authorityForLevel("individual_contributor");
    const filtered = hatFilter(menu, auth);
    expect(filtered.some(a => a.kind === "explore")).toBe(true);
    expect(filtered.some(a => a.kind === "play")).toBe(true);
  });
});
