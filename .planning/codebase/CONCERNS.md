# Codebase Concerns

**Analysis Date:** 2026-04-13

## Tech Debt

**Redis rate-limit adapter lifecycle misuse (high priority):**
- Issue: The Redis branch closes the connection before reading TTL, then calls `quit` again. This causes the over-limit path to throw and silently fall back to process-local memory logic.
- Files: `src/server/agent-rate-limit.ts`
- Impact: In multi-instance deployments, clients can exceed intended API limits because fallback buckets are not shared across instances; throttling behavior becomes inconsistent.
- Fix approach: Keep one Redis client per process (or pooled singleton), remove duplicate `quit` calls, read TTL before close, and on Redis failure return an explicit degraded-mode signal instead of silently switching algorithms.

**Slack slash command tenant mapping is hardcoded to first org (high priority):**
- Issue: The handler parses `team_id` but does not use it, and selects the first organization row with `.limit(1)`.
- Files: `src/app/api/slack/slash/route.ts`
- Impact: In multi-tenant environments, slash command requests can route users to the wrong organization's catalog data.
- Fix approach: Persist Slack workspace/team mapping per organization and query by `team_id`; reject unknown teams with explicit error text.

**Approval authorization has permissive default (high priority):**
- Issue: `isApproverAllowedForRequest` returns `true` when both routing approvers and assigned approver are absent.
- Files: `src/server/approval-routing.ts`, `src/server/request-decision.ts`, `src/app/(dashboard)/requests/[id]/page.tsx`, `src/app/actions/ai-approver-summary.ts`
- Impact: Any user with approver role in org can approve/view decision surfaces for requests that have incomplete routing assignment state.
- Fix approach: Fail closed for approver role when routing data is missing, except where explicit admin override is intended; add migration/repair for legacy records without routing fields.

## Known Bugs

**429 path may not use Redis TTL on capped requests:**
- Symptoms: Over-limit requests can still pass unexpectedly under distributed load.
- Files: `src/server/agent-rate-limit.ts`, `src/app/api/v1/requests/route.ts`
- Trigger: Redis enabled (`REDIS_URL` present) and a client exceeds configured window limits.
- Workaround: Use single-instance deployment or external gateway-level rate limiting until Redis path is corrected.

**Slash command org resolution ignores Slack workspace identifier:**
- Symptoms: `/request` returns request types from whichever org is first in DB query order.
- Files: `src/app/api/slack/slash/route.ts`
- Trigger: More than one organization exists in the database.
- Workaround: Restrict deployment to single-org mode, or disable slash endpoint until workspace mapping exists.

## Security Considerations

**Policy engine can be forced fail-open in production:**
- Risk: Setting `POLICY_ENGINE_FAIL_MODE=open` allows requests through when policy service is unavailable or malformed.
- Files: `src/server/policy-engine.ts`
- Current mitigation: Production defaults to fail-closed when mode is unset.
- Recommendations: Enforce fail-closed in production regardless of override, or gate fail-open behind explicit maintenance flag with short TTL and audit event.

**Webhook failure text is rethrown with upstream body excerpt:**
- Risk: Connector error payloads may contain sensitive diagnostics that are persisted/logged if bubbled to user-visible channels.
- Files: `src/server/connectors/http-webhook.ts`
- Current mitigation: Response body is truncated to 200 chars.
- Recommendations: Replace body echo with sanitized error code and store raw response only in restricted internal logs.

## Performance Bottlenecks

**Repeated full-type query in slash command request flow:**
- Problem: Handler performs a bounded type query and then a second unbounded type query to compute `matched`.
- Files: `src/app/api/slack/slash/route.ts`
- Cause: Duplicate query path and local filtering strategy.
- Improvement path: Run a single filtered query (slug exact + indexed title search fallback), cap result set, and reuse loaded data.

## Fragile Areas

**Request approval rules rely on optional columns that may be null:**
- Files: `src/server/approval-routing.ts`, `src/server/request-decision.ts`, `src/db/app-schema.ts`
- Why fragile: Authorization behavior changes based on nullable routing fields; null state currently broadens permissions.
- Safe modification: Change authorization helper first, add tests, then migrate existing records to explicit routing/assignment invariants.
- Test coverage: No direct tests detected for `resolveApproverUserIds` or `isApproverAllowedForRequest`.

## Scaling Limits

**In-memory limiter fallback does not scale horizontally:**
- Current capacity: Consistent only within one process instance.
- Limit: Multiple app instances maintain independent bucket maps and cannot coordinate limits.
- Scaling path: Require Redis in production and fail initialization when distributed mode is active without shared limiter backend.

## Dependencies at Risk

**Dynamic `ioredis` import with `as any` weakens static guarantees:**
- Risk: Runtime-only failures are hidden from TypeScript and can be swallowed by broad catch.
- Impact: Rate-limit enforcement degrades silently to memory mode.
- Migration plan: Use typed import boundary with explicit error classification and health metric emission.

## Missing Critical Features

**No first-class Slack workspace to organization binding model:**
- Problem: Slack command path lacks tenant identity resolution based on request metadata.
- Blocks: Safe multi-tenant Slack command rollout.

## Test Coverage Gaps

**Policy engine error-mode behavior untested:**
- What's not tested: Production fail-closed vs override fail-open behavior, network timeout and malformed response handling.
- Files: `src/server/policy-engine.ts`
- Risk: Regression can silently weaken policy enforcement.
- Priority: High

**Slack slash route authorization and tenant isolation untested:**
- What's not tested: `team_id` mapping behavior, request-type matching flow, and multi-org safety constraints.
- Files: `src/app/api/slack/slash/route.ts`
- Risk: Cross-tenant data leakage and incorrect workflow links.
- Priority: High

**Approval-routing authorization fallback untested:**
- What's not tested: Empty `routingApproverIds` + null `assignedApproverId` decision path.
- Files: `src/server/approval-routing.ts`, `src/server/request-decision.ts`
- Risk: Unauthorized approvals could pass unnoticed.
- Priority: High

---

*Concerns audit: 2026-04-13*
