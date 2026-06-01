import { describe, expect, test } from "bun:test";
import { contentHash } from "./store.ts";

describe("contentHash", () => {
  test("sha256 of known bytes matches the sha256:<hex> form", () => {
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const h = contentHash(new TextEncoder().encode("hello"));
    expect(h).toBe("sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  test("empty input has the known empty-sha256", () => {
    const h = contentHash(new Uint8Array(0));
    expect(h).toBe("sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});
