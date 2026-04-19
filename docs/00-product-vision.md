# Product Vision

## What the Product Does
The platform is an AI-powered operations center serving as the unified control layer for employee onboarding, access provisioning, AI-tool governance, and offboarding. It acts as the bridge between Identity Providers (IdP), SaaS/cloud applications, HR Information Systems (HRIS), and the humans or systems interacting with them. 

It routes approvals, executes provisioning where automation (SCIM, API, OAuth) is possible, gracefully routes to manual ticketing / fallback workflows where it is not, and crucially tracks AI application spend and telemetry (where available) tying them directly back to user identities.

## The Buyer and End-User
**The Buyer:** 
1. **IT / Security Admins (Mid-market / Series B+):** Overwhelmed by ticket backlogs, SaaS sprawl, and lack of visibility into unregulated AI tool adoption across teams.
2. **Founders / Head of Ops (Early Stage):** Wasting structural engineering and operational time setting up accounts and enforcing SOC2 access reviews.

**The End User:** 
1. **Employees (Joiners / Movers / Requesters):** Given transparent, frictionless onboarding dashboards with direct knowledge bases on their tools, without waiting days to be productive.
2. **Managers / Budget Owners:** One-click approval interfaces contextualizing exactly what access exists, why it's needed, and how much it will cost. 

## What Problem it Solves
- **SaaS & AI Sprawl:** Companies no longer know what active shadow AI exists and whether data or costs are leaking. 
- **The Ticket Burden:** High-friction onboarding where engineers end up requesting 15 disparate tools via Slack DMs over their first 3 weeks.
- **Compliance & Drift Guarantee:** The chasm between what IT "thinks" an employee has access to and what their accounts actually reveal during offboarding. 
- **Tool Automation Friction:** It correctly accepts that "100% automated provisioning" is a myth. By treating manual tasks as a first-class feature alongside SCIM and API execution, it acts as a genuine system of record.

## Launch Strategy: Startup-First vs Enterprise-First
**Startup-First Launch Strategy:**
- Focus heavily on common developer / internal systems (Google Workspace, Slack, GitHub, Linear, AWS, OpenAI, Vercel).
- Focus on Google Workspace as the primary identity system, easing transition later to Okta.
- Avoid building complex on-premise Active Directory connectors or main-frame legacy connectors too early.
- Win on fast UI, transparent pricing, SOC2 readiness, and AI-cost tracking.
