// tier0-disjointness.test.ts — cheap guard that the live Tier-0 roster is an antichain.
//
// Otto 2026-08-27: builtin fixtures fire none of these five, so a commute check
// over BUILTIN_FIXTURES is identity ∘ identity (vacuous). A mixed tree that
// actually fires ≥2 healers is the control. Write-set disjointness is why they
// commute today; it is a property of THIS roster, not of the harness. The
// first overlapping healer reintroduces order-dependence and certify() will
// not catch it (A fixed point ≠ THE same fixed point).
//
// Independently reproduced on this clone 2026-08-27 before landing.

import { describe, expect, test } from "bun:test";
import { composeHealers, tree, treesEqual, writeSet, type FileTree, type Healer } from "../healer-harness";
import { exactOptionalHealer } from "./exact-optional-spread";
import { staleDocCrossRefHealer } from "./stale-doc-cross-ref";
import { staleJsHealer } from "./stale-js";
import { unpinnedActionsHealer } from "./unpinned-actions";
import { unusedImportHealer } from "./unused-import";

const TIER0: readonly Healer[] = [
  staleJsHealer,
  unpinnedActionsHealer,
  unusedImportHealer,
  exactOptionalHealer,
  staleDocCrossRefHealer,
];

/** Mixed tree that must fire several healers. Vacuous if fewer than two write. */
const mixed: FileTree = tree({
  "src/a.ts": 'import { unused } from "./b.ts";\nimport { used } from "./c.ts";\nexport const x = used;\n',
  "src/a.js": "// stale sibling of a.ts\n",
  ".github/workflows/w.yml": "jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n",
  "src/opt.ts": "export const p = {\n  a: flag ? used : undefined,\n};\n",
  "docs/d.md": "See [gone](../src/removed.ts) and [a](../src/a.ts).\n",
});

function firedOn(t: FileTree): readonly Healer[] {
  return TIER0.filter((h) => writeSet(t, h.heal(t)).length > 0);
}

describe("Tier-0 write-sets are pairwise disjoint on a mixed trigger (vacuity-guarded)", () => {
  test("at least two healers actually write — otherwise commute is identity", () => {
    expect(firedOn(mixed).length).toBeGreaterThanOrEqual(2);
  });

  test("pairwise write-sets do not overlap", () => {
    const sets = TIER0.map((h) => ({ name: h.name, paths: new Set(writeSet(mixed, h.heal(mixed))) }));
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const inter = [...sets[i]!.paths].filter((p) => sets[j]!.paths.has(p));
        expect(inter).toEqual([]);
      }
    }
  });

  test("all 20 ordered pairs commute (ordinal-canonical FileTree, not Map iteration order)", () => {
    for (let i = 0; i < TIER0.length; i++) {
      for (let j = 0; j < TIER0.length; j++) {
        if (i === j) continue;
        const ab = TIER0[j]!.heal(TIER0[i]!.heal(mixed));
        const ba = TIER0[i]!.heal(TIER0[j]!.heal(mixed));
        expect(treesEqual(ab, ba)).toBe(true);
      }
    }
  });

  test("compose in roster order equals compose in reverse — same fixed point, this roster", () => {
    const fwd = composeHealers("fwd", TIER0);
    const rev = composeHealers("rev", [...TIER0].reverse());
    expect(treesEqual(fwd.heal(mixed), rev.heal(mixed))).toBe(true);
  });
});
