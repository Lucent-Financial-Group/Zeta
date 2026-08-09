import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findMissingRootDevDependencies } from "./lint-typescript";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("TypeScript lint dependency preflight", () => {
  test("reports absent root devDependencies before invoking the compiler", () => {
    const root = mkdtempSync(join(tmpdir(), "zeta-lint-deps-"));
    roots.push(root);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ devDependencies: { typescript: "6.0.3", playwright: "1.62.1" } }),
    );
    mkdirSync(join(root, "node_modules", "typescript"), { recursive: true });
    writeFileSync(join(root, "node_modules", "typescript", "package.json"), "{}");

    expect(findMissingRootDevDependencies(root)).toEqual(["playwright"]);
  });

  test("accepts a fully realized root devDependency graph", () => {
    const root = mkdtempSync(join(tmpdir(), "zeta-lint-deps-"));
    roots.push(root);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ devDependencies: { typescript: "6.0.3", "@types/bun": "1.3.12" } }),
    );
    for (const name of ["typescript", "@types/bun"]) {
      const packageDir = join(root, "node_modules", name);
      mkdirSync(packageDir, { recursive: true });
      writeFileSync(join(packageDir, "package.json"), "{}");
    }

    expect(findMissingRootDevDependencies(root)).toEqual([]);
  });
});
