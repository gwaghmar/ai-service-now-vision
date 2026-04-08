import { createHash, randomBytes } from "crypto";

const PREFIX = "gk";

function pepper() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
}

export function hashApiKey(plaintext: string) {
  return createHash("sha256")
    .update(plaintext)
    .update(pepper())
    .digest("hex");
}

/** Returns { fullKey, lookupId, keyHash } — show fullKey once to the operator. */
export function generateApiKeyMaterial() {
  const lookupId = randomBytes(8).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${PREFIX}_${lookupId}_${secret}`;
  return {
    fullKey,
    lookupId,
    keyHash: hashApiKey(fullKey),
  };
}

export function parseApiKeyLookupId(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  const prefix = `${PREFIX}_`;
  if (!token.startsWith(prefix)) return null;
  const rest = token.slice(prefix.length);
  const sep = rest.indexOf("_");
  if (sep <= 0) return null;
  const lookupId = rest.slice(0, sep);
  return { token, lookupId };
}
