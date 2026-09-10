import { describe, expect, test } from "bun:test";
import { requireSha256, isTagOnly } from "./from-url.ts";
const HEX = "a".repeat(64);
describe("tag-only pins", () => {
  test("a 64-hex digest still works", () => {
    expect(requireSha256("d", { sha256: HEX } as never)).toBe(HEX);
  });
  test("a missing pin is still refused", () => {
    expect(() => requireSha256("d", {} as never)).toThrow(/sha256= pin required/u);
  });
  test("tag-only WITHOUT a reason is refused", () => {
    expect(() => requireSha256("d", { sha256: "tag-only", url: "https://x/v1.8.0/a.jar" } as never)).toThrow(/tagonly=<reason>/u);
  });
  test("tag-only with a MOVING alias is refused", () => {
    expect(() => requireSha256("d", { sha256: "tag-only", tagonly: "because", url: "https://x/latest/a.jar" } as never)).toThrow(/version-shaped tag/u);
  });
  test("tag-only with a reason and a real tag is accepted", () => {
    const p = requireSha256("d", { sha256: "tag-only", tagonly: "upstream re-cuts the tag", url: "https://x/v1.8.0/a.jar" } as never);
    expect(isTagOnly(p)).toBe(true);
  });
  test("a malformed digest is still refused", () => {
    expect(() => requireSha256("d", { sha256: "nothex" } as never)).toThrow(/64 hex chars/u);
  });
  test("isTagOnly is false for a real digest", () => {
    expect(isTagOnly(HEX)).toBe(false);
  });
});
