import { describe, expect, it } from "vitest";
import { AUTOMATIC_VERIFICATION_PATH, createAutomaticVerificationPatch } from "./verificationPatch";

describe("automatic Pages verification patch", () => {
  const baseSha = "a".repeat(40);

  it("emits one bounded new-file unified patch tied to the immutable base", () => {
    const patch = createAutomaticVerificationPatch(baseSha);
    expect(patch).toContain(`diff --git a/${AUTOMATIC_VERIFICATION_PATH} b/${AUTOMATIC_VERIFICATION_PATH}`);
    expect(patch).toContain(`Immutable base: \`${baseSha}\``);
    expect(patch).toContain("Direct writes to `main`: prohibited.");
    expect(patch.length).toBeLessThan(24_000);
  });

  it("FAULT INJECTION: refuses a non-immutable base", () => {
    expect(() => createAutomaticVerificationPatch("not-a-commit")).toThrow("40-character immutable base SHA");
  });
});
