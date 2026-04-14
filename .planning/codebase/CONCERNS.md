# Codebase Concerns

**Analysis Date:** 2026-04-13

## Tech Debt

**Monolithic admin server-actions module (P1):**
- Issue: `src/app/actions/admin.ts` centralizes unrelated domains (users, request types, routing, API keys, webhooks, change templates) in a single 600+ LOC file, increasing change-collision risk and review complexity.
- Files: `src/app/actions/admin.ts`
- Impact: Higher regression probability during admin updates, slower onboarding, and brittle merge behavior when multiple features touch admin logic.
- Fix approach: Split into domain-focused action modules (for example `admin-users`, `admin-catalog`, `admin-routing`, `admin-integrations`) with shared validation/utilities extracted to `src/lib`.

**Overloaded schema file (P2):**
- Issue: `src/db/app-schema.ts` defines many bounded contexts and relationship maps in one 600+ LOC artifact.
- Files: `src/db/app-schema.ts`, `src/db/schema.ts`
- Impact: Migration and schema-review changes are difficult to reason about; accidental cross-domain edits become more likely.
- Fix approach: Partition table definitions by domain (requests, approvals, billing, integrations, onboarding) and keep index/relations close to each domain file.

## Known Bugs

**Redis rate-limit path can degrade to in-memory unexpectedly (P0):**
- Symptoms: Rate limiting may silently fall back to in-memory mode even when `REDIS_URL` is configured.
- Files: `src/server/agent-rate-limit.ts`
- Trigger: `rateLimitRedis()` calls `redis.quit()` before `redis.ttl()`, then attempts `ttl` on a closed client and catches errors, returning in-memory fallback.
- Workaround: Keep single-instance deployment if relying on fallback behavior; otherwise treat current Redis mode as unreliable until fixed.

**Slack workspace-to-org mapping is effectively hardcoded to first org (P0 for multi-tenant):**
- Symptoms: Slash command responses can pull request types for the wrong organization in multi-tenant deployments.
- Files: `src/app/api/slack/slash/route.ts`
- Trigger: Handler parses `team_id` but does not use it; it selects the first organization row (`limit(1)`).
- Workaround: Restrict Slack slash endpoint usage to single-organization deployments only.

## Security Considerations

**Database TLS verification disabled for Supabase hosts (P0):**
- Risk: Man-in-the-middle risk on DB connections because certificate validation is disabled.
- Files: `src/db/index.ts`
- Current mitigation: Production env guard in `src/lib/env.ts` blocks `sslmode=no-verify` in `DATABASE_URL`, but this does not cover the explicit `rejectUnauthorized: false` override.
- Recommendations: Use verified TLS (`sslmode=require`/`verify-full`) and remove permissive `ssl.rejectUnauthorized: false`.

**Health endpoint leaks internal error details (P1):**
- Risk: Internal DB errors and provider-specific codes are returned to any caller.
- Files: `src/app/api/internal/healthz/route.ts`
- Current mitigation: None in route-level authorization.
- Recommendations: Require a bearer secret or restrict to internal network, and return generic public errors while logging details server-side.

**Shared-secret ingest endpoint lacks request signing and replay protection (P1):**
- Risk: Any leaked `X-Chat-Ingest-Secret` allows request creation until manual rotation.
- Files: `src/app/api/v1/ingest/chat/route.ts`
- Current mitigation: Header secret check + IP rate limiting.
- Recommendations: Add HMAC signature with timestamp/nonce (Slack-style), reject stale timestamps, and rotate secrets per integration source.

## Performance Bottlenecks

**Webhook matching queries fetch more than needed (P2):**
- Problem: Slash command path queries request types twice and does in-memory matching for specific type text.
- Files: `src/app/api/slack/slash/route.ts`
- Cause: One broad query (`limit(20)` then another full org query) instead of direct slug/title-filtered SQL.
- Improvement path: Push matching into SQL with indexed filters and avoid duplicate reads.

**Heavy server action module inflates hot-path invalidation work (P2):**
- Problem: Many actions in `src/app/actions/admin.ts` trigger repeated `revalidatePath` calls across shared paths.
- Files: `src/app/actions/admin.ts`
- Cause: Centralized mutation handler pattern and broad revalidation strategy.
- Improvement path: Narrow cache invalidation scope per action and separate independent action modules for lower invalidation blast radius.

## Fragile Areas

**Asynchronous lifecycle side-effects are not transactionally coupled (P1):**
- Files: `src/server/fulfillment.ts`, `src/server/fulfillment-queue.ts`, `src/server/webhooks.ts`
- Why fragile: `deliverOrgWebhook()` is intentionally fire-and-forget in several paths, and status/audit updates can diverge when downstream failures happen mid-flow.
- Safe modification: Introduce idempotency keys + outbox semantics for lifecycle transitions so retries are deterministic.
- Test coverage: No unit tests currently target this end-to-end fulfillment/webhook interplay.

**Fallback behavior hides infrastructure failure (P1):**
- Files: `src/server/agent-rate-limit.ts`, `src/app/api/v1/requests/route.ts`, `src/app/api/v1/ingest/chat/route.ts`
- Why fragile: Catch-all fallback to in-memory limiter masks Redis outage/logic faults and changes effective enforcement in distributed deployments.
- Safe modification: Emit explicit telemetry and hard-fail (or controlled degraded mode) for production when Redis is configured but unavailable.
- Test coverage: Existing tests include `tests/agent-rate-limit.test.ts`, but no test currently exercises Redis client lifecycle path with `ttl` retrieval.

## Scaling Limits

**Single-worker assumptions in queue drains (P1):**
- Current capacity: Worker route processes fixed batch sizes (`100` fulfillment jobs, `50` webhook retries) per invocation.
- Limit: Backlogs can grow during spikes; bounded loops and cron cadence may not keep up.
- Scaling path: Add adaptive batch sizing, queue depth metrics, and horizontally safe work-claiming visibility dashboards.

**In-memory rate limiting does not scale horizontally (P1):**
- Current capacity: Works predictably only per-process.
- Limit: Multi-instance deployments see per-node quota fragmentation and inconsistent enforcement when Redis path fails.
- Scaling path: Make Redis mandatory in production and expose health checks that fail when distributed limiter is unavailable.

## Dependencies at Risk

**Dynamic optional `ioredis` import without explicit dependency contract (P1):**
- Risk: Redis path can silently break at runtime if `ioredis` resolution differs across environments.
- Impact: Rate limiting behavior downgrades to local-memory fallback with weaker guarantees.
- Migration plan: Add explicit dependency/runtime checks at startup, and fail-fast in production when `REDIS_URL` is set but Redis adapter cannot initialize.

## Missing Critical Features

**No explicit idempotency store for incoming payment webhooks (P1):**
- Problem: Endpoint handles Stripe events but does not persist processed event IDs.
- Blocks: Strict exactly-once processing guarantees for future side effects beyond idempotent field updates.
- Files: `src/app/api/stripe/webhook/route.ts`, `src/db/app-schema.ts`

**No tenant mapping model for Slack workspace integration (P0 for SaaS):**
- Problem: `team_id` is parsed but ignored; no data model links Slack workspace to org.
- Blocks: Safe multi-tenant Slack rollout.
- Files: `src/app/api/slack/slash/route.ts`, `src/db/app-schema.ts`

## Test Coverage Gaps

**Internal worker + retry orchestration untested (High):**
- What's not tested: `processStaleFulfillmentJobs`, `drainWebhookRetries`, and `/api/internal/worker/fulfillment` integration behavior.
- Files: `src/server/fulfillment-queue.ts`, `src/server/webhooks.ts`, `src/app/api/internal/worker/fulfillment/route.ts`
- Risk: Retry regressions can accumulate silent backlog or duplicate side-effects.
- Priority: High

**Operational/security routes have weak automated coverage (High):**
- What's not tested: `/api/slack/slash` multi-tenant mapping behavior and `/api/internal/healthz` response hardening.
- Files: `src/app/api/slack/slash/route.ts`, `src/app/api/internal/healthz/route.ts`
- Risk: Tenant data leakage and information disclosure may ship unnoticed.
- Priority: High

**Redis-backed rate-limit behavior not verified (Medium):**
- What's not tested: End-to-end Redis path in limiter including connection lifecycle and TTL-based retry semantics.
- Files: `src/server/agent-rate-limit.ts`, `tests/agent-rate-limit.test.ts`
- Risk: Production limiter drift between test and deployed behavior.
- Priority: Medium

---

*Concerns audit: 2026-04-13*
