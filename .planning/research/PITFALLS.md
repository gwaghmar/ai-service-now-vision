# Domain Pitfalls

**Domain:** ServiceNow-style AI-native operations platform for AI agents and AI companies  
**Researched:** 2026-04-14

## Critical Pitfalls

Mistakes that create security exposure, trust loss, or expensive rewrites.

### Pitfall 1: Tenant Identity Drift Across Channels
**What goes wrong:** API, dashboard, Slack, and webhook flows do not resolve tenant identity the same way, causing cross-tenant data exposure or wrong-org actions.  
**Why it happens:** Brownfield products often inherit per-channel identity shortcuts, then add AI/agent endpoints faster than tenancy contracts are hardened.  
**Consequences:** Cross-tenant leakage, unauthorized approvals/fulfillment, compliance incidents, enterprise trust collapse.  
**Warning signs:**
- Tenant resolution logic differs by entrypoint (UI vs API vs Slack)
- Fallbacks like "first org" or "best effort" resolution
- Authorization depends on nullable routing fields
**Prevention:**
- Define one canonical tenant resolution contract and enforce it at all entrypoints
- Fail closed for ambiguous tenant context
- Add contract tests for cross-channel tenant invariants
- Require explicit workspace/team-to-org mapping before enabling Slack automation
**Detection:**
- Audit logs show mixed tenant IDs for same actor/session
- Multi-org tests intermittently pass/fail by DB ordering

### Pitfall 2: Fail-Open Governance in High-Risk Paths
**What goes wrong:** Policy or approval checks degrade to permissive behavior under timeout, null state, or integration failure.  
**Why it happens:** Teams optimize for workflow continuity and support load, then quietly permit actions when controls fail.  
**Consequences:** Unauthorized change execution, policy bypass, weak audit defensibility.  
**Warning signs:**
- Config switches allowing open mode in production
- Authorization helpers that return true on missing routing data
- "Temporary" bypasses without expiry/audit markers
**Prevention:**
- Enforce fail-closed behavior for production policy, approval, and entitlement checks
- Add emergency override with short TTL, explicit actor, and mandatory audit event
- Introduce policy decision reason codes and denial telemetry
**Detection:**
- Spike in successful actions during dependency incidents
- Approvals succeeding with incomplete approver assignment state

### Pitfall 3: Excessive Agent Agency Without Downstream Guardrails
**What goes wrong:** Agents can perform high-impact actions with broad scopes and weak runtime mediation.  
**Why it happens:** Product teams treat LLM/tool outputs as trusted intent, and rely on upstream prompting instead of downstream authorization.  
**Consequences:** Prompt-injection-driven misuse, destructive actions, data exfiltration, legal and security risk.  
**Warning signs:**
- Agent API keys have broad write scopes
- LLM outputs directly trigger workflow execution
- No approval tiering for destructive operations
**Prevention:**
- Enforce least privilege per agent/tool (scoped keys, per-action entitlements)
- Require confirmation/HITL gates for high-impact actions
- Apply output validation and policy checks before execution
- Separate planning from execution roles for agents
**Detection:**
- Agent executes actions outside normal role patterns
- High-impact actions cluster after prompt/context changes

### Pitfall 4: Integration Fragility and Silent Degradation
**What goes wrong:** Connector, rate-limit, or queue dependencies fail, and system silently falls back to local or degraded modes that break distributed correctness.  
**Why it happens:** Error handling prioritizes "keep running" over correctness guarantees, especially in brownfield migrations.  
**Consequences:** Inconsistent throttling, duplicate fulfillment, non-deterministic behavior across instances.  
**Warning signs:**
- Broad catches that downgrade to in-memory logic
- Runtime-only dynamic imports around critical infra clients
- Retries without idempotency keys
**Prevention:**
- Define explicit degraded-mode states with alerting, not silent algorithm changes
- Require shared backends (e.g., Redis) for distributed features in production
- Add idempotency keys and dedupe guards on fulfillment transitions
- Add health checks that block unsafe startup modes
**Detection:**
- Per-instance behavior divergence under load
- Over-limit requests succeed during backend incident windows

### Pitfall 5: Observability That Misses Decision Quality
**What goes wrong:** Monitoring tracks infra latency/errors but not AI/agent decision correctness, safety posture, or approval quality.  
**Why it happens:** Existing ITSM observability patterns are reused without AI-specific telemetry and traceability.  
**Consequences:** Hallucination/policy drift goes unnoticed, MTTR increases, post-incident attribution is weak.  
**Warning signs:**
- No metrics for policy denials, overrides, route confidence, or agent-tool error classes
- Audit logs exist but cannot reconstruct decision chains
- No runbooks for prompt injection/tool abuse incidents
**Prevention:**
- Instrument decision traces: input class, policy result, approver context, tool calls, final action
- Define AI-native SLOs (decision correctness, unsafe-action prevention, override rate)
- Run regular control validation and incident drills for agent-specific failure modes
**Detection:**
- Rising manual override rate with no root-cause narrative
- Incident postmortems missing causal chain between model output and action

## Moderate Pitfalls

### Pitfall 1: Automating Broken Process Before Standardization
**What goes wrong:** AI accelerates existing process inconsistency and exception handling chaos.  
**Prevention:** Standardize request taxonomy, approval policy contracts, and fulfillment state machine before expanding autonomy.

### Pitfall 2: Approval UX Bottlenecks Drive Shadow Workflows
**What goes wrong:** Slow or noisy approval experiences cause users to bypass governed paths in Slack/email/manual channels.  
**Prevention:** Implement risk-tiered approvals and fast-path low-risk requests with auditable exception routing.

### Pitfall 3: Test Strategy Overweights E2E and Under-tests Policy Boundaries
**What goes wrong:** Core authorization/routing regressions slip because only broad E2E catches them.  
**Prevention:** Add focused unit/integration tests around route handlers, server actions, and policy/approver boundary logic.

## Minor Pitfalls

### Pitfall 1: Metrics Without Ownership
**What goes wrong:** Good telemetry exists but nobody owns threshold tuning or remediation actions.  
**Prevention:** Assign operational owners for each critical metric and monthly review cadence.

### Pitfall 2: Uncurated Feature Expansion
**What goes wrong:** Platform adds "AI features" without tying to measurable operational outcomes.  
**Prevention:** Gate new features on explicit KPI hypothesis and retirement criteria.

## Phase-Specific Warnings and Mapping Suggestions

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Multi-tenant hardening | Tenant identity drift across channels | Canonical tenant contract, fail-closed enforcement, multi-channel contract tests |
| Approval/policy redesign | Fail-open governance | Production fail-closed defaults, override TTL + audit, explicit denial reasons |
| Agent-native automation rollout | Excessive agency | Least privilege scopes, execution guardrails, HITL on high-impact actions |
| Reliability guardrails (rate limit, queue, retries) | Silent degradation and distributed inconsistency | Explicit degraded modes, shared infra requirements, idempotent transitions |
| Testing expansion | Critical boundary regressions escaping | Add server-action and route-level tests for authz, tenancy, and policy branches |
| Observability/diagnostics | Missing decision traceability | Decision telemetry schema, AI/SRE runbooks, control validation drills |

## Sources

- NIST AI RMF overview (includes AI RMF 1.0 and GenAI profile references): <https://www.nist.gov/itl/ai-risk-management-framework> (**HIGH**)
- OWASP Top 10 for LLM Applications / GenAI Security Project: <https://owasp.org/www-project-top-10-for-large-language-model-applications/> (**HIGH**)
- ServiceNow AI governance guidance (platform governance themes): <https://www.servicenow.com/community/developer-blog/servicenow-ai-governance/ba-p/3506044> (**MEDIUM**; community post, aligned with official governance direction)
- Project context and known concerns:
  - `.planning/PROJECT.md`
  - `.planning/codebase/CONCERNS.md`
  - `.planning/codebase/TESTING.md`
