/**
 * room/sandbox.ts — the room IS the sandbox, and the credential proxy lives inside it.
 *
 * `ROOMS_AS_DETERMINISTIC_SIMULATIONS.md` §1 states the rule this implements: *"One room per agent
 * activation. The room is the agent's isolation boundary: a bwrap sandbox plus a credential proxy
 * bound to the agent's OAuth identity"*, and §8 adds that `observe.ts` is *"the only path from 'who
 * + where' to 'may run this tool'"*. Who = the identity and hats on the sandbox. Where = the room.
 * May = this module.
 *
 * The org side has the pieces (`CredentialProxyPort`, `ToolGrant`, `SandboxSpec` in
 * `agentic-organization/packages/application/src/room.ts`) as a record with no enforcement — nothing
 * consumes them. Here they sit on the ONE seam a room's work actually goes through.
 *
 * ── THE PROPERTY WORTH HAVING: THE AGENT NEVER HOLDS THE SECRET ──────────────
 * A credential *proxy* is not a credential *store*. The agent asks for a tool by name; the proxy
 * decides whether that identity may use it and attaches the credential itself. What crosses back to
 * the agent is a SCOPE NAME, never key material. So a transcript, a log, a prompt echo or a leaked
 * `RunSpec` cannot carry the secret, because the secret was never in the agent's hands to leak.
 *
 * That is also why a script that inlines its own credential is REFUSED rather than passed through:
 * an agent supplying its own secret has bypassed the proxy entirely, and the refusal is what keeps
 * the proxy the only route.
 *
 * ── DEFAULT-DENY EGRESS ──────────────────────────────────────────────────────
 * `allowedHosts` is an allowlist. An empty policy permits no egress at all, which is the correct
 * default for a room that has not declared any: a blocklist would need to anticipate every host
 * worth blocking, and the one nobody thought of is the one that matters.
 *
 * ── HONEST CEILING, STATED BECAUSE IT IS EASY TO OVERSELL THIS ───────────────
 * `RunSpec` is a bash script, so host extraction is a TEXT SCAN. A script that builds a URL from
 * variables, uses a bare IP, resolves through a helper, or shells out to something that fetches on
 * its behalf is **not seen** by this. It bounds DECLARED egress, not actual network access.
 *
 * Real containment is a network namespace — the `oci` / bwrap executor tier — and this does not
 * replace it. What it does buy is that the room's policy is explicit, attached to the room, checked
 * on the path the room's work actually takes, and that the obvious carrier is refused. Calling it a
 * sandbox in the containment sense would be a stronger claim than the mechanism supports.
 */

import type { CommandExecutor, RunOutcome, RunSpec } from "../do-item";

/** What a room may reach. An allowlist — empty means no egress. */
export interface EgressPolicy {
  /** Exact hostnames. No wildcards: a wildcard is a second language to get subtly wrong. */
  readonly allowedHosts: readonly string[];
}

/** A capability reference handed to the agent. Deliberately NOT a secret. */
export interface ToolGrant {
  readonly tool: string;
  /** The NAME of the credential scope the proxy will attach. Never the credential. */
  readonly credentialScope: string;
}

/** Decides which tools an identity may use. The implementation holds the secrets; callers get names. */
export interface CredentialProxy {
  grantsFor(identity: string, hats: readonly string[]): readonly ToolGrant[];
}

/** The room's isolation boundary: who is acting, what they may reach, and who mediates credentials. */
export interface RoomSandbox {
  readonly identity: string;
  readonly hats: readonly string[];
  readonly egress: EgressPolicy;
  readonly proxy: CredentialProxy;
}

/**
 * A deterministic proxy that grants exactly one tool per hat, scoped to that hat, in sorted order.
 * Same inputs → same grants, so the authorization path replays under DST. Holds no secrets: it is
 * the shape a real proxy (SPIRE, a credential broker) plugs into, and the test double everywhere else.
 */
export const deterministicProxy: CredentialProxy = {
  grantsFor: (_identity, hats) =>
    [...hats]
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map((hat) => ({ tool: `tool:${hat}`, credentialScope: `scope:${hat}` })),
};

/** Hosts named by an explicit URL in the script. A text scan — see the module's honest ceiling. */
export function declaredHosts(script: string): readonly string[] {
  const out: string[] = [];
  const re = /\b[a-z][a-z0-9+.-]*:\/\/([^\s/"'`?#\\]+)/gi;
  let m = re.exec(script);
  while (m !== null) {
    const authority = m[1] ?? "";
    // strip userinfo and port — the policy is about the host
    const host = authority.split("@").pop()?.split(":")[0] ?? "";
    if (host.length > 0 && !out.includes(host)) out.push(host);
    m = re.exec(script);
  }
  return out;
}

/**
 * Assignments that look like the agent supplying its own credential.
 *
 * Reuses the fragment vocabulary the provisioning ceremony already settled on, for the same reason:
 * a name-shaped check catches the obvious carrier and is honest that it is name-shaped.
 */
const SECRET_ASSIGNMENT =
  /\b([A-Za-z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|APIKEY|API_KEY|PRIVATE_KEY|CREDENTIAL)[A-Za-z0-9_]*)\s*=\s*\S/i;

export function inlinedCredential(script: string): string | null {
  const m = SECRET_ASSIGNMENT.exec(script);
  return m === null ? null : (m[1] ?? "credential");
}

function refuse(reason: string): RunOutcome {
  // Refusal is DATA, never a throw — `CommandExecutor`'s contract is that failure comes back on the
  // outcome channel, and a sandbox that threw would be a different contract from the one it wraps.
  return { ok: false, reason, exitCode: 126, stderr: reason };
}

/**
 * Wrap an executor so every run goes through the room's policy first.
 *
 * The decorator keeps the wrapped executor's `tier` — it is a policy layer, not an execution tier,
 * and reporting a different tier would misdescribe where the work actually ran to the glass-halo
 * audit that reads it.
 */
export function sandboxedExecutor(inner: CommandExecutor, sandbox: RoomSandbox): CommandExecutor {
  return {
    tier: inner.tier,
    run: async (spec: RunSpec): Promise<RunOutcome> => {
      const inlined = inlinedCredential(spec.script);
      if (inlined !== null) {
        return refuse(
          `sandbox: refused — the script supplies its own credential ("${inlined}"). Credentials are attached by the room's proxy; a script carrying one has bypassed it.`,
        );
      }

      const hosts = declaredHosts(spec.script);
      const allowed = new Set(sandbox.egress.allowedHosts);
      const blocked = hosts.filter((h) => !allowed.has(h));
      if (blocked.length > 0) {
        return refuse(
          `sandbox: egress refused — ${blocked.join(", ")} not in this room's allowlist (${sandbox.egress.allowedHosts.join(", ") || "empty: no egress permitted"})`,
        );
      }

      return inner.run(spec);
    },
  };
}

/** The tools this sandbox's identity may use, by name. Secrets are never part of the answer. */
export function grantedTools(sandbox: RoomSandbox): readonly ToolGrant[] {
  return sandbox.proxy.grantsFor(sandbox.identity, sandbox.hats);
}
