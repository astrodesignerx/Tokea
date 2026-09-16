"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { allocateShortCode } from "@/lib/short-code-allocator";
import { BRAND_DARK } from "@/lib/cards/qr-colour";
import { MIN_PASSWORD_LENGTH, hashPassword } from "@/lib/qr-codes/password";
import {
  QR_STATUSES,
  normaliseColour,
  normaliseDestination,
  normaliseLogoUrl,
  type QrStatus,
} from "@/lib/qr-codes/links";

/**
 * Write side of dynamic QR codes. Every action re-checks ownership against the
 * signed-in user; an id in a form body is attacker-controlled.
 */

/** The folded form section a validation error belongs to, so it can open itself. */
export type QrFormSection = "basics" | "style" | "tracking" | "devices" | "expiry" | "password";

/**
 * savedAt changes on every successful edit, so the form knows to confirm it.
 * errorAt changes on every failed one, so a repeated error still reopens its
 * section.
 */
export type QrFormState = {
  error: string | null;
  section?: QrFormSection;
  errorAt?: number;
  savedAt?: number;
};

type FieldError = { error: string; section: QrFormSection };

function failed({ error, section }: FieldError): QrFormState {
  return { error, section, errorAt: Date.now() };
}

const LIST_PATH = "/dashboard/qr";

function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function optional(form: FormData, key: string): string | null {
  return text(form, key, 100) || null;
}

type QrFields = {
  name: string;
  destination: string;
  ios_destination: string | null;
  android_destination: string | null;
  expires_at: Date | null;
  expired_destination: string | null;
  logo_url: string | null;
  colour: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

/** Validates the fields shared by create and edit. */
function readFields(form: FormData): FieldError | { fields: QrFields } {
  const name = text(form, "name", 120);
  if (!name) return { error: "Give the code a name so you can find it later.", section: "basics" };

  const destination = normaliseDestination(String(form.get("destination") ?? ""));
  if (!destination) {
    return {
      error: "Enter a full web address, like https://example.com/menu.",
      section: "basics",
    };
  }

  const ios = optionalUrl(form, "ios_destination");
  const android = optionalUrl(form, "android_destination");
  const expiredTo = optionalUrl(form, "expired_destination");
  if (ios === false || android === false) {
    return { error: "iPhone and Android links must be full web addresses.", section: "devices" };
  }
  if (expiredTo === false) {
    return { error: "The after-expiry link must be a full web address.", section: "expiry" };
  }

  const rawExpiry = text(form, "expires_at", 40);
  const expires_at = rawExpiry ? new Date(rawExpiry) : null;
  if (expires_at && Number.isNaN(expires_at.getTime())) {
    return { error: "That expiry date could not be read.", section: "expiry" };
  }

  const rawLogo = text(form, "logo_url", 2000);
  const logo_url = normaliseLogoUrl(rawLogo);
  if (rawLogo && !logo_url) {
    return {
      error: "Logo must be an https address or a path starting with /.",
      section: "style",
    };
  }

  return {
    fields: {
      name,
      destination,
      ios_destination: ios,
      android_destination: android,
      expires_at,
      expired_destination: expiredTo,
      logo_url,
      colour: normaliseColour(text(form, "colour"), BRAND_DARK),
      utm_source: optional(form, "utm_source"),
      utm_medium: optional(form, "utm_medium"),
      utm_campaign: optional(form, "utm_campaign"),
    },
  };
}

/** A blank field is null; a filled one must be a valid link, or false. */
function optionalUrl(form: FormData, key: string): string | null | false {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  return normaliseDestination(raw) ?? false;
}

/**
 * The password change a form asks for: undefined leaves it alone, null
 * removes it, a string is the new hash.
 */
async function readPassword(
  form: FormData
): Promise<FieldError | { hash: string | null | undefined }> {
  if (form.get("remove_password") === "on") return { hash: null };
  const password = String(form.get("password") ?? "");
  if (!password) return { hash: undefined };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`,
      section: "password",
    };
  }
  return { hash: await hashPassword(password.slice(0, 200)) };
}

async function requireOwnedQrCode(id: string) {
  const user = await requireUser();
  const code = await prisma.qrCode.findFirst({ where: { id, owner_id: user.id } });
  if (!code) redirect(LIST_PATH);
  return code;
}

export async function createQrCodeAction(
  _prev: QrFormState,
  form: FormData
): Promise<QrFormState> {
  const user = await requireUser();
  const parsed = readFields(form);
  if ("error" in parsed) return failed(parsed);
  const password = await readPassword(form);
  if ("error" in password) return failed(password);

  const code = await prisma.qrCode.create({
    data: {
      owner_id: user.id,
      short_code: await allocateShortCode(),
      ...parsed.fields,
      password_hash: password.hash ?? null,
    },
  });

  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}/${code.id}`);
}

export async function updateQrCodeAction(
  _prev: QrFormState,
  form: FormData
): Promise<QrFormState> {
  const code = await requireOwnedQrCode(text(form, "qr_code_id"));
  const parsed = readFields(form);
  if ("error" in parsed) return failed(parsed);
  const password = await readPassword(form);
  if ("error" in password) return failed(password);

  // The previous address is kept so a mistaken edit can be undone. Both writes
  // go together: history without the change, or the reverse, would mislead.
  const moved = parsed.fields.destination !== code.destination;
  await prisma.$transaction([
    ...(moved
      ? [
          prisma.qrLinkChange.create({
            data: { qr_code_id: code.id, destination: code.destination },
          }),
        ]
      : []),
    prisma.qrCode.update({
      where: { id: code.id },
      data: {
        ...parsed.fields,
        ...(password.hash !== undefined ? { password_hash: password.hash } : {}),
      },
    }),
  ]);

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${code.id}`);
  return { error: null, savedAt: Date.now() };
}

export async function setQrStatusAction(form: FormData) {
  const code = await requireOwnedQrCode(text(form, "qr_code_id"));
  const requested = text(form, "status");
  const status: QrStatus = QR_STATUSES.includes(requested as QrStatus)
    ? (requested as QrStatus)
    : "active";

  await prisma.qrCode.update({ where: { id: code.id }, data: { status } });

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${code.id}`);
}

/** Points the code back at an address from its history. */
export async function restoreQrLinkAction(form: FormData) {
  const code = await requireOwnedQrCode(text(form, "qr_code_id"));
  const change = await prisma.qrLinkChange.findFirst({
    where: { id: text(form, "change_id"), qr_code_id: code.id },
  });
  if (!change || change.destination === code.destination) return;

  await prisma.$transaction([
    prisma.qrLinkChange.create({
      data: { qr_code_id: code.id, destination: code.destination },
    }),
    prisma.qrCode.update({
      where: { id: code.id },
      data: { destination: change.destination },
    }),
  ]);

  revalidatePath(`${LIST_PATH}/${code.id}`);
  revalidatePath(LIST_PATH);
}

export async function scheduleQrChangeAction(
  _prev: QrFormState,
  form: FormData
): Promise<QrFormState> {
  const code = await requireOwnedQrCode(text(form, "qr_code_id"));

  const destination = normaliseDestination(String(form.get("destination") ?? ""));
  if (!destination) return { error: "Enter a full web address to switch to." };

  const runAt = new Date(text(form, "run_at", 40));
  if (Number.isNaN(runAt.getTime())) return { error: "Pick when the switch should happen." };
  if (runAt.getTime() <= Date.now()) {
    return { error: "Pick a time in the future, or edit the destination above to change it now." };
  }

  await prisma.qrScheduledChange.create({
    data: { qr_code_id: code.id, destination, run_at: runAt },
  });

  revalidatePath(`${LIST_PATH}/${code.id}`);
  return { error: null, savedAt: Date.now() };
}

export async function cancelScheduledQrChangeAction(form: FormData) {
  const code = await requireOwnedQrCode(text(form, "qr_code_id"));
  await prisma.qrScheduledChange.deleteMany({
    where: { id: text(form, "change_id"), qr_code_id: code.id, applied_at: null },
  });
  revalidatePath(`${LIST_PATH}/${code.id}`);
}
