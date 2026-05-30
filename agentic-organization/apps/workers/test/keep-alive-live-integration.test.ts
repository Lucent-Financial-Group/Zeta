import { equal, ok } from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { env } from "node:process";
import { describe, test } from "node:test";

import { KeepAliveLaneStatus, createKeepAliveLane } from "../../../packages/keepalive/src/index.ts";
import {
  ControlPlaneAlertKind,
  createCockroachControlPlaneKeepAliveMigration,
  createCockroachControlPlaneStateStore,
  createCockroachKeepAliveActionSink,
  createCockroachKeepAliveSnapshotSource,
  splitSqlStatements,
  type CockroachAnySqlStatement,
} from "../../../packages/state-cockroach/src/index.ts";
import {
  createCockroachSqlExecutor,
  createCockroachWorkerShutdownPort,
  createCockroachWorkerSqlClient,
  createPgCockroachWorkerPool,
} from "../src/index.ts";

const KeepAliveIntegrationEnvName = {
  DatabaseUrl: "AGENTIC_ORG_COCKROACH_INTEGRATION_DATABASE_URL",
} as const;

const OrgHeartbeatDeadlineMs = 5_000;

describe("deterministic keep-alive — live Cockroach control plane (operator tenet #1)", () => {
  test(
    "ticks the org heartbeat each cycle and raises an org-stall alert when the org flatlines",
    {
      skip:
        env[KeepAliveIntegrationEnvName.DatabaseUrl] === undefined
          ? `${KeepAliveIntegrationEnvName.DatabaseUrl} is not set`
          : false,
    },
    async () => {
      const databaseUrl = readIntegrationDatabaseUrl();
      const organizationId = `org-keepalive-${randomUUID()}`;
      const pool = await createPgCockroachWorkerPool({ databaseUrl });
      const sqlClient = createCockroachWorkerSqlClient({ pool, maxTransactionAttempts: 2 });
      const executor = createCockroachSqlExecutor({ client: sqlClient });

      try {
        await applyControlPlaneKeepAliveMigration(executor);

        const store = createCockroachControlPlaneStateStore({ executor });
        const lane = createKeepAliveLane({
          source: createCockroachKeepAliveSnapshotSource({
            store,
            organizationId,
            orgHeartbeatDeadlineMs: OrgHeartbeatDeadlineMs,
            clock: { now: () => Date.now() },
          }),
          sink: createCockroachKeepAliveActionSink({
            store,
            organizationId,
            generateAlertId: () => randomUUID(),
          }),
        });

        // tick 1 — the org proves life for the first time (registers the row)
        const firstTick = await lane.runOnce();
        equal(firstTick.status, KeepAliveLaneStatus.Ticked);
        equal(firstTick.appliedCount, 1);

        const afterFirst = await readHeartbeat(executor, organizationId);
        equal(afterFirst?.version, 1);
        ok((afterFirst?.ageMs ?? Number.MAX_SAFE_INTEGER) < OrgHeartbeatDeadlineMs);

        // tick 2 — last_tick_at advances, version increments; org stays alive
        await delay(25);
        const secondTick = await lane.runOnce();
        equal(secondTick.status, KeepAliveLaneStatus.Ticked);
        equal(secondTick.appliedCount, 1);

        const afterSecond = await readHeartbeat(executor, organizationId);
        equal(afterSecond?.version, 2);
        ok((afterSecond?.ageMs ?? Number.MAX_SAFE_INTEGER) < OrgHeartbeatDeadlineMs);

        // force a stall: push last_tick_at well past the deadline, then tick.
        // the engine reads the stale snapshot first -> emits heartbeat AND a stall
        // alert; the org self-heals (heartbeat re-ticked) but the alert is recorded.
        await forceStall(executor, organizationId);
        const stallTick = await lane.runOnce();
        equal(stallTick.status, KeepAliveLaneStatus.Degraded);
        equal(stallTick.appliedCount, 2);

        const alertCount = await readOrgStallAlertCount(executor, organizationId);
        ok(alertCount >= 1);

        // self-heal confirmed: the heartbeat is fresh again after the stall tick
        const afterStall = await readHeartbeat(executor, organizationId);
        equal(afterStall?.version, 3);
        ok((afterStall?.ageMs ?? Number.MAX_SAFE_INTEGER) < OrgHeartbeatDeadlineMs);
      } finally {
        await cleanUp(executor, organizationId);
        await createCockroachWorkerShutdownPort({ pool }).shutdown();
      }
    },
  );
});

function readIntegrationDatabaseUrl(): string {
  const databaseUrl = env[KeepAliveIntegrationEnvName.DatabaseUrl];
  if (databaseUrl === undefined) {
    throw new Error(`${KeepAliveIntegrationEnvName.DatabaseUrl} is not set`);
  }
  return databaseUrl;
}

type ControlPlaneSqlExecutor = {
  execute: <Row = Record<string, unknown>>(
    statement: CockroachAnySqlStatement,
  ) => Promise<{ rows: readonly Row[] }>;
};

async function applyControlPlaneKeepAliveMigration(executor: ControlPlaneSqlExecutor): Promise<void> {
  const migration = createCockroachControlPlaneKeepAliveMigration();
  for (const statement of splitSqlStatements(migration.sql)) {
    await executor.execute({ name: "keep_alive_live_migration", sql: statement, parameters: [] });
  }
}

async function readHeartbeat(
  executor: ControlPlaneSqlExecutor,
  organizationId: string,
): Promise<{ version: number; ageMs: number } | undefined> {
  const result = await executor.execute<{ version: number | string; age_ms: number | string }>({
    name: "keep_alive_live_read_heartbeat",
    sql: `
      SELECT version, (EXTRACT(EPOCH FROM (now() - last_tick_at)) * 1000)::INT8 AS age_ms
      FROM agentic_org_control_plane_heartbeat
      WHERE organization_id = $1
    `,
    parameters: [organizationId],
  });
  const row = result.rows[0];
  if (row === undefined) {
    return undefined;
  }
  return { version: Number(row.version), ageMs: Number(row.age_ms) };
}

async function forceStall(executor: ControlPlaneSqlExecutor, organizationId: string): Promise<void> {
  await executor.execute({
    name: "keep_alive_live_force_stall",
    sql: `
      UPDATE agentic_org_control_plane_heartbeat
      SET last_tick_at = now() - INTERVAL '10 seconds'
      WHERE organization_id = $1
    `,
    parameters: [organizationId],
  });
}

async function readOrgStallAlertCount(executor: ControlPlaneSqlExecutor, organizationId: string): Promise<number> {
  const result = await executor.execute<{ alert_count: number | string }>({
    name: "keep_alive_live_read_alert_count",
    sql: `
      SELECT count(*) AS alert_count
      FROM agentic_org_control_plane_alerts
      WHERE organization_id = $1 AND kind = $2
    `,
    parameters: [organizationId, ControlPlaneAlertKind.OrgStall],
  });
  return Number(result.rows[0]?.alert_count ?? 0);
}

async function cleanUp(executor: ControlPlaneSqlExecutor, organizationId: string): Promise<void> {
  await executor
    .execute({
      name: "keep_alive_live_cleanup_alerts",
      sql: `DELETE FROM agentic_org_control_plane_alerts WHERE organization_id = $1`,
      parameters: [organizationId],
    })
    .catch(() => undefined);
  await executor
    .execute({
      name: "keep_alive_live_cleanup_heartbeat",
      sql: `DELETE FROM agentic_org_control_plane_heartbeat WHERE organization_id = $1`,
      parameters: [organizationId],
    })
    .catch(() => undefined);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
