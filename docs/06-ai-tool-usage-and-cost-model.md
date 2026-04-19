# AI Tool Usage and Cost Model

Managing AI tools is significantly different than managing classic SaaS because costs scale dynamically with tokens/interactions rather than static per-seat licensing. This layer differentiates the platform from legacy identity governance tools.

## What Should Be Tracked
1. **Seat Assignments:** Which users hold paid seats for tools (e.g. ChatGPT Plus vs ChatGPT Enterprise).
2. **Token & Call Telemetry:** How many API requests or inference outputs a specific identity uses over time.
3. **Model & Provider Types:** Tracking if teams are leaning entirely on Anthropic vs OpenAI and standardizing cost across them.

## Reality Check: Vendor Telemetry Coverage
Not all vendors offer equal analytics. The platform assumes varying levels of coverage per App Schema mappings:
- **Full Telemetry:** Provide granular grouping via API (e.g., OpenAI Organization logs mapped to specific `user_id` / `project_id`). This permits chargebacks.
- **Partial Telemetry:** Vendors who expose audit logs and total gross usage without precise per-seat attribution. The platform divides average costs as estimates.
- **No Telemetry:** Standard tier tools giving no API access. The platform acts simply as an authorization gate and tracks only the static flat-rate license cost.

## Required Dashboards
- **Orphan / Zombie Cost Analyzer:** Identifying identities churning while retaining shadow active API keys billing centrally. 
- **The Chargeback Heatmap:** Showcasing which departments (Engineering vs Support) cost the most in AI usage purely through token consumption vs traditional seats.
- **Shadow AI / Drift Reports:** Identifying discrepancies between the platform's assigned users and internal corporate-card expense trends or active API keys reported.

## Dealing with Service / Non-Human AI Agents
As a Phase 2 extension, the system accounts for API keys used inside CI/CD pipelines or Agent deployments by tying the consumption metrics back to a single human "Budget Owner" within the registry. Access and cost reviews hit that human, and if they leave, ownership must rotate.
