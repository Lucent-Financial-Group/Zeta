/**
 * sandbox.test.ts — falsifiers for "the room is the sandbox, and the proxy lives inside it".
 *
 * Every test here is written to FAIL if the property is removed, not to observe that the code runs.
 * The two that matter most are the negative ones: the inner executor must never be reached on a
 * refusal (a policy that runs the command and then reports it would be a log, not a gate), and a
 * room with no declared sandbox must come away with NO executor rather than an unguarded one.
 */

import { describe, expect, test } from "bun:test";
import type { CommandExecutor, RunOutcome, RunSpec } from "../do-item";
import type { World } from "../observe";
import {
  declaredHosts,
  deterministicProxy,
  grantedTools,
  inlinedCredential,
  sandboxedExecutor,
  type CredentialProxy,
  type RoomSandbox,
} from "./sandbox";
import { tickRooms, type Room, type RoomTickContext, type ScopePredicate } from "./room";

/** An executor that records every script it was asked to run — so "never reached" is checkable. */
function recordingExecutor(): { executor: CommandExecutor; seen: string[] } {
  const seen: string[] = [];
  return {
    seen,
    executor: {
      tier: "fake",
      run: async (spec: RunSpec): Promise<RunOutcome> => {
        seen.push(spec.script);
        return { ok: true, stdout: "ran", exitCode: 0 };
      },
    },
  };
}

function sandboxWith(allowedHosts: readonly string[], proxy: CredentialProxy = deterministicProxy): RoomSandbox {
  return { identity: "agent:otto", hats: ["reviewer", "author"], egress: { allowedHosts }, proxy };
}

const OPEN_SCOPE: ScopePredicate = {
  backlogIds: new Set(),
  prNumbers: new Set(),
  operatorAccess: false,
  writeAccess: true,
};

const EMPTY_WORLD: World = { backlog: [] };

describe("declaredHosts — what the policy can see", () => {
  test("extracts hosts, strips userinfo and port, dedupes", () => {
    const hosts = declaredHosts(
      "curl https://api.github.com/x && curl https://user:pw@api.github.com:8443/y && curl http://evil.test/z",
    );
    expect(hosts).toEqual(["api.github.com", "evil.test"]);
  });

  test("a script with no URL declares no egress", () => {
    expect(declaredHosts("echo hello && bun test")).toEqual([]);
  });
});

describe("inlinedCredential — the agent supplying its own secret", () => {
  test("names the offending variable", () => {
    expect(inlinedCredential("GITHUB_TOKEN=ghp_abc curl https://api.github.com")).toBe("GITHUB_TOKEN");
    expect(inlinedCredential("export MY_API_KEY=x")).toBe("MY_API_KEY");
  });

  test("ordinary scripts are not flagged", () => {
    expect(inlinedCredential("bun test && echo done")).toBeNull();
    // The NAME alone is not an assignment — mentioning a scope is exactly what the proxy hands back.
    expect(inlinedCredential("echo using scope:GITHUB_TOKEN")).toBeNull();
  });
});

describe("sandboxedExecutor — default-deny egress", () => {
  test("an empty allowlist permits no egress at all", async () => {
    const { executor, seen } = recordingExecutor();
    const out = await sandboxedExecutor(executor, sandboxWith([])).run({ script: "curl https://api.github.com" });
    expect(out.ok).toBe(false);
    expect(out.exitCode).toBe(126);
    // THE point: the command was refused, not observed.
    expect(seen).toEqual([]);
  });

  test("an allowlisted host passes through to the inner executor", async () => {
    const { executor, seen } = recordingExecutor();
    const out = await sandboxedExecutor(executor, sandboxWith(["api.github.com"])).run({
      script: "curl https://api.github.com/repos",
    });
    expect(out.ok).toBe(true);
    expect(seen).toEqual(["curl https://api.github.com/repos"]);
  });

  test("one blocked host in an otherwise-allowed script refuses the whole run", async () => {
    const { executor, seen } = recordingExecutor();
    const out = await sandboxedExecutor(executor, sandboxWith(["api.github.com"])).run({
      script: "curl https://api.github.com/a && curl https://exfil.test/b",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("exfil.test");
    expect(seen).toEqual([]);
  });

  test("a script declaring no egress runs even under an empty allowlist", async () => {
    const { executor, seen } = recordingExecutor();
    const out = await sandboxedExecutor(executor, sandboxWith([])).run({ script: "bun test" });
    expect(out.ok).toBe(true);
    expect(seen).toEqual(["bun test"]);
  });
});

describe("sandboxedExecutor — the proxy is the only route to a credential", () => {
  test("a script carrying its own credential is refused, even to an allowed host", async () => {
    const { executor, seen } = recordingExecutor();
    const out = await sandboxedExecutor(executor, sandboxWith(["api.github.com"])).run({
      script: "GITHUB_TOKEN=ghp_secret curl https://api.github.com",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("GITHUB_TOKEN");
    expect(seen).toEqual([]);
  });

  test("grants are scope NAMES — no credential material crosses to the agent", () => {
    const grants = grantedTools(sandboxWith([]));
    expect(grants).toEqual([
      { tool: "tool:author", credentialScope: "scope:author" },
      { tool: "tool:reviewer", credentialScope: "scope:reviewer" },
    ]);
    // Deterministic: same identity + hats -> same grants, so the authorization path replays.
    expect(grantedTools(sandboxWith([]))).toEqual(grants);
  });

  test("grants are the proxy's answer, not the sandbox's — identity and hats are both passed", () => {
    const asked: { identity: string; hats: readonly string[] }[] = [];
    const spy: CredentialProxy = {
      grantsFor: (identity, hats) => {
        asked.push({ identity, hats });
        return [{ tool: "t", credentialScope: "s" }];
      },
    };
    grantedTools(sandboxWith([], spy));
    expect(asked).toEqual([{ identity: "agent:otto", hats: ["reviewer", "author"] }]);
  });
});

describe("sandboxedExecutor — contract preservation", () => {
  test("refusal is data, never a throw", async () => {
    const { executor } = recordingExecutor();
    const wrapped = sandboxedExecutor(executor, sandboxWith([]));
    // If this threw, the wrapper would have a different contract from the executor it wraps.
    const out = await wrapped.run({ script: "curl https://blocked.test" });
    expect(out.ok).toBe(false);
  });

  test("the decorator reports the wrapped executor's tier, not a tier of its own", () => {
    const inner: CommandExecutor = { tier: "oci", run: async () => ({ ok: true, stdout: "", exitCode: 0 }) };
    expect(sandboxedExecutor(inner, sandboxWith([])).tier).toBe("oci");
  });
});

describe("tickRooms — the room is where the sandbox is applied", () => {
  function roomCapturing(
    id: string,
    sandbox: RoomSandbox | undefined,
    sink: { ctx?: RoomTickContext | undefined },
  ): Room {
    const base: Room = {
      id,
      scope: OPEN_SCOPE,
      state: {},
      tick: async (_w, ctx) => {
        sink.ctx = ctx;
        return { action: { kind: "explore", reason: "x" }, tier: "oracle" as const, confidence: 1 };
      },
    };
    return sandbox === undefined ? base : { ...base, sandbox };
  }

  test("a room WITH a sandbox receives an executor already wrapped in its own policy", async () => {
    const sink: { ctx?: RoomTickContext | undefined } = {};
    const { executor, seen } = recordingExecutor();
    await tickRooms([roomCapturing("r1", sandboxWith(["api.github.com"]), sink)], EMPTY_WORLD, { executor });

    const given = sink.ctx?.executor;
    expect(given).toBeDefined();
    // The wrapping is REAL, not nominal: the room's own allowlist decides.
    expect((await given!.run({ script: "curl https://api.github.com/x" })).ok).toBe(true);
    expect((await given!.run({ script: "curl https://elsewhere.test/x" })).ok).toBe(false);
    expect(seen).toEqual(["curl https://api.github.com/x"]);
  });

  test("a room with NO declared sandbox receives NO executor", async () => {
    const sink: { ctx?: RoomTickContext | undefined } = {};
    const { executor, seen } = recordingExecutor();
    await tickRooms([roomCapturing("r1", undefined, sink)], EMPTY_WORLD, { executor });

    // "No policy declared" must not read as "no policy applies".
    expect(sink.ctx?.executor).toBeUndefined();
    expect(sink.ctx?.grants).toBeUndefined();
    expect(seen).toEqual([]);
  });

  test("no base executor means no execution capability, sandbox or not", async () => {
    const sink: { ctx?: RoomTickContext | undefined } = {};
    await tickRooms([roomCapturing("r1", sandboxWith(["api.github.com"]), sink)], EMPTY_WORLD);
    expect(sink.ctx?.executor).toBeUndefined();
  });

  test("the room is handed its grants — names only", async () => {
    const sink: { ctx?: RoomTickContext | undefined } = {};
    const { executor } = recordingExecutor();
    const sandbox = sandboxWith([]);
    await tickRooms([roomCapturing("r1", sandbox, sink)], EMPTY_WORLD, { executor });
    expect(sink.ctx?.grants).toEqual(grantedTools(sandbox));
  });

  test("each room gets its OWN policy — one room's allowlist never leaks to another", async () => {
    const sinkA: { ctx?: RoomTickContext | undefined } = {};
    const sinkB: { ctx?: RoomTickContext | undefined } = {};
    const { executor } = recordingExecutor();
    await tickRooms(
      [roomCapturing("a", sandboxWith(["a.test"]), sinkA), roomCapturing("b", sandboxWith(["b.test"]), sinkB)],
      EMPTY_WORLD,
      { executor },
    );

    expect((await sinkA.ctx!.executor!.run({ script: "curl https://a.test" })).ok).toBe(true);
    expect((await sinkA.ctx!.executor!.run({ script: "curl https://b.test" })).ok).toBe(false);
    expect((await sinkB.ctx!.executor!.run({ script: "curl https://b.test" })).ok).toBe(true);
    expect((await sinkB.ctx!.executor!.run({ script: "curl https://a.test" })).ok).toBe(false);
  });
});
