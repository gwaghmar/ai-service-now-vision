import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { requestType } from "@/db/schema";
import { resolveAgentApiKey } from "@/server/agent-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await resolveAgentApiKey(req.headers.get("authorization"));
  if (!ctx) {
    return Response.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const types = await db
    .select({
      id: requestType.id,
      slug: requestType.slug,
      title: requestType.title,
      description: requestType.description,
    })
    .from(requestType)
    .where(
      and(
        eq(requestType.organizationId, ctx.organizationId),
        isNull(requestType.archivedAt),
      ),
    );

  return Response.json(types);
}
