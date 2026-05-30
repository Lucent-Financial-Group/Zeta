import { deepEqual } from "node:assert/strict";
import { describe, test } from "node:test";

import type { CockroachControlPlaneStateStore } from "../src/index.ts";
import { createCockroachKeepAliveSnapshotSource } from "../src/index.ts";

describe("cockroach keep-alive snapshot source", () => {
  test("loads the org heartbeat age, deadline, and clock into a deterministic snapshot", async () => {
    const source = createCockroachKeepAliveSnapshotSource({
      store: createStubStore(1500),
      organizationId: "org-1",
      orgHeartbeatDeadlineMs: 5000,
      clock: { now: () => 1_000 },
    });

    const snapshot = await source.loadSnapshot();

    deepEqual(snapshot, {
      nowMs: 1_000,
      orgHeartbeatAgeMs: 1500,
      orgHeartbeatDeadlineMs: 5000,
      agents: [],
      leases: [],
    });
  });

  test("treats a never-ticked org as age 0 (just born, alive) so the first tick registers it", async () => {
    const source = createCockroachKeepAliveSnapshotSource({
      store: createStubStore(undefined),
      organizationId: "org-1",
      orgHeartbeatDeadlineMs: 5000,
      clock: { now: () => 2_000 },
    });

    const snapshot = await source.loadSnapshot();

    deepEqual(snapshot, {
      nowMs: 2_000,
      orgHeartbeatAgeMs: 0,
      orgHeartbeatDeadlineMs: 5000,
      agents: [],
      leases: [],
    });
  });
});

function createStubStore(ageMs: number | undefined): CockroachControlPlaneStateStore {
  return {
    readOrgHeartbeatAgeMs: async () => ageMs,
    tickOrgHeartbeat: async () => {},
    appendAlert: async () => {},
  };
}
