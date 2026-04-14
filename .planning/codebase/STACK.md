# Technology Stack

**Analysis Date:** 2026-04-13

## Languages

**Primary:**
- TypeScript (strict mode) - app, API routes, server logic, DB layer in `src/**/*.ts` and `src/**/*.tsx` with strict compiler settings in `tsconfig.json`.

**Secondary:**
- SQL (generated migrations) - schema evolution under `drizzle/` with config in `drizzle.config.ts`.
- JavaScript (tooling scripts) - Node scripts such as `scripts/ensure-env.mjs`.

## Runtime

**Environment:**
- Node.js 20+ for local development per `README.md`; CI runs Node 22 in `.github/workflows/ci.yml`.
- Next.js Node runtime explicitly used in API handlers such as `src/app/api/auth/[...all]/route.ts` and `src/app/api/stripe/webhook/route.ts`.

**Package Manager:**
- npm (scripts and lockfile usage from `package.json` and `package-lock.json`).
- Lockfile: present (`package-lock.json`).

## Frameworks

**Core:**
- Next.js `16.2.2` (`package.json`) - full-stack React framework with App Router in `src/app/**`.
- React `19.2.4` and React DOM `19.2.4` (`package.json`) - UI layer for pages/components in `src/app/**` and `src/components/**`.
- Better Auth `1.5.6` (`package.json`) - auth/session system configured in `src/lib/auth.ts` and exposed via `src/app/api/auth/[...all]/route.ts`.
- Drizzle ORM `0.45.2` + `pg` `8.20.0` (`package.json`) - Postgres access via `src/db/index.ts` and schema in `src/db/schema.ts`.
- Zod `4.3.6` (`package.json`) - runtime env validation in `src/lib/env.ts`.

**Testing:**
- Vitest `4.1.3` (`package.json`) - unit tests configured in `vitest.config.ts`.
- Playwright `1.59.1` (`package.json`) - E2E tests configured in `playwright.config.ts`.

**Build/Dev:**
- Turbopack dev path configured in `next.config.ts`.
- Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`) in `package.json`.
- ESLint 9 + `eslint-config-next` in `eslint.config.mjs`.
- Drizzle Kit `0.31.10` for schema generation/migration (`package.json`, `drizzle.config.ts`).
- TSX `4.21.0` for script execution (`package.json` scripts like `db:seed`).

## Key Dependencies

**Critical:**
- `next`, `react`, `react-dom` - application shell and routing (`src/app/layout.tsx`, `src/app/page.tsx`).
- `better-auth` + `better-auth/adapters/drizzle` - auth and user lifecycle hooks (`src/lib/auth.ts`).
- `drizzle-orm` + `pg` - transactional data and multi-tenant storage (`src/db/index.ts`, `src/db/schema.ts`).
- `ai`, `@ai-sdk/openai`, `@ai-sdk/react` - LLM integration path (`src/server/ai/client.ts`, `src/app/api/ai/chat/route.ts`).
- `stripe` - billing checkout and webhooks (`src/lib/stripe.ts`, `src/app/api/stripe/*`).
- `pdf-lib` - audit PDF export (`src/server/audit-pdf.ts`, `src/app/api/admin/audit-pdf/route.ts`).

**Infrastructure:**
- `dotenv` for local env loading in tooling (`drizzle.config.ts`, `playwright.config.ts`).
- Supabase CLI usage via npm scripts (`package.json`) with local config in `supabase/config.toml`.

## Configuration

**Environment:**
- Base environment contract is documented in `.env.example`.
- Production safety validation is enforced at server startup by `src/instrumentation.ts` calling `assertProductionEnv()` from `src/lib/env.ts`.
- Strongly required vars include `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and default org settings (`src/lib/env.ts`).

**Build:**
- Next.js runtime/security headers: `next.config.ts`.
- TypeScript compiler and alias `@/*`: `tsconfig.json`.
- Lint policy: `eslint.config.mjs`.
- Hosting command defaults for Vercel: `vercel.json`.

## Platform Requirements

**Development:**
- Node.js 20+ and PostgreSQL (Supabase cloud/local supported) from `README.md`.
- Optional Docker only for local Supabase stack (`supabase/config.toml`, scripts in `package.json`).

**Production:**
- Deploy target is Vercel (project config in `vercel.json`, docs in `README.md`).
- Postgres-compatible managed DB required (Supabase-first guidance in `README.md`, `supabase/README.md`).

---

*Stack analysis: 2026-04-13*
