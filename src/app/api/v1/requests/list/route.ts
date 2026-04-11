import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { request as requestTable, requestType } from "@/db/schema";
import { resolveAgentApiKey } from "@/server/agent-auth";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.string().optional(),
  requestTypeSlug: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: Request) {
  const ctx = await resolveAgentApiKey(req.headers.get("authorization"));
  if (!ctx) {
    return Response.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid query params" }, { status: 400 });
  }
  const { status, requestTypeSlug, page, pageSize } = parsed.data;

  // Build filters
  const conditions = [eq(requestTable.organizationId, ctx.organizationId)];
  if (status) conditions.push(eq(requestTable.status, status));
  if (requestTypeSlug) {
    const [rt] = await db
      .select({ id: requestType.id })
      .from(requestType)
      .where(
        and(
          eq(requestType.organizationId, ctx.organizationId),
          eq(requestType.slug, requestTypeSlug),
          isNull(requestType.archivedAt),
        ),
      )
      .limit(1);
    if (rt) conditions.push(eq(requestTable.requestTypeId, rt.id));
    else return Response.json({ data: [], total: 0, page, pageSize });
  }

  const offset = (page - 1) * pageSize;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: requestTable.id,
        status: requestTable.status,
        requestTypeId: requestTable.requestTypeId,
        requesterId: requestTable.requesterId,
        payload: requestTable.payload,
        aiTriageRisk: requestTable.aiTriageRisk,
        aiTriageReason: requestTable.aiTriageReason,
        createdAt: requestTable.createdAt,
        updatedAt: requestTable.updatedAt,
      })
      .from(requestTable)
      .where(and(...conditions))
      .orderBy(desc(requestTable.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(requestTable)
      .where(and(...conditions)),
  ]);

  // Resolve slugs for each request
  const typeIds = [...new Set(rows.map((r) => r.requestTypeId))];
  const types =
    typeIds.length > 0
      ? await db
          .select({ id: requestType.id, slug: requestType.slug })
          .from(requestType)
          .where(eq(requestType.organizationId, ctx.organizationId))
      : [];
  const typeMap = Object.fromEntries(types.map((t) => [t.id, t.slug]));

  const data = rows.map((r) => ({
    id: r.id,
    status: r.status,
    requestTypeSlug: typeMap[r.requestTypeId] ?? r.requestTypeId,
    requesterId: r.requesterId,
    payload: r.payload,
    aiTriageRisk: r.aiTriageRisk,
    aiTriageReason: r.aiTriageReason,
    createdAt: r.createdAt?.toISOString() ?? null,
    updatedAt: r.updatedAt?.toISOString() ?? null,
  }));

  return Response.json({ data, total: Number(total), page, pageSize });
}
