/**
 * KMS / secrets manager integration (reference only — no cloud SDK in this repo).
 *
 * **Pattern:** Generate a random 32-byte data encryption key (DEK). Encrypt
 * sensitive fields with AES-256-GCM using the DEK. Wrap the DEK with your
 * cloud KMS (encrypt API) and store `{ ciphertext, wrappedDek, kmsKeyId }`.
 * At runtime, unwrap the DEK via KMS and decrypt locally.
 *
 * `FIELD_ENCRYPTION_KEY` in `.env` simulates an already-unwrapped DEK for dev
 * and single-tenant deploys. See `field-encryption.ts`.
 */
export type KmsEnvelopeStub = {
  /** Document which KMS key version was used for audit. */
  kmsKeyId?: string;
  /** Base64 ciphertext from KMS encrypt (illustrative). */
  wrappedDekStub?: string;
};
