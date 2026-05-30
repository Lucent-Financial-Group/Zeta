import { deepEqual, equal } from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ControlPlaneAlertKind,
  createCockroachControlPlaneStateStore,
  type CockroachAnySqlStatement,
  type CockroachGenericSqlExecutor,
} from "../src/index.ts";

describe("cockroach control-plane state store (the org's durable proof of life)", () => {
  test("reads the org heartbeat age in milliseconds", async () => {
    const executor = createRecordingSqlExecutor([{ age_ms: 1500 }]);
    const store = createCockroachControlPlaneStateStore({ executor });

    const ageMs = await store.readOrgHeartbeatAgeMs("org-1");

    equal(ageMs, 1500);
    equal(executor.statements[0]?.parameters[0], "org-1");
    equal(executor.statements[0]?.sql.includes("agentic_org_control_plane_heartbeat"), true);
  });

  test("returns undefined when the org has never ticked (no heartbeat row yet)", async () => {
    const executor = createRecordingSqlExecutor([]);
    const store = createCockroachControlPlaneStateStore({ executor });

    const ageMs = await store.readOrgHeartbeatAgeMs("org-1");

    equal(ageMs, undefined);
  });

  test("ticks the org heartbeat with an UPSERT that advances last_tick_at and version", async () => {
    const executor = createRecordingSqlExecutor([]);
    const store = createCockroachControlPlaneStateStore({ executor });

    await store.tickOrgHeartbeat("org-1");

    const statement = executor.statements[0];
    equal(statement?.parameters[0], "org-1");
    equal(statement?.sql.includes("INSERT INTO agentic_org_control_plane_heartbeat"), true);
    equal(statement?.sql.includes("ON CONFLICT (organization_id) DO UPDATE"), true);
    equal(statement?.sql.includes("last_tick_at = now()"), true);
    equal(statement?.sql.includes("version = agentic_org_control_plane_heartbeat.version + 1"), true);
  });

  test("appends a control-plane alert as an immutable row with JSON detail", async () => {
    const executor = createRecordingSqlExecutor([]);
    const store = createCockroachControlPlaneStateStore({ executor });

    await store.appendAlert({
      alertId: "alert-1",
      organizationId: "org-1",
      kind: ControlPlaneAlertKind.OrgStall,
      detail: { ageMs: 9000, deadlineMs: 5000 },
    });

    const statement = executor.statements[0];
    equal(statement?.sql.includes("INSERT INTO agentic_org_control_plane_alerts"), true);
    deepEqual(statement?.parameters, [
      "alert-1",
      "org-1",
      ControlPlaneAlertKind.OrgStall,
      JSON.stringify({ ageMs: 9000, deadlineMs: 5000 }),
    ]);
  });
});

function createRecordingSqlExecutor(rows: readonly Record<string, unknown>[]): CockroachGenericSqlExecutor & {
  statements: CockroachAnySqlStatement[];
} {
  const statements: CockroachAnySqlStatement[] = [];

  return {
    statements,
    execute: async <Row = Record<string, unknown>>(statement: CockroachAnySqlStatement) => {
      statements.push(statement);
      return { rows: rows as readonly Row[] };
    },
    executeTransaction: async (operation) =>
      await operation({
        execute: async <Row = Record<string, unknown>>(statement: CockroachAnySqlStatement) => {
          statements.push(statement);
          return { rows: rows as readonly Row[] };
        },
      }),
  };
}
