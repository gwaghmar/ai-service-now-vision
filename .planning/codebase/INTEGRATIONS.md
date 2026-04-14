# External Integrations

**Analysis Date:** 2026-04-13

## APIs & External Services

**AI Inference:**
- OpenAI-compatible API provider (BYOK per org + optional platform fallback) - powers chat/triage flows.
  - SDK/Client: `@ai-sdk/openai`, `ai` in `src/server/ai/client.ts`.
  - Auth: `APP_AI_PLATFORM_API_KEY` (fallback) and encrypted per-org key in DB (`organizationAiSettings` read in `src/server/ai/client.ts`).
  - Endpoint override: `APP_AI_PLATFORM_BASE_URL` and per-org `baseUrl`.

**Billing:**
- Stripe - subscription checkout, billing portal, webhook synchronization.
  - SDK/Client: `stripe` in `src/lib/stripe.ts`.
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plus price ids in `.env.example`.
  - Touchpoints: `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/portal/route.ts`, `src/app/api/stripe/webhook/route.ts`.

**Email Delivery:**
- Resend HTTP API - transactional outbound email.
  - SDK/Client: direct `fetch` to `https://api.resend.com/emails` in `src/server/email/send-email.ts`.
  - Auth: `RESEND_API_KEY`, sender `EMAIL_FROM`.

**ChatOps:**
- Slack signed requests - slash commands + interaction endpoint.
  - SDK/Client: custom signature verification using HMAC in `src/app/api/slack/slash/route.ts` and `src/lib/slack-signature.ts`.
  - Auth: `SLACK_SIGNING_SECRET`.
  - Touchpoints: `src/app/api/slack/slash/route.ts`, `src/app/api/integrations/slack/interactions/route.ts`.

**Policy Decisioning:**
- External policy engine over HTTP (OPA/OpenFGA-style adapter contract).
  - SDK/Client: direct `fetch` in `src/server/policy-engine.ts`.
  - Auth: none implemented in request headers; endpoint configured by `POLICY_ENGINE_URL`.

**Provisioning/Automation:**
- Outbound HTTP webhook connector for fulfillment.
  - SDK/Client: direct `fetch` in `src/server/connectors/http-webhook.ts`.
  - Auth: optional `PROVISION_WEBHOOK_BEARER`.

## Data Storage

**Databases:**
- PostgreSQL (Supabase cloud recommended; local Postgres/Supabase supported).
  - Connection: `DATABASE_URL`.
  - Client: `drizzle-orm` + `pg` in `src/db/index.ts`.
  - Migration toolchain: `drizzle-kit` configured in `drizzle.config.ts`.

**File Storage:**
- Local filesystem only for app code/docs; no app-level object storage client integration detected in `src/**`.
- Supabase local dev config enables storage service in `supabase/config.toml`, but runtime app code does not call Supabase Storage APIs.

**Caching:**
- Optional Redis rate limiting path via `ioredis` dynamic import in `src/server/agent-rate-limit.ts`.
  - Connection: `REDIS_URL`.
  - Fallback: in-memory fixed-window buckets when Redis is absent.

## Authentication & Identity

**Auth Provider:**
- Better Auth with Drizzle adapter (`better-auth`, `better-auth/adapters/drizzle`) in `src/lib/auth.ts`.
  - Implementation: session auth + email/password + optional social OAuth providers (Google/GitHub/Microsoft env-gated) exposed via `src/app/api/auth/[...all]/route.ts`.
  - Identity store: Postgres tables from `src/db/schema.ts`.

## Monitoring & Observability

**Error Tracking:**
- Dedicated SaaS error tracker not detected in `package.json` or `src/**`.

**Logs:**
- Application logging via `console.info`, `console.warn`, and `console.error` in server modules such as `src/server/webhooks.ts`, `src/server/policy-engine.ts`, and `src/server/email/send-email.ts`.

## CI/CD & Deployment

**Hosting:**
- Vercel targeted deployment (`vercel.json` with Next.js framework).

**CI Pipeline:**
- GitHub Actions in `.github/workflows/ci.yml`.
  - Includes Postgres service container, `npm ci`, lint/build/unit tests, Drizzle push/seed, and Playwright E2E.

## Environment Configuration

**Required env vars:**
- Core runtime: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (enforced by `src/lib/env.ts`).
- Tenant bootstrap: `DEFAULT_ORGANIZATION_ID` or `DEFAULT_ORGANIZATION_SLUG` (`src/lib/env.ts`, `src/lib/auth.ts`).
- Integration toggles/secrets: `STRIPE_*`, `RESEND_API_KEY`, `SLACK_SIGNING_SECRET`, `POLICY_ENGINE_URL`, `PROVISION_*`, `CRON_SECRET`, `CHAT_INGEST_SECRET`, `CHAT_INGEST_ORG_ID`, `APP_AI_PLATFORM_*`, `FIELD_ENCRYPTION_KEY` (documented in `.env.example` and used across `src/**`).

**Secrets location:**
- Local env files `.env.local` / `.env` loaded by tooling (`drizzle.config.ts`, `playwright.config.ts`).
- Runtime environment variables in deployment platform (production checks in `src/instrumentation.ts` and `src/lib/env.ts`).
- Org-level AI keys and webhook signing secrets are persisted in database tables and decrypted through `src/lib/field-encryption.ts` consumers (`src/server/ai/client.ts`, `src/server/webhooks.ts`).

## Webhooks & Callbacks

**Incoming:**
- Stripe webhook endpoint `POST /api/stripe/webhook` in `src/app/api/stripe/webhook/route.ts`.
- Internal worker trigger `POST /api/internal/worker/fulfillment` in `src/app/api/internal/worker/fulfillment/route.ts` (Bearer `CRON_SECRET`).
- Slack ingress endpoints in `src/app/api/slack/slash/route.ts` and `src/app/api/integrations/slack/interactions/route.ts`.
- Agent/chat ingress endpoint `POST /api/v1/ingest/chat` in `src/app/api/v1/ingest/chat/route.ts`.

**Outgoing:**
- Resend API POST in `src/server/email/send-email.ts`.
- Policy engine POST in `src/server/policy-engine.ts`.
- Provisioning webhook POST in `src/server/connectors/http-webhook.ts`.
- Organization webhook deliveries (request/provision events) in `src/server/webhooks.ts`.

---

*Integration audit: 2026-04-13*
