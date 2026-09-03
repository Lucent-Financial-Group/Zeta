/**
 * forge-diagnosis.test.ts — falsifiers for "the diagnosis survives the log line".
 *
 * The regression these exist to prevent is not hypothetical: the loop printed
 * `[forge] PR state read FAILED: [object Object]` while holding a `ForgeError` that said
 * `auth-failure: no GitHub token ... run 'harny login github'`. Every assertion below fails on the
 * code that produced that line.
 */

import { describe, expect, test } from "bun:test";
import { forgeError } from "../forge-host/result";
import type { ForgeError, ForgeErrorKind } from "../forge-host/types";
import { describeError, describeForgeError, forgeFailureDisposition } from "./forge-diagnosis";

const ALL_KINDS: readonly ForgeErrorKind[] = [
  "not-supported",
  "auth-failure",
  "rate-limited",
  "not-found",
  "network",
  "parse-failure",
  "permission-denied",
  "internal",
];

describe("describeForgeError — the diagnosis reaches the operator", () => {
  test("no kind can ever render as [object Object]", () => {
    // THE regression. One assertion per kind, because the failure was invisible until it happened
    // on the one kind that mattered.
    for (const kind of ALL_KINDS) {
      // The message deliberately does NOT contain the kind. It used to
      // (`something went wrong (${kind})`), which made "the description contains the kind"
      // pass even when the kind was dropped — the assertion was satisfied by the message alone.
      // A mutation that removed `error.kind` from the output SURVIVED, which is how it was found.
      const described = describeForgeError(forgeError(kind, "the underlying call did not succeed"));
      expect(described).not.toContain("[object Object]");
      expect(described).toContain(kind);
      expect(described).toContain("the underlying call did not succeed");
    }
  });

  test("the description says whether waiting will help", () => {
    expect(describeForgeError(forgeError("rate-limited", "slow down"))).toContain("retryable");
    expect(describeForgeError(forgeError("auth-failure", "token expired"))).toContain("an operator must act");
  });

  test("an expired token and a network blip do NOT read the same", () => {
    // They used to render identically — as nothing. That is why the loop retried an expired token
    // forever and nobody was told.
    const auth = describeForgeError(forgeError("auth-failure", "token expired"));
    const net = describeForgeError(forgeError("network", "connection reset"));
    expect(auth).not.toEqual(net);
    expect(forgeFailureDisposition(forgeError("auth-failure", "x"))).not.toBe(
      forgeFailureDisposition(forgeError("network", "x")),
    );
  });
});

describe("forgeFailureDisposition — reads the adapter's classification, never a second opinion", () => {
  test("the retryable kinds retry and the rest need an operator", () => {
    expect(forgeFailureDisposition(forgeError("rate-limited", "x"))).toBe("retry-next-tick");
    expect(forgeFailureDisposition(forgeError("network", "x"))).toBe("retry-next-tick");
    for (const kind of [
      "auth-failure",
      "permission-denied",
      "not-supported",
      "not-found",
      "parse-failure",
      "internal",
    ] as const) {
      expect(forgeFailureDisposition(forgeError(kind, "x"))).toBe("operator-must-act");
    }
  });

  test("it follows `retryable`, not the kind — the adapter already decided", () => {
    // A second classifier here would be a competing opinion that silently diverges from
    // forge-host/result.ts the first time either is edited.
    const contrarian: ForgeError = { kind: "network", message: "permanently broken", retryable: false };
    expect(forgeFailureDisposition(contrarian)).toBe("operator-must-act");
    const lenient: ForgeError = { kind: "auth-failure", message: "token refreshing", retryable: true };
    expect(forgeFailureDisposition(lenient)).toBe("retry-next-tick");
  });
});

describe("describeError — a genuinely unknown value still says something", () => {
  test("an Error yields its message", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  test("a string is itself", () => {
    expect(describeError("plain failure")).toBe("plain failure");
  });

  test("a plain object is serialised, NEVER [object Object]", () => {
    // The exact case the repo-wide `String(e)` idiom loses.
    const described = describeError({ kind: "auth-failure", message: "token expired" });
    expect(described).not.toContain("[object Object]");
    expect(described).toContain("auth-failure");
    expect(described).toContain("token expired");
  });

  test("null, undefined and primitives are named rather than dropped", () => {
    expect(describeError(null)).toBe("null");
    expect(describeError(undefined)).toBe("undefined");
    expect(describeError(42)).toBe("42");
    expect(describeError(false)).toBe("false");
  });

  test("a circular object falls back to naming its shape, not to [object Object]", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular["self"] = circular;
    const described = describeError(circular);
    expect(described).not.toContain("[object Object]");
    expect(described).toContain("unserialisable");
  });

  test("an array is serialised too", () => {
    expect(describeError(["a", "b"])).toBe('["a","b"]');
  });
});
