// provider-roster.ts — declare every paid login the harness must own (data, not code).
//
// Aaron 2026-08-26: run all agents on OUR harness with account logins (API keys secondary),
// GitHub tokens instead of `gh`, tools only via Ace (deps) and Zeta (source control + fs).
// Adding a provider is a DATA change — same discipline as zeta-creds-manifest.ts.

export type LoginKind = "account-oauth" | "account-cli-session" | "api-key-secondary";

/// How far the harness has actually taken this provider. `wired` means an AuthProvider
/// exists AND `zeta-login-cli` can run its device flow into ~/.config/zeta/auth.
export type ProviderStatus = "wired" | "declared" | "api-key-only";

export interface ProviderEntry {
  readonly id: string;
  readonly displayName: string;
  readonly loginKind: LoginKind;
  readonly status: ProviderStatus;
  /// Token-store key. Codex shares the ChatGPT account → store as `openai`.
  readonly storeAs: string;
  readonly aliases: readonly string[];
  readonly personaScoped: boolean;
  /// Vendor CLI the loop still spawnSyncs today (the thing we are replacing).
  readonly vendorCli: string | null;
  /// Where the VENDOR keeps its session today (inheritance, not our store).
  readonly vendorCredPaths: readonly string[];
  readonly notes: string;
}

export const PROVIDER_ROSTER: readonly ProviderEntry[] = [
  {
    id: "github",
    displayName: "GitHub",
    loginKind: "account-oauth",
    status: "wired",
    storeAs: "github",
    aliases: ["gh"],
    personaScoped: true,
    vendorCli: "gh",
    vendorCredPaths: ["~/.config/gh/hosts.yml"],
    notes: "RFC 8628 device flow live (github-auth.ts + github-login-cli.ts). Factory still spawnSyncs gh.",
  },
  {
    id: "openai",
    displayName: "OpenAI ChatGPT",
    loginKind: "account-oauth",
    status: "wired",
    storeAs: "openai",
    aliases: ["chatgpt"],
    personaScoped: true,
    vendorCli: null,
    vendorCredPaths: [],
    notes: "Device + PKCE (openai-auth.ts). ChatGPT subscription powers summon + closed ZETA_TOOLS.",
  },
  {
    id: "codex",
    displayName: "OpenAI Codex",
    loginKind: "account-oauth",
    status: "wired",
    storeAs: "openai",
    aliases: [],
    personaScoped: true,
    vendorCli: "codex",
    vendorCredPaths: ["~/.codex/auth.json"],
    notes: "Same ChatGPT account as openai. Loop still runs `codex` CLI for Vera.",
  },
  {
    id: "claude",
    displayName: "Anthropic Claude",
    loginKind: "account-oauth",
    status: "declared",
    storeAs: "claude",
    aliases: ["anthropic"],
    personaScoped: true,
    vendorCli: "claude",
    vendorCredPaths: ["~/.config/claude/credentials.json", "~/.claude/.credentials.json"],
    notes: "No AuthProvider. Otto/Soraya/Tariq spawn `claude -p`. Workitem 081M100RH29087G0R0031HHGJ0.",
  },
  {
    id: "grok",
    displayName: "xAI Grok",
    loginKind: "account-oauth",
    status: "declared",
    storeAs: "grok",
    aliases: ["xai"],
    personaScoped: true,
    vendorCli: "grok",
    vendorCredPaths: [],
    notes: "No AuthProvider. Riven is cursor-agent --model grok-*; peer-call uses native grok CLI.",
  },
  {
    id: "gemini",
    displayName: "Google Gemini",
    loginKind: "account-oauth",
    status: "declared",
    storeAs: "gemini",
    aliases: ["google"],
    personaScoped: true,
    vendorCli: "agy",
    vendorCredPaths: ["~/.gemini/oauth_creds.json"],
    notes: "No AuthProvider. Lior spawns `agy`. Gemini CLI OAuth file is installer-manifested only.",
  },
  {
    id: "kiro",
    displayName: "Amazon Kiro",
    loginKind: "account-oauth",
    status: "declared",
    storeAs: "kiro",
    aliases: [],
    personaScoped: true,
    vendorCli: "kiro-cli",
    vendorCredPaths: [],
    notes: "No AuthProvider. Alexa/kiro spawn `kiro-cli chat --trust-all-tools`.",
  },
  {
    id: "manus",
    displayName: "Manus",
    loginKind: "api-key-secondary",
    status: "api-key-only",
    storeAs: "manus",
    aliases: [],
    personaScoped: false,
    vendorCli: null,
    vendorCredPaths: [],
    notes: "Task API (manus-task.ts) uses Keychain zeta-manus-api-key. Account OAuth is the missing primary.",
  },
];

export function resolveProvider(idOrAlias: string): ProviderEntry | null {
  const needle = idOrAlias.trim().toLowerCase();
  if (needle.length === 0) return null;
  for (const p of PROVIDER_ROSTER) {
    if (p.id === needle) return p;
    if (p.aliases.some((a) => a === needle)) return p;
  }
  return null;
}

export function wiredProviders(): readonly ProviderEntry[] {
  return PROVIDER_ROSTER.filter((p) => p.status === "wired");
}

export function uniqueStoreKeys(): readonly string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const p of PROVIDER_ROSTER) {
    if (seen.has(p.storeAs)) continue;
    seen.add(p.storeAs);
    keys.push(p.storeAs);
  }
  return keys;
}
