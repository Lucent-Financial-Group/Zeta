// Falsifiers for the elevator lint. Half of these are the cases the eslint rule
// `sonarjs/no-os-command-from-path` demonstrably does NOT catch — a `run()` wrapper, an
// argv-prefix array, a program chosen through a variable — which is why the P1 in
// docs/BUGS.md (2026-08-24) was live on main while that rule was available.
import { expect, test, describe } from "bun:test";
import {
  blankComments,
  commandPositionReason,
  scanSource,
  WAIVER_RE,
} from "./lint-no-path-resolved-privilege-elevator.ts";

const one = (src: string) => scanSource("f.ts", src);

describe("the shapes eslint's callee-based rule cannot see", () => {
  test("a project run() wrapper", () => {
    expect(one('const r = run("sudo", ["rm", "-rf", p]);').length).toBe(1);
  });
  test("an argv PREFIX built as an array", () => {
    expect(one('const prefix = ["sudo"] as const;').length).toBe(1);
    expect(one('return ["sudo", "--", commandPath];').length).toBe(1);
  });
  test("the program chosen through a variable", () => {
    expect(one('const cmd = needsSudo ? "sudo" : "tar";').length).toBe(1);
    expect(one('const cmd = "doas";').length).toBe(1);
  });
  test("the ordinary spawn shapes are still caught", () => {
    expect(one('spawnSync("sudo", ["-k"]);').length).toBe(1);
    expect(one('execFileSync(\n  "pkexec",\n  ["dd"],\n);').length).toBe(1);
  });
});

describe("what is NOT a command position — a lint that flags everything gets turned off", () => {
  test("an object property value", () => {
    expect(one('return { ok: true, mechanism: "sudo" };')).toEqual([]);
  });
  test("a comparison", () => {
    expect(one('if (mechanism === "sudo") { go(); }')).toEqual([]);
    expect(one('if (mechanism !== "sudo") { go(); }')).toEqual([]);
  });
  test("a type-alias member", () => {
    expect(one('export type EscalationMechanism = "sudo" | "pkexec";')).toEqual([]);
  });
  test("a nullish default", () => {
    expect(one('const service = options.service ?? "sudo";')).toEqual([]);
  });
  test("an element that is not first in its array", () => {
    expect(one('const w = ["env", "sudo", "command"];')).toEqual([]);
  });
  test("a mention inside a comment or a doc block", () => {
    expect(one('// spawnSync("sudo", ["-k"]) used to live here\nconst x = 1;')).toEqual([]);
    expect(one('/**\n * `execFileSync("sudo", [])` is what this replaced.\n */\nconst x = 1;')).toEqual([]);
  });
  test("the resolver itself, which legitimately takes the NAME", () => {
    expect(one('const p = resolveElevatorPathOrThrow("sudo");')).toEqual([]);
    expect(one('const r = resolveElevator("pkexec");')).toEqual([]);
  });
});

describe("the waiver is a DECLARATION, and an empty one does not count", () => {
  test("a reasoned marker on the same line waives", () => {
    expect(one('const S = "sudo"; // zeta-elevator-not-argv: PAM service name')).toEqual([]);
  });
  test("a reasoned marker on the line above waives", () => {
    expect(one('// zeta-elevator-not-argv: PAM service name\nconst S = "sudo";')).toEqual([]);
  });
  test("a marker with NO reason does not waive — an unexplained suppression is the vacuity class", () => {
    expect(one('const S = "sudo"; // zeta-elevator-not-argv:').length).toBe(1);
    expect(WAIVER_RE.test("zeta-elevator-not-argv:")).toBe(false);
  });
  test("an unrelated comment does not waive", () => {
    expect(one('const S = "sudo"; // this is fine, trust me').length).toBe(1);
  });
});

describe("mechanics", () => {
  test("blankComments preserves length, and therefore every line number", () => {
    const src = 'const a = 1; // "sudo"\n/* "doas" */\nconst b = "pkexec";';
    const out = blankComments(src);
    expect(out.length).toBe(src.length);
    expect(out.split("\n").length).toBe(src.split("\n").length);
    expect(out).not.toContain("sudo");
    expect(out).toContain("pkexec");
  });

  test("a string containing a comment opener does not blank the rest of the file", () => {
    const src = 'const u = "http://x"; const c = "sudo";';
    expect(blankComments(src)).toContain("sudo");
    expect(one(src).length).toBe(1);
  });

  test("commandPositionReason names WHY, so a finding can be argued with", () => {
    expect(commandPositionReason("spawnSync(")).toBe("first argument of a call");
    expect(commandPositionReason("const x = [")).toBe("first element of an array literal");
    expect(commandPositionReason("const x = cond ? ")).toBe("a ternary branch");
    expect(commandPositionReason("const x = ")).toBe("the value of an assignment");
    expect(commandPositionReason("const x = cond ? a : ")).toBe("a ternary branch");
    expect(commandPositionReason("{ mechanism: ")).toBeNull();
  });

  test("the line number reported is the line the literal is on, not the line the call starts on", () => {
    const f = one('const x = 1;\nconst y = 2;\nspawnSync(\n  "sudo",\n  [],\n);');
    expect(f[0]?.line).toBe(4);
  });

  test("every elevator name in the roster is matched, not just sudo", () => {
    for (const n of ["sudo", "doas", "pkexec", "gsudo", "runas"]) {
      expect(one(`spawnSync("${n}", []);`).length).toBe(1);
    }
  });
});
