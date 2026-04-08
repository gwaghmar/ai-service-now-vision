import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  approval,
  auditEvent,
  request as requestTable,
  requestType,
  user,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import { requestStatusLabel } from "@/lib/status-labels";
import { isApproverAllowedForRequest } from "@/server/approval-routing";
import { RequestVisitTracker } from "@/components/request-visit-tracker";
import { ApproverSummaryPanel } from "@/components/approver-summary-panel";
import { ApprovalPanel } from "./approval-panel";
import { NeedsInfoResubmit } from "./needs-info-resubmit";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const orgId = session.user.organizationId;
  if (!orgId) notFound();

  const [row] = await db
    .select({
      request: requestTable,
      typeTitle: requestType.title,
      typeFieldSchema: requestType.fieldSchema,
      requesterEmail: user.email,
      requesterName: user.name,
      requesterDepartment: user.department,
      requesterManagerUserId: user.managerUserId,
    })
    .from(requestTable)
    .innerJoin(requestType, eq(requestTable.requestTypeId, requestType.id))
    .innerJoin(user, eq(requestTable.requesterId, user.id))
    .where(
      eq(requestTable.id, id),
    )
    .limit(1);

  if (!row || row.request.organizationId !== orgId) notFound();

  let managerName: string | null = null;
  let managerEmail: string | null = null;
  if (row.requesterManagerUserId) {
    const [mgr] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(
        and(
          eq(user.id, row.requesterManagerUserId),
          eq(user.organizationId, orgId),
        ),
      )
      .limit(1);
    managerName = mgr?.name ?? null;
    managerEmail = mgr?.email ?? null;
  }

  const role = (session.user as { role?: string }).role ?? "requester";
  const isRequester = row.request.requesterId === session.user.id;
  const isApprover = role === "approver" || role === "admin";
  const awaitingDecision =
    row.request.status === "pending_approval" ||
    row.request.status === "needs_info";
  const canApprove =
    isApprover &&
    awaitingDecision &&
    (role === "admin" ||
      isApproverAllowedForRequest({
        approverUserId: session.user.id,
        routingApproverIds: row.request.routingApproverIds ?? null,
        assignedApproverId: row.request.assignedApproverId,
      }));

  const canView = isRequester || isApprover || role === "admin";
  if (!canView) notFound();

  const canResubmitInfo =
    isRequester && row.request.status === "needs_info";

  const events = await db
    .select()
    .from(auditEvent)
    .where(
      and(
        eq(auditEvent.organizationId, orgId),
        eq(auditEvent.entityType, "request"),
        eq(auditEvent.entityId, id),
      ),
    )
    .orderBy(asc(auditEvent.createdAt));

  const decisions = await db
    .select()
    .from(approval)
    .where(eq(approval.requestId, id))
    .orderBy(asc(approval.decidedAt));

  return (
    <div className="space-y-8">
      {isRequester ? <RequestVisitTracker requestId={id} /> : null}
      <div>
        <Link
          href="/"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Request</h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">{id}</p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
            {requestStatusLabel(row.request.status)}
          </span>
          <span className="text-sm text-zinc-500">{row.typeTitle}</span>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Requester: {row.requesterName} ({row.requesterEmail})
          {row.requesterDepartment ? (
            <span className="block text-xs text-zinc-500">
              Department: {row.requesterDepartment}
            </span>
          ) : null}
          {managerName ? (
            <span className="block text-xs text-zinc-500">
              Reports to: {managerName}
              {managerEmail ? ` (${managerEmail})` : null}
            </span>
          ) : null}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          {Object.entries(row.request.payload as Record<string, unknown>).map(
            ([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">
                  {k}
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{String(v)}</dd>
              </div>
            ),
          )}
        </dl>
      </section>

      {canApprove && (
        <div className="space-y-4">
          <ApproverSummaryPanel requestId={id} />
          <ApprovalPanel requestId={id} />
        </div>
      )}

      {canResubmitInfo && (
        <NeedsInfoResubmit
          requestId={id}
          fieldSchema={row.typeFieldSchema}
          initialPayload={row.request.payload as Record<string, unknown>}
        />
      )}

      {decisions.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500">Decisions</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {decisions.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span className="font-medium">{d.decision}</span>
                {d.comment && (
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {" "}
                    — {d.comment}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-zinc-500">Audit trail</h2>
        <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {events.map((e) => (
            <li key={e.id} className="px-3 py-2 text-sm">
              <span className="text-xs text-zinc-500">
                {e.createdAt?.toISOString?.() ?? ""}
              </span>
              <div className="font-medium">{e.action}</div>
              {e.metadata && (
                <pre className="mt-1 max-h-32 overflow-auto text-xs text-zinc-600 dark:text-zinc-400">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
