import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(plain: string, storedHash: string): boolean {
  const [salt, digestHex] = storedHash.split(":");
  if (!salt || !digestHex) return false;

  const digest = scryptSync(plain, salt, SCRYPT_KEYLEN);
  const storedDigest = Buffer.from(digestHex, "hex");
  if (digest.length !== storedDigest.length) return false;

  return timingSafeEqual(digest, storedDigest);
}
