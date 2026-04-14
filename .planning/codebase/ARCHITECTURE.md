# Architecture

**Analysis Date:** 2026-04-13

## Pattern Overview

**Overall:** Layered Next.js App Router monolith with domain service modules and Postgres-backed workflow processing.

**Key Characteristics:**
- Use `src/app` for UI routes, server actions, and HTTP APIs; keep route-level orchestration at this boundary.
- Use `src/server` for domain logic (requests, approvals, fulfillment, webhooks, change control), not page components.
- Use `src/db` + Drizzle as the persistence boundary; all writes and workflow state transitions pass through typed schema access.

## Layers

**Presentation and Route Layer:**
- Purpose: Render UI and expose route handlers.
- Location: `src/app`
- Contains: App Router pages/layouts, route handlers under `src/app/api`, server actions under `src/app/actions`
- Depends on: `src/lib/*` and `src/server/*`
- Used by: Browser clients, API clients, worker cron callers

**Application Action Layer:**
- Purpose: Validate inbound action payloads, enforce session/role checks, call domain services, trigger revalidation.
- Location: `src/app/actions/requests.ts`, `src/app/actions/admin.ts`, `src/app/actions/change-tickets.ts`
- Contains: Zod validation, authorization checks, cache revalidation rules
- Depends on: `src/lib/session.ts`, `src/server/*`, `src/db/*`
- Used by: Server components and client components invoking server actions

**API Interface Layer:**
- Purpose: Provide machine-facing endpoints for auth, API ingest, integrations, and background worker hooks.
- Location: `src/app/api/**/route.ts`
- Contains: HTTP auth parsing, request/response normalization, rate limiting, schema validation
- Depends on: `src/lib/*`, `src/server/*`
- Used by: Agent clients (`/api/v1/requests`), Better Auth handler, Stripe/Slack integrations, cron workers

**Domain Service Layer:**
- Purpose: Implement request lifecycle, approval routing, fulfillment queueing, policy checks, notifications, and audit events.
- Location: `src/server`
- Contains: Workflow modules like `src/server/create-request.ts`, `src/server/request-decision.ts`, `src/server/fulfillment-queue.ts`, `src/server/webhooks.ts`
- Depends on: `src/db`, shared helpers in `src/lib`
- Used by: Server actions and API routes

**Infrastructure/Shared Utility Layer:**
- Purpose: Centralize environment parsing, auth/session wrappers, encryption helpers, schema parsing, and SDK clients.
- Location: `src/lib`
- Contains: `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/env.ts`, `src/lib/request-schemas.ts`, `src/lib/field-encryption.ts`
- Depends on: Runtime env and external packages
- Used by: `src/app` and `src/server`

**Persistence Layer:**
- Purpose: Define and access relational state for auth + app workflows.
- Location: `src/db`
- Contains: `src/db/app-schema.ts`, `src/db/auth-schema.ts`, pool setup in `src/db/index.ts`
- Depends on: Drizzle + `pg`
- Used by: All domain services and selected route/action handlers

## Data Flow

**Request Submission and Triage Flow:**

1. UI or API boundary validates payload (`src/app/actions/requests.ts` or `src/app/api/v1/requests/route.ts`).
2. Boundary resolves org/user context and delegates to `createRequestCore` in `src/server/create-request.ts`.
3. Service evaluates policy (`src/server/policy-engine.ts`), resolves approvers (`src/server/approval-routing.ts`), writes request + audit (`src/server/audit.ts`), emits notifications/webhooks (`src/server/notifications/request-created.ts`, `src/server/webhooks.ts`), then launches async triage (`src/server/ai/triage.ts`).

**Approval to Fulfillment Flow:**

1. Approver action invokes `applyRequestDecision` in `src/server/request-decision.ts`.
2. Decision updates request status and inserts approval + audit atomically in DB transaction.
3. On approve, enqueue fulfillment job via `src/server/fulfillment-queue.ts`, then process connector using `src/server/fulfillment.ts` and `src/server/connectors/registry.ts`.

**Background Reliability Flow:**

1. Worker endpoint `src/app/api/internal/worker/fulfillment/route.ts` authenticates cron caller.
2. Worker drains stale fulfillment jobs (`processStaleFulfillmentJobs`) and webhook retries (`drainWebhookRetries`).
3. Worker also performs nonce TTL cleanup against `approvalEmailNonce` table.

**State Management:**
- Use database-first workflow state for all critical transitions (`request`, `approval`, `fulfillmentJob`, `webhookDelivery` in `src/db/app-schema.ts`).
- Use Next.js cache revalidation (`revalidatePath`) for UI freshness after server actions.
- Use in-memory rate limiting for API ingress in `src/server/agent-rate-limit.ts` as a per-instance control.

## Key Abstractions

**Request Lifecycle Core:**
- Purpose: Single composition root for request creation side effects.
- Examples: `src/server/create-request.ts`, `src/server/request-decision.ts`
- Pattern: Orchestrator service that coordinates policy, routing, persistence, audit, and async side effects.

**Durable Outbox-like Delivery:**
- Purpose: Ensure fulfillment/webhook work survives process crashes and retries safely.
- Examples: `src/server/fulfillment-queue.ts`, `src/server/webhooks.ts`
- Pattern: Persist-then-attempt with retry metadata (`attempts`, `maxAttempts`, `nextRetryAt`) in DB.

**Connector Boundary:**
- Purpose: Isolate provisioning implementation from core lifecycle logic.
- Examples: `src/server/connectors/registry.ts`, `src/server/connectors/http-webhook.ts`, `src/server/connectors/types.ts`
- Pattern: Runtime-selected strategy implementing a shared `ProvisionConnector` interface.

**Auth and Session Boundary:**
- Purpose: Keep auth provider internals separate from app authorization checks.
- Examples: `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/api/auth/[...all]/route.ts`
- Pattern: Better Auth integration wrapped by helper functions `getSession`, `requireSession`, `requireRole`.

## Entry Points

**Web App Entry Point:**
- Location: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(dashboard)/layout.tsx`
- Triggers: Browser navigation in Next.js App Router
- Responsibilities: Global shell, auth-gated dashboard layout, UI composition

**Server Action Entry Points:**
- Location: `src/app/actions/requests.ts`, `src/app/actions/admin.ts`, `src/app/actions/change-tickets.ts`
- Triggers: Form submissions / client action calls
- Responsibilities: Validate payload, authorize caller, call domain services, revalidate cache

**Public/Partner API Entry Points:**
- Location: `src/app/api/v1/requests/route.ts`, `src/app/api/v1/requests/list/route.ts`, `src/app/api/v1/request-types/route.ts`
- Triggers: External HTTP calls with API keys
- Responsibilities: Rate-limit/authenticate, validate, delegate to domain services, return stable JSON errors

**Internal Worker Entry Point:**
- Location: `src/app/api/internal/worker/fulfillment/route.ts`
- Triggers: Scheduler via `Authorization: Bearer <CRON_SECRET>`
- Responsibilities: Drain queue/retries and perform TTL cleanup

## Error Handling

**Strategy:** Fail fast on missing critical configuration and invalid domain transitions; return structured HTTP errors at API boundaries.

**Patterns:**
- Throw domain errors in services/actions for invalid state transitions (`src/server/request-decision.ts`, `src/app/actions/*`).
- Return JSON `{ error, code, details? }` at API routes (`src/app/api/v1/requests/route.ts`).
- Use guarded side-effects (`Promise.allSettled`, best-effort webhooks) for worker/async reliability in `src/app/api/internal/worker/fulfillment/route.ts`.

## Cross-Cutting Concerns

**Logging:** Use `console` for operational visibility in connectors/worker/webhook retries (`src/server/connectors/registry.ts`, `src/server/webhooks.ts`, `src/app/api/internal/worker/fulfillment/route.ts`).
**Validation:** Use Zod at action and API boundaries (`src/app/actions/*.ts`, `src/app/api/v1/requests/route.ts`) plus schema-based payload validation (`src/lib/request-schemas.ts`).
**Authentication:** Use Better Auth for user sessions (`src/lib/auth.ts`, `src/lib/session.ts`) and API-key auth for machine APIs (`src/server/agent-auth.ts`).

---

*Architecture analysis: 2026-04-13*
