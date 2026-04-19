# Personas and Customer Problems

## The Reality of Access Governance
The enterprise access landscape has radically shifted from on-premise centralized software suites to a fragmented "100+ app" multi-cloud model, heavily accelerated by unmanaged AI tooling.

## Problems Startups Face
- **The "Founder IT" Bottleneck:** Early-stage startups rarely have a dedicated IT team. Highly expensive engineering leads or founders manually process Google, GitHub, and AWS access requests in between pushing code.
- **SOC 2 Panic:** Without a central system maintaining an audit trail for access request, approval, and revocation, the pre-audit scramble wastes significant resources.
- **SaaS Sprawl & Shadow IT:** Individual teams deploy ChatGPT Plus, Claude, Notion, and specialized dev-tools on corporate cards with zero offboarding discipline when employees churn.

## Problems Larger Companies Face
- **The Onboarding Delay:** An enterprise user can take up to 2 weeks to actually obtain their full set of working credentials spanning HR suites, finance software, GitHub enterprise, Okta groups, and VDI structures. Operations tickets become endless bottlenecks.
- **Opaque License Sprawl:** Hundreds of thousands of dollars are lost to orphaned accounts and mismanaged enterprise tiers.
- **Mover Chaos:** When an employee changes teams (e.g. Sales to Product), access tends to simply "stack" rather than being actively modified and reviewed. 

## Problems with AI Tools Specifically
- **Non-Human Identity Proliferation:** Modern AI tooling relies heavily on OAuth tokens, API keys, and shadow agents. This is an identity perimeter that standard directory tools (Okta, AD) were designed strictly to ignore.
- **Runaway Costs:** Most SaaS seats are flat rate. GenAI tools frequently incur token costs. Without telemetry connecting `user_id` to `token_cost`, budget overruns appear arbitrarily on monthly invoices.
- **Data Governance Blind Spots:** Unmanaged use of standard consumer-tier AI apps results in proprietary data being ingested as training material because employees bypassed enterprise-tier procurement processes.

## The Core Problem
**Identity and Governance are detached from Usage.** Current tools either govern "who signs into a dashboard" (Okta) or "what humans submit to a helpdesk" (ServiceNow). Modern environments require bridging these two to handle changing realities like zero-trust, JIT access, and varied automation capacities (from pristine SCIM to fully manual administration).
