// book-index.test.ts — falsifiers for the named index.
//
// The claims this suite exists to break, in order of how much damage they do if false:
//
//   1. The index UNDER-REPORTS silently.  A subject shown an incomplete footprint approves a
//      portrayal they were never shown. §SWEEP and §AUDIT.
//   2. A check that could not run reads as a pass.  §EXIT CODES.
//   3. An adjudication becomes a permanent exemption.  §ADJUDICATION EXPIRY.
//   4. Consent survives a change it should not, or dies on a change it should not.  §HASHING.
//   5. `pending`/`role-only` and `revoked`/`omitted` are claimed to enforce identically in
//      three separate prose surfaces.  §STATE RULES pins it mechanically.

import { describe, expect, test } from "bun:test";
import {
  parseRegistry,
  STATE_RULES,
  SUBJECT_STATES,
  withheldNamesFor,
  type Subject,
} from "./registry.ts";
import {
  canonicalize,
  findOccurrences,
  hashCanonical,
  hashEntry,
  parseDocument,
  type Block,
} from "./scan.ts";
import { applyRatchet, findCandidates, parseBaseline } from "./sweep.ts";
import {
  exitCodeFor,
  parseAdjudications,
  registeredTokens,
  runAudit,
  type AuditInputs,
} from "./audit-coverage.ts";
import { buildIndex } from "./build-index.ts";
import { computeDelta, type ApprovalRecord } from "./delta.ts";

// ---------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------

const REGISTRY_JSON = JSON.stringify({
  book: "fixture",
  root: "fixture",
  notProse: [],
  subjects: [
    {
      id: "nadia",
      role: "friend",
      state: "named",
      ledgerAnchor: "Nadia",
      nameWithheldFromRegistry: false,
      detectors: { names: ["Nadia"], rolePhrases: [] },
    },
    {
      id: "the-aunt",
      role: "aunt",
      state: "role-only",
      ledgerAnchor: "*(aunt)*",
      nameWithheldFromRegistry: true,
      detectors: { names: [], rolePhrases: ["my aunt"] },
    },
    {
      id: "the-child",
      role: "minor",
      state: "omitted",
      ledgerAnchor: "*(child)*",
      nameWithheldFromRegistry: true,
      detectors: { names: [], rolePhrases: ["my nephew"] },
    },
  ],
});

function fixtureRegistry() {
  return parseRegistry(REGISTRY_JSON, "fixture");
}

function blocksOf(text: string): Block[] {
  return parseDocument("fixture/ch-01.md", text).blocks;
}

function detectorSets(reg: ReturnType<typeof fixtureRegistry>) {
  return reg.subjects.map((s) => ({
    subjectId: s.id,
    names: s.detectors.names,
    rolePhrases: s.detectors.rolePhrases,
  }));
}

function baseAuditInputs(overrides: Partial<AuditInputs>): AuditInputs {
  const registry = fixtureRegistry();
  const blocks = blocksOf("# One\n\nNothing to see.\n");
  return {
    registry,
    blocks,
    filesScanned: 1,
    occurrences: [],
    adjudications: [],
    baseline: { generatedFrom: "", entries: [] },
    withheldNames: () => [],
    leakScan: () => new Map(),
    leakScope: "fixture",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------------------
describe("STATE RULES — the prose claim, pinned", () => {
  // Three surfaces (registry.ts, the generated index, README) all assert that these pairs
  // enforce identically and differ only in disposition. A prose claim repeated three times is
  // three places to drift, so it is checked here instead of trusted there.
  test("pending enforces exactly as role-only", () => {
    expect(STATE_RULES.pending).toEqual(STATE_RULES["role-only"]);
  });

  test("omitted enforces exactly as revoked", () => {
    expect(STATE_RULES.omitted).toEqual(STATE_RULES.revoked);
  });

  test("only `named` permits a name in the text", () => {
    const permitting = SUBJECT_STATES.filter((s) => STATE_RULES[s].nameMayAppear);
    expect(permitting).toEqual(["named"]);
  });

  test("every declared state has a rule — a state with no rule would silently permit everything", () => {
    for (const state of SUBJECT_STATES) expect(STATE_RULES[state]).toBeDefined();
    expect(Object.keys(STATE_RULES).sort()).toEqual([...SUBJECT_STATES].sort());
  });
});

// ---------------------------------------------------------------------------------------
describe("REGISTRY — the refusals are the falsifiers", () => {
  test("refuses a withheld-name subject that also lists names here (it would publish them)", () => {
    const json = JSON.stringify({
      book: "b",
      root: "r",
      subjects: [
        {
          id: "x",
          role: "r",
          state: "pending",
          ledgerAnchor: "x",
          nameWithheldFromRegistry: true,
          detectors: { names: ["Real Name"], rolePhrases: [] },
        },
      ],
    });
    expect(() => parseRegistry(json, "t")).toThrow(/nameWithheldFromRegistry but lists/);
  });

  test("refuses a findable-by-nothing subject — it would report zero appearances and read as absent", () => {
    const json = JSON.stringify({
      book: "b",
      root: "r",
      subjects: [
        {
          id: "x",
          role: "r",
          state: "named",
          ledgerAnchor: "x",
          nameWithheldFromRegistry: false,
          detectors: { names: [], rolePhrases: [] },
        },
      ],
    });
    expect(() => parseRegistry(json, "t")).toThrow(/can never be found/);
  });

  test("refuses an empty registry — it would make every downstream check vacuously green", () => {
    expect(() => parseRegistry(JSON.stringify({ book: "b", root: "r", subjects: [] }), "t")).toThrow(
      /makes every check vacuous/,
    );
  });

  test("refuses duplicate ids and unknown states", () => {
    const dup = {
      id: "x",
      role: "r",
      state: "named",
      ledgerAnchor: "x",
      nameWithheldFromRegistry: false,
      detectors: { names: ["X"], rolePhrases: [] },
    };
    expect(() => parseRegistry(JSON.stringify({ book: "b", root: "r", subjects: [dup, dup] }), "t")).toThrow(
      /duplicate subject id/,
    );
    expect(() =>
      parseRegistry(
        JSON.stringify({ book: "b", root: "r", subjects: [{ ...dup, state: "probably-fine" }] }),
        "t",
      ),
    ).toThrow(/unknown state/);
  });

  test("withheldNamesFor returns null (not []) when names cannot be supplied", () => {
    // This is the whole fail-closed mechanism: `[]` is "checked, nothing found" and `null` is
    // "could not check". Collapsing them turns a missing overlay into a silent pass.
    const subject = fixtureRegistry().subjects.find((s) => s.id === "the-aunt") as Subject;
    expect(withheldNamesFor(subject, null)).toBeNull();
    expect(withheldNamesFor(subject, { names: {} })).toBeNull();
    expect(withheldNamesFor(subject, { names: { "the-aunt": [] } })).toBeNull();
    expect(withheldNamesFor(subject, { names: { "the-aunt": ["A"] } })).toEqual(["A"]);
  });
});

// ---------------------------------------------------------------------------------------
describe("HASHING — what invalidates consent and what does not", () => {
  test("a reflow does NOT invalidate an approval", () => {
    const a = "She was the one who\nnoticed it first.";
    const b = "She was the one who noticed    it first.";
    expect(hashCanonical(canonicalize(a))).toBe(hashCanonical(canonicalize(b)));
  });

  test("a wording change DOES invalidate an approval", () => {
    const a = "She was the one who noticed it first.";
    const b = "She was the one who claimed to notice it first.";
    expect(hashCanonical(canonicalize(a))).not.toBe(hashCanonical(canonicalize(b)));
  });

  test("emphasis is inside the hash — bolding can change a portrayal", () => {
    expect(hashCanonical(canonicalize("she agreed"))).not.toBe(
      hashCanonical(canonicalize("she **agreed**")),
    );
  });

  test("adding a marker does not invalidate an approval", () => {
    const withMarker = "<!-- subject: nadia -->\nShe noticed it first.";
    expect(hashCanonical(canonicalize(withMarker))).toBe(
      hashCanonical(canonicalize("She noticed it first.")),
    );
  });

  test("the entry hash is order-independent but content-sensitive", () => {
    expect(hashEntry(["a", "b"])).toBe(hashEntry(["b", "a"]));
    expect(hashEntry(["a", "b"])).not.toBe(hashEntry(["a", "c"]));
    // Losing a passage must change the entry hash, or a deletion would silently keep consent.
    expect(hashEntry(["a", "b"])).not.toBe(hashEntry(["a"]));
  });
});

// ---------------------------------------------------------------------------------------
describe("SCAN — blocks, markers, and detection", () => {
  test("markers scope to their own section and stop at the next heading", () => {
    const blocks = blocksOf(
      ["# A", "", "<!-- subject: nadia -->", "", "Inside the marker.", "", "# B", "", "Outside it."].join("\n"),
    );
    const inside = blocks.find((b) => b.canonical === "Inside the marker.");
    const outside = blocks.find((b) => b.canonical === "Outside it.");
    expect(inside?.markedSubjects).toEqual(["nadia"]);
    expect(outside?.markedSubjects).toEqual([]);
  });

  test("an explicit close ends the marker before the next heading", () => {
    const blocks = blocksOf(
      ["# A", "", "<!-- subject: nadia -->", "", "Covered.", "", "<!-- /subject -->", "", "Not covered."].join("\n"),
    );
    expect(blocks.find((b) => b.canonical === "Covered.")?.markedSubjects).toEqual(["nadia"]);
    expect(blocks.find((b) => b.canonical === "Not covered.")?.markedSubjects).toEqual([]);
  });

  test("code fences are captured as code, not silently merged into prose", () => {
    const blocks = blocksOf(["Prose here.", "", "```", "let Nadia = 1;", "```", "", "More prose."].join("\n"));
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "code", "prose"]);
  });

  test("a name matches case-sensitively and on whole words only", () => {
    const reg = fixtureRegistry();
    const blocks = blocksOf(
      ["Nadia was there.", "", "The maximum was nadia-shaped.", "", "Nadiawitz was not.", "", "Nadia's coat."].join("\n"),
    );
    const hits = findOccurrences(blocks, detectorSets(reg)).filter((o) => o.subjectId === "nadia");
    const texts = hits.map((h) => h.block.canonical);
    expect(texts).toContain("Nadia was there.");
    expect(texts).toContain("Nadia's coat."); // possessive still matches
    expect(texts).not.toContain("Nadiawitz was not."); // substring does not
    expect(texts).not.toContain("The maximum was nadia-shaped."); // lowercase does not
  });

  test("a role phrase matches case-insensitively — sentence-initial capitals are grammar", () => {
    const reg = fixtureRegistry();
    const blocks = blocksOf(["My aunt drove.", "", "It was my aunt again."].join("\n"));
    const hits = findOccurrences(blocks, detectorSets(reg)).filter((o) => o.subjectId === "the-aunt");
    expect(hits).toHaveLength(2);
  });

  test("one block matched twice for one subject is ONE appearance, strongest detector kept", () => {
    const reg = parseRegistry(
      JSON.stringify({
        book: "b",
        root: "r",
        subjects: [
          {
            id: "nadia",
            role: "friend",
            state: "named",
            ledgerAnchor: "n",
            nameWithheldFromRegistry: false,
            detectors: { names: ["Nadia"], rolePhrases: ["my friend"] },
          },
        ],
      }),
      "t",
    );
    const blocks = blocksOf("Nadia, my friend, arrived.");
    const hits = findOccurrences(blocks, detectorSets(reg));
    expect(hits).toHaveLength(1);
    expect(hits[0]?.detectorKind).toBe("name");
  });

  test("a marker adds an appearance the scan could not otherwise find", () => {
    // The unnamed-but-identifiable case: no registered string is present, and the index still
    // has to carry the passage. This is the ONLY thing markers are for.
    const reg = fixtureRegistry();
    const blocks = blocksOf(["# A", "", "<!-- subject: nadia -->", "", "The woman who ran the lab said no."].join("\n"));
    const hits = findOccurrences(blocks, detectorSets(reg)).filter((o) => o.subjectId === "nadia");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.detectorKind).toBe("marker");
  });
});

// ---------------------------------------------------------------------------------------
describe("SWEEP — the ratchet", () => {
  const registeredForFixture = registeredTokens(fixtureRegistry());

  test("finds a capitalised mid-sentence token that is never lowercase", () => {
    const blocks = blocksOf("It was Vandenberg who first noticed the drift.");
    const found = findCandidates({ blocks, registeredTokens: registeredForFixture });
    expect(found.map((c) => c.token)).toContain("Vandenberg");
  });

  test("ordinary vocabulary is excluded by the never-seen-lowercase rule", () => {
    const blocks = blocksOf("The Hinge is the joint. A hinge swings.");
    expect(findCandidates({ blocks, registeredTokens: registeredForFixture }).map((c) => c.token)).not.toContain(
      "Hinge",
    );
  });

  test("sentence-initial capitals alone never qualify", () => {
    const blocks = blocksOf("Vandenberg noticed.");
    expect(findCandidates({ blocks, registeredTokens: registeredForFixture })).toHaveLength(0);
  });

  test("acronyms, code identifiers, inline code and registered names are excluded", () => {
    const blocks = blocksOf(
      "It was ZFC and `SomeIdent` and AlarmAlgebra and Nadia, all in one line, mid-sentence.",
    );
    const tokens = findCandidates({ blocks, registeredTokens: registeredForFixture }).map((c) => c.token);
    expect(tokens).not.toContain("ZFC");
    expect(tokens).not.toContain("SomeIdent");
    expect(tokens).not.toContain("AlarmAlgebra");
    expect(tokens).not.toContain("Nadia");
  });

  test("a candidate outside the baseline is NOVEL — the case the whole mechanism exists for", () => {
    const result = applyRatchet([{ token: "Vandenberg", count: 1, locations: [] }], {
      generatedFrom: "",
      entries: [{ token: "Girard", triaged: true }],
    });
    expect(result.novel.map((c) => c.token)).toEqual(["Vandenberg"]);
  });

  test("a baseline entry no longer in the prose is STALE — a baseline may not keep dead cover", () => {
    const result = applyRatchet([], {
      generatedFrom: "",
      entries: [{ token: "Girard", triaged: true }],
    });
    expect(result.stale).toEqual(["Girard"]);
  });

  test("untriaged debt counts only tokens still present", () => {
    const result = applyRatchet([{ token: "Girard", count: 2, locations: [] }], {
      generatedFrom: "",
      entries: [
        { token: "Girard", triaged: false },
        { token: "Gone", triaged: false },
      ],
    });
    expect(result.untriaged).toBe(1);
  });

  test("baseline parse refuses duplicates and a missing triaged flag", () => {
    expect(() =>
      parseBaseline(JSON.stringify({ entries: [{ token: "A", triaged: true }, { token: "A", triaged: true }] }), "t"),
    ).toThrow(/duplicate token/);
    expect(() => parseBaseline(JSON.stringify({ entries: [{ token: "A" }] }), "t")).toThrow(/needs boolean/);
  });
});

// ---------------------------------------------------------------------------------------
describe("AUDIT — the under-report catcher", () => {
  test("a missing overlay is UNCHECKED, never a pass", () => {
    // Uses the REAL resolver against an absent overlay, so the test exercises the production
    // path rather than a fixture that returns null for everyone.
    const result = runAudit(baseAuditInputs({ withheldNames: (s) => withheldNamesFor(s, null) }));
    const unchecked = result.findings.filter((f) => f.severity === "unchecked" && f.check === "LEAK");
    expect(unchecked).toHaveLength(2); // the-aunt and the-child
    expect(exitCodeFor(result, false)).toBe(2);
  });

  test("a withheld name present in the repo FAILS, and the report never echoes the name", () => {
    const result = runAudit(
      baseAuditInputs({
        withheldNames: (s) => (s.id === "the-aunt" ? ["Marguerite"] : []),
        leakScan: () => new Map([["Marguerite", ["docs/books/x.md"]]]),
      }),
    );
    const leak = result.findings.filter((f) => f.check === "LEAK" && f.severity === "fail");
    expect(leak).toHaveLength(1);
    expect(JSON.stringify(leak)).not.toContain("Marguerite");
    expect(JSON.stringify(leak)).toContain("docs/books/x.md");
  });

  test("an `omitted` subject appearing at all is reported", () => {
    const reg = fixtureRegistry();
    const blocks = blocksOf("I took my nephew to the fair.");
    const occurrences = findOccurrences(blocks, detectorSets(reg));
    const result = runAudit(baseAuditInputs({ blocks, occurrences }));
    expect(result.findings.some((f) => f.check === "STATE" && f.subjectId === "the-child")).toBe(true);
  });

  test("a marker naming an unregistered subject FAILS", () => {
    const blocks = blocksOf(["# A", "", "<!-- subject: whoever -->", "", "Text."].join("\n"));
    const result = runAudit(baseAuditInputs({ blocks }));
    expect(result.findings.some((f) => f.check === "REGISTRY" && /unknown subject id/.test(f.message))).toBe(true);
  });

  test("LIVENESS — an empty corpus is UNCHECKED, not a clean pass", () => {
    // Without this, deleting the book would make the audit greener than leaving it in place.
    const result = runAudit(baseAuditInputs({ blocks: [], filesScanned: 0 }));
    expect(result.findings.some((f) => f.check === "LIVENESS")).toBe(true);
    expect(exitCodeFor(result, false)).toBe(2);
  });

  test("a missing sweep baseline is UNCHECKED, not a pass", () => {
    const result = runAudit(baseAuditInputs({ baseline: null }));
    expect(result.findings.some((f) => f.check === "SWEEP" && f.severity === "unchecked")).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------
describe("ADJUDICATION EXPIRY — an exemption that cannot become permanent", () => {
  const reg = fixtureRegistry();
  const blocks = blocksOf("My nephew is omitted entirely, per the standing rule.");
  const occurrences = findOccurrences(blocks, detectorSets(reg));
  const hash = blocks[0]?.hash ?? "";

  test("a matching adjudication silences the finding", () => {
    const result = runAudit(
      baseAuditInputs({
        blocks,
        occurrences,
        adjudications: [
          { blockHash: hash, subjectId: "the-child", reason: "meta", by: "t", at: "t", evidence: "e" },
        ],
      }),
    );
    expect(result.findings.filter((f) => f.check === "STATE")).toHaveLength(0);
  });

  test("EDIT THE TEXT AND THE ADJUDICATION EXPIRES — the finding returns AND the stale row fails", () => {
    // This is the property that stops the adjudication file becoming a licence. The test is
    // the mutation of the previous one: same adjudication, changed text.
    const editedBlocks = blocksOf("My nephew is omitted entirely, per the standing minor rule.");
    const editedOccurrences = findOccurrences(editedBlocks, detectorSets(reg));
    const result = runAudit(
      baseAuditInputs({
        blocks: editedBlocks,
        occurrences: editedOccurrences,
        adjudications: [
          { blockHash: hash, subjectId: "the-child", reason: "meta", by: "t", at: "t", evidence: "e" },
        ],
      }),
    );
    expect(result.findings.some((f) => /STALE/.test(f.message))).toBe(true);
    expect(result.findings.some((f) => f.check === "STATE" && /but matched/.test(f.message))).toBe(true);
  });

  test("adjudication parse refuses a row missing any required field", () => {
    expect(() =>
      parseAdjudications(JSON.stringify({ adjudications: [{ blockHash: "h", subjectId: "s" }] }), "t"),
    ).toThrow(/needs a non-empty string/);
  });
});

// ---------------------------------------------------------------------------------------
describe("EXIT CODES — a check that did not run is not a check that passed", () => {
  const clean = { findings: [], filesScanned: 1, blocksScanned: 1, subjectsChecked: 1, leakScope: "x", untriagedCandidates: 0 };

  test("0 only when everything ran and passed", () => {
    expect(exitCodeFor(clean, false)).toBe(0);
  });

  test("2 when a check could not run", () => {
    expect(
      exitCodeFor({ ...clean, findings: [{ severity: "unchecked", check: "LEAK", message: "m" }] }, false),
    ).toBe(2);
  });

  test("--allow-unchecked still refuses a clean 0 while a check did not run", () => {
    expect(
      exitCodeFor({ ...clean, findings: [{ severity: "unchecked", check: "LEAK", message: "m" }] }, true),
    ).toBe(1);
  });

  test("1 when a check ran and failed", () => {
    expect(exitCodeFor({ ...clean, findings: [{ severity: "fail", check: "STATE", message: "m" }] }, false)).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------
describe("DELTA — what makes many revisions survivable", () => {
  const reg = fixtureRegistry();
  const text = [
    "# One",
    "",
    "Nadia arrived early and waited by the door without saying anything.",
    "",
    "# Two",
    "",
    "Nadia left late and said nothing about the argument.",
  ].join("\n");
  const blocks = blocksOf(text);
  const index = buildIndex(reg, blocks, 1);
  const entry = index.entries.find((e) => e.subjectId === "nadia");

  function approvalFor(): ApprovalRecord {
    return {
      subjectId: "nadia",
      entryHash: entry?.entryHash ?? "",
      approvedAt: "2026-08-26",
      approvedVia: "fixture",
      passages: (entry?.appearances ?? []).map((a) => ({ file: a.file, hash: a.hash })),
    };
  }

  test("an unchanged footprint keeps the approval — nobody is asked anything", () => {
    const deltas = computeDelta(index, [approvalFor()], new Map(), new Map());
    const nadia = deltas.find((d) => d.subjectId === "nadia");
    expect(nadia?.stillValid).toBe(true);
    expect(nadia?.changes).toHaveLength(0);
  });

  test("editing ONE passage invalidates the entry hash and produces a one-passage delta", () => {
    const approval = approvalFor();
    const revisedBlocks = blocksOf(text.replace(
        "Nadia left late and said nothing about the argument.",
        "Nadia left late and said nothing at all about the argument.",
      ));
    const revisedIndex = buildIndex(reg, revisedBlocks, 1);
    const byHash = new Map(revisedBlocks.map((b) => [b.hash, b] as const));
    const approvedText = new Map(blocks.map((b) => [b.hash, b.canonical] as const));

    const nadia = computeDelta(revisedIndex, [approval], byHash, approvedText).find(
      (d) => d.subjectId === "nadia",
    );
    expect(nadia?.stillValid).toBe(false);
    expect(nadia?.unchangedCount).toBe(1);
    expect(nadia?.changes).toHaveLength(1);
    // A near-identical rewrite is shown as a rewrite, not as an unrelated deletion plus
    // addition. Display only — the verdict above came from hash equality alone.
    expect(nadia?.changes[0]?.kind).toBe("revised");
  });

  test("a wholly new passage is ADDED, and a deleted one is REMOVED", () => {
    const approval = approvalFor();
    const grown = blocksOf(`${text}\n\n# Three\n\nNadia was mentioned once more, in a different room.`);
    const grownIndex = buildIndex(reg, grown, 1);
    const byHash = new Map(grown.map((b) => [b.hash, b] as const));
    const nadia = computeDelta(grownIndex, [approval], byHash, new Map(blocks.map((b) => [b.hash, b.canonical] as const))).find(
      (d) => d.subjectId === "nadia",
    );
    expect(nadia?.changes.map((c) => c.kind)).toEqual(["added"]);

    const shrunk = blocksOf("# One\n\nNadia arrived early and waited by the door without saying anything.\n");
    const shrunkIndex = buildIndex(reg, shrunk, 1);
    const removed = computeDelta(
      shrunkIndex,
      [approval],
      new Map(shrunk.map((b) => [b.hash, b] as const)),
      new Map(blocks.map((b) => [b.hash, b.canonical] as const)),
    ).find((d) => d.subjectId === "nadia");
    expect(removed?.stillValid).toBe(false);
    expect(removed?.changes.map((c) => c.kind)).toEqual(["removed"]);
  });

  test("a subject with no approval reports never-approved, not 'no change'", () => {
    const nadia = computeDelta(index, [], new Map(), new Map()).find((d) => d.subjectId === "nadia");
    expect(nadia?.approved).toBe(false);
    expect(nadia?.stillValid).toBe(false);
  });
});
