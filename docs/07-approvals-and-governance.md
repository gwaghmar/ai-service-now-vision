# Approvals and Governance

Governance logic defines safety perimeters to ensure incorrect access is not arbitrarily rubber-stamped. 

## Approval Logic and Engine
Different tools carry distinctly varied risks warranting differentiated paths. 
- **Low Risk (Auto-Approve):** Tools mandated by Role Bundles. A new designer receives Figma with no active human interaction. 
- **Medium Risk (Delegated Approval):** Single hop manager approval (e.g. Jira Project access, AWS Sandbox).
- **High Risk (Multi-Stage Approval):** Hardened multi-layer paths (e.g. Production Infrastructure -> Manager Approval -> Application Owner Approval -> Security Validation).

## Separation of Duties (SoD)
The platform enforces SoD boundaries natively.
- No user can approve their own request under any circumstance.
- No approver can modify the underlying role group definition they fall within.

## Validation checks
The most critical part of an approval workflow is ensuring that access was *actually generated* after approval. The platform follows up its execution cycle natively with a verification polling step against the underlying connector to check that the role is accurate and active.

## Human-in-the-Loop Safeguards
When JIT access is requested with high-urgency severity, an on-call system can be hooked, but the platform ensures humans are presented all context. The approver will see:
- Who is asking.
- When it will expire natively.
- Risk/Compliance tag of the tool.
- Relevant knowledge base excerpts about potential over-provisioning warnings for this vendor.
