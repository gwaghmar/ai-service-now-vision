import { Suspense } from "react";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  request as requestTable,
  requestType,
  user,
} from "@/db/schema";
import { RequestsHub } from "@/components/requests-hub";
import { requireSession } from "@/lib/session";
import { fetchOrgCatalogTiles } from "@/server/org-catalog";

export const dynamic = "force-dynamic";

export default async function RequestsHubPage() {
  const session = await requireSession();
  const orgId = session.user.organizationId;
  if (!orgId) {
    return <p className="text-red-600">Your account has no organization.</p>;
  }

  const role = (session.user as { role?: string }).role ?? "requester";
  const isAdmin = role === "admin";

  const catalog = await fetchOrgCatalogTiles(orgId);

  const rawRows = await db
    .select({
      id: requestTable.id,
      status: requestTable.status,
      typeTitle: requestType.title,
      assignedApproverId: requestTable.assignedApproverId,
    })
    .from(requestTable)
    .innerJoin(requestType, eq(requestTable.requestTypeId, requestType.id))
    .where(eq(requestTable.requesterId, session.user.id))
    .orderBy(desc(requestTable.createdAt))
    .limit(30);

  const approverIds = [
    ...new Set(
      rawRows
        .map((r) => r.assignedApproverId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const approverRows =
    approverIds.length > 0
      ? await db
          .select({ id: user.id, email: user.email })
          .from(user)
          .where(inArray(user.id, approverIds))
      : [];
  const emailByApproverId = new Map(
    approverRows.map((a) => [a.id, a.email] as const),
  );

  const myRequests = rawRows.map((r) => ({
    id: r.id,
    status: r.status,
    typeTitle: r.typeTitle,
    approverEmail: r.assignedApproverId
      ? (emailByApproverId.get(r.assignedApproverId) ?? null)
      : null,
  }));

  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <RequestsHub
        catalog={catalog}
        requests={myRequests}
        isAdmin={isAdmin}
      />
    </Suspense>
  );
}
