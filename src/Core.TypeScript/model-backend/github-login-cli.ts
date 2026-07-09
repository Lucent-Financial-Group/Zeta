#!/usr/bin/env bun
// github-login-cli.ts — the first CONSUMER of the GitHub AuthProvider (shadow*).
//
// Closes the loop opened by github-auth.ts (#9554): the provider existed but
// nothing called it — cells still ran the device flow by hand (curl, paste,
// poll), as happened live on 2026-07-08. This CLI is the edge that wires the
// hexagonal port to the real world: fetchTransport (the one membrane) +
// fileTokenStore (~/.config/zeta/auth/github.json) + login-runner's
// deviceLogin. Everything below `main` stays pure/injectable per
// noninterference §13; the process env/argv/stdout touch happens only at the
// edge.
//
// Usage:
//   bun src/Core.TypeScript/model-backend/github-login-cli.ts login
//       Runs the RFC 8628 device flow: prints the verification URL + code,
//       polls until you approve in a browser, persists tokens to OUR store.
//   bun src/Core.TypeScript/model-backend/github-login-cli.ts token
//       Prints the stored access token (for scripts / curl -H).
//   bun src/Core.TypeScript/model-backend/github-login-cli.ts askpass <prompt>
//       GIT_ASKPASS mode: answers "Username" prompts with x-access-token and
//       anything else with the stored token. Wire it with:
//         GIT_ASKPASS="bun .../github-login-cli.ts askpass" git push …
//       (git invokes $GIT_ASKPASS twice, passing the prompt as argv)
//
// Exit codes: 0 ok · 1 flow/storage failure · 2 usage error.

import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";

import { githubDeviceProvider } from "./github-auth.ts";
import { fetchTransport } from "./fetch-transport.ts";
import { deviceLogin, defaultStoreDir, type LoginDeps } from "./login-runner.ts";
import { fileTokenStore, type StoreFs, type TokenStore } from "./token-store.ts";

/// The real StoreFs: node fs promises + ISO clock. The only fs the CLI touches.
export function nodeStoreFs(): StoreFs {
  return {
    readFile: (path: string) => readFile(path, "utf8"),
    writeFile: (path: string, contents: string) => writeFile(path, contents, { mode: 0o600 }),
    nowIso: () => new Date().toISOString(),
  };
}

/// Answer a GIT_ASKPASS prompt from a stored token. Pure — testable without git.
/// git asks "Username for 'https://github.com': " then "Password for '…': ".
export function askpassAnswer(prompt: string, accessToken: string): string {
  return /username/i.test(prompt) ? "x-access-token" : accessToken;
}

export type CliIo = {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
};

/// `login` — run the device flow to completion against injected deps. The one
/// human step (approve the code) is surfaced through `out`.
export async function runLogin(store: TokenStore, io: CliIo, deps?: Partial<LoginDeps>): Promise<number> {
  const outcome = await deviceLogin(githubDeviceProvider, {
    transport: deps?.transport ?? fetchTransport(),
    store,
    onCode: (uri, code) => {
      io.out(`Open ${uri} and enter code: ${code}`);
      io.out("Waiting for approval…");
    },
    sleep: deps?.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    now: deps?.now ?? (() => new Date().toISOString()),
    ...(deps?.maxPolls !== undefined ? { maxPolls: deps.maxPolls } : {}),
  });
  if (!outcome.ok) {
    io.err(`github login failed: ${outcome.error}`);
    return 1;
  }
  io.out("Logged in — token stored for provider 'github'.");
  return 0;
}

/// `token` / `askpass` — read the stored token and answer.
export async function runFromStore(mode: "token" | "askpass", prompt: string, store: TokenStore, io: CliIo): Promise<number> {
  const stored = await store.load("github");
  if (!stored) {
    io.err("not logged in (no stored github tokens — run the `login` subcommand)");
    return 1;
  }
  io.out(mode === "token" ? stored.tokens.accessToken : askpassAnswer(prompt, stored.tokens.accessToken));
  return 0;
}

export async function main(argv: readonly string[], store: TokenStore, io: CliIo): Promise<number> {
  const [cmd = "", ...rest] = argv;
  switch (cmd) {
    case "login":
      return runLogin(store, io);
    case "token":
      return runFromStore("token", "", store, io);
    case "askpass":
      return runFromStore("askpass", rest.join(" "), store, io);
    default:
      io.err("usage: github-login-cli.ts <login|token|askpass [prompt]>");
      return 2;
  }
}

const invokedDirectly =
  typeof process.argv[1] === "string" && /github-login-cli\.(?:ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  const dir = defaultStoreDir(homedir());
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const store = fileTokenStore(dir, nodeStoreFs());
  const io: CliIo = { out: (l) => console.log(l), err: (l) => console.error(l) };
  main(process.argv.slice(2), store, io).then((code) => process.exit(code));
}
