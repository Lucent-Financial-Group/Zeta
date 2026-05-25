# Technical CA: Package-First Agentic Organization Architecture

## Status

Proposal for review.

## Purpose

This CA proposes the first implementation architecture for Agentic
Organization as a TypeScript/NestJS modular monolith made of reusable
packages. The Organization OS composes those packages into runnable
processes, but the packages own the actual capability contracts.

The goal is to build a generic, extensible, event-driven Organization
runtime where every meaningful action is traceable, replay-aware,
policy-checked, and safe to move from in-process execution to a separate
service later.

## Architecture Decision

Build Agentic Organization as one product with many packages and a small
set of runtime hosts:

```text
apps/api
apps/web
apps/workers
apps/temporal-worker
apps/dapr-actors
apps/mcp-gateway

packages/*
```

Packages are the real service boundaries. NestJS apps are composition
hosts. They wire dependency injection, transports, lifecycle hooks,
health checks, process concerns, and adapters.

The Organization owns:

- business model;
- commands;
- state transitions;
- policies;
- audit;
- trace contracts;
- event contracts;
- package boundaries.

The cluster provides:

- CockroachDB for authoritative Organization state;
- NATS JetStream for event transport, fanout, inboxes, replay, and DLQ;
- Temporal TS for durable long-running workflows;
- Dapr Actors for hot entity-local coordination;
- Hermes for agent reasoning and tool use;
- Hindsight for memory;
- hat-system CRDs for cluster hat enforcement and projection;
- Cilium, SPIRE, Vault, Trust Manager, and External Secrets for network,
  identity, trust, and secret delivery;
- ArgoCD for physical GitOps reconciliation.

None of those cluster runtimes should become a parallel business model.

## Core Shape

```text
Runtime host
  API controller / worker / MCP handler / Temporal activity / Dapr actor
    -> application command service
      -> policy check
      -> domain state transition
      -> CockroachDB transaction
        -> authoritative state
        -> audit event
        -> outbox event
        -> idempotency record
      -> NATS publish through outbox worker
      -> OpenTelemetry spans and logs
```

The same command service should be callable from every runtime host. No
adapter should mutate authoritative tables directly.

## Dependency Direction

Dependencies point inward.

```text
apps/*
  -> @agentic-org/nest-composition
    -> @agentic-org/application
      -> @agentic-org/domain
      -> ports/interfaces
    -> adapter packages
      -> external runtimes
```

Rules:

- `@agentic-org/domain` depends on no infrastructure package.
- Domain packages do not import NestJS, Temporal, Dapr, NATS,
  Hindsight, Hermes, Kubernetes, OpenZiti, Drizzle, or OpenTelemetry.
- Application packages depend on domain and ports.
- Adapter packages implement ports and may depend on runtime clients.
- Runtime hosts depend on packages; packages do not depend on runtime
  hosts.
- Cross-package imports use public exports only.
- No controller, worker entrypoint, Temporal workflow, Dapr actor, or MCP
  route contains business rules.

## Package Layers

### Layer 0: Domain Kernel

| Package | Owns |
|---|---|
| `@agentic-org/domain` | entity IDs, value objects, typed enums, state machines, domain events, command names, event names, aggregate contracts |
| `@agentic-org/contracts` | shared DTOs, public schemas, versioned API/event contracts, generated clients when needed |

The domain kernel should be small and strict. It defines language and
legal transitions. It does not execute side effects.

### Layer 1: Application and Policy

| Package | Owns |
|---|---|
| `@agentic-org/application` | command handlers, use cases, transaction orchestration, ports, command result contracts |
| `@agentic-org/policy` | RBAC, hat authority checks, OPA/Rego adapter boundary, policy decisions, denial reasons |
| `@agentic-org/observability` | correlation envelope, OpenTelemetry helpers, required span attributes, trace propagation |

The application layer is the Organization OS command layer. It is where
the runtime asks the Organization to do something.

### Layer 2: Capability Packages

| Package | Owns |
|---|---|
| `@agentic-org/work-os` | projects, initiatives, work items, dependencies, blockers, assignments, releases, work signals |
| `@agentic-org/requirements` | ambiguous requirement intake, clarification, BRD lifecycle, maturity state |
| `@agentic-org/documents` | BRDs, CAs, ADRs, design docs, reports, document scope, document approval state |
| `@agentic-org/gates` | readiness, code, QA, security, architecture, memory, release, and outcome gates |
| `@agentic-org/hats` | hat graph, supply, assignment, JWT issuance/refresh/revocation, succession, cooldown, warmup |
| `@agentic-org/assignments` | staffing, agent-to-hat fit, work assignment, reassignment, capacity checks |
| `@agentic-org/prompt-flows` | deterministic prompt-flow definitions, phases, phase gates, reusable procedures |
| `@agentic-org/action-grammar` | universal action grammar, reversibility, observation contracts, action-mode classification |
| `@agentic-org/knowledge-graph` | graph nodes, edges, context packs, retrieval envelopes, provenance and access envelopes |
| `@agentic-org/runtime` | triggers, rules, reaction plans, leases, schedulers, reconcilers, self-healing loops |
| `@agentic-org/ui-projections` | read models for boards, timelines, run views, evidence, reviews, observability, org map |

Capability packages should be independently testable. They can expose
interfaces and services, but they should not know which process is
calling them.

### Layer 3: State, Messaging, and Runtime Adapters

| Package | Owns |
|---|---|
| `@agentic-org/state` | Drizzle schema, migrations, repositories, transactions, outbox, inbox, idempotency, leases |
| `@agentic-org/messaging` | NATS envelope builder, subject builder, JetStream publisher, consumer, DLQ, replay contracts |
| `@agentic-org/workflows-temporal` | Temporal workflow and activity contracts, task queues, workflow clients |
| `@agentic-org/actors-dapr` | Dapr actor interfaces, actor implementations, reminders, actor state projection |
| `@agentic-org/mcp` | MCP schemas, tool registry, preflight checks, policy-checked tool handlers |
| `@agentic-org/hermes` | Hermes session adapter, run adapter, callback contract, run context builder |
| `@agentic-org/memory` | Hindsight adapter, hat-scoped recall/retain/reflect, memory attribution, memory health |
| `@agentic-org/k8s-hats` | generated or checked Hat, HatBinding, HatSwap, HatPolicy types, informers, projection decoding |
| `@agentic-org/openziti` | OpenZiti transport adapter, identity/config access, connectivity checks |
| `@agentic-org/credential-proxy` | credential request adapter, scoped credential use, audit hooks |
| `@agentic-org/adapters-agentic-services` | temporary wrappers around reused `agentic-services` primitives |

Adapters are replaceable. The Organization should be able to run a V0
slice with in-process fakes, then swap in Temporal, Dapr, Hermes,
Hindsight, Kubernetes, and NATS adapters behind the same ports.

### Layer 4: Runtime Hosts

| Runtime host | Responsibility |
|---|---|
| `apps/api` | REST/OpenAPI, internal APIs, command dispatch, read queries, auth guards |
| `apps/web` | human operations console, boards, timelines, org map, observability, review center |
| `apps/workers` | outbox publisher, schedulers, NATS consumers, reconcilers, projection builders |
| `apps/temporal-worker` | Temporal workers and activities that call Organization commands |
| `apps/dapr-actors` | Dapr actor host for hot state and reminders |
| `apps/mcp-gateway` | MCP gateway, agent context resolution, preflight checks, tool execution |

Runtime hosts are allowed to be deployed separately. They are not
separate business services yet.

## NestJS Composition

NestJS should compose packages into modules:

```text
OrganizationModule
  IdentityModule
  PolicyModule
  WorkOsModule
  RequirementsModule
  DocumentsModule
  GatesModule
  HatsModule
  AssignmentsModule
  PromptFlowModule
  ActionGrammarModule
  KnowledgeGraphModule
  RuntimeModule
  MessagingModule
  McpGatewayModule
  HermesModule
  MemoryModule
  K8sHatsModule
  ObservabilityModule
  UiProjectionModule
```

Module providers should bind ports to implementations:

```text
HatAssignmentRepository -> DrizzleHatAssignmentRepository
EventPublisher -> OutboxEventPublisher
HermesRunPort -> HermesRunAdapter or FakeHermesRunAdapter
MemoryPort -> HindsightMemoryAdapter or FakeMemoryAdapter
HatSystemPort -> KubernetesHatSystemAdapter or ReadOnlyFakeHatSystemAdapter
```

Business services should depend on ports, not concrete adapters.

## SOLID Rules

### Single Responsibility

Each package owns one capability family. If a package needs to know too
much about another package's internals, the boundary is wrong.

### Open/Closed

New hats, prompt flows, workflow types, MCP tools, memory strategies, and
runtime adapters should be added through registries and package exports,
not by editing central switch statements.

### Liskov Substitution

Fake adapters, local adapters, and cluster adapters must satisfy the same
ports. If V0 runs with a fake Hermes adapter, the real Hermes adapter
must be swappable without changing command handlers.

### Interface Segregation

Ports should be narrow:

- `ReserveHatPort`, not `HatEverythingService`;
- `PublishOutboxEventPort`, not `MessagingService`;
- `RecallMemoryPort`, not `MemoryPlatform`;
- `LaunchHermesRunPort`, not `RuntimeManager`.

### Dependency Inversion

Application services define what they need. Infrastructure packages
implement it. Runtime hosts bind implementations.

## Event-Driven Contract

All state transitions are event-producing commands.

CockroachDB stores authoritative state, audit, idempotency, and outbox.
NATS JetStream carries event distribution, inboxes, live UI updates,
replayable integration streams, and DLQs. Logs, traces, and metrics are
evidence. They are not business truth.

### Canonical Event Envelope

All events published through NATS should use one envelope:

```ts
type AgenticEventEnvelope<TPayload> = {
  eventId: string;
  eventType: AgenticEventType;
  schemaVersion: string;
  occurredAt: string;
  source: {
    service: string;
    instanceId?: string;
    workloadSpiffeId?: string;
  };
  scope: {
    organizationId: string;
    projectId?: string;
    initiativeId?: string;
    workItemId?: string;
    runId?: string;
  };
  actor: {
    agentId?: string;
    hatAssignmentId?: string;
    serviceId?: string;
  };
  aggregate: {
    type: string;
    id: string;
    version: number;
  };
  trace: {
    traceparent: string;
    traceId: string;
    spanId?: string;
    correlationId: string;
    causationId?: string;
    commandId?: string;
    idempotencyKey: string;
  };
  policy?: {
    policyVersion?: string;
    decisionId?: string;
  };
  replay?: {
    isReplay: boolean;
    originalEventId?: string;
    replayRequestId?: string;
  };
  payload: TPayload;
};
```

No app should publish raw NATS payloads directly. Publishing should go
through `@agentic-org/messaging`.

### Subject Convention

Use one Organization subject family:

```text
agentic-org.<env>.<orgId>.<domain>.<eventType>
agentic-org.<env>.<orgId>.inbox.agent.<agentId>
agentic-org.<env>.<orgId>.inbox.hat.<hatAssignmentId>
agentic-org.<env>.<orgId>.ui.<projection>
agentic-org.<env>.<orgId>.dlq.<domain>
agentic-org.<env>.<orgId>.cluster.hats.<eventType>
```

The existing hat-system NATS subjects can be consumed by a bridge
consumer and republished into the Organization subject family with the
canonical envelope. Do not require the Go hat-system operator to change
before V0 can consume it.

### Transactional Outbox and Inbox

Every command writes these in one transaction:

```text
authoritative state
audit_events
outbox_events
idempotency_keys
```

Every NATS consumer writes an inbox receipt before side effects:

```text
event_id
consumer_name
aggregate_type
aggregate_id
aggregate_version
payload_hash
first_seen_at
processed_at
result
```

Consumers dedupe by `eventId + consumerName`. Commands dedupe by
deterministic `idempotencyKey`. External side effects must either be
natively idempotent or wrapped by a command that stores the external
request/result.

### Stream and Consumer Manifests

Every stream and durable consumer should declare:

- owner package;
- subject pattern;
- durable name;
- retention policy;
- ordering key;
- ack wait;
- max deliveries;
- backoff;
- replay authorization;
- DLQ subject;
- schema versions accepted;
- compatibility rule;
- SLO for consumer lag.

This can start as generated config from `@agentic-org/messaging` and
later become Kubernetes manifests.

## Traceability Contract

Every command, event, adapter call, and artifact must carry a correlation
chain.

Required trace fields:

```text
traceparent
trace_id
span_id
correlation_id
causation_id
command_id
idempotency_key
event_id
agent_id
hat_assignment_id
project_id
initiative_id
work_item_id
run_id
policy_decision_id
```

Required OpenTelemetry span attributes:

```text
agentic.event.id
agentic.event.type
agentic.command.id
agentic.correlation.id
agentic.causation.id
agentic.idempotency.key
agentic.agent.id
agentic.hat.assignment.id
agentic.project.id
agentic.initiative.id
agentic.work_item.id
agentic.run.id
agentic.policy.decision_id
nats.subject
nats.stream
nats.consumer
k8s.namespace.name
k8s.pod.name
```

`@agentic-org/observability` should provide helpers that make these
fields easy to attach and hard to skip.

## Audit, Event Store, and Replay

Use clear language:

- `audit_events` are compliance and evidence records.
- `outbox_events` are integration events waiting to publish.
- `event_store` is the append-only domain history if we decide to keep
  one beyond audit/outbox.
- NATS streams are transport and replay surfaces, not the source of
  truth.

Replay should:

1. create a `ReplayRequested` event;
2. require approval for side-effecting domains;
3. preserve original event IDs inside the replay envelope;
4. mark replay spans and events;
5. write replay outcomes to audit;
6. never silently perform external side effects twice.

## Cluster Deployment Boundary

Agentic Organization should deploy as a `full-ai-cluster` consumer
workload:

```text
full-ai-cluster/k8s/applications/agentic-organization/
  Application.yaml
  namespace.yaml
  api
  web
  workers
  temporal-worker
  dapr-actors
  mcp-gateway
  ExternalSecret refs
  CiliumNetworkPolicy
  ServiceAccount/RBAC
```

Current cluster readiness:

- CockroachDB exists as the distributed SQL substrate.
- NATS exists with JetStream enabled.
- Temporal and Dapr are present, but their Organization-specific
  persistence/components still need wiring.
- Hindsight is wired as the Hermes memory system.
- Hermes exists as a placeholder deployment until the real image is
  available.
- hat-system CRDs and policies exist; the operator image/runtime still
  needs completion.
- Cilium, SPIRE, Vault, Trust Manager, and External Secrets provide the
  security substrate.

The CA should not block V0 on every runtime being production-ready. It
should define ports and fakes first, then swap in cluster adapters as
each substrate becomes live.

## V0 Build Sequence

1. Create package skeletons for:
   - `@agentic-org/domain`;
   - `@agentic-org/application`;
   - `@agentic-org/state`;
   - `@agentic-org/policy`;
   - `@agentic-org/messaging`;
   - `@agentic-org/observability`;
   - `@agentic-org/work-os`;
   - `@agentic-org/hats`;
   - `@agentic-org/mcp`;
   - `@agentic-org/hermes`;
   - `@agentic-org/memory`;
   - `@agentic-org/ui-projections`.
2. Implement the canonical command context, event envelope, typed enums,
   and idempotency key builder.
3. Implement the first CockroachDB schema and Drizzle migrations for the
   V0 executable contract.
4. Implement command handlers for:
   - submit capability request;
   - triage capability request;
   - reserve hat;
   - issue hat token;
   - start prompt flow;
   - launch Hermes run;
   - submit evidence;
   - decide gate;
   - complete outcome review.
5. Use fake adapters for Hermes, Hindsight, Dapr, Temporal, and
   hat-system.
6. Add NATS outbox publisher and one consumer after command tests pass.
7. Add the NestJS API and worker hosts.
8. Add UI projections for work board, review center, and evidence
   timeline.
9. Add real cluster adapters one at a time.

## Extraction Path

Do not split by domain first. Split only after package contracts are
stable and contract-tested.

Extraction pattern:

```text
package interface
  -> in-process provider
  -> remote adapter behind the same interface
  -> ArgoCD-managed service
```

The first extraction candidates are runtime hosts already implied by the
architecture:

- MCP gateway;
- Temporal worker;
- Dapr actor host;
- Hermes run adapter;
- memory adapter;
- k8s hat projection worker.

Keep Organization Kernel, Work OS, Hat Graph, Policy, and command
handling together until their contracts are proven.

## Contract Gates

Before a package can be consumed by the OS, it needs:

- public export review;
- dependency-boundary check;
- typed enum/state-machine tests;
- policy allow/deny tests where relevant;
- event envelope tests;
- idempotency tests for side-effecting commands;
- OpenTelemetry field coverage tests;
- outbox/inbox tests for event-producing commands;
- contract tests for every adapter port;
- README section documenting ownership, inputs, outputs, events, and
  failure modes.

## Open Questions

- Should `@agentic-org/contracts` be separate from `@agentic-org/domain`
  from day one, or split after the first generated client exists?
- Should event store be a dedicated table in V0, or are audit plus
  outbox enough until replay requirements harden?
- Should the hat-system bridge republish into the canonical
  `agentic-org.*` subject family, or should Organization consumers read
  both subject families directly?
- Should package dependency rules be enforced with Nx module boundaries,
  dependency-cruiser, or a custom lint rule?
- Which first fake adapter should be replaced with a real cluster
  adapter: NATS, Hindsight, Hermes, Dapr, Temporal, or k8s hats?
