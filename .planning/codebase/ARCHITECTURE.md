# Architecture

**Analysis Date:** 2026-04-13

## Pattern Overview

**Overall:** Next.js App Router modular monolith (feature-oriented UI + service-layer domain modules + Postgres persistence).

**Key Characteristics:**
- Use `src/app` for route-driven UI, server actions, and HTTP endpoints.
- Use `src/server` as domain/service layer that encapsulates business workflows and integrations.
- Use `src/db` + Drizzle ORM as a shared persistence boundary consumed by both route handlers and server services.

## Layers

**Presentation Layer (App Router UI):**
- Purpose: Render authenticated dashboard/auth pages and bind user interactions.
- Location: `src/app/(dashboard)/**`, `src/app/sign-in/page.tsx`, `src/app/sign-up/page.tsx`, `src/app/page.tsx`.
- Contains: Server Components, route segment layouts, and client subcomponents.
- Depends on: `src/lib/session.ts`, `src/db/index.ts`, `src/server/org-catalog.ts`, `src/components/**`.
- Used by: Browser navigation and direct URL route requests.

**Mutation Layer (Server Actions):**
- Purpose: Handle authenticated user mutations from UI with cache revalidation.
- Location: `src/app/actions/requests.ts`, `src/app/actions/admin.ts`, `src/app/actions/change-tickets.ts`, `src/app/actions/ai-org.ts`.
- Contains: `"use server"` action functions, boundary validation, role checks, `revalidatePath` invalidation.
- Depends on: `src/lib/session.ts`, `src/lib/request-schemas.ts`, `src/server/**`, `src/db/index.ts`.
- Used by: Client forms/components under `src/app/(dashboard)/**`.

**API Layer (Route Handlers):**
- Purpose: Expose machine/client endpoints (auth, v1 API, webhooks, cron worker, admin export).
- Location: `src/app/api/**/route.ts`.
- Contains: Request parsing, auth/secret verification, input validation, HTTP response mapping.
- Depends on: `src/server/**`, `src/lib/**`, `src/db/index.ts`.
- Used by: External clients, platform webhooks, cron schedulers, and frontend calls.

**Domain Services Layer:**
- Purpose: Centralize cross-route workflows for request lifecycle, approvals, fulfillment, and auditing.
- Location: `src/server/create-request.ts`, `src/server/request-decision.ts`, `src/server/fulfillment-queue.ts`, `src/server/fulfillment.ts`, `src/server/webhooks.ts`, `src/server/policy-engine.ts`.
- Contains: Multi-step orchestration, transactional updates, side-effect dispatch (audit/webhooks/notifications).
- Depends on: `src/db/index.ts`, `src/db/schema.ts`, connector modules in `src/server/connectors/**`, helpers in `src/lib/**`.
- Used by: `src/app/actions/**` and `src/app/api/**/route.ts`.

**AI Service Layer:**
- Purpose: Resolve org AI credentials, enforce guards, and run AI-assisted workflows.
- Location: `src/server/ai/client.ts`, `src/server/ai/request-guard.ts`, `src/server/ai/triage.ts`, `src/server/ai/prompts.ts`.
- Contains: Model selection, request guarding/rate checks, prompt definitions, triage logic.
- Depends on: `src/db/index.ts`, provider SDKs configured by `src/lib/env.ts`.
- Used by: `src/app/api/ai/chat/route.ts`, `src/app/api/ai/admin-chat/route.ts`, `src/server/create-request.ts`.

**Persistence Layer:**
- Purpose: Define and access relational schema/entities.
- Location: `src/db/app-schema.ts`, `src/db/auth-schema.ts`, `src/db/schema.ts`, `src/db/index.ts`.
- Contains: Drizzle table models and shared `db` connection.
- Depends on: `drizzle-orm`, `pg`, environment variables via `DATABASE_URL`.
- Used by: `src/server/**`, selected Server Components in `src/app/(dashboard)/**`, some route handlers in `src/app/api/**`.

## Data Flow

**Request Submission (UI):**
1. UI page/form in `src/app/(dashboard)/requests/new/page.tsx` and `src/app/(dashboard)/requests/new/new-request-form.tsx` calls `createRequestAction` in `src/app/actions/requests.ts`.
2. Action validates payload using `src/lib/request-schemas.ts`, resolves session via `src/lib/session.ts`, then delegates to `createRequestCore` in `src/server/create-request.ts`.
3. Service applies policy (`src/server/policy-engine.ts`), resolves approvers (`src/server/approval-routing.ts`), inserts request row (`src/db/schema.ts`), emits audit (`src/server/audit.ts`), emits webhook (`src/server/webhooks.ts`), triggers notifications and async triage.

**Request Submission (External API):**
1. External client calls `POST` in `src/app/api/v1/requests/route.ts` with API key auth.
2. Route validates via Zod + schema helpers, authorizes key via `src/server/agent-auth.ts`, applies rate limit via `src/server/agent-rate-limit.ts`.
3. Route calls the same `createRequestCore` in `src/server/create-request.ts`, preserving shared lifecycle logic across UI and API entry points.

**Approval to Fulfillment:**
1. Approver action (`src/app/actions/requests.ts`) or email token route (`src/app/api/approvals/email/route.ts`) calls `applyRequestDecision` in `src/server/request-decision.ts`.
2. Decision service updates request status transactionally, writes approval/audit rows, and enqueues job through `enqueueFulfillmentJob` in `src/server/fulfillment-queue.ts`.
3. Job processor runs connector-selected provisioning via `src/server/fulfillment.ts` + `src/server/connectors/registry.ts`, then marks fulfilled or failed and emits webhook/audit side effects.

**Background Recovery/Drain:**
1. Scheduler calls `POST /api/internal/worker/fulfillment` in `src/app/api/internal/worker/fulfillment/route.ts` with `CRON_SECRET`.
2. Route invokes `processStaleFulfillmentJobs` (`src/server/fulfillment-queue.ts`) and `drainWebhookRetries` (`src/server/webhooks.ts`) plus nonce cleanup.
3. System recovers pending/failed stale jobs and webhook retries without coupling to interactive requests.

**State Management:**
- Server-first data loading in route components (`src/app/(dashboard)/requests/page.tsx` uses direct DB queries).
- Session/role state resolved server-side in `src/lib/session.ts`.
- Cache invalidation on mutations is explicit via `revalidatePath` in server actions and specific API routes.

## Key Abstractions

**Request Lifecycle Core:**
- Purpose: One shared contract for creating request records regardless of caller.
- Examples: `src/server/create-request.ts`, `src/app/actions/requests.ts`, `src/app/api/v1/requests/route.ts`, `src/app/api/v1/ingest/chat/route.ts`.
- Pattern: Entry points validate/authenticate, then delegate to `createRequestCore`.

**Decision Engine + Queue:**
- Purpose: Isolate approval transitions from fulfillment execution.
- Examples: `src/server/request-decision.ts`, `src/server/fulfillment-queue.ts`, `src/server/fulfillment.ts`.
- Pattern: Transactional decision write + queued idempotent processing.

**Connector Registry:**
- Purpose: Switch provisioning backend by environment.
- Examples: `src/server/connectors/registry.ts`, `src/server/connectors/http-webhook.ts`.
- Pattern: Runtime strategy selection (`stub`, `log`, `http_webhook`) through a typed connector interface.

**Auth Gateway:**
- Purpose: Centralize auth/session wiring.
- Examples: `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/api/auth/[...all]/route.ts`.
- Pattern: Better Auth adapter + helper guards (`requireSession`, `requireRole`) consumed by routes/actions/pages.

## Entry Points

**Web UI Entry:**
- Location: `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/page.tsx`.
- Triggers: Browser HTTP requests to App Router pages.
- Responsibilities: HTML shell, authenticated dashboard framing, navigation and child route composition.

**Server Actions Entry:**
- Location: `src/app/actions/*.ts`.
- Triggers: Form/action submissions from React components.
- Responsibilities: AuthZ + validation + domain service delegation + path revalidation.

**Public/Auth API Entry:**
- Location: `src/app/api/auth/[...all]/route.ts`, `src/app/api/v1/requests/route.ts`, `src/app/api/v1/request-types/route.ts`, `src/app/api/v1/ingest/chat/route.ts`.
- Triggers: Programmatic HTTP requests.
- Responsibilities: Token/session checks, schema checks, service invocation, JSON responses.

**Operational API Entry:**
- Location: `src/app/api/internal/worker/fulfillment/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/app/api/integrations/slack/interactions/route.ts`.
- Triggers: Cron systems and third-party webhook callbacks.
- Responsibilities: Secret/signature validation, operational workflow triggering, retry-safe handling.

## Error Handling

**Strategy:** Fail fast at boundary layers, throw domain errors in services, map known errors to API/action responses.

**Patterns:**
- API routes return explicit JSON error shapes and status codes (example in `src/app/api/v1/requests/route.ts`).
- Actions throw on authorization/invalid state and return typed failure objects for validation/policy failures (`src/app/actions/requests.ts`).
- Domain services throw for invalid transitions and rely on transactional guards (`src/server/request-decision.ts`).

## Cross-Cutting Concerns

**Logging:** Runtime logging via `console.error`/`console.info` in operational paths such as `src/server/webhooks.ts`, `src/app/api/internal/worker/fulfillment/route.ts`, and `src/app/api/stripe/webhook/route.ts`.

**Validation:** Zod and schema-driven payload validation in `src/app/actions/requests.ts`, `src/app/api/v1/requests/route.ts`, plus production env assertions in `src/instrumentation.ts` and `src/lib/env.ts`.

**Authentication:** Better Auth core in `src/lib/auth.ts` and route binding in `src/app/api/auth/[...all]/route.ts`; role/session enforcement in `src/lib/session.ts` and endpoint-specific token/secret checks in API routes.

---

*Architecture analysis: 2026-04-13*
