// qemu-optional-on-windows-premise.test.ts — the exemption must keep earning itself.
//
// `manifests/windows` marks `qemu` `optional` for ONE stated reason: nothing on Windows
// runs it. Every lane that invokes qemu is `runs-on: ubuntu-*`; no `runs-on: windows-*`
// workflow references it and no `.ps1` in the tree invokes it. Mandatory, the row made an
// unused dependency's upstream 404 a red main (gate 33474539115, 2026-09-01).
//
// That reason was written as a comment, and a comment is not a check. So this test holds
// the PREMISE rather than the token: it fails when the justification stops being true,
// which is the only condition under which the exemption becomes wrong.
//
// THE CONTROLS SHARE THE SCANNER, and that is not decoration. The first version of this
// file had controls with their OWN inline regex, so mutating the scanner's regex to
// `false` left all four tests green -- a premise "verified" by a scan that could no longer
// see anything. The mutation run caught it. Both controls now call the same function the
// assertion does, so a scanner that stops matching fails them.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const WORKFLOWS = resolve(ROOT, ".github/workflows");

function workflowFiles(): readonly string[] {
  return readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
}

/** THE one scanner. Every assertion and every control below goes through it. */
function scan(): { readonly mentionsQemu: readonly string[]; readonly windowsRunners: readonly string[]; readonly both: readonly string[] } {
  const mentionsQemu: string[] = [];
  const windowsRunners: string[] = [];
  const both: string[] = [];
  for (const f of workflowFiles()) {
    const text = readFileSync(resolve(WORKFLOWS, f), "utf8");
    const q = /\bqemu\b/i.test(text);
    const w = /runs-on:\s*windows/i.test(text);
    if (q) mentionsQemu.push(f);
    if (w) windowsRunners.push(f);
    if (q && w) both.push(f);
  }
  return { mentionsQemu, windowsRunners, both };
}

describe("qemu is optional on Windows only while nothing on Windows uses it", () => {
  test("the row still carries the `optional` token", () => {
    const manifest = readFileSync(resolve(ROOT, "tools/setup/manifests/windows"), "utf8");
    const row = manifest.split("\n").find((l) => /^qemu\s/.test(l));
    expect(row).toBeDefined();
    expect(row).toContain("optional");
  });

  test("NO windows-runs-on workflow references qemu — the premise of the exemption", () => {
    // If this fails, a Windows lane now needs qemu: remove `optional` from the row in
    // tools/setup/manifests/windows rather than deleting this test.
    expect(scan().both).toEqual([]);
  });

  test("CONTROL: the shared scanner can see qemu at all", () => {
    // Same function as the assertion above, so a broken qemu regex fails HERE and the
    // premise can never be satisfied by a scan that found nothing.
    expect(scan().mentionsQemu.length).toBeGreaterThan(0);
  });

  test("CONTROL: the shared scanner can see windows runners at all", () => {
    expect(scan().windowsRunners.length).toBeGreaterThan(0);
  });
});
