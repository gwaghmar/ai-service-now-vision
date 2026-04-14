# Technology Stack

**Analysis Date:** 2026-04-13

## Languages

**Primary:**
- TypeScript (strict) - Application and API code in `src/`, configuration in `*.ts`

**Secondary:**
- SQL - Generated/managed migrations in `drizzle/` and Postgres DDL via Drizzle
- PowerShell/JS scripts - Project automation in `scripts/`

## Runtime

**Environment:**
- Node.js 20+ required in `README.md`
- Node.js 22 used in CI at `.github/workflows/ci.yml`

**Package Manager:**
- npm (commands in `package.json` and install command in `vercel.json`)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.2.2 - Full-stack app router web framework (`package.json`, `src/app/`)
- React 19.2.4 - UI rendering (`package.json`)
- Better Auth 1.5.6 - Authentication/session layer (`src/lib/auth.ts`)
- Drizzle ORM 0.45.2 - Database access (`src/db/index.ts`)

**Testing:**
- Vitest 4.1.3 - Unit tests (`vitest.config.ts`, `tests/**/*.test.ts`)
- Playwright 1.59.1 - End-to-end tests (`playwright.config.ts`, `e2e/`)

**Build/Dev:**
- Turbopack (Next.js) - Dev/build acceleration in `next.config.ts`
- ESLint 9 + `eslint-config-next` - Linting in `eslint.config.mjs`
- Tailwind CSS 4 + PostCSS plugin - Styling pipeline in `postcss.config.mjs`
- Drizzle Kit 0.31.10 - Migration/push tooling in `drizzle.config.ts`
- TSX 4.21.0 - Script runner in `package.json` scripts

## Key Dependencies

**Critical:**
- `next` 16.2.2 - Application runtime and routing (`package.json`)
- `better-auth` 1.5.6 - Auth flows and provider integrations (`src/lib/auth.ts`)
- `drizzle-orm` 0.45.2 + `pg` 8.20.0 - Postgres persistence (`src/db/index.ts`)
- `zod` 4.3.6 - Runtime validation at API/action boundaries (for example `src/lib/env.ts`, `src/app/api/v1/requests/route.ts`)

**Infrastructure:**
- `stripe` 22.0.1 - Billing checkout/webhooks (`src/lib/stripe.ts`, `src/app/api/stripe/*`)
- `@ai-sdk/openai` + `ai` - LLM provider abstraction and inference (`src/server/ai/client.ts`, `src/app/api/ai/*`)
- `pdf-lib` 1.17.1 - Audit PDF generation (`src/server/audit-pdf.ts`)
- `dotenv` 17.4.0 - Local env loading for CLI/test tooling (`drizzle.config.ts`, `playwright.config.ts`)

## Configuration

**Environment:**
- Runtime configuration is environment-variable driven via `process.env` across `src/lib/env.ts`, `src/lib/auth.ts`, `src/server/ai/client.ts`, and route handlers under `src/app/api/`
- Production guardrails enforce required env and safe settings (`src/lib/env.ts`, `README.md`)

**Build:**
- Next.js config and security headers in `next.config.ts`
- TypeScript compiler and alias config in `tsconfig.json`
- Deployment build/install commands in `vercel.json`
- DB CLI configuration in `drizzle.config.ts`
- Lint and style configs in `eslint.config.mjs` and `postcss.config.mjs`

## Platform Requirements

**Development:**
- Node.js 20+ and npm (`README.md`)
- PostgreSQL required via `DATABASE_URL` (`src/db/index.ts`, `README.md`)
- Optional Supabase CLI/local stack config in `supabase/config.toml`

**Production:**
- Deploy target is Vercel Next.js runtime (`vercel.json`)
- Requires managed Postgres and environment configuration for auth, connectors, and integrations (`README.md`, `src/lib/env.ts`)

---

*Stack analysis: 2026-04-13*
