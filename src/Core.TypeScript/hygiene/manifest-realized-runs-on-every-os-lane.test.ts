// manifest-realized-runs-on-every-os-lane.test.ts
//
// `manifest-realized.ts` shipped supporting FOUR manifests -- brew, brew-cask, apt,
// windows -- and was wired into exactly ONE lane (macOS). The tool was complete; its
// deployment was not, and nothing said so. `manifests/apt` (35 rows) and
// `manifests/windows` (14 rows) had no host-realization check at all.
//
// That is the same shape as the defect the tool itself exists to catch, one level up:
// a capability DECLARED and not REALIZED. The tool's own header says "A declaration
// that nothing checks is not a declaration"; a CHECK that nothing runs is not a check.
//
// This test is the guard against it recurring. A new OS install lane that forgets the
// realization step fails here rather than shipping a lane whose green means less than
// the lanes beside it.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const INVOCATION = /manifest-realized\.ts/;

/**
 * Every surface that installs the OS-native toolchain and therefore OWES a realization
 * check. Keyed by the manifest it is responsible for, so a reader can see the coverage
 * matrix directly rather than inferring it from filenames.
 */
const OS_INSTALL_LANES: readonly { readonly manifest: string; readonly file: string }[] = [
  { manifest: "brew + brew-cask", file: ".github/workflows/macos-install-sh-test.yml" },
  { manifest: "apt", file: "src/Core.TypeScript/ci/dockerfiles/ubuntu-install-sh-test/Dockerfile" },
  { manifest: "windows", file: "src/Core.TypeScript/ci/dockerfiles/windows-install-ps1-test/Dockerfile" },
];

describe("every OS install lane verifies its own manifest was realized", () => {
  for (const lane of OS_INSTALL_LANES) {
    test(`${lane.file} runs manifest-realized.ts (manifests/${lane.manifest})`, () => {
      const text = readFileSync(resolve(ROOT, lane.file), "utf8");
      expect(text).toMatch(INVOCATION);
    });
  }

  // The list above is the claim; this is the control on it. If a fourth OS-native
  // manifest is added to `manifest-realized.ts` without a lane appearing here, the
  // coverage matrix has a hole and the table above has silently stopped being complete.
  test("MANIFESTS in manifest-realized.ts are all covered by a lane above", () => {
    const tool = readFileSync(resolve(ROOT, "tools/setup/manifest-realized.ts"), "utf8");
    const m = /export const MANIFESTS = \[([^\]]*)\]/.exec(tool);
    expect(m).not.toBeNull();
    const declared = [...(m?.[1] ?? "").matchAll(/"([a-z-]+)"/g)].map((x) => x[1]);
    expect(declared.length).toBeGreaterThan(0);
    const covered = OS_INSTALL_LANES.map((l) => l.manifest).join(" ");
    for (const name of declared) expect(covered).toContain(name);
  });

  // A path that does not exist would make every assertion above vacuously unreachable,
  // so the files are proven readable rather than assumed. Without this a renamed lane
  // turns the suite red for the right reason; a DELETED one would turn it red for the
  // wrong reason and be read as "the check is enforcing".
  test("every lane file exists and is non-empty", () => {
    for (const lane of OS_INSTALL_LANES) {
      const text = readFileSync(resolve(ROOT, lane.file), "utf8");
      expect(text.length).toBeGreaterThan(200);
    }
  });
});
