import { describe, expect, test } from "bun:test";
import {
  canonicalConflictGraph,
  countScheduleConflicts,
  findMinimumColorSchedule,
  tryFourClassSchedule,
  verifyPlanarEmbedding,
  type ConflictGraph,
  type PlanarEmbeddingWitness,
} from "./four-color-schedule";
import { stringCompare } from "../collation/collation";

const k4: ConflictGraph = {
  vertices: ["a", "b", "c", "d"],
  edges: [
    ["a", "b"], ["a", "c"], ["a", "d"],
    ["b", "c"], ["b", "d"], ["c", "d"],
  ],
};

const k4Embedding: PlanarEmbeddingWitness = {
  faces: [
    ["a", "b", "c"],
    ["a", "d", "b"],
    ["b", "d", "c"],
    ["c", "d", "a"],
  ],
};

const k5: ConflictGraph = {
  vertices: ["a", "b", "c", "d", "e"],
  edges: [
    ["a", "b"], ["a", "c"], ["a", "d"], ["a", "e"],
    ["b", "c"], ["b", "d"], ["b", "e"],
    ["c", "d"], ["c", "e"], ["d", "e"],
  ],
};

describe("conditional four-color conflict scheduling", () => {
  test("a finite spherical embedding certificate and exact K4 four-class schedule verify", () => {
    expect(verifyPlanarEmbedding(k4, k4Embedding)).toEqual({
      valid: true,
      violations: [],
      eulerCharacteristic: 2,
    });
    const schedule = findMinimumColorSchedule(k4);
    expect(schedule.colorCount).toBe(4);
    expect(schedule.classes.every((members) => members.length === 1)).toBe(true);
    expect(countScheduleConflicts(k4, schedule)).toBe(0);
  });

  test("K5 is the nonplanar five-class obstruction, not silently squeezed into four classes", () => {
    expect(findMinimumColorSchedule(k5).colorCount).toBe(5);
    expect(tryFourClassSchedule(k5)).toBeNull();
  });

  test("a fabricated four-class certificate with adjacent peers sharing a class is detected", () => {
    const invalid = {
      colorCount: 4,
      assignment: { a: 0, b: 0, c: 1, d: 2 },
      classes: [["a", "b"], ["c"], ["d"], []],
    };
    expect(countScheduleConflicts(k4, invalid)).toBe(1);
  });

  test("a malformed facial witness is rejected independently of colorability", () => {
    const result = verifyPlanarEmbedding(k4, { faces: [["a", "b", "c"], ["a", "d", "b"]] });
    expect(result.valid).toBe(false);
    expect(result.violations.some((violation) => violation.includes("one facial traversal"))).toBe(true);
    expect(result.eulerCharacteristic).toBe(0);
  });

  test("canonical scheduling is invariant to vertex, edge, and endpoint order", () => {
    const permuted: ConflictGraph = {
      vertices: ["d", "b", "a", "c"],
      edges: [...k4.edges].reverse().map(([left, right]) => [right, left] as const),
    };
    expect(findMinimumColorSchedule(permuted)).toEqual(findMinimumColorSchedule(k4));
  });
});

// ---------------------------------------------------------------------------
// K3,3 — THE CONTROL THE CLAIM MATRIX NAMES AS ESSENTIAL, AND DID NOT HAVE.
//
// docs/research/2026-09-01-thousand-brains-factor-geometry-claim-matrix.md says:
//
//   "K5 grades chromatic sufficiency, while K3,3 grades whether planarity is being
//    confused with color count. An implementation must separately report planarity
//    status, proper-color validity, and colors used."
//
// K3,3 was named there and implemented nowhere. It is the one case that separates the
// two dials: chi(K3,3) = 2 and it is NONPLANAR. K5 cannot do that job, because K5 is
// nonplanar AND needs five colours -- it moves both dials at once, so a reader cannot
// tell which one a passing test is about.
//
// Found by an adversarial review of #16290 (2026-09-01), which also found that
// `tryFourClassSchedule` took no embedding witness at all -- so the Four Color Theorem
// citation in the module header was attached to a code path that never used it.

import { tryFourClassCertificate } from "./four-color-schedule";

const K33 = {
  vertices: ["a1", "a2", "a3", "b1", "b2", "b3"],
  edges: [
    ["a1", "b1"], ["a1", "b2"], ["a1", "b3"],
    ["a2", "b1"], ["a2", "b2"], ["a2", "b3"],
    ["a3", "b1"], ["a3", "b2"], ["a3", "b3"],
  ] as readonly (readonly [string, string])[],
};

describe("K3,3 separates planarity from colour count", () => {
  test("two colours suffice — so FEW COLOURS DOES NOT IMPLY PLANAR", () => {
    const exact = findMinimumColorSchedule(K33);
    expect(exact.colorCount).toBe(2);
  });

  test("and with no embedding supplied, planarity is NOT-ESTABLISHED, not assumed", () => {
    // The bug this guards: reading a four-class (or two-class) result as evidence of
    // planarity. The implication runs the other way and only with a witness.
    const cert = tryFourClassCertificate(K33);
    expect(cert.schedule).not.toBeNull();
    expect(cert.planarity).toBe("not-established");
    expect(cert.viaFourColorTheorem).toBe(false);
    expect(cert.reason).toContain("not being appealed to");
  });

  test("a FABRICATED planar witness for K3,3 is REFUTED, not accepted", () => {
    // K3,3 has no planar embedding; V-E+F=2 would need F=5 with every face a cycle,
    // and no such set of facial boundaries exists. The verifier must say so.
    const fabricated = {
      faces: [
        ["a1", "b1", "a2", "b2"], ["a2", "b2", "a3", "b3"], ["a3", "b3", "a1", "b1"],
        ["a1", "b2", "a3", "b1"], ["a2", "b3", "a1", "b2"],
      ],
    };
    const cert = tryFourClassCertificate(K33, fabricated);
    expect(cert.planarity).toBe("refuted");
    expect(cert.viaFourColorTheorem).toBe(false);
    expect(cert.reason).toContain("appeals to no theorem");
  });

  test("K5 does NOT do this job — the control that shows why K3,3 was needed", () => {
    // K5 is nonplanar AND needs five colours, so a passing K5 test cannot distinguish
    // "we checked planarity" from "we counted colours". K3,3 moves only one dial.
    const K5 = {
      vertices: ["v1", "v2", "v3", "v4", "v5"],
      edges: ["v1", "v2", "v3", "v4", "v5"].flatMap((a, i, all) =>
        all.slice(i + 1).map((b) => [a, b] as readonly [string, string]),
      ),
    };
    expect(findMinimumColorSchedule(K5).colorCount).toBe(5);
    expect(findMinimumColorSchedule(K33).colorCount).toBe(2);
    // Both nonplanar; the colour counts disagree. That is the whole point.
  });
});

// ---------------------------------------------------------------------------
// THE SURVIVING MUTANTS.
//
// An adversarial review (2026-09-01) ran nine single-guard mutants against this
// module and SIX SURVIVED -- every one of them a planarity criterion nothing tested.
// A verifier whose criteria can be deleted without a test noticing is a check that
// cannot fail, however carefully each criterion is written.
//
// Each fixture below is chosen to ISOLATE one criterion, so a passing test names the
// guard that caught it rather than merely noting a refusal.

// `verifyPlanarEmbedding` is already imported at the top of this file; re-importing it
// here was a duplicate identifier that bun tolerated and tsc did not.
const edges = (...pairs: [string, string][]) => pairs as readonly (readonly [string, string])[];

describe("the planarity criteria are each falsified by something", () => {
  test("EULER — a TOROIDAL embedding passes every other criterion and fails only V-E+F=2", () => {
    // K3,3 genuinely embeds on the torus: V=6, E=9, F=3, so chi = 0, not 2. This face
    // set is a real rotation-system face trace, so every directed edge is traversed
    // exactly once, the graph is connected, every face has length 6, and the traversal
    // count is exactly 2E. Euler is the ONLY thing wrong with it -- which is what makes
    // it a control for that criterion rather than a general "bad witness".
    const k33 = {
      vertices: ["a1", "a2", "a3", "b1", "b2", "b3"],
      edges: edges(
        ["a1", "b1"], ["a1", "b2"], ["a1", "b3"],
        ["a2", "b1"], ["a2", "b2"], ["a2", "b3"],
        ["a3", "b1"], ["a3", "b2"], ["a3", "b3"],
      ),
    };
    const toroidal = {
      faces: [
        ["a3", "b2", "a1", "b3", "a2", "b1"],
        ["b1", "a2", "b2", "a3", "b3", "a1"],
        ["a2", "b3", "a3", "b1", "a1", "b2"],
      ],
    };
    const result = verifyPlanarEmbedding(k33, toroidal);
    expect(result.valid).toBe(false);
    // EXACTLY ONE violation, and it is Euler. If the criterion is deleted this witness
    // is accepted as planar -- which would license a Four Color appeal for a graph that
    // is not planar at all.
    expect(result.violations).toEqual([
      "connected spherical embedding requires V-E+F=2; got 0",
    ]);
  });

  test("FACE LENGTH — a digon boundary is refused by name", () => {
    // Two vertices, one edge, and a pair of 2-cycles offered as faces. No simple
    // embedding has a face of length two.
    const single = { vertices: ["x", "y"], edges: edges(["x", "y"]) };
    const result = verifyPlanarEmbedding(single, { faces: [["x", "y"], ["y", "x"]] });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain("face 0 has fewer than three boundary vertices");
  });

  test("CONNECTIVITY — a disconnected graph is refused by name", () => {
    // Two disjoint triangles, each correctly embedded on its own. Every edge is
    // traversed once in each direction and every face is a triangle; what fails is
    // that the witness format assumes one connected component.
    const twoTriangles = {
      vertices: ["a", "b", "c", "d", "e", "f"],
      edges: edges(["a", "b"], ["b", "c"], ["c", "a"], ["d", "e"], ["e", "f"], ["f", "d"]),
    };
    const result = verifyPlanarEmbedding(twoTriangles, {
      faces: [["a", "b", "c"], ["c", "b", "a"], ["d", "e", "f"], ["f", "e", "d"]],
    });
    expect(result.valid).toBe(false);
    expect(result.violations).toContain("embedding witness currently requires a connected graph");
  });

  test("EXACT, NOT GREEDY — a crown graph where first-fit needs three and chi is two", () => {
    // The vertex names are chosen so the canonical sort INTERLEAVES the two sides
    // (v1a, v1b, v2a, v2b, v3a, v3b). Degree-ordered first-fit in that order uses
    // THREE colours; the graph is bipartite, so chi is TWO. Verified both ways before
    // this test was written.
    //
    // Replacing the exhaustive search with a greedy pass therefore returns 3 here, and
    // this assertion is what notices. Without it, "minimum" was a claim the code made
    // and nothing checked.
    const crown = {
      vertices: ["v1a", "v1b", "v2a", "v2b", "v3a", "v3b"],
      edges: edges(
        ["v1a", "v2b"], ["v1a", "v3b"],
        ["v2a", "v1b"], ["v2a", "v3b"],
        ["v3a", "v1b"], ["v3a", "v2b"],
      ),
    };
    expect(findMinimumColorSchedule(crown).colorCount).toBe(2);
  });
});

describe("each planar-embedding condition has an isolated finite witness", () => {
  const triangle: ConflictGraph = {
    vertices: ["a", "b", "c"],
    edges: [["a", "b"], ["b", "c"], ["c", "a"]],
  };

  test("short faces, unknown vertices, and non-edge traversals are separately named", () => {
    const shortFace = verifyPlanarEmbedding(triangle, { faces: [["a", "b"]] });
    expect(shortFace.violations).toContain("face 0 has fewer than three boundary vertices");

    const unknown = verifyPlanarEmbedding(triangle, { faces: [["a", "b", "outside"]] });
    expect(unknown.violations).toContain("face 0 names an unknown vertex");

    const cycle4: ConflictGraph = {
      vertices: ["a", "b", "c", "d"],
      edges: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "a"]],
    };
    const nonEdge = verifyPlanarEmbedding(cycle4, { faces: [["a", "c", "b", "d"]] });
    expect(nonEdge.violations.some((violation) => violation.includes("traverses non-edge"))).toBe(true);
  });

  test("directional and total facial traversal checks fail on distinct witnesses", () => {
    const sameOrientation = verifyPlanarEmbedding(triangle, {
      faces: [["a", "b", "c"], ["a", "b", "c"]],
    });
    expect(sameOrientation.violations.some((violation) => violation.includes("one facial traversal"))).toBe(true);
    expect(sameOrientation.violations).not.toContain("facial boundary traversal count is not twice the edge count");

    const extraFace = verifyPlanarEmbedding(triangle, {
      faces: [["a", "b", "c"], ["a", "c", "b"], ["a", "b", "c"]],
    });
    expect(extraFace.violations).toContain("facial boundary traversal count is not twice the edge count");
  });

  test("Euler characteristic is checked even when every directed edge appears exactly once", () => {
    const oneFaceDoubleBoundary = verifyPlanarEmbedding(triangle, {
      faces: [["a", "b", "c", "a", "c", "b"]],
    });
    expect(oneFaceDoubleBoundary.eulerCharacteristic).toBe(1);
    expect(oneFaceDoubleBoundary.violations).toEqual(["connected spherical embedding requires V-E+F=2; got 1"]);
  });

  test("connectedness is checked independently of edge traversal counts and Euler characteristic", () => {
    const disconnectedTriangles: ConflictGraph = {
      vertices: ["a", "b", "c", "d", "e", "f"],
      edges: [
        ["a", "b"], ["b", "c"], ["c", "a"],
        ["d", "e"], ["e", "f"], ["f", "d"],
      ],
    };
    const result = verifyPlanarEmbedding(disconnectedTriangles, {
      faces: [
        ["a", "b", "c", "a", "c", "b"],
        ["d", "e", "f", "d", "f", "e"],
      ],
    });
    expect(result.eulerCharacteristic).toBe(2);
    expect(result.violations).toEqual(["embedding witness currently requires a connected graph"]);
  });
});

describe("exact coloring and canonical collation remain independently observable", () => {
  test("an interleaved crown graph is bipartite although deterministic first-fit greedy uses three colors", () => {
    const left = ["1a", "2a", "3a"];
    const right = ["1b", "2b", "3b"];
    const crown: ConflictGraph = {
      vertices: left.flatMap((vertex, index) => [vertex, right[index] as string]),
      edges: left.flatMap((leftVertex, leftIndex) =>
        right.flatMap((rightVertex, rightIndex) => leftIndex === rightIndex ? [] : [[leftVertex, rightVertex] as const]),
      ),
    };
    const adjacency = new Map(crown.vertices.map((vertex) => [vertex, new Set<string>()]));
    for (const [leftVertex, rightVertex] of crown.edges) {
      adjacency.get(leftVertex)?.add(rightVertex);
      adjacency.get(rightVertex)?.add(leftVertex);
    }
    const order = [...crown.vertices].sort((leftVertex, rightVertex) => {
      const degreeDifference = (adjacency.get(rightVertex)?.size ?? 0) - (adjacency.get(leftVertex)?.size ?? 0);
      return degreeDifference || stringCompare(leftVertex, rightVertex);
    });
    const greedyAssignment = new Map<string, number>();
    for (const vertex of order) {
      const forbidden = new Set(
        [...(adjacency.get(vertex) ?? [])]
          .map((neighbour) => greedyAssignment.get(neighbour))
          .filter((color): color is number => color !== undefined),
      );
      let color = 0;
      while (forbidden.has(color)) color += 1;
      greedyAssignment.set(vertex, color);
    }
    const greedyColorCount = Math.max(...greedyAssignment.values()) + 1;

    expect(findMinimumColorSchedule(crown).colorCount).toBe(2);
    expect(greedyColorCount).toBe(3);
  });

  test("canonical vertices and edge endpoints use Unicode code-point order above the BMP", () => {
    const bmp = "\uE000";
    const supplementary = "\u{10000}";
    const canonical = canonicalConflictGraph({
      vertices: [supplementary, bmp],
      edges: [[supplementary, bmp]],
    });
    expect(canonical.vertices).toEqual([bmp, supplementary]);
    expect(canonical.edges).toEqual([[bmp, supplementary]]);
    expect(findMinimumColorSchedule({ vertices: [supplementary, bmp], edges: [[supplementary, bmp]] }).assignment)
      .toEqual({ [bmp]: 0, [supplementary]: 1 });
  });
});
