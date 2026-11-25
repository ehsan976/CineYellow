// Encrypts Trakt tokens before they go into Postgres (AES-256-GCM). The key is derived from
// BETTER_AUTH_SECRET, so a database dump alone can't be used to act on anyone's Trakt account.
// Changing BETTER_AUTH_SECRET makes stored tokens unreadable: profiles then simply reconnect.
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHash("sha256").update(`cineyellow:trakt-tokens:${secret}`).digest();
}

/** "v1.<iv>.<tag>.<ciphertext>", all base64url. */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** null when the value was tampered with or encrypted with another secret. */
export function decryptToken(stored: string): string | null {
  const [version, iv, tag, data] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
