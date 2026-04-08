---
name: think-first-and-validate
description: Use for product/UX/feature prompts—reason from real-world practice, validate assumptions, then implement. Trigger when the user asks for behavioral changes, catalog structure, workflows, or says to think first / use common sense / validate online.
---

# Think first, validate, then build

## When this applies

The user expects decisions that would hold up for **real teams and real IT/service operations**, not only technically possible output.

## Before writing code

1. **Restate the intent** in one sentence (what success looks like for a human using the system).
2. **Sketch options** (even briefly): at least two ways to meet the intent and tradeoffs (scope, data model, UX friction, maintainability).
3. **Ground in practice**: Prefer patterns that match **service catalog / ITSM / security / healthcare ops** norms when relevant. Use **web search** for current best-practice language and structure when the user asks for validation or when you are unsure.
4. **Choose deliberately**: Pick the approach that balances clarity for the user, operational realism, and minimal unnecessary complexity.
5. **Implement** only what the choice requires; document non-obvious mapping (e.g. slug → category) in code comments.

## When the user says “think first” or “use your brain”

Do steps 1–4 **before** editing files. If research contradicts the literal prompt, **follow what makes sense in context** and explain the choice briefly in the PR/summary.

## Project-specific note

Catalog **categories** for this repo live in `src/lib/catalog-categories.ts` (slug-based mapping). New seeded or admin-created types without a mapping appear under **Other services** until explicitly categorized.
