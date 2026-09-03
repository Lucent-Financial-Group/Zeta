// tools/accelerator/local-llm.test.ts
//
// Backend-agnostic tests for the local-LLM primitive — mock the model, so these
// run anywhere with no model/account (the selection + fallback logic is what we
// validate here; the actual on-runner model is exercised by the workflow).

import { describe, expect, test } from "bun:test";
import { chooseIndex, classify, parseChosenIndex, type ModelBackend } from "./local-llm.ts";

function mockBackend(reply: string): ModelBackend {
  return { name: "mock", complete: async () => reply };
}
function throwingBackend(): ModelBackend {
  return {
    name: "mock-throw",
    complete: async () => {
      throw new Error("model unavailable");
    },
  };
}

describe("chooseIndex — the CYOA / classifier choice primitive", () => {
  test("the three fallback causes are distinguished, not conflated", async () => {
    // One boolean could not tell a dropped connection from a lane reaching past its menu. The
    // promotion gate demotes on the second and must not demote on the first.
    const opts = { context: "x", options: ["a", "b", "c"] };
    expect((await chooseIndex(throwingBackend(), opts)).cause).toBe("backend-error");
    expect((await chooseIndex(mockBackend("no digits here"), opts)).cause).toBe("unparseable");
    expect((await chooseIndex(mockBackend("99"), opts)).cause).toBe("out-of-range");
    expect((await chooseIndex(mockBackend("2"), opts)).cause).toBe("none");
  });

  test("`fallback` and `cause` can never disagree", async () => {
    const opts = { context: "x", options: ["a", "b", "c"] };
    for (const backend of [throwingBackend(), mockBackend("nope"), mockBackend("99"), mockBackend("1")]) {
      const r = await chooseIndex(backend, opts);
      expect(r.fallback).toBe(r.cause !== "none");
    }
  });

  test("parses a clean index", async () => {
    const r = await chooseIndex(mockBackend("1"), { context: "x", options: ["a", "b", "c"] });
    expect(r).toEqual({ index: 1, raw: "1", fallback: false, cause: "none" });
  });

  test("extracts the first digit from noisy output", async () => {
    const r = await chooseIndex(mockBackend("The best choice is 2 because…"), {
      context: "x",
      options: ["a", "b", "c"],
    });
    expect(r.index).toBe(2);
    expect(r.fallback).toBe(false);
  });

  test("falls back to 0 on an out-of-range index", async () => {
    const r = await chooseIndex(mockBackend("9"), { context: "x", options: ["a", "b"] });
    expect(r.index).toBe(0);
    expect(r.fallback).toBe(true);
  });

  test("falls back to 0 on non-numeric output", async () => {
    const r = await chooseIndex(mockBackend("banana"), { context: "x", options: ["a", "b"] });
    expect(r.index).toBe(0);
    expect(r.fallback).toBe(true);
  });

  test("falls back to 0 when the backend throws (loop never stalls)", async () => {
    const r = await chooseIndex(throwingBackend(), { context: "x", options: ["a", "b"] });
    expect(r.index).toBe(0);
    expect(r.fallback).toBe(true);
  });

  test("single option short-circuits with no model call", async () => {
    // throwingBackend would throw if called — proves no call happened.
    const r = await chooseIndex(throwingBackend(), { context: "x", options: ["only"] });
    expect(r).toEqual({ index: 0, raw: "", fallback: false, cause: "none" });
  });

  test("empty options throws (caller bug, not a model failure)", async () => {
    await expect(chooseIndex(mockBackend("0"), { context: "x", options: [] })).rejects.toThrow();
  });
});

describe("classify — observe.ts auto-classifier shape", () => {
  test("maps the chosen index to its label", async () => {
    const r = await classify(mockBackend("0"), {
      input: "deploy rolled back after error spike",
      labels: ["incident", "normal"],
    });
    expect(r.label).toBe("incident");
    expect(r.index).toBe(0);
    expect(r.fallback).toBe(false);
  });

  test("fallback picks the first label safely", async () => {
    const r = await classify(throwingBackend(), { input: "x", labels: ["a", "b"] });
    expect(r.label).toBe("a");
    expect(r.fallback).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseChosenIndex — a reply that does not unambiguously name one number is NOT a choice.
//
// The parser used to be `raw.match(/\d+/)`, the FIRST run of digits anywhere in the reply. That is
// right when the model answers bare and silently wrong when it does not: "0-based index: 4" parsed
// as 0 and "1st: 4" as 1, each returned with `fallback: false, cause: "none"` — the system asserting
// the model made a choice it did not make.
//
// That is worse than falling back. The wrong action is dispatched AND the tick is recorded as a
// genuine decision, so it feeds the agreement figures in `decorrelation-meter` and the divergence
// rate the promotion gate reads to decide whether a lane may leave shadow. A misparse launders
// itself into the evidence for promotion.
// ═══════════════════════════════════════════════════════════════════════════

describe("parseChosenIndex", () => {
  test("reads a bare number, with or without ordinary decoration", () => {
    expect(parseChosenIndex("4")).toBe(4);
    expect(parseChosenIndex("  4  ")).toBe(4);
    expect(parseChosenIndex("4.")).toBe(4);
    expect(parseChosenIndex("#4")).toBe(4);
    expect(parseChosenIndex("4 (explore)")).toBe(4);
    expect(parseChosenIndex("I pick 2")).toBe(2);
  });

  test("REFUSES a reply naming two numbers, rather than guessing which is the choice", () => {
    // The two cases that were silently wrong. Both name 4; the old parser answered 0 and 1.
    expect(parseChosenIndex("0-based index: 4")).toBeNull();
    expect(parseChosenIndex("1st: 4")).toBeNull();
    // Correct-by-luck under the old parser, and this is the cost of the rule: it becomes a fallback.
    // The right way round — a recorded fallback is visible in the soak window, a silently wrong
    // action is not.
    expect(parseChosenIndex("Option 3 of 5")).toBeNull();
  });

  test("REFUSES a negative rather than reading it as its absolute value", () => {
    // `/\d+/` does not match the sign, so "-3" used to parse as 3 — a slot the model did not name.
    expect(parseChosenIndex("-3")).toBeNull();
  });

  test("refuses a reply with no number at all", () => {
    expect(parseChosenIndex("the answer")).toBeNull();
    expect(parseChosenIndex("")).toBeNull();
  });

  test("returns the number even when out of range — RANGE is the caller's judgement", () => {
    // Keeping the two decisions separate is what lets `chooseIndex` distinguish `unparseable` from
    // `out-of-range`, and the promotion gate treats an out-of-range pick as an ILLEGAL SELECTION
    // rather than a parse failure. Collapsing them would hide a lane reaching past its menu.
    expect(parseChosenIndex("99")).toBe(99);
    expect(parseChosenIndex("007")).toBe(7);
  });
});

describe("chooseIndex routes the parse through parseChosenIndex", () => {
  const opts = { context: "c", options: ["a", "b", "c", "d", "e"] };

  test("an ambiguous reply is unparseable, not a confident wrong pick", async () => {
    const r = await chooseIndex(mockBackend("0-based index: 4"), opts);
    expect(r.cause).toBe("unparseable");
    expect(r.fallback).toBe(true);
    // The specific defect: this used to be `index: 0, fallback: false, cause: "none"` — action 0
    // dispatched and recorded as the model's own choice.
    expect(r.index).toBe(0);
  });

  test("a bare number is still a first-class choice", async () => {
    const r = await chooseIndex(mockBackend("3"), opts);
    expect(r.index).toBe(3);
    expect(r.fallback).toBe(false);
    expect(r.cause).toBe("none");
  });
});
