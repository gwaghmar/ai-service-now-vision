import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKey } from "@/db/schema";
import { hashApiKey, parseApiKeyLookupId } from "@/lib/api-key-crypto";

export async function resolveAgentApiKey(authHeader: string | null) {
  const parsed = parseApiKeyLookupId(authHeader);
  if (!parsed) return null;

  const [row] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.lookupId, parsed.lookupId))
    .limit(1);

  if (!row || row.revokedAt) return null;
  if (hashApiKey(parsed.token) !== row.keyHash) return null;

  return { organizationId: row.organizationId, apiKeyId: row.id };
}
