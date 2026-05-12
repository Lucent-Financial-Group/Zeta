// concept_registry.test.ts - tests for B-0310 concept registry extraction.
//
// Run: bun test tools/alignment/concept_registry.test.ts

import { describe, expect, test } from "bun:test";
import {
  buildRegistry,
  extractAlignmentClauses,
  extractBestPractices,
  extractGlassHaloDoctrines,
  extractOttoPrinciples,
  main,
  type SourceText,
} from "./concept_registry.ts";

describe("extractAlignmentClauses", () => {
  test("extracts heading labels in canonical clause order", () => {
    const content = [
      "### SD-2 Peer register",
      "body",
      "### HC-1 Consent-first",
      "body",
      "### DIR-5 Co-authorship is consent-preserving",
    ].join("\n");
    expect(extractAlignmentClauses(content)).toEqual([
      {
        id: "HC-1",
        class: "alignment-clause",
        source: "docs/ALIGNMENT.md",
        label: "Consent-first",
      },
      {
        id: "SD-2",
        class: "alignment-clause",
        source: "docs/ALIGNMENT.md",
        label: "Peer register",
      },
      {
        id: "DIR-5",
        class: "alignment-clause",
        source: "docs/ALIGNMENT.md",
        label: "Co-authorship is consent-preserving",
      },
    ]);
  });
});

describe("extractBestPractices", () => {
  test("extracts stable BP IDs and labels", () => {
    const content = [
      "- **BP-02** *Every skill has a block.*",
      "- **BP-01** *Description is third-person.*",
      "- **BP-WINDOW** *Window delta ledger.*",
    ].join("\n");
    expect(extractBestPractices(content).map((concept) => concept.id)).toEqual([
      "BP-01",
      "BP-02",
      "BP-WINDOW",
    ]);
  });
});

describe("extractOttoPrinciples", () => {
  test("deduplicates IDs across sources and keeps first source", () => {
    const sources: readonly SourceText[] = [
      { path: "CLAUDE.md", content: "Otto-357 says no directives here." },
      { path: "memory/feedback_example.md", content: "Otto-357 repeated. Otto-363 substrate." },
    ];
    const concepts = extractOttoPrinciples(sources);
    expect(concepts.map((concept) => concept.id)).toEqual(["Otto-357", "Otto-363"]);
    expect(concepts[0]?.source).toBe("CLAUDE.md");
  });
});

describe("extractGlassHaloDoctrines", () => {
  test("extracts known doctrine IDs from source phrases", () => {
    const sources: readonly SourceText[] = [
      {
        path: "AGENTS.md",
        content: "Truth over politeness. Total observability. No hidden reasoning.",
      },
      { path: "docs/ALIGNMENT.md", content: "Glass halo discipline matters." },
    ];
    expect(extractGlassHaloDoctrines(sources).map((concept) => concept.id)).toEqual([
      "radical-honesty",
      "total-observability",
      "no-hidden-reasoning",
      "glass-halo-discipline",
    ]);
  });
});

describe("buildRegistry", () => {
  test("builds the repository registry with all four concept classes", () => {
    const registry = buildRegistry("2026-05-08T00:00:00.000Z");
    expect(registry.schema).toBe("concept-registry-v1");
    expect(registry.generated).toBe("2026-05-08T00:00:00.000Z");

    const ids = new Set(registry.concepts.map((concept) => concept.id));
    expect(ids.has("HC-1")).toBe(true);
    expect(ids.has("SD-9")).toBe(true);
    expect(ids.has("DIR-5")).toBe(true);
    expect(ids.has("BP-01")).toBe(true);
    expect(ids.has("BP-28")).toBe(true);
    expect(ids.has("Otto-357")).toBe(true);
    expect(ids.has("radical-honesty")).toBe(true);
    expect(ids.has("total-observability")).toBe(true);

    const classes = new Set(registry.concepts.map((concept) => concept.class));
    expect(classes).toEqual(new Set([
      "alignment-clause",
      "best-practice",
      "otto-principle",
      "glass-halo-doctrine",
    ]));
  });
});

describe("main", () => {
  test("accepts --help", () => {
    expect(main(["--help"])).toBe(0);
  });

  test("rejects unknown args", () => {
    expect(main(["--bad"])).toBe(2);
  });
});
