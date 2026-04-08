import { and, count, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  approvalRoutingRule,
  organization,
  organizationInvite,
  requestType,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import { getOrgAiCredentials } from "@/server/ai/client";

function Row({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        {detail ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {detail}
          </p>
        ) : null}
      </div>
      <span
        className={
          ok
            ? "shrink-0 text-sm font-medium text-teal-700 dark:text-teal-400"
            : "shrink-0 text-sm font-medium text-amber-700 dark:text-amber-400"
        }
      >
        {ok ? "OK" : "Needs attention"}
      </span>
    </div>
  );
}

export default async function AdminSetupStatusPage() {
  const session = await requireSession();
  const role = (session.user as { role?: string }).role ?? "requester";
  if (role !== "admin") {
    return <p className="text-red-600">Admin only.</p>;
  }
  const orgId = session.user.organizationId;
  if (!orgId) {
    return <p className="text-red-600">No organization.</p>;
  }

  let aiOk = false;
  try {
    await getOrgAiCredentials(orgId);
    aiOk = true;
  } catch {
    aiOk = Boolean(process.env.APP_AI_PLATFORM_API_KEY?.trim());
  }

  const [catalogRow] = await db
    .select({ n: count() })
    .from(requestType)
    .where(eq(requestType.organizationId, orgId));
  const catalogOk = Number(catalogRow?.n ?? 0) > 0;

  const [routeRow] = await db
    .select({ n: count() })
    .from(approvalRoutingRule)
    .where(eq(approvalRoutingRule.organizationId, orgId));
  const routingOk = Number(routeRow?.n ?? 0) > 0;

  const emailOk = Boolean(process.env.RESEND_API_KEY?.trim());

  const [org] = await db
    .select({ webhookUrl: organization.webhookUrl })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  const webhookOk = Boolean(org?.webhookUrl?.trim());

  const [invRow] = await db
    .select({ n: count() })
    .from(organizationInvite)
    .where(
      and(
        eq(organizationInvite.organizationId, orgId),
        isNull(organizationInvite.acceptedAt),
      ),
    );
  const pendingInvites = Number(invRow?.n ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup status</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Quick health check for this deployment. Yellow items are optional or
          need configuration.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Row
          ok={aiOk}
          label="AI (copilot & onboarding generation)"
          detail="Admin → AI (BYOK) or set APP_AI_PLATFORM_API_KEY; production fallback needs ALLOW_AI_PLATFORM_FALLBACK=true."
        />
        <Row
          ok={catalogOk}
          label="Service catalog"
          detail="At least one request type. Use onboarding or Admin → Catalog."
        />
        <Row
          ok={routingOk}
          label="Approval routing rules"
          detail="Admin → Routing. If empty, the app may still assign approvers from role-based fallbacks when possible."
        />
        <Row
          ok={emailOk}
          label="Transactional email"
          detail="RESEND_API_KEY + EMAIL_FROM for approval mail and invite sends."
        />
        <Row
          ok={webhookOk}
          label="Outbound webhook"
          detail="Optional: Admin → Integrations."
        />
        <div className="pt-2 text-xs text-zinc-500">
          Pending invites (not yet accepted):{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {pendingInvites}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/onboarding?force=1"
          className="rounded-lg border border-zinc-200 px-3 py-2 font-medium dark:border-zinc-700"
        >
          Open onboarding wizard
        </Link>
        <Link
          href="/admin/ai"
          className="rounded-lg border border-zinc-200 px-3 py-2 font-medium dark:border-zinc-700"
        >
          AI settings
        </Link>
      </div>
    </div>
  );
}
