import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for users' AI API keys at rest.
 *
 * Key management (decision D1): a single app-level master key
 * (ENCRYPTION_KEY, 32 bytes base64) encrypts/decrypts all user keys.
 * The ciphertext stored in profiles.ai_api_key has the format:
 *
 *   base64(iv[12] || authTag[16] || ciphertext)
 *
 * Server-only. Never import from a client component.
 */

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }
  // Accept either a raw 32-byte string or a base64-encoded 32-byte key.
  let key: Buffer;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(raw) && raw.length === 44) {
    key = Buffer.from(raw, "base64");
  } else {
    key = Buffer.from(raw);
  }
  if (key.length !== 32) {
    // Derive a stable 32-byte key from whatever was provided.
    key = createHash("sha256").update(raw).digest();
  }
  return key;
}

export function encrypt(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(cipherText: string): string {
  try {
    const buf = Buffer.from(cipherText, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error(
      "Failed to decrypt value. Check ENCRYPTION_KEY matches the one used at write time.",
    );
  }
}

/** True when an ENCRYPTION_KEY is configured. */
export function hasEncryptionKey(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}
