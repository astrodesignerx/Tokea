import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

const SECRET = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
};

export type TokenKind = "invite" | "qr" | "checkin";

export type TokenPayload = {
  kind: TokenKind;
  guestId: string;
  eventId: string;
  exp: number;
  jti: string;
};

const KIND_TTL_DAYS: Record<TokenKind, number> = {
  invite: 90,
  qr: 365,
  checkin: 30,
};

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", SECRET()).update(payload).digest());
}

export function mintToken(input: {
  kind: TokenKind;
  guestId: string;
  eventId: string;
  ttlDays?: number;
}): string {
  const ttl = input.ttlDays ?? KIND_TTL_DAYS[input.kind];
  const payload: TokenPayload = {
    kind: input.kind,
    guestId: input.guestId,
    eventId: input.eventId,
    exp: Date.now() + ttl * 24 * 60 * 60 * 1000,
    jti: randomUUID(),
  };
  const body = base64url(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" | "wrong-kind" };

export function verifyToken(token: string, expectedKind: TokenKind): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;

  const expected = sign(body);
  if (expected.length !== sig.length) return { ok: false, reason: "malformed" };
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return { ok: false, reason: "bad-signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(fromBase64url(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (payload.kind !== expectedKind) return { ok: false, reason: "wrong-kind" };
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}
