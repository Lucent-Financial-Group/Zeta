# Agentic Organization Packages

These packages are the first executable slice of Agentic Organization.
They are intentionally small and run as a NodeNext TypeScript island
before any NestJS host, CockroachDB adapter, NATS client, Temporal
worker, Dapr actor host, or Kubernetes deployment is introduced.

## Package Boundary

| Package         | Current responsibility                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `domain`        | typed command names, event names, aggregate names, work item state machine, event envelope, shared records |
| `application`   | command pipeline, idempotency handling, first supervisor-chain signal command handler                      |
| `state`         | in-memory Organization store used as the first repository port fake                                        |
| `messaging`     | NATS subject contract without a live NATS dependency                                                       |
| `observability` | LGTM/OpenTelemetry attribute projection from Agentic event envelopes                                       |
| `runtime`       | first event-to-automation reaction rule                                                                    |

## Slice Rule

The first slice proves this path:

```text
supervisor-chain signal command
  -> idempotency check
  -> chain communication record
  -> audit event
  -> outbox event
  -> NATS subject / telemetry contract
  -> automation reaction plan
```

CockroachDB, JetStream publishing, Temporal, Dapr, Hermes, Hindsight,
and the hat-system CRDs come next as adapters behind these contracts.
They should not redefine command names, event names, state names,
correlation fields, or policy authority.

## Validation

Run the package tests from `agentic-organization/`:

```powershell
npm test
```

The test command uses Node's built-in test runner and TypeScript type
stripping:

```text
node --experimental-strip-types --test packages/**/*.test.ts
```

This is a deliberate NodeNext starting point so the package contracts
can run without requiring Bun to be installed on a cluster maintainer's
shell.
