# Coding Conventions

**Analysis Date:** 2026-04-13

## Naming Patterns

**Files:**
- Route handlers use `route.ts` under App Router API directories (example: `src/app/api/v1/requests/route.ts`).
- Server utilities use kebab-case `.ts` files (examples: `src/server/request-decision.ts`, `src/server/agent-rate-limit.ts`).
- React component files use kebab-case `.tsx` even for exported PascalCase components (example: `src/app/(dashboard)/requests/new/new-request-form.tsx` exports `NewRequestForm`).
- Test files use `*.test.ts` in `tests/` for unit tests and `*.spec.ts` in `e2e/` for Playwright flows (examples: `tests/request-schemas.test.ts`, `e2e/governance-flow.spec.ts`).

**Functions:**
- Exported functions use camelCase and describe intent clearly (`createRequestAction` in `src/app/actions/requests.ts`, `sendTransactionalEmail` in `src/server/email/send-email.ts`).
- Internal helpers stay local and camelCase (`parseLimit`, `tooMany` in `src/app/api/v1/requests/route.ts`).
- Boolean-style helpers use `is*` / `has*` naming (`isProduction` in `src/lib/env.ts`).

**Variables:**
- Local variables use concise camelCase (`orgId`, `requesterId`, `fieldSchema` in `src/app/actions/requests.ts`).
- Constant configuration values are uppercase snake case (`WINDOW_MS` in `src/app/api/v1/requests/route.ts`).

**Types:**
- Type aliases and exported types use PascalCase (`FieldType`, `FieldSchemaJson`, `RequestTypeOption` in `src/lib/request-schemas.ts` and `src/app/(dashboard)/requests/new/new-request-form.tsx`).

## Code Style

**Formatting:**
- Tool used: ESLint with Next.js core + TypeScript presets from `eslint.config.mjs`.
- Key observed style: semicolons enabled, double quotes, trailing commas on multiline objects/arrays/functions (seen across `src/lib/env.ts`, `src/app/actions/requests.ts`, `e2e/governance-flow.spec.ts`).
- No dedicated Prettier config detected; rely on ESLint + editor formatting.

**Linting:**
- Tool used: `eslint` script in `package.json` with flat config in `eslint.config.mjs`.
- Config extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Ignore paths include `.next/**`, `out/**`, `build/**`, and `next-env.d.ts` in `eslint.config.mjs`.

## Import Organization

**Order:**
1. Framework/runtime imports first (`next/cache`, `drizzle-orm`, `zod` in `src/app/actions/requests.ts`).
2. Internal alias imports (`@/db`, `@/lib/*`, `@/server/*`) next.
3. Type-only imports are inlined with `type` keyword when needed (`type SimilarRequest` in `src/app/(dashboard)/requests/new/new-request-form.tsx`).

**Path Aliases:**
- Use `@/*` alias mapped in `tsconfig.json` (`"@/*": ["./src/*"]`).
- Prefer alias imports over deep relative paths for app code (examples in `src/app/api/v1/requests/route.ts` and tests like `tests/request-schemas.test.ts`).

## Error Handling

**Patterns:**
- API routes validate input with Zod and return structured JSON errors (`{ error, code, details? }`) via `Response.json` in `src/app/api/v1/requests/route.ts`.
- Server actions throw `Error` for invalid auth/ownership/state and return typed `{ ok: false }` for recoverable validation outcomes (`src/app/actions/requests.ts`).
- Domain errors are handled explicitly with `instanceof` checks before fallback throw (`PolicyDeniedError` handling in `src/app/api/v1/requests/route.ts` and `src/app/actions/requests.ts`).

## Logging

**Framework:** `console` APIs (`console.warn`, `console.info`) and no centralized logger detected.

**Patterns:**
- Configuration/runtime warnings use prefixed log messages (`[env]` in `src/lib/env.ts`, `[email]` in `src/server/email/send-email.ts`).
- External service failures log status + body snippet and return controlled result objects (`src/server/email/send-email.ts`).
- Use logs for degraded-mode behavior (missing optional integrations) instead of throwing (`src/server/email/send-email.ts`).

## Comments

**When to Comment:**
- Add short comments for security, production guardrails, and environment assumptions (examples in `src/lib/env.ts`, `playwright.config.ts`).
- Avoid narrative comments for straightforward mapping/query code; most business logic remains uncommented (`src/app/actions/requests.ts`).

**JSDoc/TSDoc:**
- JSDoc-style block comments appear on exported functions that encode environment/runtime contracts (`assertProductionEnv`, `getTrustedAuthOrigins` in `src/lib/env.ts`).
- Inline comments are used sparingly for nuanced coercion or fallback reasoning (`src/lib/request-schemas.ts`).

## Function Design

**Size:** No strict size guard detected; both compact helpers and large action/component functions coexist (for example `NewRequestForm` in `src/app/(dashboard)/requests/new/new-request-form.tsx` is large).

**Parameters:**
- Inputs are frequently object-shaped for readability and future extensibility (`sendTransactionalEmail(input)`, `createRequestAction(input)`).
- Boundary schemas validate function/action inputs immediately (`createRequestInputSchema`, `decideApprovalInputSchema` in `src/app/actions/requests.ts`).

**Return Values:**
- APIs return `Response` with status codes and typed JSON payloads (`src/app/api/v1/requests/route.ts`).
- Server actions return discriminated object results for UI handling (`{ ok: true, requestId }` vs `{ ok: false, error }` in `src/app/actions/requests.ts`).

## Module Design

**Exports:**
- Prefer named exports over default exports in app/server/lib modules (`src/lib/request-schemas.ts`, `src/app/actions/requests.ts`).
- Config files may use default export where framework expects it (`vitest.config.ts`, `playwright.config.ts`).

**Barrel Files:**
- Barrel-file usage is minimal; direct imports from concrete module paths are standard (`@/server/create-request`, `@/lib/session` in `src/app/actions/requests.ts`).

---

*Convention analysis: 2026-04-13*
