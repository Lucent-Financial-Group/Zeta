// Falsifiers for the declared-auth auditor.
//
// These are PURE unit tests over the matching logic. The auditor itself renders charts,
// which needs network and a helm cache, so the live half runs as a CLI in the drift lane
// and the discriminating half runs here on every PR.
//
// The control that matters was run by hand before this file existed, and is recorded
// because it is the evidence the auditor discriminates rather than merely refuses:
//
//   seaweedfs @ 4.33.0 (auth INERT)   -> VIOLATED, "zeta-blob-store" absent
//   seaweedfs @ 4.45.0 (auth renders) -> OK
//
// Same expectation, same values, one variable moved.

import { describe, expect, test } from "bun:test";
import {
  EXPECTATIONS,
  formatFinding,
  missingFromRender,
  valueAt,
} from "./audit-declared-auth-reaches-render.ts";

describe("valueAt reads the declaring path", () => {
  const values = { allInOne: { s3: { enableAuth: true, enabled: true } }, other: 1 };
  test("finds a nested boolean", () => {
    expect(valueAt(values, "allInOne.s3.enableAuth")).toBe(true);
  });
  test("returns undefined for an absent path rather than throwing", () => {
    expect(valueAt(values, "allInOne.s3.nope")).toBeUndefined();
    expect(valueAt(values, "nothing.here.at.all")).toBeUndefined();
  });
  test("does not walk through a non-object", () => {
    expect(valueAt({ a: 5 }, "a.b")).toBeUndefined();
  });
});

describe("missingFromRender", () => {
  const expectation = EXPECTATIONS[0]!;

  test("reports the credential when the render omits it — the 4.33.0 case", () => {
    const rendered = JSON.stringify([{ kind: "Service", metadata: { name: "blob-store" } }]);
    expect(missingFromRender(rendered, expectation)).toEqual([...expectation.mustAppear]);
  });

  test("reports nothing when the render carries it — the 4.45.0 case", () => {
    const rendered = JSON.stringify([
      { kind: "Secret", stringData: { "s3_config": '{"identities":[{"credentials":[{"accessKey":"zeta-blob-store"}]}]}' } },
    ]);
    expect(missingFromRender(rendered, expectation)).toEqual([]);
  });

  test("a render mentioning AUTH but not the CREDENTIAL still fails", () => {
    // The distinction the expectation is built on: `mustAppear` holds the
    // secret-bearing value, not the word "auth". A chart that renders auth plumbing
    // while dropping the identity has still left the gateway open.
    const rendered = JSON.stringify([{ kind: "ConfigMap", data: { note: "enableAuth is true" } }]);
    expect(missingFromRender(rendered, expectation)).toHaveLength(1);
  });
});

describe("the roster and its message", () => {
  test("every expectation names a credential, not a keyword", () => {
    for (const e of EXPECTATIONS) {
      expect(e.mustAppear.length).toBeGreaterThan(0);
      for (const needle of e.mustAppear) {
        // "auth"/"enabled"/"true" would match plumbing rather than a credential, and an
        // expectation satisfied by plumbing is one that cannot fail for the real defect.
        expect(["auth", "enabled", "true", "secret"]).not.toContain(needle.toLowerCase());
        expect(needle.length).toBeGreaterThan(6);
      }
      expect(e.why.length).toBeGreaterThan(40);
    }
  });

  test("the finding says what is absent AND why an absent credential is not a weak setting", () => {
    const e = EXPECTATIONS[0]!;
    const message = formatFinding(
      { appId: e.appId, declaredBy: e.declaredBy, missing: [...e.mustAppear], detail: "d" },
      e,
    );
    expect(message).toContain(e.appId);
    expect(message).toContain(e.declaredBy);
    expect(message).toContain("NO setting");
  });
});
