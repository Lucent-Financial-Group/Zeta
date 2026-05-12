import { describe, expect, test } from "bun:test";
import { parseFrontmatter } from "./reindex-memory-md.ts";

describe("parseFrontmatter", () => {
  test("parses simple key: value frontmatter", () => {
    const content = `---
name: hello
description: world
type: feedback
created: 2026-05-12
---

body`;
    const fm = parseFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm?.name).toBe("hello");
    expect(fm?.description).toBe("world");
    expect(fm?.type).toBe("feedback");
    expect(fm?.created).toBe("2026-05-12");
  });

  test("parses folded scalar (description: >-)", () => {
    const content = `---
name: example
description: >-
  This is a folded
  scalar value
  spanning multiple lines
type: feedback
---

body`;
    const fm = parseFrontmatter(content);
    expect(fm?.description).toBe("This is a folded scalar value spanning multiple lines");
  });

  test("returns null for content without frontmatter", () => {
    expect(parseFrontmatter("no frontmatter here")).toBeNull();
  });

  test("strips quotes from string values", () => {
    const content = `---
name: "quoted name"
description: 'single-quoted desc'
---
body`;
    const fm = parseFrontmatter(content);
    expect(fm?.name).toBe("quoted name");
    expect(fm?.description).toBe("single-quoted desc");
  });
});
