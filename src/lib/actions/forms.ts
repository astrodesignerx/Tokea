"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { findOwnedForm } from "@/lib/forms/data";
import { newFieldId, parseFields, type FormField } from "@/lib/forms/fields";
import { isUniqueViolation } from "@/lib/errors";
import { slugify, withCollisionSuffix } from "@/lib/slug";
import { allocateShortCode } from "@/lib/short-code-allocator";
import { getCardsOrigin } from "@/lib/cards/links";

/**
 * Write side of forms. Every action re-checks ownership against the signed-in
 * user; an id in a form body is attacker-controlled.
 */

/** The settings row a validation error belongs to, so it can open itself. */
export type FormSettingsSection = "basics" | "schedule" | "alerts" | "thankyou" | "branding";

/**
 * savedAt changes on every successful edit, so the form knows to confirm it.
 * errorAt changes on every failed one, so a repeated error still reopens its
 * section.
 */
export type FormState = {
  error: string | null;
  section?: FormSettingsSection;
  errorAt?: number;
  savedAt?: number;
};

const LIST_PATH = "/dashboard/forms";
const MAX_FIELDS_JSON = 500_000;

function failed(error: string, section?: FormSettingsSection): FormState {
  return { error, section, errorAt: Date.now() };
}

function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function formPath(id: string): string {
  return `${LIST_PATH}/${id}`;
}

async function ownedForm(form: FormData) {
  const user = await requireUser();
  const owned = await findOwnedForm(text(form, "form_id", 40), user.id);
  if (!owned) redirect(LIST_PATH);
  return owned;
}

function readDraft(form: FormData): { fields: FormField[] } | { error: string } {
  return parseFields(String(form.get("draft_fields") ?? "").slice(0, MAX_FIELDS_JSON));
}

/** Up to five addresses, written one per line, with commas or spaces. */
function readEmails(raw: string): { emails: string[] } | { error: string } {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const emails = [...new Set(parts)];

  if (emails.length > 5) return { error: "Add at most 5 email addresses." };
  for (const email of emails) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) {
      return { error: `"${email}" is not an email address.` };
    }
  }
  return { emails };
}

export async function createFormAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const title = text(form, "title", 120);
  if (!title) return failed("Give the form a title.", "basics");

  const description = text(form, "description", 2000) || null;

  const organisationId = text(form, "organisation_id", 40);
  if (organisationId) {
    const organisation = await prisma.organisation.findFirst({
      where: { id: organisationId, owner_id: user.id },
      select: { id: true },
    });
    if (!organisation) return failed("That company is not yours.", "branding");
  }

  // A usable starting point, rather than an empty canvas that looks broken.
  const starter: FormField[] = [
    { id: newFieldId(), type: "short_text", label: "Your name", required: true },
    { id: newFieldId(), type: "email", label: "Email", required: false },
  ];

  const base = slugify(title) || "form";
  let createdId: string | null = null;

  for (let attempt = 0; attempt < 5 && !createdId; attempt++) {
    try {
      const created = await prisma.form.create({
        data: {
          owner_id: user.id,
          title,
          description,
          organisation_id: organisationId || null,
          // The slug is fixed once created: printed QR codes point at it.
          slug: attempt === 0 ? base : withCollisionSuffix(base),
          draft_fields: starter,
        },
        select: { id: true },
      });
      createdId = created.id;
    } catch (err) {
      if (!isUniqueViolation(err, "slug")) throw err;
    }
  }

  if (!createdId) {
    return failed("That name is already taken. Try a slightly different one.", "basics");
  }

  revalidatePath(LIST_PATH);
  redirect(formPath(createdId));
}

export async function saveFormDraftAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const owned = await ownedForm(form);
  const draft = readDraft(form);
  if ("error" in draft) return failed(draft.error);

  await prisma.form.update({
    where: { id: owned.id },
    data: { draft_fields: draft.fields },
  });

  revalidatePath(LIST_PATH);
  revalidatePath(formPath(owned.id));
  return { error: null, savedAt: Date.now() };
}

export async function publishFormAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const owned = await ownedForm(form);

  // Publish what the builder currently holds, falling back to the saved draft
  // when the editor sent no copy.
  const submitted = String(form.get("draft_fields") ?? "");
  const parsed = submitted.trim()
    ? parseFields(submitted.slice(0, MAX_FIELDS_JSON))
    : parseFields(owned.draft_fields);
  if ("error" in parsed) return failed(parsed.error);

  try {
    await prisma.$transaction(async (tx) => {
      const latest = await tx.formVersion.aggregate({
        where: { form_id: owned.id },
        _max: { number: true },
      });
      const number = (latest._max.number ?? 0) + 1;

      await tx.formVersion.create({
        data: { form_id: owned.id, number, fields: parsed.fields },
      });
      await tx.form.update({
        where: { id: owned.id },
        data: {
          draft_fields: parsed.fields,
          live_version: number,
          // A live form keeps its own status; only a draft starts open.
          ...(owned.status === "draft" ? { status: "open" } : {}),
        },
      });
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return failed("This form was published at the same moment. Try again.");
    }
    throw err;
  }

  revalidatePath(LIST_PATH);
  revalidatePath(formPath(owned.id));
  revalidatePath(`/f/${owned.slug}`);
  return { error: null, savedAt: Date.now() };
}

export async function updateFormSettingsAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const owned = await ownedForm(form);

  const title = text(form, "title", 120);
  if (!title) return failed("Give the form a title.", "basics");
  const description = text(form, "description", 2000) || null;

  const organisationId = text(form, "organisation_id", 40);
  if (organisationId) {
    const organisation = await prisma.organisation.findFirst({
      where: { id: organisationId, owner_id: owned.owner_id },
      select: { id: true },
    });
    if (!organisation) return failed("That company is not yours.", "branding");
  }

  const closesRaw = text(form, "closes_at", 40);
  let closesAt: Date | null = null;
  if (closesRaw) {
    closesAt = new Date(closesRaw);
    if (Number.isNaN(closesAt.getTime())) {
      return failed("That closing date could not be read.", "schedule");
    }
  }

  const limitRaw = text(form, "response_limit", 12);
  let responseLimit: number | null = null;
  if (limitRaw) {
    const limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100000) {
      return failed("The response limit must be a whole number from 1 to 100,000.", "schedule");
    }
    responseLimit = limit;
  }

  const emails = readEmails(text(form, "notify_emails", 1000));
  if ("error" in emails) return failed(emails.error, "alerts");

  const thankYou = text(form, "thank_you", 500) || null;

  await prisma.form.update({
    where: { id: owned.id },
    data: {
      title,
      description,
      organisation_id: organisationId || null,
      closes_at: closesAt,
      response_limit: responseLimit,
      notify_emails: emails.emails,
      thank_you: thankYou,
    },
  });

  revalidatePath(LIST_PATH);
  revalidatePath(formPath(owned.id));
  revalidatePath(`/f/${owned.slug}`);
  return { error: null, savedAt: Date.now() };
}

const STATUSES = ["open", "closed", "archived"] as const;
type FormStatus = (typeof STATUSES)[number];

export async function setFormStatusAction(form: FormData) {
  const owned = await ownedForm(form);

  const requested = text(form, "status", 20);
  const status: FormStatus = STATUSES.includes(requested as FormStatus)
    ? (requested as FormStatus)
    : "closed";

  // A draft has nothing to open until it is published.
  if (status === "open" && owned.live_version === null) return;

  await prisma.form.update({ where: { id: owned.id }, data: { status } });

  revalidatePath(LIST_PATH);
  revalidatePath(formPath(owned.id));
  revalidatePath(`/f/${owned.slug}`);
}

export async function deleteResponseAction(form: FormData) {
  const owned = await ownedForm(form);
  const responseId = text(form, "response_id", 40);

  // Scoped by form_id as well as id, so a guessed id from another form cannot
  // reach across accounts.
  await prisma.formResponse.deleteMany({
    where: { id: responseId, form_id: owned.id },
  });

  revalidatePath(formPath(owned.id));
}

export async function deleteAllResponsesAction(form: FormData) {
  const owned = await ownedForm(form);

  await prisma.formResponse.deleteMany({ where: { form_id: owned.id } });

  revalidatePath(formPath(owned.id));
}

export async function createFormQrAction(form: FormData) {
  const owned = await ownedForm(form);

  if (owned.qr_code_id) redirect(`/dashboard/qr/${owned.qr_code_id}`);

  const origin = await getCardsOrigin();
  const shortCode = await allocateShortCode();

  const created = await prisma.$transaction(async (tx) => {
    // A second click may have created one in the meantime; use that instead.
    // The row lock makes a concurrent click wait here instead of racing.
    await tx.$queryRaw`SELECT id FROM "Form" WHERE id = ${owned.id} FOR UPDATE`;
    const fresh = await tx.form.findUnique({
      where: { id: owned.id },
      select: { qr_code_id: true },
    });
    if (fresh?.qr_code_id) return fresh.qr_code_id;

    const code = await tx.qrCode.create({
      data: {
        owner_id: owned.owner_id,
        short_code: shortCode,
        name: owned.title,
        destination: `${origin}/f/${owned.slug}`,
      },
      select: { id: true },
    });

    await tx.form.update({
      where: { id: owned.id },
      data: { qr_code_id: code.id },
    });

    return code.id;
  });

  revalidatePath(LIST_PATH);
  revalidatePath(formPath(owned.id));
  redirect(`/dashboard/qr/${created}`);
}
