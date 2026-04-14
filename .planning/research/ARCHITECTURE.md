# Architecture Evolution: Modular Monolith to Safe Agent-Native Scale

**Domain:** ServiceNow-style platform for AI agents and AI companies  
**Researched:** 2026-04-14  
**Current state:** Next.js modular monolith with shared request lifecycle services

## Recommendation in One Line

Evolve to a **modular control-plane architecture**: keep the current monolith as the source of truth for product velocity, then progressively extract high-risk and high-scale concerns into dedicated services (workflow orchestration, policy decisioning, execution runtime, and observability) behind strict contracts.

## Target Architecture (North Star)

```text
Channels (UI/API/Slack/Webhooks)
  -> API Gateway + AuthN/AuthZ Edge
  -> Request Control Plane (domain API + state transitions)
      -> Durable Workflow Orchestrator (long-running sagas, retries, compensation)
      -> Policy Decision Service (OPA/Rego + CEL for inline predicates)
      -> Agent Execution Gateway (least privilege tool routing, ephemeral credentials)
      -> Event Bus (domain events + automation triggers)
      -> Connector Workers (fulfillment adapters, idempotent handlers)
      -> Audit/Telemetry Pipeline (OTel traces/logs/metrics + immutable audit timeline)
  -> Data Plane
      -> Postgres (system of record)
      -> Queue/Event storage
      -> Object storage (artifacts, transcripts)
```

## Component Boundaries

| Component | Responsibility | Owns Data | Communicates With |
|-----------|----------------|-----------|-------------------|
| API Gateway and Edge Security | Tenant-scoped auth, API key validation, coarse rate limiting, request shaping | Key metadata, request envelope logs | Control Plane API, Policy Service |
| Request Control Plane | Canonical request lifecycle, approvals, SLAs, assignment, state machine entrypoint | Request, approval, ticket, audit metadata | Workflow Orchestrator, Policy Service, Event Bus |
| Durable Workflow Orchestrator | Long-running process execution, retry/backoff, compensation steps, timeout handling | Workflow execution state and event history | Control Plane, Connector Workers, Event Bus |
| Policy Decision Service | Centralized policy-as-code decisions (authorization, compliance, risk gates) | Versioned policies, decision logs | Gateway, Control Plane, Execution Gateway |
| Agent Execution Gateway | Tool-call mediation, action budget enforcement, prompt/tool policy checks, sandbox dispatch | Execution sessions, tool invocation logs | Policy Service, Sandboxed Runners, Connectors |
| Connector Worker Pool | External system fulfillment (SaaS APIs, internal automations) with idempotency | Connector job state, delivery attempts | Workflow Orchestrator, Event Bus |
| Event Bus | Pub/sub backbone for automation and decoupled side effects | Event streams, consumer offsets | All async producers/consumers |
| Audit and Observability Pipeline | End-to-end traceability, evidence retention, anomaly detection | Trace spans, logs, metrics, immutable audit timeline | Every component |
| Tenant Data Plane | Multi-tenant relational data with strict tenant keys and row-level controls | Operational records | Control Plane and services via data access layer |

## Data Flows

### 1) Governed Request Intake (human or agent)
1. Channel submits request (UI/API/Slack) to Edge.
2. Edge authenticates actor and resolves tenant context.
3. Edge calls Policy Decision Service for pre-flight checks (allowed action, quota, risk class).
4. Control Plane persists request draft and emits `request.created`.
5. Workflow Orchestrator starts saga for approval and fulfillment path.

### 2) Approval and Policy Re-check
1. Approval action enters Control Plane transition endpoint.
2. Policy Decision Service re-evaluates with latest context (separation of duty, threshold rules).
3. On allow, state advances and orchestrator receives continuation signal.
4. On deny, immutable decision event is written and requester gets structured reason.

### 3) Fulfillment and Automation
1. Orchestrator schedules tasks to Connector Workers through queue/event topics.
2. Workers execute idempotent external actions with bounded retries.
3. Partial failure triggers compensation branch (saga rollback or remedial tasks).
4. Completion updates request state and emits `request.fulfilled` or `request.failed`.

### 4) Agent-Native Execution
1. Agent proposes tool/action via Execution Gateway.
2. Gateway checks policy, budget, and allowed tool scopes.
3. Gateway issues short-lived credentials for sandboxed execution.
4. Result and evidence are returned to orchestrator/control plane and audited.

### 5) Audit and Monitoring
1. All components emit OpenTelemetry traces, metrics, logs.
2. Audit pipeline correlates action, decision, actor, tool, and outcome.
3. Governance dashboards and alerts detect drift, policy bypass attempts, and error spikes.

## Evolution Path from Current Modular Monolith

### Stage 0 (Now): Harden Monolith Boundaries
- Keep `src/server` as domain core and formalize interfaces for request lifecycle operations.
- Enforce fail-closed approvals and tenant scoping on every workflow entrypoint.
- Add idempotency keys and deterministic transition guards across actions and APIs.

### Stage 1: Introduce Event Contracts and Workflow Engine
- Add explicit domain events (`request.created`, `approval.applied`, `fulfillment.started`, `fulfillment.completed`).
- Introduce durable orchestration (Temporal-class model) for long-running operations while keeping monolith as API facade.
- Move fulfillment retries and compensations out of ad hoc route logic into orchestrated workflows.

### Stage 2: Externalize Policy Decisions
- Extract policy checks into dedicated decision service using OPA/Rego for central policy governance.
- Use CEL for low-latency, embedded guard expressions where full policy engine calls are too heavy.
- Log every policy input/output pair for auditability and regression testing.

### Stage 3: Build Agent Execution Gateway
- Route all agent tool use through a single gateway with least-privilege and budget controls.
- Run risky automations in ephemeral sandbox workers, never with standing credentials.
- Add circuit breakers for runaway loops, token burn, and repeated failure signatures.

### Stage 4: Selective Service Extraction
- Extract only scale hotspots first: workflow workers, policy service, execution gateway, connector runtime.
- Keep product-facing request APIs and UI in monolith until team and operational maturity justify deeper split.
- Use event and API contracts as anti-corruption boundaries during extraction.

## Build-Order Implications for Roadmap

1. **Trust Foundation First**
   - Tenant isolation, authz hardening, fail-closed policy semantics, and immutable audit chain are prerequisites.
   - Without this, autonomy increases blast radius.

2. **Durable Orchestration Before More Automation**
   - Add workflow durability and compensation before expanding autonomous agent actions.
   - Prevents partial side effects and manual reconciliation debt.

3. **Policy Centralization Before Multi-Agent Expansion**
   - Single policy decision plane avoids policy drift across UI/API/Slack/agent channels.
   - Enables consistent governance as channel count grows.

4. **Execution Gateway Before High-Risk Integrations**
   - Never let agents call privileged connectors directly.
   - Insert mediation layer before adding sensitive automations (billing, IAM, production ops).

5. **Observability as a Release Gate**
   - Require trace coverage and policy decision logs for new autonomous workflows before GA.
   - "No telemetry, no launch" for agentic features.

## Architectural Anti-Patterns to Avoid

- **Premature microservices rewrite:** increases failure modes before contracts and observability are mature.
- **Policy in application code everywhere:** leads to divergence and compliance blind spots.
- **Direct agent-to-connector calls:** removes least-privilege controls and auditability.
- **Async side effects without idempotency:** causes duplicate fulfillment and unrecoverable drift.
- **Single shared queue with no isolation:** noisy neighbor effects across tenants and workflow types.

## Confidence and Evidence

| Area | Confidence | Notes |
|------|------------|-------|
| Durable orchestration model | HIGH | Verified with Temporal official architecture documentation |
| Policy decision architecture (OPA/CEL) | HIGH | Verified with OPA docs and CEL official site |
| AI governance control plane principles | MEDIUM-HIGH | Anchored on NIST AI RMF and current enterprise architecture practice |
| Specific vendor/tool choices at this repo scale | MEDIUM | Final choices depend on traffic profile and team ops maturity |

## Sources

- Temporal: [How Temporal Platform Works](https://temporal.io/how-it-works)
- Open Policy Agent docs: [OPA Documentation](https://www.openpolicyagent.org/docs/latest/)
- CEL official docs: [Common Expression Language](https://cel.dev/)
- NIST AI RMF: [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- OpenTelemetry docs: [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

