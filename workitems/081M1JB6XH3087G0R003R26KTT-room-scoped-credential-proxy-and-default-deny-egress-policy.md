---
id: 081M1JB6XH3087G0R003R26KTT
type: task
state: backlog
priority: P2
slug: room-scoped-credential-proxy-and-default-deny-egress-policy
title: "Room-scoped credential proxy and default-deny egress policy"
created: 2026-09-03T00:37:57.923Z
depends_on: []
composes_with: []
---

# Room-scoped credential proxy and default-deny egress policy

`agentic-organization/docs/ROOMS_AS_DETERMINISTIC_SIMULATIONS.md` §1 says the room *"is the agent's isolation boundary: a
bwrap sandbox plus a credential proxy bound to the agent's OAuth identity"*, and §8 says `observe.ts`
is *"the only path from 'who + where' to 'may run this tool'"*. The org side declares the shape —
`CredentialProxyPort`, `ToolGrant`, `SandboxSpec` on `agentic-organization/packages/application/src/room.ts`
— as a record with no consumer. Nothing enforces it, so nothing can fail.

This puts those pieces on the one seam a room's work actually goes through.

## What landed

- `src/Core.TypeScript/observe/room/sandbox.ts` — `RoomSandbox` (identity + hats + `EgressPolicy` +
  `CredentialProxy`), `sandboxedExecutor` (the decorator every run passes through), `grantedTools`,
  `declaredHosts`, `inlinedCredential`, and `deterministicProxy` as the replayable default.
- `src/Core.TypeScript/observe/room/room.ts` — `Room.sandbox`, `RoomTickContext`, and `tickRooms`
  building the wrapped executor **per room** from its own policy.
- `src/Core.TypeScript/observe/room/sandbox.test.ts` — 18 falsifiers.

## The properties

1. **The agent never holds the secret.** A proxy is not a store: the agent gets a scope NAME, the
   proxy attaches the credential. A leaked transcript or `RunSpec` cannot carry what was never in
   the agent's hands.
2. **A script inlining its own credential is REFUSED**, not passed through — an agent supplying its
   own secret has bypassed the proxy, and refusing is what keeps the proxy the only route.
3. **Default-deny egress.** An empty allowlist permits nothing. A blocklist would have to anticipate
   every host worth blocking, and the one nobody thought of is the one that matters.
4. **A room with no declared sandbox gets NO executor** — not an unguarded one. "No policy declared"
   must not read as "no policy applies".
5. **Refusal is data** (`{ok:false, exitCode:126}`), never a throw: the wrapper keeps the contract of
   the executor it wraps, and its `tier` too, so the glass-halo audit is not misinformed about where
   work ran.

## Honest ceiling

`RunSpec` is a bash script, so host extraction is a **text scan**. A script that builds a URL from
variables, uses a bare IP, or shells out to a helper that fetches on its behalf is not seen. This
bounds **declared** egress, not actual network access — real containment is the `oci`/bwrap network
namespace, and this does not replace it. Stated in the module header for the same reason: calling it
a sandbox in the containment sense would be a stronger claim than the mechanism supports.

## Falsifiers

`bun test src/Core.TypeScript/observe/room/sandbox.test.ts` — 18 pass. Mutation matrix: **10/10
killed**, including the two fail-open shapes that matter (empty allowlist permitting everything; a
sandbox-less room receiving the raw executor) and the log-not-gate shape (running the command and
*then* refusing).
