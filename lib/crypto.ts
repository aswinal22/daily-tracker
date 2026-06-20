import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

/**
 * AES-256-GCM encryption for users' AI API keys stored in `profiles.ai_api_key`.
 *
 * A single master key (`ENCRYPTION_KEY`, base64-encoded 32 bytes) encrypts every
 * user key. Output format: `base64(iv | ciphertext | authTag)`.
 *
 * Server-only — the master key must never ship to the browser.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96-bit IV is recommended for GCM

function masterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Use: openssl rand -base64 32`,
    );
  }
  return key;
}

/** Encrypt a plaintext string → base64 payload. Returns null for empty input. */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

/** Decrypt a base64 payload back to plaintext. Returns null for empty input. */
export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + 16) throw new Error("Invalid ciphertext (too short)");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(IV_LEN, buf.length - 16);
  const decipher = createDecipheriv(ALGO, masterKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Deterministic fingerprint of a key — safe to log/compare to detect changes
 * without ever exposing the key itself. Returns null for empty input.
 */
export function keyFingerprint(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  return createHash("sha256").update(plaintext).digest("hex").slice(0, 12);
}
