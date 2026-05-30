/**
 * Cockroach-backed keep-alive snapshot source.
 *
 * Loads the org's liveness facts (heartbeat age from the control-plane store,
 * deadline from config, clock for lease expiry) into the pure engine's
 * KeepAliveSnapshot.
 *
 * v1 scope: agents[] and leases[] are empty — Hermes agent sessions and runtime
 * resource leases are not yet persisted to Cockroach (Hermes runs in-process).
 * The engine handles empty agents/leases ("a quiet but live org with no agents
 * still ticks"); the stale-agent and lease-reap branches activate the moment
 * those facts are persisted. ORG liveness — the heart of tenet #1 — is real now.
 */

import type { KeepAliveSnapshot, KeepAliveSnapshotSource } from "../../keepalive/src/index.ts";
import type { CockroachControlPlaneStateStore } from "./cockroach-control-plane-state-store.ts";

export type KeepAliveClock = {
  /** current epoch ms */
  now: () => number;
};

export type CreateCockroachKeepAliveSnapshotSourceInput = {
  store: CockroachControlPlaneStateStore;
  organizationId: string;
  orgHeartbeatDeadlineMs: number;
  clock: KeepAliveClock;
};

export function createCockroachKeepAliveSnapshotSource(
  input: CreateCockroachKeepAliveSnapshotSourceInput,
): KeepAliveSnapshotSource {
  return {
    loadSnapshot: async (): Promise<KeepAliveSnapshot> => {
      const ageMs = await input.store.readOrgHeartbeatAgeMs(input.organizationId);

      return {
        nowMs: input.clock.now(),
        // a never-ticked org is age 0 (just born, alive) — the first tick's
        // EmitHeartbeat action will register the row
        orgHeartbeatAgeMs: ageMs ?? 0,
        orgHeartbeatDeadlineMs: input.orgHeartbeatDeadlineMs,
        agents: [],
        leases: [],
      };
    },
  };
}
