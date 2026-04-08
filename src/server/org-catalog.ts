import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { requestType } from "@/db/schema";

/** Request types visible as catalog tiles for an organization (sorted by title). */
export async function fetchOrgCatalogTiles(organizationId: string) {
  return db
    .select({
      id: requestType.id,
      slug: requestType.slug,
      title: requestType.title,
      description: requestType.description,
    })
    .from(requestType)
    .where(eq(requestType.organizationId, organizationId))
    .orderBy(asc(requestType.title));
}
