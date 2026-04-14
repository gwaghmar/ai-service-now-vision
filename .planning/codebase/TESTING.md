# Testing Patterns

**Analysis Date:** 2026-04-13

## Test Framework

**Runner:**
- Unit/integration: Vitest `^4.1.3` configured in `vitest.config.ts`.
- E2E/API/browser: Playwright `^1.59.1` configured in `playwright.config.ts`.
- Config files: `vitest.config.ts`, `playwright.config.ts`, CI workflow `.github/workflows/ci.yml`.

**Assertion Library:**
- Use Vitest built-in `expect` for unit/integration tests (`tests/*.test.ts`).
- Use Playwright `expect` for E2E assertions (`e2e/*.spec.ts`).

**Run Commands:**
```bash
npm run test              # Run unit then e2e
npm run test:unit         # Run Vitest once
npm run test:e2e          # Run Playwright suite
```

## Test File Organization

**Location:**
- Place unit/integration tests under `tests/` with `*.test.ts`.
- Place end-to-end tests under `e2e/` with `*.spec.ts`.
- Keep E2E helpers under `e2e/helpers/` (`e2e/helpers/pg.ts`, `e2e/helpers/select-option.ts`).

**Naming:**
- Name tests by behavior or boundary (`tests/ai-request-guard.test.ts`, `tests/safe-url.test.ts`, `e2e/api-security.spec.ts`).

**Structure:**
```
tests/*.test.ts           # Pure TS boundary and utility tests
e2e/*.spec.ts             # Browser + HTTP route flow tests
e2e/helpers/*.ts          # DB/UI helper utilities for E2E
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";

describe("assertAiRequestGuard", () => {
  it("rejects oversized request bodies", async () => {
    await expect(() => assertAiRequestGuard(input)).rejects.toThrow();
  });
});
```

**Patterns:**
- Use `describe` blocks per function/module and focused `it` titles per rule (`tests/request-schemas.test.ts`, `tests/slack-signature.test.ts`).
- Use direct constructor-based fixtures in test bodies (`new Request(...)`, inline objects) instead of large fixture files.
- Prefer exact status/code assertions for API behavior (`e2e/api-security.spec.ts`, `e2e/api-v1-unauthorized.spec.ts`).

## Mocking

**Framework:** No dedicated mocking framework pattern detected (no `vi.mock`/`jest.mock` usage in `tests/`).

**Patterns:**
```typescript
const req = new Request("http://x", {
  headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
});
expect(getClientIp(req)).toBe("1.2.3.4");
```

**What to Mock:**
- Prefer lightweight, deterministic in-memory inputs (`Request`, payload objects, cryptographic helper inputs).
- In E2E, mutate DB state through explicit helpers (`setUserRole` in `e2e/helpers/pg.ts`) instead of module mocking.

**What NOT to Mock:**
- Do not mock route responses in E2E; use real HTTP requests via Playwright `request` fixture.
- Do not mock UI behavior in browser flows; interact through semantic selectors (`getByRole`, `getByLabel`).

## Fixtures and Factories

**Test Data:**
```typescript
const ts = Date.now();
const email = `signin-${ts}@example.com`;
const password = "signin-test-pass-ok-99!";
```

**Location:**
- Most fixtures are inline per test file.
- Reusable browser/DB helpers are in `e2e/helpers/`.

## Coverage

**Requirements:** No explicit coverage threshold or coverage command detected in `package.json`, `vitest.config.ts`, or CI.

**View Coverage:**
```bash
Not configured (no coverage script currently defined)
```

## Test Types

**Unit Tests:**
- Cover schema validation, URL safety, env-origin logic, token/signature helpers, and rate-limit guard behavior in `tests/*.test.ts`.
- Typical style is deterministic single-module behavior checks with explicit happy/negative cases.

**Integration Tests:**
- Limited integration behavior appears in unit suite where modules touch request parsing/rate-limiter flow, but no dedicated multi-service integration test directory is defined.

**E2E Tests:**
- Playwright validates auth, governance workflows, role-gated actions, API unauthorized paths, and change-ticket lifecycle (`e2e/sign-in-flow.spec.ts`, `e2e/governance-flow.spec.ts`, `e2e/change-ticket-flow.spec.ts`, `e2e/authz-routes.spec.ts`).
- E2E is single-worker and non-parallel by config (`playwright.config.ts`) to reduce shared-state flakiness.

## Common Patterns

**Async Testing:**
```typescript
await expect(() =>
  assertAiRequestGuard({ req, organizationId: "org-1", userId: "user-1", messages })
).rejects.toThrow("Too many messages");
```

**Error Testing:**
```typescript
const res = await request.post("/api/internal/worker/fulfillment");
expect(res.status()).toBe(401);
const body = await res.json();
expect(body.code).toBe("unauthorized");
```

## Current Testing Posture and Gaps

- Current posture is strong on API boundary validation and core workflow smoke coverage (`tests/`, `e2e/`, `.github/workflows/ci.yml`).
- E2E execution depends on env/database and uses `test.skip(...)` guards, so some security paths only run when optional secrets are configured (`e2e/api-security.spec.ts`).
- No explicit coverage reporting/threshold means regressions in untested paths can pass CI undetected.
- Minimal mocking strategy keeps tests realistic, but increases reliance on DB availability for flow tests.
- No dedicated component-level UI tests were detected for complex client forms such as `src/app/(dashboard)/requests/new/new-request-form.tsx`; regressions are mainly caught via E2E.

---

*Testing analysis: 2026-04-13*
