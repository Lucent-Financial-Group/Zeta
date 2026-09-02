// Red-proof tests for the "a named Secret must be minted" guard.
//
// The load-bearing one is `the KEY SHAPE is matched, not one spelling` — the
// first version of this audit matched only `existingSecret` and therefore missed
// `oz`'s `customAdminSecretName`, which is a Secret the roster really does mint.
// A guard that recognises one spelling does not prevent a class of defect; it
// prevents that defect written one way, and the next arrives spelled differently.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  adjudicate,
  auditExistingSecretIsMinted,
  collectSecretReferences,
  exitCode,
  formatReport,
  readBaseline,
  referenceKey,
  type BaselineEntry,
  type SecretReference,
} from "./audit-existing-secret-is-minted.ts";
import { DEV_BOOTSTRAP_SECRETS } from "./dev-cluster/lib.ts";

function appTree(values: string, dir = "app"): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "zeta-secretref-"));
  const abs = join(root, "full-ai-cluster/k8s/applications", dir, "Application.yaml");
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    ["apiVersion: argoproj.io/v1alpha1", "kind: Application", "spec:", "  source:", "    helm:", "      valuesObject:", values].join("\n"),
    "utf8",
  );
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const ref = (over: Partial<SecretReference> = {}): SecretReference => ({
  app: "app",
  manifest: "m.yaml",
  field: "auth.existingSecret",
  secretName: "s",
  ...over,
});

const entry = (over: Partial<BaselineEntry> = {}): BaselineEntry => ({
  key: "app|s",
  reason: "a reason long enough to be a reason rather than a shrug",
  liftsWhen: "the roster mints it",
  ...over,
});

// ---------------------------------------------------------------------------

describe("collectSecretReferences", () => {
  test("GREEN: an existingSecret is collected with its dotted path", () => {
    const fx = appTree("        auth:\n          existingSecret: my-secret");
    try {
      const refs = collectSecretReferences(fx.root);
      expect(refs).toHaveLength(1);
      expect(refs[0]?.secretName).toBe("my-secret");
      expect(refs[0]?.field).toBe("auth.existingSecret");
    } finally {
      fx.cleanup();
    }
  });

  // THE DISCRIMINATOR. `oz` names its credential this way and the narrow pattern
  // missed it entirely — in the acquitting direction, which is the one that
  // matters for a guard.
  test("the KEY SHAPE is matched, not one spelling — customAdminSecretName counts", () => {
    const fx = appTree("        useCustomAdminSecret: true\n        customAdminSecretName: ziti-admin-credentials");
    try {
      const refs = collectSecretReferences(fx.root);
      expect(refs.map((r) => r.secretName)).toEqual(["ziti-admin-credentials"]);
    } finally {
      fx.cleanup();
    }
  });

  test("...and so does usersExistingSecret, the spelling that caused the redis break", () => {
    const fx = appTree("        auth:\n          usersExistingSecret: redis-auth");
    try {
      expect(collectSecretReferences(fx.root).map((r) => r.secretName)).toEqual(["redis-auth"]);
    } finally {
      fx.cleanup();
    }
  });

  test("nested paths are found — temporal buries one four levels down", () => {
    const fx = appTree(
      "        server:\n          config:\n            persistence:\n              default:\n                sql:\n                  existingSecret: temporal-default-store",
    );
    try {
      const refs = collectSecretReferences(fx.root);
      expect(refs[0]?.field).toBe("server.config.persistence.default.sql.existingSecret");
    } finally {
      fx.cleanup();
    }
  });

  // Cry-wolf control: several charts use "" to mean "generate one for me".
  test("an EMPTY existingSecret is not a reference — it is the chart's generate-me idiom", () => {
    const fx = appTree('        auth:\n          existingSecret: ""');
    try {
      expect(collectSecretReferences(fx.root)).toEqual([]);
    } finally {
      fx.cleanup();
    }
  });

  test("a key that merely CONTAINS the word secret is not a reference", () => {
    const fx = appTree("        auth:\n          secretKeyRef: not-a-name\n          rotateSecrets: true");
    try {
      expect(collectSecretReferences(fx.root)).toEqual([]);
    } finally {
      fx.cleanup();
    }
  });
});

describe("adjudicate", () => {
  test("GREEN: a minted Secret needs no acknowledgement", () => {
    const a = adjudicate([ref({ secretName: "grafana-admin-credentials" })], new Set(["grafana-admin-credentials"]), []);
    expect(a.refused).toEqual([]);
    expect(a.minted).toHaveLength(1);
    expect(exitCode(a)).toBe(0);
  });

  test("RED: an unminted, unacknowledged Secret is refused", () => {
    const a = adjudicate([ref()], new Set(), []);
    expect(a.refused).toHaveLength(1);
    expect(exitCode(a)).toBe(1);
    expect(formatReport(a)).toContain("REFUSED app");
  });

  test("GREEN: an acknowledged one is carried, and says it is still unminted", () => {
    const a = adjudicate([ref()], new Set(), [entry()]);
    expect(a.refused).toEqual([]);
    expect(a.acknowledged).toHaveLength(1);
    expect(formatReport(a)).toContain("STILL UNMINTED");
    expect(exitCode(a)).toBe(0);
  });

  test("RED: an acknowledgement matching nothing is STALE — this is how a lifted exclusion re-asks", () => {
    const a = adjudicate([], new Set(), [entry()]);
    expect(a.staleKeys).toEqual(["app|s"]);
    expect(exitCode(a)).toBe(1);
  });

  test("minting BEATS acknowledging — the entry then goes stale rather than lingering", () => {
    const a = adjudicate([ref()], new Set(["s"]), [entry()]);
    expect(a.minted).toHaveLength(1);
    expect(a.acknowledged).toEqual([]);
    expect(a.staleKeys).toEqual(["app|s"]);
  });

  test("the key is app-scoped, so one app's acknowledgement never covers another's", () => {
    const a = adjudicate([ref({ app: "other" })], new Set(), [entry()]);
    expect(a.refused).toHaveLength(1);
    expect(referenceKey("other", "s")).toBe("other|s");
  });
});

describe("readBaseline", () => {
  for (const field of ["reason", "liftsWhen"] as const) {
    test(`RED: an entry with no ${field} is refused`, () => {
      const e = { ...entry() } as Record<string, unknown>;
      delete e[field];
      const root = mkdtempSync(join(tmpdir(), "zeta-secretbase-"));
      writeFileSync(join(root, "b.json"), JSON.stringify({ entries: [e] }), "utf8");
      try {
        expect(() => readBaseline("b.json", root)).toThrow(new RegExp(`has no "${field}"`));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
});

describe("the live tree", () => {
  const minted = new Set(DEV_BOOTSTRAP_SECRETS.map((s) => s.name));

  test("every named Secret is minted or acknowledged — no refusals, no stale entries", () => {
    const result = auditExistingSecretIsMinted(minted);
    expect(result.refused.map((r) => referenceKey(r.app, r.secretName))).toEqual([]);
    expect(result.staleKeys).toEqual([]);
    expect(exitCode(result)).toBe(0);
  });

  test("and it is NOT vacuous: the tree really does name Secrets, and the roster really does mint some", () => {
    // If either side ever empties, the check above passes by having nothing to
    // check — which is the failure mode this whole file is about.
    const result = auditExistingSecretIsMinted(minted);
    expect(result.minted.length + result.acknowledged.length).toBeGreaterThan(0);
    expect(minted.size).toBeGreaterThan(0);
    // Both roster credentials are actually REFERENCED by an Application; a
    // minted Secret nobody names would be a credential with no consumer.
    expect(result.minted.map((r) => r.secretName).sort()).toEqual([...minted].sort());
  });
});
