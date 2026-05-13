import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { CipherGCM, DecipherGCM } from "crypto";

const KEY_ENV = process.env.SESSION_ENCRYPTION_KEY ?? process.env.BROWSER_SESSION_SECRET;

if (!KEY_ENV && process.env.NODE_ENV === "production") {
  throw new Error("[encryption] SESSION_ENCRYPTION_KEY is not set.");
}

const raw = (KEY_ENV ?? "default_development_secret_32chars").padEnd(32, "_").slice(0, 32);
const ENCRYPTION_KEY = Buffer.from(raw, "utf8");

const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 12; // 96-bit IV — GCM standard

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  // We explicitly cast to CipherGCM so TypeScript resolves getAuthTag
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv) as CipherGCM;
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/**
 * Decrypts a string produced by `encrypt()`.
 * Throws on auth-tag mismatch (tampered / corrupted data).
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("[encryption] Bad format — expected iv:tag:data");

  const iv  = Buffer.from(parts[0]!, "hex");
  const tag = Buffer.from(parts[1]!, "hex");
  const enc = Buffer.from(parts[2]!, "hex");

  // Explicit cast so setAuthTag is available
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
