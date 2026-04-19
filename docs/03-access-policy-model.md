# Access Policy Model

## Access Modalities
The system enforces tight definitions around *how long* access is granted rather than indiscriminately giving out access indefinitely.

1. **Base / Permanent Access**
   - **Nature:** Lives until role changes or the employee leaves the company.
   - **Examples:** Email, Base Slack access, basic HR systems, Company Intranet.
   - **Governance:** Reviewed quarterly to assure active usage of the assigned license.

2. **Time-Bound Access**
   - **Nature:** Access lasting for a specific window (e.g., 1 hr, 8 hrs, 7 days, 30 days).
   - **Examples:** Month-end financial close tools, specific audit folder access, vendor guest setups.
   - **Governance:** Expires at exactly the interval end. No orphan lingering accounts. 

3. **Just-In-Time (JIT) Privileged Access**
   - **Nature:** Elevated access requested on-the-fly, required specific reasoning, aggressive auto-expiry.
   - **Examples:** Production server access, AWS Root, Stripe Admin dashboards.
   - **Governance:** Usually mandates peer/manager approval or incident ticket ID linkage. Extremely tight audit trails.

4. **Extension / Re-certification Access**
   - **Nature:** Interacts dynamically before access expires. It actively asks the manager/owner if access should continue.
   - **Governance:** Employs a fail-closed paradigm. If no positive affirmation is returned, access is automatically revoked.

## Role-Based Bundles
Access acts as a composite of several sub-policies:
- `Location Policies` (e.g., U.S. vs EU employee restrictions)
- `Department Policies` (e.g., Finance gets accounting apps vs Engineering getting Git repositories)
- `Level Policies` (Manager vs IC vs Exec visibility defaults)

## Sensitive / Restricted App Handling
A sensitive app matrix defines what applications inherently require secondary manual HR or Security approvals regardless of what the role-based bundles attempt to infer automatically.

## Identity Context Coverage
- **Human Identities:** First-class objects mapped 1-to-1 to an HR record.
- **Service Accounts/Delegates:** Tracked as "systems" but mandatorily assigned a Human "Owner". If the Owner offboards, the system flags the service account as orphaned necessitating reassignment.
