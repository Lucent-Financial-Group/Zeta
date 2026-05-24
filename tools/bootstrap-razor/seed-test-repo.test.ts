import { describe, expect, test } from "bun:test";

import { parseSeedManifest } from "./seed-test-repo.ts";

describe("parseSeedManifest", () => {
  test("extracts include and exclude entries from fenced yaml", () => {
    const manifest = parseSeedManifest([
      "intro",
      "```yaml",
      "include:",
      "  - openspec/specs/**/spec.md",
      "  - src/Core/README.md          # if exists",
      "",
      "exclude:",
      "  - AGENTS.md",
      "  - docs/**  # except bootstrap-razor/ itself",
      "```",
      "outro",
    ].join("\n"));

    expect(manifest).toEqual({
      include: ["openspec/specs/**/spec.md", "src/Core/README.md"],
      exclude: ["AGENTS.md", "docs/**"],
    });
  });
});
