# Knowledge Base & App Registry Design

The knowledge base is the central nervous system powering user on-boarding self-service and AI-assistant automation, but it is strictly an execution-guidance layer. 

## App Registry Schema Definition
Every application must have a strictly defined meta-record in the system:

```json
{
  "app_id": "app_openai_01",
  "app_name": "OpenAI Enterprise",
  "vendor": "OpenAI",
  "category": "AI/Generative",
  "connector_type": "SCIM", 
  "supported_plans": ["Enterprise", "Team"],
  "sso_support": true,
  "scim_support": true,
  "telemetry_support": "full_cost",
  "license_types": ["Standard Seat"],
  "temporary_access_allowed": true,
  "approval_rules": ["Manager", "Security_Review"],
  "setup_guide": "https://internal.wiki/openai-setup",
  "offboarding_guide": "scim_automated_deactivation",
  "known_limits": "Max 500 API keys per org"
}
```

## How Docs and Guides are Ingested
- The platform scrapes public vendor support documentation to identify configuration bounds, pricing tiers, and common setup errors.
- Internal IT ops teams append customized "Internal Use" overrides (e.g., *Do NOT put PHI in GitHub Copilot chat*).

## How the AI System Employs the KB Safely
The AI **does not** randomly browse the internet to figure out how to add a user to Stripe. 
Instead it:
1. Explains to the user what access they are getting and why.
2. Drafts precise approval requests explaining limit contexts to the approvers.
3. Automatically routes the correct connector path based entirely on the explicit `connector_type` defined in the internal schema.
4. Generates a targeted ticket explaining step-by-step setup when forced into a manual fallback state.
