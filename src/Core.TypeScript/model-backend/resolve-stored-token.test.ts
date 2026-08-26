import { describe, expect, test } from "bun:test";
import { memoryTokenStore } from "./token-store.ts";
import { GITHUB_TOKEN_ENV_KEYS, resolveAccessToken } from "./resolve-stored-token.ts";

describe("resolveAccessToken", () => {
  test("store wins over env — gh is never consulted", async () => {
    const store = memoryTokenStore();
    await store.save({ provider: "github", tokens: { accessToken: "gho_store", refreshToken: "" }, lastRefresh: "t" });
    const got = await resolveAccessToken({
      store,
      storeAs: "github",
      env: { GH_TOKEN: "gho_env", GITHUB_TOKEN: "gho_env2" },
      envKeys: GITHUB_TOKEN_ENV_KEYS,
    });
    expect(got).toEqual({ token: "gho_store", source: "store", storeAs: "github" });
  });

  test("falls back to env when the store is empty", async () => {
    const got = await resolveAccessToken({
      store: memoryTokenStore(),
      storeAs: "github",
      env: { GITHUB_TOKEN: " gho_env \n" },
      envKeys: GITHUB_TOKEN_ENV_KEYS,
    });
    expect(got).toEqual({ token: "gho_env", source: "env", storeAs: "github" });
  });

  test("null when neither store nor env has a token — does not shell out", async () => {
    const got = await resolveAccessToken({
      store: memoryTokenStore(),
      storeAs: "github",
      env: { GH_TOKEN: "  ", PATH: "/usr/bin" },
      envKeys: GITHUB_TOKEN_ENV_KEYS,
    });
    expect(got).toBeNull();
  });
});
