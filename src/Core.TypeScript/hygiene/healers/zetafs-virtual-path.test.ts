/**
 * zetafs-virtual-path.test.ts — the drift class, the scope that removes the judgement,
 * and the harness laws.
 */

import { describe, expect, test } from "bun:test";
import { certify, tree, type FileTree } from "../healer-harness";
import {
  inScope,
  rewriteCombines,
  splitArgs,
  zetafsVirtualPathDetector,
  zetafsVirtualPathHealer,
} from "./zetafs-virtual-path";

/** A ZetaFS-shaped module: routes through the abstraction, never touches the host FS. */
const zetafsModule = (body: string) =>
  `namespace Zeta.Core\nmodule Thing =\n    let go (fs: IFileSystem) storeDir =\n        FileSystem.Current.Exists storeDir |> ignore\n${body}\n`;

describe("scope — this is where the judgement went", () => {
  test("a module that routes through the FS abstraction is IN scope", () => {
    const content = zetafsModule('        Path.Combine(storeDir, "cas")');
    expect(inScope("src/Core/ZetaFsFreeze.fs", content)).toBe(true);
  });

  test("a module that touches the HOST filesystem directly is OUT of scope", () => {
    // The load-bearing exclusion. `Path.Combine` is CORRECT on a genuine host path, so a
    // module mixing both would need a judgement at every call site — which is exactly the
    // property `lockfile-healer` requires a no-intelligence healer not to have. Scope, not
    // cleverness, is what removes it.
    const content = zetafsModule('        Directory.CreateDirectory(Path.Combine(storeDir, "cas")) |> ignore');
    expect(inScope("src/Core/Mixed.fs", content)).toBe(false);
  });

  test("a file that never reaches the abstraction is OUT of scope", () => {
    expect(inScope("src/Core/Unrelated.fs", 'let x = Path.Combine("a", "b")\n')).toBe(false);
  });

  test("scope is DERIVED from the file, not a hand-written roster", () => {
    // A new ZetaFS module is covered the moment it exists, and a module that starts
    // touching the host filesystem leaves scope on its own. An allowlist would need
    // someone to remember, which is the defect this repo keeps finding.
    const fresh = zetafsModule('        Path.Combine(storeDir, "brand-new")');
    expect(inScope("src/Core/ZetaFsSomethingWrittenTomorrow.fs", fresh)).toBe(true);
  });
});

describe("detector", () => {
  test("flags Path.Combine and Path.GetDirectoryName in scope", () => {
    const t = tree({
      "src/Core/ZetaFsFreeze.fs": zetafsModule(
        '        let p = Path.Combine(storeDir, "cas")\n        let d = Path.GetDirectoryName p',
      ),
    });
    const rules = zetafsVirtualPathDetector.detect(t).map((f) => f.rule);
    expect(rules).toContain("zetafs-virtual-path/combine");
    expect(rules).toContain("zetafs-virtual-path/dirname");
  });

  test("reports Path.GetFullPath as TIER 2 — detected, never rewritten", () => {
    // A DIFFERENT defect: ambient CWD rather than ambient separator. Removing it changes
    // behaviour for real-path callers (a relative dir stops becoming absolute), which is a
    // semantic choice. Reporting it while declining to fix it is the honest split.
    const t = tree({ "src/Core/ZetaFsDeltaLog.fs": zetafsModule("        let root = Path.GetFullPath dir") });
    const findings = zetafsVirtualPathDetector.detect(t);
    expect(findings.map((f) => f.rule)).toContain("zetafs-virtual-path/fullpath-tier2");
    expect(zetafsVirtualPathHealer.heal(t).get("src/Core/ZetaFsDeltaLog.fs")).toContain("Path.GetFullPath");
  });

  test("does not flag the module that DEFINES the replacement", () => {
    // `ZetaFsPath.fs` names the old calls in its own documentation. Flagging it would make
    // the healer unable to reach a fixed point on the very file that explains it.
    const t = tree({ "src/Core/ZetaFsPath.fs": zetafsModule("        // replaces Path.Combine") });
    expect(zetafsVirtualPathDetector.detect(t)).toEqual([]);
  });
});

describe("rewrite", () => {
  test("picks the arity-named helper and parenthesises compound arguments", () => {
    expect(rewriteCombines('Path.Combine(storeDir, "cas")')).toBe('ZetaFsPath.combine2 storeDir "cas"');
    expect(rewriteCombines('Path.Combine(a, "b", "c")')).toBe('ZetaFsPath.combine3 a "b" "c"');
    expect(rewriteCombines('Path.Combine(d, "objects", hex.Substring(0, 2), hex.Substring(2))')).toBe(
      'ZetaFsPath.combine4 d "objects" (hex.Substring(0, 2)) (hex.Substring(2))',
    );
  });

  test("nested calls and commas inside arguments do not split the argument list", () => {
    // The failure this guards is silent and ugly: a naive comma split turns
    // `hex.Substring(0, 2)` into two arguments and produces code that either does not
    // compile or, worse, compiles into a different path.
    expect(splitArgs('a, hex.Substring(0, 2), "x"')).toEqual(["a", "hex.Substring(0, 2)", '"x"']);
    expect(splitArgs('a, "b, c"')).toEqual(["a", '"b, c"']);
  });

  test("an unbalanced call DECLINES rather than guessing", () => {
    // Totality: never throw, never half-rewrite. A malformed call is left for a human.
    expect(splitArgs("a, (b")).toBeNull();
    expect(rewriteCombines('Path.Combine(a, "b"')).toBe('Path.Combine(a, "b"');
  });
});

describe("harness laws", () => {
  const fixtures = [
    {
      name: "freeze-shaped module",
      tree: tree({
        "src/Core/ZetaFsFreeze.fs": zetafsModule(
          '        let logDir = Path.Combine(storeDir, "log")\n' +
            '        let obj = Path.Combine(storeDir, "objects", hex.Substring(0, 2), hex.Substring(2))\n' +
            "        let parent = Path.GetDirectoryName obj",
        ),
      }) as FileTree,
    },
    {
      name: "already healed",
      tree: tree({
        "src/Core/ZetaFsFreeze.fs": zetafsModule('        let logDir = ZetaFsPath.combine2 storeDir "log"'),
      }) as FileTree,
    },
    {
      name: "out of scope — must be left alone",
      tree: tree({ "src/Core/Unrelated.fs": 'let x = Path.Combine("a", "b")\n' }) as FileTree,
    },
  ];

  test("idempotence, closure and convergence all hold", () => {
    const verdict = certify(zetafsVirtualPathHealer, [zetafsVirtualPathDetector], fixtures);
    expect(verdict.violations).toEqual([]);
    expect(verdict.pass).toBe(true);
  });

  test("the healed tree has no findings — closure, stated directly", () => {
    const healed = zetafsVirtualPathHealer.heal(fixtures[0]!.tree);
    expect(zetafsVirtualPathDetector.detect(healed)).toEqual([]);
  });

  test("an out-of-scope file is byte-identical after healing", () => {
    const before = fixtures[2]!.tree;
    const after = zetafsVirtualPathHealer.heal(before);
    expect(after.get("src/Core/Unrelated.fs")).toBe(before.get("src/Core/Unrelated.fs"));
  });
});

describe("the live tree", () => {
  test("src/Core/ZetaFs*.fs is clean — the healer starts green", async () => {
    // The point of fixing all 31 call sites rather than only the 13 in ZetaFsFreeze: a
    // healer that lands red on its own repository is a backlog item wearing a check.
    const { readdirSync, readFileSync } = await import("node:fs");
    const entries = new Map<string, string>();
    for (const name of readdirSync("src/Core")) {
      if (name.startsWith("ZetaFs") && name.endsWith(".fs"))
        entries.set(`src/Core/${name}`, readFileSync(`src/Core/${name}`, "utf8"));
    }
    expect(entries.size).toBeGreaterThan(0);
    const findings = zetafsVirtualPathDetector
      .detect(entries)
      .filter((f) => f.rule !== "zetafs-virtual-path/fullpath-tier2");
    expect(findings).toEqual([]);
  });
});
