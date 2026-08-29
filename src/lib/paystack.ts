import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Thin Paystack client.
 *
 * Deliberately small: initialize a transaction, verify one, and check webhook
 * signatures. Everything that decides whether money was actually received
 * lives in lib/payments.ts, which uses this.
 */

const API = "https://api.paystack.co";

export function paystackSecret(): string | null {
  const key = process.env["PAYSTACK_SECRET_KEY"];
  return key && key.trim() !== "" ? key.trim() : null;
}

export function isPaystackConfigured(): boolean {
  return paystackSecret() !== null;
}

/**
 * Paystack accepts alphanumerics plus `-`, `.` and `=` in a reference, so a
 * prefixed UUID is safe. Generating it ourselves is what makes the whole flow
 * idempotent: it is the key both the webhook and the browser settle against.
 */
export function newReference(): string {
  return `tokea-${randomUUID()}`;
}

export type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; reason: string };

async function call<T>(
  path: string,
  init: { method: "GET" } | { method: "POST"; body: unknown },
): Promise<ApiResult<T>> {
  const secret = paystackSecret();
  if (!secret) return { ok: false, reason: "paystack-not-configured" };

  try {
    const res = await fetch(`${API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: init.method === "POST" ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => null)) as
      | { status?: boolean; message?: string; data?: T }
      | null;

    if (!res.ok || !payload?.status) {
      return { ok: false, reason: payload?.message ?? `http-${res.status}` };
    }
    return { ok: true, data: payload.data as T };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "network-error" };
  }
}

export async function initializeTransaction(input: {
  email: string;
  /** Minor units. Read from the event, never from the browser. */
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  /** Organiser's ACCT_xxx, when they have connected payout details. */
  subaccount?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ApiResult<{ authorization_url: string; access_code: string; reference: string }>> {
  return call("/transaction/initialize", {
    method: "POST",
    body: {
      email: input.email,
      amount: String(input.amount),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      ...(input.subaccount ? { subaccount: input.subaccount } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}

export async function verifyTransaction(
  reference: string,
): Promise<ApiResult<PaystackTransaction>> {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

/**
 * Verifies the `x-paystack-signature` header: HMAC SHA512 of the raw request
 * body, signed with the secret key.
 *
 * Must be given the exact bytes received. Re-serialising the parsed JSON
 * changes key order and whitespace, and the digest will never match.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = paystackSecret();
  if (!secret || !signature) return false;

  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch, so check that first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
