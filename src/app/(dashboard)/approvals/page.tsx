import Link from "next/link";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  request as requestTable,
  requestType,
  user,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import { requestStatusLabel } from "@/lib/status-labels";

const PAGE_SIZE = 25;

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const session = await requireSession();
  const role = (session.user as { role?: string }).role ?? "requester";
  if (role !== "approver" && role !== "admin") {
    redirect("/");
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    return <p className="text-red-600">No organization.</p>;
  }

  const { before } = await searchParams;
  const cursor = before ? new Date(before) : null;

  const statusClause = or(
    eq(requestTable.status, "pending_approval"),
    eq(requestTable.status, "needs_info"),
  );

  const uid = session.user.id;
  const inRoutingPool = sql`coalesce(${requestTable.routingApproverIds}, '[]'::jsonb) @> ${JSON.stringify([uid])}::jsonb`;

  const approverClause =
    role === "admin"
      ? undefined
      : or(
          eq(requestTable.assignedApproverId, uid),
          isNull(requestTable.assignedApproverId),
          inRoutingPool,
        );

  const cursorClause = cursor ? lt(requestTable.createdAt, cursor) : undefined;

  const conditions = [
    eq(requestTable.organizationId, orgId),
    statusClause,
    approverClause,
    cursorClause,
  ].filter(Boolean);

  const whereExpr = and(...(conditions as Parameters<typeof and>));

  const rows = await db
    .select({
      id: requestTable.id,
      status: requestTable.status,
      payload: requestTable.payload,
      createdAt: requestTable.createdAt,
      typeTitle: requestType.title,
      requesterEmail: user.email,
    })
    .from(requestTable)
    .innerJoin(requestType, eq(requestTable.requestTypeId, requestType.id))
    .innerJoin(user, eq(requestTable.requesterId, user.id))
    .where(whereExpr)
    .orderBy(desc(requestTable.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore
    ? pageRows[pageRows.length - 1]?.createdAt?.toISOString()
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Summary-first cards; open a request to decide.
          {cursor && (
            <span className="ml-2">
              <Link href="/approvals" className="font-medium underline">
                Back to first page
              </Link>
            </span>
          )}
        </p>
      </div>
      <ul className="space-y-3">
        {pageRows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <p>No pending items.</p>
            {role === "admin" && (
              <p className="mt-2">
                If your team isn&apos;t submitting yet, finish{" "}
                <Link href="/onboarding" className="font-medium underline">
                  onboarding
                </Link>{" "}
                or review the{" "}
                <Link href="/admin/types" className="font-medium underline">
                  catalog
                </Link>
                .
              </p>
            )}
          </li>
        ) : (
          pageRows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {requestStatusLabel(r.status)}
                  </span>
                  <span className="text-sm font-medium">{r.typeTitle}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Requester: {r.requesterEmail}
                </p>
                <div className="mt-2.5 rounded-lg bg-zinc-50 p-2.5 text-sm dark:bg-zinc-950/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Summary for approval
                  </p>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(
                      r.payload as Record<string, unknown>,
                    ).map(([k, v]) => (
                      <li key={k}>
                        <span className="text-zinc-500">{k}: </span>
                        {String(v)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Policy verdicts are evaluated on the request detail flow when a
                    policy engine is configured.
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Link
            href={`/approvals?before=${encodeURIComponent(nextCursor)}`}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Load older items
          </Link>
        </div>
      )}
    </div>
  );
}
