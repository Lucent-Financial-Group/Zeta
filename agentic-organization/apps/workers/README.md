# Agentic Organization Workers App

`apps/workers` is the first runtime-host shell for Agentic
Organization. It is intentionally small and NodeNext-first so the
process boundary can be tested before NestJS, real NATS clients,
CockroachDB connection pools, Kubernetes manifests, or process
supervisors are introduced.

## Responsibility

The app composes existing packages. It does not own business rules.

Current duties:

- run the package-level Organization worker cycle;
- run the NATS JetStream consumer adapter cycle;
- pass configured NATS batch size, stream name, and durable consumer
  name into the adapter boundary;
- emit worker-cycle and NATS-consumer batch telemetry records;
- return a healthy/degraded runtime result that makes failures visible
  without starving the other loop.

## Boundary

`apps/workers` may bind adapter packages and process configuration.
Packages must not import this app.

The app currently receives ports that tests can fake:

- `OrganizationWorkerHost`;
- `NatsJetStreamEventConsumer`;
- `WorkerRuntimeTelemetrySink`.

Future concrete process wiring can bind these ports to CockroachDB,
NATS, OTLP/logging, health checks, readiness checks, and graceful
shutdown without changing runtime rule evaluation.
