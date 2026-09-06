// nci-witness-receipt.test.ts — byte-pinned finite formal-witness controls only.
import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalReceipt, renderCanonicalReceipt, verifyPinnedSubject, verifyReceipt } from "./nci-witness-receipt";

function root(): string {
  return process.cwd();
}

function copiedSubject(): string {
  const subject = mkdtempSync(join(tmpdir(), "zeta-nci-witness-"));
  for (const relative of [
    "src/Core.TLA/specs/NciNonUrgency.tla",
    "src/Core.TLA/specs/NciNonUrgency.cfg",
    "src/Core.TLA/tla2tools.jar",
    "registry/tlc-models.json",
  ]) {
    const from = join(root(), relative);
    const to = join(subject, relative);
    cpSync(from, to, { recursive: false, force: true });
  }
  return subject;
}

describe("finite NciNonUrgency witness receipt", () => {
  test("renders and accepts the one pinned bounded witness", () => {
    const receipt = renderCanonicalReceipt(root());
    expect(receipt.endsWith("\n")).toBe(true);
    expect(canonicalReceipt(root()).verdict).toBe("witness-observed");
    expect(() => verifyReceipt(root(), receipt)).not.toThrow();
  });

  test("both committed cross-surface receipts reproduce the finite canonical witness", () => {
    const typescript = readFileSync("docs/research/data/2026-09-06-nci-witness-v1-typescript.json", "utf8");
    const python = readFileSync("docs/research/data/2026-09-06-nci-witness-v1-python.json", "utf8");
    expect(typescript).toBe(python);
    expect(typescript).toBe(renderCanonicalReceipt(root()));
    expect(() => verifyReceipt(root(), typescript)).not.toThrow();
  });

  test("a one-byte model change refuses before a witness can be rendered", () => {
    const subject = copiedSubject();
    try {
      const modelPath = join(subject, "src/Core.TLA/specs/NciNonUrgency.tla");
      writeFileSync(modelPath, `${readFileSync(modelPath, "utf8")}\n\\* mutation\n`, "utf8");
      expect(() => verifyPinnedSubject(subject)).toThrow("refuse-identity-mismatch");
    } finally {
      rmSync(subject, { recursive: true, force: true });
    }
  });

  test("a missing pinned input refuses from the same attempted read", () => {
    const subject = copiedSubject();
    try {
      rmSync(join(subject, "src/Core.TLA/specs/NciNonUrgency.cfg"));
      expect(() => verifyPinnedSubject(subject)).toThrow("refuse-identity-mismatch: missing");
    } finally {
      rmSync(subject, { recursive: true, force: true });
    }
  });

  test("changed jar and registry inputs refuse rather than reusing the bounded witness", () => {
    const subject = copiedSubject();
    try {
      const jarPath = join(subject, "src/Core.TLA/tla2tools.jar");
      const jar = readFileSync(jarPath);
      jar[0] = jar[0] === 0 ? 1 : 0;
      writeFileSync(jarPath, jar);
      expect(() => verifyPinnedSubject(subject)).toThrow("refuse-identity-mismatch");
      cpSync(join(root(), "src/Core.TLA/tla2tools.jar"), jarPath, { force: true });
      const registryPath = join(subject, "registry/tlc-models.json");
      writeFileSync(registryPath, readFileSync(registryPath, "utf8").replace('"workers": 1', '"workers": 2'), "utf8");
      expect(() => verifyPinnedSubject(subject)).toThrow("refuse-identity-mismatch");
    } finally {
      rmSync(subject, { recursive: true, force: true });
    }
  });

  test("a reordered or incomplete valid JSON receipt is refused", () => {
    const receipt = JSON.parse(renderCanonicalReceipt(root())) as Record<string, unknown>;
    const reordered = { modelId: receipt.modelId, schema: receipt.schema, ...receipt };
    expect(() => verifyReceipt(root(), `${JSON.stringify(reordered)}\n`)).toThrow("refuse-receipt-mismatch");
    delete receipt.checkedProperties;
    expect(() => verifyReceipt(root(), `${JSON.stringify(receipt)}\n`)).toThrow("refuse-receipt-mismatch");
  });

  test("an altered completed-model result cannot become an NCI witness", () => {
    const altered = renderCanonicalReceipt(root()).replace('"distinctStates":512', '"distinctStates":511');
    expect(() => verifyReceipt(root(), altered)).toThrow("refuse-receipt-mismatch");
  });

  test("the witness data cannot be a policy score or authority grant", () => {
    const receipt = canonicalReceipt(root()) as unknown as Record<string, unknown>;
    expect(Object.keys(receipt)).not.toContain("score");
    expect(Object.keys(receipt)).not.toContain("authority");
    expect(receipt.verdict).toBe("witness-observed");
  });

  test("the TypeScript witness emitter does not depend on the independent Python checker", () => {
    // EXACT import set, not a string-absence check. The claim is INDEPENDENCE — the two
    // implementations must not share code, or their agreement is worth nothing as evidence
    // (Knight-Leveson: correlated implementations fail together). `not.toContain("...oracle")`
    // witnesses one spelling of one leak and cannot witness its absence; any other route to the
    // Python checker — a differently-named module, a relative path, a dynamic import — passes it.
    //
    // Pinning the whole set instead means ANY new dependency fails here, which is the claim.
    const source = readFileSync("src/Core.TypeScript/formal-verification/nci-witness-receipt.ts", "utf8");
    const imports = [...source.matchAll(/^\s*import\s[^"']*["']([^"']+)["']/gmu)].map((m) => m[1]);
    expect(imports).toEqual(["node:crypto", "node:fs", "node:path", "node:child_process"]);

    // And nothing reaches the checker by a route that is not an import statement — a dynamic
    // `import()` or a `require` would not appear above.
    const dynamic = [...source.matchAll(/(?:\bimport\s*\(|\brequire\s*\()\s*["']([^"']+)["']/gu)].map(
      (m) => m[1],
    );
    expect(dynamic).toEqual([]);
  });
});
