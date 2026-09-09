// nci-witness-receipt.test.ts — byte-pinned finite formal-witness controls only.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { canonicalReceipt, renderCanonicalReceipt, verifyPinnedSubject, verifyReceipt } from "./nci-witness-receipt";

const LIVE_ROOT = process.cwd();
const HISTORICAL_REGISTRY = "docs/research/data/2026-09-06-nci-witness-v1-registry.json";

/**
 * The historical subject's JAR, by git blob id.
 *
 * The 2026-09-06 witness is pinned to TLC2 2026.05.18.174321, and the tree
 * stopped carrying those bytes when `src/Core.TLA/tla2tools.jar` was de-vendored
 * onto the rolling from-url row (081M23ESC5B087G0R002HJ39DG). Upstream cannot
 * return them either -- tlaplus re-uploads the v1.8.0 asset in place, so the
 * build that produced this witness is gone from every URL.
 *
 * It is NOT gone from git. A blob stays reachable from the commits that carried
 * it, so `git cat-file` is a permanent, content-addressed source for exactly the
 * bytes the receipt names -- which is the whole point of pinning by digest.
 * Reading it here keeps the historical witness reproducible without either
 * re-committing a binary or republishing a dated research artefact to match a
 * newer checker.
 *
 * The live tree deliberately does NOT satisfy this pin any more, and
 * `verifyPinnedSubject` says so: the current registry names a different jar, so
 * a receipt minted from the current tree is refused rather than silently
 * re-derived under a checker that did not produce it.
 */
const HISTORICAL_JAR_BLOB = "2fb671d8be5a1e137f001965d0246509e882aed3";

function historicalJarBytes(): Buffer {
  const result = spawnSync("git", ["cat-file", "blob", HISTORICAL_JAR_BLOB], {
    cwd: LIVE_ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    // A failed probe is UNKNOWN, never "the jar is wrong": a shallow clone or an
    // absent git is a question that was not asked, and saying otherwise would
    // report a provenance failure that was never measured.
    throw new Error(
      `cannot read historical tla2tools blob ${HISTORICAL_JAR_BLOB} from git` +
        ` (git exited ${String(result.status)}) -- that is an UNKNOWN, not a mismatch`,
    );
  }
  return result.stdout;
}

let historicalSubject: string | undefined;

function root(): string {
  if (historicalSubject === undefined) throw new Error("historical subject setup did not complete");
  return historicalSubject;
}

function copiedSubject(
  registry = HISTORICAL_REGISTRY,
  subject = mkdtempSync(join(tmpdir(), "zeta-nci-witness-")),
): string {
  try {
    for (const relative of [
      "src/Core.TLA/specs/NciNonUrgency.tla",
      "src/Core.TLA/specs/NciNonUrgency.cfg",
      "src/Core.TLA/tla2tools.jar",
      "registry/tlc-models.json",
    ]) {
      const to = join(subject, relative);
      mkdirSync(dirname(to), { recursive: true });
      if (relative === "src/Core.TLA/tla2tools.jar") {
        writeFileSync(to, historicalJarBytes());
        continue;
      }
      const from = join(LIVE_ROOT, relative === "registry/tlc-models.json" ? registry : relative);
      cpSync(from, to, { recursive: false, force: true });
    }
    // Current model/config/jar bytes are usable only while all original pins hold.
    verifyPinnedSubject(subject);
    return subject;
  } catch (error) {
    try {
      rmSync(subject, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "historical subject admission and cleanup failed");
    }
    throw error;
  }
}

describe("finite NciNonUrgency witness receipt", () => {
  beforeEach(() => {
    historicalSubject = copiedSubject();
  });

  afterEach(() => {
    const subject = historicalSubject;
    historicalSubject = undefined;
    if (subject !== undefined) rmSync(subject, { recursive: true, force: true });
  });

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

  test("the current registry refuses reuse of the historical receipt", () => {
    const receipt = renderCanonicalReceipt(root());
    cpSync(join(LIVE_ROOT, "registry/tlc-models.json"), join(root(), "registry/tlc-models.json"), { force: true });
    expect(() => verifyReceipt(root(), receipt)).toThrow("refuse-identity-mismatch: registry/tlc-models.json");
  });

  test("failed historical setup keeps the original refusal and removes its owned temporary files", () => {
    const subject = mkdtempSync(join(tmpdir(), "zeta-nci-refused-"));
    expect(() => copiedSubject("registry/tlc-models.json", subject)).toThrow(
      "refuse-identity-mismatch: registry/tlc-models.json",
    );
    expect(existsSync(subject)).toBe(false);
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

  // Executable dependency/I/O witnesses live in nci-witness-capability.test.ts.
});
