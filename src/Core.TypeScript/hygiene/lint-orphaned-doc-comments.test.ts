/**
 * lint-orphaned-doc-comments.test.ts — the check has to fire, and has to stay quiet.
 *
 * A lint is judged twice: it must catch the defect it was built for, and it must not fire on the
 * shapes that are correct. The second half is the one that decides whether anyone keeps it — a
 * noisy lint gets suppressed, and a suppressed lint is a check that did not run.
 *
 * The first draft of this one flagged FILE HEADERS, which is the commonest correct shape in the
 * repository. It reported 101 sites tree-wide; with the header case excluded the true number is 57.
 * Forty-four of the original findings were the lint being wrong, so that case gets its own test.
 */

import { describe, expect, test } from "bun:test";
import { orphanedDocsIn, topLevelDocBlocks } from "./lint-orphaned-doc-comments";

/** Assembled from parts, because a fixture containing a literal delimiter cannot sit in a comment. */
const OPEN = "/" + "**";
const CLOSE = " *" + "/";
const doc = (...body: string[]) => [OPEN, ...body.map((b) => ` * ${b}`), CLOSE].join("\n");
const oneLine = (text: string) => `${OPEN} ${text} *` + "/";

const find = (source: string) => orphanedDocsIn("f.ts", source);

describe("THE DEFECT: a doc comment followed by another, with no code between", () => {
  test("two stacked blocks — the first documents nothing", () => {
    const src = [doc("the module header"), "", doc("detached"), doc("belongs to f"), "export function f() {}"].join("\n");
    const found = find(src);
    expect(found).toHaveLength(1);
    expect(found[0]?.firstLine).toBe("detached");
  });

  test("THREE stacked blocks report TWO orphans — measured in run-agent.ts", () => {
    // The shape that prompted the lint: an editor showed `mergeQueues` a docstring reading
    // "Run the organization and turn it into the surface", a different function entirely.
    const src = [
      doc("header"),
      "",
      oneLine("belongs to a()"),
      doc("belongs to b()"),
      doc("belongs to c()"),
      "export function c() {}",
    ].join("\n");
    expect(find(src)).toHaveLength(2);
  });

  test("blank lines between them do not make it legal", () => {
    const src = [doc("header"), "", doc("detached"), "", "", doc("belongs to f"), "export function f() {}"].join("\n");
    expect(find(src)).toHaveLength(1);
  });

  test("a ONE-LINE block can be the orphan, and is reported by its own text", () => {
    // The report has to name WHICH comment came loose. A one-line block keeps its text on the
    // opening line, and reading the next line instead printed the delimiter as the content.
    const src = [doc("header"), "", oneLine("the ladder, top-down"), doc("belongs to f"), "export const f = 1;"].join("\n");
    const found = find(src);
    expect(found).toHaveLength(1);
    expect(found[0]?.firstLine).toBe("the ladder, top-down");
  });
});

describe("WHAT MUST NOT FIRE — the half that decides whether the lint survives", () => {
  test("A FILE HEADER FOLLOWED BY THE FIRST SYMBOL'S DOC IS CORRECT, and was 44 false positives", () => {
    const src = [doc("what this module is for"), "", doc("belongs to f"), "export function f() {}"].join("\n");
    expect(find(src)).toEqual([]);
  });

  test("...and the exemption is POSITIONAL, not a guess about the text", () => {
    // "Is this the first block in the file?" is a fact. "Does this read like a header?" is a guess,
    // and a lint that guesses is one somebody will argue with instead of fixing the code.
    const src = ["import { x } from './x';", "", doc("NOT a header — code came first"), doc("belongs to f"), "export function f() {}"].join("\n");
    expect(find(src)).toHaveLength(1);
  });

  test("an ordinary documented symbol is silent", () => {
    const src = [doc("header"), "", doc("belongs to f"), "export function f() {}", "", doc("belongs to g"), "export function g() {}"].join("\n");
    expect(find(src)).toEqual([]);
  });

  test("INDENTED doc comments are never flagged — interface and union members are the normal case", () => {
    // Two adjacent doc comments inside a discriminated union are correct: each documents the member
    // that follows it, and the members are separated by `|` rather than by a statement.
    const src = [
      doc("header"),
      "",
      "export type T =",
      `  ${OPEN} the first member *` + "/",
      "  | { readonly kind: 'a' }",
      `  ${OPEN} the second member *` + "/",
      "  | { readonly kind: 'b' };",
    ].join("\n");
    expect(find(src)).toEqual([]);
  });

  test("A LINE COMMENT BETWEEN TWO BLOCKS STOPS THE CHECK — a deliberate narrowing, stated", () => {
    // Only BLANK lines are skipped when looking for what follows a block. A `//` line between two
    // doc comments is arguably still an orphan — nothing is documented by the first — but a `//`
    // line is also how people legitimately annotate a region, and firing there would put the lint
    // into the argument-with-the-author category rather than the fix-the-code one.
    //
    // Recorded as behaviour rather than left to be discovered: the earlier draft of this test
    // asserted 0 under a comment claiming it "SHOULD fire", which is the same defect this whole
    // pass is about — prose disagreeing with the code beneath it, inside the test that pins it.
    const src = [doc("header"), "", doc("detached"), "// a note", doc("belongs to f"), "export function f() {}"].join("\n");
    expect(find(src)).toHaveLength(0);
  });

  test("a file with no doc comments at all is silent rather than erroring", () => {
    expect(find("export const x = 1;\n")).toEqual([]);
    expect(find("")).toEqual([]);
  });
});

describe("topLevelDocBlocks parses what it claims to", () => {
  test("it finds multi-line and single-line blocks alike", () => {
    const src = [doc("a", "b"), "export const x = 1;", oneLine("c"), "export const y = 2;"].join("\n");
    expect(topLevelDocBlocks(src)).toHaveLength(2);
  });

  test("an INDENTED block is not top-level, and is not counted", () => {
    const src = ["export interface I {", `  ${OPEN} a field *` + "/", "  readonly a: number;", "}"].join("\n");
    expect(topLevelDocBlocks(src)).toEqual([]);
  });

  test("an unterminated block does not swallow the rest of the file", () => {
    // A block that never closes yields no pair rather than a pair running to EOF — the second
    // would make every following comment look nested and silence the lint for that whole file.
    const src = [OPEN, " * opened and never closed", "export const x = 1;"].join("\n");
    expect(topLevelDocBlocks(src)).toEqual([]);
  });

  test("AN INDENTED CLOSER INSIDE A BLOCK DOES NOT END IT — a doc comment may quote code", () => {
    // Requiring the closer at column 0 is what makes the line scan safe. Accepting a trimmed one
    // would end this block at the sample line, leaving the block's real closer to be read as
    // ordinary text and the next doc comment misparsed — the lint would then be wrong about the
    // rest of the file, which is worse than being silent about it.
    const src = [
      OPEN,
      " * An example of what a nested block looks like:",
      " *",
      "   *" + "/",
      CLOSE,
      "export const x = 1;",
      "",
      doc("belongs to y"),
      "export const y = 2;",
    ].join("\n");
    const blocks = topLevelDocBlocks(src);
    expect(blocks).toHaveLength(2);
    // The first block spans lines 0..4 — through the sample, not stopping at it.
    expect(blocks[0]?.[0]).toBe(0);
    expect(blocks[0]?.[1]).toBe(4);
    // ...and with the parse intact, nothing here is an orphan.
    expect(find(src)).toEqual([]);
  });

  test("a single-line block's open and close are the SAME line", () => {
    const blocks = topLevelDocBlocks([oneLine("one line"), "export const x = 1;"].join("\n"));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.[0]).toBe(blocks[0]?.[1]);
  });
});
