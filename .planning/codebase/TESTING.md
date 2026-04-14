# Testing Patterns

**Analysis Date:** 2026-04-13

## Test Framework

**Runner:**
- Unit: Vitest `^4.1.3` from `package.json`
- E2E: Playwright `^1.59.1` from `package.json`
- Config: `vitest.config.ts`, `playwright.config.ts`

**Assertion Library:**
- Vitest `expect` for unit tests (`tests/request-schemas.test.ts`, `tests/ai-request-guard.test.ts`).
- Playwright `expect` for UI/HTTP assertions (`e2e/governance-flow.spec.ts`, `e2e/api-security.spec.ts`).

**Run Commands:**
```bash
npm run test               # Run unit then e2e suites
npm run test:unit          # Run Vitest once
npm run test:e2e           # Run Playwright suite
npm run test:e2e:ui        # Open Playwright UI mode
```

## Test File Organization

**Location:**
- Unit tests live in top-level `tests/` (`vitest.config.ts` includes `tests/**/*.test.ts`).
- E2E tests live in top-level `e2e/` (`playwright.config.ts` sets `testDir: "e2e"`).

**Naming:**
- Unit tests: `*.test.ts` (examples: `tests/agent-rate-limit.test.ts`, `tests/slack-signature.test.ts`).
- E2E tests: `*.spec.ts` (examples: `e2e/sign-in-flow.spec.ts`, `e2e/authz-routes.spec.ts`).

**Structure:**
```
tests/
  *.test.ts
e2e/
  *.spec.ts
  helpers/*.ts
  global-setup.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";
import { parseFieldSchema } from "@/lib/request-schemas";

describe("parseFieldSchema", () => {
  it("accepts a valid catalog schema", () => {
    const parsed = parseFieldSchema({ fields: [{ key: "reason", label: "Reason", type: "textarea", required: true }] });
    expect(parsed.fields[0].key).toBe("reason");
  });
});
```

**Patterns:**
- Unit tests use `describe` + `it` blocks with direct functional assertions (`tests/request-schemas.test.ts`).
- Async failure paths use `await expect(fn).rejects.toThrow(...)` (`tests/ai-request-guard.test.ts`).
- E2E suites use `test.describe` with one business-flow scenario per test (`e2e/governance-flow.spec.ts`, `e2e/sign-in-flow.spec.ts`).
- Environment-dependent tests are gated with `test.skip(...)` checks (`e2e/api-security.spec.ts`, `e2e/admin-smoke.spec.ts`).

## Mocking

**Framework:** Vitest `vi` helpers.

**Patterns:**
```typescript
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("rejects expired token", async () => {
  vi.stubEnv("APPROVAL_EMAIL_SECRET", "x".repeat(32));
  const { createEmailApprovalToken, verifyEmailApprovalToken } =
    await import("@/lib/approval-email-token");
  const token = createEmailApprovalToken({ requestId: "req-1", approverUserId: "u1", action: "approve", ttlSec: -10 })!;
  expect(verifyEmailApprovalToken(token).ok).toBe(false);
});
```

**What to Mock:**
- Environment variables and module reload boundaries for configuration logic (`tests/env-trusted-origins.test.ts`, `tests/approval-email-token.test.ts`).
- No heavy service mocking layer is currently used; tests prefer local pure/function-level assertions.

**What NOT to Mock:**
- End-to-end auth/request workflows use real browser interactions and real DB-backed flows instead of UI-level mocks (`e2e/governance-flow.spec.ts`, `e2e/sign-in-flow.spec.ts`).

## Fixtures and Factories

**Test Data:**
```typescript
const ts = Date.now();
const approverEmail = `e2e-approver-${ts}@example.com`;
const requesterEmail = `e2e-requester-${ts}@example.com`;
const password = "e2e-secure-pass-123456!";
```

**Location:**
- Inline builders are used in test files themselves (`e2e/governance-flow.spec.ts`, `e2e/admin-smoke.spec.ts`).
- Shared E2E helpers are small utility modules in `e2e/helpers/` (`e2e/helpers/pg.ts`, `e2e/helpers/select-option.ts`).
- Database prep for E2E runs through `e2e/global-setup.ts`.

## Coverage

**Requirements:** No enforced coverage threshold detected (no coverage command in `package.json`, no explicit threshold config in `vitest.config.ts`).

**View Coverage:**
```bash
npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- Focus on pure validation/security utility behavior (`tests/request-schemas.test.ts`, `tests/safe-url.test.ts`, `tests/slack-signature.test.ts`, `tests/agent-rate-limit.test.ts`).

**Integration Tests:**
- Limited integration coverage exists through e2e DB seeding and full-stack flows (`e2e/global-setup.ts`, `e2e/governance-flow.spec.ts`).
- Dedicated service/API integration tests outside Playwright are not detected.

**E2E Tests:**
- Playwright covers sign-up/sign-in, authz pathing, governance flow, and API security checks (`e2e/sign-in-flow.spec.ts`, `e2e/authz-routes.spec.ts`, `e2e/api-security.spec.ts`).

## Common Patterns

**Async Testing:**
```typescript
await expect(() =>
  assertAiRequestGuard({ req, organizationId: "org-2", userId: "user-2", messages }),
).rejects.toThrow("Too many messages");
```

**Error Testing:**
```typescript
const parsed = bodySchema.safeParse(json);
expect(parsed.success).toBe(false);
```

## Testing Gaps

**Route handler unit coverage gap:**
- Not covered directly by unit tests: `src/app/api/v1/requests/route.ts`, `src/app/api/v1/ingest/chat/route.ts`, `src/app/api/stripe/webhook/route.ts`.
- Risk: input validation and status-code regressions are primarily caught only in E2E.
- Add focused request/response handler tests with mocked request bodies and auth context.

**Server actions coverage gap:**
- Not covered by unit tests: `src/app/actions/requests.ts`, `src/app/actions/change-tickets.ts`, `src/app/actions/admin.ts`.
- Risk: role checks and action return-shape regressions can escape before E2E.
- Add action-level tests with mocked session/db boundary functions.

**Component behavior gap:**
- No detected component test files under `src/components/` or `src/app/` (`Glob` returned none for `src/components/**/*.test.*` and `src/app/**/*.test.*`).
- Risk: form accessibility, pending states, and client validation behavior in `src/app/(dashboard)/requests/new/new-request-form.tsx` are unverified outside full E2E.
- Add React Testing Library tests for critical forms and approval UI components.

**E2E reliability gap from skip-heavy gating:**
- Many specs skip when env vars are absent (`e2e/api-security.spec.ts`, `e2e/change-ticket-flow.spec.ts`, `e2e/governance-flow.spec.ts`).
- Risk: CI/local misconfiguration can produce false confidence with silently skipped security paths.
- Add CI-required env validation step before test run and fail fast when required vars are missing.

---

*Testing analysis: 2026-04-13*
