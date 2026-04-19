# Fallbacks and Manual Operations

The defining characteristic of an enterprise lifecycle application is accepting that the world is messy. 

## The "No Integration Available" Fallback
If an app requires provisioning (e.g. a small ad-hoc bespoke supplier tracking dashboard without SCIM nor an API), the platform:
1. Validates policy and runs standard Approval tracking.
2. Enqueues a `MANUAL_TASK` in the execution runner.
3. Re-routes a specifically formatted ticket containing EXACT instructions synthesized from the vendor knowledge base to the designated Platform Admin / SaaS Manager.
4. Holds the platform-level state in `PROVISIONING_PENDING` until the human manually verifies execution.

## SLA Operations
For tasks pushed to human action, the system runs SLA watchers. If a Manual Onboarding task is ignored by IT for more than 48 hours, it escalates to ensure new hires aren't stalled out.

## Why this is critical
Many next-gen startups claim full AI magic automation but fail catastrophically the first time they hit a legacy vendor or a tool requiring someone to actively check boxes inside an admin UI. By standardizing manual flow as a primary, heavily-audited system entity, you prevent the "ghost system" problem where IT continues to use external ticketing apps because your tool lacks universal support. 

## Browser / RPA Fallback considerations
Because RPA (Puppeteer/Playwright scripts executing browser clicks inside legacy Admin panels) is notoriously brittle, it is treated as a highly experimental fallback to be phased *after* strict SCIM/API validation structures. If an RPA script fails on DOM changes, it natively degenerates instantly to `MANUAL_TASK`.
