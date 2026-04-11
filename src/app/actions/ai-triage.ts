"use server";

import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { request as requestTable, requestType } from "@/db/schema";
import { requireSession } from "@/lib/session";

export type SimilarRequest = {
  id: string;
  status: string;
  createdAt: Date | null;
  payloadSummary: string;
};

/** Returns up to 5 recent requests of the same type from the same org. */
export async function getSimilarRequestsAction(
  requestTypeId: string,
): Promise<{ ok: true; requests: SimilarRequest[] } | { ok: false; error: string }> {
  const session = await requireSession();
  const orgId = session.user.organizationId;
  if (!orgId) return { ok: false, error: "No organization." };

  // Verify the type belongs to this org
  const [type] = await db
    .select({ id: requestType.id })
    .from(requestType)
    .where(
      and(
        eq(requestType.id, requestTypeId),
        eq(requestType.organizationId, orgId),
        isNull(requestType.archivedAt),
      ),
    )
    .limit(1);

  if (!type) return { ok: false, error: "Request type not found." };

  // Exclude requestor's own requests — show what others have submitted
  const rows = await db
    .select({
      id: requestTable.id,
      status: requestTable.status,
      createdAt: requestTable.createdAt,
      payload: requestTable.payload,
    })
    .from(requestTable)
    .where(
      and(
        eq(requestTable.requestTypeId, requestTypeId),
        eq(requestTable.organizationId, orgId),
        ne(requestTable.requesterId, session.user.id),
      ),
    )
    .orderBy(desc(requestTable.createdAt))
    .limit(5);

  const requests: SimilarRequest[] = rows.map((r) => {
    const payload = r.payload as Record<string, unknown>;
    const firstVal = Object.values(payload).find(
      (v) => typeof v === "string" && (v as string).trim().length > 0,
    ) as string | undefined;
    return {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      payloadSummary: firstVal ? String(firstVal).slice(0, 80) : "—",
    };
  });

  return { ok: true, requests };
}
