# Coding Conventions

**Analysis Date:** 2026-04-13

## Naming Patterns

**Files:**
- Use kebab-case for module files and route handlers (for example `src/server/change-ticket.ts`, `src/app/api/v1/requests/route.ts`, `src/lib/request-schemas.ts`).
- Use `page.tsx`, `layout.tsx`, and `route.ts` for Next.js App Router entries under `src/app/**`.
- Use `.test.ts` for unit/integration tests in `tests/` and `.spec.ts` for Playwright E2E in `e2e/`.

**Functions:**
- Use camelCase for functions and actions (`parseFieldSchema`, `assertAiRequestGuard`, `adminCreateRequestType`).
- Prefix guard/assertion functions with `assert` or `require` for invariant checks (`src/server/ai/request-guard.ts`, `src/app/actions/admin.ts`).

**Variables:**
- Use camelCase for local variables and `UPPER_SNAKE_CASE` for module constants (`MAX_AI_MESSAGES`, `WINDOW_MS`).
- Use descriptive env-derived variable names (`ipLimit`, `keyLimit`, `e2ePublicOrigin`).

**Types:**
- Use PascalCase for type aliases (`FieldDefinition`, `RequestTypeOption`) and union literals for constrained roles/states (`Role`, actorRole unions in `src/server/change-ticket.ts`).

## Code Style

**Formatting:**
- Primary formatter is implicit through TypeScript + ESLint style; no dedicated Prettier or Biome config detected.
- Use trailing commas and multiline object/array formatting in larger structures (`src/app/actions/admin.ts`, `next.config.ts`).
- Use semicolons consistently across TS/TSX files.

**Linting:**
- Use ESLint flat config from `eslint.config.mjs` with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Respect Next default ignores plus explicit ignore list in `eslint.config.mjs` (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`).
- Avoid broad lint suppressions; only targeted suppression observed is for dynamic Redis import in `src/server/agent-rate-limit.ts`.

## Import Organization

**Order:**
1. Node built-ins and framework imports first (`crypto`, `next/*`, `react`, `zod`).
2. Third-party package imports second (`drizzle-orm`, `@playwright/test`, `vitest`).
3. Internal alias imports last via `@/` paths (`@/lib/*`, `@/server/*`, `@/db/*`).

**Path Aliases:**
- Use `@/* -> ./src/*` from `tsconfig.json`.
- Prefer alias imports over deep relative paths in app and server code.

## Error Handling

**Patterns:**
- Validate input boundaries with Zod `safeParse` and return structured API errors (`src/app/api/v1/requests/route.ts`, `src/app/api/v1/ingest/chat/route.ts`).
- Return JSON errors with stable shape `{ error, code, details? }` for API endpoints.
- Throw `Error` for domain/service invariants in server modules (`src/server/change-ticket.ts`, `src/app/actions/admin.ts`).
- Use specific domain error classes when policy-level branching is needed (`PolicyDeniedError` handling in API routes).

## Logging

**Framework:** `console` (minimal usage observed)

**Patterns:**
- Prefer explicit warnings for non-fatal config fallbacks (`console.warn` in `src/lib/env.ts`).
- Default pattern is fail-fast via exceptions at boundary checks rather than verbose runtime logging.

## Comments

**When to Comment:**
- Add comments for non-obvious security, environment, or compatibility rationale (`next.config.ts`, `playwright.config.ts`, `src/server/agent-rate-limit.ts`).
- Use short section-divider comments in infrastructure-heavy modules (`src/server/agent-rate-limit.ts`).

**JSDoc/TSDoc:**
- Use short doc comments for exported behavior and production assumptions (`src/lib/env.ts`, `src/server/agent-rate-limit.ts`, `src/app/actions/admin.ts`).
- Avoid over-commenting self-explanatory CRUD/query code.

## Function Design

**Size:** Keep helpers small in `src/lib/*` and `src/server/*`; large admin action files can contain many cohesive exported actions (`src/app/actions/admin.ts`).

**Parameters:** Use typed object params for multi-argument service functions (`createChangeTicketRecord(input)`, `assertAiRequestGuard(input)`), and explicit inline object types when no shared type exists.

**Return Values:**
- API routes return `Response.json(...)` with explicit status codes.
- Server actions often return `{ ok: true as const }` for simple mutation acknowledgement.
- Service functions return primitives/records when needed (`Promise<string>` for new IDs).

## Module Design

**Exports:** Favor named exports and colocated helper functions; no default exports in sampled server/lib modules.

**Barrel Files:** Not a dominant pattern in core application code; import from concrete module paths (`@/lib/request-schemas`, `@/server/create-request`).

---

*Convention analysis: 2026-04-13*
