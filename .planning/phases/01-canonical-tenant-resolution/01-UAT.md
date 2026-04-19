---
status: deferred
phase: 01-canonical-tenant-resolution
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md]
started: 2026-04-16T00:00:00Z
updated: 2026-04-16T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 6
name: (all deferred — user will verify at end)
awaiting: n/a

## Tests

### 1. Unit Test Suite Passes
expected: Running `npm test` completes with 29/29 tests passing, including 9 tests in `tests/tenant-resolution.test.ts`.
result: skipped
reason: user deferred all UAT to end

### 2. Admin UI — Slack Team ID Field Visible
expected: |
  Visiting `/admin/integrations` shows a "Slack Integration" section with a text input for Slack Team ID.
result: skipped
reason: user deferred all UAT to end

### 3. Admin UI — Save Slack Team ID
expected: Enter a Slack Team ID and submit — shows inline success, persists on reload.
result: skipped
reason: user deferred all UAT to end

### 4. Admin UI — Clear Slack Team ID
expected: Clear the field and submit — shows inline success, field empty on reload.
result: skipped
reason: user deferred all UAT to end

### 5. Slack Slash Route — Rejects Unknown Team ID
expected: POST to `/api/slack/slash` with unknown team_id returns HTTP 403 (fail-closed).
result: skipped
reason: user deferred all UAT to end

### 6. Chat Ingest Route — Rejects when CHAT_INGEST_ORG_ID Unresolvable
expected: POST to `/api/v1/ingest/chat` with bad/missing CHAT_INGEST_ORG_ID returns structured JSON error (not 500).
result: skipped
reason: user deferred all UAT to end

## Summary

total: 6
passed: 0
issues: 0
pending: 0
skipped: 6

## Gaps

[none yet]
