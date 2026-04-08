import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

/**
 * App-level envelope encryption for stored secrets (e.g. webhook signing keys).
 * In production, prefer wrapping the data key with **KMS** (AWS KMS, GCP CKM,
 * Vault transit) and storing only ciphertext + key id. This module uses a
 * single `FIELD_ENCRYPTION_KEY` (32-byte random, base64) as a stand-in for a
 * KMS-unwrapped DEK.
 */
export function encryptFieldIfConfigured(plain: string): string {
  const keyB64 = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!keyB64) return plain;
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes (base64-encoded).");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt values produced by `encryptFieldIfConfigured`, or return plaintext. */
export function decryptFieldIfNeeded(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const keyB64 = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!keyB64) {
    throw new Error("FIELD_ENCRYPTION_KEY required to decrypt stored secret.");
  }
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes (base64-encoded).");
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
}
