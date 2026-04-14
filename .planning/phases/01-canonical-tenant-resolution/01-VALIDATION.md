---
phase: 1
slug: canonical-tenant-resolution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution (canonical tenant resolution).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + Playwright 1.59.x |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~2–15 minutes (local; e2e varies) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 600 seconds (CI upper bound; tune per machine)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | TNTY-01 | T-1-01 | Single org per resolved channel context | unit | `npm run test:unit` | ⬜ Wave 0 | ⬜ pending |
| TBD | 01 | 1 | TNTY-02 | T-1-02 | Unknown/ambiguous tenant → fail-closed error | unit/integration | `npm run test:unit` | ⬜ Wave 0 | ⬜ pending |
| TBD | 02 | 2 | TNTY-04 | T-1-04 | Slack `team_id` maps before DB reads | integration | `npm run test:unit` | ⬜ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/tenant-resolution.test.ts` (or equivalent) — resolver + fail-closed cases for TNTY-01/02/04
- [ ] DB fixtures or seed slice for multi-org + Slack mapping rows (if integration tests added)
- [ ] Existing `npm run lint` + `npm run build` remain green after schema changes

*Planner will bind exact task IDs to this table in PLAN.md.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Slack workspace HMAC + live `team_id` | TNTY-04 | Requires Slack app + signing secret in a real workspace | Use Slack developer sandbox or staging workspace; send slash command; confirm org-scoped catalog |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency acceptable for CI
- [ ] `nyquist_compliant: true` set in frontmatter when complete

**Approval:** pending
