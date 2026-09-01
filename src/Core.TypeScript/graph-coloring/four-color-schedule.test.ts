import { describe, expect, test } from "bun:test";
import {
  countScheduleConflicts,
  findMinimumColorSchedule,
  tryFourClassSchedule,
  verifyPlanarEmbedding,
  type ConflictGraph,
  type PlanarEmbeddingWitness,
} from "./four-color-schedule";

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
