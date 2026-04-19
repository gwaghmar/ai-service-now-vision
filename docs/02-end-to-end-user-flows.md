# End-to-End User Flows

## 1. Joiner Flow (New Hire)
**Trigger:** HRIS system updates to "Hired" or Manual Admin Entry.
1. **Identity Provision:** Core Identity Backbone (e.g. Okta/Google Workspace) generates Profile, Email, and default attributes (`Title`, `Department`, `Location`).
2. **Policy Matching:** Policy Engine assigns "Starter Bundle" mapping to their profile (e.g., Engineering gets `GitHub`, `Jira`, `AWS Sandbox`).
3. **Connector Execution:** App connectors fire off auto-provisioning rules via SCIM/API where possible.
4. **Manual Fallback:** Remaining items lack automation; IT queue receives tickets (e.g., Create legacy VPN account). 
5. **Dashboard Presentation:** Employee signs in on Day 1, gets knowledge-base guides for every assigned application detailing what the app is, why they have it, and relevant organizational guides.

## 2. Mover Flow (Role Change)
**Trigger:** Department / Title change in HR directory.
1. **Policy Re-Evaluation:** System calculates delta between `Old Role Bundle` and `New Role Bundle`.
2. **Revocation List:** Marks tools no longer required. Sets a 7-day grace period.
3. **New Approval Routing:** Routes new requirements to the appropriate team manager.
4. **Execution & Alignment:** Connector automatically aligns entitlements and Okta group assignments to match the new role.

## 3. Leaver Flow (Offboarding)
**Trigger:** HR directory marks employee "Terminated".
1. **Immediate Revocation:** Core IdP session cut immediately. 
2. **Application Pruning:** Direct SCIM/API connections aggressively wipe sessions and reassign data / licenses to managers.
3. **Manual Orphan Check:** Ticket list generated for non-automated tools verifying offboarding from legacy system administrators.
4. **Audit Evidence Export:** Snapshots and records timeline to cold storage for proof of revocation.

## 4. Temporary Access Flow
**Trigger:** User requests 3-day access to a production database.
1. **Request Formulation:** Employee submits JIT request noting "Auditing DB schema for Q3 bugs".
2. **Policy Catch & Approval Engine:** Approver sees duration, cost, and risk metric.
3. **Provisioning:** Automated systems grant the elevated entitlement.
4. **Expiration Loop:** At `time + 72h`, the system auto-revokes access. User gets a notification 2 hours prior asking if an extension is needed.

## 5. Privileged / JIT Access Flow (Break-Glass)
**Trigger:** Engineer requires immediate super-admin AWS bounds.
1. **High-Risk Guardrails:** Paged admin / dual-consent model depending on severity.
2. **Time-Bound Enforcement:** Automatically triggers session log capturing. Access revokes completely once incident resolves or time expires.

## 6. AI Tool Access Flow
**Trigger:** Marketing requests seats to enterprise-managed Claude / OpenAI.
1. **Plan & Limit Check:** Tool queries available enterprise budget and seat counts.
2. **Provisioning & Consent:** User is granted SAML SSO bound seat access but must sign enterprise data policy consent.
3. **Telemetry Activation (If available):** User API keys / cost analytics are paired with employee identity to track active usage.
