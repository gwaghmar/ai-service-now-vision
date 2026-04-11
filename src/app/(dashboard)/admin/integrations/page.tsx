import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { IntegrationsForm } from "./integrations-form";

export default async function AdminIntegrationsPage() {
  const session = await requireSession();
  const role = session.user.role;
  if (role !== "admin") {
    return <p className="text-red-600">Admin only.</p>;
  }
  const orgId = session.user.organizationId;
  if (!orgId) return <p className="text-red-600">No organization.</p>;

  const [org] = await db
    .select({ webhookUrl: organization.webhookUrl })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Outbound webhooks for approvals and provisioning events. Payloads are
          POSTed as JSON; when a signing secret is set, we add header{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            X-Governance-Signature
          </code>{" "}
          with HMAC-SHA256 of the raw body.
        </p>
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-50/90 px-4 py-3 text-sm text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/35 dark:text-teal-100">
        <p className="font-medium">In plain English</p>
        <p className="mt-1 text-teal-900/90 dark:text-teal-200/90">
          This page configures <strong>outbound notifications</strong>: when
          something important happens here (for example, an approval or a
          provisioning step), we can POST a JSON payload to your URL so Slack,
          ServiceNow, or a custom script can react. It does not grant inbound
          access to your data—that’s what API keys are for.
        </p>
      </div>

      <IntegrationsForm initialUrl={org?.webhookUrl ?? ""} />
    </div>
  );
}
