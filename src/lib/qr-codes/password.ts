import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password protection for QR codes.
 *
 * The password is stored as a salted scrypt hash. Once a scanner enters it,
 * they get a cookie scoped to that one code, holding an HMAC of the code and
 * the current hash. Changing or removing the password changes the hash, which
 * quietly invalidates every cookie already handed out.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 4;
export const UNLOCK_MAX_AGE_SECONDS = 12 * 60 * 60;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

export function unlockCookieName(shortCode: string): string {
  return `qr_unlock_${shortCode}`;
}

export function unlockToken(shortCode: string, passwordHash: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`${shortCode}:${passwordHash}`).digest("base64url");
}

export function isUnlocked(
  shortCode: string,
  passwordHash: string,
  cookieValue: string | undefined
): boolean {
  if (!cookieValue) return false;
  const expected = Buffer.from(unlockToken(shortCode, passwordHash));
  const actual = Buffer.from(cookieValue);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
