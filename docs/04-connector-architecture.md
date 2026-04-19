# Connector Architecture

The system treats absolute 100% full-automation as an anti-pattern. Instead, the connector framework ranks integrations across a degradation scale. For every app, one of these must exist in order to function properly. 

## The Six Connector Paths

### 1. SCIM Provisioning (Gold Standard)
- **What it does:** Uses standard System for Cross-domain Identity Management. Auto-creates, syncs attributes, and auto-suspends.
- **Limitations:** Only supported on expensive "Enterprise" tiers of vendors.

### 2. Admin API / SDK (Silver Standard)
- **What it does:** Uses a direct proprietary REST/GraphQL API. Examples include calling the Stripe Admin API or the Slack API to perform creation/teardown.
- **Limitations:** Subject to rate limits and undocumented edge cases by the vendor structure.

### 3. IdP Group Sync (Bronze Standard)
- **What it does:** Platform pushes the user into an "Okta Group" or "Google Workspace Group." The Identity manager dynamically grants access due to federated IdP mapping downstream.
- **Limitations:** Cannot manage granular in-app permissions well. Only controls raw entry.

### 4. OAuth / Admin App Scopes 
- **What it does:** User logs in utilizing scoped OAuth, platform monitors and approves requested scope boundaries dynamically.
- **Limitations:** Usually relates directly to 3rd party plugin connections or agent connections rather than core seat licensing.

### 5. CLI / Internal Automation 
- **What it does:** Triggers internal infrastructure wrappers (e.g., running a customer Terraform pipeline or a PowerShell script to grant access).
- **Limitations:** Very custom, requires engineering execution, carries security execution risk.

### 6. Manual IT / Browser Tasks (Fallback)
- **What it does:** Core backbone of the realistic architecture. System outputs a highly structured ticket containing: *User, Required Action, App Limits, Admin Console Link*. The admin clicks "Mark complete."
- **Limitations:** Subject to human SLA delays, but never fails.

## Handling Partial Failures & Rollbacks
If a multi-step provision fails (e.g., GitHub account created but Enterprise association limits out):
1. **Stop execution and hold.** 
2. **Raise Manual exception ticket.** 
3. Never silently mark as "success." Strict state engine enforcing "Provisioned", "Failed", "Pending Manual".
