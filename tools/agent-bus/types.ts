/**
 * Agent-bus Phase 1 (B-0954) — the git-native cross-machine agent comms channel.
 *
 * Envelopes are ZetaId-named files in
 *   docs/agent-bus/<persona>/<YYYY>/<MM>/<DD>/<zetaIdHex>.json
 * a **G-Set CRDT**: disjoint, ZetaId-named files never collide, so concurrent agents
 * on different machines write different files -> conflict-free -> cross-machine /
 * Windows-safe (git is the transport). Per the #6219 spec; no-PR direct-to-main per
 * B-0858 (heartbeat folder) + folders-on-main per B-0890.1.
 *
 * Reuses the existing bus topic+payload (`tools/bus/types`) + the canonical ZetaId
 * (`Category.Bus`) — NOT a new id scheme or action language.
 *
 * This module is PURE (path + mint + types). The git layer (commit/push on publish,
 * pull on subscribe) lives behind the CLIs in publish.ts / subscribe.ts so tests +
 * importers never touch git or the real `docs/agent-bus/` folder.
 */
import { join } from "node:path";
import type { AgentId, SenderAgentId, BusMessage } from "../bus/types";
import { pack, DEFAULT_ENV, type SimulationEnvironment } from "../../src/Core.TypeScript/zeta-id/zeta-id";
import {
  Category,
  IdVersion,
  Chromosome,
  Firefly,
  Persona,
  LocationHint,
  type ZetaObservation,
  type Milliseconds,
} from "../../src/Core.TypeScript/zeta-id/types";

/** Repo-relative root for the bus folder; override with `ZETA_AGENT_BUS_DIR` (tests). */
export const AGENT_BUS_ROOT: string = process.env.ZETA_AGENT_BUS_DIR ?? "docs/agent-bus";

/**
 * One bus envelope = one file. Reuses the existing `BusMessage` (topic+payload union)
 * + the sender/target identifiers; the ZetaId hex is the filename + the dedup key.
 */
export interface AgentBusEnvelope {
  readonly zetaIdHex: string; // 32-hex Bus-category ZetaId — filename + dedup key
  readonly from: SenderAgentId; // publishing agent surface
  readonly to: AgentId; // target ("*" = broadcast)
  readonly ts: string; // ISO timestamp — the ordering key (the ZetaId carries the canonical ms)
  readonly message: BusMessage; // the existing topic+payload discriminated union
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** `<root>/<persona>/<YYYY>/<MM>/<DD>/<zetaIdHex>.json` (UTC date partition). */
export function envelopePath(root: string, persona: string, zetaIdHex: string, at: Date = new Date()): string {
  return join(
    root,
    persona,
    String(at.getUTCFullYear()),
    pad2(at.getUTCMonth() + 1),
    pad2(at.getUTCDate()),
    `${zetaIdHex}.json`,
  );
}

/**
 * Mint a Bus-category ZetaId as 32-hex. `DEFAULT_ENV` (crypto randomness) makes each
 * call unique even with identical semantic fields — so distinct envelopes get distinct
 * files. Pass `DETERMINISTIC_ENV` for reproducible tests (identical fields -> identical
 * id -> the safe idempotent same-file the G-Set CRDT relies on; see the spec's
 * collision caveat).
 */
export function mintBusZetaIdHex(env: SimulationEnvironment = DEFAULT_ENV, atMs: number = Date.now()): string {
  const obs: ZetaObservation = {
    version: IdVersion.V1,
    timestamp: atMs as Milliseconds,
    chromosome: Chromosome.MetaCoherence,
    category: Category.Bus,
    firefly: Firefly.NoDirective,
    authority: { type: "TrustedAgent" },
    persona: Persona.FireflyCoherence,
    momentum: { type: "Normal" },
    location: LocationHint.EastUS_VA1,
  };
  return pack(obs, env).toString(16).padStart(32, "0");
}

/** Canonical on-disk serialization (stable: pretty + trailing newline). */
export function serializeEnvelope(env: AgentBusEnvelope): string {
  return `${JSON.stringify(env, null, 2)}\n`;
}
