import { describe, expect, test } from "bun:test";
import { PROVIDER_ROSTER, resolveProvider, uniqueStoreKeys, wiredProviders } from "./provider-roster.ts";

describe("provider roster", () => {
  test("the seven paid accounts plus GitHub are declared, ids unique", () => {
    const ids = PROVIDER_ROSTER.map((p) => p.id);
    expect(ids).toEqual(["github", "openai", "codex", "claude", "grok", "gemini", "kiro", "manus"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("aliases resolve; unknown is null; empty is null", () => {
    expect(resolveProvider("chatgpt")?.id).toBe("openai");
    expect(resolveProvider("GH")?.id).toBe("github");
    expect(resolveProvider("xai")?.id).toBe("grok");
    expect(resolveProvider("anthropic")?.id).toBe("claude");
    expect(resolveProvider("nope")).toBeNull();
    expect(resolveProvider("")).toBeNull();
  });

  test("codex stores under openai (one ChatGPT account, two product names)", () => {
    expect(resolveProvider("codex")?.storeAs).toBe("openai");
    expect(resolveProvider("openai")?.storeAs).toBe("openai");
  });

  test("wired set is exactly github + the ChatGPT account (openai and its codex alias)", () => {
    const wired = wiredProviders().map((p) => p.id);
    expect(wired).toEqual(["github", "openai", "codex"]);
  });

  test("uniqueStoreKeys collapses the openai/codex pair", () => {
    expect(uniqueStoreKeys()).toEqual(["github", "openai", "claude", "grok", "gemini", "kiro", "manus"]);
  });

  test("manus is api-key-secondary, not the primary account path", () => {
    const m = resolveProvider("manus");
    expect(m?.loginKind).toBe("api-key-secondary");
    expect(m?.status).toBe("api-key-only");
  });

  test("a missing AuthProvider cannot hide as wired — declared providers stay declared", () => {
    for (const p of PROVIDER_ROSTER) {
      if (p.id === "claude" || p.id === "grok" || p.id === "gemini" || p.id === "kiro") {
        expect(p.status).toBe("declared");
      }
    }
  });
});
