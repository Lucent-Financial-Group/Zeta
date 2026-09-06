// committed-chart-credentials.test.ts — falsifiers for the committed-secret check.
//
// This is a CREDENTIAL check, so its own failure mode is the expensive one: a false clean
// says "no secrets are committed" over a scan that reached nothing. The cases below lean on
// that, on the safe/unsafe boundary (where a too-eager rule fills the roster with
// non-problems and a too-lax one misses the thing), and on the audit not leaking the value
// it is complaining about.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  adjudicate,
  BASELINE_FILE,
  type BaselineEntry,
  type Finding,
  findingKey,
  isSafeValue,
  MIN_EXPECTED_VALUES_DOCS,
  scanTree,
  scanValues,
  SECRET_LEAF,
  valuesOf,
} from "./committed-chart-credentials.ts";

describe("committed-chart-credentials", () => {
  test("a literal secret is found, whatever the surrounding shape", () => {
    const values = {
      loki: { storage: { s3: { accessKeyId: "an-id", secretAccessKey: "hunter2" } } },
      nested: [{ deep: { password: "hunter2" } }],
    };
    const paths = scanValues(values, "f.yaml").map((f) => f.path);
    expect(paths).toContain("loki.storage.s3.secretAccessKey");
    expect(paths).toContain("nested[0].deep.password");
  });

  test("the IDENTIFIER half of a credential pair is NOT flagged", () => {
    // `accessKey` / `accessKeyId` is an identifier, not a secret. Flagging it would fill the
    // roster with non-problems, which is how a roster stops being read -- and this tree
    // really does commit `accessKey: zeta-blob-store` beside the secret it must not commit.
    expect(scanValues({ s3: { accessKey: "zeta-blob-store", accessKeyId: "zeta-blob-store" } }, "f")).toEqual([]);
    expect(SECRET_LEAF.test("accessKey")).toBe(false);
    expect(SECRET_LEAF.test("secretAccessKey")).toBe(true);
  });

  test("the three SAFE shapes pass, and they are the three the fix produces", () => {
    // Empty (supplied elsewhere), an env reference (how a minted Secret arrives at runtime),
    // and a non-string (a `valueFrom:`/`secretKeyRef:` indirection). A check that rejected
    // these would make the correct fix impossible to express.
    expect(isSafeValue("")).toBe(true);
    expect(isSafeValue("   ")).toBe(true);
    expect(isSafeValue("${BLOB_STORE_SECRET_KEY}")).toBe(true);
    expect(isSafeValue("$(BLOB_STORE_SECRET_KEY)")).toBe(true);
    expect(isSafeValue({ secretKeyRef: { name: "s", key: "k" } })).toBe(true);
    expect(isSafeValue("hunter2")).toBe(false);
  });

  test("values are read from BOTH an Application valuesObject and a HelmChart valuesContent", () => {
    // The two trees express values differently and a scanner that read only one would
    // silently cover half the surface while printing a confident count.
    const app = { spec: { source: { helm: { valuesObject: { password: "p" } } } } };
    expect(scanValues(valuesOf(app), "a")).toHaveLength(1);
    const cr = { spec: { valuesContent: "password: p\n" } };
    expect(scanValues(valuesOf(cr), "b")).toHaveLength(1);
  });

  test("a valuesContent that does not parse yields NO values rather than reading as clean", () => {
    // It must not contribute findings AND must not be counted as a scanned document that
    // came back empty. `validate-applications.ts` is what convicts unparseable YAML.
    expect(valuesOf({ spec: { valuesContent: "a: [unclosed\n" } })).toBeUndefined();
  });

  test("an acknowledged literal passes; an UNACKNOWLEDGED one is open", () => {
    const findings: Finding[] = [
      { file: "a.yaml", path: "x.password", value: "p" },
      { file: "b.yaml", path: "y.token", value: "t" },
    ];
    const baseline: BaselineEntry[] = [{ key: "a.yaml|x.password", reason: "r", liftsWhen: "l" }];
    const { open, stale } = adjudicate(findings, baseline);
    expect(open.map(findingKey)).toEqual(["b.yaml|y.token"]);
    expect(stale).toEqual([]);
  });

  test("MOVING the credential retires its entry — an excuse cannot outlive its defect", () => {
    // The key is file+path, so a fix makes the acknowledgement match nothing and the audit
    // says STALE. Without this the roster only grows and the migration leaves its excuse.
    const baseline: BaselineEntry[] = [{ key: "a.yaml|x.password", reason: "r", liftsWhen: "l" }];
    const { open, stale } = adjudicate([], baseline);
    expect(open).toEqual([]);
    expect(stale).toEqual(["a.yaml|x.password"]);
  });

  test("THE REAL TREE: the scan reaches the whole surface, and every literal is acknowledged", () => {
    // Guards the paths and the floor together. Every case above is fixture-driven, so a
    // renamed directory would leave them green over a scan that read nothing — and on a
    // CREDENTIAL check a false clean is the most expensive false clean in the tree.
    const root = process.cwd();
    const { findings, valuesDocs } = scanTree(root);
    expect(valuesDocs).toBeGreaterThanOrEqual(MIN_EXPECTED_VALUES_DOCS);

    const baseline = (JSON.parse(readFileSync(join(root, BASELINE_FILE), "utf8")) as { entries: BaselineEntry[] })
      .entries;
    const { open, stale } = adjudicate(findings, baseline);
    expect(open).toEqual([]);
    expect(stale).toEqual([]);

    // Every acknowledgement says why it is carried AND what retires it.
    for (const entry of baseline) {
      expect(entry.reason.length).toBeGreaterThan(80);
      expect(entry.liftsWhen).toContain("LIFTS WHEN:");
    }
    // AND NO ENTRY QUOTES THE SECRET. The roster is committed and public; an acknowledgement
    // that spelled the credential out would republish the thing it is apologising for.
    const secrets = new Set(findings.map((f) => f.value));
    for (const entry of baseline) {
      for (const secret of secrets) {
        expect(entry.reason).not.toContain(secret);
        expect(entry.liftsWhen).not.toContain(secret);
      }
    }
  });
});
