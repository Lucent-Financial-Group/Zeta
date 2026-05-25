# First Implementation Slice

## Status

Implemented as a small NodeNext TypeScript package slice.

## Purpose

This slice turns the first Agentic Organization runtime contract from
architecture prose into executable TypeScript.

It does not introduce NestJS, CockroachDB, NATS clients, Temporal,
Dapr, Hermes, Hindsight, or Kubernetes deployment manifests yet. Those
remain adapter layers. The goal is to prove the Organization command
shape before adding distributed infrastructure.

The slice is intentionally generic. `send_supervisor_signal` is the
coordination primitive; specific downstream outcomes are lifecycle
decisions made by the target supervisor chain. The goal is not to
hardcode every future request tool. The goal is to make agent
coordination traceable and expandable so agents can propose new tools,
flows, and routing patterns as the Organization learns.

## Implemented Flow

```text
send_supervisor_signal
  -> idempotency record check
  -> chain-of-command signal
  -> audit event
  -> outbox event with canonical event envelope
  -> NATS subject contract
  -> LGTM span attributes
  -> supervisor triage reaction plan
```

## Packages

| Package                      | Implemented first                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@agentic-org/domain`        | event envelope, command/event constants, aggregate constants, supervisor-chain communication types, hat communication briefs, work item state machine, shared records |
| `@agentic-org/application`   | command pipeline, idempotency conflict handling, supervisor signal handler                                                                                            |
| `@agentic-org/state`         | in-memory Organization store fake                                                                                                                                     |
| `@agentic-org/messaging`     | stable `agentic-org.<env>.<org>.<domain>.<event>` subject builder                                                                                                     |
| `@agentic-org/observability` | OpenTelemetry/LGTM span attribute projection                                                                                                                          |
| `@agentic-org/runtime`       | first rule that plans triage for the target supervisor when a chain signal is sent                                                                                    |

## NodeNext Runtime Decision

Agentic Organization now has a local `package.json` and
`tsconfig.json` under `agentic-organization/`.

The first executable slice uses:

- Node 22 or newer;
- `type: module`;
- TypeScript `module: NodeNext`;
- explicit `.ts` imports;
- `node:test`;
- `node:assert/strict`;
- Node TypeScript stripping for test execution.

This keeps the first package contracts independent from the root repo's
Bun tooling while still letting the future NestJS hosts consume the same
package code.

## Telemetry Contract

Every event envelope carries:

- event ID and event type;
- command ID;
- correlation ID;
- causation ID;
- trace ID;
- idempotency key;
- agent ID;
- hat assignment ID;
- organization ID;
- project ID;
- work item ID;
- aggregate ID, type, and version.

`@agentic-org/observability` projects those fields into stable
`agentic.*` span attributes plus NATS messaging attributes. Later OTLP
instrumentation must use these keys so Alloy, Tempo, Loki, Mimir,
Prometheus, and Grafana can connect command execution, NATS fanout,
Hermes runs, MCP calls, and UI evidence.

## Guardrails Proven

- Hats can expose a communication brief that tells the wearer their duty,
  supervisor line, and efficient upward tools.
- Duplicate commands with the same idempotency key and request hash
  replay the stored result.
- Duplicate commands with the same idempotency key and a different
  request hash are rejected with a typed error code.
- Work item transitions are typed and illegal direct transitions throw.
- Event envelopes reject missing command trace fields.
- The first automation rule produces a supervisor triage plan, not an
  unreviewed side effect.

## Next Slice

The next slice should add a CockroachDB-backed state adapter and
transactional outbox while preserving this public package contract.
After that, the NATS publisher worker can publish persisted outbox rows
to JetStream and attach the same telemetry attributes.

Do not make the next slice a pile of bespoke request commands. Build the
generic supervisor triage lifecycle first, then let specialized
lifecycles emerge behind triage.
