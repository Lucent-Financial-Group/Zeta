// resolve-stored-token.ts — token for forge/API work: OUR store first, then env, never `gh`.
//
// First brick of 081M100RB9Z087G0R000GWY1MM. Login is already ours; factory work still
// spawnSyncs `gh`. Every caller that needs a GitHub (or Manus) token should go through
// this so `gh auth token` stops being the default.

import type { TokenStore } from "./token-store.ts";

export type TokenSource = "store" | "env";

export type ResolvedToken = {
  readonly token: string;
  readonly source: TokenSource;
  readonly storeAs: string;
};

export async function resolveAccessToken(opts: {
  readonly store: TokenStore;
  readonly storeAs: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly envKeys: readonly string[];
}): Promise<ResolvedToken | null> {
  const stored = await opts.store.load(opts.storeAs);
  const fromStore = stored?.tokens.accessToken.trim() ?? "";
  if (fromStore.length > 0) {
    return { token: fromStore, source: "store", storeAs: opts.storeAs };
  }
  for (const key of opts.envKeys) {
    const raw = opts.env[key];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      return { token: trimmed, source: "env", storeAs: opts.storeAs };
    }
  }
  return null;
}

export const GITHUB_TOKEN_ENV_KEYS = ["GH_TOKEN", "GITHUB_TOKEN"] as const;
export const MANUS_TOKEN_ENV_KEYS = ["MANUS_API_KEY"] as const;

/// Parse a `~/.config/zeta/auth/<provider>.json` body. Sync callers (gh-cli token
/// memo) use this so they do not have to await a TokenStore. Garbage / empty is null.
export function parseStoredAccessToken(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const tokens = (parsed as { tokens?: unknown }).tokens;
  if (typeof tokens !== "object" || tokens === null) return null;
  const access = (tokens as { accessToken?: unknown }).accessToken;
  if (typeof access !== "string") return null;
  const trimmed = access.trim();
  return trimmed.length > 0 ? trimmed : null;
}
