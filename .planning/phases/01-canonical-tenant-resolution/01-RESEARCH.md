# Phase 1: Canonical Tenant Resolution - Research

**Researched:** 2026-04-14  
**Domain:** Multi-channel org identity resolution (UI, API, Slack, webhooks/ingest) with fail-closed semantics  
**Confidence:** HIGH (codebase-verified); MEDIUM for external Slack product edge cases without live Slack verification

## Summary

Phase 1 must ensure **every inbound path resolves to exactly one `organization.id`** before reading or mutating request-domain data, and **rejects** unknown or ambiguous tenant context with explicit HTTP/JSON errors (TNTY-02). The brownfield codebase already implements **strong tenant binding** for API-key flows (`resolveAgentApiKey` → `organizationId`) and for dashboard flows (`user.organizationId` via Better Auth session). The **documented high-risk gap** is Slack: `team_id` is parsed from the slash payload but **ignored**, and the handler selects an arbitrary org via `.limit(1)` [VERIFIED: `src/app/api/slack/slash/route.ts`]. Chat ingest uses a **single env-scoped org** (`CHAT_INGEST_ORG_ID`), which is explicit but not a channel-native resolver [VERIFIED: `src/app/api/v1/ingest/chat/route.ts`].

**Primary recommendation:** Introduce a **single canonical resolver** (shared module + DB invariant) used by Slack slash (and future Slack actions), tighten chat-ingest semantics (document or replace env-only org with a verified mapping), and add **automated tests** at unit + DB integration + selective E2E gates so regressions on tenant resolution are caught before merge.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TNTY-01 | Every request is resolved to exactly one organization across UI, API, Slack, and webhook channels. | Central resolver + per-channel wiring; fix Slack `.limit(1)`; align ingest/worker/stripe paths with explicit org keys |
| TNTY-02 | Unknown or ambiguous tenant resolution fails closed with explicit error responses. | Discriminated error types + consistent JSON `{ error, code }` / appropriate HTTP status; no silent fallbacks |
| TNTY-04 | Slack/ChatOps actions map to the correct organization workspace before any request data is read or mutated. | Persist `team_id` → `organization_id` mapping; reject unmapped teams before catalog/query |
</phase_requirements>

> **Phase CONTEXT:** No `*-CONTEXT.md` in `.planning/phases/01-canonical-tenant-resolution/` (`has_context: false` from GSD init). Advisory alignment: `.planning/STATE.md` prioritizes tenant isolation and fail-closed governance before automation depth.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.2 (lockfile); **latest npm** 16.2.3 [VERIFIED: npm registry] | App Router API routes for all channels | Project baseline; incremental patch available |
| `drizzle-orm` | ^0.45.2; **latest npm** 0.45.2 [VERIFIED: npm registry] | Org mapping tables, indexes, queries | Already the persistence layer |
| `pg` | ^8.20.0 | Postgres driver | Drizzle adapter |
| `better-auth` | ^1.5.6; **latest npm** 1.6.2 [VERIFIED: npm registry] | Session + user records with `organizationId` | Existing auth; Phase 1 should not swap auth |
| `zod` | ^4.3.6; **latest npm** 4.3.6 [VERIFIED: npm registry] | Boundary validation for payloads and config | Used across API routes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.x (per `package.json` / CI) | Unit tests for resolver logic | Pure functions + mocked DB |
| `@playwright/test` | 1.59.x | E2E for UI session org | Flows that prove dashboard org scoping |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New auth vendor | Keep Better Auth | Rewriting auth delays Phase 1; org is already on `user.organizationId` |
| Redis for tenant cache | Postgres-first lookup | Simpler consistency; add cache later if hot path proven |

**Installation:** No new packages required for core tenant resolution; optional: none unless planner adds testing utilities.

**Version verification:** Ran `npm view <package> version` on 2026-04-14 for `drizzle-orm`, `better-auth`, `zod`, `next` — see table.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── server/
│   ├── create-request.ts       # already accepts explicit organizationId
│   ├── agent-auth.ts           # API key → organizationId (good pattern)
│   └── tenant-resolution.ts    # NEW: canonical resolvers + error types (suggested name)
├── lib/
│   └── session.ts              # session guards (extend only if org resolution needs helpers)
└── app/api/
    ├── slack/slash/route.ts    # MUST call resolver before DB reads
    └── v1/ingest/chat/route.ts # MUST use resolver or documented single-tenant contract
```

### Pattern 1: Explicit `organizationId` at domain boundary

**What:** All `createRequestCore`, `findRequestTypeBySlug`, and list queries take `organizationId` from a resolver or session field — never inferred from unbounded queries.  
**When to use:** Every entry point.  
**Example (existing API path):**

```typescript
// Source: [VERIFIED: codebase] src/app/api/v1/requests/route.ts
const ctx = await resolveAgentApiKey(authHeader);
if (!ctx) {
  return Response.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
}
const type = await findRequestTypeBySlug(
  ctx.organizationId,
  parsed.data.requestTypeSlug,
);
```

### Pattern 2: Fail-closed Slack org resolution

**What:** After signature verification, map `team_id` → at most one org row; if zero or multiple matches, return **401/403/404 with explicit message** and **do not** query `request_type`.  
**When to use:** Before any `requestType` or `organization` read in `src/app/api/slack/slash/route.ts`.  
**Example (target shape):**

```typescript
// Source: [ASSUMED] proposed pattern — align with project error JSON style
const resolved = await resolveOrgForSlackTeamId(teamId);
if (!resolved.ok) {
  return Response.json(
    { error: resolved.message, code: resolved.code },
    { status: resolved.status },
  );
}
const org = resolved.organization;
```

### Anti-Patterns to Avoid

- **First-row org selection:** `db.select().from(organization).limit(1)` for tenant context — **cross-tenant data exposure** [VERIFIED: `src/app/api/slack/slash/route.ts`].
- **Silent default org** when mapping is missing — violates TNTY-02; prefer explicit error.
- **Reusing `webhookSigningSecret` column for Slack team metadata** — conflates secrets with identity; use a dedicated column or table [ASSUMED: data modeling hygiene].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slack request authenticity | Custom crypto | Existing HMAC verification in route + `@/lib/slack-signature` | Timing-safe compare already present |
| SQL string building for org scope | Raw SQL | Drizzle `eq(…organizationId, …)` | Parameterized, typed |
| Tenant discovery via env only in prod multi-tenant | `CHAT_INGEST_ORG_ID` as sole story | Resolver + stored mapping or documented single-tenant mode | Env-only cannot distinguish workspaces |

**Key insight:** The gap is **data model + resolver**, not crypto. Slack signature verification is already correct; **identity mapping** is missing.

## Runtime State Inventory

> Phase 1 introduces **new** stored bindings (e.g. Slack `team_id`). Existing deployments need migration + optional backfill — separate from pure code edits.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | No `slack_team_id` (or equivalent) on `organization` today [VERIFIED: `src/db/app-schema.ts` organization table] | Migration: add nullable/unique column or child table; backfill for known workspaces |
| Live service config | Slack App installed per workspace; `team_id` sent on each request [ASSUMED: Slack platform behavior] | Register mapping in DB when org onboards Slack |
| OS-registered state | None for tenant resolution | None — verified N/A |
| Secrets/env vars | `SLACK_SIGNING_SECRET` verifies Slack app, not tenant [VERIFIED: INTEGRATIONS.md] | Keep; add mapping data separately |
| Build artifacts | None | None |

**Nothing found:** OS-level and build-artifact categories — **None — N/A for this phase type.**

## Common Pitfalls

### Pitfall 1: Ambiguous org for Slack team

**What goes wrong:** Multiple org rows match the same `team_id`, or migration allows duplicates.  
**Why it happens:** Missing **unique** constraint at DB level.  
**How to avoid:** `UNIQUE` index on `slack_team_id` (or composite uniqueness if design uses junction table).  
**Warning signs:** Intermittent wrong catalog in Slack after seed/import.

### Pitfall 2: “Fail-closed” that still leaks existence

**What goes wrong:** Error messages reveal whether a team_id exists in another tenant’s mapping.  
**Why it happens:** Over-specific errors across tenants.  
**How to avoid:** Generic client message + structured `code` for operators; log details server-side only.  
**Warning signs:** User reports infer other orgs’ Slack connection state.

### Pitfall 3: UI session without `organizationId`

**What goes wrong:** `sessionOrgId` throws `"User is not assigned to an organization."` — acceptable fail-closed, but UX may be unclear.  
**Why it happens:** `user.organizationId` nullable in schema [VERIFIED: `src/db/auth-schema.ts`].  
**How to avoid:** Ensure signup/provisioning always sets org; surface friendly error in UI if null.  
**Warning signs:** 500s or raw errors on create request.

## Code Examples

### Existing: Session-scoped org for dashboard actions

```typescript
// Source: [VERIFIED: codebase] src/app/actions/requests.ts
function sessionOrgId(session: {
  user: { organizationId?: string | null };
}) {
  const oid = session.user.organizationId;
  if (!oid) throw new Error("User is not assigned to an organization.");
  return oid;
}
```

### Existing: API key → org

```typescript
// Source: [VERIFIED: codebase] src/server/agent-auth.ts
return { organizationId: row.organizationId, apiKeyId: row.id };
```

### Defect: Slack ignores `team_id` for org selection

```47:54:src/app/api/slack/slash/route.ts
  const teamId = params.get("team_id") ?? "";

  // Look up the org by Slack team ID stored in webhookSigningSecret metadata
  // (for now match on any active org — single-org deployments)
  const [org] = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .limit(1);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-org Slack stub | Workspace-id → org mapping + unique constraints | TBD (Phase 1) | Safe multi-tenant Slack |
| Env-only chat ingest org | Resolver or explicit single-tenant contract | TBD | Clearer failure modes |

**Deprecated/outdated:** Comment in slash route referencing “webhookSigningSecret metadata” for team id — **not implemented in schema** [VERIFIED: mismatch between comment and code].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | One Slack `team_id` maps to at most one org for this product | Architecture | Wrong cardinality breaks UNIQUE strategy |
| A2 | `team_id` in slash payload is stable per Slack workspace | Standard Stack | Resolver keys wrong if Slack changes semantics |
| A3 | Phase 1 does not require multi-org per user session in UI | Summary | Would need org switcher — likely Phase 2+ |

**If this table is empty:** N/A — see table above for `[ASSUMED]` items.

## Open Questions (RESOLVED for Phase 1)

1. **Chat ingest:** Phase 1 implements verified single-org ingest via `resolveChatIngestOrgId()` (env id must exist in `organization`). Multi-workspace ingest is **deferred** beyond Phase 1.

2. **Stripe:** No Phase 1 code change; existing `metadata.organizationId` usage remains. Not required for TNTY-01/02/04 closure in this phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Drizzle mappings | ✓ typical dev | per `DATABASE_URL` | Local docker / Supabase |
| Slack workspace | Manual mapping tests | [ASSUMED] optional | — | Mock `team_id` in integration tests |
| Redis | Rate limits only | optional | `REDIS_URL` | In-memory fallback (existing behavior) |

**Missing dependencies with no fallback:** None for core resolver implementation (code + Postgres only).

**Missing dependencies with fallback:** Real Slack workspace — use HMAC test vectors or stubbed requests in CI [ASSUMED].

## Validation Architecture

> Nyquist / `workflow.nyquist_validation` is **enabled** in `.planning/config.json` (`nyquist_validation: true`). This section feeds VALIDATION.md-style gates.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest.config.ts`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test` (unit + e2e per `package.json`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TNTY-01 | API key resolves to single org | unit/integration | `npm run test:unit` | Add `tests/tenant-resolution.test.ts` ❌ Wave 0 |
| TNTY-02 | Unknown Slack team → error, no catalog query | integration | `npm run test:unit` with DB test module | ❌ Wave 0 |
| TNTY-04 | Mapped `team_id` returns correct org | integration | `npm run test:unit` | ❌ Wave 0 |
| TNTY-01 (UI) | Session user creates request only in own org | e2e | `npm run test:e2e` | Extend `e2e/*.spec.ts` ❌ optional |

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/tenant-resolution.test.ts` (or similar) — covers TNTY-01/02/04 resolver behavior
- [ ] DB test fixtures for multi-org + Slack mapping rows — shared helper or seed slice
- [ ] Optional: E2E for dashboard request create still scoped to session org (existing flow may already cover; confirm coverage)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Partial | API keys hashed; Better Auth sessions [VERIFIED: agent-auth, session] |
| V3 Session Management | Yes | Server-side session via Better Auth |
| V4 Access Control | **Yes** | **Org-scoped queries** — Phase 1 core |
| V5 Input Validation | Yes | Zod on JSON bodies; Slack `team_id` validated against DB mapping |
| V6 Cryptography | Partial | Slack HMAC + timing-safe compare [VERIFIED: slash route] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data read via Slack | Information disclosure | Map `team_id` → org; unique index; fail closed |
| Forged API requests without org context | Spoofing | `resolveAgentApiKey` rejection [VERIFIED] |
| Confused deputy on ingest | Elevation | Secret header + explicit org resolver |

## Sources

### Primary (HIGH confidence)

- Codebase files cited inline (`src/app/api/slack/slash/route.ts`, `src/server/agent-auth.ts`, `src/app/actions/requests.ts`, `src/db/app-schema.ts`, `src/db/auth-schema.ts`, `src/app/api/v1/requests/route.ts`, `src/app/api/v1/ingest/chat/route.ts`, `src/app/api/stripe/webhook/route.ts`)
- npm registry: `npm view` versions on 2026-04-14

### Secondary (MEDIUM confidence)

- `.planning/codebase/CONCERNS.md` — aligns with slash route audit

### Tertiary (LOW confidence)

- Slack platform behavioral details not exercised in CI — mark `[ASSUMED]` where used

## Project Constraints (from .cursor/rules/)

No rule files were found under `.cursor/rules/` in this workspace (glob returned empty). Follow repo `AGENTS.md` / `CONVENTIONS.md` patterns: Zod at API boundaries, `@/*` imports, kebab-case server files, explicit JSON errors for APIs.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — lockfile + npm registry
- Architecture: **HIGH** — direct code inspection
- Pitfalls: **MEDIUM-HIGH** — Slack production edge cases need validation testing

**Research date:** 2026-04-14  
**Valid until:** ~2026-05-14 (stable stack); sooner if major Next/Drizzle major bumps

## RESEARCH COMPLETE
