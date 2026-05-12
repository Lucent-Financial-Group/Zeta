// concept_registry.test.ts - tests for B-0310 concept registry extraction.
//
// Run: bun test tools/alignment/concept_registry.test.ts

import { describe, expect, test } from "bun:test";
import {
  buildRegistry,
  extractByRegex,
  extractGlassHaloDoctrines,
} from "./concept_registry.ts";

describe("extractByRegex", () => {
  test("extracts alignment clause IDs from the canonical source", () => {
    const concepts = extractByRegex(
      "docs/ALIGNMENT.md",
      /\b(HC-[1-7]|SD-[1-9]|DIR-[1-5])\b/g,
      "alignment-clause",
    );
    const ids = new Set(concepts.map((concept) => concept.id));
    expect(ids.has("HC-1")).toBe(true);
    expect(ids.has("SD-9")).toBe(true);
    expect(ids.has("DIR-5")).toBe(true);
    expect(concepts.every((concept) => concept.conceptClass === "alignment-clause")).toBe(true);
  });

  test("deduplicates repeated best-practice IDs", () => {
    const concepts = extractByRegex(
      "docs/AGENT-BEST-PRACTICES.md",
      /\b(BP-\d+)\b/g,
      "best-practice",
    );
    const ids = concepts.map((concept) => concept.id);
    expect(ids.length).toBe(new Set(ids).size);
    expect(ids).toContain("BP-01");
  });
});

describe("extractGlassHaloDoctrines", () => {
  test("extracts anchored doctrine concepts from canonical sources", () => {
    const concepts = extractGlassHaloDoctrines();
    const byId = new Map(concepts.map((concept) => [concept.id, concept]));

    expect(byId.has("radical-honesty")).toBe(true);
    expect(byId.has("total-observability")).toBe(true);
    expect(byId.has("substrate-or-it-didnt-happen")).toBe(true);
    expect(byId.get("radical-honesty")?.anchorState).toBe("partially-anchored");
    expect(byId.get("substrate-or-it-didnt-happen")?.anchorState).toBe("factory-native");
  });
});

describe("buildRegistry", () => {
  test("builds a schema-v1.1 registry with all expected concept classes", () => {
    const registry = buildRegistry();
    expect(registry.schema).toBe("concept-registry-v1.1");
    expect(registry.concepts.length).toBeGreaterThan(40);
    expect(registry.anchoredCount).toBeGreaterThan(0);

    expect(registry.summary["alignment-clause"]).toBeGreaterThanOrEqual(21);
    expect(registry.summary["best-practice"]).toBeGreaterThanOrEqual(25);
    expect(registry.summary["otto-principle"]).toBeGreaterThan(0);
    expect(registry.summary["glass-halo-doctrine"]).toBeGreaterThan(0);

    const ids = new Set(registry.concepts.map((concept) => concept.id));
    expect(ids.has("HC-1")).toBe(true);
    expect(ids.has("BP-01")).toBe(true);
    expect(ids.has("Otto-363")).toBe(true);
    expect(ids.has("radical-honesty")).toBe(true);
  });
});
