# Security and Audit

## The Audit Trail
The platform is built under the assumption that it will be inspected by SOC2 / ISO 27001 auditors routinely. 
All interactions are irrevocably logged utilizing Write-Ahead-Log architecture principles.
- **Who:** System, Platform Admin, or Identity.
- **What:** Contextual state changes.
- **When & Why:** Chronological signatures binding approvals to actions.

## Evidence Export
A central capability to perform single-click "Auditor Dumps". When asked "Prove X user was offboarded and terminated access to AWS":
- Generates a PDF/JSON compiling the initial Jira ticket request, the HR feed timestamp, the platform approval, and the final SCIM `HTTP 200` teardown log from the vendor.

## Drift Detection
The platform periodically reconciles internal expectations against reality by scanning the IDP (Okta) and App environments (GitHub APIs) and looks for exceptions:
- **Shadow Provisioning:** Finding a user in GitHub who isn't tracked in the platform.
- **Dangling Deletes:** The platform thinks Julian lost AWS, but Julian retains an active Identity Center group binding.

## Retry, Rollback, and Secrets Handling
- The platform uses distributed queue workers to execute provisioning steps. It expects rate-limits and random API failures.
- Interrupted or timed-out connections fall into standard Exponential Backoff loops.
- Core Application API Keys and credentials (that power the connectors) sit within an encrypted vault, completely segmented from database records accessible to regular application queries.
