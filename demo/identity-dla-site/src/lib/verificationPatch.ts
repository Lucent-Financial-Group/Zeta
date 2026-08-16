export const AUTOMATIC_VERIFICATION_PATH = "docs/automation/pages-operator-capability-verification.md";

export function createAutomaticVerificationPatch(baseSha: string): string {
  if (!/^[0-9a-f]{40}$/i.test(baseSha)) throw new Error("verification proposals require a 40-character immutable base SHA");
  const lines = [
    "# Pages Operator Capability Verification",
    "",
    "This file records one bounded end-to-end Pages capability delivery test.",
    "",
    `- Immutable base: \`${baseSha.toLowerCase()}\``,
    "- Delivery: local Pages capability → verifier → scoped Action → gated review branch.",
    "- Direct writes to `main`: prohibited.",
  ];
  return [
    `diff --git a/${AUTOMATIC_VERIFICATION_PATH} b/${AUTOMATIC_VERIFICATION_PATH}`,
    "new file mode 100644",
    "--- /dev/null",
    `+++ b/${AUTOMATIC_VERIFICATION_PATH}`,
    `@@ -0,0 +1,${lines.length.toString()} @@`,
    ...lines.map((line) => `+${line}`),
    "",
  ].join("\n");
}
