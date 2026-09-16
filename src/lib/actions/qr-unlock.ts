"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { findQrCodeByShortCode } from "@/lib/qr-codes/data";
import { qrPath } from "@/lib/qr-codes/links";
import {
  UNLOCK_MAX_AGE_SECONDS,
  unlockCookieName,
  unlockToken,
  verifyPassword,
} from "@/lib/qr-codes/password";

export type UnlockState = { error: string | null };

/**
 * Failed attempts per code and client, kept in memory. On serverless this is
 * per instance, so it slows guessing rather than stopping it outright; the
 * scrypt cost does the rest.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; resetAt: number }>();

function attemptKey(shortCode: string, ip: string): string {
  return `${shortCode}:${ip}`;
}

export async function unlockQrCodeAction(
  _prev: UnlockState,
  form: FormData
): Promise<UnlockState> {
  const shortCode = String(form.get("code") ?? "");
  const password = String(form.get("password") ?? "");

  const qr = await findQrCodeByShortCode(shortCode);
  if (!qr || !qr.password_hash) redirect(qrPath(shortCode));

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = attemptKey(qr.short_code, ip);
  const now = Date.now();
  const record = failures.get(key);
  if (record && record.resetAt > now && record.count >= MAX_FAILURES) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  if (!(await verifyPassword(password, qr.password_hash))) {
    const fresh = !record || record.resetAt <= now;
    failures.set(key, {
      count: fresh ? 1 : record.count + 1,
      resetAt: fresh ? now + WINDOW_MS : record.resetAt,
    });
    return { error: "That password is not right." };
  }

  failures.delete(key);
  const jar = await cookies();
  jar.set(unlockCookieName(qr.short_code), unlockToken(qr.short_code, qr.password_hash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: qrPath(qr.short_code),
    maxAge: UNLOCK_MAX_AGE_SECONDS,
  });

  redirect(qrPath(qr.short_code));
}
