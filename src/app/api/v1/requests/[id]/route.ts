import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { request as requestTable, requestType } from "@/db/schema";
import { resolveAgentApiKey } from "@/server/agent-auth";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ctx = await resolveAgentApiKey(req.headers.get("authorization"));
  if (!ctx) {
    return Response.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({
      id: requestTable.id,
      status: requestTable.status,
      requestTypeSlug: requestType.slug,
      requesterId: requestTable.requesterId,
      payload: requestTable.payload,
      aiTriageRisk: requestTable.aiTriageRisk,
      aiTriageReason: requestTable.aiTriageReason,
      createdAt: requestTable.createdAt,
      updatedAt: requestTable.updatedAt,
    })
    .from(requestTable)
    .innerJoin(requestType, eq(requestType.id, requestTable.requestTypeId))
    .where(
      and(
        eq(requestTable.id, id),
        eq(requestTable.organizationId, ctx.organizationId),
      )
    )
    .limit(1);

  if (!row) {
    return Response.json({ error: "Request not found", code: "not_found" }, { status: 404 });
  }

  // Security barrier: agents bound by allowlist can't spy on out-of-bounds tickets
  if (ctx.allowedTypeSlugs && !ctx.allowedTypeSlugs.includes(row.requestTypeSlug)) {
    return Response.json({ error: "Request not found", code: "not_found" }, { status: 404 });
  }

  return Response.json({
    id: row.id,
    status: row.status,
    requestTypeSlug: row.requestTypeSlug,
    requesterId: row.requesterId,
    payload: row.payload,
    aiTriageRisk: row.aiTriageRisk,
    aiTriageReason: row.aiTriageReason,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  });
}
